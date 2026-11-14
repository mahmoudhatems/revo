// 5x5 Jezero terrain grid, coordinates are (col, row). Fixed tiles from the scenario:
// Ice Patch (3,0) and (3,3), Steep Mountain (2,2) and (3,2). Crater positions are AUTHORED:
// final_marstrek_terrain.json was not supplied, so this map is NOT verified against NASA Mars Trek
// (see docs/SCENARIO_DATA_CONFLICTS.md, O-07). Movement costs come from the stage 3 data file.
import { DATA } from "./data";

export type Terrain = "flat" | "ice" | "crater" | "mountain" | "base" | "goal";

export const TERRAIN_VERIFIED = false;

export const TERRAIN_COST: Record<Terrain, number> = {
  flat: DATA.rover.terrainCost.flat,
  base: DATA.rover.terrainCost.flat,
  goal: DATA.rover.terrainCost.flat,
  ice: DATA.rover.terrainCost.ice,
  crater: DATA.rover.terrainCost.crater,
  mountain: DATA.rover.terrainCost.mountain,
};

const special: Record<string, Terrain> = {
  "0,0": "base",
  "4,4": "goal",
  "3,0": "ice",
  "3,3": "ice",
  "2,2": "mountain",
  "3,2": "mountain",
  "0,1": "crater",
  "2,1": "crater",
  "1,3": "crater",
  "2,3": "crater",
};

export function terrainAt(x: number, y: number): Terrain {
  return special[`${x},${y}`] ?? "flat";
}

export const GRID_SIZE = 5;
export const START: [number, number] = [0, 0];
export const GOAL: [number, number] = [4, 4];

export function isAdjacent(a: [number, number], b: [number, number]) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
}

export function neighbors([x, y]: [number, number]): [number, number][] {
  const out: [number, number][] = [];
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < GRID_SIZE && ny < GRID_SIZE) out.push([nx, ny]);
  }
  return out;
}

/** Cheapest route (by move points) from a tile to the Landing Zone. Used by the Robot Scout. */
export function cheapestPath(from: [number, number]): { cost: number; path: [number, number][] } {
  const key = (p: [number, number]) => `${p[0]},${p[1]}`;
  const best = new Map<string, number>([[key(from), 0]]);
  const prev = new Map<string, [number, number]>();
  const queue: [number, [number, number]][] = [[0, from]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [c, p] = queue.shift()!;
    if (p[0] === GOAL[0] && p[1] === GOAL[1]) {
      const path: [number, number][] = [p];
      let k = key(p);
      while (prev.has(k)) {
        const q = prev.get(k)!;
        path.unshift(q);
        k = key(q);
      }
      return { cost: c, path };
    }
    if (c > (best.get(key(p)) ?? Infinity)) continue;
    for (const n of neighbors(p)) {
      const nc = c + TERRAIN_COST[terrainAt(n[0], n[1])];
      if (nc < (best.get(key(n)) ?? Infinity)) {
        best.set(key(n), nc);
        prev.set(key(n), p);
        queue.push([nc, n]);
      }
    }
  }
  return { cost: Infinity, path: [] };
}
