import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { StepId } from "../../game/types";
import { Icon } from "./Icon";
import { Frame, PixelButton } from "./Pixel";

export type MiniSpec =
  | { kind: "drag"; count: number; item: string; slot: string; label: string }
  | { kind: "hold"; label: string; button: string; ms?: number }
  | { kind: "tap"; count: number; label: string; icon: string; button: string }
  | { kind: "spin"; label: string }
  | { kind: "swipe"; label: string; count?: number; bigArrow?: boolean };

/** Mini-games from the Kid Edition scenario, per step and card. */
export function miniFor(
  step: StepId,
  card: string,
  opts: { fitness?: boolean; junior?: boolean } = {},
): MiniSpec[] {
  switch (step) {
    case "m1": {
      const n = { emergency: 1, basic: 2, medium: 3, giant: 4 }[card] ?? 1;
      return [
        {
          kind: "drag",
          count: n,
          item: "panel",
          slot: "panel",
          label: `Drag ${n} solar panel${n > 1 ? "s" : ""} onto the glowing slots.`,
        },
      ];
    }
    case "m2":
      if (card === "tank")
        return [
          { kind: "spin", label: "Spin the valve all the way round until the dial turns green." },
        ];
      return [
        {
          kind: "drag",
          count: 2,
          item: "pipe",
          slot: "pipe",
          label: "Drag the pipes from the machine to the tank.",
        },
        { kind: "spin", label: "Spin the valve all the way round until the dial turns green." },
      ];
    case "m4":
      if (card === "hull") return [];
      if (card === "soil")
        return [
          {
            kind: "tap",
            count: 3,
            icon: "soil",
            button: "ROBOT: DROP DIRT",
            label: "Tap the Robot remote to pile Mars dirt blocks on the roof.",
          },
        ];
      if (card === "water")
        return [
          {
            kind: "drag",
            count: 3,
            item: "drop",
            slot: "watershield",
            label: "Drag the blue water bags into the wall slots.",
          },
        ];
      return [
        {
          kind: "drag",
          count: 3,
          item: "drop",
          slot: "watershield",
          label: "Drag the blue water bags into the wall slots.",
        },
        {
          kind: "tap",
          count: 3,
          icon: "soil",
          button: "ROBOT: DROP DIRT",
          label: "Now tap the Robot remote to pile dirt on the roof.",
        },
      ];
    case "m5": {
      const out: MiniSpec[] = [];
      if (card !== "none") {
        out.push({
          kind: "tap",
          count: 3,
          icon: "plant",
          button: "DROP SEEDS",
          label: "Tap the soil mounds to drop the seeds.",
        });
        out.push({
          kind: "swipe",
          label: "Drag the watering nozzle across the bed until the purple LEDs switch on.",
        });
      }
      if (opts.fitness || card === "CR04")
        out.push({
          kind: "tap",
          count: 5,
          icon: "gym",
          button: "WORKOUT",
          label: "Gym bonus: tap the workout button 5 times in rhythm.",
        });
      return out;
    }
    case "c1":
      if (card === "hibernate")
        return [
          {
            kind: "tap",
            count: 3,
            icon: "moon",
            button: "SWITCH OFF",
            label: "Flip down the extra switches. The base turns calm blue.",
          },
        ];
      if (card === "clean")
        return [
          {
            kind: "swipe",
            count: 3,
            label: "Swipe the Robot's air brushes across the dusty panels until they sparkle.",
          },
        ];
      return [
        { kind: "hold", button: "LOCK AT 100%", label: "Hold the power sliders locked at 100%." },
      ];
    case "c3":
      return [
        {
          kind: "swipe",
          bigArrow: opts.junior,
          label: "Swipe the heavy hatch lever to lock the doors!",
        },
      ];
    case "c5":
      if (card === "recovery")
        return [
          {
            kind: "tap",
            count: 6,
            icon: "gym",
            button: "WORKOUT",
            label: "Tap the workout button 6 times in rhythm under the blue sleepy light.",
          },
        ];
      if (card === "airvalves")
        return [
          { kind: "spin", label: "Spin the green Fresh-Air Valve to send oxygen across the base." },
        ];
      return [];
    default:
      return [];
  }
}

export const PREP_TASKS: Partial<Record<StepId, MiniSpec[]>> = {
  m3: [
    {
      kind: "hold",
      button: "HEAT TO 800°C",
      label: "Press and HOLD the heat button until the needle reaches the orange zone.",
      ms: 2600,
    },
  ],
  c2: [
    {
      kind: "drag",
      count: 3,
      item: "flame",
      slot: "snow",
      label: "Drag the orange heating coils onto the 3 frozen pipe joints.",
    },
  ],
};

