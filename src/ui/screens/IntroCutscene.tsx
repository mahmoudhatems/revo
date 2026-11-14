import { useEffect, useRef, useState } from "react";
import { ASSETS } from "../../game/assets";
import { audio } from "../audio";
import { stopSpeaking } from "../voice";
import { PixelButton } from "../components/Pixel";

/**
 * Animated story intro (MD cutscene 1.0).
 * Plays the REVO launch film once per player before the title menu;
 * skippable at any time, pauses all game audio while it runs.
 */
export function IntroCutscene({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const [blocked, setBlocked] = useState(false);
  const tryPlay = () => {
    const v = ref.current;
    if (!v) return;
    v.play()
      .then(() => setBlocked(false))
      // Autoplay with sound needs a user gesture: show TAP TO PLAY instead.
      .catch(() => setBlocked(true));
  };
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };
  useEffect(() => {
    audio.pauseAmbient();
    stopSpeaking();
    tryPlay();
    return () => audio.resumeAmbient();
  }, []);
  useEffect(() => {
    if (!blocked) return;
    const kick = () => tryPlay();
    window.addEventListener("pointerdown", kick, { once: true });
    return () => window.removeEventListener("pointerdown", kick);
  }, [blocked]);
  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-black anim-fade-in">
      <video
        ref={ref}
        src={ASSETS.introVideo}
        className="max-h-full max-w-full"
        autoPlay
        playsInline
        preload="auto"
        controlsList="nodownload"
        onEnded={finish}
      />
      {blocked ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-pixel text-[14px] text-ink px-text-shadow anim-blink">▶ TAP TO PLAY</span>
        </div>
      ) : null}
      <div className="absolute right-5 top-5">
        <PixelButton variant="ghost" size="sm" onClick={finish}>
          SKIP ▸▸
        </PixelButton>
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 font-pixel text-[8px] text-muted anim-blink">
        TRAINING SIMULATION · FICTIONAL BASE
      </div>
    </div>
  );
}
