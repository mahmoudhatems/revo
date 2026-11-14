import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ASSETS } from "../../game/assets";
import { GLOSSARY, findGlossary, type BuildingId } from "../../game/content";
import { SurfaceCamera } from "../../surface/MarsSurface";
import { focusForStation } from "../../surface/surface";
import { audio } from "../audio";
import { useGame } from "../GameProvider";
import { speak, stopSpeaking } from "../voice";
import { Icon } from "./Icon";

type FrameVariant = "panel" | "neil" | "orange" | "alert" | "warn" | "success" | "inset" | "locked";

export function Frame({
  variant = "panel",
  className = "",
  style,
  children,
  as: Tag = "div",
}: {
  variant?: FrameVariant;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  as?: "div" | "section" | "aside" | "header";
}) {
  const v = variant === "panel" ? "" : `px-frame-${variant}`;
  return (
    <Tag className={`px-frame ${v} ${className}`} style={style}>
      {children}
    </Tag>
  );
}

type BtnVariant = "orange" | "cyan" | "ghost" | "danger" | "success";

export function PixelButton({
  variant = "orange",
  size = "md",
  icon,
  selected,
  className = "",
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: "sm" | "md" | "lg";
  icon?: string;
  selected?: boolean;
}) {
  const v = variant === "orange" ? "" : `px-btn-${variant}`;
  const click = (e: MouseEvent<HTMLButtonElement>) => {
    audio.sfx(variant === "danger" ? "ui_back" : "ui_click");
    onClick?.(e);
  };
  const sz =
    size === "lg"
      ? "text-[13px] px-6 py-3 gap-3 min-h-[52px]"
      : size === "sm"
        ? "text-[9px] px-3 py-2 gap-2 min-h-[40px]"
        : "text-[11px] px-4 py-2 gap-2 min-h-[44px]";
  return (
    <button
      type="button"
      className={`px-btn ${v} ${selected ? "px-btn-selected" : ""} inline-flex items-center justify-center uppercase ${sz} ${className}`}
      {...rest}
      onClick={click}
    >
      {icon ? <Icon name={icon} size={size === "lg" ? "md" : "sm"} /> : null}
      <span>{children}</span>
    </button>
  );
}

export const STATUS_COLOR = { ok: "#55d68b", warning: "#f2c14e", critical: "#f15b5b" } as const;

// MD 0.5: green 4+ (safe), yellow 1-3 (careful), red 0 (emergency).
export function statusOf(bars: number) {
  return bars >= 4 ? "ok" : bars > 0 ? "warning" : "critical";
}

