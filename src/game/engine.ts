import { STEP_ORDER, STEPS } from "./content";
import { DATA } from "./data";
import { RULES, clamp, round1 } from "./rules";
import { GOAL, TERRAIN_COST, isAdjacent, neighbors, terrainAt } from "./terrain";
import type {
  Cable,
  CoreMeter,
  CropId,
  Deltas,
  EndingTier,
  FactLabel,
  GameState,
  Grid,
  HeatMode,
  LogSection,
  SafeModeRecord,
  Shield,
  StepId,
  WaterSystem,
} from "./types";

// ---------- initial state ----------

export function createInitialState(): GameState {
  const s: GameState = {
    version: 2,
    screen: "hub",
    stepIndex: 0,
    sol: 1,
    ticks: 0,
    remainingSetupDays: RULES.setupDays,
    power: RULES.startPower,
    waterL: RULES.waterMaxL,
    oxygen: RULES.oxygenStart,
    radiation: RULES.radiationStart,
    readiness: RULES.readinessStart,
    grid: null,
    waterSystem: null,
    heatInstalled: false,
    heatMode: null,
    shield: "hull",
    crop: null,
    cropMatureSol: null,
    cropMatured: false,
    fitnessUnit: false,
    greenhouseLocked: false,
    pipesInsulated: false,
    neilOffline: false,
    peakFitness: false,
    dustCleaned: false,
    waterEmptyHandled: false,
    dehydrationApplied: false,
    safeModeTriggered: false,
    safeModeLog: [],
    finalZero: null,
    stickers: [],
    lastStickers: [],
    askEarthLeft: RULES.askEarthUses,
    scoutUsed: false,
    glossarySeen: [],
    currentCause: "",
    lastChoice: null,
    lastResultText: null,
    lastOutcome: null,
    lastDeltas: null,
    overnight: [],
    alerts: [],
    roverMovePoints: 0,
    roverMax: RULES.roverPointsPeak,
    roverPos: [0, 0],
    roverPath: [[0, 0]],
    roverTowed: false,
    launchTiming: null,
    roverCharged: false,
    beaconActive: false,
    decisions: [],
    logbook: [],
  };
  return addLog(
    s,
    "crisis",
    "REVO MISSION EVENT",
    "MISSION START",
    "Rivo landed at Alpha Base in Jezero Crater. 30 sols until the Ares-2 crew arrives. The first 10 are for building the base.",
  );
}

// ---------- helpers ----------

export const currentStepId = (s: GameState): StepId =>
  STEP_ORDER[Math.min(s.stepIndex, STEP_ORDER.length - 1)];
export const currentStep = (s: GameState) => STEPS[currentStepId(s)];
export const inPhase1 = (s: GameState) => s.stepIndex <= 4;
/** Phase 3 is the final stage: a meter hitting 0 here gives the Emergency ending (O-06). */
export const inFinalStage = (s: GameState) => s.stepIndex >= STEP_ORDER.indexOf("p3");

let logCounter = 0;
export function addLog(
  s: GameState,
  section: LogSection,
  label: FactLabel,
  title: string,
  text: string,
): GameState {
  logCounter += 1;
  const id = `${s.sol}-${s.logbook.length}-${logCounter}`;
  return {
    ...s,
    logbook: [...s.logbook, { id, sol: s.sol, section, label, title, text, unread: true }],
  };
}

export const METER_NAMES: Record<CoreMeter, string> = {
  power: "BATTERY",
  oxygen: "OXYGEN",
  radiation: "RADIATION SHIELD",
  readiness: "VITAL READINESS",
};

export function awardSticker(s: GameState, id: string): GameState {
  const last = s.lastStickers.includes(id) ? s.lastStickers : [...s.lastStickers, id];
  if (s.stickers.includes(id)) return { ...s, lastStickers: last };
  return { ...s, stickers: [...s.stickers, id], lastStickers: last };
}

/** Applies deltas, clamps meters and runs the Safe-Mode rule when a core meter hits 0. */
export function applyDeltas(s: GameState, d: Deltas): GameState {
  let n: GameState = {
    ...s,
    power: round1(Math.max(0, s.power + (d.power ?? 0))),
    oxygen: round1(clamp(s.oxygen + (d.oxygen ?? 0), 0, 10)),
    radiation: round1(clamp(s.radiation + (d.radiation ?? 0), 0, 10)),
    readiness: round1(clamp(s.readiness + (d.readiness ?? 0), 0, 10)),
    waterL: round1(clamp(s.waterL + (d.waterL ?? 0), 0, RULES.waterMaxL)),
  };
  n = checkWaterEmpty(n);
  return checkSafeMode(n);
}

function checkWaterEmpty(s: GameState): GameState {
  if (s.waterL > 0 || s.waterEmptyHandled) return s;
  let n: GameState = { ...s, waterEmptyHandled: true };
  n = {
    ...n,
    readiness: round1(clamp(n.readiness + RULES.waterEmptyReadinessPenalty, 0, 10)),
    alerts: [...n.alerts, "The water tank is empty! Rivo is thirsty: -2 hearts."],
  };
  return addLog(
    n,
    "water",
    "GAME SIMULATION",
    "WATER TANK EMPTY",
    "The water tank ran dry. Thirst cost 2 hearts of Vital Readiness.",
  );
}

