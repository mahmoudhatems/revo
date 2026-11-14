import type { StepId } from "../types";
import { M1, M2, M3, M4, M5 } from "./phase1";
import { C1, C2, C3, C4, C5 } from "./phase2";
import { P3 } from "./phase3";
import type { BuildingId, StepContent, StickerDef } from "./types";

export * from "./types";

export const STEP_ORDER: StepId[] = [
  "m1",
  "m2",
  "m3",
  "m4",
  "m5",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "p3",
];

export const STEPS: Record<StepId, StepContent> = {
  m1: M1,
  m2: M2,
  m3: M3,
  m4: M4,
  m5: M5,
  c1: C1,
  c2: C2,
  c3: C3,
  c4: C4,
  c5: C5,
  p3: P3,
};

export interface BuildingInfo {
  id: BuildingId;
  name: string;
  short: string;
  learn: string;
  learnLabel: "NASA FACT" | "GAME SIMULATION" | "REVO MISSION EVENT";
}

export const BUILDINGS: Record<BuildingId, BuildingInfo> = {
  greenhouse: {
    id: "greenhouse",
    name: "BIO-GREENHOUSE",
    short: "GREENHOUSE",
    learn:
      "Plants take in carbon dioxide and give out oxygen. On Mars they need grow lights, water and warmth.",
    learnLabel: "NASA FACT",
  },
  solar: {
    id: "solar",
    name: "SOLAR POWER STATION",
    short: "SOLAR POWER",
    learn:
      "Solar panels turn sunlight into electricity. Batteries only store it. Dust on panels lowers the power.",
    learnLabel: "NASA FACT",
  },
  command: {
    id: "command",
    name: "CENTRAL COMMAND DOME",
    short: "COMMAND DOME",
    learn:
      "The hub of the base. N.E.I.L. talks to Rivo here and messages to Earth take minutes to arrive.",
    learnLabel: "NASA FACT",
  },
  oxygen: {
    id: "oxygen",
    name: "OXYGEN & HEATING",
    short: "OXYGEN & HEAT",
    learn:
      "MOXIE on the Perseverance rover made real oxygen from Martian carbon dioxide. It must run very hot.",
    learnLabel: "NASA FACT",
  },
  water: {
    id: "water",
    name: "WATER & RECYCLING",
    short: "WATER",
    learn: "The space station recycles most of its water. On Mars every drop matters.",
    learnLabel: "NASA FACT",
  },
  shelter: {
    id: "shelter",
    name: "CREW QUARTERS & RADIATION SHELTER",
    short: "SHELTER",
    learn: "Water and thick soil block space radiation. Mars has no magnetic field to protect us.",
    learnLabel: "NASA FACT",
  },
  airlock: {
    id: "airlock",
    name: "AIRLOCK & ROVER GARAGE",
    short: "AIRLOCK",
    learn:
      "The airlock keeps the air inside when Rivo or the robot goes outside. Each trip costs a little air.",
    learnLabel: "GAME SIMULATION",
  },
  landing: {
    id: "landing",
    name: "ARES-2 LANDING PAD",
    short: "LANDING PAD",
    learn: "Ares-2 is the crew ship arriving on Sol 30. A landing beacon guides it to a safe spot.",
    learnLabel: "REVO MISSION EVENT",
  },
};

export const STATION_EQUIPMENT: Partial<
  Record<BuildingId, { sheet: "water" | "solar" | "oxygen"; items: string[] }>
> = {
  solar: {
    sheet: "solar",
    items: [
      "large_solar_panel",
      "battery_storage_unit",
      "power_inverter",
      "solar_panel_cleaning_brush",
    ],
  },
  water: {
    sheet: "water",
    items: [
      "closed_loop_water_recycler",
      "primary_water_storage_tank",
      "water_pump",
      "water_pressure_gauge",
    ],
  },
  oxygen: {
    sheet: "oxygen",
    items: [
      "main_oxygen_production_machine",
      "space_heating_unit",
      "insulated_pipes",
      "temperature_sensor",
    ],
  },
};

const fromCards: StickerDef[] = Object.values(STEPS).flatMap((st) =>
  st.cards.map((c) => ({ id: c.sticker, name: "", look: "", icon: c.icon, step: st.id })),
);

