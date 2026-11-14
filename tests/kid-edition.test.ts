import { describe, expect, it } from "vitest";
import m1json from "../src/game/data/final_mission1_solar.json";
import p3json from "../src/game/data/final_stage3_rover_ares_landing.json";
import { DATA } from "../src/game/data";
import {
  askEarthEnabled,
  availability,
  createInitialState,
  ending,
  greenhouseIsLocked,
  lowMeterCauses,
  projectedWaterAtEnd,
  reduce,
  resolveCard,
} from "../src/game/engine";
import { RULES } from "../src/game/rules";
import { deserialize } from "../src/game/save";
import { fmtBars, kidRate, meterStatus } from "../src/game/selectors";
import { cheapestPath } from "../src/game/terrain";
import { STICKERS, STEPS } from "../src/game/content";
import type { GameState } from "../src/game/types";

const base = (patch: Partial<GameState> = {}): GameState => ({ ...createInitialState(), ...patch });

describe("data package integration", () => {
  it("grid values come from final_mission1_solar.json", () => {
    expect(DATA.grids.giant.net).toBe(m1json.decision_cards[3].net_power_after_base_load);
    expect(DATA.grids.emergency.days).toBe(1);
  });
  it("water, shield and crop values match the JSON", () => {
    expect(DATA.waterSystems.recycler.net).toBe(-3);
    expect(DATA.waterSystems.full.recovery).toBe(13);
    expect(DATA.shields.water.gain).toBe(4);
    expect(DATA.crops.CR02).toMatchObject({ grow: 5, readiness: 3, waterL: 75, plantDays: 2 });
    expect(DATA.crops.CR04).toMatchObject({ plantDays: 2, waterL: 90, readiness: 4 });
    expect(DATA.crops.CR03.oxygen).toBe(1); // C-10
  });
  it("overrides conflicting JSON values with the approved scenario", () => {
    expect(p3json.rover_mechanics.fatigue_penalty.points_lost).toBe(2);
    expect(RULES.roverPointsTired).toBe(9); // C-02
    expect(DATA.c1.fullops.power).toBe(-3); // C-01
  });
  it("fuse amps come from final_crisis4_cme_blackout.json", () => {
    expect(RULES.amps).toEqual({ moxie: 4, heater: 3, pump: 2, leds: 4 });
  });
  it("every card has a sticker in the catalog", () => {
    for (const st of Object.values(STEPS))
      for (const c of st.cards) expect(STICKERS.find((s) => s.id === c.sticker)).toBeTruthy();
  });
  it("Neil briefing bubbles have at most 2 sentences", () => {
    for (const st of Object.values(STEPS)) expect(st.neil.length).toBeLessThanOrEqual(2);
  });
});

describe("scenario corrections", () => {
  it("Backup Thermal Loop opens only with Cozy Warm (C-06)", () => {
    expect(availability(base({ heatMode: "max" }), "c2", "backup").locked).toBe(true);
    expect(availability(base({ heatMode: "balanced" }), "c2", "backup").locked).toBe(false);
  });
  it("greenhouse uses the water forecast at Sol 30 (O-05)", () => {
    const oven = base({ waterSystem: "oven", waterL: 236, sol: 8, ticks: 7 });
    expect(projectedWaterAtEnd(oven)).toBeLessThan(90);
    expect(greenhouseIsLocked(oven)).toBe(true);
    expect(
      greenhouseIsLocked(base({ waterSystem: "recycler", waterL: 240, sol: 8, ticks: 7 })),
    ).toBe(false);
  });
  it("the gym halves the Quick Bunk Rest penalty (O-08)", () => {
    expect(resolveCard(base({ fitnessUnit: true }), "c5", "rest").deltas.readiness).toBe(-1);
    expect(resolveCard(base({ fitnessUnit: false }), "c5", "rest").deltas.readiness).toBe(-2);
  });
  it("stickers land after a decision", () => {
    const s = reduce(
      reduce(reduce(createInitialState(), { type: "OPEN_BRIEFING" }), { type: "BRIEFING_CTA" }),
      { type: "CHOOSE", card: "medium" },
    );
    expect(s.stickers).toContain("energy-master");
    expect(s.lastStickers).toEqual(["energy-master"]);
  });
});