/**
 * MD 0.7 Safe-Mode rule (Sols 1-29): the meter that hit 0 restarts at 2/10, other meters keep their
 * values, safe_mode_used = true, Capsule Camper sticker, logbook records meter, Sol and cause.
 * On the final stage (Phase 3) the meter stays at 0 and the Emergency ending is set (O-06).
 */
function checkSafeMode(s: GameState): GameState {
  let n = s;
  for (const m of ["power", "oxygen", "radiation", "readiness"] as CoreMeter[]) {
    if (n[m] > 0) continue;
    const record: SafeModeRecord = { meter: m, sol: n.sol, cause: n.currentCause || "daily use" };
    if (inFinalStage(n)) {
      if (n.finalZero) continue;
      n = {
        ...n,
        finalZero: record,
        alerts: [
          ...n.alerts,
          `${METER_NAMES[m]} HIT ZERO on Sol ${n.sol}! The base is protecting Rivo in the Escape Pod.`,
        ],
      };
      n = addLog(
        n,
        "crisis",
        "GAME SIMULATION",
        "EMERGENCY ESCAPE POD",
        `${METER_NAMES[m]} reached 0 on Sol ${n.sol} (${record.cause}). Rivo is safe in the Escape Pod until Ares-2 arrives.`,
      );
      continue;
    }
    n = {
      ...n,
      [m]: RULES.safeModeRestoreBars,
      safeModeTriggered: true,
      safeModeLog: [...n.safeModeLog, record],
      alerts: [
        ...n.alerts,
        `SAFE-MODE: ${METER_NAMES[m]} hit 0. Don't worry, Rivo! The capsule is keeping you safe while the base restarts.`,
      ],
    };
    n = awardSticker(n, "capsule-camper");
    n = addLog(
      n,
      "crisis",
      "GAME SIMULATION",
      "SAFE-MODE CAPSULE",
      `${METER_NAMES[m]} hit 0 on Sol ${n.sol}. Cause: ${record.cause}. The base restarted it at 2 of 10. Try a different card next time!`,
    );
  }
  return n;
}

export function oxygenNetPerSol(s: GameState): number {
  if (!s.heatInstalled) return 0;
  const out = s.heatMode ? RULES.heatOxygenOutput[s.heatMode] : 0;
  return round1(out - RULES.oxygenDrainPerSol);
}

export function waterNetPerSol(s: GameState): number {
  return waterRecovery(s) - RULES.waterLossPerSol;
}

export const radiationNetPerSol = (s: GameState) =>
  s.shield === "hull" ? -RULES.radiationDrainPerSol : 0;
export const readinessNetPerSol = () => -RULES.readinessDrainPerSol;

export const CROP_INFO: Record<CropId, (typeof DATA.crops)[CropId]> = DATA.crops;

/** Water forecast line (MD M2): projected liters at the end of the game with the current system. */
export function projectedWaterAtEnd(s: GameState, extraLiters = 0): number {
  const solsLeft = Math.max(0, RULES.totalSols - s.ticks);
  return clamp(s.waterL - extraLiters + waterNetPerSol(s) * solsLeft, 0, RULES.waterMaxL);
}

/** Advances the clock one sol at a time with passive drains. */
export function tick(s: GameState, sols: number): GameState {
  let n: GameState = {
    ...s,
    currentCause: s.currentCause ? `${s.currentCause} (daily use)` : "daily use",
  };
  for (let i = 0; i < sols; i++) {
    if (n.sol >= RULES.totalSols) break;
    const notes: string[] = [];
    const water = n.waterL + waterNetPerSol(n);
    const dWater = round1(clamp(water, 0, RULES.waterMaxL) - n.waterL);
    const dOxy = oxygenNetPerSol(n);
    const dRad = radiationNetPerSol(n);
    const dReady = readinessNetPerSol();
    if (dWater) notes.push(`WATER ${fmt(dWater)} L`);
    if (dOxy) notes.push(`OXYGEN ${fmt(dOxy)}`);
    if (dRad) notes.push(`RADIATION ${fmt(dRad)}`);
    notes.push(`READINESS ${fmt(dReady)}`);
    n = applyDeltas(n, { waterL: dWater, oxygen: dOxy, radiation: dRad, readiness: dReady });
    n = { ...n, sol: n.sol + 1, ticks: n.ticks + 1 };
    if (inPhase1(n)) n = { ...n, remainingSetupDays: Math.max(0, RULES.setupDays - n.ticks) };
    if (n.crop && !n.cropMatured && n.cropMatureSol !== null && n.sol >= n.cropMatureSol) {
      const c = CROP_INFO[n.crop];
      n = applyDeltas({ ...n, cropMatured: true }, { readiness: c.readiness, oxygen: c.oxygen });
      notes.push(
        `${c.name.toUpperCase()} HARVEST +${c.readiness} HEART${c.oxygen ? ` +${c.oxygen} O2` : ""}`,
      );
      n = addLog(
        n,
        "health",
        "GAME SIMULATION",
        `${c.name.toUpperCase()} READY`,
        `The ${c.name.toLowerCase()} finished growing. +${c.readiness} hearts${c.oxygen ? `, +${c.oxygen} oxygen` : ""}.`,
      );
    }
    n = { ...n, overnight: [...n.overnight, { sol: n.sol - 1, notes }] };
  }
  return { ...n, currentCause: s.currentCause };
}

