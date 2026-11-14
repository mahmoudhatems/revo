// REVO voice-over (MD audio 1.0). Recorded N.E.I.L. lines are played from the manifest
// (src/game/content/voice/manifest.json) matched by bubble text; unknown lines fall back to
// the browser speech engine; if neither works the game stays silent and nothing breaks.
import { asset } from "../game/assets";
import { audio } from "./audio";
import manifestRaw from "../game/content/voice/manifest.json";

type Line = {
  id: string;
  text: string;
  file: string;
  offline: boolean;
  record: boolean;
};
const manifest = manifestRaw as unknown as { version: number; lines: Line[] };

export function lineId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `line-${h.toString(36)}`;
}

const norm = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();
const byText = new Map<string, string>(); // normalized text -> file url
const byId = new Map<string, string>(); // line id -> file url
const lines: { norm: string; file: string }[] = [];
const known = new Map<string, boolean>(); // url -> exists on disk
for (const l of manifest.lines) {
  byId.set(l.id, l.file);
  const n = norm(l.text);
  if (!byText.has(n)) byText.set(n, l.file);
  lines.push({ norm: n, file: l.file });
}

let current: HTMLAudioElement | null = null;
let token = 0; // bump to cancel queued chains

async function hasRecording(url: string): Promise<boolean> {
  if (known.has(url)) return known.get(url)!;
  try {
    const r = await fetch(asset(url), { method: "HEAD" });
    const ok = r.ok && (r.headers.get("content-type") ?? "").startsWith("audio");
    known.set(url, ok);
    return ok;
  } catch {
    known.set(url, false);
    return false;
  }
}

function playOne(url: string, tok: number): Promise<boolean> {
  return new Promise((resolve) => {
    const a = new Audio(asset(url));
    current = a;
    audio.duck(true);
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      audio.duck(false);
      if (current === a) current = null;
      resolve(tok === token);
    };
    a.onended = done;
    a.onerror = done;
    a.play().catch(done);
  });
}

/** Files whose recordings exist, in order (max 4 per bubble). */
async function playable(files: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const f of files) {
    if (f && !out.includes(f) && (await hasRecording(f))) out.push(f);
    if (out.length >= 4) break;
  }
  return out;
}

function speakSynth(text: string) {
  try {
    const synth = globalThis.speechSynthesis;
    if (!synth) return;
    const clean = text.replace(/N\.E\.I\.L\./g, "Neil").replace(/[^\p{L}\p{N}\s.,!?'°%-]/gu, " ");
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 0.95;
    u.pitch = 1.05;
    u.lang = "en-US";
    audio.duck(true);
    u.onend = () => audio.duck(false);
    u.onerror = () => audio.duck(false);
    synth.speak(u);
  } catch {
    // speech not supported: stay silent
  }
}

function stopSpeaking() {
  token++;
  if (current) {
    current.pause();
    current = null;
    audio.duck(false);
  }
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}

const speechAvailable = () => typeof globalThis.speechSynthesis !== "undefined";

/** Play a recorded line addressed by manifest id (used by scripted moments). */
async function playLine(id: string): Promise<boolean> {
  const file = byId.get(id);
  if (!file) return false;
  if (await hasRecording(file)) {
    stopSpeaking();
    void playOne(file, token);
    return true;
  }
  return false;
}

async function speak(text: string) {
  stopSpeaking();
  const tok = token;
  const n = norm(text);
  let files: string[] = [];
  const exact = byText.get(n);
  if (exact) {
    files = [exact];
  } else {
    // Bubbles can concatenate several authored sentences (e.g. briefing pages).
    const hits = lines
      .filter((l) => l.norm.length > 4 && n.includes(l.norm))
      .sort((a, b) => n.indexOf(a.norm) - n.indexOf(b.norm));
    files = hits.map((h) => h.file);
  }
  const ok = await playable(files);
  if (tok !== token) return; // superseded while HEAD-checking
  if (ok.length) {
    for (const f of ok) {
      const continued = await playOne(f, tok);
      if (!continued) return;
    }
    return;
  }
  speakSynth(text);
}

export { speak, stopSpeaking, speechAvailable, playLine };
