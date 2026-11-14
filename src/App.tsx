import { useEffect } from "react";
import { GameProvider, useGame } from "./ui/GameProvider";
import { Stage } from "./ui/Stage";
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
