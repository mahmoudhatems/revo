import { useEffect, useState } from "react";
import { ASSETS } from "../../game/assets";
import { DATA } from "../../game/data";
import { ending, lowMeterCauses, METER_NAMES } from "../../game/engine";
import { RULES } from "../../game/rules";
import { fmtBars } from "../../game/selectors";
import {
  GRID_SIZE,
  TERRAIN_COST,
  TERRAIN_VERIFIED,
  cheapestPath,
  isAdjacent,
  terrainAt,
  type Terrain,
} from "../../game/terrain";
import type { EndingTier } from "../../game/types";
import { Credits } from "../components/Credits";
import { STEPS, STICKERS } from "../../game/content";
import { useGame } from "../GameProvider";
import { Icon } from "../components/Icon";
import { MiniGameRunner } from "../components/MiniGames";
import {
  AnimSprite,
  Backdrop,
  Frame,
  Modal,
  NeilDialog,
  PixelButton,
  SegmentMeter,
  Sprite,
  Tag,
} from "../components/Pixel";
import { StepHeader } from "./Briefing";
import { MeterBoard, OUTCOME_COLOR } from "./Summary";

export function RoverPrep() {
  const { state, dispatch } = useGame();
  const charged = state.roverCharged;
  const [charging, setCharging] = useState(false);
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="command" dim={0.55} />
      <div className="absolute left-6 top-14">
        <StepHeader place="SOL 27 · COMMAND DOME" />
      </div>
      <div className="absolute left-0 right-0 top-[150px] flex items-end justify-center gap-16">
        <Sprite
          src={charged && state.peakFitness ? ASSETS.revoHelmet : ASSETS.revoHelmetWalk[0]}
          h={220}
          className={charged && !state.peakFitness ? "anim-shake" : ""}
        />
        <div className="flex flex-col items-center gap-4">
          <Icon name="rover" size={120} className={`mb-2 ${charged ? "anim-glow" : ""}`} />
          <SegmentMeter value={state.roverMovePoints} cell={18} color="#36d6e8" />
          <span className="font-pixel text-[10px] text-cyan">
            {state.roverMovePoints} / 10 MOVE POINTS
          </span>
        </div>
        <Icon name="beacon" size={90} className="anim-blink" />
      </div>
      <div className="absolute left-6 right-6 bottom-6 flex items-end gap-6">
        <NeilDialog
          compact
          className="flex-1"
          text={
            !charged
              ? "Hold the charge button until the Rover bar turns green. Then we check your fitness!"
              : state.peakFitness
                ? "Fitness check: peak fitness! You carried the Beacon with no strain, so you have all 10 Move Points."
                : "Fitness check: Rivo is tired and struggled with the Beacon. That cost 1 power and 1 air, and you start with 9 Move Points."
          }
        />
        {!charged ? (
          <PixelButton size="lg" icon="bolt" onClick={() => setCharging(true)} autoFocus>
            CHARGE ROVER (-2 POWER)
          </PixelButton>
        ) : (
          <PixelButton
            size="lg"
            icon="radar"
            onClick={() => dispatch({ type: "ROVER_TO_LAUNCH" })}
            autoFocus
          >
            CHECK THE SUN RADAR
          </PixelButton>
        )}
      </div>
      {charging && !charged ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.55)]">
          <MiniGameRunner
            title="CHARGE ROVER"
            autoStart
            steps={[
              {
                kind: "hold",
                button: "CHARGE (-2 POWER)",
                label: "HOLD the charge button until the Rover bar turns green.",
              },
            ]}
            onDone={() => {
              setCharging(false);
              dispatch({ type: "ROVER_CHARGE" });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function RoverLaunch() {
  const { dispatch } = useGame();
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="airlock" dim={0.6} />
      <div className="absolute left-6 top-14">
        <StepHeader place="LOWER AIRLOCK · LAUNCH WINDOW" />
      </div>
      <div className="absolute left-6 right-6 top-[150px] flex gap-8 h-[300px]">
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => dispatch({ type: "ROVER_LAUNCH", timing: "morning" })}
          autoFocus
        >
          <Frame variant="success" className="h-full p-6 flex flex-col gap-4 hover:brightness-110">
            <div className="flex items-center gap-4">
              <Icon name="sun" size="xl" />
              <div className="font-pixel text-[14px] text-success leading-relaxed">
                MORNING QUIET WINDOW
              </div>
            </div>
            <Tag color="#55d68b">
              ARCHIVED NASA DONKI: {DATA.rover.windowClass} · DANGER {DATA.rover.windowHazard}
            </Tag>
            <p className="text-[22px]">The Sun is calm. Go now!</p>
            <div className="flex items-center gap-2 font-pixel text-[10px] text-success">
              <Icon name="radiation" size="sm" /> +1 SHIELD BONUS
            </div>
            <div className="flex items-center gap-2 font-pixel text-[8px] text-cyan">
              <Icon name="sticker" size={18} /> STICKER: EARLY BIRD ASTRONAUT
            </div>
          </Frame>
        </button>
        <button
          type="button"
          className="flex-1 text-left"
          onClick={() => dispatch({ type: "ROVER_LAUNCH", timing: "delay" })}
        >
          <Frame variant="warn" className="h-full p-6 flex flex-col gap-4 hover:brightness-110">
            <div className="flex items-center gap-4">
              <Icon name="clock" size="xl" />
              <div className="font-pixel text-[14px] text-warning leading-relaxed">
                DELAYED AFTERNOON LAUNCH
              </div>
            </div>
            <Tag color="#f2c14e">LONGER TIME OUTSIDE</Tag>
            <p className="text-[22px]">Wait a little longer in the spacesuit.</p>
            <div className="flex items-center gap-2 font-pixel text-[10px] text-danger">
              <Icon name="o2" size="sm" /> -1 EXTRA AIR
            </div>
            <div className="flex items-center gap-2 font-pixel text-[8px] text-cyan">
              <Icon name="sticker" size={18} /> STICKER: NIGHT OWL DRIVER
            </div>
          </Frame>
        </button>
      </div>
      <div className="absolute left-6 right-6 bottom-6">
        <NeilDialog compact text="Rivo puts on the spacesuit helmet. When should we drive out?" />
      </div>
    </div>
  );
}

