import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { ASSETS } from "../../game/assets";
import { BUILDINGS as STATIONS } from "../../game/content";
import { currentStep } from "../../game/engine";
import { SurfaceCamera } from "../../surface/MarsSurface";
import {
  BUILDINGS,
  LANDING_ZONE,
  PX,
  SPAWN,
  WORLD_H,
  WORLD_W,
  buildingForStation,
  findPath,
  moveWithCollision,
  nearLanding,
  nearbyBuilding,
  type Pt,
  type SurfaceBuilding,
} from "../../surface/surface";
import { useGame } from "../GameProvider";
import { Icon } from "../components/Icon";
import { NeilDialog, PixelButton } from "../components/Pixel";

const SPEED = 13; // map units per second
const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};
const px = (u: number) => Math.round(u * PX);

export function HubMap() {
  const { state, dispatch, setOverlay, overlay } = useGame();
  const step = currentStep(state);
  const command = buildingForStation("command")!;
  const facility = step.building !== "command" ? buildingForStation(step.building) : null;

  const pos = useRef<Pt>({ ...SPAWN });
  const drone = useRef<Pt>({ x: SPAWN.x - 2.6, y: SPAWN.y - 1.2 });
  const path = useRef<Pt[]>([]);
  const arrive = useRef<null | (() => void)>(null);
  const keys = useRef(new Set<string>());
  const world = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);
  const [flip, setFlip] = useState(false);
  const [walking, setWalking] = useState(false);
  const [frame, setFrame] = useState(0);
  const [overview, setOverview] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [marker, setMarker] = useState<Pt | null>(null);
  const [neilOpen, setNeilOpen] = useState(true);
  const [info, setInfo] = useState<SurfaceBuilding | null>(null);
  const blocked = !!overlay || state.alerts.length > 0;
  const movedOnce = useRef(false);
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  const interact = useCallback(
    (b: SurfaceBuilding | "landing") => {
      setInfo(null);
      if (b === "landing") return setOverlay({ kind: "station", id: "landing" });
      if (b.station === "command") return dispatch({ type: "OPEN_BRIEFING" });
      if (b.station) return setOverlay({ kind: "station", id: b.station });
      setInfo(b);
    },
    [dispatch, setOverlay],
  );

  const walkTo = useCallback((to: Pt, then?: () => void) => {
    const p = findPath(pos.current, to);
    path.current = p;
    arrive.current = then ?? null;
    setMarker(then ? null : to);
    if (!p.length) {
      arrive.current = null;
      then?.();
    }
  }, []);

  const goToBuilding = useCallback(
    (b: SurfaceBuilding) => {
      if (Math.hypot(b.door.x - pos.current.x, b.door.y - pos.current.y) < 3.4) interact(b);
      else walkTo(b.door, () => interact(b));
    },
    [interact, walkTo],
  );

  const near = nearbyBuilding(pos.current);
  const atLanding = !near && nearLanding(pos.current);
  const use = useCallback(() => {
    const n = nearbyBuilding(pos.current);
    if (n) return interact(n);
    if (nearLanding(pos.current)) return interact("landing");
    goToBuilding(command);
  }, [command, goToBuilding, interact]);

  // Movement loop: keyboard steering wins over tap-to-walk paths.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      let moved = false;
      if (!blockedRef.current) {
        let dx = 0;
        let dy = 0;
        for (const k of keys.current) {
          const v = KEYS[k];
          if (v) {
            dx += v[0];
            dy += v[1];
          }
        }
        const p = pos.current;
        if (dx || dy) {
          path.current = [];
          arrive.current = null;
          const l = Math.hypot(dx, dy);
          const np = moveWithCollision(p, (dx / l) * SPEED * dt, (dy / l) * SPEED * dt);
          moved = np !== p;
          if (dx) setFlip(dx < 0);
          pos.current = np;
        } else if (path.current.length) {
          const target = path.current[0];
          const ddx = target.x - p.x;
          const ddy = target.y - p.y;
          const d = Math.hypot(ddx, ddy);
          const stepLen = SPEED * dt;
          if (Math.abs(ddx) > 0.05) setFlip(ddx < 0);
          if (d <= stepLen) {
            pos.current = target;
            path.current.shift();
            if (!path.current.length) {
              setMarker(null);
              const fn = arrive.current;
              arrive.current = null;
              fn?.();
            }
          } else pos.current = { x: p.x + (ddx / d) * stepLen, y: p.y + (ddy / d) * stepLen };
          moved = true;
        }
        // the robot drifts after Rivo
        const goal = { x: pos.current.x - 2.6, y: pos.current.y - 1.2 };
        drone.current = {
          x: drone.current.x + (goal.x - drone.current.x) * Math.min(1, dt * 3),
          y: drone.current.y + (goal.y - drone.current.y) * Math.min(1, dt * 3),
        };
      }
      if (moved && !movedOnce.current) {
        movedOnce.current = true;
        setNeilOpen(false);
      }
      setWalking(moved);
      acc += dt;
      if (moved && acc > 0.14) {
        acc = 0;
        setFrame((f) => (f + 1) % 4);
      }
      setTick((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (blockedRef.current) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (KEYS[k]) {
        keys.current.add(k);
        e.preventDefault();
      } else if (k === "e" || (k === "Enter" && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault();
        use();
      }
    };
    const up = (e: KeyboardEvent) =>
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [use]);
  useEffect(() => {
    if (blocked) keys.current.clear();
  }, [blocked]);

  const onGround = (e: PointerEvent<HTMLDivElement>) => {
    if (blocked || (e.target as HTMLElement).closest("button")) return;
    const r = world.current?.getBoundingClientRect();
    if (!r) return;
    const to = {
      x: ((e.clientX - r.left) / r.width) * WORLD_W,
      y: ((e.clientY - r.top) / r.height) * WORLD_H,
    };
    setInfo(null);
    walkTo(to);
  };

  const prompt = state.neilOffline
    ? "SIGNAL LOST. Walk to the Command Dome and press USE."
    : step.id === "m1"
      ? "Welcome to Alpha Base, Rivo! Walk to the Command Dome with the yellow arrow and press USE."
      : `Next up: ${step.code}! Walk to the Command Dome and press USE.`;

  const p = pos.current;
  const sprite = walking ? ASSETS.revoHelmetWalk[frame] : ASSETS.revoHelmet;
  const useLabel = near
    ? near.station === "command"
      ? `USE: START ${step.code}`
      : `USE: ${near.station ? STATIONS[near.station].short : "LOOK"}`
    : atLanding
      ? "USE: LANDING ZONE"
      : "USE";

  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px] bg-space overflow-hidden">
      <SurfaceCamera
        focus={p}
        zoom={overview ? "contain" : 1}
        worldRef={world}
        onPointerDown={onGround}
        className="cursor-crosshair touch-none"
      >
        {BUILDINGS.map((b) => {
          const isTarget = b === command;
          const isFacility = b === facility;
          const active = hover === b.id || near === b;
          const s = b.sprite;
          return (
            <button
              key={b.id}
              type="button"
              className="absolute"
              style={{
                left: px(s.x0),
                top: px(s.y0),
                width: px(s.x1 - s.x0),
                height: px(s.y1 - s.y0),
                zIndex: 2000,
              }}
              onMouseEnter={() => setHover(b.id)}
              onMouseLeave={() => setHover((h) => (h === b.id ? null : h))}
              onFocus={() => setHover(b.id)}
              onBlur={() => setHover((h) => (h === b.id ? null : h))}
              onClick={() => goToBuilding(b)}
              aria-label={
                isTarget
                  ? `${STATIONS.command.name}: walk there and start ${step.code}`
                  : `Walk to ${b.station ? STATIONS[b.station].name : b.name}`
              }
            >
              {active || isTarget ? (
                <Brackets color={isTarget ? "#f2c14e" : "#36d6e8"} blink={isTarget && !active} />
              ) : null}
              {isTarget ? (
                <span className="absolute left-1/2 -translate-x-1/2 -top-[58px] flex flex-col items-center anim-bob pointer-events-none">
                  <span
                    className="font-pixel text-[10px] bg-warning text-black px-2 py-1"
                    style={{ boxShadow: "0 4px 0 #000" }}
                  >
                    {near === b ? `${step.code} · PRESS USE` : step.code}
                  </span>
                  <Icon name="arrowDown" size={36} />
                </span>
              ) : null}
              {isFacility ? (
                <span className="absolute right-2 top-2 anim-blink pointer-events-none">
                  <Icon name="warn" size={28} />
                </span>
              ) : null}
              {active && !isTarget ? (
                <span
                  className="absolute left-1/2 -translate-x-1/2 -top-[24px] font-pixel text-[8px] whitespace-nowrap bg-panel text-ink px-2 py-1 pointer-events-none"
                  style={{ boxShadow: "0 0 0 2px #36d6e8, 2px 4px 0 #000" }}
                >
                  {b.station ? STATIONS[b.station].short : b.name.toUpperCase()}
                </span>
              ) : null}
            </button>
          );
        })}
        {marker ? (
          <span
            className="absolute pointer-events-none anim-blink"
            style={{
              left: px(marker.x) - 8,
              top: px(marker.y) - 4,
              width: 16,
              height: 8,
              zIndex: 1,
              boxShadow: "0 0 0 3px #f2c14e",
            }}
          />
        ) : null}
        <span
          className="absolute pointer-events-none"
          style={{
            left: px(LANDING_ZONE.x),
            top: px(LANDING_ZONE.y) - 46,
            zIndex: 900,
            transform: "translateX(-50%)",
          }}
        >
          <span
            className="font-pixel text-[7px] whitespace-nowrap bg-panel text-success px-2 py-1"
            style={{ boxShadow: "0 0 0 2px #55d68b" }}
          >
            {LANDING_ZONE.label}
          </span>
        </span>
        {/* robot follower */}
        <img
          src={ASSETS.drone}
          alt=""
          draggable={false}
          className="absolute pixelated anim-bob pointer-events-none max-w-none"
          style={{
            left: px(drone.current.x) - 16,
            top: px(drone.current.y) - 62,
            height: 32,
            zIndex: Math.round(drone.current.y * 10) + 1,
          }}
        />
        {/* Rivo */}
        <span
          className="absolute pointer-events-none"
          style={{ left: px(p.x), top: px(p.y), zIndex: Math.round(p.y * 10) }}
        >
          <span
            className="absolute block -translate-x-1/2 rounded-[50%]"
            style={{ width: 26, height: 8, top: -5, background: "rgba(40,10,4,0.45)" }}
          />
          <img
            src={sprite}
            alt="Rivo"
            draggable={false}
            className="absolute pixelated max-w-none"
            style={{
              height: 52,
              left: 0,
              top: -50,
              transform: `translateX(-50%) scaleX(${flip ? -1 : 1})`,
            }}
          />
        </span>
      </SurfaceCamera>

      {/* Neil: compact, top-left, collapsible so the colony stays visible */}
      <div className="absolute left-3 top-3 z-20 w-[400px] max-w-[45%]">
        {neilOpen ? (
          <div className="relative">
            <NeilDialog compact text={prompt} offline={state.neilOffline} />
            <button
              type="button"
              onClick={() => setNeilOpen(false)}
              className="absolute right-1 bottom-1 font-pixel text-[7px] text-muted px-2 py-2 hover:text-ink"
              aria-label="Hide Neil's message"
            >
              HIDE
            </button>
          </div>
        ) : (
          <PixelButton
            size="sm"
            variant="cyan"
            icon={state.neilOffline ? "neilAlert" : "neil"}
            onClick={() => setNeilOpen(true)}
          >
            NEIL
          </PixelButton>
        )}
      </div>

      {info ? (
        <div
          className="absolute left-1/2 bottom-3 z-20 -translate-x-1/2 w-[380px] bg-[#0d1522] p-3 flex items-start gap-3"
          style={{ boxShadow: "0 0 0 4px #f28c28, 4px 8px 0 #000" }}
          role="status"
        >
          <Icon name="info" size={24} />
          <div className="flex-1">
            <div className="font-pixel text-[9px] text-orange leading-relaxed">
              {info.name.toUpperCase()}
            </div>
            <p className="text-[16px] leading-tight mt-1">
              Engineers are still deciding what this core will do. Nothing to fix here today!
            </p>
          </div>
          <button type="button" onClick={() => setInfo(null)} className="p-1" aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>
      ) : null}

      <div className="absolute left-3 bottom-3 z-20 flex items-center gap-3">
        <PixelButton
          size="sm"
          variant="ghost"
          icon="map"
          onClick={() => setOverview((v) => !v)}
          aria-pressed={overview}
        >
          {overview ? "ZOOM IN" : "MAP"}
        </PixelButton>
        <span className="font-pixel text-[7px] text-ink px-text-shadow leading-relaxed max-w-[220px]">
          TAP THE GROUND TO WALK · ARROWS OR WASD
        </span>
      </div>

      <div className="absolute right-3 bottom-3 z-20 flex flex-col items-end gap-2">
        <div className="font-pixel text-[8px] text-ink px-text-shadow">
          {step.code} · AT {STATIONS[step.building].short}
        </div>
        <PixelButton
          size="lg"
          variant="cyan"
          icon="arrow"
          onClick={use}
          aria-label={
            near || atLanding ? useLabel : `USE: walk to the Command Dome and start ${step.code}`
          }
        >
          {useLabel}
        </PixelButton>
      </div>
    </div>
  );
}

function Brackets({ color, blink }: { color: string; blink?: boolean }) {
  const s = { background: color };
  const c = "absolute block";
  return (
    <span className={`absolute inset-0 pointer-events-none ${blink ? "anim-blink" : ""}`}>
      <span className={`${c} left-0 top-0 w-5 h-1`} style={s} />
      <span className={`${c} left-0 top-0 w-1 h-5`} style={s} />
      <span className={`${c} right-0 top-0 w-5 h-1`} style={s} />
      <span className={`${c} right-0 top-0 w-1 h-5`} style={s} />
      <span className={`${c} left-0 bottom-0 w-5 h-1`} style={s} />
      <span className={`${c} left-0 bottom-0 w-1 h-5`} style={s} />
      <span className={`${c} right-0 bottom-0 w-5 h-1`} style={s} />
      <span className={`${c} right-0 bottom-0 w-1 h-5`} style={s} />
    </span>
  );
}
