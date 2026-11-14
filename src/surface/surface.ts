/**
 * REVO Mars Surface model.
 *
 * Pure geometry + navigation derived from `mars_surface_map.json` (the single source of truth for
 * building, road, terrain and equipment placement). Nothing here knows about missions, crises,
 * resources, decision cards or saves: the UI only asks "where can Rivo walk" and "which physical
 * building is near", then routes interactions through the existing game actions.
 */
import raw from "./mars_surface_map.json";
import type { BuildingId } from "../game/content";

export type Pt = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };
export type Facing = "north" | "south" | "east" | "west";

export const PX = raw.revo.pxPerUnit;
export const WORLD_W = raw.coordinateSystem.xRange[1];
export const WORLD_H = raw.coordinateSystem.yRange[1];
export const WORLD_PX_W = WORLD_W * PX;
export const WORLD_PX_H = WORLD_H * PX;

/** Rivo's foot radius in map units. */
export const ACTOR_RADIUS = 0.7;

export interface SurfaceBuilding {
  id: string;
  name: string;
  asset: string;
  center: Pt;
  /** Full sprite rectangle, in map units. */
  sprite: Rect;
  /** Solid base of the building. The upper roof area stays walkable "behind" the sprite. */
  collision: Rect;
  entrance: Pt;
  facing: Facing;
  /** Walkable standing point just outside the entrance. */
  door: Pt;
  /** Existing game station opened by this physical building, or null for visual-only. */
  station: BuildingId | null;
  zone: string;
}

export interface SurfaceRoad {
  id: string;
  width: number;
  points: [number, number][];
}

export type FeatureKind = "crater" | "cliff_ridge" | "mountains";
export interface SurfaceFeature {
  id: string;
  kind: FeatureKind;
  region: Rect;
  /** Collision shape: ellipse for craters, rectangle for ridges. */
  shape:
    | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
    | { type: "rect"; r: Rect };
}

export interface SurfaceEquipment {
  id: string;
  type: string;
  position: Pt;
  count?: number;
  block: Rect | null;
}

const rect = (cx: number, cy: number, w: number, h: number): Rect => ({
  x0: cx - w / 2,
  y0: cy - h / 2,
  x1: cx + w / 2,
  y1: cy + h / 2,
});

export const BUILDINGS: SurfaceBuilding[] = raw.buildings.map((b) => {
  const s = b.revo.sprite;
  const w = (s.width * s.displayScale) / PX;
  const h = (s.height * s.displayScale) / PX;
  const sprite = rect(b.position.x, b.position.y, w, h);
  const collision: Rect = {
    x0: sprite.x0 + w * 0.08,
    x1: sprite.x1 - w * 0.08,
    y0: sprite.y0 + h * 0.38,
    y1: sprite.y1 - h * 0.06,
  };
  const facing = b.entrance.facing as Facing;
  const e = { x: b.entrance.x, y: b.entrance.y };
  const door =
    facing === "south"
      ? { x: e.x, y: sprite.y1 + 1.2 }
      : facing === "north"
        ? { x: e.x, y: sprite.y0 - 1 }
        : facing === "east"
          ? { x: collision.x1 + 1.4, y: e.y }
          : { x: collision.x0 - 1.4, y: e.y };
  return {
    id: b.id,
    name: b.name,
    asset: b.asset,
    center: { x: b.position.x, y: b.position.y },
    sprite,
    collision,
    entrance: e,
    facing,
    door,
    station: (b.revo.station as BuildingId | null) ?? null,
    zone: b.zone,
  };
});

export const ROADS: SurfaceRoad[] = [...raw.roads, ...raw.revo.extraRoads].map((r) => ({
  id: r.id,
  width: r.width,
  points: r.points as [number, number][],
}));

export const CRATER_ASPECT = 88 / 172;

export const FEATURES: SurfaceFeature[] = [...raw.terrainFeatures, ...raw.revo.extraTerrainFeatures]
  .filter((f) => f.type !== "decorative_rocks" && "collision" in f && f.collision)
  .map((f) => {
    const [x0, y0, x1, y1] = f.region;
    const region = { x0, y0, x1, y1 };
    const kind = f.type as FeatureKind;
    if (kind === "crater") {
      const w = x1 - x0;
      const h = w * CRATER_ASPECT;
      return {
        id: f.id,
        kind,
        region,
        shape: {
          type: "ellipse",
          cx: (x0 + x1) / 2,
          cy: (y0 + y1) / 2,
          rx: w * 0.44,
          ry: h * 0.42,
        },
      };
    }
    return {
      id: f.id,
      kind,
      region,
      shape: { type: "rect", r: { x0: x0 + 0.4, y0, x1: x1 - 0.4, y1: y1 - 0.8 } },
    };
  });