/** Runs a list of mini-games, starting with the USE button (MD 0.1 step 2). */
export function MiniGameRunner({
  steps,
  onDone,
  title,
  autoStart = false,
}: {
  steps: MiniSpec[];
  onDone: () => void;
  title: string;
  autoStart?: boolean;
}) {
  const [started, setStarted] = useState(autoStart);
  const [i, setI] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    if (!steps.length && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [steps.length, onDone]);
  const next = () => {
    if (i + 1 >= steps.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        window.setTimeout(onDone, 350);
      }
    } else setI(i + 1);
  };
  if (!steps.length) return null;
  const spec = steps[i];
  return (
    <Frame variant="orange" className="relative p-6 flex flex-col gap-4" style={{ width: 820 }}>
      <div className="flex items-center justify-between">
        <div className="font-pixel text-[12px] text-orange">{title}</div>
        <div className="font-pixel text-[8px] text-muted">
          TASK {i + 1} / {steps.length}
        </div>
      </div>
      <p className="text-[22px] leading-snug">{spec.label}</p>
      {!started ? (
        <div className="flex justify-end">
          <PixelButton
            size="lg"
            variant="success"
            icon="arrow"
            onClick={() => setStarted(true)}
            autoFocus
            aria-label="Use"
          >
            USE
          </PixelButton>
        </div>
      ) : (
        <div key={i} className="anim-fade-in">
          {spec.kind === "drag" ? <DragGame spec={spec} onDone={next} /> : null}
          {spec.kind === "hold" ? <HoldGame spec={spec} onDone={next} /> : null}
          {spec.kind === "tap" ? <TapGame spec={spec} onDone={next} /> : null}
          {spec.kind === "spin" ? <SpinGame onDone={next} /> : null}
          {spec.kind === "swipe" ? <SwipeGame spec={spec} onDone={next} /> : null}
        </div>
      )}
    </Frame>
  );
}

function useDoneOnce(done: boolean, onDone: () => void) {
  const fired = useRef(false);
  useEffect(() => {
    if (done && !fired.current) {
      fired.current = true;
      onDone();
    }
  }, [done, onDone]);
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="font-pixel text-[12px] text-success anim-pop">CLICK! DONE</span>
  ) : null;
}

