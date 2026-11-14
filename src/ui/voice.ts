// Read-aloud architecture (MD 0.2). Each bubble gets a stable line id. If a recorded voice-over file
// exists at public/assets/revo/vo/<id>.mp3 it is played. Otherwise the browser speech engine reads
// the text. If neither is available the game stays silent and nothing breaks.
import { asset } from "../game/assets";

export function lineId(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return `line-${h.toString(36)}`;
}

const known = new Map<string, boolean>();
let current: HTMLAudioElement | null = null;

async function hasRecording(id: string): Promise<boolean> {
  if (known.has(id)) return known.get(id)!;
  try {
    const r = await fetch(asset(`vo/${id}.mp3`), { method: "HEAD" });
    const ok = r.ok && (r.headers.get("content-type") ?? "").startsWith("audio");
    known.set(id, ok);
    return ok;
  } catch {
    known.set(id, false);
    return false;
  }
}

export function stopSpeaking() {
  current?.pause();
  current = null;
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}

export const speechAvailable = () => typeof globalThis.speechSynthesis !== "undefined";

export async function speak(text: string) {
  stopSpeaking();
  const clean = text.replace(/N\.E\.I\.L\./g, "Neil").replace(/[^\p{L}\p{N}\s.,!?'°%-]/gu, " ");
  const id = lineId(text);
  if (await hasRecording(id)) {
    const a = new Audio(asset(`vo/${id}.mp3`));
    current = a;
    a.play().catch(() => speakSynth(clean));
    return;
  }
  speakSynth(clean);
}

function speakSynth(text: string) {
  try {
    const synth = globalThis.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.05;
    u.lang = "en-US";
    synth.speak(u);
  } catch {
    // speech not supported: stay silent
  }
}