function waterRecovery(s: GameState) {
  return s.waterSystem ? RULES.waterRecovery[s.waterSystem] : 0;
}

const fmt = (n: number) => (n > 0 ? `+${round1(n)}` : `${round1(n)}`);

// ---------- availability ----------

export interface Availability {
  locked: boolean;
  reason?: string;
}

export const FITNESS = { days: 1, power: 1, readiness: 2 };

export function greenhouseIsLocked(s: GameState) {
  if (s.waterSystem === "tank") return true;
  if (RULES.greenhouseUsesProjectedWater) return projectedWaterAtEnd(s) < RULES.greenhouseMinWaterL;
  return s.waterL < RULES.greenhouseMinWaterL;
}

export function cardDays(step: StepId, card: string): number {
  switch (step) {
    case "m1":
      return DATA.grids[card as Grid]?.days ?? 0;
    case "m2":
      return DATA.waterSystems[card as WaterSystem]?.days ?? 0;
    case "m4":
      return DATA.shields[card as Shield]?.days ?? 0;
    case "m5": {
      const c = CROP_INFO[card as CropId];
      if (!c) return 0;
      return card === "CR04" ? c.plantDays + FITNESS.days : c.plantDays;
    }
    default:
      return 0;
  }
}

export function availability(s: GameState, step: StepId, card: string): Availability {
  const days = cardDays(step, card);
  if (step.startsWith("m") && days > s.remainingSetupDays) {
    return {
      locked: true,
      reason: `Needs ${days} day${days === 1 ? "" : "s"}. Only ${s.remainingSetupDays} left.`,
    };
  }
  if (step === "m4" && (card === "water" || card === "fortress") && s.waterL <= 0) {
    return { locked: true, reason: "No water in the tank to build a water wall!" };
  }
  if (step === "m5") {
    if (greenhouseIsLocked(s)) {
      return {
        locked: true,
        reason:
          s.waterSystem === "tank"
            ? "Greenhouse locked: there is no water machine from Mission 2."
            : "Greenhouse locked: the water forecast is under 3 bars at Sol 30.",
      };
    }
    const c = CROP_INFO[card as CropId];
    if (c && s.waterL < c.waterL)
      return {
        locked: true,
        reason: `Needs ${c.waterL / RULES.litersPerBar} water bars in the tank.`,
      };
    if (card === "CR04") {
      if (s.waterSystem !== "recycler" && s.waterSystem !== "full")
        return { locked: true, reason: "Needs the Water Recycler from Mission 2." };
      if (s.power < 3) return { locked: true, reason: "Needs at least 3 power bars." };
    }
  }
  // C-06: the Backup Thermal Loop opens only with Cozy Warm (Full Warmth) from Mission 3.
  if (step === "c2" && card === "backup" && s.heatMode !== "balanced") {
    return { locked: true, reason: "Opens only if you chose Cozy Warm in Mission 3." };
  }
  if (step === "c5" && card === "airvalves" && !s.crop) {
    return { locked: true, reason: "No crops in the Greenhouse to open the valves." };
  }
  return { locked: false };
}

export function fitnessAvailability(s: GameState, crop: string | null): Availability {
  if (crop === "CR04") return { locked: true, reason: "Already included with Soybeans." };
  const used = crop ? cardDays("m5", crop) : 0;
  if (s.remainingSetupDays - used < FITNESS.days)
    return { locked: true, reason: "No day left for the Gym." };
  return { locked: false };
}

// ---------- card resolution ----------

export interface Resolution {
  deltas: Deltas;
  days: number;
  patch: Partial<GameState>;
  outcome: "good" | "warn" | "bad";
  text: string;
  log: { section: LogSection; title: string; text: string };
  title: string;
  stickers: string[];
}

const card = (step: StepId, id: string) => STEPS[step].cards.find((c) => c.id === id);

