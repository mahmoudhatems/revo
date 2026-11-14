import type { FactLabel, StepId } from "../types";

export type BuildingId =
  | "greenhouse"
  | "solar"
  | "command"
  | "oxygen"
  | "water"
  | "shelter"
  | "airlock"
  | "landing";

export type Tone = "cost" | "gain" | "info" | "risk";

export interface CardRow {
  icon: string;
  text: string;
  tone: Tone;
}

/** Card edge colour (MD 0.6): green safe-ish, yellow balanced, red risky. Locked is derived. */
export type CardEdge = "safe" | "balanced" | "risky";

export interface CardDef {
  id: string;
  title: string; // kid name shown to the player
  devName: string; // developer name from the scenario
  icon: string;
  rows: CardRow[]; // days, power per day, other meters
  good: string;
  careful: string;
  sticker: string; // sticker id (see STICKERS)
  edge: CardEdge;
  golden?: boolean;
  result: string; // Screen 3 "see it happen" caption
}

export interface StepContent {
  id: StepId;
  kind: "mission" | "crisis" | "expedition";
  code: string;
  title: string;
  sols: string;
  building: BuildingId;
  briefingPlace: string;
  briefingVisual: string;
  neil: [string, string]; // briefing bubble: max 2 short sentences
  ctaLabel: string;
  ctaIcon: string;
  decisionPlace: string;
  decisionPrompt: string;
  cards: CardDef[];
  feedbackGood: string; // Neil after a good pick (max 2 sentences)
  feedbackWarn: string; // Neil after a careful pick
  didYouKnow: string; // 1 sentence of real NASA science
  tipLabel: FactLabel;
  earthTip: string | null; // Ask Earth exact tip (null = no signal)
  neilHint: string; // instant general hint from the Neil widget
  dataset: string;
  overlay?: "dust" | "cold" | "flare" | "blackout" | "fatigue" | "dark";
  hazard?: string;
}

export interface StickerDef {
  id: string;
  name: string;
  look: string;
  icon: string;
  step: StepId | "special";
}
