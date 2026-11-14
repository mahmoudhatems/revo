import { useEffect, useState } from "react";
import { ASSETS } from "../../game/assets";
import { audio } from "../audio";
import { useGame } from "../GameProvider";
import { SettingsToggles } from "../overlays/Overlays";
import { AnimSprite, Backdrop, Frame, Modal, PixelButton, Sprite } from "../components/Pixel";
import { IntroCutscene } from "./IntroCutscene";
import { Credits } from "../components/Credits";

const lsGet = (k: string) => {
  try {
    return globalThis.localStorage?.getItem(k);
  } catch {
    return null;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    globalThis.localStorage?.setItem(k, v);
  } catch {
    // ignore
  }
};

/** Boot sequence: logo sting → story cutscene (once) → menu. */
type Stage = "splash" | "cut" | "menu";
const afterSplash = (): Stage => (lsGet("revo.cutscene.v1") === "1" ? "menu" : "cut");

export function Title() {
  const { saved, startNew, continueSave, setOverlay, corruptSave } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState(corruptSave);
  const [credits, setCredits] = useState(false);
  const [stage, setStage] = useState<Stage>(() =>
    lsGet("revo.intro.v1") === "1" ? afterSplash() : "splash",
  );
  const canContinue = saved && saved.screen !== "title";

  // Logo splash auto-advances like a real boot sequence.
  useEffect(() => {
    if (stage !== "splash") return;
    audio.sfx("intro_sting");
    const t = setTimeout(() => finishSplash(), 4600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const finishSplash = () => {
    lsSet("revo.intro.v1", "1");
    setStage((s) => (s === "splash" ? afterSplash() : s));
  };
  const finishCut = () => {
    lsSet("revo.cutscene.v1", "1");
    setStage("menu");
  };

  return (
    <div className="absolute inset-0">
      <Backdrop dim={0.35} overlay="dark" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="logo-sweep anim-logo-in">
          <img
            src={ASSETS.logo}
            alt="REVO"
            className="h-[128px] w-auto drop-shadow-[0_0_22px_rgba(242,107,28,0.30)]"
          />
        </div>
        <div className="font-pixel text-[16px] text-ink px-text-shadow">MARS COLONY SURVIVAL</div>
        <div className="font-pixel text-[10px] text-cyan px-text-shadow">
          30 SOLS · JEZERO CRATER · ARES-2 INBOUND
        </div>
        <Frame className="mt-3 p-5 flex flex-col gap-3 w-[420px]">
          {canContinue ? (
            <PixelButton size="lg" icon="arrow" onClick={continueSave} autoFocus>
              CONTINUE · SOL {Math.min(saved.sol, 30)}
            </PixelButton>
          ) : null}
          <PixelButton
            size="lg"
            variant={canContinue ? "cyan" : "orange"}
            icon="rocket"
            onClick={() => (canContinue ? setConfirm(true) : startNew())}
            autoFocus={!canContinue}
          >
            NEW GAME
          </PixelButton>
          <div className="flex gap-3">
            <PixelButton className="flex-1" variant="ghost" icon="book" onClick={() => setOverlay({ kind: "howto" })}>
              HOW TO PLAY
            </PixelButton>
            <PixelButton className="flex-1" variant="ghost" icon="info" onClick={() => setStage("cut")}>
              WATCH INTRO
            </PixelButton>
            <PixelButton className="flex-1" variant="ghost" icon="starG" onClick={() => setCredits(true)}>
              CREDITS
            </PixelButton>
          </div>
          <SettingsToggles />
        </Frame>
      </div>
      <div className="absolute left-16 bottom-10 flex items-end gap-6">
        <AnimSprite frames={ASSETS.revoWalk} h={180} fps={5} />
      </div>
      <div className="absolute right-20 bottom-24 anim-bob">
        <Sprite src={ASSETS.drone} h={110} />
      </div>
      <div className="absolute right-4 bottom-3 font-pixel text-[8px] text-muted">
        TRAINING SIMULATION · FICTIONAL BASE
      </div>
      {stage === "splash" ? (
        <div
          className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-black anim-fade-in cursor-pointer"
          onClick={finishSplash}
          role="button"
          aria-label="Skip intro"
        >
          <div className="logo-sweep anim-logo-in">
            <img src={ASSETS.logo} alt="REVO" className="h-[220px] w-auto drop-shadow-[0_0_28px_rgba(242,107,28,0.35)]" />
          </div>
          <div className="font-pixel text-[15px] text-ink px-text-shadow mt-8 anim-tagline-in">
            MARS COLONY SURVIVAL
          </div>
          <div className="font-pixel text-[9px] text-muted mt-16 anim-blink">CLICK TO SKIP</div>
        </div>
      ) : null}
      {stage === "cut" ? <IntroCutscene onDone={finishCut} /> : null}
      {credits ? <Credits onClose={() => setCredits(false)} /> : null}
      {confirm ? (
        <Modal label="Start a new game" onClose={() => setConfirm(false)} width={560}>
          <div className="font-pixel text-[14px] text-orange mb-4">START OVER?</div>
          <p className="text-[22px] mb-6">Your saved mission on Sol {saved?.sol} will be erased.</p>
          <div className="flex gap-6 justify-end">
            <PixelButton variant="ghost" onClick={() => setConfirm(false)}>
              KEEP SAVE
            </PixelButton>
            <PixelButton variant="danger" onClick={startNew}>
              NEW GAME
            </PixelButton>
          </div>
        </Modal>
      ) : null}
      {notice ? (
        <Modal label="Save problem" onClose={() => setNotice(false)} width={520} variant="warn">
          <div className="font-pixel text-[12px] text-warning mb-4">SAVE DATA DAMAGED</div>
          <p className="text-[22px] mb-6">
            The old save could not be read, so it was cleared. Start a new mission!
          </p>
          <PixelButton onClick={() => setNotice(false)}>OK</PixelButton>
        </Modal>
      ) : null}
    </div>
  );
}