export function resolveCard(
  s: GameState,
  step: StepId,
  cardId: string,
  fitness = false,
): Resolution {
  const def = card(step, cardId);
  const title = def?.title ?? cardId.toUpperCase();
  const text = def?.result ?? "";
  const stickers = def ? [def.sticker] : [];
  switch (step) {
    case "m1": {
      const g = DATA.grids[cardId as Grid];
      return {
        title,
        days: g.days,
        deltas: { power: g.net - s.power, days: -g.days },
        patch: { grid: cardId as Grid },
        outcome: cardId === "emergency" ? "warn" : "good",
        text,
        stickers,
        log: {
          section: "power",
          title: "DAILY POWER",
          text: `${title}: ${g.gross} power bars a day, minus 1 for the base computer = ${g.net} bars. Used ${g.days} day(s).`,
        },
      };
    }
    case "m2": {
      const w = DATA.waterSystems[cardId as WaterSystem];
      return {
        title,
        days: w.days,
        deltas: { power: -w.power, days: -w.days },
        patch: { waterSystem: cardId as WaterSystem },
        outcome: cardId === "recycler" ? "good" : cardId === "full" ? "warn" : "bad",
        text,
        stickers,
        log: {
          section: "water",
          title: "WATER SYSTEM",
          text: `${title}: water ${w.net} L per sol. Power -${w.power} a day. Power left: ${Math.max(0, s.power - w.power)} bars.`,
        },
      };
    }
    case "m3": {
      const h = DATA.heatModes[cardId as HeatMode];
      return {
        title,
        days: h.days,
        deltas: { power: -h.power, days: -h.days, oxygen: cardId === "max" ? 10 - s.oxygen : 0 },
        patch: { heatMode: cardId as HeatMode },
        outcome: cardId === "balanced" ? "good" : cardId === "low" ? "bad" : "warn",
        text,
        stickers,
        log: {
          section: "air",
          title: "HEAT, AIR & AMPS",
          text: `${title}: -${h.power} power a day. Amps each machine eats: Air-Maker (MOXIE) ${RULES.amps.moxie} A, Heater ${RULES.amps.heater} A, Water Shield Pump ${RULES.amps.pump} A, Greenhouse LEDs ${RULES.amps.leds} A. Breaker limit: ${RULES.fuseLimitAmps} A.`,
        },
      };
    }
    case "m4": {
      const sh = DATA.shields[cardId as Shield];
      return {
        title,
        days: sh.days,
        deltas: { power: -sh.power, radiation: sh.gain, days: -sh.days },
        patch: { shield: cardId as Shield },
        outcome: cardId === "water" ? "good" : cardId === "hull" ? "bad" : "warn",
        text,
        stickers,
        log: {
          section: "shield",
          title: "SHIELD & PUMP",
          text: `${title}: +${sh.gain} shield. Pump power: -${sh.power} a day.`,
        },
      };
    }
    case "m5": {
      const crop = cardId === "none" ? null : (cardId as CropId);
      const c = crop ? CROP_INFO[crop] : null;
      const withFit = crop === "CR04" || fitness;
      const days = (c?.plantDays ?? 0) + (withFit ? FITNESS.days : 0);
      const power = (c?.power ?? 0) + (withFit && crop !== "CR04" ? FITNESS.power : 0);
      const parts: string[] = [];
      if (def) parts.push(def.result);
      if (withFit && crop !== "CR04")
        parts.push("The Gym and warm-blue sleepy light switch on in the Crew Quarters.");
      if (!parts.length) parts.push("Nothing was built this time.");
      return {
        title: c
          ? `${title}${withFit && crop !== "CR04" ? " + GYM" : ""}`
          : withFit
            ? "GYM & SLEEPY LIGHT ONLY"
            : "SKIPPED",
        days,
        deltas: {
          power: -power,
          waterL: -(c?.waterL ?? 0),
          readiness: withFit ? FITNESS.readiness : 0,
          days: -days,
        },
        patch: {
          crop,
          cropMatureSol: c ? s.sol + c.grow : null,
          fitnessUnit: withFit,
          greenhouseLocked: greenhouseIsLocked(s),
        },
        outcome: c && withFit ? "good" : c || withFit ? "warn" : "bad",
        text: parts.join(" "),
        stickers,
        log: {
          section: "health",
          title: "GREENHOUSE & GYM",
          text: `${c ? `Planted ${c.name} (${crop}): -${c.waterL / RULES.litersPerBar} water bars, -${c.power} power a day.` : "No crop planted."} ${withFit ? "Gym installed: +2 hearts." : "No gym."}`,
        },
      };
    }
    case "c1": {
      if (cardId === "hibernate")
        return {
          title,
          days: 3,
          deltas: DATA.c1.hibernate,
          patch: {},
          outcome: "warn",
          text,
          stickers,
          log: {
            section: "power",
            title: "AFTER THE STORM",
            text: "Hibernation: -1 power, -2 hearts in total.",
          },
        };
      if (cardId === "clean")
        return {
          title,
          days: 3,
          deltas: DATA.c1.clean,
          patch: { dustCleaned: true },
          outcome: "good",
          text,
          stickers,
          log: {
            section: "power",
            title: "AFTER THE STORM",
            text: "Panels swept clean (dust 0%). +2 power, -1 oxygen, -1 shield in total.",
          },
        };
      // C-01: -3 TOTAL. O-01 (owner approved): the Emergency Grid always reaches 0.
      const forcedZero = s.grid === "emergency";
      const power = forcedZero ? -s.power : DATA.c1.fullops.power;
      const drained = s.power + power <= 0;
      return {
        title,
        days: 3,
        deltas: { power },
        patch: {},
        outcome: drained ? "bad" : "warn",
        text: drained
          ? "The lights stayed bright, but the small grid could not keep up and the battery ran dry."
          : text,
        stickers,
        log: {
          section: "power",
          title: "AFTER THE STORM",
          text: `Full Power Blast: ${power} power in total${forcedZero ? " (the small grid only made 40% power in the storm)" : ""}.`,
        },
      };
    }
    case "c2": {
      const extra: Deltas = {};
      let note = "";
      // O-04 (owner approved): Crisis 2 rule for a cold base.
      if (s.heatMode === "low") {
        extra.readiness = -1;
        extra.power = -1;
        note = " The cold base made it worse: -1 extra heart and power.";
      } else if (s.heatMode === "core") {
        extra.power = -1;
        note = " Chilly bedrooms cost 1 extra power bar.";
      }
      const d = DATA.c2[cardId as "maxheat" | "oxygen" | "backup"];
      return {
        title,
        days: d.days,
        deltas: {
          power: d.power + (extra.power ?? 0),
          oxygen: d.oxygen,
          readiness: d.readiness + (extra.readiness ?? 0),
        },
        patch: { pipesInsulated: true },
        outcome: cardId === "backup" ? "good" : "warn",
        text: text + note,
        stickers,
        log: {
          section: "air",
          title: "PIPE HEALTH",
          text: `Cold wave: ${title}. Pipes are insulated for the rest of the game.${note}`,
        },
      };
    }
    case "c3": {
      const fortress = s.shield === "fortress";
      const base = DATA.c3[cardId as "seal" | "greenhouse" | "hesitate"];
      let radiation = base.radiation;
      if (cardId === "seal")
        radiation = s.shield === "water" || fortress ? 0 : s.shield === "soil" ? -1 : -3;
      else if (fortress) radiation = 0; // Double Fortress: immune even if the door is forgotten
      const d: Deltas = { power: base.power, radiation, readiness: base.readiness };
      return {
        title,
        days: base.days,
        deltas: d,
        patch: {},
        outcome:
          radiation === 0 && cardId !== "hesitate"
            ? "good"
            : cardId === "hesitate"
              ? "bad"
              : "warn",
        text:
          cardId === "seal" && radiation < 0
            ? `The hatch locks, but without a water shield some rays get through: ${radiation} shield.`
            : text,
        stickers,
        log: {
          section: "shield",
          title: "SPACE-RAY DOSE",
          text: `Archived DONKI flare ${DATA.c3.flareClass}: ${title}. Shield change ${radiation}. Hatch ${cardId === "seal" ? "sealed" : "open"}.`,
        },
      };
    }
    case "c5": {
      let d: Deltas;
      let t = text;
      if (cardId === "recovery") {
        d = {
          power: DATA.c5.recovery.power,
          oxygen: DATA.c5.recovery.oxygen,
          readiness: s.fitnessUnit ? DATA.c5.recovery.withUnit : DATA.c5.recovery.withoutUnit,
        };
        if (!s.fitnessUnit)
          t = "No gym machine, so Rivo does a body-weight workout instead: +1½ hearts.";
      } else if (cardId === "airvalves") {
        d = { oxygen: DATA.c5.airvalves.oxygen, readiness: DATA.c5.airvalves.readiness };
      } else {
        // O-08: the M5 Gym halves the Sol 24 tiredness penalty.
        d = { readiness: s.fitnessUnit ? DATA.c5.rest.readiness / 2 : DATA.c5.rest.readiness };
      }
      return {
        title,
        days: 4,
        deltas: d,
        patch: {},
        outcome: cardId === "rest" ? "bad" : "good",
        text: t,
        stickers,
        log: {
          section: "health",
          title: "FITNESS",
          text: `${title}: hearts ${fmt(d.readiness ?? 0)}.`,
        },
      };
    }
    default:
      throw new Error(`No cards for step ${step}`);
  }
}

