import { useEffect, useState, type ReactNode } from "react";
import { Frame, PixelButton } from "./components/Pixel";
import { Icon } from "./components/Icon";

export const STAGE_W = 1280;
export const STAGE_H = 720;

export function Stage({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  // On wide phones, use the available width instead of shrinking the whole game
  // to fit a desktop-only 16:9 canvas. Bottom-anchored layouts then reflow into
  // the shorter virtual stage and retain larger, child-friendly touch targets.
  const stageH = Math.min(STAGE_H, Math.max(560, (STAGE_W * vp.h) / vp.w));
  const scale = Math.min(vp.w / STAGE_W, vp.h / stageH);
  const portrait = vp.h > vp.w && vp.w < 900;
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      <div style={{ width: STAGE_W * scale, height: stageH * scale }} className="relative">
        <div
          className="absolute left-0 top-0 bg-space overflow-hidden"
          style={{
            width: STAGE_W,
            height: stageH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
      {portrait && !dismissed ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-space p-6">
          <Frame
            variant="orange"
            className="p-6 flex flex-col items-center gap-5 text-center max-w-[340px]"
          >
            <Icon name="rover" size="xl" className="anim-bob" />
            <div className="font-pixel text-[12px] text-orange leading-relaxed">ROTATE DEVICE</div>
            <p className="text-[18px]">REVO plays best sideways. Turn your phone to landscape.</p>
            <PixelButton variant="ghost" size="sm" onClick={() => setDismissed(true)}>
              PLAY ANYWAY
            </PixelButton>
          </Frame>
        </div>
      ) : null}
    </div>
  );
}
