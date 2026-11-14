import type { ReactNode } from "react";
import { ASSETS } from "../../game/assets";
import { currentStep, currentStepId } from "../../game/engine";
import { RULES } from "../../game/rules";
import { fmtDelta, visibleMeters } from "../../game/selectors";
import { stickerById } from "../../game/content";
import type { GameState } from "../../game/types";
import { useGame } from "../GameProvider";
import { METER_META } from "../hud/Hud";
import { Icon } from "../components/Icon";
import {
  AnimSprite,
  Backdrop,
  Frame,
  NeilDialog,
  PixelButton,
  SegmentMeter,
  Sprite,
  StationSprite,
  Tag,
} from "../components/Pixel";
import { DustParticles, StepHeader } from "./Briefing";

function SceneArt({ s }: { s: GameState }) {
  const step = currentStepId(s);
  const c = s.lastChoice ?? "";
  const drone = <AnimSprite frames={ASSETS.droneFrames} h={72} fps={3} className="anim-bob" />;
  const wrap = (children: ReactNode, extra = "") => (
    <div className={`relative w-full h-full flex items-end justify-center gap-6 pb-6 ${extra}`}>
      {children}
    </div>
  );
  switch (step) {
    case "m1": {
      const n = { emergency: 1, basic: 2, medium: 3, giant: 4 }[s.grid ?? "emergency"];
      return wrap(
        <>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 anim-fly">{drone}</div>
          {Array.from({ length: n }).map((_, i) => (
            <span key={i} className="anim-pop" style={{ animationDelay: `${i * 0.35}s` }}>
              <StationSprite
                sheet="solar"
                frame={n === 1 ? "small_solar_panel" : "large_solar_panel"}
                scale={n > 2 ? 2 : 3}
              />
            </span>
          ))}
          <span className="anim-glow">
            <StationSprite
              sheet="solar"
              frame="large_energy_storage_battery"
              scale={n > 2 ? 2 : 3}
            />
          </span>
        </>,
      );
    }
    case "m2":
      return wrap(
        <>
          <StationSprite sheet="water" frame="primary_water_storage_tank" scale={4} />
          {c === "oven" || c === "full" ? (
            <StationSprite
              sheet="oxygen"
              frame="emergency_heating_module"
              scale={4}
              className="anim-glow"
            />
          ) : null}
          {c === "recycler" || c === "full" ? (
            <StationSprite
              sheet="water"
              frame="closed_loop_water_recycler"
              scale={4}
              className="anim-glow"
            />
          ) : null}
          <div className="absolute top-8 left-0 right-0 flex justify-center gap-10">
            {Array.from({ length: c === "tank" ? 0 : c === "oven" ? 2 : 5 }).map((_, i) => (
              <span key={i} className="anim-drop" style={{ animationDelay: `${i * 0.2}s` }}>
                <Icon name="drop" size="md" />
              </span>
            ))}
          </div>
          {c === "tank" ? (
            <span className="absolute top-8 anim-blink">
              <Icon name="noWater" size="xl" />
            </span>
          ) : null}
        </>,
      );
    case "m3":
      return wrap(
        <>
          <StationSprite
            sheet="oxygen"
            frame="space_heating_unit"
            scale={4}
            className={c === "low" ? "" : "anim-glow"}
          />
          <StationSprite
            sheet="oxygen"
            frame="main_oxygen_production_machine"
            scale={4}
            className={c === "low" ? "opacity-60" : "anim-glow"}
          />
          <StationSprite sheet="oxygen" frame="ventilation_fan" scale={3} />
          <div className="absolute top-8 left-0 right-0 flex justify-center gap-12">
            {Array.from({ length: c === "low" ? 1 : c === "balanced" ? 3 : 5 }).map((_, i) => (
              <span key={i} className="anim-rise" style={{ animationDelay: `${i * 0.25}s` }}>
                <Icon name="o2" size="md" />
              </span>
            ))}
          </div>
          {c === "low" || c === "core" ? (
            <div className="absolute inset-0 dither-cold pointer-events-none" />
          ) : null}
        </>,
      );
    case "m4":
      return wrap(
        <>
          <Icon
            name={
              c === "hull"
                ? "warn"
                : c === "soil"
                  ? "soil"
                  : c === "water"
                    ? "watershield"
                    : "fortress"
            }
            size={150}
            className="anim-pop"
          />
          {c === "soil" || c === "fortress" ? drone : null}
          {c === "water" || c === "fortress" ? (
            <StationSprite
              sheet="water"
              frame="secondary_water_storage_tank"
              scale={4}
              className="anim-glow"
            />
          ) : null}
        </>,
      );
    case "m5":
      return wrap(
        <>
          {s.crop
            ? Array.from({ length: 4 }).map((_, i) => (
                <span key={i} className="anim-pop" style={{ animationDelay: `${i * 0.25}s` }}>
                  <Icon
                    name={{ CR03: "lettuce", CR01: "potato", CR02: "tomato", CR04: "soy" }[s.crop!]}
                    size={70}
                  />
                </span>
              ))
            : null}
          {s.fitnessUnit ? <Icon name="gym" size={90} className="anim-bob" /> : null}
          {!s.crop && !s.fitnessUnit ? <Icon name="cross" size={90} /> : null}
          {s.crop ? (
            <div
              className="absolute top-0 left-0 right-0 h-3"
              style={{ background: "#8e5bd6", boxShadow: "0 4px 0 #000" }}
            />
          ) : null}
        </>,
      );
    case "c1":
      return wrap(
        <>
          <StationSprite
            sheet="solar"
            frame="connected_solar_panel_array"
            scale={3}
            className={c === "hibernate" ? "opacity-50" : ""}
          />
          {c === "clean" ? (
            <>
              <span className="anim-fly">{drone}</span>
              <StationSprite sheet="solar" frame="solar_panel_cleaning_brush" scale={3} />
            </>
          ) : null}
          {c === "hibernate" ? <Icon name="moon" size={80} /> : null}
          {c === "fullops" ? <Icon name="bolt" size={80} className="anim-blink" /> : null}
          {c !== "clean" ? <DustParticles /> : null}
        </>,
      );
    case "c2":
      return wrap(
        <>
          <StationSprite
            sheet="oxygen"
            frame="insulated_pipes"
            scale={5}
            className={c === "oxygen" ? "" : "anim-glow"}
          />
          <StationSprite
            sheet="oxygen"
            frame={c === "backup" ? "thermal_regulation_machine" : "anti_freeze_heating_cable"}
            scale={4}
            className="anim-glow"
          />
          {c === "oxygen" ? <Sprite src={ASSETS.revoFace2} h={160} className="anim-shake" /> : null}
          {c === "oxygen" ? (
            <div className="absolute inset-0 dither-cold pointer-events-none" />
          ) : null}
        </>,
      );
    case "c3":
      return wrap(
        <>
          <Icon
            name={c === "greenhouse" ? "plant" : c === "seal" ? "hatch" : "warn"}
            size={140}
            className="anim-pop"
          />
          {c === "seal" ? (
            <StationSprite
              sheet="water"
              frame="secondary_water_storage_tank"
              scale={4}
              className="anim-glow"
            />
          ) : null}
          {c === "hesitate" ? (
            <div className="absolute inset-0 dither-blackout anim-blink pointer-events-none" />
          ) : (
            <div className="absolute inset-0 dither-flare pointer-events-none" />
          )}
        </>,
      );
    case "c4":
      return wrap(
        <>
          <Icon
            name="fuse"
            size={140}
            className={s.lastOutcome === "bad" ? "anim-shake" : "anim-glow"}
          />
          {s.lastOutcome === "bad" ? (
            <span className="absolute top-10 anim-blink-fast">
              <Icon name="bolt" size={90} />
            </span>
          ) : (
            <Sprite src={ASSETS.drone} h={110} className="anim-pop" />
          )}
        </>,
      );
    case "c5":
      return wrap(
        <>
          {c === "recovery" ? <Icon name="gym" size={110} className="anim-bob" /> : null}
          {c === "airvalves" ? (
            <>
              <Icon name="plant" size={110} />
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="anim-rise" style={{ animationDelay: `${i * 0.3}s` }}>
                  <Icon name="o2" size="lg" />
                </span>
              ))}
            </>
          ) : null}
          {c === "rest" ? <Icon name="bed" size={130} /> : null}
          <Sprite src={ASSETS.revoFace} h={170} />
        </>,
      );
    default:
      return null;
  }
}