// ---------- fuse box ----------

export function fuseAmps(cables: Cable[]) {
  return cables.reduce((sum, c) => sum + RULES.amps[c], 0);
}

export function resolveFuse(cables: Cable[]): Resolution {
  const amps = fuseAmps(cables);
  const has = (c: Cable) => cables.includes(c);
  const fx = (e: Record<string, number | boolean>): Deltas => ({
    power: -(Number(e.power_loss) || 0),
    readiness: -(Number(e.vital_readiness_loss) || 0) || undefined,
    radiation: -(Number(e.radiation_loss) || 0) || undefined,
    oxygen: -(Number(e.oxygen_loss) || 0) || undefined,
  });
  const clean = (d: Deltas) =>
    Object.fromEntries(Object.entries(d).filter(([, v]) => v !== undefined)) as Deltas;
  if (amps > RULES.fuseLimitAmps) {
    return {
      title: "CONNECT ALL 4 WIRES",
      days: 3,
      deltas: clean(fx(DATA.c4.overload)),
      patch: {},
      outcome: "bad",
      text: `ZAP! ${amps} Amps is more than 10. The breaker blew, and the wires reset to basic life support.`,
      stickers: ["spark-tester"],
      log: {
        section: "crisis",
        title: "GRID STATUS",
        text: `Fuse overload at ${amps} A (limit 10 A). -3 power, -2 oxygen. Mission Control contact restored on Sol 22.`,
      },
    };
  }
  if (has("moxie") && has("heater")) {
    if (has("pump"))
      return {
        title: "SMART LOGBOOK WIRING",
        days: 3,
        deltas: clean(fx(DATA.c4.smart)),
        patch: {},
        outcome: "good",
        text: "Air-Maker + Heater + Shield Pump = 9 Amps. The fuse LEDs glow green and the lights come back!",
        stickers: ["junior-electrician"],
        log: {
          section: "crisis",
          title: "GRID STATUS",
          text: "Smart wiring: 9 A. Greenhouse lights paused (-2 hearts). Mission Control contact restored on Sol 22.",
        },
      };
    return {
      title: "MINIMAL LIFE SUPPORT",
      days: 3,
      deltas: clean(fx(DATA.c4.minimal)),
      patch: {},
      outcome: "warn",
      text: "Air-Maker + Heater = 7 Amps. Very safe, but the unpowered shield pump loses 1 shield bar.",
      stickers: ["circuit-scout"],
      log: {
        section: "crisis",
        title: "GRID STATUS",
        text: `Minimal wiring: ${amps} A. Shield pump off (-1 shield). Mission Control contact restored on Sol 22.`,
      },
    };
  }
  // O-10 (open): safe load that leaves out the Air-Maker or the Heater.
  const d: Deltas = { power: -1, oxygen: -1 };
  if (!has("pump")) d.radiation = -1;
  if (!has("leds")) d.readiness = -2;
  const missing = [!has("moxie") && "the Air-Maker", !has("heater") && "the Heater"]
    .filter(Boolean)
    .join(" and ");
  return {
    title: `PARTIAL WIRING (${amps} A)`,
    days: 3,
    deltas: d,
    patch: {},
    outcome: "bad",
    text: `The breaker holds at ${amps} Amps, but ${missing} had no power. Life support struggled.`,
    stickers: [],
    log: {
      section: "crisis",
      title: "GRID STATUS",
      text: `Partial wiring: ${amps} A without ${missing}.`,
    },
  };
}

