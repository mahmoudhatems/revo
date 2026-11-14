import { useEffect, useState } from "react";
import {
  BUILDINGS,
  GLOSSARY,
  STATION_EQUIPMENT,
  STEPS,
  STICKERS,
  type BuildingId,
} from "../../game/content";
import { DATA } from "../../game/data";
import { CROP_INFO, currentStep, currentStepId } from "../../game/engine";
import { RULES } from "../../game/rules";
import {
  fmtBars,
  habitatTemp,
  kidRate,
  meterBars,
  perSol,
  type MeterId,
} from "../../game/selectors";
import type { GameState, LogSection } from "../../game/types";
import { useGame } from "../GameProvider";
import { METER_META } from "../hud/Hud";
import { Icon } from "../components/Icon";
import {
  Frame,
  LABEL_COLOR,
  Modal,
  NeilDialog,
  PixelButton,
  SegmentMeter,
  StationSprite,
  Tag,
} from "../components/Pixel";
import { speechAvailable } from "../voice";

const SECTIONS: { id: LogSection | "all"; label: string; icon: string }[] = [
  { id: "all", label: "ALL", icon: "book" },
  { id: "power", label: "POWER", icon: "bolt" },
  { id: "water", label: "WATER", icon: "drop" },
  { id: "air", label: "HEAT, AIR & AMPS", icon: "o2" },
  { id: "shield", label: "SHIELD", icon: "radiation" },
  { id: "health", label: "HEALTH", icon: "heart" },
  { id: "crisis", label: "EVENTS", icon: "warn" },
  { id: "facts", label: "DID YOU KNOW", icon: "info" },
];