const OUTCOME = {
  good: { label: "SYSTEM SECURED", color: "#55d68b", frame: "success" as const },
  warn: { label: "CAUTION", color: "#f2c14e", frame: "warn" as const },
  bad: { label: "DANGER", color: "#f15b5b", frame: "alert" as const },
};

export function Result() {
  const { state, dispatch, setOverlay } = useGame();
  const step = currentStep(state);
  const rec = state.decisions[state.decisions.length - 1];
  const o = OUTCOME[state.lastOutcome ?? "good"];
  const feedback =
    state.lastOutcome === "good" ? step.feedbackGood : step.feedbackWarn || step.feedbackGood;
  const stickers = state.lastStickers.map((id) => stickerById(id)).filter(Boolean);
  const deltas = rec?.deltas ?? {};
  const shown = visibleMeters(state);
  const rows = (["power", "waterL", "oxygen", "radiation", "readiness"] as const).filter(
    (k) => deltas[k] && shown.includes(k === "waterL" ? "water" : k),
  );
  const metaKey = (k: (typeof rows)[number]) => (k === "waterL" ? "water" : k);
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop
        building={step.id === "m1" || step.id === "c1" ? "solar" : step.building}
        dim={0.55}
      />
      <div className="absolute left-6 top-14">
        <StepHeader place="RESULT" />
      </div>
      <Frame
        variant={o.frame}
        className="absolute left-6 top-[140px] w-[560px] h-[300px] overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#0b111c] scanlines" />
        <SceneArt s={state} />
        <div className="absolute left-3 top-3">
          <Tag color={o.color}>{o.label}</Tag>
        </div>
      </Frame>
      {stickers.length ? (
        <button
          type="button"
          onClick={() => setOverlay({ kind: "stickers" })}
          className="absolute left-[340px] top-[150px] z-10 flex flex-col items-end gap-2 anim-pop"
          aria-label="Open Sticker Album"
        >
          {stickers.map((st) => (
            <span
              key={st!.id}
              className="flex items-center gap-2 bg-panel px-3 py-2"
              style={{ boxShadow: "0 0 0 4px #f2c14e, 4px 8px 0 #000" }}
            >
              <Icon name={st!.icon} size={30} />
              <span className="font-pixel text-[8px] text-warning leading-relaxed">
                NEW STICKER
                <br />
                <span className="text-ink">{st!.name}</span>
              </span>
            </span>
          ))}
        </button>
      ) : null}
      <div className="absolute right-6 top-[140px] w-[630px] flex flex-col gap-5">
        <Frame className="p-5">
          <div className="font-pixel text-[12px] text-orange leading-relaxed mb-3">
            {rec?.choiceTitle}
          </div>
          <p className="text-[22px] leading-snug">{state.lastResultText}</p>
        </Frame>
        <Frame variant="inset" className="p-4">
          <div className="font-pixel text-[8px] text-muted mb-3">
            CHANGES{" "}
            {rec?.deltas.days
              ? `(INCLUDING ${rec.deltas.days} SOL${rec.deltas.days > 1 ? "S" : ""} OF DAILY USE)`
              : ""}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {rows.length ? (
              rows.map((k) => {
                const v = deltas[k] ?? 0;
                const m = metaKey(k);
                const now =
                  k === "waterL"
                    ? state.waterL / RULES.litersPerBar
                    : k === "power"
                      ? Math.min(10, state.power)
                      : state[k];
                return (
                  <div key={k} className="flex items-center gap-2">
                    <Icon name={METER_META[m].icon} size={20} />
                    <span
                      className={`font-pixel text-[9px] w-[70px] ${v < 0 ? "text-danger" : "text-success"}`}
                    >
                      {k === "waterL" ? fmtDelta(v / RULES.litersPerBar) : fmtDelta(v)}
                    </span>
                    <SegmentMeter value={now} cell={8} />
                  </div>
                );
              })
            ) : (
              <span className="text-[18px] text-muted">No meter changed.</span>
            )}
          </div>
        </Frame>
        <Frame variant="neil" className="p-4 flex items-start gap-3">
          <Icon name="radar" size={30} />
          <div>
            <div className="font-pixel text-[9px] text-cyan mb-1">DID YOU KNOW?</div>
            <p className="text-[19px] leading-snug">{step.didYouKnow}</p>
          </div>
        </Frame>
      </div>
      <div className="absolute left-6 right-6 bottom-6 flex items-end gap-6">
        <NeilDialog compact className="flex-1" text={feedback}>
          <button
            type="button"
            onClick={() => setOverlay({ kind: "logbook" })}
            className="mt-2 flex items-center gap-2 font-pixel text-[8px] text-warning anim-blink"
          >
            <Icon name="mail" size={20} /> NEW LOGBOOK ENTRY
          </button>
        </NeilDialog>
        <PixelButton size="lg" icon="bed" onClick={() => dispatch({ type: "SLEEP" })} autoFocus>
          GO TO SLEEP POD
        </PixelButton>
      </div>
    </div>
  );
}