// ---------- actions ----------

export type Action =
  | { type: "NEW_GAME" }
  | { type: "LOAD"; state: GameState }
  | { type: "GO_TITLE" }
  | { type: "OPEN_BRIEFING" }
  | { type: "BRIEFING_CTA" }
  | { type: "INSTALL_HEATER" }
  | { type: "TASK_DONE" }
  | { type: "CHOOSE"; card: string; fitness?: boolean }
  | { type: "TIMEOUT" }
  | { type: "FUSE_SUBMIT"; cables: Cable[] }
  | { type: "SLEEP" }
  | { type: "WAKE" }
  | { type: "CONTINUE_SUMMARY" }
  | { type: "ROVER_CHARGE" }
  | { type: "ROVER_TO_LAUNCH" }
  | { type: "ROVER_LAUNCH"; timing: "morning" | "delay" }
  | { type: "ROVER_MOVE"; x: number; y: number }
  | { type: "USE_SCOUT" }
  | { type: "ASK_EARTH" }
  | { type: "SEE_WORDS"; ids: string[] }
  | { type: "ACTIVATE_BEACON" }
  | { type: "SHOW_ENDING" }
  | { type: "SHOW_REPORT" }
  | { type: "MARK_LOG_READ" }
  | { type: "DISMISS_ALERT" };

export const askEarthEnabled = (s: GameState) =>
  !s.neilOffline && currentStepId(s) !== "c4" && s.askEarthLeft > 0;

function finishChoice(s: GameState, step: StepId, cardId: string, r: Resolution): GameState {
  const content = STEPS[step];
  let n: GameState = {
    ...s,
    ...r.patch,
    overnight: [],
    lastStickers: [],
    lastChoice: cardId,
    lastResultText: r.text,
    lastOutcome: r.outcome,
    currentCause: `${content.code}: ${r.title}`,
  };
  const before = {
    power: n.power,
    oxygen: n.oxygen,
    radiation: n.radiation,
    readiness: n.readiness,
    waterL: n.waterL,
  };
  const safeBefore = n.safeModeLog.length;
  n = applyDeltas(n, r.deltas);
  n = addLog(n, r.log.section, "GAME SIMULATION", r.log.title, r.log.text);
  n = addLog(n, "facts", content.tipLabel, `${content.code}: DID YOU KNOW?`, content.didYouKnow);
  n = tick(n, r.days);
  for (const st of r.stickers) n = awardSticker(n, st);
  const after = {
    power: n.power,
    oxygen: n.oxygen,
    radiation: n.radiation,
    readiness: n.readiness,
    waterL: n.waterL,
  };
  const total: Deltas = {
    power: round1(after.power - before.power),
    oxygen: round1(after.oxygen - before.oxygen),
    radiation: round1(after.radiation - before.radiation),
    readiness: round1(after.readiness - before.readiness),
    waterL: round1(after.waterL - before.waterL),
    days: r.days,
  };
  const triggeredSafe = n.safeModeLog.length > safeBefore;
  n = {
    ...n,
    lastDeltas: r.deltas,
    lastOutcome: triggeredSafe ? "bad" : r.outcome,
    screen: "result",
    currentCause: "",
    decisions: [
      ...n.decisions,
      {
        step,
        choice: cardId,
        choiceTitle: r.title,
        sol: s.sol,
        deltas: total,
        outcome: triggeredSafe ? "bad" : r.outcome,
      },
    ],
  };
  if (step === "c5") {
    // O-03 (owner approved, MD rule): tired if Card 3 or readiness < 4.
    n = { ...n, peakFitness: cardId !== "rest" && n.readiness >= RULES.greenThreshold };
  }
  if (step === "c4") n = { ...n, neilOffline: false };
  return n;
}

