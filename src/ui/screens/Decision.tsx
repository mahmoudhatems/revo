import { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "../../game/assets";
import { stickerById, type CardDef } from "../../game/content";
import {
  availability,
  cardDays,
  currentStep,
  currentStepId,
  FITNESS,
  fitnessAvailability,
  inPhase1,
  projectedWaterAtEnd,
  resolveCard,
  CROP_INFO,
} from "../../game/engine";
import { RULES } from "../../game/rules";
import { fmtBars, meterBars, preview, type MeterId } from "../../game/selectors";
import type { CropId, GameState } from "../../game/types";
import { useGame } from "../GameProvider";
import { METER_META } from "../hud/Hud";
import { Icon, PanelCount } from "../components/Icon";
import { MiniGameRunner, PREP_TASKS, miniFor } from "../components/MiniGames";
import {
  Backdrop,
  Frame,
  Modal,
  NeilDialog,
  PixelButton,
  SegmentMeter,
  StationSprite,
} from "../components/Pixel";
import { DustParticles, StepHeader } from "./Briefing";

const TONE: Record<string, string> = {
  cost: "text-danger",
  gain: "text-success",
  info: "text-ink",
  risk: "text-warning",
};
const EDGE = { safe: "success", balanced: "warn", risky: "alert" } as const;
const EDGE_LABEL = { safe: "SAFE-ISH", balanced: "BALANCED", risky: "RISKY" } as const;

function CardView({
  card,
  index,
  locked,
  reason,
  selected,
  onSelect,
  compact,
}: {
  card: CardDef;
  index: number;
  locked: boolean;
  reason?: string;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  const [details, setDetails] = useState(false);
  const panels = card.icon.startsWith("panel") ? Number(card.icon.slice(5)) : 0;
  const sticker = stickerById(card.sticker);
  return (
    <Frame
      variant={locked ? "locked" : EDGE[card.edge]}
      className={`relative flex-1 min-w-0 h-full p-3 flex flex-col ${selected ? "px-btn-selected" : ""} ${locked ? "opacity-70" : ""}`}
    >
      <button
        type="button"
        disabled={locked}
        onClick={onSelect}
        className="flex flex-col w-full min-h-0 flex-1 text-left disabled:cursor-not-allowed hover:brightness-110"
        aria-label={`${card.title}${locked ? `, locked: ${reason}` : ""}`}
        aria-pressed={selected}
      >
        <div className="flex items-start justify-between">
          <span className="font-pixel text-[10px] text-muted">{index + 1}</span>
          <span className="font-pixel text-[7px] text-muted">
            {locked ? "LOCKED" : EDGE_LABEL[card.edge]}
          </span>
        </div>
        <div className={`flex items-center justify-center ${compact ? "h-[38px]" : "h-[48px]"}`}>
          {panels ? (
            <PanelCount n={panels} size={panels > 2 ? 34 : 40} />
          ) : (
            <Icon name={card.icon} size={compact ? 36 : 44} />
          )}
        </div>
        <div className="font-pixel text-[9px] text-orange leading-relaxed mt-1">{card.title}</div>
        <ul className="flex flex-col mt-2 gap-1.5">
          {card.rows.map((r) => (
            <li key={r.text} className="flex items-center gap-2">
              <Icon name={r.icon} size={17} />
              <span className={`font-pixel text-[7px] leading-relaxed ${TONE[r.tone]}`}>
                {r.text}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-2 font-pixel text-[7px] text-cyan">TAP TO CHOOSE</div>
      </button>
      {!locked ? (
        <button
          type="button"
          onClick={() => setDetails((open) => !open)}
          className="mt-2 min-h-[36px] w-full bg-[#0b111c] px-2 font-pixel text-[7px] text-cyan hover:bg-surface"
          aria-expanded={details}
        >
          {details ? "HIDE DETAILS" : "GOOD + CAREFUL"}
        </button>
      ) : null}
      {details && !locked ? (
        <div
          className="absolute left-2 right-2 bottom-[48px] z-10 bg-space p-3 text-left"
          style={{ boxShadow: "0 0 0 3px #36d6e8, 3px 5px 0 #000" }}
        >
          <p className="text-[15px] leading-tight text-success">
            <span className="font-pixel text-[7px]">GOOD </span>
            {card.good}
          </p>
          <p className="mt-2 text-[15px] leading-tight text-warning">
            <span className="font-pixel text-[7px]">CAREFUL </span>
            {card.careful}
          </p>
          {sticker ? (
            <div className="mt-2 flex items-center gap-2">
              <Icon name="sticker" size={16} />
              <span className="font-pixel text-[6px] text-cyan">STICKER: {sticker.name}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {locked ? (
        <div className="absolute inset-0 px-hatch flex flex-col items-center justify-center gap-3 p-4 text-center pointer-events-none">
          <Icon name="lock" size="xl" />
          <span className="font-pixel text-[10px] text-warning">LOCKED</span>
          <span className="text-[18px] leading-snug bg-space px-2">{reason}</span>
        </div>
      ) : null}
    </Frame>
  );
}

const ORDER: MeterId[] = ["power", "water", "oxygen", "radiation", "readiness"];

export function DeltaPreview({
  s,
  after,
  days,
  showAll,
}: {
  s: GameState;
  after: GameState;
  days: number;
  showAll?: boolean;
}) {
  const rows = ORDER.filter(
    (m) =>
      showAll ||
      Math.abs(meterBars(after, m) - meterBars(s, m)) > 0.001 ||
      (m === "power" && after.power !== s.power),
  );
  return (
    <div className="flex flex-col gap-3">
      {days ? (
        <div className="flex items-center gap-3">
          <Icon name="clock" size="sm" />
          <span className="font-pixel text-[10px] w-[110px]">TIME</span>
          <span className="font-pixel text-[10px] text-danger">
            -{days} SOL{days > 1 ? "S" : ""}
          </span>
        </div>
      ) : null}
      {rows.map((m) => {
        const b = meterBars(s, m);
        const a = meterBars(after, m);
        const down = a < b || (m === "power" && after.power < s.power);
        return (
          <div key={m} className="flex items-center gap-3">
            <Icon name={METER_META[m].icon} size="sm" />
            <span className="font-pixel text-[10px] w-[110px]">{METER_META[m].label}</span>
            <SegmentMeter value={a} cell={10} />
            <span className={`font-pixel text-[9px] ${down ? "text-danger" : "text-success"}`}>
              {m === "power"
                ? `${fmtBars(s.power)} → ${fmtBars(after.power)}`
                : `${fmtBars(b)} → ${fmtBars(a)}`}
            </span>
          </div>
        );
      })}
      {!rows.length && !days ? (
        <span className="text-[20px] text-muted">No change right away.</span>
      ) : null}
    </div>
  );
}

function ConfirmChoice({
  card,
  fitness,
  onClose,
  onConfirm,
}: {
  card: string;
  fitness?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { state } = useGame();
  const step = currentStepId(state);
  const r = resolveCard(state, step, card, fitness);
  const p = preview(state, r.deltas);
  return (
    <Modal label={`Confirm ${r.title}`} onClose={onClose} width={640}>
      <div className="font-pixel text-[10px] text-muted mb-2">YOUR PICK</div>
      <div className="font-pixel text-[14px] text-orange mb-4 leading-relaxed">{r.title}</div>
      <DeltaPreview s={state} after={p.after} days={r.days} />
      {r.days ? (
        <p className="text-[17px] text-muted mt-3">
          Each sol also uses a little water, air and health.
        </p>
      ) : null}
      {p.triggersSafeMode ? (
        <Frame variant="alert" className="mt-4 p-3 flex items-center gap-3">
          <Icon name="warn" size="md" />
          <span className="text-[18px]">
            Careful! A meter will hit 0 and Rivo will need the Safe-Mode Capsule.
          </span>
        </Frame>
      ) : null}
      <div className="flex justify-end gap-4 mt-5">
        <PixelButton variant="ghost" onClick={onClose}>
          BACK
        </PixelButton>
        <PixelButton variant="success" icon="check" autoFocus onClick={onConfirm}>
          PICK THIS CARD
        </PixelButton>
      </div>
    </Modal>
  );
}

function Countdown({ paused, total }: { paused: boolean; total: number }) {
  const { dispatch } = useGame();
  const [left, setLeft] = useState<number>(total);
  const fired = useRef(false);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(id);
  }, [paused]);
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      dispatch({ type: "TIMEOUT" });
    }
  }, [left, dispatch]);
  return (
    <div
      className="flex items-center gap-4"
      role="timer"
      aria-live="polite"
      aria-label={`${left} seconds left`}
    >
      <Icon name="sun" size={36} className={left <= 4 ? "anim-blink-fast" : ""} />
      <span
        className={`font-pixel text-[14px] ${left <= 4 ? "text-danger anim-blink-fast" : "text-warning"}`}
      >
        {String(left).padStart(2, "0")}s
      </span>
      <SegmentMeter
        value={left}
        segments={total}
        cell={total > 12 ? 9 : 14}
        color={left <= 4 ? "#f15b5b" : "#f2c14e"}
      />
      {paused ? <span className="font-pixel text-[8px] text-muted">PAUSED</span> : null}
    </div>
  );
}

/** Mission 5 water forecast line (MD M2 kid helper): why the Greenhouse is open or locked. */
function WaterForecast({ crop }: { crop: string | null }) {
  const { state } = useGame();
  const cost = crop && crop !== "none" ? CROP_INFO[crop as CropId].waterL : 0;
  const now = projectedWaterAtEnd(state) / RULES.litersPerBar;
  const after = projectedWaterAtEnd(state, cost) / RULES.litersPerBar;
  const need = RULES.greenhouseMinWaterL / RULES.litersPerBar;
  return (
    <Frame variant={now >= need ? "neil" : "alert"} className="px-4 py-2 flex items-center gap-3">
      <Icon name="drop" size={26} />
      <div>
        <div className="font-pixel text-[8px] text-muted">
          WATER FORECAST AT SOL 30 (NEEDS {need})
        </div>
        <div className="flex items-center gap-3 mt-1">
          <SegmentMeter value={crop ? after : now} cell={8} />
          <span className="font-pixel text-[9px]">{fmtBars(crop ? after : now)} BARS</span>
        </div>
      </div>
    </Frame>
  );
}

type Pending = { card: string; fitness?: boolean; stage: "confirm" | "mini" };

export function Decision() {
  const { state, overlay, dispatch, settings } = useGame();
  const step = currentStep(state);
  const [pending, setPending] = useState<Pending | null>(null);
  const [crop, setCrop] = useState<string | null>(null);
  const [fit, setFit] = useState(false);
  const isM5 = step.id === "m5";
  const isC3 = step.id === "c3";

  const avail = useMemo(
    () => Object.fromEntries(step.cards.map((c) => [c.id, availability(state, step.id, c.id)])),
    [state, step],
  );

  const pick = (c: CardDef) => {
    if (avail[c.id].locked || pending) return;
    if (isM5) {
      setCrop((v) => (v === c.id ? null : c.id));
      if (c.id === "CR04") setFit(false);
      return;
    }
    setPending({ card: c.id, stage: isC3 ? "mini" : "confirm" });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (pending || overlay) return;
      const n = Number(e.key);
      if (n >= 1 && n <= step.cards.length) pick(step.cards[n - 1]);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const fitAv = fitnessAvailability(state, crop);
  const m5Days = (crop ? cardDays("m5", crop) : 0) + (fit && crop !== "CR04" ? FITNESS.days : 0);
  const background = step.id === "m1" || step.id === "c1" ? "solar" : step.building;
  const timerTotal = settings.junior ? RULES.flareCountdownJuniorSec : RULES.flareCountdownSec;

  const finish = () => {
    if (!pending) return;
    dispatch({ type: "CHOOSE", card: pending.card, fitness: pending.fitness });
  };

  return (
    <div className={`absolute left-0 right-0 bottom-0 top-[68px] ${isC3 ? "anim-shake" : ""}`}>
      <Backdrop
        building={background}
        overlay={step.overlay === "dark" ? undefined : step.overlay}
        dim={0.62}
      />
      {step.overlay === "dust" ? <DustParticles /> : null}
      <div
        className={`absolute left-4 right-4 top-4 flex items-start gap-4 ${isC3 ? "justify-start" : "justify-between"}`}
      >
        <StepHeader place={step.decisionPlace} />
        {/* MD 0.8: the timer keeps running during the Ask Earth delay; only the pause menu stops it. */}
        {isC3 ? <Countdown total={timerTotal} paused={overlay?.kind === "pause"} /> : null}
        {isM5 ? <WaterForecast crop={crop} /> : null}
        {inPhase1(state) ? (
          <Frame variant="orange" className="px-4 py-3 flex items-center gap-3">
            <Icon name="clock" size="md" />
            <div>
              <div className="font-pixel text-[14px] text-orange">{state.remainingSetupDays}</div>
              <div className="font-pixel text-[8px] text-muted">DAYS LEFT</div>
            </div>
          </Frame>
        ) : null}
      </div>
      <div className="absolute left-4 right-4 top-[94px]">
        <p className="font-pixel text-[10px] text-ink px-text-shadow leading-relaxed">
          {step.decisionPrompt.toUpperCase()}
        </p>
      </div>
      <div
        className={`absolute left-1/2 w-[1180px] -translate-x-1/2 flex gap-3 ${isM5 ? "top-[122px] bottom-[126px]" : "top-[122px] h-[250px]"}`}
      >
        {step.cards.map((c, i) => (
          <CardView
            key={c.id}
            card={c}
            index={i}
            locked={avail[c.id].locked}
            reason={avail[c.id].reason}
            selected={isM5 ? crop === c.id : pending?.card === c.id}
            onSelect={() => pick(c)}
            compact={isM5}
          />
        ))}
      </div>
      {isM5 ? (
        <div className="absolute left-4 right-4 bottom-4 h-[100px] flex gap-4 items-stretch">
          <Frame
            variant={
              fitAv.locked && crop !== "CR04"
                ? "locked"
                : fit || crop === "CR04"
                  ? "success"
                  : "neil"
            }
            className="flex-1 p-3 flex items-center gap-3"
          >
            <Icon name="gym" size="xl" />
            <div className="flex-1">
              <div className="font-pixel text-[10px] text-cyan leading-relaxed">
                BONUS: INSTALL GYM & SLEEPY LIGHT
              </div>
              <div className="font-pixel text-[8px] mt-2 leading-relaxed">
                <span className="text-danger">-1 DAY · -1 POWER</span>{" "}
                <span className="text-success">· +2 HEARTS · HALVES THE SOL 24 TIRED PENALTY</span>
              </div>
              {fitAv.locked && crop !== "CR04" ? (
                <div className="text-[16px] text-warning mt-1">{fitAv.reason}</div>
              ) : null}
            </div>
            <PixelButton
              variant={fit || crop === "CR04" ? "success" : "cyan"}
              disabled={fitAv.locked}
              onClick={() => setFit((v) => !v)}
              aria-pressed={fit || crop === "CR04"}
            >
              {crop === "CR04" ? "INCLUDED" : fit ? "ADDED" : "ADD"}
            </PixelButton>
          </Frame>
          <Frame variant="orange" className="w-[360px] p-3 flex flex-col justify-between gap-2">
            <div className="font-pixel text-[10px] leading-relaxed">
              PLAN:{" "}
              <span className="text-orange">
                {crop ? step.cards.find((c) => c.id === crop)?.title : "NO CROP"}
              </span>
              {fit && crop !== "CR04" ? <span className="text-success"> + GYM</span> : null}
              <div
                className={`mt-2 ${m5Days > state.remainingSetupDays ? "text-danger" : "text-muted"}`}
              >
                USES {m5Days} OF {state.remainingSetupDays} DAYS
              </div>
            </div>
            <PixelButton
              icon="check"
              onClick={() =>
                setPending({
                  card: crop ?? "none",
                  fitness: fit && crop !== "CR04",
                  stage: "confirm",
                })
              }
            >
              {crop || fit ? "CONFIRM PLAN" : "SKIP BUILDING"}
            </PixelButton>
          </Frame>
        </div>
      ) : null}
      {pending?.stage === "confirm" ? (
        <ConfirmChoice
          card={pending.card}
          fitness={pending.fitness}
          onClose={() => setPending(null)}
          onConfirm={() => {
            const steps = miniFor(step.id, pending.card, {
              fitness: pending.fitness,
              junior: settings.junior,
            });
            if (!steps.length)
              dispatch({ type: "CHOOSE", card: pending.card, fitness: pending.fitness });
            else setPending({ ...pending, stage: "mini" });
          }}
        />
      ) : null}
      {pending?.stage === "mini" ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.55)]">
          <MiniGameRunner
            title={step.cards.find((c) => c.id === pending.card)?.title ?? "TASK"}
            steps={miniFor(step.id, pending.card, {
              fitness: pending.fitness,
              junior: settings.junior,
            })}
            onDone={finish}
            autoStart={isC3}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Pre-decision task: Mission 3 install + Hold-to-Heat, Crisis 2 Thermal Coil Wrap. */
export function Install() {
  const { state, dispatch } = useGame();
  const step = currentStep(state);
  const isM3 = step.id === "m3";
  const [doing, setDoing] = useState(false);
  const tasks = PREP_TASKS[step.id] ?? [];
  const done = () => dispatch(isM3 ? { type: "INSTALL_HEATER" } : { type: "TASK_DONE" });
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="oxygen" overlay="cold" dim={0.6} />
      <div className="absolute left-6 top-14">
        <StepHeader place="LIFE SUPPORT ROOM" sub={isM3 ? "STEP A" : "PIPE CHECK"} />
      </div>
      <div className="absolute left-0 right-0 top-[170px] flex items-end justify-center gap-10">
        <StationSprite
          sheet="oxygen"
          frame={isM3 ? "space_heating_unit" : "anti_freeze_heating_cable"}
          scale={5}
          className="anim-glow"
        />
        <div className="flex flex-col items-center gap-2 pb-10">
          <StationSprite sheet="oxygen" frame="insulated_pipes" scale={5} />
          <span className="font-pixel text-[8px] text-cyan anim-blink">
            {isM3 ? "HEAT LINK" : "FROZEN JOINTS"}
          </span>
        </div>
        <StationSprite sheet="oxygen" frame="main_oxygen_production_machine" scale={5} />
      </div>
      <div className="absolute left-6 right-6 bottom-6 flex items-end gap-6">
        <NeilDialog
          className="flex-1"
          compact
          text={
            isM3
              ? "First the heater! The air-maker only works when it is super hot."
              : "Ice is on 3 pipe joints! Wrap them with heating coils first."
          }
        />
        <PixelButton size="lg" icon="flame" onClick={() => setDoing(true)} autoFocus>
          {isM3 ? "INSTALL HEATER & AIR-MAKER (-1 DAY)" : "WRAP THE PIPES"}
        </PixelButton>
      </div>
      <img
        src={ASSETS.revoFace2}
        alt=""
        className="absolute left-10 top-[180px] h-[200px] pixelated anim-shake"
      />
      {doing ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.55)]">
          <MiniGameRunner
            title={isM3 ? "HOLD TO HEAT" : "THERMAL COIL WRAP"}
            steps={tasks}
            onDone={done}
          />
        </div>
      ) : null}
    </div>
  );
}
