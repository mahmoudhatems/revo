import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
// Builds the central REVO voice manifest from the actual game content + authored lines.
// Run: node tools/audio/build-manifest.mjs
// Outputs:
//   src/game/content/voice/manifest.json  (runtime manifest, imported by the game)
//   ../revo-audio/vo-jobs.json            (voice generation job list: id -> master wav + text + style)
const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT_DIR = path.join(ROOT, "src/game/content/voice");
const AUDIO_DIR = path.join(ROOT, "../revo-audio");

const tdir = path.join(AUDIO_DIR, "_ts");
mkdirSync(tdir, { recursive: true });
for (const f of ["index.ts", "phase1.ts", "phase2.ts", "phase3.ts", "types.ts"]) {
  let src = readFileSync(path.join(ROOT, "src/game/content", f), "utf8");
  src = src.replace(/from "(\.\/phase\d|\.\/index|\.\/types)"/g, 'from "$1.ts"');
  src = src.replace(/from "\.\.\/types"/g, 'from "' + path.join(ROOT, "src/game/types.ts") + '"');
  writeFileSync(path.join(tdir, f), src);
}
const { STEPS } = await import(path.join(tdir, "index.ts"));

// --- emotion -> voice direction (short style string, same voice identity everywhere) ---
export const STYLES = {
  happy: "bright, warm and excited",
  curious: "curious and playful, slightly rising intonation",
  proud: "proud, confident and affectionate",
  worried: "soft and concerned but calm",
  emergency: "urgent and clear, focused, not scary",
  relieved: "relaxed and warm",
  surprised: "quick and expressive",
  encouraging: "gentle and supportive",
  celebrating: "energetic and joyful",
  thinking: "quiet and curious, thoughtful",
  neutral: "warm and playful",
};

// Per-step emotion for generated content lines
const EMO = {
  m1: { b: ["worried", "curious"], hint: "curious", earth: "encouraging", good: "celebrating", warn: "worried" },
  m2: { b: ["happy", "curious"], hint: "curious", earth: "encouraging", good: "proud", warn: "worried" },
  m3: { b: ["worried", "celebrating"], hint: "curious", earth: "encouraging", good: "proud", warn: "worried" },
  m4: { b: ["worried", "curious"], hint: "curious", earth: "encouraging", good: "celebrating", warn: "worried" },
  m5: { b: ["happy", "curious"], hint: "curious", earth: "encouraging", good: "celebrating", warn: "worried" },
  c1: { b: ["worried", "curious"], hint: "curious", earth: "encouraging", good: "celebrating", warn: "relieved" },
  c2: { b: ["worried", "encouraging"], hint: "curious", earth: "encouraging", good: "proud", warn: "worried" },
  c3: { b: ["emergency", "emergency"], hint: "emergency", earth: "encouraging", good: "proud", warn: "worried" },
  c4: { b: ["neutral", "neutral"], hint: null, earth: null, good: "proud", warn: "encouraging" },
  c5: { b: ["worried", "encouraging"], hint: "curious", earth: "encouraging", good: "celebrating", warn: "worried" },
  p3: { b: ["happy", "celebrating"], hint: "curious", earth: "encouraging", good: "curious", warn: null },
};
// card result caption emotion: prefer golden=celebrating, edge risky=worried, else neutral happy
const RESULT_EMO = (card) =>
  card.golden ? "celebrating" : card.edge === "risky" ? "worried" : card.edge === "balanced" ? "curious" : "happy";

// deterministic file naming: neil.m1.briefing.01 -> vo/neil/m1/briefing/01.mp3
function filePath(id) {
  const parts = id.replace(/^neil\./, "").split(".");
  if (/^\d+$/.test(parts.at(-1))) return `vo/neil/${parts.slice(0, -1).join("/")}/${parts.at(-1)}.mp3`;
  return `vo/neil/${parts.slice(0, -1).join("/")}/${parts.at(-1)}.mp3`;
}

const lines = [];
const seen = new Set();
function add(o) {
  if (seen.has(o.id)) throw new Error("duplicate id " + o.id);
  seen.add(o.id);
  lines.push({ id: o.id, text: o.text, file: o.file ?? filePath(o.id), emotion: o.emotion, priority: o.priority, group: o.group ?? null, play: o.play ?? "skip", context: o.context, offline: o.offline ?? false, record: o.record ?? true });
}

