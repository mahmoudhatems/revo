import { STEPS } from "../../game/content";
import { useGame } from "../GameProvider";
import { METER_META } from "../hud/Hud";
import { Icon } from "../components/Icon";
import { Backdrop, Frame, NeilDialog, PixelButton, SegmentMeter, Tag } from "../components/Pixel";
import { fmtBars, meterBars, type MeterId } from "../../game/selectors";
import type { GameState } from "../../game/types";

export function MeterBoard({ s, meters }: { s: GameState; meters: MeterId[] }) {
  return (
    <div className="flex flex-col gap-4">
      {meters.map((m) => {
        const v = meterBars(s, m);
        return (
          <div key={m} className="flex items-center gap-4">
            <Icon name={METER_META[m].icon} size="md" />
            <span className="font-pixel text-[10px] w-[90px]">{METER_META[m].label}</span>
            <SegmentMeter value={v} cell={14} />
            <span className="font-pixel text-[10px] text-muted">
              {m === "power" ? fmtBars(s.power) : fmtBars(v)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const OUTCOME_COLOR = { good: "#55d68b", warn: "#f2c14e", bad: "#f15b5b" };

export function Summary({ phase }: { phase: 1 | 2 }) {
  const { state, dispatch } = useGame();
  const steps = phase === 1 ? ["m1", "m2", "m3", "m4", "m5"] : ["c1", "c2", "c3", "c4", "c5"];
  const decisions = state.decisions.filter((d) => steps.includes(d.step));
  const text =
    phase === 1
      ? "Your 10 setup days are up! Mars storms start tomorrow (Sol 11)!"
      : "You survived the toughest 16 Sols! Only 4 days to go, and tomorrow we prep the Rover!";
  return (
    <div className="absolute left-0 right-0 bottom-0 top-[68px]">
      <Backdrop building="command" dim={0.7} />
      <div className="absolute left-6 top-6 flex items-center gap-4">
        <Icon name="badgeStars" size={60} />
        <div>
          <div className="font-pixel text-[18px] text-orange px-text-shadow">
            {phase === 1 ? "END OF PHASE 1 · SOL 10 REPORT" : "END OF PHASE 2 · SOL 26 REPORT"}
          </div>
          <div className="font-pixel text-[8px] text-muted mt-2">
            {phase === 1 ? "BASE SETUP COMPLETE" : "FIVE CRISES SURVIVED"}
          </div>
        </div>
      </div>
      <Frame className="absolute left-6 top-[100px] w-[540px] p-6">
        <div className="font-pixel text-[10px] text-cyan mb-5">REPORT CARD</div>
        <MeterBoard s={state} meters={["power", "water", "oxygen", "radiation", "readiness"]} />
        {state.safeModeTriggered ? (
          <div className="mt-5">
            <Tag color="#f2c14e">SAFE-MODE CAPSULE WAS USED</Tag>
          </div>
        ) : null}
      </Frame>
      <Frame className="absolute right-6 top-[100px] w-[660px] p-6">
        <div className="font-pixel text-[10px] text-cyan mb-4">YOUR DECISIONS</div>
        <ul className="flex flex-col gap-3">
          {decisions.map((d) => (
            <li key={d.step} className="flex items-center gap-3">
              <span
                className="block w-3 h-3 shrink-0"
                style={{ background: OUTCOME_COLOR[d.outcome] }}
              />
              <span className="font-pixel text-[8px] text-muted w-[86px] shrink-0">
                {STEPS[d.step].code}
              </span>
              <span className="font-pixel text-[9px] leading-relaxed">{d.choiceTitle}</span>
            </li>
          ))}
        </ul>
      </Frame>
      <div className="absolute left-6 right-6 bottom-6 flex items-end gap-6">
        <NeilDialog compact className="flex-1" text={text} />
        <PixelButton
          size="lg"
          icon={phase === 1 ? "dust" : "rover"}
          onClick={() => dispatch({ type: "CONTINUE_SUMMARY" })}
          autoFocus
        >
          {phase === 1 ? "GO TO SLEEP POD" : "PREP THE ROVER"}
        </PixelButton>
      </div>
    </div>
  );
}