describe("Ask Earth", () => {
  it("has 3 uses per game", () => {
    let s = base({ screen: "decision" });
    for (let i = 0; i < 5; i++) s = reduce(s, { type: "ASK_EARTH" });
    expect(s.askEarthLeft).toBe(0);
    expect(askEarthEnabled(s)).toBe(false);
  });
  it("is disabled during Crisis 4", () => {
    const s = reduce(base({ stepIndex: 8 }), { type: "OPEN_BRIEFING" });
    expect(s.neilOffline).toBe(true);
    expect(askEarthEnabled(s)).toBe(false);
    expect(reduce(s, { type: "ASK_EARTH" }).askEarthLeft).toBe(3);
  });
  it("every step except Crisis 4 has an exact Earth tip", () => {
    for (const st of Object.values(STEPS))
      expect(st.id === "c4" ? st.earthTip === null : !!st.earthTip).toBe(true);
  });
});

describe("rover", () => {
  it("Robot Scout has one use", () => {
    let s = base({ screen: "roverGrid", stepIndex: 10 });
    s = reduce(s, { type: "USE_SCOUT" });
    expect(s.scoutUsed).toBe(true);
    expect(reduce(s, { type: "USE_SCOUT" })).toBe(s);
  });
  it("cheapest path from base costs 9 on the authored map", () => {
    const p = cheapestPath([0, 0]);
    expect(p.cost).toBe(9);
    expect(p.path[0]).toEqual([0, 0]);
    expect(p.path[p.path.length - 1]).toEqual([4, 4]);
  });
  it("tired Rivo gets 9 move points with -1 power and -1 oxygen", () => {
    const s = reduce(
      base({
        stepIndex: 10,
        screen: "roverPrep",
        peakFitness: false,
        power: 8,
        oxygen: 6,
        sol: 27,
        ticks: 26,
      }),
      { type: "ROVER_CHARGE" },
    );
    expect(s.roverMovePoints).toBe(9);
    expect(s.power).toBe(5);
  });
});

describe("endings", () => {
  const green = { power: 6, oxygen: 6, radiation: 6, readiness: 6 };
  it("Legendary needs all four green and no safe mode", () => {
    expect(ending(base(green))).toBe("legendary");
    expect(ending(base({ ...green, safeModeTriggered: true }))).toBe("cautious");
  });
  it("Cautious when any meter is 1-3 and names the cause", () => {
    const s = base({
      ...green,
      readiness: 3,
      decisions: [
        {
          step: "c5",
          choice: "rest",
          choiceTitle: "QUICK BUNK REST",
          sol: 23,
          deltas: { readiness: -2.8 },
          outcome: "bad",
        },
      ],
    });
    expect(ending(s)).toBe("cautious");
    expect(lowMeterCauses(s)).toEqual([
      { meter: "readiness", name: "VITAL READINESS", value: 3, cause: "CRISIS 5: QUICK BUNK REST" },
    ]);
  });
  it("Emergency when an ending meter hits 0 on the final stage (O-06)", () => {
    const s = reduce(
      base({ stepIndex: 10, screen: "roverPrep", peakFitness: true, power: 2, sol: 27, ticks: 26 }),
      { type: "ROVER_CHARGE" },
    );
    expect(s.power).toBe(0);
    expect(s.finalZero).toMatchObject({ meter: "power", sol: 27 });
    expect(s.safeModeTriggered).toBe(false);
    expect(ending(s)).toBe("emergency");
  });
});

describe("kid number display", () => {
  it("shows whole and half bars", () => {
    expect(fmtBars(1.5)).toBe("1½");
    expect(fmtBars(0.5)).toBe("½");
    expect(fmtBars(2.4)).toBe("2½");
    expect(fmtBars(3.4)).toBe("3½");
    expect(fmtBars(7)).toBe("7");
  });
  it("describes drains like the scenario", () => {
    expect(kidRate(-0.5)).toBe("loses 1 bar every 2 days");
    expect(kidRate(-0.2)).toBe("loses 1 bar every 5 days");
    expect(kidRate(-0.4)).toBe("loses 1 bar about every 2½ days");
  });
  it("meter colours: green 4+, yellow 1-3, red 0", () => {
    expect(meterStatus(4)).toBe("ok");
    expect(meterStatus(1)).toBe("warning");
    expect(meterStatus(0)).toBe("critical");
  });
});

describe("save migration", () => {
  it("upgrades a version 1 save without losing progress", () => {
    const v2 = createInitialState();
    const v1: Record<string, unknown> = { ...v2, version: 1, sol: 12, safeModeTriggered: true };
    for (const k of [
      "safeModeLog",
      "finalZero",
      "stickers",
      "lastStickers",
      "askEarthLeft",
      "scoutUsed",
      "glossarySeen",
      "currentCause",
    ])
      delete v1[k];
    const m = deserialize(JSON.stringify(v1))!;
    expect(m.version).toBe(2);
    expect(m.sol).toBe(12);
    expect(m.askEarthLeft).toBe(3);
    expect(m.stickers).toEqual(["capsule-camper"]);
  });
});
