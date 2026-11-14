import { describe, expect, it } from "vitest";
import {
  BUILDINGS,
  EQUIPMENT,
  FEATURES,
  LANDING_ZONE,
  ROADS,
  ROVER_EXIT,
  SPAWN,
  buildingForStation,
  featureBlocks,
  findPath,
  inRect,
  onRoad,
  reachable,
  walkable,
} from "../src/surface/surface";

const overlap = (a: { x0: number; y0: number; x1: number; y1: number }, b: typeof a) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe("Mars surface layout", () => {
  it("places all nine supplied station sprites", () => {
    expect(BUILDINGS).toHaveLength(9);
    expect(new Set(BUILDINGS.map((b) => b.asset)).size).toBe(9);
  });

  it("has no overlapping building sprites or collision footprints", () => {
    for (let i = 0; i < BUILDINGS.length; i++)
      for (let j = i + 1; j < BUILDINGS.length; j++) {
        expect(
          overlap(BUILDINGS[i].sprite, BUILDINGS[j].sprite),
          `${BUILDINGS[i].id}/${BUILDINGS[j].id}`,
        ).toBe(false);
      }
  });

  it("keeps equipment clear of buildings", () => {
    for (const e of EQUIPMENT)
      for (const b of BUILDINGS)
        if (e.block) expect(overlap(e.block, b.collision), `${e.id}/${b.id}`).toBe(false);
  });

  it("never routes a road through a crater, cliff or mountain", () => {
    for (const r of ROADS)
      for (let i = 1; i < r.points.length; i++) {
        const [a, b] = [r.points[i - 1], r.points[i]];
        for (let t = 0; t <= 1; t += 0.02) {
          const p = { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t };
          expect(featureBlocks(p, r.width / 2)?.id ?? null, `${r.id} @ ${p.x},${p.y}`).toBeNull();
        }
      }
  });

  it("connects every building door to a road and keeps it walkable", () => {
    for (const b of BUILDINGS) {
      expect(walkable(b.door), `${b.id} door`).toBe(true);
      const nearRoad = ROADS.some((r) =>
        r.points.some(([x, y]) => Math.hypot(x - b.entrance.x, y - b.entrance.y) < 4.5),
      );
      expect(nearRoad, `${b.id} road`).toBe(true);
    }
  });

  it("lets Rivo reach every physical facility and the Rover exit from the spawn", () => {
    expect(walkable(SPAWN)).toBe(true);
    for (const b of BUILDINGS) expect(reachable(SPAWN, b.door), b.id).toBe(true);
    expect(reachable(SPAWN, ROVER_EXIT)).toBe(true);
    expect(reachable(SPAWN, LANDING_ZONE)).toBe(true);
  });

  it("blocks walking through buildings and major terrain", () => {
    for (const b of BUILDINGS)
      expect(
        walkable({
          x: (b.collision.x0 + b.collision.x1) / 2,
          y: (b.collision.y0 + b.collision.y1) / 2,
        }),
      ).toBe(false);
    for (const f of FEATURES) {
      const c =
        f.shape.type === "ellipse"
          ? { x: f.shape.cx, y: f.shape.cy }
          : { x: (f.shape.r.x0 + f.shape.r.x1) / 2, y: (f.shape.r.y0 + f.shape.r.y1) / 2 };
      expect(walkable(c), f.id).toBe(false);
    }
  });

  it("produces paths that never enter a building footprint", () => {
    const path = findPath(SPAWN, buildingForStation("shelter")!.door);
    expect(path.length).toBeGreaterThan(0);
    let prev = SPAWN;
    for (const p of path) {
      for (let t = 0; t <= 1; t += 0.05) {
        const q = { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t };
        for (const b of BUILDINGS) expect(inRect(q, b.collision)).toBe(false);
      }
      prev = p;
    }
  });

  it("binds existing stations without inventing extra buildings", () => {
    for (const id of [
      "command",
      "greenhouse",
      "water",
      "oxygen",
      "solar",
      "shelter",
      "airlock",
    ] as const)
      expect(buildingForStation(id), id).not.toBeNull();
    expect(BUILDINGS.find((b) => b.id === "reactor_core")?.station).toBeNull();
    expect(onRoad(SPAWN)).toBe(true);
  });
});