export function reduce(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "NEW_GAME":
      return createInitialState();
    case "LOAD":
      return a.state;
    case "GO_TITLE":
      return { ...s, screen: "title" };
    case "OPEN_BRIEFING": {
      const step = currentStepId(s);
      return { ...s, screen: "briefing", neilOffline: step === "c4" ? true : s.neilOffline };
    }
    case "BRIEFING_CTA": {
      const step = currentStepId(s);
      if (step === "m3" && !s.heatInstalled) return { ...s, screen: "install" };
      if (step === "c2") return { ...s, screen: "install" };
      if (step === "c4") return { ...s, screen: "fuse" };
      if (step === "p3") return { ...s, screen: "roverPrep" };
      return { ...s, screen: "decision" };
    }
    case "INSTALL_HEATER": {
      if (s.heatInstalled) return { ...s, screen: "decision" };
      return addLog(
        { ...s, heatInstalled: true, screen: "decision" },
        "air",
        "REVO MISSION EVENT",
        "HEATER & AIR-MAKER INSTALLED",
        "The Heating Core now feeds MOXIE and the base pipes. The oxygen meter is on: Rivo breathes ½ bar every sol.",
      );
    }
    case "TASK_DONE":
      return s.screen === "install" ? { ...s, screen: "decision" } : s;
    case "CHOOSE": {
      const step = currentStepId(s);
      if (s.screen !== "decision") return s;
      if (a.card === "none" && step !== "m5") return s;
      if (a.card !== "none" && availability(s, step, a.card).locked) return s;
      if (
        step === "m5" &&
        a.fitness &&
        fitnessAvailability(s, a.card === "none" ? null : a.card).locked
      )
        return s;
      return finishChoice(s, step, a.card, resolveCard(s, step, a.card, a.fitness));
    }
    case "TIMEOUT": {
      if (currentStepId(s) !== "c3" || s.screen !== "decision") return s;
      const r = resolveCard(s, "c3", "hesitate");
      return finishChoice(s, "c3", "hesitate", { ...r, text: `The sun ring ran out! ${r.text}` });
    }
    case "FUSE_SUBMIT": {
      if (currentStepId(s) !== "c4" || s.screen !== "fuse") return s;
      const id = [...a.cables].sort().join("+") || "none";
      return finishChoice(s, "c4", id, resolveFuse(a.cables));
    }
    case "SLEEP": {
      if (s.screen !== "result") return s;
      let n: GameState = { ...s, screen: "sleep" };
      if (currentStepId(s) === "m5" && n.remainingSetupDays > 0) n = tick(n, n.remainingSetupDays);
      return n;
    }
    case "WAKE": {
      const step = currentStepId(s);
      if (step === "m5") return { ...s, screen: "summary1", remainingSetupDays: 0 };
      if (step === "c5") return { ...s, screen: "summary2" };
      return { ...s, screen: "hub", stepIndex: s.stepIndex + 1, overnight: [] };
    }
    case "CONTINUE_SUMMARY": {
      let n: GameState = { ...s, screen: "hub", stepIndex: s.stepIndex + 1, overnight: [] };
      if (s.screen === "summary1" && s.waterSystem === "tank" && !s.dehydrationApplied) {
        n = applyDeltas(
          { ...n, dehydrationApplied: true, currentCause: "MISSION 2: LANDER TANK ONLY (thirst)" },
          { readiness: RULES.dehydrationPenalty },
        );
        n = {
          ...n,
          currentCause: "",
          alerts: [...n.alerts, "No water machine: Rivo is getting thirsty. -2 hearts."],
        };
        n = addLog(
          n,
          "water",
          "GAME SIMULATION",
          "THIRSTY",
          "With only the lander tank, Rivo drinks less. -2 hearts at the start of the storms.",
        );
      }
      return n;
    }
    case "ROVER_CHARGE": {
      if (s.roverCharged) return s;
      let n: GameState = {
        ...s,
        overnight: [],
        lastStickers: [],
        currentCause: "PHASE 3: CHARGE ROVER",
      };
      n = applyDeltas(n, { power: RULES.roverChargeCost });
      const peak = s.peakFitness;
      if (!peak) {
        n = { ...n, currentCause: "PHASE 3: TIRED LOADING (fitness check)" };
        n = applyDeltas(n, { power: RULES.roverFatiguePower, oxygen: RULES.roverFatigueOxygen });
      }
      const pts = peak ? RULES.roverPointsPeak : RULES.roverPointsTired;
      n = { ...n, roverCharged: true, roverMovePoints: pts, roverMax: RULES.roverPointsPeak };
      n = addLog(
        n,
        "power",
        "GAME SIMULATION",
        "ROVER CHARGED",
        peak
          ? "Rover charged (-2 power). Rivo carried the Beacon easily: 10 move points."
          : "Rover charged (-2 power). Rivo was tired and struggled with the Beacon: -1 power, -1 oxygen, 9 move points.",
      );
      n = tick(n, 1);
      return { ...n, currentCause: "" };
    }
    case "ROVER_TO_LAUNCH":
      return s.roverCharged ? { ...s, screen: "roverLaunch" } : s;
    case "ROVER_LAUNCH": {
      if (s.launchTiming) return { ...s, screen: "roverGrid" };
      let n: GameState = {
        ...s,
        launchTiming: a.timing,
        screen: "roverGrid",
        currentCause: "PHASE 3: LAUNCH WINDOW",
      };
      n = applyDeltas(n, a.timing === "morning" ? { radiation: 1 } : { oxygen: -1 });
      n = awardSticker(
        { ...n, lastStickers: [] },
        a.timing === "morning" ? "early-bird" : "night-owl",
      );
      n = addLog(
        n,
        "shield",
        "NASA FACT",
        "LAUNCH WINDOW",
        a.timing === "morning"
          ? `Morning Quiet Window (archived DONKI ${DATA.rover.windowClass}): +1 shield.`
          : "Delayed Afternoon Launch: longer time outside cost -1 oxygen.",
      );
      return { ...n, currentCause: "" };
    }
    case "ROVER_MOVE": {
      if (s.screen !== "roverGrid" || s.roverTowed) return s;
      const target: [number, number] = [a.x, a.y];
      if (!isAdjacent(s.roverPos, target)) return s;
      const cost = TERRAIN_COST[terrainAt(a.x, a.y)];
      if (cost > s.roverMovePoints) return s;
      const n: GameState = {
        ...s,
        roverPos: target,
        roverPath: [...s.roverPath, target],
        roverMovePoints: s.roverMovePoints - cost,
      };
      if (a.x === GOAL[0] && a.y === GOAL[1]) return arriveAtGoal(n, false);
      if (isStuck(n)) return arriveAtGoal(n, true);
      return n;
    }
    case "USE_SCOUT":
      return s.scoutUsed || s.screen !== "roverGrid" ? s : { ...s, scoutUsed: true };
    case "ASK_EARTH":
      return askEarthEnabled(s) ? { ...s, askEarthLeft: s.askEarthLeft - 1 } : s;
    case "SEE_WORDS": {
      const add = a.ids.filter((id) => !s.glossarySeen.includes(id));
      return add.length ? { ...s, glossarySeen: [...s.glossarySeen, ...add] } : s;
    }
    case "ACTIVATE_BEACON":
      return { ...s, beaconActive: true };
    case "SHOW_ENDING":
      return { ...s, screen: "ending" };
    case "SHOW_REPORT":
      return { ...s, screen: "report" };
    case "MARK_LOG_READ":
      return { ...s, logbook: s.logbook.map((e) => (e.unread ? { ...e, unread: false } : e)) };
    case "DISMISS_ALERT":
      return { ...s, alerts: s.alerts.slice(1) };
  }
}

