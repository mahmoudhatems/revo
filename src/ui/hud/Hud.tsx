import { useState } from "react";
import { askEarthEnabled, currentStep } from "../../game/engine";
import { RULES } from "../../game/rules";
import {
  fmtBars,
  habitatTemp,
  meterBars,
  perSol,
  phaseOf,
  unreadCount,
  visibleMeters,
  type MeterId,
} from "../../game/selectors";
import { useGame } from "../GameProvider";
import { Icon } from "../components/Icon";
import { SegmentMeter } from "../components/Pixel";

export const METER_META: Record<MeterId, { label: string; icon: string; station: string }> = {
  power: { label: "BATTERY", icon: "bolt", station: "Solar Power Station" },
  water: { label: "WATER", icon: "drop", station: "Water & Recycling" },
  oxygen: { label: "OXYGEN", icon: "o2", station: "Oxygen & Heating" },
  radiation: { label: "SHIELD", icon: "radiation", station: "Radiation Shelter" },
  readiness: { label: "HEART", icon: "heart", station: "Greenhouse & Crew Quarters" },
};

const HELPER_SCREENS = [
  "hub",
  "briefing",
  "decision",
  "install",
  "fuse",
  "result",
  "roverPrep",
  "roverLaunch",
  "roverGrid",
];