const TILE: Record<Terrain, { img: string; label: string; overlay?: string }> = {
  flat: { img: ASSETS.tiles.flat, label: "FLAT PLAINS" },
  base: { img: ASSETS.tiles.flat2, label: "BASE" },
  goal: { img: ASSETS.tiles.flat2, label: "LANDING ZONE" },
  ice: { img: ASSETS.tiles.ice, label: "ICE PATCH" },
  crater: { img: ASSETS.tiles.crater, label: "IMPACT CRATER" },
  mountain: { img: ASSETS.tiles.rocks, label: "STEEP MOUNTAIN", overlay: ASSETS.tiles.mountain },
};

const CELL = 100;

export function RoverGrid() {
  const { state, dispatch, overlay } = useGame();
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [scout, setScout] = useState<Set<string> | null>(null);
  const pos = state.roverPos;
  const visited = new Set(state.roverPath.map(([x, y]) => `${x},${y}`));
  const move = (x: number, y: number) => dispatch({ type: "ROVER_MOVE", x, y });

  useEffect(() => {
    if (!scout) return;
    const t = window.setTimeout(() => setScout(null), RULES.scoutRevealMs);
    return () => window.clearTimeout(t);
  }, [scout]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (overlay) return;
      const d: Record<string, [number, number]> = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowDown: [0, 1],
        ArrowUp: [0, -1],
      };
      const v = d[e.key];
      if (!v) return;
      e.preventDefault();
      const nx = pos[0] + v[0];
      const ny = pos[1] + v[1];
      if (nx >= 0 && ny >= 0 && nx < GRID_SIZE && ny < GRID_SIZE) move(nx, ny);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const useScout = () => {
    if (state.scoutUsed) return;
    const p = cheapestPath(pos);
    setScout(new Set(p.path.map(([x, y]) => `${x},${y}`)));
    dispatch({ type: "USE_SCOUT" });
  };

  const ht = hover ? terrainAt(hover[0], hover[1]) : null;
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop dim={0.7} />
      <div className="absolute left-6 top-6">
        <StepHeader place="SOL 28-29 · JEZERO CRATER MAP" />
      </div>
      <Frame
        variant="orange"
        className="absolute left-6 top-[92px] p-3"
        style={{ width: CELL * 5 + 24 }}
      >
        <div className="grid grid-cols-5" style={{ gap: 2 }}>
          {Array.from({ length: 25 }).map((_, i) => {
            const x = i % 5;
            const y = Math.floor(i / 5);
            const t = terrainAt(x, y);
            const here = pos[0] === x && pos[1] === y;
            const adj = isAdjacent(pos, [x, y]);
            const cost = TERRAIN_COST[t];
            const can = adj && cost <= state.roverMovePoints;
            const lit = scout?.has(`${x},${y}`);
            return (
              <button
                key={i}
                type="button"
                disabled={!can}
                onClick={() => move(x, y)}
                onMouseEnter={() => setHover([x, y])}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover([x, y])}
                className="relative overflow-hidden disabled:cursor-default"
                style={{ width: CELL - 2, height: CELL - 2 }}
                aria-label={`${TILE[t].label} at column ${x + 1}, row ${y + 1}, cost ${cost}${can ? "" : adj ? ", not enough points" : ""}`}
              >
                <img
                  src={TILE[t].img}
                  alt=""
                  className="absolute inset-0 w-full h-full pixelated"
                  draggable={false}
                />
                {TILE[t].overlay ? (
                  <img
                    src={TILE[t].overlay}
                    alt=""
                    className="absolute inset-[6px] w-[calc(100%-12px)] h-[calc(100%-12px)] object-contain pixelated"
                    draggable={false}
                  />
                ) : null}
                {visited.has(`${x},${y}`) && !here ? (
                  <span className="absolute inset-0 bg-[rgba(54,214,232,0.25)]" />
                ) : null}
                {lit ? (
                  <span
                    className="absolute inset-0 anim-blink"
                    style={{
                      background: "rgba(85,214,139,0.45)",
                      boxShadow: "inset 0 0 0 6px #55d68b",
                    }}
                  />
                ) : null}
                {t === "goal" ? (
                  <span
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ boxShadow: "inset 0 0 0 6px #55d68b" }}
                  >
                    <Icon name="flag" size={48} />
                  </span>
                ) : null}
                {t === "base" && !here ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Icon name="dome" size={48} />
                  </span>
                ) : null}
                {can ? (
                  <span
                    className="absolute inset-0 anim-blink"
                    style={{ boxShadow: "inset 0 0 0 4px #f2c14e" }}
                  />
                ) : null}
                {adj && !can ? (
                  <span
                    className="absolute inset-0"
                    style={{ boxShadow: "inset 0 0 0 4px #f15b5b" }}
                  />
                ) : null}
                {here ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Icon name="rover" size={64} className="anim-bob" />
                  </span>
                ) : null}
                <span className="absolute right-1 bottom-1 font-pixel text-[8px] bg-black text-ink px-1">
                  -{cost}
                </span>
              </button>
            );
          })}
        </div>
      </Frame>
      <div className="absolute right-6 top-[92px] w-[620px] flex flex-col gap-4">
        <Frame className="p-4">
          <div className="flex items-center gap-4">
            <Icon name="rover" size="lg" />
            <div className="flex-1">
              <div className="font-pixel text-[10px] text-cyan mb-2">
                ROVER BATTERY: {state.roverMovePoints} MOVE POINTS
              </div>
              <SegmentMeter value={state.roverMovePoints} cell={18} color="#36d6e8" />
            </div>
            <PixelButton
              variant="cyan"
              size="sm"
              icon="drone"
              disabled={state.scoutUsed}
              onClick={useScout}
              aria-label="Robot Scout: show the cheapest path for 3 seconds"
            >
              {state.scoutUsed ? (scout ? "SCOUTING..." : "SCOUT USED") : "ROBOT SCOUT (1)"}
            </PixelButton>
          </div>
          <div className="font-pixel text-[8px] text-muted mt-3 leading-relaxed">
            MOVES: {state.roverPath.length - 1} · SHORTEST TRIP IS {RULES.shortestMoves} TILES ·
            LONGER TRIPS COST -2 AIR
          </div>
        </Frame>
        <Frame variant="inset" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-pixel text-[8px] text-muted">TILES</span>
            {!TERRAIN_VERIFIED ? (
              <Tag color="#f2c14e">PRACTICE MAP · NOT YET CHECKED AGAINST NASA MARS TREK</Tag>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["flat", "ice", "crater", "mountain"] as Terrain[]).map((t) => (
              <div key={t} className={`flex items-center gap-3 ${ht === t ? "bg-surface" : ""}`}>
                <span
                  className="relative block w-[40px] h-[40px] shrink-0 overflow-hidden"
                  style={{ boxShadow: "0 0 0 2px #000" }}
                >
                  <img
                    src={TILE[t].img}
                    alt=""
                    className="absolute inset-0 w-full h-full pixelated"
                  />
                  {TILE[t].overlay ? (
                    <img
                      src={TILE[t].overlay}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain pixelated"
                    />
                  ) : null}
                </span>
                <span className="font-pixel text-[8px] leading-relaxed">
                  {TILE[t].label}
                  <br />
                  <span
                    className={
                      TERRAIN_COST[t] >= 5
                        ? "text-danger"
                        : TERRAIN_COST[t] > 1
                          ? "text-warning"
                          : "text-success"
                    }
                  >
                    -{TERRAIN_COST[t]} POINTS
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Frame>
        <NeilDialog
          compact
          text="Mountains eat lots of Rover power, but flat roads take longer and use more air. Choose your path wisely!"
        />
      </div>
    </div>
  );
}

export function Finale() {
  const { state, dispatch } = useGame();
  const [stage, setStage] = useState(state.beaconActive ? 3 : 0);
  useEffect(() => {
    if (stage === 1) {
      const t = window.setTimeout(() => setStage(2), 2200);
      return () => window.clearTimeout(t);
    }
    if (stage === 2) {
      const t = window.setTimeout(() => setStage(3), 2800);
      return () => window.clearTimeout(t);
    }
  }, [stage]);
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="landing" dim={0.45} />
      {stage >= 3 ? (
        <div className="absolute inset-0 dither-dust anim-fade-in" style={{ opacity: 0.6 }} />
      ) : null}
      <div className="absolute left-6 top-6">
        <StepHeader place="SOL 30 · LANDING ZONE" />
      </div>
      <div className="absolute left-0 right-0 top-[120px] h-[300px] flex items-end justify-center gap-24">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {stage >= 1
              ? [0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/2 -ml-[60px] -mt-[60px] w-[120px] h-[120px] anim-wave"
                    style={{ boxShadow: "0 0 0 6px #55d68b", animationDelay: `${i * 0.4}s` }}
                  />
                ))
              : null}
            <Icon name="beacon" size={110} />
          </div>
          <span className="font-pixel text-[8px]">
            {stage >= 1 ? "BEACON ACTIVE" : "LANDING BEACON"}
          </span>
        </div>
        <AnimSprite frames={ASSETS.revoHelmetWalk} h={180} fps={4} />
        <div className="flex flex-col items-center gap-3">
          {stage >= 3 ? (
            <Icon name="rocket" size={150} className="anim-land" />
          ) : (
            <Icon name="earth" size={110} className={stage >= 1 ? "anim-glow" : ""} />
          )}
          <span className="font-pixel text-[8px]">
            {stage >= 3 ? "ARES-2 TOUCHDOWN" : "EARTH MISSION CONTROL"}
          </span>
        </div>
      </div>
      <div className="absolute left-6 right-6 bottom-6 flex items-end gap-6">
        <div className="flex-1">
          {stage === 0 ? (
            <NeilDialog
              compact
              text={
                state.roverTowed
                  ? "The Robot towed the Rover to the Landing Zone. Plant the Beacon and press the big red button!"
                  : "You made it to the green Landing Zone! Plant the Beacon and press the big red button!"
              }
            />
          ) : stage === 1 ? (
            <NeilDialog
              compact
              label="SIGNAL"
              text="Green radio waves pulse from Mars to Earth..."
            />
          ) : (
            <NeilDialog
              compact
              label="EARTH"
              glossary={false}
              text="Beacon signal locked from Commander Rivo! The landing path is clear. Ares-2 is starting its descent!"
            />
          )}
        </div>
        {stage === 0 ? (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "ACTIVATE_BEACON" });
              setStage(1);
            }}
            className="px-btn px-btn-danger flex items-center gap-4 px-8 py-6 text-[16px]"
            autoFocus
          >
            <Icon name="redButton" size="lg" />
            ACTIVATE LANDING BEACON
          </button>
        ) : stage >= 3 ? (
          <PixelButton
            size="lg"
            icon="starG"
            onClick={() => dispatch({ type: "SHOW_ENDING" })}
            autoFocus
          >
            SEE YOUR ENDING
          </PixelButton>
        ) : null}
      </div>
    </div>
  );
}