export const EQUIPMENT: SurfaceEquipment[] = raw.externalEquipment.map((e) => {
  const p = e.position;
  const block =
    e.type === "solar_panel_cluster"
      ? rect(p.x, p.y + 0.5, 8, 5.5)
      : e.type === "satellite_dish"
        ? rect(p.x, p.y + 1, 2.6, 1.6)
        : e.type === "storage_tanks"
          ? rect(p.x, p.y + 1.2, 4, 1.2)
          : null;
  return { id: e.id, type: e.type, position: p, count: "count" in e ? e.count : undefined, block };
});

export const LAMPS: Pt[] = raw.revo.lamps.map(([x, y]) => ({ x, y }));
export const ROVER_PAD = raw.revo.roverPad;
export const SPAWN: Pt = raw.navigation.playerSpawn;
export const ROVER_EXIT: Pt = raw.navigation.roverExit;
export const LANDING_ZONE = raw.revo.landingZone as Pt & { station: BuildingId; label: string };
const ZONES = raw.navigation.walkableZones.map((z) => z.polygon as [number, number][]);

// ---------- geometry helpers ----------

export function inRect(p: Pt, r: Rect, pad = 0) {
  return p.x > r.x0 - pad && p.x < r.x1 + pad && p.y > r.y0 - pad && p.y < r.y1 + pad;
}

function inPolygon(p: Pt, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function segDist(p: Pt, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / l)) : 0;
  return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy));
}

export function roadDistance(p: Pt) {
  let best = Infinity;
  for (const r of ROADS)
    for (let i = 1; i < r.points.length; i++)
      best = Math.min(best, segDist(p, r.points[i - 1], r.points[i]) - r.width / 2);
  return best;
}

export function onRoad(p: Pt, extra = 0.3) {
  return roadDistance(p) <= extra;
}

export function featureBlocks(p: Pt, pad = 0) {
  for (const f of FEATURES) {
    const s = f.shape;
    if (
      s.type === "rect"
        ? inRect(p, s.r, pad)
        : ((p.x - s.cx) / (s.rx + pad)) ** 2 + ((p.y - s.cy) / (s.ry + pad)) ** 2 < 1
    )
      return f;
  }
  return null;
}

/** Can Rivo's feet stand here? */
export function walkable(p: Pt, r = ACTOR_RADIUS) {
  if (p.x < 1 || p.x > WORLD_W - 1 || p.y < 1 || p.y > WORLD_H - 0.2) return false;
  for (const b of BUILDINGS) if (inRect(p, b.collision, r)) return false;
  for (const e of EQUIPMENT) if (e.block && inRect(p, e.block, r)) return false;
  if (featureBlocks(p, r)) return false;
  return onRoad(p) || ZONES.some((z) => inPolygon(p, z));
}

function segmentWalkable(a: Pt, b: Pt) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.25);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!walkable({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false;
  }
  return true;
}

/** Slide-move: try the full step, then each axis, so Rivo glides along walls. */
export function moveWithCollision(p: Pt, dx: number, dy: number): Pt {
  const full = { x: p.x + dx, y: p.y + dy };
  if (walkable(full)) return full;
  const xOnly = { x: p.x + dx, y: p.y };
  if (dx && walkable(xOnly)) return xOnly;
  const yOnly = { x: p.x, y: p.y + dy };
  if (dy && walkable(yOnly)) return yOnly;
  return p;
}

// ---------- navigation grid + A* ----------

const CELL = 0.5;
const GW = Math.round(WORLD_W / CELL);
const GH = Math.round(WORLD_H / CELL);
let grid: Uint8Array | null = null;
const cellPt = (i: number, j: number): Pt => ({ x: (i + 0.5) * CELL, y: (j + 0.5) * CELL });

function navGrid() {
  if (grid) return grid;
  grid = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++)
    for (let i = 0; i < GW; i++) grid[j * GW + i] = walkable(cellPt(i, j)) ? 1 : 0;
  return grid;
}

