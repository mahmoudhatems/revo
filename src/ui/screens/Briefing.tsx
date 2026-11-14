import { ASSETS } from "../../game/assets";
import { BUILDINGS } from "../../game/content";
import { currentStep } from "../../game/engine";
import { useGame } from "../GameProvider";
import { Icon } from "../components/Icon";
import { AnimSprite, Backdrop, Frame, NeilDialog, PixelButton, Sprite } from "../components/Pixel";

export function StepHeader({ place, sub }: { place: string; sub?: string }) {
  const { state } = useGame();
  const step = currentStep(state);
  const color =
    step.kind === "crisis" ? "#f15b5b" : step.kind === "expedition" ? "#55d68b" : "#f28c28";
  return (
    <div className="flex items-stretch gap-0">
      <div
        className="font-pixel text-[10px] text-black px-3 flex items-center"
        style={{ background: color, boxShadow: "4px 4px 0 #000" }}
      >
        {step.code}
      </div>
      <Frame className="px-4 py-2 ml-2">
        <div className="font-pixel text-[14px] text-ink">{step.title}</div>
        <div className="font-pixel text-[8px] text-muted mt-2">
          {step.sols} · {place}
          {sub ? ` · ${sub}` : ""}
        </div>
      </Frame>
    </div>
  );
}

export function Briefing() {
  const { state, dispatch } = useGame();
  const step = currentStep(state);
  const shake = step.id === "c4" || step.id === "c3";
  const indoorRevo = step.id === "m3" || step.id === "c2" ? ASSETS.revoFace2 : ASSETS.revoFace;
  return (
    <div className={`absolute left-0 right-0 bottom-0 top-[68px] ${shake ? "anim-shake" : ""}`}>
      <Backdrop
        building="command"
        overlay={step.overlay}
        dim={step.overlay === "blackout" ? 0.3 : 0.5}
      />
      {step.overlay === "dust" ? <DustParticles /> : null}
      <div className="absolute left-4 top-4">
        <StepHeader place={step.briefingPlace} />
      </div>
      <div className="absolute left-4 top-[96px] font-pixel text-[8px] text-muted max-w-[360px] leading-relaxed px-text-shadow">
        {step.briefingVisual.toUpperCase()}
      </div>
      <div className="absolute left-16 bottom-8 flex items-end gap-4">
        {step.id === "c5" ? (
          <Sprite src={indoorRevo} h={240} className="opacity-80" />
        ) : (
          <Sprite
            src={indoorRevo}
            h={240}
            className={step.overlay === "cold" ? "anim-shake" : ""}
          />
        )}
      </div>
      <div className="absolute right-4 top-4 w-[650px] flex flex-col gap-3">
        <NeilDialog compact text={step.neil.join(" ")} offline={state.neilOffline} />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 font-pixel text-[8px] text-ink px-text-shadow">
            <Icon name="map" size="sm" />
            NEXT: {BUILDINGS[step.building].name}
          </div>
          <PixelButton
            size="lg"
            icon={step.ctaIcon}
            onClick={() => dispatch({ type: "BRIEFING_CTA" })}
            autoFocus
          >
            {step.ctaLabel}
          </PixelButton>
        </div>
      </div>
      {step.id === "p3" ? (
        <div className="absolute right-10 bottom-10 flex items-end gap-4">
          <Icon name="rover" size={96} className="anim-bob" />
          <Icon name="beacon" size={64} className="anim-blink" />
        </div>
      ) : (
        <div className="absolute right-24 bottom-10 anim-bob">
          <AnimSprite frames={ASSETS.droneFrames} h={90} fps={2} />
        </div>
      )}
    </div>
  );
}

export function DustParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute block anim-fly"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
            width: 8,
            height: 4,
            background: i % 2 ? "#c8542a" : "#8a3418",
            animationDelay: `${(i % 6) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
