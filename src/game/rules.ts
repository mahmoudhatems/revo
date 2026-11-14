// REVO simulation rules. Values come from the approved data package (src/game/data) and the final
// Kid Edition scenario. Scenario-only values (no JSON field) are marked "MD".
import { DATA } from "./data";

export const RULES = {
  setupDays: DATA.startDays,
  totalSols: 30,
  greenThreshold: 4, // MD 0.5: green = 4+ bars

  startPower: 5, // MD: battery 5/10 (25 of 50 kWh)
  baseLoadBars: 1, // MD: net = reward - 1

  waterMaxL: DATA.waterTankL,
  litersPerBar: 30, // MD
  waterLossPerSol: DATA.waterLossPerSol,
  waterRecovery: {
    tank: DATA.waterSystems.tank.recovery,
    oven: DATA.waterSystems.oven.recovery,
    recycler: DATA.waterSystems.recycler.recovery,
    full: DATA.waterSystems.full.recovery,
  },
  greenhouseMinWaterL: DATA.greenhouseMinWaterL,
  // O-05 (owner approved): greenhouse needs >= 90 L projected at Sol 30.
  greenhouseUsesProjectedWater: true,
  waterEmptyReadinessPenalty: -2,
  dehydrationPenalty: -2, // MD M2 Card 1: -2 readiness in Phase 2

  oxygenStart: 6, // MD
  oxygenDrainPerSol: 0.5, // MD
  heatOxygenOutput: { low: 0.5, balanced: 1.0, core: 1.5, max: 1.0 }, // MD M3 hidden math

  radiationStart: DATA.radiationStart,
  radiationDrainPerSol: DATA.radiationDecay,

  readinessStart: DATA.readinessStart,
  readinessDrainPerSol: DATA.readinessDecay,

  safeModeRestoreBars: 2, // MD 0.7

  fuseLimitAmps: DATA.c4.limit,
  amps: DATA.c4.amps,

  flareCountdownSec: DATA.c3.timerSec,
  flareCountdownJuniorSec: 20, // MD Crisis 3 Junior Mode

  askEarthUses: 3, // MD 0.8
  askEarthDelaySec: 5, // MD 0.8

  roverChargeCost: DATA.rover.chargeCost,
  roverPointsPeak: DATA.rover.maxPoints,
  roverPointsTired: DATA.rover.tiredPoints,
  roverFatiguePower: DATA.rover.fatiguePower,
  roverFatigueOxygen: DATA.rover.fatigueOxygen,
  towPower: -2, // MD
  towOxygen: -2, // MD
  detourOxygen: -2, // MD: a longer detour costs -2 oxygen total
  shortestMoves: 8,
  scoutUses: 1, // MD
  scoutRevealMs: 3000, // MD
} as const;

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
