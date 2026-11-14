// Loader for pixelgame.io / pixelfx sprite sheets (MIT, github patch-gg/pixelfx).
// Sheets live in public/assets/revo/fx_lib/<name>.png + <name>.json (TexturePacker array).
// One image + JSON per effect page-wide; loading failures resolve to null and callers
// simply skip the layer.
import { asset } from "../game/assets";

export interface FxFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  dur: number; // ms per frame
}
export interface FxSheet {
  img: HTMLImageElement;
  frames: FxFrame[];
  loop: boolean;
}

const cache = new Map<string, Promise<FxSheet | null>>();

export function loadFxSheet(name: string, fallbackFps = 12): Promise<FxSheet | null> {
  let p = cache.get(name);
  if (!p) {
    p = fetch(asset(`fx_lib/${name}.json`))
      .then((r) => (r.ok ? r.json() : null))
      .then(async (j) => {
        if (!j || !Array.isArray(j.frames) || !j.frames.length) return null;
        const img = new Image();
        img.src = asset(`fx_lib/${name}.png`);
        const ok = await new Promise<boolean>((res) => {
          img.onload = () => res(true);
          img.onerror = () => res(false);
        });
        if (!ok) return null;
        const frames: FxFrame[] = j.frames.map((f: any) => ({
          x: f.frame.x,
          y: f.frame.y,
          w: f.frame.w,
          h: f.frame.h,
          dur: typeof f.duration === "number" && f.duration > 0 ? f.duration : 1000 / fallbackFps,
        }));
        return { img, frames, loop: true };
      })
      .catch(() => null);
    cache.set(name, p);
  }
  return p;
}

/** Draw frame `i` centred at (cx, cy). */
export function drawFxFrame(
  ctx: CanvasRenderingContext2D,
  s: FxSheet,
  i: number,
  cx: number,
  cy: number,
  scale = 1,
  alpha = 1,
) {
  const f = s.frames[Math.min(s.frames.length - 1, Math.max(0, i))];
  if (!f) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    s.img,
    f.x,
    f.y,
    f.w,
    f.h,
    Math.round(cx - (f.w * scale) / 2),
    Math.round(cy - (f.h * scale) / 2),
    Math.round(f.w * scale),
    Math.round(f.h * scale),
  );
}