/** 10 square segments, supports half bars. */
export function SegmentMeter({
  value,
  segments = 10,
  cell = 10,
  color,
}: {
  value: number;
  segments?: number;
  cell?: number;
  color?: string;
}) {
  const c = color ?? STATUS_COLOR[statusOf(value)];
  return (
    <div
      className="flex"
      style={{ gap: 2 }}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={segments}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span
            key={i}
            className="relative block bg-[#0b111c]"
            style={{ width: cell, height: cell + 6, boxShadow: "inset 0 0 0 2px #000" }}
          >
            {fill > 0 ? (
              <span
                className="absolute left-[2px] bottom-[2px] top-[2px]"
                style={{
                  width: fill >= 1 ? cell - 4 : Math.round((cell - 4) / 2),
                  background: c,
                  boxShadow: "inset 0 2px 0 0 rgba(255,255,255,0.35)",
                }}
              />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function Typewriter({
  text,
  speed = 22,
  onDone,
}: {
  text: string;
  speed?: number;
  onDone?: () => void;
}) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    setN(0);
    done.current = false;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setN(text.length);
      return;
    }
    const id = window.setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          window.clearInterval(id);
          return v;
        }
        return v + 2;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  useEffect(() => {
    if (n >= text.length && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [n, text.length, onDone]);
  const shown = text.slice(0, n);
  return (
    <span
      onClick={() => setN(text.length)}
      className="cursor-pointer"
      title={n < text.length ? "Click to show all" : undefined}
    >
      {shown}
      {n < text.length ? <span className="anim-blink">_</span> : null}
      <span className="sr-only">{text.slice(n)}</span>
    </span>
  );
}

/** Neil's text with picture-glossary words highlighted (tap to open the picture pop-up). */
export function GlossaryText({ text }: { text: string }) {
  const { setOverlay } = useGame();
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;
  // find earliest match repeatedly
  while (rest.length) {
    let best: { idx: number; len: number; id: string } | null = null;
    for (const g of GLOSSARY) {
      const m = rest.match(new RegExp(g.match.source, "i"));
      if (m && m.index !== undefined && (!best || m.index < best.idx))
        best = { idx: m.index, len: m[0].length, id: g.id };
    }
    if (!best) {
      parts.push(rest);
      break;
    }
    if (best.idx) parts.push(rest.slice(0, best.idx));
    const word = rest.slice(best.idx, best.idx + best.len);
    const id = best.id;
    parts.push(
      <button
        key={key++}
        type="button"
        onClick={() => setOverlay({ kind: "word", id })}
        className="underline decoration-dotted decoration-2 underline-offset-4 text-warning"
        aria-label={`What is ${word}?`}
      >
        {word}
      </button>,
    );
    rest = rest.slice(best.idx + best.len);
  }
  return <>{parts}</>;
}

/** First time a hard word appears, show its picture card right under the bubble (MD 0.2). */
function NewWords({ text }: { text: string }) {
  const { state, dispatch } = useGame();
  const [shown] = useState(() =>
    findGlossary(text)
      .filter((g) => !state.glossarySeen.includes(g.id))
      .slice(0, 2),
  );
  useEffect(() => {
    if (shown.length) dispatch({ type: "SEE_WORDS", ids: shown.map((g) => g.id) });
  }, [shown, dispatch]);
  if (!shown.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {shown.map((g) => (
        <div
          key={g.id}
          className="flex items-center gap-3 bg-[#0b111c] px-3 py-2 anim-pop"
          style={{ boxShadow: "0 0 0 2px #f2c14e" }}
        >
          <Icon name={g.icon} size={30} />
          <div>
            <div className="font-pixel text-[8px] text-warning">NEW WORD: {g.word}</div>
            <div className="text-[16px] leading-tight max-w-[300px]">{g.kid}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SpeakButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={() => { audio.sfx("ui_select"); void speak(text); }}
      className="p-1 hover:bg-surface"
      aria-label="Read aloud"
      title="Read aloud"
    >
      <Icon name="speaker" size={22} />
    </button>
  );
}

export function NeilDialog({
  text,
  offline,
  label = "N.E.I.L.",
  compact,
  typewriter = true,
  className = "",
  children,
  glossary = true,
}: {
  text: string;
  offline?: boolean;
  label?: string;
  compact?: boolean;
  typewriter?: boolean;
  className?: string;
  children?: ReactNode;
  glossary?: boolean;
}) {
  const { settings } = useGame();
  const [typed, setTyped] = useState(!typewriter);
  useEffect(() => {
    setTyped(!typewriter);
    if (settings.voice) void speak(text);
    return () => stopSpeaking();
  }, [text, typewriter, settings.voice]);
  const body = typed ? (
    glossary ? (
      <GlossaryText text={text} />
    ) : (
      text
    )
  ) : (
    <Typewriter text={text} onDone={() => setTyped(true)} />
  );
  if (offline) {
    return (
      <Frame variant="alert" className={`flex gap-3 p-3 ${className}`}>
        <div className="flex flex-col items-center gap-2 shrink-0">
          <Icon name="neilAlert" size={compact ? "lg" : "xxl"} />
          <span className="font-pixel text-[8px] text-danger anim-blink">OFFLINE</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="font-pixel text-[12px] text-danger">SYSTEM MESSAGE</div>
            <SpeakButton text={text} />
          </div>
          <p className={`${compact ? "text-[17px]" : "text-[20px]"} leading-snug text-ink`}>
            {body}
          </p>
          {glossary ? <NewWords text={text} /> : null}
          {children}
        </div>
      </Frame>
    );
  }
  return (
    <Frame variant="neil" className={`flex gap-3 p-3 ${className}`}>
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="bg-[#0b111c] p-2" style={{ boxShadow: "inset 0 0 0 4px #1c7f8c" }}>
          <img
            src={ASSETS.drone}
            alt=""
            className={`pixelated anim-bob ${compact ? "w-10 h-10" : "w-14 h-14"}`}
            draggable={false}
          />
        </div>
        <span className="font-pixel text-[8px] text-cyan">{label}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={`flex-1 ${compact ? "text-[17px]" : "text-[20px]"} leading-snug text-ink`}>
            {body}
          </p>
          <SpeakButton text={text} />
        </div>
        {glossary ? <NewWords text={text} /> : null}
        {children}
      </div>
    </Frame>
  );
}

export function Backdrop({
  building,
  overlay,
  dim = 0.45,
  children,
  className = "",
}: {
  building?: BuildingId;
  /** Kept for call-site compatibility; the surface camera always renders crisp at 1:1. */
  zoom?: number;
  overlay?: string;
  dim?: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <SurfaceCamera focus={focusForStation(building)} zoom={building ? 1 : "cover"} />
      <div className="absolute inset-0" style={{ background: `rgba(16,24,39,${dim})` }} />
      <div className="absolute inset-0 scanlines" />
      {overlay ? <div className={`absolute inset-0 dither-${overlay}`} /> : null}
      {children}
    </div>
  );
}

export function Sprite({
  src,
  h,
  className = "",
  alt = "",
  style,
}: {
  src: string;
  h: number;
  className?: string;
  alt?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ height: h, width: "auto", ...style }}
      className={`pixelated ${className}`}
      draggable={false}
    />
  );
}

/** Cycles through frames using a stepped interval. */
export function AnimSprite({
  frames,
  h,
  fps = 6,
  className = "",
}: {
  frames: string[];
  h: number;
  fps?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % frames.length), 1000 / fps);
    return () => window.clearInterval(id);
  }, [frames.length, fps]);
  return <Sprite src={frames[i]} h={h} className={className} />;
}

// Station sprite sheets (atlas frames from the REVO station generator).
const ATLAS: Record<
  "water" | "solar" | "oxygen",
  { size: [number, number]; frames: Record<string, [number, number, number, number]> }
> = {
  solar: {
    size: [500, 162],
    frames: {
      exterior_building: [14, 14, 168, 132],
      large_solar_panel: [196, 14, 44, 33],
      small_solar_panel: [254, 14, 24, 21],
      connected_solar_panel_array: [292, 14, 98, 34],
      foldable_solar_panel_unit: [404, 14, 54, 33],
      battery_storage_unit: [196, 62, 30, 30],
      large_energy_storage_battery: [240, 62, 46, 36],
      power_inverter: [300, 62, 30, 26],
      electrical_distribution_cabinet: [380, 62, 28, 36],
      electrical_cable_segments: [422, 62, 40, 26],
      power_junction_box: [234, 112, 26, 24],
      solar_panel_cleaning_brush: [334, 112, 16, 36],
      small_power_status_indicator: [404, 112, 14, 24],
    },
  },
  water: {
    size: [500, 168],
    frames: {
      exterior_building: [14, 14, 168, 132],
      closed_loop_water_recycler: [196, 14, 40, 36],
      water_filtration_machine: [250, 14, 36, 32],
      primary_water_storage_tank: [300, 14, 44, 44],
      secondary_water_storage_tank: [358, 14, 30, 30],
      water_pump: [430, 14, 32, 28],
      water_pipe_straight_segment: [244, 72, 32, 10],
      water_pressure_gauge: [448, 72, 22, 28],
      water_quality_monitoring_console: [196, 116, 34, 30],
      wastewater_processing_unit: [314, 116, 46, 38],
      water_recycling_control_panel: [374, 116, 26, 32],
    },
  },
  oxygen: {
    size: [500, 210],
    frames: {
      exterior_building: [14, 14, 168, 132],
      oxygen_generator: [196, 14, 32, 34],
      main_oxygen_production_machine: [242, 14, 50, 42],
      multiple_oxygen_cylinder_rack: [334, 14, 48, 36],
      space_heating_unit: [448, 14, 32, 32],
      thermal_regulation_machine: [196, 70, 38, 34],
      heating_control_panel: [248, 70, 26, 30],
      ventilation_fan: [288, 70, 30, 30],
      insulated_pipes: [436, 70, 34, 14],
      anti_freeze_heating_cable: [196, 118, 34, 18],
      oxygen_monitoring_screen: [364, 118, 30, 28],
      temperature_sensor: [408, 118, 14, 28],
      emergency_heating_module: [14, 162, 32, 34],
    },
  },
};

export function StationSprite({
  sheet,
  frame,
  scale = 3,
  className = "",
  style,
}: {
  sheet: "water" | "solar" | "oxygen";
  frame: string;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const a = ATLAS[sheet];
  const f = a.frames[frame];
  if (!f) return null;
  const [x, y, w, h] = f;
  return (
    <span
      role="img"
      aria-label={frame.replace(/_/g, " ")}
      className={`inline-block pixelated shrink-0 ${className}`}
      style={{
        width: w * scale,
        height: h * scale,
        backgroundImage: `url(${ASSETS.stations[sheet]})`,
        backgroundSize: `${a.size[0] * scale}px ${a.size[1] * scale}px`,
        backgroundPosition: `-${x * scale}px -${y * scale}px`,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}

export function Modal({
  children,
  onClose,
  label,
  width = 760,
  variant = "orange",
}: {
  children: ReactNode;
  onClose?: () => void;
  label: string;
  width?: number;
  variant?: FrameVariant;
}) {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)]"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className="absolute inset-0 dither-dark" onClick={onClose} />
      <Frame
        variant={variant}
        className="relative anim-pop p-5 max-h-[calc(100%-32px)] overflow-auto"
        style={{ width, maxWidth: "calc(100% - 32px)" }}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 p-1"
            aria-label="Close"
          >
            <Icon name="close" size="md" />
          </button>
        ) : null}
        {children}
      </Frame>
    </div>
  );
}

export function Tag({
  children,
  color = "#36d6e8",
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-pixel text-[8px] px-2 py-1 inline-block ${className}`}
      style={{ color: "#000", background: color, boxShadow: "0 2px 0 0 #000" }}
    >
      {children}
    </span>
  );
}

export const LABEL_COLOR: Record<string, string> = {
  "NASA FACT": "#36d6e8",
  "REVO MISSION EVENT": "#f28c28",
  "GAME SIMULATION": "#f2c14e",
};