const ENDINGS: Record<
  EndingTier,
  { title: string; color: string; icon: string; text: string; frame: "success" | "warn" | "neil" }
> = {
  legendary: {
    title: "LEGENDARY COMMANDER",
    color: "#55d68b",
    icon: "badgeStars",
    frame: "success",
    text: "Fireworks! All four meters are green and you never needed the capsule. You earned the Mars Hero Medal, and the base is 100% ready for the Ares-2 crew!",
  },
  cautious: {
    title: "CAUTIOUS TOUCHDOWN",
    color: "#f2c14e",
    icon: "badgeStar",
    frame: "warn",
    text: "Ares-2 lands safely, and the crew helps top up what was low. Great teamwork!",
  },
  emergency: {
    title: "EMERGENCY SAFE-MODE CAPSULE",
    color: "#36d6e8",
    icon: "shield",
    frame: "neil",
    text: "The base protected Rivo in the Escape Pod until Ares-2 arrived. Rivo is safe!",
  },
};

export function Ending() {
  const { state, dispatch, startNew } = useGame();
  const [credits, setCredits] = useState(false);
  const tier = ending(state);
  const e = ENDINGS[tier];
  const lows = lowMeterCauses(state);
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="landing" dim={0.6} />
      <div className="absolute inset-0 flex flex-col items-center pt-6 gap-5">
        <Icon name={e.icon} size={tier === "legendary" ? 130 : 100} className="anim-pop" />
        <div
          className="font-pixel text-[28px] px-text-shadow text-center"
          style={{ color: e.color }}
        >
          {e.title}
        </div>
        <Frame variant={e.frame} className="w-[1020px] p-6 flex gap-8">
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-[23px] leading-snug">{e.text}</p>
            {tier === "cautious" && state.safeModeTriggered && !lows.length ? (
              <p className="text-[21px] text-warning">
                You needed the capsule once. Try a different choice next time!
              </p>
            ) : null}
            {tier === "cautious"
              ? lows.map((l) => (
                  <p key={l.meter} className="text-[19px] text-warning">
                    {l.name} was low ({fmtBars(l.value)} bars). Biggest cost: {l.cause}.
                  </p>
                ))
              : null}
            {tier === "cautious" && state.safeModeTriggered && lows.length ? (
              <p className="text-[19px] text-warning">You also needed the capsule once.</p>
            ) : null}
            {tier === "emergency" && state.finalZero ? (
              <p className="text-[21px] text-cyan">
                {METER_NAMES[state.finalZero.meter]} hit 0 on Sol {state.finalZero.sol} (
                {state.finalZero.cause}).
              </p>
            ) : null}
          </div>
          <MeterBoard s={state} meters={["power", "oxygen", "radiation", "readiness"]} />
        </Frame>
        <div className="flex gap-6">
          {tier === "emergency" ? (
            <PixelButton size="lg" variant="cyan" icon="rocket" onClick={startNew}>
              TRY AGAIN
            </PixelButton>
          ) : null}
          <PixelButton
            size="lg"
            icon="doc"
            onClick={() => dispatch({ type: "SHOW_REPORT" })}
          >
            STICKER & SCIENCE PASSPORT
          </PixelButton>
          <PixelButton size="lg" variant="ghost" icon="starG" onClick={() => setCredits(true)} autoFocus>
            THE END · CREDITS
          </PixelButton>
        </div>
      </div>
      <div className="absolute right-16 bottom-8">
        <AnimSprite frames={ASSETS.revoWalk} h={150} fps={4} />
      </div>
      {credits ? <Credits onClose={() => setCredits(false)} /> : null}
    </div>
  );
}

