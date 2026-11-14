import { STEP_ORDER } from "./content";
import {
  applyDeltas,
  oxygenNetPerSol,
  radiationNetPerSol,
  readinessNetPerSol,
  waterNetPerSol,
} from "./engine";
import { RULES } from "./rules";
import type { Deltas, GameState } from "./types";

export type MeterStatus = "ok" | "warning" | "critical";
// MD 0.5: green 4+ bars (safe), yellow 1-3 (careful), red 0 (emergency).
export const meterStatus = (bars: number): MeterStatus =>
  bars >= RULES.greenThreshold ? "ok" : bars > 0 ? "warning" : "critical";

/** MD 0.4: the child sees whole bars and half bars, never decimals. */
export function fmtBars(n: number): string {
  const r = Math.round(n * 2) / 2;
  const whole = Math.trunc(Math.abs(r));
  const half = Math.abs(r) - whole >= 0.5;
  const sign = r < 0 ? "-" : "";
  if (whole === 0 && half) return `${sign}½`;
  return `${sign}${whole}${half ? "½" : ""}`;
}
export const fmtDelta = (n: number) => (n > 0 ? `+${fmtBars(n)}` : fmtBars(n));

/** MD 0.4: "loses 1 bar every 2 days" style text for a per-sol rate. */
export function kidRate(rate: number, unit = "bar"): string {
  if (!rate) return `stays the same every day`;
  const every = 1 / Math.abs(rate);
  const days = Math.round(every * 2) / 2;
  const word = rate < 0 ? "loses" : "gains";
  if (days <= 1)
    return `${word} ${fmtBars(Math.abs(rate))} ${unit}${Math.abs(rate) > 1 ? "s" : ""} every day`;
  return `${word} 1 ${unit} ${Number.isInteger(every) ? "every" : "about every"} ${fmtBars(days)} days`;
}

export type MeterId = "power" | "water" | "oxygen" | "radiation" | "readiness";

/** Which meters are on the HUD: each is introduced by its mission. */
export function visibleMeters(s: GameState): MeterId[] {
  const i = s.stepIndex;
  const out: MeterId[] = ["power", "water"];
  if (i >= 2 && (i > 2 || s.heatInstalled)) out.push("oxygen");
  if (i >= 3) out.push("radiation");
  if (i >= 4) out.push("readiness");
  return out;
}

export function meterBars(s: GameState, m: MeterId): number {
  if (m === "water") return s.waterL / RULES.litersPerBar;
  if (m === "power") return Math.min(10, s.power);
  return s[m];
}

export function perSol(s: GameState, m: MeterId): number {
  switch (m) {
    case "water":
      return waterNetPerSol(s) / RULES.litersPerBar;
    case "oxygen":
      return oxygenNetPerSol(s);
    case "radiation":
      return radiationNetPerSol(s);
    case "readiness":
      return readinessNetPerSol();
    default:
      return 0;
  }
}

export function habitatTemp(s: GameState): "cold" | "chilly" | "warm" | "max" {
  if (!s.heatInstalled || !s.heatMode || s.heatMode === "low") return "cold";
  if (s.heatMode === "core") return "chilly";
  if (s.heatMode === "max") return "max";
  return "warm";
}

/** Before/after preview for a decision (immediate effects only, not the passive drains). */
export function preview(s: GameState, d: Deltas) {
  const after = applyDeltas({ ...s, alerts: [], logbook: [] }, d);
  return {
    before: s,
    after,
    triggersSafeMode:
      after.safeModeLog.length > s.safeModeLog.length || (!s.finalZero && !!after.finalZero),
  };
}

export const phaseOf = (s: GameState) => (s.stepIndex <= 4 ? 1 : s.stepIndex <= 9 ? 2 : 3);
export const stepsTotal = STEP_ORDER.length;
export const unreadCount = (s: GameState) => s.logbook.filter((e) => e.unread).length;
