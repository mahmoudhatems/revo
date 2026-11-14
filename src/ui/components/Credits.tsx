import { useEffect } from "react";
import { ASSETS } from "../../game/assets";
import { audio } from "../audio";
import { PixelButton } from "./Pixel";

const TEAM = [
  "MAHMOUD HATEM",
  "NOURHAN MAHMOUD",
  "AHMED SAAD",
  "MOHAMMED OSAMA",
  "HANYA ELMASRY",
];

function RollBody() {
  return (
    <div className="flex flex-col items-center gap-4">
      <img
        src={ASSETS.nasaLogo}
        alt="NASA"
        className="h-[92px] w-[92px] rounded-full object-cover overflow-hidden"
      />
      <div className="font-pixel text-[11px] text-cyan">NASA SPACE APPS CHALLENGE</div>
      <div className="font-pixel text-[16px] text-orange px-text-shadow">CAIRO · EGYPT</div>
      <div className="h-6" />
      <div className="font-pixel text-[11px] text-muted">A GAME BY</div>
      <div className="font-pixel text-[20px] text-ink px-text-shadow">TEAM REVO</div>
      {TEAM.map((n) => (
        <div key={n} className="font-pixel text-[13px] text-ink">
          {n}
        </div>
      ))}
      <div className="h-5" />
      <div className="font-pixel text-[10px] text-muted">VOICE OF N.E.I.L. · AI GENERATED</div>
      <div className="font-pixel text-[10px] text-muted">PIXEL ART & STORM FX · REVO TEAM + PIXELLAB</div>
      <div className="font-pixel text-[10px] text-muted">SCIENCE SOURCES · NASA JEZERO / OPPORTUNITY</div>
      <div className="h-6" />
      <div className="font-pixel text-[17px] text-success">THANKS FOR PLAYING!</div>
      <img src={ASSETS.logoWhite} alt="REVO" className="h-[64px] w-auto mt-2" />
    </div>
  );
}

/** Gentle rolling end credits (MD credits 1.0). Tap anywhere or CLOSE to leave. */
export function Credits({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    audio.sfx("reward_small");
  }, []);
  return (
    <div
      className="absolute inset-0 z-[97] bg-black flex flex-col items-center anim-fade-in cursor-pointer"
      onClick={onClose}
      role="dialog"
      aria-label="Credits"
    >
      <div className="relative flex-1 w-full max-w-[560px] overflow-hidden mt-6">
        <div className="credits-roll absolute inset-x-0 flex flex-col items-center">
          <RollBody />
          <div className="h-16" />
          <RollBody />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
      </div>
      <div className="py-5">
        <PixelButton variant="ghost" onClick={onClose}>
          CLOSE
        </PixelButton>
      </div>
    </div>
  );
}