// ---------- content-derived lines ----------
for (const [sid, step] of Object.entries(STEPS)) {
  const e = EMO[sid];
  const isC4 = sid === "c4";
  step.neil.forEach((t, i) => {
    add({ id: `neil.${sid}.briefing.${String(i + 1).padStart(2, "0")}`, text: t, emotion: isC4 ? "neutral" : e.b[i], priority: "story", play: "queue", context: `${step.code} briefing`, offline: isC4, record: !isC4 });
  });
  add({ id: `neil.${sid}.feedback.good`, text: step.feedbackGood, emotion: e.good, priority: "result", play: "queue", context: `${step.code} good-choice feedback`, record: !!step.feedbackGood });
  if (step.feedbackWarn && step.feedbackWarn !== step.feedbackGood) {
    add({ id: `neil.${sid}.feedback.warn`, text: step.feedbackWarn, emotion: e.warn ?? "worried", priority: "result", play: "queue", context: `${step.code} caution feedback` });
  } else if (step.feedbackWarn) {
    // alias: same text, reuse the good recording (no double capture, no drift)
    lines.push({ id: `neil.${sid}.feedback.warn`, text: step.feedbackWarn, file: filePath(`neil.${sid}.feedback.good`), emotion: e.good, priority: "result", play: "queue", context: `${step.code} caution feedback (alias of good)`, group: null, offline: false, record: false });
    seen.add(`neil.${sid}.feedback.warn`);
  }
  if (step.neilHint) add({ id: `neil.${sid}.hint`, text: step.neilHint, emotion: e.hint ?? "curious", priority: "reaction", play: "steal", context: `${step.code} Neil hint` });
  if (step.earthTip) add({ id: `neil.${sid}.earth`, text: step.earthTip, emotion: e.earth ?? "encouraging", priority: "reaction", play: "steal", context: `${step.code} Ask Earth reply relayed by Neil` });
  for (const c of step.cards) {
    if (!c.result) continue;
    add({ id: `neil.${sid}.result.${c.id}`, text: c.result, emotion: RESULT_EMO(c), priority: "result", play: "queue", context: `${step.code} card result caption (${c.title})` });
  }
}
// dynamic engine text variants (fixed authored spoken forms; on-screen text stays dynamic)
add({ id: "neil.c1.result.drain", text: "The lights stayed bright, but the small grid could not keep up and the battery ran dry.", emotion: "worried", priority: "result", play: "queue", context: "Crisis 1 Full Power Blast drains battery" });
add({ id: "neil.c3.result.seal-leak", text: "The hatch locks, but without a water shield some rays get through.", emotion: "worried", priority: "result", play: "queue", context: "Crisis 3 seal with radiation leak" });
add({ id: "neil.c3.result.timeout", text: "The sun ring ran out!", emotion: "surprised", priority: "result", play: "steal", context: "Crisis 3 countdown expired" });
add({ id: "neil.c5.result.nogym", text: "No gym machine, so Rivo does a body-weight workout instead.", emotion: "encouraging", priority: "result", play: "queue", context: "Crisis 5 recovery without gym" });

// ---------- authored lines ----------
const authored = JSON.parse(readFileSync(path.join(ROOT, "tools/audio/authored-lines.json"), "utf8"));
for (const l of authored.lines) {
  add({ id: l.id, text: l.text, emotion: l.emotion, priority: l.priority, group: l.group, play: l.play, context: l.id.replace(/^neil\./, "").replace(/\./g, " ") });
}

// ---------- outputs ----------
const manifest = {
  version: 1,
  generatedFrom: "tools/audio/build-manifest.mjs — do not edit by hand; edit content or authored-lines.json and rebuild",
  character: {
    name: "Neil (N.E.I.L.)",
    voice: "Autonoe",
    language: "en-US",
    identity: "friendly, curious, intelligent little Mars assistant robot; warm, playful, encouraging; consistent single identity",
  },
  lines,
};
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const jobs = lines
  .filter((l) => l.record !== false)
  .map((l) => ({ id: l.id, text: l.text, style: STYLES[l.emotion] ?? STYLES.neutral, wav: path.join(AUDIO_DIR, "vo-master", filePath(l.id).replace("vo/neil/", "").replace(".mp3", ".wav")).replaceAll("\\", "/") }));
writeFileSync(path.join(AUDIO_DIR, "vo-jobs.json"), JSON.stringify(jobs, null, 1));

console.log(`manifest: ${lines.length} lines (${jobs.length} to record, ${lines.length - jobs.length} aliases/text-only)`);
console.log(`groups: ${[...new Set(lines.map((l) => l.group).filter(Boolean))].join(", ")}`);
