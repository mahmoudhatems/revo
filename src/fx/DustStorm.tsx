// REVO Mars dust-storm effect (MD fx 2.0).
// Primary artwork: the uploaded PixelLab storm pack, sliced into per-frame PNGs by
// tools/fx/slice_storm_assets.py -> public/assets/revo/storm_lab/*.
// Depth + hero layers from the pixelgame.io effects library (patch-gg/pixelfx, MIT)
// rendered into public/assets/revo/fx_lib/*.
// A single `level` prop (0..1) drives everything; the engine eases intensity so the
// three authored phases (A approaching / B full storm / C clearing) blend smoothly.
// The canvas renders at z-[5]: above surface art, BELOW all z-10+ UI panels, so it
// never covers gameplay indoors or outdoors (spec 5 and 8).
import { useEffect, useRef } from "react";
import { asset } from "../game/assets";
import { drawFxFrame, loadFxSheet, type FxSheet } from "./FxSheet";

export interface StormProps {
  level: number;
  onGust?: (hard: boolean) => void;
  onLevel?: (smoothed: number) => void;
}

const LAB = {
  swirl: 6, // dust vortex swirls (6-frame spin)
  billow: 6, // atmospheric dust clouds
  tornado: 6, // small pixel tornados (walk cycle)
  devil: 6, // bigger dust devils
  debris: 6, // one-shot debris burst
  curtain: 2, // horizontal dust bands
  specks: 6, // floating grit clusters
  gust: 6, // 6-frame wind gust curls
} as const;
type LabName = keyof typeof LAB;

const ONE = [1280, 560]; // logical stage resolution

interface Inst {
  alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  a: number;
  ph: number; // anim phase offset
  t0: number; // one-shot start time
  kind: number; // lab sprite row id
}

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Decode the PixelLab frames once per page. */
const labCache = new Map<LabName, Promise<HTMLImageElement[]>>();
function loadLab(name: LabName): Promise<HTMLImageElement[]> {
  let p = labCache.get(name);
  if (!p) {
    const n = LAB[name];
    p = Promise.all(
      Array.from({ length: n }, (_, i) => {
        const im = new Image();
        im.src = asset(`storm_lab/${name}_${i}.png`);
        return new Promise<HTMLImageElement>((res) => {
          im.onload = () => res(im);
          im.onerror = () => res(im); // caller checks width>0
        });
      }),
    ).then((ims) => ims.filter((im) => im.width > 0));
    labCache.set(name, p);
  }
  return p;
}

