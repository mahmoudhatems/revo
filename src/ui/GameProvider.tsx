import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialState, reduce, type Action } from "../game/engine";
import { clearSave, loadSave, writeSave } from "../game/save";
import type { GameState } from "../game/types";
import type { BuildingId } from "../game/content";
import type { MeterId } from "../game/selectors";

export type OverlayState =
  | { kind: "logbook" }
  | { kind: "pause" }
  | { kind: "howto" }
  | { kind: "stickers" }
  | { kind: "meter"; id: MeterId }
  | { kind: "station"; id: BuildingId }
  | { kind: "word"; id: string }
  | null;

/** Player settings live outside the game save so they carry over to new games. */
export interface Settings {
  junior: boolean; // MD: Junior Mode (20 s flare timer, bouncing lever arrow)
  voice: boolean; // MD 0.2: read every bubble aloud
}
const SETTINGS_KEY = "revo.settings.v1";
function loadSettings(): Settings {
  try {
    const s = JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY) ?? "null");
    if (s && typeof s.junior === "boolean" && typeof s.voice === "boolean") return s;
  } catch {
    // ignore
  }
  return { junior: false, voice: true };
}

/** Floating helper panels that must NOT pause the Crisis 3 timer. */
export type HelperPanel =
  | { kind: "earth"; startedAt: number; tip: string }
  | { kind: "neil"; text: string }
  | null;

interface Ctx {
  state: GameState;
  dispatch: (a: Action) => void;
  overlay: OverlayState;
  setOverlay: (o: OverlayState) => void;
  helper: HelperPanel;
  setHelper: (h: HelperPanel) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  saved: GameState | null;
  corruptSave: boolean;
  startNew: () => void;
  continueSave: () => void;
  toTitle: () => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => loadSave(), []);
  const [saved, setSaved] = useState<GameState | null>(initial.state);
  const [state, dispatch] = useReducer(reduce, undefined, () => ({
    ...createInitialState(),
    screen: "title" as const,
  }));
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [helper, setHelper] = useState<HelperPanel>(null);
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const lastKey = useRef("");

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    try {
      globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      // ignore
    }
  }, []);

  // Autosave at screen / step boundaries.
  useEffect(() => {
    if (state.screen === "title") return;
    const key = `${state.screen}:${state.stepIndex}:${state.sol}:${state.logbook.length}:${state.roverPath.length}:${state.alerts.length}:${state.askEarthLeft}:${state.scoutUsed}:${state.glossarySeen.length}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    writeSave(state);
    setSaved(state);
  }, [state]);

  // Neil hints belong to one screen. An Earth reply stays while the player moves from the
  // briefing to the decision of the same step, and closes when the step's result appears.
  const helperStep = useRef(state.stepIndex);
  useEffect(() => {
    const keepEarth =
      helperStep.current === state.stepIndex &&
      ["briefing", "install", "decision", "fuse", "roverPrep", "roverLaunch", "roverGrid"].includes(
        state.screen,
      );
    helperStep.current = state.stepIndex;
    setHelper((h) => (h?.kind === "earth" && keepEarth ? h : null));
  }, [state.screen, state.stepIndex]);

  const startNew = useCallback(() => {
    clearSave();
    setOverlay(null);
    setHelper(null);
    dispatch({ type: "NEW_GAME" });
  }, []);
  const continueSave = useCallback(() => {
    if (!saved) return;
    setOverlay(null);
    dispatch({ type: "LOAD", state: saved });
  }, [saved]);
  const toTitle = useCallback(() => {
    setOverlay(null);
    setHelper(null);
    dispatch({ type: "GO_TITLE" });
  }, []);

  const value: Ctx = {
    state,
    dispatch,
    overlay,
    setOverlay,
    helper,
    setHelper,
    settings,
    setSettings,
    saved,
    corruptSave: initial.corrupt,
    startNew,
    continueSave,
    toTitle,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside GameProvider");
  return c;
}