export function Hud() {
  const { state, setOverlay, setHelper, helper } = useGame();
  const step = currentStep(state);
  const meters = visibleMeters(state);
  const phase = phaseOf(state);
  const unread = unreadCount(state);
  const fatigue = step.id === "c5" && ["briefing", "decision"].includes(state.screen);
  const temp = habitatTemp(state);
  const sol = Math.min(state.sol, 30);
  const daysToAres = Math.max(0, RULES.totalSols - sol);
  const offline = state.neilOffline;
  const helpersOn = HELPER_SCREENS.includes(state.screen);
  const earthOk =
    askEarthEnabled(state) && helpersOn && !!step.earthTip && helper?.kind !== "earth";
  const earthLabel =
    offline || step.id === "c4"
      ? "NO SIGNAL"
      : state.askEarthLeft <= 0
        ? "NO USES"
        : `EARTH ${state.askEarthLeft}`;
  const [toolsOpen, setToolsOpen] = useState(false);
  return (
    <header
      className="absolute left-0 right-0 top-0 z-30 h-[60px] bg-panel flex items-stretch"
      style={{ boxShadow: "0 4px 0 0 #1c7f8c, 0 8px 0 0 #000" }}
    >
      <div
        className="flex flex-col justify-center px-3 min-w-[148px] bg-[#0d1522]"
        style={{ boxShadow: "inset -4px 0 0 0 #1c7f8c" }}
      >
        {phase === 1 ? (
          <>
            <div
              className={`font-pixel text-[11px] px-text-shadow ${state.remainingSetupDays <= 2 ? "text-danger" : "text-orange"}`}
            >
              {state.remainingSetupDays} DAYS LEFT
            </div>
            <div className="font-pixel text-[7px] text-muted mt-1">SOL {sol} · SETUP</div>
          </>
        ) : (
          <>
            <div className="font-pixel text-[11px] text-orange px-text-shadow">SOL {sol} / 30</div>
            <div className="font-pixel text-[7px] text-ink mt-1">{daysToAres} DAYS TO ARES-2</div>
          </>
        )}
      </div>
      <div className="flex-1 flex items-center px-1 min-w-0">
        {meters.map((m) => {
          const bars = meterBars(state, m);
          const rate = perSol(state, m);
          const reserve = m === "power" && state.power > 10 ? state.power - 10 : 0;
          const pulse =
            (m === "readiness" && fatigue) ||
            (m === "power" &&
              step.id === "c1" &&
              state.screen !== "result" &&
              state.screen !== "sleep");
          return (
            <button
              key={m}
              type="button"
              onClick={() => setOverlay({ kind: "meter", id: m })}
              className={`flex items-center gap-1 px-1 py-1 min-h-[44px] hover:bg-surface ${pulse ? "anim-blink" : ""}`}
              aria-label={`${METER_META[m].label}: ${fmtBars(bars)} of 10. Details`}
            >
              <Icon
                name={METER_META[m].icon}
                size={m === "oxygen" || m === "radiation" ? 21 : 19}
              />
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1">
                  <span className="font-pixel text-[7px] text-muted">{METER_META[m].label}</span>
                  <span className="font-pixel text-[7px] text-ink">{fmtBars(bars)}</span>
                  {m === "power" && state.grid ? (
                    <span className="font-pixel text-[7px] text-danger anim-blink">-1</span>
                  ) : null}
                  {m !== "power" && rate ? (
                    <Icon
                      name="arrowDown"
                      size={9}
                      className={`anim-blink ${rate > 0 ? "rotate-180" : ""}`}
                    />
                  ) : null}
                  {reserve ? (
                    <span className="font-pixel text-[7px] text-cyan">+{fmtBars(reserve)}</span>
                  ) : null}
                </div>
                <SegmentMeter value={bars} cell={5} />
              </div>
              {m === "oxygen" ? (
                <span
                  title={`Base temperature: ${temp}`}
                  className={temp === "cold" ? "anim-blink" : ""}
                >
                  <Icon
                    name={
                      temp === "cold"
                        ? "thermoCold"
                        : temp === "chilly"
                          ? "thermoChilly"
                          : "thermoWarm"
                    }
                    size={18}
                  />
                </span>
              ) : null}
            </button>
          );
        })}
        {state.screen === "roverGrid" ||
        state.screen === "roverLaunch" ||
        (state.screen === "roverPrep" && state.roverCharged) ? (
          <div className="flex items-center gap-1 px-1">
            <Icon name="rover" size={22} />
            <div className="flex flex-col gap-1">
              <span className="font-pixel text-[7px] text-muted">
                ROVER {state.roverMovePoints}
              </span>
              <SegmentMeter value={state.roverMovePoints} cell={5} color="#36d6e8" />
            </div>
          </div>
        ) : null}
      </div>
      <div className="relative flex items-center gap-1 pr-2">
        <HudButton
          icon={offline ? "neilAlert" : "neil"}
          label={offline ? "STATIC" : "NEIL"}
          disabled={offline || !helpersOn || !step.neilHint}
          onClick={() => setHelper({ kind: "neil", text: step.neilHint })}
          className={offline ? "anim-blink" : ""}
        />
        <HudButton icon="menu" label="TOOLS" onClick={() => setToolsOpen((open) => !open)} />
        <HudButton icon="pause" label="PAUSE" onClick={() => setOverlay({ kind: "pause" })} />
        {toolsOpen ? (
          <div
            className="absolute right-2 top-[68px] grid grid-cols-3 gap-1 bg-[#0d1522] p-2"
            style={{ boxShadow: "0 0 0 4px #1c7f8c, 4px 8px 0 #000" }}
          >
            <HudButton
              icon="book"
              label="LOGBOOK"
              onClick={() => {
                setToolsOpen(false);
                setOverlay({ kind: "logbook" });
              }}
              badge={unread}
            />
            <HudButton
              icon="sticker"
              label="STICKERS"
              onClick={() => {
                setToolsOpen(false);
                setOverlay({ kind: "stickers" });
              }}
              badge={state.stickers.length || undefined}
              badgeColor="#f2c14e"
            />
            <HudButton
              icon="antenna"
              label={earthLabel}
              disabled={!earthOk}
              onClick={() => {
                if (!earthOk || !step.earthTip) return;
                setToolsOpen(false);
                setHelper({ kind: "earth", startedAt: Date.now(), tip: step.earthTip });
              }}
              dispatchAsk
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function HudButton({
  icon,
  label,
  onClick,
  badge,
  badgeColor = "#f15b5b",
  disabled,
  className = "",
  dispatchAsk,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  badge?: number;
  badgeColor?: string;
  disabled?: boolean;
  className?: string;
  dispatchAsk?: boolean;
}) {
  const { dispatch } = useGame();
  return (
    <button
      type="button"
      onClick={() => {
        onClick();
        if (dispatchAsk && !disabled) dispatch({ type: "ASK_EARTH" });
      }}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-[52px] min-h-[48px] hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent ${className}`}
      aria-label={badge ? `${label}, ${badge}` : label}
    >
      <Icon name={icon} size={21} />
      <span className="font-pixel text-[6px] whitespace-nowrap">{label}</span>
      {badge ? (
        <span
          className="absolute -right-1 -top-1 font-pixel text-[8px] text-black px-1"
          style={{ background: badgeColor, boxShadow: "0 2px 0 #000" }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function CrisisBanner() {
  const { state } = useGame();
  const step = currentStep(state);
  if (!step.hazard || !["hub", "briefing", "decision", "fuse", "install"].includes(state.screen))
    return null;
  const color =
    step.id === "c4" || step.id === "c3" ? "#f15b5b" : step.id === "p3" ? "#55d68b" : "#f2c14e";
  const archived = ["c3", "c4", "p3"].includes(step.id);
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 top-[72px] z-20 flex items-center gap-2 px-3 py-1.5 bg-[#0d1522]"
      style={{ boxShadow: `0 0 0 4px ${color}, 4px 8px 0 0 #000` }}
    >
      <Icon
        name={
          step.id === "c1"
            ? "dust"
            : step.id === "c2"
              ? "snow"
              : step.id === "p3"
                ? "radar"
                : step.id === "c5"
                  ? "heart"
                  : "radiation"
        }
        size={24}
      />
      <div className="flex flex-col">
        <span className="font-pixel text-[10px] anim-blink" style={{ color }}>
          {step.id === "p3" ? "SUN RADAR: " : "ALERT: "}
          {step.hazard}
        </span>
        {archived ? (
          <span className="font-pixel text-[6px] text-muted mt-1">
            REVO MISSION EVENT · BASED ON ARCHIVED NASA DONKI DATA
          </span>
        ) : null}
      </div>
    </div>
  );
}
