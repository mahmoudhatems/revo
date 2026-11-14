import type { GameState } from "./types";

export const SAVE_KEY = "revo.save.v1";

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function serialize(s: GameState) {
  return JSON.stringify(s);
}

export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as GameState | (Omit<GameState, "version"> & { version: 1 });
    if (!s || typeof s.sol !== "number" || !Array.isArray(s.logbook)) return null;
    if (s.version === 2) return s;
    if (s.version === 1) return migrateV1(s);
    return null;
  } catch {
    return null;
  }
}

export function loadSave(store: StorageLike | undefined = globalThis.localStorage): {
  state: GameState | null;
  corrupt: boolean;
} {
  if (!store) return { state: null, corrupt: false };
  const raw = store.getItem(SAVE_KEY);
  const state = deserialize(raw);
  if (raw && !state) {
    store.removeItem(SAVE_KEY);
    return { state: null, corrupt: true };
  }
  return { state, corrupt: false };
}

export function writeSave(s: GameState, store: StorageLike | undefined = globalThis.localStorage) {
  try {
    store?.setItem(SAVE_KEY, serialize(s));
  } catch {
    // storage full or unavailable: the game keeps running without saving
  }
}

export function clearSave(store: StorageLike | undefined = globalThis.localStorage) {
  store?.removeItem(SAVE_KEY);
}

/** v1 -> v2: add Kid Edition fields with backward-compatible defaults. Progress is kept. */
export function migrateV1(s: Omit<GameState, "version"> & { version: 1 }): GameState {
  const old = s as unknown as Partial<GameState>;
  return {
    ...(s as Omit<GameState, "version">),
    version: 2,
    safeModeLog: old.safeModeLog ?? [],
    finalZero: old.finalZero ?? null,
    // earlier builds restored a safe-mode meter to 1 bar; the record is kept, with the cause unknown
    stickers: old.stickers ?? (s.safeModeTriggered ? ["capsule-camper"] : []),
    lastStickers: [],
    askEarthLeft: old.askEarthLeft ?? 3,
    scoutUsed: old.scoutUsed ?? false,
    glossarySeen: old.glossarySeen ?? [],
    currentCause: "",
  };
}
