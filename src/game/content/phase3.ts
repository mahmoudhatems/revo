import type { StepContent } from "./types";

export const P3: StepContent = {
  id: "p3",
  kind: "expedition",
  code: "PHASE 3",
  title: "ROVER TRIP & ARES-2 TOUCHDOWN",
  sols: "SOL 27 - 30",
  building: "airlock",
  briefingPlace: "COMMAND DOME",
  briefingVisual: "The Sun radar glows calm green. The Rover waits outside.",
  hazard: "MINOR FLARE C3.4 · DANGER LEVEL 1",
  neil: [
    "Ares-2 lands in 3 days, Rivo! The Sun is calm right now.",
    "Let's charge the Rover and carry our Landing Beacon to the safe landing spot!",
  ],
  ctaLabel: "GO TO ROVER BAY",
  ctaIcon: "rover",
  decisionPlace: "AIRLOCK & ROVER GARAGE",
  decisionPrompt: "",
  cards: [],
  feedbackGood:
    "Look at NASA's Mars Trek map, Rivo! Mountains eat lots of Rover power, but flat roads take longer and use more air.",
  feedbackWarn: "",
  didYouKnow: "NASA scientists check the Sun's weather before astronauts go outside.",
  tipLabel: "NASA FACT",
  earthTip: "Today's Sun is calm (C3.4). A morning launch gives you a little extra shield.",
  neilHint: "Flat tiles cost 1 point. Mountains cost 5, so go around them!",
  dataset: "NASA Mars Trek, DONKI (archived C3.4) and OSDR",
};