const NAMES: Record<string, [string, string]> = {
  "fast-dash": ["FAST DASH", "Yellow racing stripe on Robot"],
  "solar-scout": ["SOLAR SCOUT", "Glowing visor on Robot"],
  "energy-master": ["ENERGY MASTER", "Blue LED trim in the Command Dome"],
  "sun-titan": ["SUN TITAN", "Gold-plated Robot"],
  "zero-wait-explorer": ["ZERO-WAIT EXPLORER", "Speed trail icon"],
  "rock-miner": ["ROCK MINER", "Drill on Robot"],
  "aqua-recycler": ["AQUA RECYCLER", "Glowing cyan pipes"],
  "ocean-maker": ["OCEAN MAKER", "Bubbling tank"],
  "battery-saver": ["BATTERY SAVER", "Green leaf badge on HUD"],
  "life-engineer": ["LIFE ENGINEER", "Orange floor vents in every room"],
  "air-booster": ["AIR BOOSTER", "Two spinning fans on the air-maker"],
  "sun-core": ["SUN CORE", "Golden glow inside the air-maker"],
  "brave-pioneer": ["BRAVE PIONEER", "Compass patch on Rivo"],
  "sand-castle-builder": ["SAND CASTLE BUILDER", "Red dirt mound outside"],
  "aqua-knight": ["AQUA KNIGHT", "Glowing blue water-wall armor"],
  "unbreakable-bunker": ["UNBREAKABLE BUNKER", "Steel and water walls"],
  "space-gardener": ["SPACE GARDENER", "Lush lettuce beds"],
  "mars-farmer": ["MARS FARMER", "Potato plants under purple LEDs"],
  "red-harvest": ["RED HARVEST", "Red tomato vines"],
  "galactic-champion": ["GALACTIC CHAMPION", "Space athletic suit + full farm"],
  "power-napper": ["POWER NAPPER", "Cozy blue night-light mode"],
  "storm-sweeper": ["STORM SWEEPER", "Two air-brush arms on Robot"],
  "storm-rider": ["STORM RIDER", "Lightning badge on the Command Dome"],
  "pipe-defender": ["PIPE DEFENDER", "Glowing orange pipe wraps"],
  "frost-walker": ["FROST WALKER", "Winter parka for Rivo"],
  "thermal-master": ["THERMAL MASTER", "Gold heat-exchanger badge"],
  "flare-blocker": ["FLARE BLOCKER", "Blast-door emblem"],
  "plant-guardian": ["PLANT GUARDIAN", "Radiation shutters on the Greenhouse"],
  "daredevil-pilot": ["DAREDEVIL PILOT", "Solar-flare visor tint"],
  "junior-electrician": ["JUNIOR ELECTRICIAN", "Glowing green fuse-box LEDs"],
  "circuit-scout": ["CIRCUIT SCOUT", "Copper wire badge"],
  "spark-tester": ["SPARK TESTER", "Rubber boots for Rivo"],
  "mars-athlete": ["MARS ATHLETE", "Sprint trail on Rivo"],
  "bio-breather": ["BIO-BREATHER", "Green leaf aura in the base"],
  "cozy-dreamer": ["COZY DREAMER", "Starry pillow badge"],
  "early-bird": ["EARLY BIRD ASTRONAUT", "Morning launch"],
  "night-owl": ["NIGHT OWL DRIVER", "Afternoon launch"],
  "rover-captain": ["MARS ROVER CAPTAIN", "Reached the Landing Zone"],
  "capsule-camper": ["CAPSULE CAMPER", "A little capsule icon on Rivo's bed"],
};

const extra: StickerDef[] = [
  { id: "junior-electrician", name: "", look: "", icon: "fuse", step: "c4" },
  { id: "circuit-scout", name: "", look: "", icon: "fuse", step: "c4" },
  { id: "spark-tester", name: "", look: "", icon: "bolt", step: "c4" },
  { id: "early-bird", name: "", look: "", icon: "sun", step: "p3" },
  { id: "night-owl", name: "", look: "", icon: "moon", step: "p3" },
  { id: "rover-captain", name: "", look: "", icon: "rover", step: "p3" },
  { id: "capsule-camper", name: "", look: "", icon: "bed", step: "special" },
];

export const STICKERS: StickerDef[] = [...fromCards, ...extra].map((s) => ({
  ...s,
  name: NAMES[s.id][0],
  look: NAMES[s.id][1],
}));
export const stickerById = (id: string) => STICKERS.find((s) => s.id === id);

/** MD 0.3: picture glossary pop-ups. `match` words are found case-insensitively in Neil's bubbles. */
export interface GlossaryEntry {
  id: string;
  word: string;
  match: RegExp;
  icon: string;
  kid: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: "sol",
    word: "SOL",
    match: /\bsols?\b/i,
    icon: "sun",
    kid: "A Mars day (a little longer than an Earth day).",
  },
  {
    id: "moxie",
    word: "MOXIE",
    match: /\bMOXIE\b/i,
    icon: "o2",
    kid: "The air-maker machine. It turns Mars air into breathable air.",
  },
  { id: "regolith", word: "REGOLITH", match: /\bregolith\b/i, icon: "soil", kid: "Mars dirt." },
  {
    id: "radiation",
    word: "SPACE RAYS",
    match: /\b(radiation|space rays)\b/i,
    icon: "radiation",
    kid: "Invisible space rays.",
  },
  {
    id: "flare",
    word: "SOLAR FLARE",
    match: /\bsolar flare\b/i,
    icon: "sun",
    kid: "A burp of sunshine energy.",
  },
  {
    id: "cme",
    word: "CME",
    match: /\b(CME|space wind)\b/i,
    icon: "wind",
    kid: "A giant space wind from the Sun.",
  },
  {
    id: "donki",
    word: "DONKI",
    match: /\bDONKI\b/i,
    icon: "radar",
    kid: "NASA's Sun-weather radar.",
  },
  {
    id: "meda",
    word: "MEDA",
    match: /\bMEDA\b/i,
    icon: "thermo",
    kid: "Mars' weather station on the Perseverance rover.",
  },
  {
    id: "amps",
    word: "AMPS",
    match: /\bamps?\b/i,
    icon: "fuse",
    kid: "How much electric power a machine eats.",
  },
  {
    id: "circadian",
    word: "SLEEPY LIGHT",
    match: /\b(circadian|sleepy light)\b/i,
    icon: "moon",
    kid: "Sleepy-time blue light that helps you rest.",
  },
  {
    id: "osdr",
    word: "OSDR",
    match: /\bOSDR\b/i,
    icon: "book",
    kid: "NASA's astronaut health notebook.",
  },
  {
    id: "delay",
    word: "ASK EARTH WAIT",
    match: /\bask earth\b/i,
    icon: "antenna",
    kid: "Mars is so far from Earth that messages take minutes to travel. In the game, the wait is 5 seconds.",
  },
  {
    id: "capsule",
    word: "SAFE-MODE CAPSULE",
    match: /\b(safe-mode capsule|capsule)\b/i,
    icon: "bed",
    kid: "A cozy emergency bed that keeps Rivo safe while the base restarts.",
  },
];

export const findGlossary = (text: string) => GLOSSARY.filter((g) => g.match.test(text));