export function DustStorm({ level, onGust, onLevel }: StormProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const target = useRef(level);
  const cb = useRef({ onGust, onLevel });
  cb.current = { onGust, onLevel };
  target.current = level;

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let dead = false;
    let raf = 0;
    const dpr = Math.min(1.5, globalThis.devicePixelRatio || 1);
    cvs.width = ONE[0] * dpr;
    cvs.height = ONE[1] * dpr;

    const lab: Partial<Record<LabName, HTMLImageElement[]>> = {};
    let fog: FxSheet | null = null;
    let bigTornado: FxSheet | null = null;
    let ready = false;
    Promise.all([
      ...(["swirl", "billow", "tornado", "devil", "debris", "curtain", "specks", "gust"] as LabName[]).map(
        async (n) => {
          lab[n] = await loadLab(n);
        },
      ),
      loadFxSheet("fog").then((s) => (fog = s)),
      loadFxSheet("tornado").then((s) => (bigTornado = s)),
    ]).then(() => {
      if (!dead) ready = true;
    });

    // ---- particle state -----------------------------------------------------
    const P = (n: number, mk: () => Inst) => Array.from({ length: n }, mk);
    const billows = P(10, () => ({
      alive: true, x: rnd(-100, 1400), y: rnd(-20, 300), vx: rnd(10, 22), vy: 0,
      s: rnd(1.8, 3.2), a: rnd(0.1, 0.18), ph: rnd(0, 400), t0: 0, kind: 0,
    }));
    const swirls = P(12, () => ({
      alive: true, x: rnd(0, 1400), y: rnd(40, 500), vx: rnd(30, 70), vy: 0,
      s: rnd(0.7, 1.6), a: rnd(0.3, 0.5), ph: rnd(0, 400), t0: 0, kind: 0,
    }));
    const wisps = P(10, () => ({
      alive: true, x: rnd(0, 1400), y: rnd(0, 540), vx: rnd(130, 260), vy: rnd(-4, 4),
      s: rnd(0.7, 1.5), a: rnd(0.3, 0.55), ph: rnd(0, 400), t0: 0, kind: Math.floor(rnd(0, 6)),
    }));
    const specks = P(26, () => ({
      alive: true, x: rnd(0, 1400), y: rnd(0, 540), vx: rnd(200, 380), vy: rnd(-8, 8),
      s: 1, a: rnd(0.4, 0.85), ph: 0, t0: 0, kind: Math.floor(rnd(0, 6)),
    }));
    const gusts: Inst[] = []; // one-shot gust curls during a gust event
    const bursts: Inst[] = []; // one-shot debris bursts at ground line
    const smallTornadoes: Inst[] = []; // PixelLab tornado walk cycles
    const hero: { alive: boolean; x: number; y: number; t0: number } = { alive: false, x: 0, y: 0, t0: 0 };
    let nextHero = performance.now() + 9000;
    let nextTornado = performance.now() + 6000;

    let cur = 0;
    let last = performance.now();
    let nextGust = last + rnd(2000, 4500);
    let gustUntil = 0;
    let shake = 0;
    let lastRep = -1;

    const recycle = (p: Inst) => {
      p.x = -140 - rnd(0, 120);
      p.y = rnd(-10, p === billows[0] ? 300 : 540);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const tgt = Math.max(0, Math.min(1, target.current));
      const tau = tgt > cur ? 2.5 : 3.5;
      cur += (tgt - cur) * (1 - Math.exp(-dt / tau));
      const rep = Math.round(cur * 20) / 20;
      if (rep !== lastRep) {
        lastRep = rep;
        cb.current.onLevel?.(rep);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ONE[0], ONE[1]);
      if (!ready || cur < 0.015) return;

      // gust scheduling -------------------------------------------------------
      let gust = 0;
      if (now > nextGust && cur > 0.25) {
        gustUntil = now + 950;
        nextGust = now + rnd(2200, 6200) / Math.max(0.3, cur);
        const hard = Math.random() < 0.35;
        shake = hard ? 4 : 2.2;
        cb.current.onGust?.(hard);
        for (let i = 0; i < (hard ? 3 : 2); i++)
          gusts.push({ alive: true, x: rnd(-350, 150), y: rnd(30, 500), vx: rnd(420, 640), vy: 0, s: rnd(0.9, 1.6), a: 1, ph: 0, t0: now, kind: 0 });
        if (hard && lab.debris?.length)
          bursts.push({ alive: true, x: rnd(120, 1100), y: rnd(430, 540), vx: rnd(150, 260), vy: 0, s: rnd(1, 1.5), a: 1, ph: 0, t0: now, kind: 0 });
      }
      if (now < gustUntil) gust = (gustUntil - now) / 950;
      const speed = 1 + gust * gust * 1.9;
      shake = Math.max(0, shake - dt * 9);
      const ang = Math.sin(now / 3400) * 0.16;

      ctx.imageSmoothingEnabled = false;
      ctx.save();
      if (shake > 0.2) ctx.translate(Math.sin(now / 23) * shake, Math.cos(now / 17) * shake * 0.5);

      // 0) atmospheric wash + distance fog (far things fade first) ------------
      ctx.globalAlpha = cur * 0.08;
      ctx.fillStyle = "#b06a35";
      ctx.fillRect(-8, -8, ONE[0] + 16, ONE[1] + 16);
      const g = ctx.createLinearGradient(0, 0, 0, ONE[1] * 0.6);
      g.addColorStop(0, `rgba(150,84,38,${0.2 * cur})`);
      g.addColorStop(1, "rgba(150,84,38,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, ONE[0], ONE[1] * 0.6);
      if (fog) {
        const fi = Math.floor(now / 250) % fog.frames.length;
        for (let i = 0; i < 3; i++) {
          const drift = ((now / 9000) * (18 + i * 10) + i * 430) % (ONE[0] + 480);
          drawFxFrame(ctx, fog, (fi + i * 9) % fog.frames.length, ONE[0] - drift, 70 + i * 60, 2.0, cur * 0.15);
        }
      }

      // 1) far atmospheric billows (uploaded PixelLab clouds) -----------------
      if (lab.billow?.length) {
        const n = Math.max(2, Math.round(8 * cur));
        const fi = Math.floor(now / 160);
        for (let i = 0; i < n; i++) {
          const p = billows[i];
          p.x += p.vx * (0.4 + cur) * speed * dt;
          if (p.x > 1500) recycle(p);
          const im = lab.billow[(fi + Math.floor(p.ph)) % lab.billow.length];
          ctx.globalAlpha = p.a * cur;
          ctx.drawImage(im, Math.round(p.x), Math.round(p.y + Math.sin(p.ph + now / 2600) * 5), Math.round(im.width * p.s), Math.round(im.height * p.s));
        }
      }

      // 2) hero tornado from the effects library (phase B spectacle) ----------
      if (bigTornado && !hero.alive && cur > 0.95 && now > nextHero) {
        hero.alive = true;
        hero.t0 = now;
        hero.x = -260;
        hero.y = rnd(140, 250);
        nextHero = now + rnd(18000, 26000);
      }
      if (hero.alive && bigTornado) {
        hero.x += 55 * dt * speed;
        const fps = 1000 / (bigTornado.frames[0]?.dur || 100);
        const i = Math.floor(((now - hero.t0) / 1000) * fps) % bigTornado.frames.length;
        drawFxFrame(ctx, bigTornado, i, hero.x, hero.y, 1.6, cur * 0.75);
        if (hero.x > ONE[0] + 260) hero.alive = false;
      }

      // 3) mid dust swirls / devils (6-frame spin) ----------------------------
      if (lab.swirl?.length) {
        const n = Math.max(2, Math.round(10 * cur));
        for (let i = 0; i < n; i++) {
          const p = swirls[i];
          p.x += p.vx * (0.35 + cur) * speed * dt;
          if (p.x > 1450) {
            p.x = -120;
            p.y = rnd(40, 500);
            p.s = rnd(0.9, 2.1);
          }
          const fr = Math.floor(now / 130 + p.ph) % lab.swirl.length;
          ctx.globalAlpha = p.a * cur;
          const im = lab.swirl[fr];
          ctx.drawImage(im, Math.round(p.x), Math.round(p.y), Math.round(im.width * p.s), Math.round(im.height * p.s));
        }
      }

      // 4) small PixelLab tornadoes walking at ground level -------------------
      if (lab.tornado?.length && cur > 0.8) {
        if (now > nextTornado && smallTornadoes.length < 2) {
          smallTornadoes.push({ alive: true, x: rnd(-320, -80), y: rnd(330, 480), vx: rnd(70, 130), vy: 0, s: rnd(1.0, 1.6), a: 1, ph: rnd(0, 400), t0: now, kind: 0 });
          nextTornado = now + rnd(9000, 16000);
        }
        for (let i = smallTornadoes.length - 1; i >= 0; i--) {
          const p = smallTornadoes[i];
          p.x += p.vx * dt;
          if (p.x > ONE[0] + 200) {
            smallTornadoes.splice(i, 1);
            continue;
          }
          const fr = Math.floor(now / 110 + p.ph) % lab.tornado.length;
          const im = lab.tornado[fr];
          ctx.globalAlpha = cur * 0.95;
          ctx.drawImage(im, Math.round(p.x), Math.round(p.y - Math.abs(Math.sin(now / 700)) * 6), Math.round(im.width * p.s), Math.round(im.height * p.s));
        }
      }

      // 5) near wind curtains + wisps -----------------------------------------
      if (lab.curtain?.length) {
        const cn = cur > 0.5 ? 2 : 1;
        for (let i = 0; i < cn; i++) {
          const fr = Math.floor(now / 700 + i) % lab.curtain.length;
          const im = lab.curtain[fr];
          const xx = -(((now / (1200 / speed)) % (ONE[0] + im.width * 3)) - im.width * 1.5);
          ctx.globalAlpha = cur * 0.1;
          ctx.drawImage(im, Math.round(xx), 420 + i * 90, im.width * 2.5, im.height * 1.8);
        }
      }
      if (lab.gust?.length) {
        const n = Math.max(1, Math.round(6 * cur) + (gust > 0 ? 3 : 0));
        for (let i = 0; i < n; i++) {
          const p = wisps[i];
          p.x += p.vx * (0.35 + cur) * speed * dt;
          p.y += (p.vy + ang * 70 + Math.sin(p.ph + now / 900) * 16) * dt;
          if (p.x > 1420) {
            p.x = -160;
            p.y = rnd(0, 540);
          }
          ctx.globalAlpha = p.a * cur * (0.65 + gust * 0.35);
          const im = lab.gust[p.kind % lab.gust.length];
          ctx.drawImage(im, Math.round(p.x), Math.round(p.y), Math.round(im.width * p.s), Math.round(im.height * p.s));
        }
      }

      // 6) one-shot gust curls (6-frame animation flying across) --------------
      if (lab.gust?.length) {
        for (let i = gusts.length - 1; i >= 0; i--) {
          const p = gusts[i];
          p.x += p.vx * dt;
          const fr = Math.floor((now - p.t0) / 80);
          if (fr >= 6) {
            if (p.x > ONE[0] + 400 || fr > 14) gusts.splice(i, 1);
            ctx.globalAlpha = Math.max(0, 1 - (fr - 5) / 9) * cur * p.a * 0.9;
            const im = lab.gust[5];
            ctx.drawImage(im, Math.round(p.x), Math.round(p.y), Math.round(im.width * p.s), Math.round(im.height * p.s));
          } else {
            ctx.globalAlpha = cur * p.a;
            const im = lab.gust[fr];
            ctx.drawImage(im, Math.round(p.x), Math.round(p.y), Math.round(im.width * p.s * 1.5), Math.round(im.height * p.s * 1.5));
          }
        }
      }

      // 7) debris bursts (one-shot, ground) ------------------------------------
      if (lab.debris?.length) {
        for (let i = bursts.length - 1; i >= 0; i--) {
          const p = bursts[i];
          p.x += p.vx * dt * 0.7;
          const fr = Math.floor((now - p.t0) / 90);
          if (fr >= lab.debris.length) {
            bursts.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = cur * (1 - fr / (lab.debris.length + 2));
          const im = lab.debris[fr];
          ctx.drawImage(im, Math.round(p.x), Math.round(p.y), Math.round(im.width * p.s), Math.round(im.height * p.s));
        }
      }

      // 8) fast floating grit clusters -----------------------------------------
      if (lab.specks?.length) {
        const n = Math.max(3, Math.round(22 * cur));
        for (let i = 0; i < n; i++) {
          const p = specks[i];
          p.x += p.vx * (0.3 + cur * 1.2) * speed * dt;
          p.y += (p.vy + ang * 120) * dt;
          if (p.x > ONE[0] + 20) {
            p.x = -30;
            p.y = rnd(0, ONE[1] - 20);
          }
          if (p.y < -20) p.y = ONE[1] + 10;
          else if (p.y > ONE[1] + 20) p.y = -10;
          ctx.globalAlpha = p.a * cur * 0.85;
          const im = lab.specks[p.kind % lab.specks.length];
          ctx.drawImage(im, Math.round(p.x), Math.round(p.y));
        }
      }

      ctx.restore();
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      gusts.length = 0;
      bursts.length = 0;
      smallTornadoes.length = 0;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
    />
  );
}
