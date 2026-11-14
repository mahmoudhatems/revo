import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { asset } from "../game/assets";
import { Icon } from "../ui/components/Icon";
import {
  BUILDINGS,
  EQUIPMENT,
  FEATURES,
  GROUND_PATCHES,
  LAMPS,
  LANDING_ZONE,
  PX,
  ROADS,
  ROCKS,
  ROVER_PAD,
  WORLD_PX_H,
  WORLD_PX_W,
  featureSprites,
  type Pt,
} from "./surface";

export const surf = (name: string) => asset(`surface/${name}.png`);
export const buildingSrc = (file: string) => asset(`buildings/${file}`);

const px = (u: number) => Math.round(u * PX);
const pixel: CSSProperties = { imageRendering: "pixelated" };

/** Bottom-centre anchored sprite in map units. */
function Spr({
  name,
  x,
  y,
  flip,
  z,
  scale = 1,
  anchor = "bottom",
  style,
}: {
  name: string;
  x: number;
  y: number;
  flip?: boolean;
  z?: number;
  scale?: number;
  anchor?: "bottom" | "center";
  style?: CSSProperties;
}) {
  return (
    <img
      src={surf(name)}
      alt=""
      draggable={false}
      className="absolute max-w-none pointer-events-none"
      style={{
        ...pixel,
        left: px(x),
        top: px(y),
        zIndex: z,
        transform: `translate(-50%, ${anchor === "bottom" ? "-100%" : "-50%"}) scale(${flip ? -scale : scale}, ${scale})`,
        transformOrigin: anchor === "bottom" ? "50% 100%" : "50% 50%",
        ...style,
      }}
    />
  );
}

/** Layers 0-1: terrain base, ground variation, craters, mesas and scattered rocks. */
const TerrainLayers = memo(function TerrainLayers() {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          ...pixel,
          backgroundImage: `url(${surf("ground_base")})`,
          backgroundSize: "80px 80px",
        }}
      />
      <div className="absolute inset-0" data-layer="terrain-variation">
        {GROUND_PATCHES.map((p, i) => (
          <Spr
            key={i}
            name={p.sprite}
            x={p.x}
            y={p.y}
            flip={p.flip}
            anchor="center"
            scale={1.6}
            style={{ opacity: 0.9 }}
          />
        ))}
      </div>
      <div className="absolute inset-0" data-layer="terrain-features">
        {FEATURES.map((f) =>
          f.kind === "crater" ? (
            <img
              key={f.id}
              src={surf("crater_big")}
              alt=""
              draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{
                ...pixel,
                left: px(f.region.x0),
                top: px((f.region.y0 + f.region.y1) / 2),
                width: px(f.region.x1 - f.region.x0),
                transform: "translateY(-50%)",
              }}
            />
          ) : (
            featureSprites(f).map((d, i) => (
              <Spr key={`${f.id}${i}`} name={d.sprite} x={d.x} y={d.y} flip={d.flip} />
            ))
          ),
        )}
        {ROCKS.map((r, i) => (
          <Spr key={i} name={r.sprite} x={r.x} y={r.y} flip={r.flip} />
        ))}
      </div>
    </>
  );
});