// ----- drag & snap -----
function DragGame({
  spec,
  onDone,
}: {
  spec: Extract<MiniSpec, { kind: "drag" }>;
  onDone: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(spec.count).fill(null)); // item -> slot
  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const all = placed.every((p) => p !== null);
  useDoneOnce(all, onDone);
  const scale = () => {
    const el = box.current;
    return el ? el.getBoundingClientRect().width / el.offsetWidth : 1;
  };
  const freeSlot = (exclude?: number) =>
    Array.from({ length: spec.count }, (_, k) => k).find(
      (k) => !placed.includes(k) && k !== exclude,
    );
  const place = (item: number, slot: number) =>
    setPlaced((p) => p.map((v, k) => (k === item ? slot : v)));
  const onDown = (i: number) => (e: RPointerEvent) => {
    if (placed[i] !== null) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const r = box.current!.getBoundingClientRect();
    const sc = scale();
    setDrag({ i, x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc });
  };
  const onMove = (e: RPointerEvent) => {
    if (!drag) return;
    const r = box.current!.getBoundingClientRect();
    const sc = scale();
    setDrag({ ...drag, x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc });
  };
  const onUp = (e: RPointerEvent) => {
    if (!drag) return;
    const hit = slotRefs.current.findIndex((el, k) => {
      if (!el || placed.includes(k)) return false;
      const b = el.getBoundingClientRect();
      return (
        e.clientX >= b.left - 20 &&
        e.clientX <= b.right + 20 &&
        e.clientY >= b.top - 20 &&
        e.clientY <= b.bottom + 20
      );
    });
    if (hit >= 0) place(drag.i, hit);
    setDrag(null);
  };
  return (
    <div
      ref={box}
      className="relative h-[230px] bg-[#0b111c] select-none touch-none"
      style={{ boxShadow: "inset 0 0 0 4px #24344a" }}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <div className="absolute left-0 right-0 top-6 flex justify-center gap-6">
        {Array.from({ length: spec.count }).map((_, k) => {
          const item = placed.indexOf(k);
          return (
            <div
              key={k}
              ref={(el) => void (slotRefs.current[k] = el)}
              className={`w-[84px] h-[84px] flex items-center justify-center ${item < 0 ? "anim-blink" : ""}`}
              style={{ boxShadow: `inset 0 0 0 4px ${item >= 0 ? "#55d68b" : "#f2c14e"}` }}
            >
              {item >= 0 ? (
                <Icon name={spec.item} size={60} className="anim-pop" />
              ) : (
                <Icon name={spec.slot} size={40} className="opacity-30" />
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute left-0 right-0 bottom-4 flex justify-center gap-6">
        {Array.from({ length: spec.count }).map((_, i) => (
          <button
            key={i}
            type="button"
            onPointerDown={onDown(i)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && placed[i] === null) {
                e.preventDefault();
                const f = freeSlot();
                if (f !== undefined) place(i, f);
              }
            }}
            className={`w-[72px] h-[72px] flex items-center justify-center bg-surface cursor-grab ${placed[i] !== null ? "opacity-0 pointer-events-none" : ""}`}
            style={{ boxShadow: "0 4px 0 #000", visibility: drag?.i === i ? "hidden" : "visible" }}
            aria-label={`Drag item ${i + 1} to a slot (or press Enter)`}
          >
            <Icon name={spec.item} size={52} />
          </button>
        ))}
      </div>
      {drag ? (
        <div
          className="absolute pointer-events-none"
          style={{ left: drag.x - 36, top: drag.y - 36 }}
        >
          <Icon name={spec.item} size={72} />
        </div>
      ) : null}
      <div className="absolute right-3 bottom-3">
        <Check ok={all} />
      </div>
    </div>
  );
}

// ----- hold -----
function HoldGame({
  spec,
  onDone,
}: {
  spec: Extract<MiniSpec, { kind: "hold" }>;
  onDone: () => void;
}) {
  const [p, setP] = useState(0);
  const [holding, setHolding] = useState(false);
  const total = spec.ms ?? 2000;
  useEffect(() => {
    if (!holding || p >= 1) return;
    const id = window.setInterval(() => setP((v) => Math.min(1, v + 100 / total)), 100);
    return () => window.clearInterval(id);
  }, [holding, p, total]);
  useDoneOnce(p >= 1, onDone);
  const cells = 12;
  return (
    <div className="flex items-center gap-6">
      <button
        type="button"
        className={`px-btn ${p >= 1 ? "px-btn-success" : ""} px-6 py-5 text-[14px] min-w-[300px] touch-none`}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setHolding(true);
          }
        }}
        onKeyUp={() => setHolding(false)}
        aria-label={`${spec.button}: press and hold`}
      >
        {holding ? "HOLDING..." : `HOLD: ${spec.button}`}
      </button>
      <div className="flex" style={{ gap: 3 }} aria-hidden>
        {Array.from({ length: cells }).map((_, i) => (
          <span
            key={i}
            className="block w-[26px] h-[40px]"
            style={{
              background:
                i < Math.round(p * cells)
                  ? i >= cells - 3
                    ? "#f28c28"
                    : "#f2c14e"
                  : i >= cells - 3
                    ? "#3a2410"
                    : "#0b111c",
              boxShadow: "inset 0 0 0 2px #000",
            }}
          />
        ))}
      </div>
      <Check ok={p >= 1} />
    </div>
  );
}

// ----- rhythm taps -----
function TapGame({
  spec,
  onDone,
}: {
  spec: Extract<MiniSpec, { kind: "tap" }>;
  onDone: () => void;
}) {
  const [n, setN] = useState(0);
  const [beat, setBeat] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setBeat((b) => !b), 500);
    return () => window.clearInterval(id);
  }, []);
  useDoneOnce(n >= spec.count, onDone);
  return (
    <div className="flex items-center gap-6">
      <button
        type="button"
        className="px-btn px-btn-cyan flex items-center gap-3 px-6 py-5 text-[14px]"
        onClick={() => setN((v) => Math.min(spec.count, v + 1))}
        disabled={n >= spec.count}
        autoFocus
      >
        <Icon name={spec.icon} size={36} className={beat ? "" : "translate-y-1"} />
        {spec.button}
      </button>
      <div className="flex gap-2" aria-label={`${n} of ${spec.count}`}>
        {Array.from({ length: spec.count }).map((_, i) => (
          <span
            key={i}
            className="block w-[24px] h-[24px]"
            style={{
              background: i < n ? "#55d68b" : "#0b111c",
              boxShadow: "inset 0 0 0 2px #000, 0 0 0 2px #24344a",
            }}
          />
        ))}
      </div>
      <Check ok={n >= spec.count} />
    </div>
  );
}