const DATASETS = ["Mars Trek", "MEDA", "DONKI", "RadLab", "OSDR", "CSA food data"];

export function Report() {
  const { state, startNew } = useGame();
  const [confirm, setConfirm] = useState(false);
  const earned = STICKERS.filter((s) => state.stickers.includes(s.id));
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="command" dim={0.75} />
      <div className="absolute left-6 top-5 flex items-center gap-4">
        <Icon name="doc" size={44} />
        <div>
          <div className="font-pixel text-[16px] text-orange px-text-shadow">
            STICKER & SCIENCE PASSPORT
          </div>
          <div className="font-pixel text-[8px] text-muted mt-2">EVERY DECISION ACROSS 30 SOLS</div>
        </div>
      </div>
      <Frame className="absolute left-6 top-[80px] w-[740px] bottom-[150px] p-4 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="font-pixel text-[8px] text-muted text-left">
              <th className="pb-2 w-[110px]">STEP</th>
              <th className="pb-2">YOUR CHOICE</th>
              <th className="pb-2">SCIENCE</th>
            </tr>
          </thead>
          <tbody>
            {state.decisions.map((d) => (
              <tr key={d.step} className="align-top">
                <td className="py-1 font-pixel text-[8px]">
                  <span
                    className="inline-block w-3 h-3 mr-2"
                    style={{ background: OUTCOME_COLOR[d.outcome] }}
                  />
                  {STEPS[d.step].code}
                </td>
                <td className="py-1 font-pixel text-[8px] text-orange leading-relaxed">
                  {d.choiceTitle}
                </td>
                <td className="py-1 text-[16px] leading-tight">{STEPS[d.step].dataset}</td>
              </tr>
            ))}
            <tr className="align-top">
              <td className="py-1 font-pixel text-[8px]">
                <span
                  className="inline-block w-3 h-3 mr-2"
                  style={{ background: state.roverTowed ? "#f15b5b" : "#55d68b" }}
                />
                PHASE 3
              </td>
              <td className="py-1 font-pixel text-[8px] text-orange leading-relaxed">
                {state.roverTowed ? "ROVER TOWED" : `TRIP IN ${state.roverPath.length - 1} TILES`} ·{" "}
                {state.launchTiming === "morning" ? "MORNING WINDOW" : "AFTERNOON LAUNCH"}
              </td>
              <td className="py-1 text-[16px] leading-tight">{STEPS.p3.dataset}</td>
            </tr>
          </tbody>
        </table>
      </Frame>
      <Frame
        variant="orange"
        className="absolute right-6 top-[80px] w-[470px] bottom-[150px] p-4 overflow-auto"
      >
        <div className="font-pixel text-[9px] text-warning mb-3">
          STICKERS: {earned.length} / {STICKERS.length}
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {earned.map((s) => (
            <div
              key={s.id}
              className="flex flex-col items-center gap-1 p-1 bg-[#0b111c]"
              title={s.look}
            >
              <Icon name={s.icon} size={32} />
              <span className="font-pixel text-[6px] text-center leading-relaxed">{s.name}</span>
            </div>
          ))}
        </div>
        <div className="font-pixel text-[9px] text-cyan mb-2">DATA BADGES</div>
        <div className="flex flex-wrap gap-2">
          {DATASETS.map((d) => (
            <span
              key={d}
              className="flex flex-col bg-[#0b111c] px-2 py-1"
              style={{ boxShadow: "0 0 0 2px #1c7f8c" }}
            >
              <span className="font-pixel text-[8px]">{d}</span>
              <span className="font-pixel text-[6px] text-cyan mt-1">
                {d.startsWith("CSA") ? "ARCHIVED CSA DATA" : "ARCHIVED NASA DATA"}
              </span>
            </span>
          ))}
        </div>
        <p className="text-[14px] text-muted mt-3 leading-tight">
          Saved (archived) records, not live data. Game numbers are a training simulation, and the
          rover map is a practice map.
        </p>
      </Frame>
      <div className="absolute left-6 right-6 bottom-6 flex items-end gap-6">
        <NeilDialog
          compact
          className="flex-1"
          typewriter={false}
          glossary={false}
          text="Every mission used real saved NASA and CSA records. You are a true Mars Commander!"
        />
        <PixelButton size="lg" icon="rocket" onClick={() => setConfirm(true)}>
          TRY AGAIN
        </PixelButton>
      </div>
      {confirm ? (
        <Modal label="Play again" onClose={() => setConfirm(false)} width={520}>
          <div className="font-pixel text-[14px] text-orange mb-4">NEW MISSION?</div>
          <p className="text-[22px] mb-6">Start again from Sol 1 and try different cards.</p>
          <div className="flex gap-6 justify-end">
            <PixelButton variant="ghost" onClick={() => setConfirm(false)}>
              STAY
            </PixelButton>
            <PixelButton onClick={startNew} autoFocus>
              START
            </PixelButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