export function Logbook({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState<LogSection | "all">(currentStepId(state) === "c4" ? "air" : "all");
  const [unreadIds] = useState(
    () => new Set(state.logbook.filter((e) => e.unread).map((e) => e.id)),
  );
  useEffect(() => {
    dispatch({ type: "MARK_LOG_READ" });
  }, [dispatch]);
  const entries = [...state.logbook].reverse().filter((e) => tab === "all" || e.section === tab);
  return (
    <Modal label="Rivo's Logbook" onClose={onClose} width={960}>
      <div className="flex items-center gap-3 mb-3">
        <Icon name="book" size="lg" />
        <div className="font-pixel text-[16px] text-orange">RIVO'S LOGBOOK</div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3" role="tablist">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={tab === s.id}
            onClick={() => setTab(s.id)}
            className={`flex min-h-[36px] items-center gap-2 px-2 py-1 font-pixel text-[7px] ${tab === s.id ? "bg-orange text-black" : "bg-surface text-ink hover:bg-dgray"}`}
            style={{ boxShadow: "0 4px 0 #000" }}
          >
            <Icon name={s.icon} size={18} />
            {s.label}
          </button>
        ))}
      </div>
      <div
        className="bg-[#e8e8e2] text-[#182438] p-4 max-h-[360px] overflow-auto"
        style={{ boxShadow: "inset 6px 0 0 #b5611a" }}
      >
        {entries.length ? (
          <ul className="flex flex-col gap-4">
            {entries.map((e) => (
              <li key={e.id} className="pb-4" style={{ boxShadow: "0 2px 0 #8493a8" }}>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-pixel text-[9px]">SOL {e.sol}</span>
                  <span className="font-pixel text-[9px] text-[#b5611a]">{e.title}</span>
                  <Tag color={LABEL_COLOR[e.label]}>{e.label}</Tag>
                  {unreadIds.has(e.id) ? <Tag color="#f15b5b">NEW</Tag> : null}
                </div>
                <p className="text-[18px] leading-snug">{e.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[20px]">No entries here yet.</p>
        )}
      </div>
    </Modal>
  );
}

export function StickerAlbum({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const got = new Set(state.stickers);
  return (
    <Modal label="Sticker Album" onClose={onClose} width={1080}>
      <div className="flex items-center gap-3 mb-2">
        <Icon name="sticker" size="lg" />
        <div className="font-pixel text-[16px] text-orange">STICKER ALBUM</div>
      </div>
      <div className="font-pixel text-[9px] text-muted mb-5">
        {got.size} OF {STICKERS.length} STICKERS · EVERY CARD GIVES ONE
      </div>
      <div className="grid grid-cols-8 gap-3 max-h-[470px] overflow-auto p-1">
        {STICKERS.map((s) => {
          const have = got.has(s.id);
          return (
            <div
              key={s.id}
              className="flex flex-col items-center gap-2 p-2 bg-[#0b111c] text-center"
              style={{ boxShadow: `0 0 0 3px ${have ? "#f2c14e" : "#24344a"}` }}
              title={have ? s.look : "Not found yet"}
            >
              <div
                className={have ? "anim-pop" : "opacity-25"}
                style={{ filter: have ? undefined : "grayscale(1)" }}
              >
                <Icon name={s.icon} size={44} />
              </div>
              <span
                className={`font-pixel text-[7px] leading-relaxed ${have ? "text-ink" : "text-muted"}`}
              >
                {have ? s.name : "???"}
              </span>
              <span className="font-pixel text-[6px] text-muted">
                {s.step === "special" ? "SPECIAL" : STEPS[s.step].code}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export function WordPopup({ id, onClose }: { id: string; onClose: () => void }) {
  const g = GLOSSARY.find((x) => x.id === id);
  if (!g) return null;
  return (
    <Modal label={`What is ${g.word}?`} onClose={onClose} width={560} variant="warn">
      <div className="flex items-center gap-6">
        <div className="bg-[#0b111c] p-4" style={{ boxShadow: "inset 0 0 0 4px #f2c14e" }}>
          <Icon name={g.icon} size={90} />
        </div>
        <div>
          <div className="font-pixel text-[14px] text-warning mb-3">{g.word}</div>
          <p className="text-[24px] leading-snug">{g.kid}</p>
        </div>
      </div>
    </Modal>
  );
}

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const loop: [string, string, string][] = [
    ["arrowDown", "1. FOLLOW THE ARROW", "A yellow arrow shows where Rivo goes next."],
    ["arrow", "2. PRESS USE", "Press the big USE button to start a job."],
    ["gym", "3. MINI-GAME", "Drag, hold, tap, spin or swipe for a few seconds."],
    ["sticker", "4. PICK A CARD", "Every card has a Good, a Careful and a Sticker."],
    ["starG", "5. SEE IT HAPPEN", "The room changes and a sticker lands in your album."],
  ];
  return (
    <Modal label="How to play" onClose={onClose} width={860}>
      <div className="font-pixel text-[16px] text-orange mb-6">HOW TO PLAY</div>
      <ul className="flex flex-col gap-4">
        {loop.map(([i, t, d]) => (
          <li key={t} className="flex items-center gap-4">
            <Icon name={i} size="md" />
            <span className="font-pixel text-[10px] w-[220px] text-cyan">{t}</span>
            <span className="text-[21px]">{d}</span>
          </li>
        ))}
      </ul>
      <p className="text-[19px] mt-5 leading-snug">
        Keep BATTERY, OXYGEN, SHIELD and HEART at 4 bars or more. If a meter hits 0, the Safe-Mode
        Capsule keeps Rivo safe.
      </p>
      <div className="font-pixel text-[8px] text-muted mt-5 leading-relaxed">
        KEYS: 1-4 PICK A CARD · ENTER CONFIRM · ESC OR P PAUSE · ARROWS DRIVE THE ROVER
      </div>
    </Modal>
  );
}

export function SettingsToggles() {
  const { settings, setSettings } = useGame();
  return (
    <div className="flex flex-col gap-3">
      <PixelButton
        variant={settings.junior ? "success" : "ghost"}
        icon="starG"
        onClick={() => setSettings({ ...settings, junior: !settings.junior })}
        aria-pressed={settings.junior}
      >
        JUNIOR MODE: {settings.junior ? "ON" : "OFF"}
      </PixelButton>
      <PixelButton
        variant={settings.voice ? "success" : "ghost"}
        icon="speaker"
        onClick={() => setSettings({ ...settings, voice: !settings.voice })}
        aria-pressed={settings.voice}
      >
        READ ALOUD: {settings.voice ? "ON" : "OFF"}
      </PixelButton>
      {!speechAvailable() ? (
        <span className="text-[16px] text-muted">
          This browser cannot read aloud. The text stays on screen.
        </span>
      ) : null}
      {settings.junior ? (
        <span className="text-[16px] text-muted">
          Junior Mode: 20 seconds in the solar flare, and a big bouncing arrow on the lever.
        </span>
      ) : null}
    </div>
  );
}

export function Pause({ onClose }: { onClose: () => void }) {
  const { setOverlay, startNew, toTitle } = useGame();
  const [confirm, setConfirm] = useState<null | "restart" | "menu">(null);
  return (
    <Modal label="Paused" onClose={onClose} width={500}>
      {confirm ? (
        <>
          <div className="font-pixel text-[14px] text-orange mb-4">
            {confirm === "restart" ? "RESTART MISSION?" : "MAIN MENU?"}
          </div>
          <p className="text-[22px] mb-6">
            {confirm === "restart"
              ? "All progress will be erased and you start on Sol 1."
              : "Your progress is saved. You can continue from the main menu."}
          </p>
          <div className="flex gap-6 justify-end">
            <PixelButton variant="ghost" onClick={() => setConfirm(null)}>
              BACK
            </PixelButton>
            <PixelButton
              variant={confirm === "restart" ? "danger" : "orange"}
              onClick={confirm === "restart" ? startNew : toTitle}
              autoFocus
            >
              {confirm === "restart" ? "RESTART" : "MAIN MENU"}
            </PixelButton>
          </div>
        </>
      ) : (
        <>
          <div className="font-pixel text-[15px] text-orange mb-4 text-center">PAUSED</div>
          <div className="flex flex-col gap-3">
            <PixelButton icon="arrow" onClick={onClose} autoFocus>
              RESUME
            </PixelButton>
            <div className="grid grid-cols-2 gap-3">
              <PixelButton
                variant="cyan"
                icon="book"
                onClick={() => setOverlay({ kind: "logbook" })}
              >
                LOGBOOK
              </PixelButton>
              <PixelButton
                variant="cyan"
                icon="sticker"
                onClick={() => setOverlay({ kind: "stickers" })}
              >
                STICKERS
              </PixelButton>
            </div>
            <SettingsToggles />
            <div className="grid grid-cols-3 gap-3">
              <PixelButton
                variant="ghost"
                size="sm"
                icon="info"
                onClick={() => setOverlay({ kind: "howto" })}
              >
                HOW TO
              </PixelButton>
              <PixelButton variant="ghost" size="sm" icon="dome" onClick={() => setConfirm("menu")}>
                MENU
              </PixelButton>
              <PixelButton
                variant="danger"
                size="sm"
                icon="cross"
                onClick={() => setConfirm("restart")}
              >
                RESTART
              </PixelButton>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

const METER_INFO: Record<MeterId, string> = {
  power:
    "Power bars left after the base computer and every machine. A blinking -1 shows the base computer's constant load.",
  water: "1 bar is 30 liters. Rivo drinks and the pipes drip a little every day.",
  oxygen:
    "Rivo breathes all the time. The air-maker (MOXIE) makes new air when the heater keeps it hot.",
  radiation:
    "Mars has no magnetic shield, so invisible space rays wear down the shield unless you build one.",
  readiness: "Light gravity and being far from home make Rivo tired. Food and exercise help.",
};

export function MeterDetail({ id, onClose }: { id: MeterId; onClose: () => void }) {
  const { state } = useGame();
  const v = meterBars(state, id);
  const rate = perSol(state, id);
  return (
    <Modal label={`${METER_META[id].label} details`} onClose={onClose} width={660} variant="neil">
      <div className="flex items-center gap-4 mb-5">
        <Icon name={METER_META[id].icon} size="lg" />
        <div className="font-pixel text-[16px] text-cyan">{METER_META[id].label}</div>
      </div>
      <SegmentMeter value={v} cell={22} />
      <div className="flex flex-col gap-3 mt-6 font-pixel text-[10px] leading-relaxed">
        <div>
          NOW:{" "}
          <span className="text-orange">
            {id === "power"
              ? `${fmtBars(state.power)} BARS${state.power > 10 ? " (EXTRA IS RESERVE)" : ""}`
              : `${fmtBars(v)} OF 10 BARS`}
          </span>
        </div>
        <div>
          EVERY DAY:{" "}
          <span className={rate < 0 ? "text-danger" : rate > 0 ? "text-success" : "text-ink"}>
            {id === "power"
              ? "-1 FOR THE BASE COMPUTER (ALREADY COUNTED)"
              : kidRate(rate).toUpperCase()}
          </span>
        </div>
        <div>HELPED BY: {METER_META[id].station.toUpperCase()}</div>
        {id === "oxygen" ? <div>BASE TEMPERATURE: {habitatTemp(state).toUpperCase()}</div> : null}
        {id !== "water" ? (
          <div className="text-muted">COUNTS FOR THE ENDING: 4+ BARS IS GREEN</div>
        ) : (
          <div className="text-muted">WATER IS SHOWN BUT NOT COUNTED FOR THE ENDING</div>
        )}
      </div>
      <p className="text-[20px] mt-5">{METER_INFO[id]}</p>
      <div className="mt-4">
        <Tag color={LABEL_COLOR["GAME SIMULATION"]}>GAME SIMULATION</Tag>
      </div>
    </Modal>
  );
}

const cardTitle = (step: "m1" | "m2" | "m3" | "m4", id: string | null) =>
  id ? (STEPS[step].cards.find((c) => c.id === id)?.title ?? id.toUpperCase()) : null;

function stationStatus(s: GameState, id: BuildingId): [string, string][] {
  const yes = (b: boolean) => (b ? "YES" : "NO");
  // MD M1: dust grows 0.3% a sol (GAME SIMULATION), the Robot Sweep in Crisis 1 resets it.
  const dust = Math.max(0, (s.sol - (s.dustCleaned ? 13 : 1)) * DATA.dustPerSol * 100);
  switch (id) {
    case "solar":
      return [
        ["GRID", cardTitle("m1", s.grid) ?? "NOT BUILT YET"],
        ["POWER BARS", fmtBars(s.power)],
        ["DUST ON PANELS", s.grid ? `${dust.toFixed(1)}%` : "-"],
      ];
    case "water":
      return [
        ["MACHINE", cardTitle("m2", s.waterSystem) ?? "LANDER TANK"],
        ["WATER", `${fmtBars(s.waterL / RULES.litersPerBar)} BARS`],
        [
          "EVERY DAY",
          kidRate(
            (s.waterSystem
              ? RULES.waterRecovery[s.waterSystem] - RULES.waterLossPerSol
              : -RULES.waterLossPerSol) / RULES.litersPerBar,
          ).toUpperCase(),
        ],
      ];
    case "oxygen":
      return [
        ["HEATER & AIR-MAKER", yes(s.heatInstalled)],
        ["MODE", cardTitle("m3", s.heatMode) ?? "OFF"],
        ["TEMPERATURE", habitatTemp(s).toUpperCase()],
        ["PIPES WRAPPED", yes(s.pipesInsulated)],
      ];
    case "shelter":
      return [
        [
          "SHIELD",
          cardTitle("m4", s.shield === "hull" && s.stepIndex < 3 ? null : s.shield) ??
            "NOT BUILT YET",
        ],
        ["GYM", yes(s.fitnessUnit)],
      ];
    case "greenhouse":
      return [
        ["CROP", s.crop ? CROP_INFO[s.crop].name.toUpperCase() : "NONE"],
        ["HARVESTED", yes(s.cropMatured)],
        ["STATUS", s.greenhouseLocked ? "LOCKED" : "OPEN"],
      ];
    case "command":
      return [
        ["SOL", `${Math.min(30, s.sol)} / 30`],
        ["N.E.I.L.", s.neilOffline ? "OFFLINE" : "ONLINE"],
        ["ASK EARTH LEFT", `${s.askEarthLeft} / ${RULES.askEarthUses}`],
      ];
    case "airlock":
      return [
        ["ROVER", s.roverCharged ? `${s.roverMovePoints} MOVE POINTS` : "NOT CHARGED"],
        ["ROVER TRIP", "SOL 27"],
      ];
    case "landing":
      return [
        ["ARES-2", `${Math.max(0, 30 - s.sol)} SOLS AWAY`],
        ["BEACON", s.beaconActive ? "ACTIVE" : "WAITING"],
      ];
  }
}

export function StationPanel({ id, onClose }: { id: BuildingId; onClose: () => void }) {
  const { state, dispatch } = useGame();
  const b = BUILDINGS[id];
  const eq = STATION_EQUIPMENT[id];
  const step = currentStep(state);
  const missionHere = Object.values(STEPS).filter((st) => st.building === id);
  return (
    <Modal label={b.name} onClose={onClose} width={860}>
      <div className="font-pixel text-[14px] text-orange mb-1 leading-relaxed">{b.name}</div>
      <div className="font-pixel text-[8px] text-muted mb-5">
        {missionHere.length ? `USED IN: ${missionHere.map((m) => m.code).join(" · ")}` : "STATION"}
      </div>
      <div className="flex gap-6">
        <div className="flex-1">
          <ul className="flex flex-col gap-3 mb-5">
            {stationStatus(state, id).map(([k, v]) => (
              <li
                key={k}
                className="flex items-baseline gap-3 font-pixel text-[9px] leading-relaxed"
              >
                <span className="text-muted w-[190px] shrink-0">{k}</span>
                <span className="text-ink">{v}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="info" size="sm" />
            <span className="font-pixel text-[9px] text-cyan">LEARN</span>
            <Tag color={LABEL_COLOR[b.learnLabel]}>{b.learnLabel}</Tag>
          </div>
          <p className="text-[20px] leading-snug">{b.learn}</p>
        </div>
        {eq ? (
          <div className="w-[260px] grid grid-cols-2 gap-3 content-start">
            {eq.items.map((f) => (
              <div
                key={f}
                className="bg-[#0b111c] p-2 flex flex-col items-center gap-1"
                style={{ boxShadow: "inset 0 0 0 2px #24344a" }}
              >
                <div className="h-[80px] flex items-center">
                  <StationSprite sheet={eq.sheet} frame={f} scale={2} />
                </div>
                <span className="font-pixel text-[6px] text-muted text-center leading-relaxed">
                  {f.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {id === "command" && state.screen === "hub" ? (
        <div className="flex justify-end mt-6">
          <PixelButton
            icon="arrow"
            onClick={() => {
              onClose();
              dispatch({ type: "OPEN_BRIEFING" });
            }}
          >
            USE: START {step.code}
          </PixelButton>
        </div>
      ) : null}
    </Modal>
  );
}

export function AlertModal() {
  const { state, dispatch } = useGame();
  const msg = state.alerts[0];
  if (!msg) return null;
  const safe = msg.startsWith("SAFE-MODE");
  const pod = msg.includes("Escape Pod");
  return (
    <Modal label="Alert" width={660} variant={safe || pod ? "neil" : "alert"}>
      <div className="flex items-center gap-4 mb-5">
        <Icon name={safe || pod ? "bed" : "warn"} size="xl" className="anim-blink" />
        <div className={`font-pixel text-[14px] ${safe || pod ? "text-cyan" : "text-danger"}`}>
          {safe ? "SAFE-MODE CAPSULE" : pod ? "ESCAPE POD" : "BASE ALERT"}
        </div>
      </div>
      <p className="text-[24px] leading-snug mb-4">
        {safe ? msg.replace(/^SAFE-MODE: /, "") : msg}
      </p>
      {safe ? (
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-[19px] text-muted">
            Rivo sleeps in the capsule until this part ends. The meter restarts at 2 of 10, and the
            game goes on.
          </p>
          <div className="flex items-center gap-2">
            <Icon name="bed" size={24} />
            <span className="font-pixel text-[8px] text-warning">NEW STICKER: CAPSULE CAMPER</span>
          </div>
        </div>
      ) : null}
      <div className="flex justify-end">
        <PixelButton onClick={() => dispatch({ type: "DISMISS_ALERT" })} autoFocus>
          OK
        </PixelButton>
      </div>
    </Modal>
  );
}

/** Ask Earth (MD 0.8): 3 uses, the exact tip arrives after 5 seconds, never picks a card. */
export function HelperPanels() {
  const { state, helper, setHelper } = useGame();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (helper?.kind !== "earth") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [helper]);
  if (!helper) return null;
  if (helper.kind === "neil") {
    return (
      <div className="absolute right-3 top-[72px] z-[45] w-[360px]">
        <NeilDialog compact text={helper.text}>
          <div className="flex justify-end mt-2">
            <PixelButton size="sm" variant="ghost" onClick={() => setHelper(null)}>
              THANKS
            </PixelButton>
          </div>
        </NeilDialog>
      </div>
    );
  }
  const elapsed = (now - helper.startedAt) / 1000;
  const waiting = elapsed < RULES.askEarthDelaySec;
  const p = Math.min(1, elapsed / RULES.askEarthDelaySec);
  return (
    <div className="absolute right-3 top-[72px] z-[45] w-[380px]">
      <Frame variant="orange" className="p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="font-pixel text-[10px] text-orange">ASK EARTH · MISSION CONTROL</span>
          <span className="font-pixel text-[8px] text-muted">{state.askEarthLeft} USES LEFT</span>
        </div>
        <div
          className="relative h-[54px] bg-[#0b111c] mb-3"
          style={{ boxShadow: "inset 0 0 0 2px #24344a" }}
        >
          <span className="absolute left-2 top-1/2 -translate-y-1/2">
            <Icon name="earth" size={40} />
          </span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <Icon name="dome" size={40} />
          </span>
          <span
            className="absolute top-1/2 -translate-y-1/2 flex gap-1"
            style={{ left: `calc(56px + ${p} * (100% - 140px))` }}
          >
            <span className="block w-2 h-6 bg-success" />
            <span className="block w-2 h-4 bg-success mt-1" />
            <span className="block w-2 h-2 bg-success mt-2" />
          </span>
        </div>
        {waiting ? (
          <p className="text-[20px] leading-snug">
            The radio message is crossing space... {Math.ceil(RULES.askEarthDelaySec - elapsed)}s
            <span className="block text-[16px] text-muted">
              Real messages take 3 to 22 minutes. In the game the wait is 5 seconds.
            </span>
          </p>
        ) : (
          <>
            <p className="text-[21px] leading-snug">"{helper.tip}"</p>
            <p className="text-[16px] text-muted mt-1">
              Earth gives numbers. You still pick the card!
            </p>
          </>
        )}
        <div className="flex justify-end mt-2">
          <PixelButton size="sm" variant="ghost" onClick={() => setHelper(null)} disabled={waiting}>
            CLOSE
          </PixelButton>
        </div>
      </Frame>
    </div>
  );
}