// ----- valve spin -----
function SpinGame({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [deg, setDeg] = useState(0);
  const last = useRef<number | null>(null);
  const done = deg >= 360;
  useDoneOnce(done, onDone);
  const angle = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return (
      (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) /
      Math.PI
    );
  };
  const onMove = (e: RPointerEvent) => {
    if (last.current === null || done) return;
    const a = angle(e);
    let d = a - last.current;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    last.current = a;
    setDeg((v) => Math.max(0, v + Math.abs(d)));
  };
  return (
    <div className="flex items-center gap-8">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Valve: drag in a circle, or press the right arrow"
        aria-valuenow={Math.round(Math.min(360, deg))}
        aria-valuemin={0}
        aria-valuemax={360}
        className="relative w-[170px] h-[170px] touch-none cursor-grab"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          last.current = angle(e);
        }}
        onPointerMove={onMove}
        onPointerUp={() => (last.current = null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === " ") {
            e.preventDefault();
            setDeg((v) => v + 45);
          }
        }}
      >
        <div
          className="absolute inset-0"
          style={{ transform: `rotate(${Math.round(deg / 15) * 15}deg)` }}
        >
          <div
            className="absolute inset-[10px] bg-danger"
            style={{ boxShadow: "inset 0 0 0 8px #a3323a, 0 0 0 4px #000" }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[20px] bg-[#a3323a]"
            style={{ boxShadow: "0 0 0 4px #000" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[20px] bg-[#a3323a]"
            style={{ boxShadow: "0 0 0 4px #000" }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px] bg-dgray"
            style={{ boxShadow: "0 0 0 4px #000" }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="font-pixel text-[10px] text-muted">PRESSURE</span>
        <div className="flex" style={{ gap: 3 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="block w-[22px] h-[30px]"
              style={{
                background:
                  i < Math.floor((Math.min(360, deg) / 360) * 8)
                    ? done
                      ? "#55d68b"
                      : "#f2c14e"
                    : "#0b111c",
                boxShadow: "inset 0 0 0 2px #000",
              }}
            />
          ))}
        </div>
        <Check ok={done} />
      </div>
    </div>
  );
}

// ----- swipe lever / brush / nozzle -----
function SwipeGame({
  spec,
  onDone,
}: {
  spec: Extract<MiniSpec, { kind: "swipe" }>;
  onDone: () => void;
}) {
  const need = spec.count ?? 1;
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [count, setCount] = useState(0);
  const [drag, setDrag] = useState(false);
  useDoneOnce(count >= need, onDone);
  const toX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };
  const finish = (v: number) => {
    if (v >= 0.9) {
      setCount((c) => c + 1);
      setX(0);
    }
  };
  return (
    <div className="flex items-center gap-6">
      <div
        ref={track}
        className="relative w-[520px] h-[70px] bg-[#0b111c] touch-none"
        style={{ boxShadow: "inset 0 0 0 4px #24344a" }}
        onPointerMove={(e) => drag && setX(toX(e.clientX))}
        onPointerUp={() => {
          setDrag(false);
          finish(x);
          if (x < 0.9) setX(0);
        }}
      >
        <div className="absolute right-3 top-1/2 -translate-y-1/2 font-pixel text-[8px] text-success">
          LOCK
        </div>
        {spec.bigArrow ? (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 anim-bob">
            <Icon name="arrow" size={50} />
          </div>
        ) : null}
        <button
          type="button"
          className="absolute top-[7px] w-[90px] h-[56px] px-btn px-btn-cyan text-[10px] cursor-grab"
          style={{ left: `calc(${x * 100}% * (430 / 520))` }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setDrag(true);
          }}
          onPointerMove={(e) => drag && setX(toX(e.clientX))}
          onPointerUp={() => {
            setDrag(false);
            finish(x);
            if (x < 0.9) setX(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
              e.preventDefault();
              setX((v) => {
                const n = Math.min(1, v + 0.34);
                if (n >= 0.9) {
                  setCount((c) => c + 1);
                  return 0;
                }
                return n;
              });
            }
          }}
          autoFocus
          aria-label="Swipe right (or press the right arrow)"
        >
          {">>"}
        </button>
      </div>
      {need > 1 ? (
        <span className="font-pixel text-[10px]">
          {count}/{need}
        </span>
      ) : null}
      <Check ok={count >= need} />
    </div>
  );
}