export function isStuck(s: GameState) {
  return !neighbors(s.roverPos).some(
    ([x, y]) => TERRAIN_COST[terrainAt(x, y)] <= s.roverMovePoints,
  );
}

function arriveAtGoal(s: GameState, towed: boolean): GameState {
  let n: GameState = { ...s, overnight: [], lastStickers: [] };
  const moves = s.roverPath.length - 1;
  if (towed) {
    n = applyDeltas(
      {
        ...n,
        roverTowed: true,
        roverPos: GOAL,
        roverPath: [...n.roverPath, GOAL],
        currentCause: "PHASE 3: ROBOT TOW",
      },
      { power: RULES.towPower, oxygen: RULES.towOxygen },
    );
    n = addLog(
      n,
      "crisis",
      "GAME SIMULATION",
      "ROVER TOWED",
      "The Rover ran out of move points. The Maintenance Robot towed it to the Landing Zone: -2 power, -2 oxygen.",
    );
  } else {
    if (moves > RULES.shortestMoves) {
      n = applyDeltas(
        { ...n, currentCause: "PHASE 3: LONG DETOUR" },
        { oxygen: RULES.detourOxygen },
      );
      n = addLog(
        n,
        "air",
        "GAME SIMULATION",
        "LONG DETOUR",
        `The trip took ${moves} moves instead of 8. The longer time outside cost -2 oxygen.`,
      );
    } else {
      n = addLog(
        n,
        "power",
        "GAME SIMULATION",
        "SMART ROUTE",
        `The Rover reached the Landing Zone in ${moves} moves.`,
      );
    }
    n = awardSticker(n, "rover-captain"); // O-11: only when driven there
  }
  n = tick({ ...n, currentCause: "PHASE 3: ROVER TRIP" }, 2);
  return { ...n, currentCause: "", screen: "finale" };
}

// ---------- endings ----------

export const ENDING_METERS: CoreMeter[] = ["power", "oxygen", "radiation", "readiness"];

/**
 * MD endings: Legendary = all four >= 4 and safe_mode_used == false. Emergency = an ending meter hit 0
 * on the final stage. Cautious = everything else (a 1-3 meter, or all green but the capsule was used).
 */
export function ending(s: GameState): EndingTier {
  if (s.finalZero || ENDING_METERS.some((m) => s[m] <= 0)) return "emergency";
  const green = ENDING_METERS.every((m) => s[m] >= RULES.greenThreshold);
  return green && !s.safeModeTriggered ? "legendary" : "cautious";
}

const DELTA_KEY: Record<CoreMeter, keyof Deltas> = {
  power: "power",
  oxygen: "oxygen",
  radiation: "radiation",
  readiness: "readiness",
};

/** For the Cautious ending: which meters are low and the decision that cost each one the most. */
export function lowMeterCauses(s: GameState) {
  return ENDING_METERS.filter((m) => s[m] < RULES.greenThreshold).map((m) => {
    const worst = [...s.decisions].sort(
      (a, b) => (a.deltas[DELTA_KEY[m]] ?? 0) - (b.deltas[DELTA_KEY[m]] ?? 0),
    )[0];
    return {
      meter: m,
      name: METER_NAMES[m],
      value: s[m],
      cause:
        worst && (worst.deltas[DELTA_KEY[m]] ?? 0) < 0
          ? `${STEPS[worst.step].code}: ${worst.choiceTitle}`
          : "daily use",
    };
  });
}