/** Layer 2: compacted-regolith roads built from the tileset's cracked regolith tile. */
const RoadLayer = memo(function RoadLayer() {
  const line = (pts: [number, number][]) => pts.map(([x, y]) => `${x * PX},${y * PX}`).join(" ");
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={WORLD_PX_W}
      height={WORLD_PX_H}
      data-layer="roads"
      aria-hidden
    >
      <defs>
        <pattern id="revo-road" patternUnits="userSpaceOnUse" width={108} height={116}>
          <image href={surf("road")} width={108} height={116} style={pixel} />
        </pattern>
      </defs>
      {/* pad under the rover parking */}
      <rect
        x={px(ROVER_PAD.x - ROVER_PAD.width / 2) - 4}
        y={px(ROVER_PAD.y - ROVER_PAD.height / 2) - 4}
        width={px(ROVER_PAD.width) + 8}
        height={px(ROVER_PAD.height) + 8}
        fill="#6e2c14"
        opacity={0.45}
      />
      <rect
        x={px(ROVER_PAD.x - ROVER_PAD.width / 2)}
        y={px(ROVER_PAD.y - ROVER_PAD.height / 2)}
        width={px(ROVER_PAD.width)}
        height={px(ROVER_PAD.height)}
        fill="url(#revo-road)"
      />
      {ROADS.map((r) => (
        <polyline
          key={`e${r.id}`}
          points={line(r.points)}
          fill="none"
          stroke="#6e2c14"
          strokeOpacity={0.5}
          strokeWidth={r.width * PX + 8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {ROADS.map((r) => (
        <polyline
          key={`b${r.id}`}
          points={line(r.points)}
          fill="none"
          stroke="#b5611a"
          strokeWidth={r.width * PX + 3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {ROADS.map((r) => (
        <polyline
          key={r.id}
          points={line(r.points)}
          fill="none"
          stroke="url(#revo-road)"
          strokeWidth={r.width * PX}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {/* rover tyre tracks along the exterior route */}
      {ROADS.filter((r) => r.id === "road_rover_exit").map((r) =>
        [-0.7, 0.7].map((o) => (
          <polyline
            key={`${r.id}${o}`}
            points={line(r.points.map(([x, y]) => [x + o, y]))}
            fill="none"
            stroke="#9a4a22"
            strokeOpacity={0.55}
            strokeWidth={3}
            strokeDasharray="10 6"
          />
        )),
      )}
    </svg>
  );
});

/** Layer 3: hard pixel shadows under each building. */
const ShadowLayer = memo(function ShadowLayer() {
  return (
    <div className="absolute inset-0 pointer-events-none" data-layer="building-shadows">
      {BUILDINGS.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: px(b.sprite.x0 + 0.4),
            top: px(b.sprite.y1 - 2.2),
            width: px(b.sprite.x1 - b.sprite.x0 + 0.6),
            height: px(2.6),
            background: "rgba(60,18,6,0.38)",
            borderRadius: "50%",
          }}
        />
      ))}
    </div>
  );
});

const zOf = (y: number) => Math.round(y * 10);

/** Layers 4-5: station sprites and external equipment, depth-sorted by their base. */
const StaticObjects = memo(function StaticObjects() {
  return (
    <>
      {BUILDINGS.map((b) => (
        <img
          key={b.id}
          src={buildingSrc(b.asset)}
          alt={b.name}
          draggable={false}
          data-building={b.id}
          className="absolute max-w-none pointer-events-none"
          style={{
            ...pixel,
            left: px(b.sprite.x0),
            top: px(b.sprite.y0),
            width: px(b.sprite.x1 - b.sprite.x0),
            height: px(b.sprite.y1 - b.sprite.y0),
            zIndex: zOf(b.sprite.y1),
          }}
        />
      ))}
      {EQUIPMENT.map((e) => {
        const { x, y } = e.position;
        if (e.type === "solar_panel_cluster")
          return [
            [-2.1, -1.3],
            [2.1, -1.3],
            [-2.1, 2.3],
            [2.1, 2.3],
          ]
            .slice(0, e.count ?? 4)
            .map(([ox, oy], i) => (
              <Spr
                key={`${e.id}${i}`}
                name="solar_panel"
                x={x + ox}
                y={y + oy}
                z={zOf(y + oy)}
                scale={1.15}
              />
            ));
        if (e.type === "satellite_dish")
          return <Spr key={e.id} name="dish" x={x} y={y + 1.8} z={zOf(y + 1.8)} />;
        if (e.type === "storage_tanks")
          return [-1.6, 0, 1.6].map((o, i) => (
            <Spr
              key={`${e.id}${i}`}
              name="barrel"
              x={x + o}
              y={y + 1.8 + (i % 2) * 0.3}
              z={zOf(y + 1.8)}
              scale={0.8}
            />
          ));
        if (e.type === "rover_pad")
          return (
            <div key={e.id}>
              <Spr name="crate" x={x + 2.4} y={y + 1.6} z={zOf(y + 1.6)} scale={0.7} />
              <Spr name="crate" x={x + 2.4} y={y - 0.4} z={zOf(y - 0.4)} scale={0.6} />
              <span
                className="absolute"
                style={{ left: px(x - 2.2), top: px(y - 1.6), zIndex: zOf(y + 1) }}
              >
                <Icon name="rover" size={48} />
              </span>
            </div>
          );
        return null;
      })}
      {LAMPS.map((l, i) => (
        <div
          key={`lamp${i}`}
          className="absolute pointer-events-none"
          style={{ left: px(l.x), top: px(l.y), zIndex: zOf(l.y) }}
        >
          <span
            className="absolute block -translate-x-1/2 bg-[#5a6270]"
            style={{ width: 4, height: 30, top: -30, boxShadow: "2px 0 0 #2b2f38" }}
          />
          <span
            className="absolute block -translate-x-1/2 anim-glow"
            style={{
              width: 8,
              height: 8,
              top: -36,
              background: "#f2c14e",
              boxShadow: "0 0 0 2px #000, 0 0 10px 3px rgba(242,193,78,.55)",
            }}
          />
        </div>
      ))}
      <Spr name="rock_ring" x={LANDING_ZONE.x} y={LANDING_ZONE.y + 2.4} z={1} scale={0.8} />
      <Spr
        name="sensor_tower"
        x={LANDING_ZONE.x + 5}
        y={LANDING_ZONE.y + 1}
        z={zOf(LANDING_ZONE.y + 1)}
        scale={0.8}
      />
    </>
  );
});

/** Reusable Mars surface. `children` share the depth-sorted object layer (use zIndex = y*10). */
export function MarsSurface({ children, overlay }: { children?: ReactNode; overlay?: ReactNode }) {
  return (
    <div
      className="relative bg-mars overflow-hidden"
      style={{ width: WORLD_PX_W, height: WORLD_PX_H }}
      data-surface="revo-mars"
    >
      <TerrainLayers />
      <RoadLayer />
      <ShadowLayer />
      <div className="absolute inset-0" data-layer="objects">
        <StaticObjects />
        {children}
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        data-layer="foreground"
        style={{
          background:
            "radial-gradient(ellipse at 50% 48%, transparent 55%, rgba(70,20,6,0.35) 100%)",
        }}
      />
      {overlay}
    </div>
  );
}

export type CameraZoom = number | "cover" | "contain";

/** Positions the world inside its parent so `focus` is centred, clamped to the map edges. */
export function SurfaceCamera({
  focus,
  zoom = 1,
  children,
  overlay,
  worldRef,
  onPointerDown,
  className = "",
}: {
  focus: Pt;
  zoom?: CameraZoom;
  children?: ReactNode;
  overlay?: ReactNode;
  worldRef?: Ref<HTMLDivElement>;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 652 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const on = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    on();
    const ro = new ResizeObserver(on);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const z =
    zoom === "cover"
      ? Math.max(size.w / WORLD_PX_W, size.h / WORLD_PX_H)
      : zoom === "contain"
        ? Math.min(size.w / WORLD_PX_W, size.h / WORLD_PX_H)
        : zoom;
  const clamp = (view: number, world: number, f: number) => {
    const ww = world * z;
    if (ww <= view) return (view - ww) / 2;
    return Math.min(0, Math.max(view - ww, view / 2 - f * PX * z));
  };
  const tx = clamp(size.w, WORLD_PX_W, focus.x);
  const ty = clamp(size.h, WORLD_PX_H, focus.y);
  return (
    <div
      ref={box}
      className={`absolute inset-0 overflow-hidden bg-mars-lo ${className}`}
      onPointerDown={onPointerDown}
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0"
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: "0 0" }}
      >
        <MarsSurface overlay={overlay}>{children}</MarsSurface>
      </div>
    </div>
  );
}
