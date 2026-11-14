import { describe, expect, it } from "vitest";
import {
  applyDeltas,
  availability,
  createInitialState,
  ending,
  reduce,
  resolveFuse,
  tick,
  type Action,
} from "../src/game/engine";
import { deserialize, loadSave, serialize, SAVE_KEY } from "../src/game/save";
import { GOAL, TERRAIN_COST, neighbors, terrainAt } from "../src/game/terrain";
import type { GameState } from "../src/game/types";

const run = (s: GameState, ...actions: Action[]) => actions.reduce(reduce, s);
const brief = (): Action[] => [{ type: "OPEN_BRIEFING" }, { type: "BRIEFING_CTA" }];
const choose = (card: string, fitness?: boolean): Action[] => [
  { type: "CHOOSE", card, fitness },
  { type: "SLEEP" },
  { type: "WAKE" },
];

function drive(s: GameState, path: [number, number][]) {
  return path.reduce((st, [x, y]) => reduce(st, { type: "ROVER_MOVE", x, y }), s);
}

describe("passive drains match the scenario arithmetic", () => {
  it("radiation reaches 3.4 after 18 sols without a shield", () => {
    expect(tick(createInitialState(), 18).radiation).toBe(3.4);
  });
  it("readiness is 6 at the end of Sol 10 when nothing is built", () => {
    expect(tick(createInitialState(), 10).readiness).toBe(6);
  });
  it("tank-only water reaches 0 at Sol 25 and costs readiness once", () => {
    let s = { ...createInitialState(), waterSystem: "tank" as const };
    s = tick(s, 24);
    expect(s.waterL).toBe(12);
    const r = s.readiness;
    s = tick(s, 1);
    expect(s.waterL).toBe(0);
    expect(s.readiness).toBe(Math.round((r - 0.2 - 2) * 10) / 10);
    expect(s.waterEmptyHandled).toBe(true);
  });
  it("full water station keeps the tank full", () => {
    expect(tick({ ...createInitialState(), waterSystem: "full" }, 20).waterL).toBe(300);
  });
});

describe("decisions", () => {
  it("Mission 1 sets net power = grid - 1 and spends days", () => {
    const s = run(createInitialState(), ...brief(), { type: "CHOOSE", card: "emergency" });
    expect(s.power).toBe(5);
    expect(s.remainingSetupDays).toBe(9);
    expect(s.sol).toBe(2);
  });
  it("locks cards that need more days than remain", () => {
    const s = { ...createInitialState(), stepIndex: 3, remainingSetupDays: 2 };
    expect(availability(s, "m4", "fortress").locked).toBe(true);
    expect(availability(s, "m4", "water").locked).toBe(false);
  });
  it("greenhouse locks with tank-only water", () => {
    const s = { ...createInitialState(), waterSystem: "tank" as const };
    expect(availability(s, "m5", "CR03").locked).toBe(true);
  });
  it("soybeans need the recycler", () => {
    const s = {
      ...createInitialState(),
      waterSystem: "oven" as const,
      remainingSetupDays: 3,
      power: 10,
    };
    expect(availability(s, "m5", "CR04").locked).toBe(true);
    expect(availability({ ...s, waterSystem: "recycler" }, "m5", "CR04").locked).toBe(false);
  });
  it("Crisis 2 backup loop needs full warmth", () => {
    const s = createInitialState();
    expect(availability({ ...s, heatMode: "low" }, "c2", "backup").locked).toBe(true);
    expect(availability({ ...s, heatMode: "balanced" }, "c2", "backup").locked).toBe(false);
  });
  it("Crisis 5 air valves need a crop", () => {
    const s = createInitialState();
    expect(availability(s, "c5", "airvalves").locked).toBe(true);
    expect(availability({ ...s, crop: "CR01" }, "c5", "airvalves").locked).toBe(false);
  });
  it("Emergency grid + full operations in the dust storm triggers safe mode", () => {
    const s = {
      ...createInitialState(),
      stepIndex: 5,
      screen: "decision" as const,
      grid: "emergency" as const,
      power: 5,
      sol: 11,
      ticks: 10,
    };
    const n = reduce(s, { type: "CHOOSE", card: "fullops" });
    expect(n.safeModeTriggered).toBe(true);
    expect(n.power).toBe(2);
    expect(n.safeModeLog[0]).toMatchObject({
      meter: "power",
      sol: 11,
      cause: "CRISIS 1: FULL POWER BLAST",
    });
    expect(n.stickers).toContain("capsule-camper");
  });
  it("Full Power Blast costs -3 TOTAL for bigger grids (C-01)", () => {
    const s = {
      ...createInitialState(),
      stepIndex: 5,
      screen: "decision" as const,
      grid: "basic" as const,
      power: 8,
      sol: 11,
      ticks: 10,
    };
    expect(reduce(s, { type: "CHOOSE", card: "fullops" }).power).toBe(5);
    expect(
      reduce({ ...s, grid: "giant", power: 12 }, { type: "CHOOSE", card: "fullops" }).power,
    ).toBe(9);
  });
  it("safe mode restarts the meter at 2 and keeps the others", () => {
    const s0 = createInitialState();
    const n = applyDeltas(s0, { oxygen: -20 });
    expect(n.oxygen).toBe(2);
    expect(n.radiation).toBe(s0.radiation);
    expect(n.safeModeTriggered).toBe(true);
    expect(n.logbook.some((e) => e.title === "SAFE-MODE CAPSULE" && e.text.includes("Sol 1"))).toBe(
      true,
    );
  });
});