function nearestCell(p: Pt): number | null {
  const g = navGrid();
  const ci = Math.floor(p.x / CELL);
  const cj = Math.floor(p.y / CELL);
  for (let rad = 0; rad < 12; rad++) {
    let best: number | null = null;
    let bd = Infinity;
    for (let j = cj - rad; j <= cj + rad; j++)
      for (let i = ci - rad; i <= ci + rad; i++) {
        if (i < 0 || j < 0 || i >= GW || j >= GH || !g[j * GW + i]) continue;
        const c = cellPt(i, j);
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bd) {
          bd = d;
          best = j * GW + i;
        }
      }
    if (best !== null) return best;
  }
  return null;
}

/** Walkable path from `from` to (near) `to`, smoothed with line-of-sight. Empty if unreachable. */
export function findPath(from: Pt, to: Pt): Pt[] {
  const g = navGrid();
  const s = nearestCell(from);
  const t = nearestCell(to);
  if (s === null || t === null) return [];
  const ti = t % GW;
  const tj = Math.floor(t / GW);
  const gScore = new Float32Array(GW * GH).fill(Infinity);
  const prev = new Int32Array(GW * GH).fill(-1);
  const closed = new Uint8Array(GW * GH);
  const heap: [number, number][] = [];
  const push = (f: number, n: number) => {
    heap.push([f, n]);
    let i = heap.length - 1;
    while (i > 0) {
      const pi = (i - 1) >> 1;
      if (heap[pi][0] <= heap[i][0]) break;
      [heap[pi], heap[i]] = [heap[i], heap[pi]];
      i = pi;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const h = (n: number) => Math.hypot((n % GW) - ti, Math.floor(n / GW) - tj);
  gScore[s] = 0;
  push(h(s), s);
  while (heap.length) {
    const [, n] = pop();
    if (closed[n]) continue;
    closed[n] = 1;
    if (n === t) break;
    const i = n % GW;
    const j = Math.floor(n / GW);
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) continue;
        const m = nj * GW + ni;
        if (!g[m] || closed[m]) continue;
        // no corner cutting through walls
        if (di && dj && (!g[j * GW + ni] || !g[nj * GW + i])) continue;
        const ng = gScore[n] + (di && dj ? Math.SQRT2 : 1);
        if (ng < gScore[m]) {
          gScore[m] = ng;
          prev[m] = n;
          push(ng + h(m), m);
        }
      }
  }
  if (s !== t && prev[t] === -1) return [];
  const cells: Pt[] = [];
  for (let n = t; n !== -1; n = prev[n]) cells.unshift(cellPt(n % GW, Math.floor(n / GW)));
  const goal = walkable(to) ? to : cells[cells.length - 1];
  const pts = [from, ...cells.slice(1, -1), goal];
  // string-pull
  const out: Pt[] = [pts[0]];
  let k = 0;
  while (k < pts.length - 1) {
    let far = k + 1;
    for (let q = pts.length - 1; q > k + 1; q--)
      if (segmentWalkable(pts[k], pts[q])) {
        far = q;
        break;
      }
    out.push(pts[far]);
    k = far;
  }
  return out.slice(1);
}

export function reachable(from: Pt, to: Pt, tolerance = 1.2) {
  const p = findPath(from, to);
  if (!p.length) return Math.hypot(from.x - to.x, from.y - to.y) <= tolerance;
  const end = p[p.length - 1];
  return Math.hypot(end.x - to.x, end.y - to.y) <= tolerance;
}

// ---------- interaction helpers ----------

export const INTERACT_RANGE = 3.4;

