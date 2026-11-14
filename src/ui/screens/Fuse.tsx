import { useState } from "react";
import { fuseAmps } from "../../game/engine";
import { RULES } from "../../game/rules";
import type { Cable } from "../../game/types";
import { useGame } from "../GameProvider";
import { Icon } from "../components/Icon";
import { Backdrop, Frame, Modal, NeilDialog, PixelButton } from "../components/Pixel";
import { StepHeader } from "./Briefing";

const CABLES: { id: Cable; name: string; icon: string; note: string }[] = [
  { id: "moxie", name: "OXYGEN GENERATOR (MOXIE)", icon: "o2", note: "Essential life support" },
  { id: "heater", name: "THERMAL HEATER", icon: "flame", note: "Essential freeze protection" },
  {
    id: "pump",
    name: "WATER SHIELD PUMP",
    icon: "watershield",
    note: "Essential radiation protection",
  },
  { id: "leds", name: "FULL-POWER GREENHOUSE LEDS", icon: "plant", note: "Not an emergency load" },
];

export function Fuse() {
  const { dispatch, setOverlay } = useGame();
  const [on, setOn] = useState<Cable[]>([]);
  const [confirm, setConfirm] = useState(false);
  const amps = fuseAmps(on);
  const over = amps > RULES.fuseLimitAmps;
  const toggle = (c: Cable) => setOn((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="command" overlay="blackout" dim={0.55} />
      <div className="absolute left-6 top-4">
        <StepHeader place="POWER ROOM" sub="MAIN FUSE BREAKER" />
      </div>
      <div className="absolute left-6 top-[96px] w-[740px] grid grid-cols-2 gap-3">
        {CABLES.map((c) => {
          const active = on.includes(c.id);
          return (
            <Frame
              key={c.id}
              variant={active ? "success" : "panel"}
              className="px-3 py-2 flex items-center gap-3"
            >
              <Icon name={c.icon} size="md" />
              <div className="flex-1 min-w-0">
                <div className="font-pixel text-[9px] leading-relaxed">{c.name}</div>
                <div className="text-[15px] leading-tight text-muted">{c.note}</div>
              </div>
              <span className="font-pixel text-[10px] text-muted w-[28px] text-right">? A</span>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={`${c.name} cable`}
                onClick={() => toggle(c.id)}
                className="relative shrink-0 w-[104px] h-[44px] bg-[#0b111c]"
                style={{
                  boxShadow: `0 0 0 4px #000, inset 0 0 0 4px ${active ? "#2a9358" : "#343b45"}`,
                }}
              >
                <span
                  className="absolute top-[8px] w-[40px] h-[28px]"
                  style={{
                    left: active ? 56 : 8,
                    background: active ? "#55d68b" : "#8493a8",
                    boxShadow: "inset 0 4px 0 rgba(255,255,255,0.4), 0 4px 0 #000",
                  }}
                />
                <span
                  className="absolute font-pixel text-[8px] top-[18px]"
                  style={{ left: active ? 14 : 58, color: active ? "#55d68b" : "#8493a8" }}
                >
                  {active ? "ON" : "OFF"}
                </span>
              </button>
            </Frame>
          );
        })}
      </div>
      <div className="absolute right-6 top-[96px] w-[440px] flex flex-col gap-4">
        <Frame variant={over ? "alert" : "orange"} className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Icon name="fuse" size="lg" />
            <div className="font-pixel text-[10px] leading-relaxed">
              MAIN BREAKER · MAX {RULES.fuseLimitAmps} AMPS
            </div>
          </div>
          <div className="flex" style={{ gap: 3 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className={`block h-[34px] w-[24px] ${i >= 10 ? "opacity-90" : ""}`}
                style={{
                  background:
                    i < amps
                      ? i >= 10
                        ? "#f15b5b"
                        : i >= 8
                          ? "#f2c14e"
                          : "#55d68b"
                      : i >= 10
                        ? "#2a1420"
                        : "#0b111c",
                  boxShadow:
                    i === 9 ? "inset 0 0 0 2px #000, 4px 0 0 #f15b5b" : "inset 0 0 0 2px #000",
                }}
              />
            ))}
          </div>
          <div
            className={`font-pixel text-[16px] mt-4 ${over ? "text-danger anim-blink-fast" : "text-ink"}`}
          >
            {amps} / {RULES.fuseLimitAmps} A {over ? "OVERLOAD!" : ""}
          </div>
        </Frame>
        <PixelButton variant="cyan" icon="book" onClick={() => setOverlay({ kind: "logbook" })}>
          CHECK AMPS IN LOGBOOK
        </PixelButton>
        <PixelButton size="lg" icon="bolt" onClick={() => setConfirm(true)}>
          CONNECT CABLES
        </PixelButton>
      </div>
      <div className="absolute left-6 w-[740px] bottom-4">
        <NeilDialog
          compact
          offline
          text="N.E.I.L. is offline. Amp ratings are hidden here. Check the Mission 3 entry in your Logbook, then switch on the cables that keep you alive without passing 10 amps."
        />
      </div>
      {confirm ? (
        <Modal label="Connect cables" onClose={() => setConfirm(false)} width={600} variant="alert">
          <div className="font-pixel text-[14px] text-danger mb-4">
            CONNECT {on.length} CABLE{on.length === 1 ? "" : "S"}?
          </div>
          <p className="text-[22px] mb-6">
            You can't undo this during the blackout. Did you check your Logbook?
          </p>
          <div className="flex gap-6 justify-end">
            <PixelButton variant="ghost" onClick={() => setConfirm(false)}>
              BACK
            </PixelButton>
            <PixelButton
              variant="danger"
              autoFocus
              onClick={() => {
                setConfirm(false);
                dispatch({ type: "FUSE_SUBMIT", cables: on });
              }}
            >
              CONNECT
            </PixelButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