describe("fuse box", () => {
  it("smart wiring", () =>
    expect(resolveFuse(["moxie", "heater", "pump"]).deltas).toEqual({ power: -1, readiness: -2 }));
  it("minimal wiring", () =>
    expect(resolveFuse(["moxie", "heater"]).deltas).toEqual({
      power: -1,
      readiness: -2,
      radiation: -1,
    }));
  it("overload", () =>
    expect(resolveFuse(["moxie", "heater", "pump", "leds"]).deltas).toEqual({
      power: -3,
      oxygen: -2,
    }));
  it("partial wiring is penalized", () =>
    expect(resolveFuse(["moxie", "pump", "leds"]).outcome).toBe("bad"));
});

describe("terrain", () => {
  const bfsFlat = () => {
    const seen = new Set(["0,0"]);
    let frontier: [number, number][] = [[0, 0]];
    for (let d = 1; d < 30; d++) {
      const next: [number, number][] = [];
      for (const p of frontier)
        for (const [x, y] of neighbors(p)) {
          const t = terrainAt(x, y);
          if ((t === "flat" || t === "goal") && !seen.has(`${x},${y}`)) {
            if (x === GOAL[0] && y === GOAL[1]) return d;
            seen.add(`${x},${y}`);
            next.push([x, y]);
          }
        }
      frontier = next;
    }
    return -1;
  };
  const cheapest = () => {
    const best = new Map<string, number>([["0,0", 0]]);
    const q: [number, [number, number]][] = [[0, [0, 0]]];
    while (q.length) {
      q.sort((a, b) => a[0] - b[0]);
      const [c, p] = q.shift()!;
      if (p[0] === 4 && p[1] === 4) return c;
      for (const [x, y] of neighbors(p)) {
        const nc = c + TERRAIN_COST[terrainAt(x, y)];
        if (nc < (best.get(`${x},${y}`) ?? 99)) {
          best.set(`${x},${y}`, nc);
          q.push([nc, [x, y]]);
        }
      }
    }
    return -1;
  };
  it("scenario tiles are fixed", () => {
    expect(terrainAt(3, 0)).toBe("ice");
    expect(terrainAt(3, 3)).toBe("ice");
    expect(terrainAt(2, 2)).toBe("mountain");
    expect(terrainAt(3, 2)).toBe("mountain");
  });
  it("all-flat route takes 10 moves and the cheapest route costs 9", () => {
    expect(bfsFlat()).toBe(10);
    expect(cheapest()).toBe(9);
  });
});

// Full playthroughs
function playPhase1(choices: {
  m1: string;
  m2: string;
  m3: string;
  m4: string;
  m5: string;
  fit?: boolean;
}) {
  let s = createInitialState();
  s = run(s, ...brief(), ...choose(choices.m1));
  s = run(s, ...brief(), ...choose(choices.m2));
  s = run(
    s,
    { type: "OPEN_BRIEFING" },
    { type: "BRIEFING_CTA" },
    { type: "INSTALL_HEATER" },
    ...choose(choices.m3),
  );
  s = run(s, ...brief(), ...choose(choices.m4));
  s = run(s, ...brief(), ...choose(choices.m5, choices.fit));
  expect(s.screen).toBe("summary1");
  expect(s.sol).toBe(11);
  return run(s, { type: "CONTINUE_SUMMARY" });
}

