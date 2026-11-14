import { useState } from "react";
import { ASSETS } from "../../game/assets";
import { useGame } from "../GameProvider";
import { SettingsToggles } from "../overlays/Overlays";
import { AnimSprite, Backdrop, Frame, Modal, PixelButton, Sprite } from "../components/Pixel";

export function Title() {
  const { saved, startNew, continueSave, setOverlay, corruptSave } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState(corruptSave);
  const canContinue = saved && saved.screen !== "title";
  return (
    <div className="absolute inset-0">
      <Backdrop dim={0.35} overlay="dark" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="font-pixel text-[88px] leading-none text-orange px-logo tracking-[8px]">
          REVO
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
          <PixelButton variant="ghost" icon="book" onClick={() => setOverlay({ kind: "howto" })}>
            HOW TO PLAY
          </PixelButton>
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
