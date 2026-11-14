// REVO audio engine (MD audio 1.0): procedural chiptune SFX + seamless music loops.
// Assets live in public/assets/revo/{sfx,music}/*.mp3 and are produced by
// tools/audio (see tools/audio/README.md). Everything degrades to silence on failure.
import { asset } from "../game/assets";

const VOL = { music: 0.3, sfx: 0.55 };
export type MusicTrack = "colony" | "mission" | "crisis" | "rover";

const sfxPool = new Map<string, HTMLAudioElement[]>();
let musicEl: HTMLAudioElement | null = null;
let musicName: MusicTrack | null = null;
let ducked = false;
let wantTrack: MusicTrack | null = null;
let unlocked = false;
let gestureQueued = false;
let windEl: HTMLAudioElement | null = null;
let windWant = 0; // 0..1 storm intensity driving amb_wind volume

function targetVolume() {
  return ducked ? VOL.music * 0.12 : VOL.music;
}
function windVolume() {
  return Math.min(1, windWant * (ducked ? 0.3 : 1) * 0.55);
}

function fadeTo(el: HTMLAudioElement, to: number, ms: number, then?: () => void) {
  const from = el.volume;
  const t0 = performance.now();
  const step = () => {
    if (!el) return;
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k < 1) requestAnimationFrame(step);
    else then?.();
  };
  requestAnimationFrame(step);
}

function startMusic(name: MusicTrack) {
  const old = musicEl;
  if (old) {
    const o = old;
    fadeTo(o, 0, 500, () => {
      o.pause();
    });
  }
  const el = new Audio(asset(`music/${name}.mp3`));
  el.loop = true;
  el.volume = 0;
  musicEl = el;
  musicName = name;
  el.play()
    .then(() => fadeTo(el, targetVolume(), 900))
    .catch(() => {
      if (musicEl === el) {
        musicEl = null;
        musicName = null;
      }
    });
}

export const audio = {
  /** Fire-and-forget chiptune effect. */
  sfx(name: string, gain = 1) {
    try {
      let pool = sfxPool.get(name);
      if (!pool) {
        pool = [];
        sfxPool.set(name, pool);
      }
      let a = pool.find((x) => x.ended || x.paused);
      if (!a) {
        if (pool.length > 5) pool.shift();
        a = new Audio(asset(`sfx/${name}.mp3`));
        pool.push(a);
      }
      a.currentTime = 0;
      a.volume = VOL.sfx * gain;
      void a.play().catch(() => {});
      // sfx always fires inside a real user gesture: use it to (re)start music if needed.
      if (wantTrack && (!musicEl || musicEl.paused)) {
        unlocked = true;
        startMusic(wantTrack);
      }
    } catch {
      // stay silent
    }
  },
  /** Set storm wind ambience level (0 stops with a long fade, no sudden starts). */
  setWind(level: number) {
    windWant = Math.max(0, Math.min(1, level));
    const want = windVolume();
    if (want < 0.01) {
      if (windEl && !windEl.paused) {
        const o = windEl;
        fadeTo(o, 0, 1500, () => o.pause());
      }
      return;
    }
    if (!unlocked) return; // defer until first gesture, like music
    if (!windEl || windEl.paused) {
      const el = new Audio(asset("sfx/amb_wind.mp3"));
      el.loop = true;
      el.volume = 0;
      windEl = el;
      el.play()
        .then(() => fadeTo(el, want, 1400))
        .catch(() => {
          if (windEl === el) windEl = null;
        });
      return;
    }
    fadeTo(windEl, want, 900);
  },
  /** Switch the background loop; before the first gesture it defers (autoplay policy). */
  setMusic(name: MusicTrack) {
    wantTrack = name;
    if (musicName === name && musicEl && !musicEl.paused) return;
    if (!unlocked) {
      if (!gestureQueued) {
        gestureQueued = true;
        const kick = () => {
          unlocked = true;
          if (wantTrack) startMusic(wantTrack);
          if (windWant > 0.02) audio.setWind(windWant);
        };
        window.addEventListener("pointerdown", kick, { once: true });
        window.addEventListener("keydown", kick, { once: true });
      }
      return;
    }
    startMusic(name);
  },
  /** Lower music while N.E.I.L. talks. */
  duck(on: boolean) {
    ducked = on;
    if (musicEl) fadeTo(musicEl, targetVolume(), 220);
    if (windEl && !windEl.paused) fadeTo(windEl, windVolume(), 240);
  },
  stopAll() {
    if (musicEl) {
      musicEl.pause();
      musicEl = null;
      musicName = null;
    }
    if (windEl) {
      windEl.pause();
      windEl = null;
    }
    windWant = 0;
  },
};
