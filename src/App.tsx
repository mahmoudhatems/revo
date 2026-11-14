import { useEffect, useMemo } from "react";
import { audio, type MusicTrack } from "./ui/audio";
import { GameProvider, useGame } from "./ui/GameProvider";
import { Stage } from "./ui/Stage";
import { DustStorm } from "./fx/DustStorm";
import { STEP_ORDER } from "./game/content";
import { CrisisBanner, Hud } from "./ui/hud/Hud";
import {
  AlertModal,
  HelperPanels,
  HowToPlay,
  StickerAlbum,
  WordPopup,
  Logbook,
  MeterDetail,
  Pause,
  StationPanel,
} from "./ui/overlays/Overlays";
import { Briefing } from "./ui/screens/Briefing";
import { Decision, Install } from "./ui/screens/Decision";
import { Fuse } from "./ui/screens/Fuse";
import { HubMap } from "./ui/screens/HubMap";
import { Result, Sleep } from "./ui/screens/Result";
import { Ending, Finale, Report, RoverGrid, RoverLaunch, RoverPrep } from "./ui/screens/Rover";
import { Summary } from "./ui/screens/Summary";
import { Title } from "./ui/screens/Title";

function Screen() {
  const { state } = useGame();
  switch (state.screen) {
    case "title":
      return <Title />;
    case "hub":
      return <HubMap />;
    case "briefing":
      return <Briefing />;
    case "install":
      return <Install />;
    case "decision":
      return <Decision key={state.stepIndex} />;
    case "fuse":
      return <Fuse />;
    case "result":
      return <Result />;
    case "sleep":
      return <Sleep />;
    case "summary1":
      return <Summary phase={1} />;
    case "summary2":
      return <Summary phase={2} />;
    case "roverPrep":
      return <RoverPrep />;
    case "roverLaunch":
      return <RoverLaunch />;
    case "roverGrid":
      return <RoverGrid />;
    case "finale":
      return <Finale />;
    case "ending":
      return <Ending />;
    case "report":
      return <Report />;
  }
}

function Game() {
  const { state, overlay, setOverlay } = useGame();
  const playing = state.screen !== "title";
  // MD fx 2.0: storm intensity follows the existing Dust Storm crisis (c1 "Opportunity", Sol 11-13)
  // phase progression only - no new gameplay rules. ?storm=0..1 forces a level for
  // testing/screenshots.
  const storm = useMemo(() => {
    const qs = new URLSearchParams(window.location.search).get("storm");
    if (qs !== null && qs !== "") {
      const v = parseFloat(qs);
      if (!Number.isNaN(v)) return Math.max(0, Math.min(1, v));
    }
    if (STEP_ORDER[state.stepIndex] !== "c1") return 0;
    switch (state.screen) {
      case "briefing":
        return 0.3; // Phase A - approaching
      case "decision":
      case "install":
        return 0.65; // Phase B - full storm around the solar station
      case "result":
        // peak while N.E.I.L. reacts; the chosen path shapes how the storm reads.
        // Hibernation = darker/heavier, Robot Sweep = storm losing its grip.
        return state.lastChoice === "fullops" ? 0.85 : state.lastChoice === "clean" ? 0.75 : 0.8;
      case "sleep":
        return 0.35; // night under the storm
      case "hub":
        return 0.5; // storm days outside between actions
      default:
        return 0; // Phase C - the eased drop back to 0 is the clearing
    }
  }, [state.stepIndex, state.screen, state.lastChoice]);
  useEffect(() => {
    const s = state.screen;
    let track: MusicTrack = "colony";
    if (s === "briefing" || s === "install" || s === "decision" || s === "result" || s === "sleep") track = "mission";
    else if (s === "fuse") track = "crisis";
    else if (s === "roverPrep" || s === "roverLaunch" || s === "roverGrid") track = "rover";
    audio.setMusic(track);
  }, [state.screen]);
  const close = () => setOverlay(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!playing) return;
      if (
        (e.key === "Escape" || e.key === "p" || e.key === "P") &&
        !overlay &&
        !state.alerts.length
      ) {
        e.preventDefault();
        setOverlay({ kind: "pause" });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [playing, overlay, setOverlay, state.alerts.length]);

  return (
    <Stage>
      <Screen />
      <DustStorm
        level={storm}
        onGust={(hard) => audio.sfx(hard ? "gust_hard" : "wind_gust", 0.7)}
        onLevel={(x) => audio.setWind(x)}
      />
      {playing && state.screen !== "sleep" ? <Hud /> : null}
      {playing ? <CrisisBanner /> : null}
      {overlay?.kind === "logbook" ? <Logbook onClose={close} /> : null}
      {overlay?.kind === "pause" ? <Pause onClose={close} /> : null}
      {overlay?.kind === "howto" ? <HowToPlay onClose={close} /> : null}
      {overlay?.kind === "meter" ? <MeterDetail id={overlay.id} onClose={close} /> : null}
      {overlay?.kind === "station" ? <StationPanel id={overlay.id} onClose={close} /> : null}
      {overlay?.kind === "stickers" ? <StickerAlbum onClose={close} /> : null}
      {overlay?.kind === "word" ? <WordPopup id={overlay.id} onClose={close} /> : null}
      {playing && state.screen !== "sleep" ? <HelperPanels /> : null}
      {playing && !overlay ? <AlertModal /> : null}
    </Stage>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