export function nearbyBuilding(p: Pt): SurfaceBuilding | null {
  let best: SurfaceBuilding | null = null;
  let bd = INTERACT_RANGE;
  for (const b of BUILDINGS) {
    const d = Math.hypot(b.door.x - p.x, b.door.y - p.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

export function nearLanding(p: Pt) {
  return Math.hypot(LANDING_ZONE.x - p.x, LANDING_ZONE.y - p.y) < 4;
}

/** The main physical building that represents an existing game station. */
export function buildingForStation(id: BuildingId): SurfaceBuilding | null {
  return (
    BUILDINGS.find((b) => b.station === id && b.id !== "maintenance_hangar") ??
    BUILDINGS.find((b) => b.station === id) ??
    null
  );
}

export function focusForStation(id?: BuildingId): Pt {
  if (!id) return { x: WORLD_W / 2, y: WORLD_H / 2 };
  if (id === "landing") return { x: LANDING_ZONE.x, y: LANDING_ZONE.y - 6 };
  return buildingForStation(id)?.center ?? { x: WORLD_W / 2, y: WORLD_H / 2 };
}

// ---------- deterministic decoration ----------

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Decor {
  sprite: string;
  x: number;
  y: number;
  flip: boolean;
}

const ROCKS_SMALL = [
  "rock_s1",
  "rock_s2",
  "rock_s3",
  "rock_s4",
  "rock_s5",
  "rock_s6",
  "rock_s7",
  "rock_s8",
  "pebble_1",
  "pebble_2",
  "pebble_3",
  "rock_m1",
  "rock_m2",
];
const ROCKS_BIG = ["rock_xl", "rock_spire", "rock_stack", "rock_group", "rock_m3", "rock_tall"];
const PATCHES = [
  "patch_rocky",
  "patch_rocky_wide",
  "patch_light",
  "patch_dunes",
  "patch_small_crater",
  "patch_dense_rocks",
  "patch_cracked",
  "patch_rocky",
  "patch_light",
];

function clearOfColony(p: Pt, pad: number) {
  if (roadDistance(p) < pad) return false;
  for (const b of BUILDINGS) {
    if (inRect(p, b.sprite, pad)) return false;
    if (Math.hypot(b.door.x - p.x, b.door.y - p.y) < 3 + pad) return false;
  }
  for (const e of EQUIPMENT)
    if (Math.hypot(e.position.x - p.x, e.position.y - p.y) < 6) return false;
  for (const f of FEATURES) if (inRect(p, f.region, 0.5)) return false;
  if (Math.hypot(ROVER_PAD.x - p.x, ROVER_PAD.y - p.y) < 6) return false;
  return true;
}

function scatter(
  seed: number,
  count: number,
  pick: (r: () => number) => string,
  accept: (p: Pt, r: () => number) => boolean,
) {
  const r = rng(seed);
  const out: Decor[] = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 30) {
    const p = { x: 1 + r() * (WORLD_W - 2), y: 1 + r() * (WORLD_H - 2) };
    if (!accept(p, r)) continue;
    out.push({ sprite: pick(r), x: p.x, y: p.y, flip: r() < 0.5 });
  }
  return out;
}

const apron = { x0: 40, y0: 29, x1: 60, y1: 49 };

export const GROUND_PATCHES = scatter(
  11,
  210,
  (r) => PATCHES[Math.floor(r() * PATCHES.length)],
  (p) => !inRect(p, apron),
);
export const ROCKS = scatter(
  29,
  150,
  (r) =>
    r() < 0.82
      ? ROCKS_SMALL[Math.floor(r() * ROCKS_SMALL.length)]
      : ROCKS_BIG[Math.floor(r() * ROCKS_BIG.length)],
  (p, r) => clearOfColony(p, 1.3) && (!inRect(p, apron) || r() < 0.1),
);

/** Mesa / mountain sprites filling ridge regions. */
export function featureSprites(f: SurfaceFeature): Decor[] {
  const r = rng(f.id.length * 97 + Math.round(f.region.x0 * 13 + f.region.y0 * 7));
  const { x0, y0, x1, y1 } = f.region;
  const out: Decor[] = [];
  if (f.kind === "cliff_ridge") {
    const tiles = ["cliff_a", "cliff_b", "cliff_c", "cliff_d"];
    for (let x = x0 + 2.5; x < x1 + 1; x += 5)
      out.push({ sprite: tiles[Math.floor(r() * tiles.length)], x, y: y1, flip: r() < 0.5 });
    out.push({
      sprite: "peak_pair",
      x: x0 + (x1 - x0) * (0.3 + r() * 0.4),
      y: y0 + (y1 - y0) * 0.35,
      flip: r() < 0.5,
    });
  } else if (f.kind === "mountains") {
    const area = (x1 - x0) * (y1 - y0);
    const n = Math.max(2, Math.round(area / 40));
    for (let i = 0; i < n; i++)
      out.push({
        sprite: r() < 0.55 ? "mountain_cluster" : "mountain",
        x: x0 + 3 + r() * Math.max(0.1, x1 - x0 - 6),
        y: y0 + 4 + r() * Math.max(0.1, y1 - y0 - 4),
        flip: r() < 0.5,
      });
    for (let i = 0; i < n; i++)
      out.push({
        sprite: r() < 0.5 ? "peak_a" : "peak_b",
        x: x0 + r() * (x1 - x0),
        y: y0 + 1 + r() * (y1 - y0 - 1),
        flip: r() < 0.5,
      });
    out.sort((a, b) => a.y - b.y);
  }
  return out;
}
