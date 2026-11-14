export type StepId = "m1" | "m2" | "m3" | "m4" | "m5" | "c1" | "c2" | "c3" | "c4" | "c5" | "p3";

export type Screen =
  | "title"
  | "hub"
  | "briefing"
  | "install" // Mission 3 mandatory heater + MOXIE step
  | "decision"
  | "fuse" // Crisis 4 fuse box
  | "result"
  | "sleep"
  | "summary1"
  | "summary2"
  | "roverPrep"
  | "roverLaunch"
  | "roverGrid"
  | "finale"
  | "ending"
  | "report";

export type CoreMeter = "power" | "oxygen" | "radiation" | "readiness";
export type FactLabel = "NASA FACT" | "REVO MISSION EVENT" | "GAME SIMULATION";
export type LogSection = "power" | "water" | "air" | "shield" | "health" | "crisis" | "facts";

export type Grid = "emergency" | "basic" | "medium" | "giant";
export type WaterSystem = "tank" | "oven" | "recycler" | "full";
export type HeatMode = "low" | "balanced" | "core" | "max";
export type Shield = "hull" | "soil" | "water" | "fortress";
export type CropId = "CR03" | "CR01" | "CR02" | "CR04";
export type Cable = "moxie" | "heater" | "pump" | "leds";
export type EndingTier = "legendary" | "cautious" | "emergency";

export interface LogEntry {
  id: string;
  sol: number;
  section: LogSection;
  label: FactLabel;
  title: string;
  text: string;
  unread: boolean;
}

export interface Deltas {
  power?: number;
  oxygen?: number;
  radiation?: number;
  readiness?: number;
  waterL?: number;
  days?: number;
}

export interface DecisionRecord {
  step: StepId;
  choice: string;
  choiceTitle: string;
  sol: number;
  deltas: Deltas;
  outcome: "good" | "warn" | "bad";
}

export interface OvernightRow {
  sol: number;
  notes: string[];
}

export interface SafeModeRecord {
  meter: CoreMeter;
  sol: number;
  cause: string; // decision (or daily use) that caused the meter to hit 0
}

export interface GameState {
  version: 2;
  screen: Screen;
  stepIndex: number; // index into STEP_ORDER
  sol: number; // 1..30, the current sol
  ticks: number; // sols completed
  remainingSetupDays: number;
  // meters
  power: number; // net available power bars (may exceed 10)
  waterL: number;
  oxygen: number;
  radiation: number;
  readiness: number;
  // systems
  grid: Grid | null;
  waterSystem: WaterSystem | null;
  heatInstalled: boolean;
  heatMode: HeatMode | null;
  shield: Shield;
  crop: CropId | null;
  cropMatureSol: number | null;
  cropMatured: boolean;
  fitnessUnit: boolean;
  // flags
  greenhouseLocked: boolean;
  pipesInsulated: boolean;
  neilOffline: boolean;
  peakFitness: boolean;
  dustCleaned: boolean;
  waterEmptyHandled: boolean;
  dehydrationApplied: boolean;
  safeModeTriggered: boolean; // scenario: safe_mode_used
  safeModeLog: SafeModeRecord[];
  finalZero: SafeModeRecord | null; // a meter hit 0 on the final stage (Phase 3)
  stickers: string[];
  lastStickers: string[]; // stickers earned by the latest decision (for the result screen)
  askEarthLeft: number;
  scoutUsed: boolean;
  glossarySeen: string[];
  currentCause: string;
  // last decision on the current step (for result screen)
  lastChoice: string | null;
  lastResultText: string | null;
  lastOutcome: "good" | "warn" | "bad" | null;
  lastDeltas: Deltas | null;
  overnight: OvernightRow[];
  alerts: string[]; // pending safe-mode / event alerts to show
  // rover
  roverMovePoints: number;
  roverMax: number;
  roverPos: [number, number];
  roverPath: [number, number][];
  roverTowed: boolean;
  launchTiming: "morning" | "delay" | null;
  roverCharged: boolean;
  beaconActive: boolean;
  // history
  decisions: DecisionRecord[];
  logbook: LogEntry[];
}
