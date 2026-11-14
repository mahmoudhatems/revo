// Sticker unlock celebration (MD fx 2.0): plays the pixelfx collect-burst sparkle at
// the NEW STICKER badge on the Result screen and rains confetti from the top, with the
// chiptune pickup sounds. One-shot overlay; pointer-events none, above panels (z-[60]
// but below modals z-[90]) so kids see the reward without blocking interaction.
import { useEffect, useRef, useState } from "react";
import { audio } from "../ui/audio";
import { drawFxFrame, loadFxSheet } from "./FxSheet";

const W = 1280;
const H = 560;

export function StickerFx({ badge }: { badge: { x: number; y: number } }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(1.5, globalThis.devicePixelRatio || 1);
    cvs.width = W * dpr;
    cvs.height = H * dpr;

    let raf = 0;
    let dead = false;
    let burst: Awaited<ReturnType<typeof loadFxSheet>> = null;
    let confetti: Awaited<ReturnType<typeof loadFxSheet>> = null;
    const t0 = performance.now();
    let didSecond = false;

    audio.sfx("sticker_get", 0.9);
    Promise.all([loadFxSheet("collect-burst", 14), loadFxSheet("confetti", 12)]).then(([a, b]) => {
      if (dead) return;
      burst = a;
      confetti = b;
    });

    const frame = (now: number) => {
      const el = now - t0;
      raf = requestAnimationFrame(frame);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;
      if (burst && el > 150) {
        const i = Math.floor((el - 150) / 60);
        if (i < burst.frames.length) drawFxFrame(ctx, burst, i, badge.x, badge.y, 1.25);
      }
      if (confetti && el > 350) {
        const i = Math.floor((el - 350) / 70);
        if (i < confetti.frames.length) {
          drawFxFrame(ctx, confetti, i, W / 2, 120, 2.1);
          if (!didSecond && i === 2) {
            didSecond = true;
            audio.sfx("reward_special", 0.8);
          }
        }
      }
      if (el > 3800) {
        cancelAnimationFrame(raf);
        dead = true;
        setGone(true);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
    };
  }, [badge]);

  if (gone) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[60] h-full w-full"
    />
  );
}