function playRest(
  s0: GameState,
  c: {
    c1: string;
    c2: string;
    c3: string;
    cables: ("moxie" | "heater" | "pump" | "leds")[];
    c5: string;
    timing: "morning" | "delay";
    path: [number, number][];
  },
) {
  let s = run(s0, ...brief(), ...choose(c.c1));
  s = run(s, ...brief(), { type: "TASK_DONE" }, ...choose(c.c2));
  s = run(s, ...brief(), ...choose(c.c3));
  s = run(
    s,
    ...brief(),
    { type: "FUSE_SUBMIT", cables: c.cables },
    { type: "SLEEP" },
    { type: "WAKE" },
  );
  s = run(s, ...brief(), { type: "CHOOSE", card: c.c5 }, { type: "SLEEP" }, { type: "WAKE" });
  expect(s.screen).toBe("summary2");
  expect(s.sol).toBe(27);
  s = run(
    s,
    { type: "CONTINUE_SUMMARY" },
    ...brief(),
    { type: "ROVER_CHARGE" },
    { type: "ROVER_TO_LAUNCH" },
    { type: "ROVER_LAUNCH", timing: c.timing },
  );
  s = drive(s, c.path);
  expect(s.screen).toBe("finale");
  expect(s.sol).toBe(30);
  return s;
}

const ICE_ROUTE: [number, number][] = [
  [1, 0],
  [2, 0],
  [3, 0],
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
];

describe("full 30-sol playthroughs", () => {
  it("optimal path reaches the Legendary ending", () => {
    const s = playRest(
      playPhase1({
        m1: "giant",
        m2: "recycler",
        m3: "balanced",
        m4: "water",
        m5: "CR01",
        fit: true,
      }),
      {
        c1: "clean",
        c2: "backup",
        c3: "seal",
        cables: ["moxie", "heater", "pump"],
        c5: "recovery",
        timing: "morning",
        path: ICE_ROUTE,
      },
    );
    expect(s.safeModeTriggered).toBe(false);
    expect(s.roverTowed).toBe(false);
    expect(ending(s)).toBe("legendary");
  });
  it("tank-only + skipped shield uses the capsule, then ends in Emergency", () => {
    const s = playRest(
      playPhase1({ m1: "emergency", m2: "tank", m3: "low", m4: "hull", m5: "none", fit: true }),
      {
        c1: "hibernate",
        c2: "oxygen",
        c3: "hesitate",
        cables: ["moxie", "heater"],
        c5: "rest",
        timing: "delay",
        path: ICE_ROUTE,
      },
    );
    // The capsule was used during Sols 1-29 (temporary Safe-Mode), and the tired Rover trip then
    // empties a meter on the final stage, which gives the Emergency ending.
    expect(s.safeModeTriggered).toBe(true);
    expect(s.safeModeLog.length).toBeGreaterThan(0);
    expect(s.finalZero).not.toBeNull();
    expect(ending(s)).toBe("emergency");
  });
  it("a mixed path reaches the Cautious ending", () => {
    const s = playRest(
      playPhase1({ m1: "medium", m2: "recycler", m3: "core", m4: "soil", m5: "CR01", fit: true }),
      {
        c1: "clean",
        c2: "maxheat",
        c3: "seal",
        cables: ["moxie", "heater"],
        c5: "airvalves",
        timing: "morning",
        path: ICE_ROUTE,
      },
    );
    expect(s.safeModeTriggered).toBe(false);
    expect(ending(s)).toBe("cautious");
  });
  it("tired Rivo starts with 9 points and is towed after running out", () => {
    const s = playRest(
      playPhase1({
        m1: "giant",
        m2: "recycler",
        m3: "balanced",
        m4: "water",
        m5: "CR01",
        fit: true,
      }),
      {
        c1: "clean",
        c2: "backup",
        c3: "seal",
        cables: ["moxie", "heater", "pump"],
        c5: "rest",
        timing: "morning",
        path: [
          [0, 1],
          [1, 1],
          [2, 1],
          [3, 1],
          [4, 1],
        ],
      },
    );
    expect(s.roverTowed).toBe(true);
    expect(s.stickers).not.toContain("rover-captain");
  });
});

describe("save", () => {
  it("round-trips", () => {
    const s = createInitialState();
    expect(deserialize(serialize(s))).toEqual(s);
  });
  it("discards corrupt saves", () => {
    const mem = new Map<string, string>([[SAVE_KEY, "{broken"]]);
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    expect(loadSave(store)).toEqual({ state: null, corrupt: true });
    expect(mem.has(SAVE_KEY)).toBe(false);
  });
});