export function Sleep() {
  const { state, dispatch } = useGame();
  const shownM = visibleMeters(state);
  const prefix: Record<string, string> = {
    WATER: "water",
    OXYGEN: "oxygen",
    RADIATION: "radiation",
    READINESS: "readiness",
  };
  const keep = (n: string) => {
    const p = prefix[n.split(" ")[0]];
    return !p || shownM.includes(p as never);
  };
  const rows = state.overnight.map((r) => ({ ...r, notes: r.notes.filter(keep) }));
  const from = rows.length ? rows[0].sol : state.sol;
  return (
    <div className="absolute inset-0 z-40 bg-black anim-fade-in flex flex-col items-center justify-center gap-6">
      <Icon name="moon" size={60} className="anim-bob" />
      <div className="font-pixel text-[20px] text-ink">
        {rows.length ? `SOL ${from} → SOL ${Math.min(30, state.sol)}` : `STILL SOL ${state.sol}`}
      </div>
      <div className="font-pixel text-[8px] text-muted">
        {rows.length
          ? "OVERNIGHT REPORT · DAILY USE OF WATER, AIR AND HEALTH"
          : "NO SOLS PASSED. THE CLOCK DID NOT MOVE."}
      </div>
      {rows.length ? (
        <Frame variant="inset" className="p-4 w-[880px] max-h-[380px] overflow-auto">
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.sol} className="flex gap-4 items-baseline">
                <span className="font-pixel text-[10px] text-orange w-[90px] shrink-0">
                  SOL {r.sol}
                </span>
                <span className="font-pixel text-[8px] leading-relaxed text-ink">
                  {r.notes.join(" · ") || "ALL SYSTEMS STEADY"}
                </span>
              </li>
            ))}
          </ul>
        </Frame>
      ) : null}
      <PixelButton size="lg" icon="sun" onClick={() => dispatch({ type: "WAKE" })} autoFocus>
        WAKE UP
      </PixelButton>
    </div>
  );
}
