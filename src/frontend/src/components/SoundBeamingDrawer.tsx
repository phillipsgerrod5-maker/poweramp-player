/**
 * SoundBeamingDrawer — Full-page slide-in drawer for Sound Beaming + VR Bubble.
 * Completely self-contained. Overlays the entire screen from the right.
 * Hidden inside the Stabilizer → Engine 1. Credits never see this.
 * Volume follows Gerrod's player volume — NO separate volume control here.
 *
 * Contains all 6 sections:
 *   1. Main Switches
 *   2. Room Setup
 *   3. VR Controls (visible when VR MODE on)
 *   4. Beam Status (real indicators)
 *   5. Personal Bubble Specs
 *   6. Works On
 *
 * Auto-saves all settings. Escape / backdrop to close.
 */

import { getSharedAnalyser, getSharedCtx } from "@/hooks/usePlayer";
import {
  Activity,
  Circle,
  Radio,
  Smartphone,
  Speaker,
  Volume2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type VrEffect =
  | "fly-past"
  | "behind-sweep"
  | "height-effects"
  | "environmental";
type DepthZone = "near" | "mid" | "far";

interface BeamSettings {
  beamEnabled: boolean;
  groupMode: boolean;
  wallMapping: boolean;
  vrEnabled: boolean;
  bubbleSeal: boolean;
  roomWidth: number; // 1–20 feet
  listenerHeight: number; // 5–7 feet
  listenerCount: number; // 1–8
  beamStrength: number; // 0–100
  vrDepth: number; // 0–100
  vrEffects: VrEffect[];
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const KEYS = {
  beamEnabled: "poweramp_beam_enabled",
  groupMode: "poweramp_beam_group",
  wallMapping: "poweramp_beam_walls",
  vrEnabled: "poweramp_beam_vr",
  bubbleSeal: "poweramp_beam_bubble",
  roomWidth: "poweramp_beam_width",
  listenerHeight: "poweramp_beam_height",
  listenerCount: "poweramp_beam_listeners",
  beamStrength: "poweramp_beam_strength",
  vrDepth: "poweramp_beam_vr_depth",
  vrEffects: "poweramp_beam_vr_effects",
} as const;

function loadSettings(): BeamSettings {
  const bool = (key: string, def: boolean) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? v === "true" : def;
    } catch {
      return def;
    }
  };
  const num = (key: string, def: number) => {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? Number(v) : def;
    } catch {
      return def;
    }
  };
  const arr = (key: string): VrEffect[] => {
    try {
      const v = localStorage.getItem(key);
      if (v) return JSON.parse(v) as VrEffect[];
    } catch {
      /* ignore */
    }
    return ["fly-past", "environmental"];
  };
  return {
    beamEnabled: bool(KEYS.beamEnabled, false),
    groupMode: bool(KEYS.groupMode, false),
    wallMapping: bool(KEYS.wallMapping, true),
    vrEnabled: bool(KEYS.vrEnabled, false),
    bubbleSeal: bool(KEYS.bubbleSeal, true),
    roomWidth: num(KEYS.roomWidth, 12),
    listenerHeight: num(KEYS.listenerHeight, 6),
    listenerCount: num(KEYS.listenerCount, 1),
    beamStrength: num(KEYS.beamStrength, 70),
    vrDepth: num(KEYS.vrDepth, 50),
    vrEffects: arr(KEYS.vrEffects),
  };
}

function saveSetting<K extends keyof typeof KEYS>(
  key: K,
  value: unknown,
): void {
  try {
    if (Array.isArray(value)) {
      localStorage.setItem(KEYS[key], JSON.stringify(value));
    } else {
      localStorage.setItem(KEYS[key], String(value));
    }
  } catch {
    /* ignore */
  }
}

// ─── Audio engine node container ──────────────────────────────────────────────
// These nodes are singleton — built once and kept alive

interface BeamAudioNodes {
  splitGain: GainNode;
  bassLowpass: BiquadFilterNode;
  bassGain: GainNode;
  midsBandpass: BiquadFilterNode;
  midsPanner: PannerNode;
  highsHighpass: BiquadFilterNode;
  highsPanner: PannerNode;
  bubbleConvolver: ConvolverNode;
  bubbleGain: GainNode;
  roomConvolver: ConvolverNode;
  roomGain: GainNode;
  outputGain: GainNode;
  inserted: boolean;
  irLoaded: boolean;
}

let beamAudio: BeamAudioNodes | null = null;
let beamIsInserted = false;

/** Generate a programmatic impulse response for the personal bubble (short, 360° enclosed) */
function genBubbleIR(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 0.25); // 250ms — tight sealed space
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Fast decay with slight early reflection pattern
      const t = i / sr;
      const decay = Math.exp(-18 * t);
      // Slight modulation for 360° character
      const mod = ch === 0 ? Math.cos(t * 600) : Math.sin(t * 580);
      data[i] = (Math.random() * 2 - 1) * decay * (0.8 + mod * 0.2);
    }
  }
  return buf;
}

/** Generate room wall IR (longer decay — 20ft room simulation) */
function genRoomIR(ctx: AudioContext, widthFt: number): AudioBuffer {
  const sr = ctx.sampleRate;
  // Longer room = longer decay
  const decayS = 0.5 + (widthFt / 20) * 0.7; // 0.5–1.2s
  const len = Math.floor(sr * decayS);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      // Early reflections (0–40ms) then diffuse reverb tail
      const earlyMult = t < 0.04 ? 1.0 : Math.exp(-4.0 * (t - 0.04));
      const earlyBlank = t < 0.002 ? 0 : 1;
      data[i] =
        (Math.random() * 2 - 1) *
        earlyMult *
        earlyBlank *
        0.3 *
        (ch === 0 ? 1 : 0.92);
    }
  }
  return buf;
}

function buildBeamAudio(ctx: AudioContext): BeamAudioNodes {
  // ── Split input
  const splitGain = ctx.createGain();
  splitGain.gain.value = 1.0;

  // ── Bass: lowpass → omnidirectional (bass never beams, fills room)
  const bassLowpass = ctx.createBiquadFilter();
  bassLowpass.type = "lowpass";
  bassLowpass.frequency.value = 80;
  bassLowpass.Q.value = 0.7;

  const bassGain = ctx.createGain();
  bassGain.gain.value = 1.0;

  // ── Mids: bandpass → HRTF PannerNode
  const midsBandpass = ctx.createBiquadFilter();
  midsBandpass.type = "bandpass";
  midsBandpass.frequency.value = 1000;
  midsBandpass.Q.value = 0.45; // wide: covers ~200Hz–4kHz

  const midsPanner = ctx.createPanner();
  midsPanner.panningModel = "HRTF";
  midsPanner.distanceModel = "inverse";
  midsPanner.refDistance = 1;
  midsPanner.maxDistance = 20;
  midsPanner.rolloffFactor = 0.6;
  midsPanner.positionX.value = 0;
  midsPanner.positionY.value = 0;
  midsPanner.positionZ.value = -2;

  // ── Highs: highpass → HRTF PannerNode (tighter beam)
  const highsHighpass = ctx.createBiquadFilter();
  highsHighpass.type = "highpass";
  highsHighpass.frequency.value = 4000;
  highsHighpass.Q.value = 0.5;

  const highsPanner = ctx.createPanner();
  highsPanner.panningModel = "HRTF";
  highsPanner.distanceModel = "inverse";
  highsPanner.refDistance = 1;
  highsPanner.maxDistance = 20;
  highsPanner.rolloffFactor = 1.1; // tighter — highs stay focused on listener
  highsPanner.positionX.value = 0;
  highsPanner.positionY.value = 0;
  highsPanner.positionZ.value = -2;

  // ── Personal bubble convolver (programmatic IR — sealed space)
  const bubbleConvolver = ctx.createConvolver();
  const bubbleGain = ctx.createGain();
  bubbleGain.gain.value = 0.3; // subtle — enhances not overwhelms

  // ── Room wall convolver (front room reflections)
  const roomConvolver = ctx.createConvolver();
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0.22;

  // ── Output mix gain
  const outputGain = ctx.createGain();
  outputGain.gain.value = 1.0;

  return {
    splitGain,
    bassLowpass,
    bassGain,
    midsBandpass,
    midsPanner,
    highsHighpass,
    highsPanner,
    bubbleConvolver,
    bubbleGain,
    roomConvolver,
    roomGain,
    outputGain,
    inserted: false,
    irLoaded: false,
  };
}

function wireBeamAudio(n: BeamAudioNodes): void {
  // Input → 3 split paths
  n.splitGain.connect(n.bassLowpass);
  n.splitGain.connect(n.midsBandpass);
  n.splitGain.connect(n.highsHighpass);

  // Bass path: lowpass → bassGain → outputGain (omnidirectional, no beaming)
  n.bassLowpass.connect(n.bassGain);
  n.bassGain.connect(n.outputGain);

  // Mids path: bandpass → HRTF panner → bubbleConvolver
  n.midsBandpass.connect(n.midsPanner);
  n.midsPanner.connect(n.bubbleConvolver);

  // Highs path: highpass → HRTF panner → bubbleConvolver
  n.highsHighpass.connect(n.highsPanner);
  n.highsPanner.connect(n.bubbleConvolver);

  // Bubble: convolver → bubbleGain → outputGain
  n.bubbleConvolver.connect(n.bubbleGain);
  n.bubbleGain.connect(n.outputGain);

  // Room reflections: outputGain → roomConvolver → roomGain → outputGain (parallel)
  n.outputGain.connect(n.roomConvolver);
  n.roomConvolver.connect(n.roomGain);
  // roomGain goes straight to destination (not feedback loop)
}

function insertBeamNodes(n: BeamAudioNodes): void {
  if (beamIsInserted) return;
  const analyser = getSharedAnalyser();
  if (!analyser) return;
  try {
    // Tap from analyser (post-chain), beam output → ctx.destination (parallel path)
    analyser.connect(n.splitGain);
    n.outputGain.connect(analyser.context.destination);
    n.roomGain.connect(analyser.context.destination);
    beamIsInserted = true;
    n.inserted = true;
  } catch (e) {
    console.warn("[SoundBeaming] Insert failed:", e);
  }
}

// ─── Beam panner helpers ──────────────────────────────────────────────────────

function setBeamPosition(
  n: BeamAudioNodes,
  x: number,
  y: number,
  z: number,
): void {
  n.midsPanner.positionX.value = x;
  n.midsPanner.positionY.value = y;
  n.midsPanner.positionZ.value = z;
  n.highsPanner.positionX.value = x;
  n.highsPanner.positionY.value = y;
  n.highsPanner.positionZ.value = z;
}

function applyBeamStrength(
  n: BeamAudioNodes,
  strength: number,
  wallMapping: boolean,
): void {
  const g = 0.2 + (strength / 100) * 0.8;
  n.bubbleGain.gain.value = g * 0.3;
  n.roomGain.gain.value = wallMapping ? g * 0.22 : 0.0;
  n.outputGain.gain.value = 0.7 + (strength / 100) * 0.3;
}

function applyDepthZone(n: BeamAudioNodes, pct: number): void {
  // 0–33 = near, 34–66 = mid, 67–100 = far
  let ref: number;
  let rolloff: number;
  if (pct < 34) {
    ref = 0.5 + pct * 0.02;
    rolloff = 1.0;
  } else if (pct < 67) {
    ref = 1 + (pct - 34) * 0.06;
    rolloff = 0.75;
  } else {
    ref = 3 + (pct - 67) * 0.2;
    rolloff = 0.45;
  }
  n.midsPanner.refDistance = ref;
  n.midsPanner.rolloffFactor = rolloff;
  n.highsPanner.refDistance = ref;
  n.highsPanner.rolloffFactor = rolloff + 0.3; // highs always tighter
}

// ─── Shared indicator state from analyser ────────────────────────────────────

function getAnalyserEnergy(): { bass: number; mids: number; highs: number } {
  const analyser = getSharedAnalyser();
  if (!analyser) return { bass: 0, mids: 0, highs: 0 };
  const buf = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buf);
  const sr = 48000;
  const binHz = sr / analyser.fftSize;
  const toBin = (hz: number) =>
    Math.min(buf.length - 1, Math.floor(hz / binHz));

  let bassSum = 0;
  let midsSum = 0;
  let highsSum = 0;

  const bassEnd = toBin(200);
  const midsEnd = toBin(4000);

  for (let i = 0; i <= bassEnd; i++) bassSum += (buf[i] ?? 0) / 255;
  for (let i = bassEnd + 1; i <= midsEnd; i++) midsSum += (buf[i] ?? 0) / 255;
  for (let i = midsEnd + 1; i < buf.length; i++)
    highsSum += (buf[i] ?? 0) / 255;

  const bassCount = bassEnd + 1;
  const midsCount = midsEnd - bassEnd;
  const highsCount = buf.length - midsEnd - 1;

  return {
    bass: bassCount > 0 ? bassSum / bassCount : 0,
    mids: midsCount > 0 ? midsSum / midsCount : 0,
    highs: highsCount > 0 ? highsSum / highsCount : 0,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/* ── Section header ── */
function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(0,100,200,0.2)" }}
      />
      <span
        className="text-[8px] font-mono font-bold tracking-[0.35em] uppercase shrink-0"
        style={{ color: "rgba(0,180,255,0.65)" }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(0,100,200,0.2)" }}
      />
    </div>
  );
}

/* ── Toggle row ── */
interface ToggleRowProps {
  label: string;
  sub?: string;
  value: boolean;
  onToggle: () => void;
  ocid: string;
  glow?: boolean;
}

function ToggleRow({
  label,
  sub,
  value,
  onToggle,
  ocid,
  glow,
}: ToggleRowProps) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onToggle}
      aria-pressed={value}
      className="flex items-center justify-between w-full px-3 py-2.5 rounded-sm transition-all duration-200 active:scale-[0.98]"
      style={{
        background: value ? "rgba(0,35,110,0.4)" : "rgba(0,6,22,0.65)",
        border: value
          ? "1px solid rgba(0,180,255,0.45)"
          : "1px solid rgba(0,50,130,0.2)",
        boxShadow: value && glow ? "0 0 16px rgba(0,150,255,0.2)" : "none",
      }}
    >
      <div className="flex flex-col items-start gap-0.5 min-w-0 pr-3">
        <span
          className="text-[9px] font-mono font-bold tracking-[0.22em] uppercase truncate w-full text-left"
          style={{
            color: value ? "rgba(0,220,255,0.95)" : "rgba(100,140,200,0.5)",
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            className="text-[7px] font-mono tracking-[0.1em] text-left"
            style={{ color: "rgba(80,120,180,0.4)" }}
          >
            {sub}
          </span>
        )}
      </div>
      {/* Toggle pill */}
      <div
        className="w-10 h-5 rounded-full relative transition-all duration-200 shrink-0"
        style={{
          background: value ? "rgba(0,150,255,0.3)" : "rgba(0,15,50,0.6)",
          border: value
            ? "1px solid rgba(0,200,255,0.5)"
            : "1px solid rgba(0,40,110,0.3)",
        }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: value ? "calc(100% - 18px)" : "2px",
            background: value ? "rgba(0,213,255,0.95)" : "rgba(40,70,120,0.55)",
            boxShadow: value ? "0 0 8px rgba(0,200,255,0.8)" : "none",
          }}
        />
      </div>
    </button>
  );
}

/* ── Slider row ── */
interface SliderRowProps {
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  color?: string;
  onChange: (v: number) => void;
  ocid: string;
}

function SliderRow({
  label,
  sub,
  value,
  min,
  max,
  step = 1,
  unit = "",
  color = "rgba(0,180,255,0.85)",
  onChange,
  ocid,
}: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-[8px] font-mono font-bold tracking-[0.22em] uppercase"
            style={{ color: "rgba(130,165,220,0.7)" }}
          >
            {label}
          </span>
          {sub && (
            <p
              className="text-[7px] font-mono mt-0.5"
              style={{ color: "rgba(80,110,170,0.4)" }}
            >
              {sub}
            </p>
          )}
        </div>
        <span
          className="text-[10px] font-mono font-bold tabular-nums shrink-0 ml-2"
          style={{ color }}
        >
          {value}
          {unit}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <input
          type="range"
          data-ocid={ocid}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${pct}%, rgba(0,25,70,0.6) ${pct}%)`,
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

/* ── Tap counter (listener count) ── */
interface TapCounterProps {
  label: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  onDec: () => void;
  onInc: () => void;
  ocid: string;
}

function TapCounter({
  label,
  sub,
  value,
  min,
  max,
  onDec,
  onInc,
  ocid,
}: TapCounterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <span
          className="text-[8px] font-mono font-bold tracking-[0.22em] uppercase"
          style={{ color: "rgba(130,165,220,0.7)" }}
        >
          {label}
        </span>
        {sub && (
          <p
            className="text-[7px] font-mono mt-0.5"
            style={{ color: "rgba(80,110,170,0.4)" }}
          >
            {sub}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-ocid={`${ocid}.dec`}
          onClick={onDec}
          disabled={value <= min}
          className="w-8 h-8 rounded-sm flex items-center justify-center transition-all duration-150 active:scale-90 disabled:opacity-30"
          style={{
            background: "rgba(0,20,70,0.6)",
            border: "1px solid rgba(0,100,200,0.3)",
            color: "rgba(0,180,255,0.8)",
          }}
          aria-label="Decrease listener count"
        >
          <span className="text-base font-mono font-bold leading-none">−</span>
        </button>
        <span
          className="text-xl font-mono font-bold tabular-nums flex-1 text-center"
          style={{ color: "rgba(0,213,255,0.95)" }}
          data-ocid={ocid}
        >
          {value}
        </span>
        <button
          type="button"
          data-ocid={`${ocid}.inc`}
          onClick={onInc}
          disabled={value >= max}
          className="w-8 h-8 rounded-sm flex items-center justify-center transition-all duration-150 active:scale-90 disabled:opacity-30"
          style={{
            background: "rgba(0,20,70,0.6)",
            border: "1px solid rgba(0,100,200,0.3)",
            color: "rgba(0,180,255,0.8)",
          }}
          aria-label="Increase listener count"
        >
          <span className="text-base font-mono font-bold leading-none">+</span>
        </button>
      </div>
    </div>
  );
}

/* ── Status card ── */
interface StatusCardProps {
  title: string;
  subtitle: string;
  detail: string;
  status: string;
  dotColor: string;
  active: boolean;
}

function StatusCard({
  title,
  subtitle,
  detail,
  status,
  dotColor,
  active,
}: StatusCardProps) {
  return (
    <div
      className="p-2.5 rounded-sm flex flex-col gap-1.5"
      style={{
        background: active ? "rgba(0,20,70,0.5)" : "rgba(0,5,18,0.5)",
        border: active
          ? "1px solid rgba(0,150,255,0.25)"
          : "1px solid rgba(0,30,80,0.15)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[8px] font-mono font-bold tracking-[0.25em] uppercase"
          style={{
            color: active ? "rgba(0,210,255,0.9)" : "rgba(70,90,140,0.5)",
          }}
        >
          {title}
        </span>
        <div
          className="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
          style={{
            background: active ? dotColor : "rgba(40,55,100,0.4)",
            boxShadow: active ? `0 0 6px ${dotColor}` : "none",
          }}
        />
      </div>
      <span
        className="text-[7px] font-mono tracking-[0.1em]"
        style={{ color: "rgba(100,130,190,0.45)" }}
      >
        {subtitle}
      </span>
      <span
        className="text-[7px] font-mono"
        style={{ color: "rgba(80,110,170,0.4)" }}
      >
        {detail}
      </span>
      <div
        className="mt-0.5 px-1.5 py-0.5 rounded-sm self-start"
        style={{
          background: active ? "rgba(0,30,100,0.6)" : "rgba(0,8,30,0.5)",
          border: active
            ? "1px solid rgba(0,160,255,0.3)"
            : "1px solid rgba(0,25,70,0.2)",
        }}
      >
        <span
          className="text-[7px] font-mono font-bold tracking-[0.2em] uppercase"
          style={{
            color: active ? "rgba(0,255,150,0.9)" : "rgba(60,80,130,0.4)",
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

/* ── Info spec card ── */
function SpecCard({
  icon: Icon,
  text,
  sub,
}: { icon: React.ElementType; text: string; sub: string }) {
  return (
    <div
      className="px-2.5 py-2 rounded-sm flex items-start gap-2"
      style={{
        background: "rgba(0,8,28,0.6)",
        border: "1px solid rgba(0,60,150,0.15)",
      }}
    >
      <Icon
        className="w-3 h-3 mt-0.5 shrink-0"
        style={{ color: "rgba(0,160,255,0.55)" }}
      />
      <div>
        <p
          className="text-[8px] font-mono font-bold tracking-[0.15em] uppercase"
          style={{ color: "rgba(0,190,255,0.75)" }}
        >
          {text}
        </p>
        <p
          className="text-[7px] font-mono mt-0.5"
          style={{ color: "rgba(80,120,190,0.45)" }}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}

// ─── Main drawer component ────────────────────────────────────────────────────

interface SoundBeamingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SoundBeamingDrawer({
  isOpen,
  onClose,
}: SoundBeamingDrawerProps) {
  // ── Load settings from localStorage on mount ──
  const [settings, setSettings] = useState<BeamSettings>(loadSettings);

  // ── Live analyser energy for real indicators ──
  const [energy, setEnergy] = useState({ bass: 0, mids: 0, highs: 0 });
  const energyRafRef = useRef<number>(0);

  // ── VR sweep state ──
  const vrXRef = useRef(0);
  const vrDirRef = useRef(1);
  const vrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Room IR needs rebuild when width changes ──
  const lastWidthRef = useRef(settings.roomWidth);

  // ── Trap body scroll when open ──
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ── Escape key ──
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Build / insert audio nodes when beam enabled ──
  useEffect(() => {
    if (!isOpen) return;
    const ctx = getSharedCtx();
    if (!ctx) return;

    if (!beamAudio) {
      beamAudio = buildBeamAudio(ctx);
      wireBeamAudio(beamAudio);
    }

    // Load IRs if not loaded yet
    if (!beamAudio.irLoaded) {
      beamAudio.bubbleConvolver.buffer = genBubbleIR(ctx);
      beamAudio.roomConvolver.buffer = genRoomIR(ctx, settings.roomWidth);
      beamAudio.irLoaded = true;
      lastWidthRef.current = settings.roomWidth;
    }

    if (settings.beamEnabled) {
      insertBeamNodes(beamAudio);
    }
  }, [isOpen, settings.beamEnabled, settings.roomWidth]);

  // ── Rebuild room IR when width changes significantly ──
  useEffect(() => {
    if (!beamAudio?.irLoaded) return;
    const ctx = getSharedCtx();
    if (!ctx) return;
    if (Math.abs(settings.roomWidth - lastWidthRef.current) >= 2) {
      beamAudio.roomConvolver.buffer = genRoomIR(ctx, settings.roomWidth);
      lastWidthRef.current = settings.roomWidth;
    }
  }, [settings.roomWidth]);

  // ── Apply beam strength & wall mapping whenever they change ──
  useEffect(() => {
    if (!beamAudio) return;
    applyBeamStrength(beamAudio, settings.beamStrength, settings.wallMapping);
  }, [settings.beamStrength, settings.wallMapping]);

  // ── Apply depth zone ──
  useEffect(() => {
    if (!beamAudio) return;
    applyDepthZone(beamAudio, settings.vrDepth);
  }, [settings.vrDepth]);

  // ── Bubble seal: disable bubbleConvolver path if not sealed ──
  useEffect(() => {
    if (!beamAudio) return;
    beamAudio.bubbleGain.gain.value = settings.bubbleSeal
      ? 0.2 + (settings.beamStrength / 100) * 0.25
      : 0.0;
  }, [settings.bubbleSeal, settings.beamStrength]);

  // ── Bass: phone speaker mode reduces bass gain ──
  // (phone speakers can't push 14-60Hz deep — reduce to avoid distortion)
  // No phoneSpeakerMode toggle in this new build — bass auto-adapts

  // ── VR sweep ──
  useEffect(() => {
    if (vrIntervalRef.current) clearInterval(vrIntervalRef.current);
    if (!settings.vrEnabled || !settings.beamEnabled || !beamAudio) return;

    const maxX = Math.min(8, (settings.roomWidth / 20) * 8);
    const speedMap: Record<DepthZone, number> = {
      near: 0.28,
      mid: 0.16,
      far: 0.09,
    };
    const depthZone: DepthZone =
      settings.vrDepth < 34 ? "near" : settings.vrDepth < 67 ? "mid" : "far";
    const step = speedMap[depthZone];

    const hasFlyPast = settings.vrEffects.includes("fly-past");
    const hasBehind = settings.vrEffects.includes("behind-sweep");
    const hasHeight = settings.vrEffects.includes("height-effects");

    vrIntervalRef.current = setInterval(() => {
      if (!beamAudio) return;

      if (hasFlyPast) {
        vrXRef.current += step * vrDirRef.current;
        if (vrXRef.current > maxX) {
          vrXRef.current = maxX;
          vrDirRef.current = -1;
        }
        if (vrXRef.current < -maxX) {
          vrXRef.current = -maxX;
          vrDirRef.current = 1;
        }
        beamAudio.midsPanner.positionX.value = vrXRef.current;
        beamAudio.highsPanner.positionX.value = vrXRef.current;
      }

      if (hasHeight) {
        const t = Date.now() / 1000;
        const yOffset = Math.sin(t * 0.4) * 1.5;
        beamAudio.midsPanner.positionY.value = yOffset;
        beamAudio.highsPanner.positionY.value = yOffset + 0.5;
      }

      if (hasBehind) {
        const t = Date.now() / 1000;
        const zOffset = -2 + Math.sin(t * 0.25) * 3; // sweeps -5 to +1
        beamAudio.midsPanner.positionZ.value = zOffset;
        beamAudio.highsPanner.positionZ.value = zOffset - 0.5;
      }
    }, 50);

    return () => {
      if (vrIntervalRef.current) clearInterval(vrIntervalRef.current);
    };
  }, [
    settings.vrEnabled,
    settings.beamEnabled,
    settings.vrDepth,
    settings.roomWidth,
    settings.vrEffects,
  ]);

  // ── When VR is off or beam is off — reset panner to centered beam position ──
  useEffect(() => {
    if (!beamAudio) return;
    if (!settings.vrEnabled || !settings.beamEnabled) {
      setBeamPosition(beamAudio, 0, 0, -2);
    }
  }, [settings.vrEnabled, settings.beamEnabled]);

  // ── Group mode — widen panner spread based on listener count ──
  useEffect(() => {
    if (!beamAudio) return;
    if (!settings.groupMode || !settings.beamEnabled) {
      setBeamPosition(beamAudio, 0, 0, -2);
      return;
    }
    const spreadX =
      settings.roomWidth / 2 / Math.max(1, settings.listenerCount);
    beamAudio.midsPanner.positionX.value = spreadX;
    beamAudio.highsPanner.positionX.value = -spreadX;
  }, [
    settings.groupMode,
    settings.beamEnabled,
    settings.listenerCount,
    settings.roomWidth,
  ]);

  // ── Listener height — adjust Y position on panners ──
  useEffect(() => {
    if (!beamAudio) return;
    const y = (settings.listenerHeight - 6) * 0.5; // 0 at 6ft, +0.5 at 7ft, -0.5 at 5ft
    beamAudio.midsPanner.positionY.value = y;
    beamAudio.highsPanner.positionY.value = y + 0.3; // highs slightly above
  }, [settings.listenerHeight]);

  // ── Live energy poll from analyser ──
  useEffect(() => {
    if (!isOpen) return;

    const poll = () => {
      setEnergy(getAnalyserEnergy());
      energyRafRef.current = requestAnimationFrame(poll);
    };
    energyRafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(energyRafRef.current);
  }, [isOpen]);

  // ─── Setting update helpers ───────────────────────────────────────────────

  function update<K extends keyof BeamSettings>(
    key: K,
    value: BeamSettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    saveSetting(key, value);
  }

  function toggleVrEffect(effect: VrEffect) {
    setSettings((prev) => {
      const next = prev.vrEffects.includes(effect)
        ? prev.vrEffects.filter((e) => e !== effect)
        : [...prev.vrEffects, effect];
      saveSetting("vrEffects", next);
      return { ...prev, vrEffects: next };
    });
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const isActive = settings.beamEnabled;
  const midsBeaming = isActive && energy.mids > 0.02;
  const highsBeaming = isActive && energy.highs > 0.02;
  const bassActive = isActive && energy.bass > 0.02;
  const bubbleSealed = isActive && settings.bubbleSeal;

  const depthZoneLabel: DepthZone =
    settings.vrDepth < 34 ? "near" : settings.vrDepth < 67 ? "mid" : "far";
  const depthDisplay = {
    near: "0–3 FEET",
    mid: "3–10 FEET",
    far: "10–20 FEET",
  }[depthZoneLabel];

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ── */}
      <button
        type="button"
        className="fixed inset-0 z-40 w-full h-full cursor-default"
        style={{
          background: "rgba(0,2,10,0.78)",
          backdropFilter: "blur(4px)",
          border: "none",
        }}
        onClick={onClose}
        aria-label="Close Sound Beaming drawer"
        data-ocid="beam_drawer.backdrop"
        tabIndex={-1}
      />

      {/* ── Drawer panel ── */}
      <dialog
        open
        className="fixed inset-y-0 right-0 z-50 w-full max-w-sm flex flex-col m-0 p-0 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, rgba(0,4,18,0.99) 0%, rgba(0,8,28,0.98) 100%)",
          borderLeft: "1px solid rgba(0,90,210,0.28)",
          boxShadow: "-4px 0 48px rgba(0,50,200,0.18)",
          animation: "slideInRight 0.26s cubic-bezier(0.16, 1, 0.3, 1) both",
          maxHeight: "100dvh",
          height: "100dvh",
        }}
        aria-label="Sound Beaming + VR Bubble system"
        data-ocid="beam_drawer.dialog"
      >
        {/* ═══════════════ HEADER ════════════════ */}
        <div
          className="shrink-0 px-4 pt-4 pb-3"
          style={{
            background: "rgba(0,5,20,0.98)",
            borderBottom: "1px solid rgba(0,80,200,0.2)",
            boxShadow: "0 1px 18px rgba(0,50,180,0.1)",
          }}
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 transition-all duration-300"
                style={{
                  background: isActive
                    ? "rgba(0,35,120,0.6)"
                    : "rgba(0,8,35,0.5)",
                  border: isActive
                    ? "1px solid rgba(0,200,255,0.45)"
                    : "1px solid rgba(0,50,130,0.2)",
                  boxShadow: isActive
                    ? "0 0 18px rgba(0,170,255,0.25)"
                    : "none",
                }}
              >
                <Radio
                  className="w-4.5 h-4.5 transition-all duration-300"
                  style={{
                    color: isActive
                      ? "rgba(0,220,255,0.9)"
                      : "rgba(0,70,150,0.45)",
                  }}
                />
              </div>
              <div>
                <h1
                  className="text-[13px] font-display font-black tracking-[0.14em] uppercase leading-tight"
                  style={{
                    color: "rgba(0,213,255,0.95)",
                    textShadow: isActive
                      ? "0 0 16px rgba(0,180,255,0.45)"
                      : "none",
                  }}
                >
                  Sound Beaming + VR Bubble
                </h1>
                <p
                  className="text-[7px] font-mono tracking-[0.2em] uppercase mt-0.5"
                  style={{ color: "rgba(80,130,200,0.5)" }}
                >
                  Bass · Mids · Highs — Personal Bubble per Listener
                </p>
                <p
                  className="text-[6.5px] font-mono tracking-[0.15em] mt-0.5"
                  style={{ color: "rgba(60,100,160,0.38)" }}
                >
                  Volume follows player · Credits untouched
                </p>
              </div>
            </div>
            <button
              type="button"
              data-ocid="beam_drawer.close_button"
              onClick={onClose}
              className="w-8 h-8 rounded-sm flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-90 shrink-0 mt-0.5"
              style={{
                background: "rgba(0,12,45,0.65)",
                border: "1px solid rgba(0,65,150,0.28)",
                color: "rgba(0,160,255,0.65)",
              }}
              aria-label="Close Sound Beaming drawer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Status bar */}
          <div
            className="flex items-center justify-between px-2.5 py-1.5 rounded-sm"
            style={{
              background: isActive ? "rgba(0,25,85,0.4)" : "rgba(0,4,16,0.5)",
              border: isActive
                ? "1px solid rgba(0,150,255,0.22)"
                : "1px solid rgba(0,25,70,0.15)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full transition-all duration-300"
                style={{
                  background: isActive
                    ? "rgba(0,255,150,0.9)"
                    : "rgba(50,70,120,0.4)",
                  boxShadow: isActive ? "0 0 5px rgba(0,255,150,0.7)" : "none",
                }}
              />
              <span
                className="text-[7px] font-mono tracking-[0.2em] uppercase"
                style={{
                  color: isActive
                    ? "rgba(0,220,255,0.75)"
                    : "rgba(70,100,160,0.4)",
                }}
              >
                {isActive ? "BEAM ACTIVE" : "STANDBY"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap
                className="w-2.5 h-2.5"
                style={{ color: "rgba(153,69,255,0.6)" }}
              />
              <span
                className="text-[6.5px] font-mono tracking-wide"
                style={{ color: "rgba(120,80,200,0.55)" }}
              >
                ENGINE 1 · 80,000×
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════ SCROLLABLE CONTENT ════════════════ */}
        <div
          className="flex-1 overflow-y-auto px-4 pb-8 pt-4"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,90,200,0.2) transparent",
          }}
        >
          {/* ────────── SECTION 1: MAIN SWITCHES ────────── */}
          <SectionTitle label="Main Switches" />
          <div className="flex flex-col gap-1.5 mb-5">
            <ToggleRow
              label="BEAM ON / OFF"
              sub="Master switch — activates full beaming system"
              value={settings.beamEnabled}
              onToggle={() => update("beamEnabled", !settings.beamEnabled)}
              ocid="beam.toggle"
              glow
            />
            <ToggleRow
              label="GROUP MODE"
              sub="Widens spread so every person in the room gets coverage"
              value={settings.groupMode}
              onToggle={() => update("groupMode", !settings.groupMode)}
              ocid="beam.group_mode_toggle"
            />
            <ToggleRow
              label="WALL MAPPING"
              sub="Uses front room walls for reflections — sound bounces back"
              value={settings.wallMapping}
              onToggle={() => update("wallMapping", !settings.wallMapping)}
              ocid="beam.wall_mapping_toggle"
            />
            <ToggleRow
              label="VR MODE"
              sub="Fly-past effects · Sounds sweep left to right and around you"
              value={settings.vrEnabled}
              onToggle={() => update("vrEnabled", !settings.vrEnabled)}
              ocid="beam.vr_mode_toggle"
            />
            <ToggleRow
              label="BUBBLE SEAL"
              sub="360° sealed personal zone per listener — no escape"
              value={settings.bubbleSeal}
              onToggle={() => update("bubbleSeal", !settings.bubbleSeal)}
              ocid="beam.bubble_seal_toggle"
            />
          </div>

          {/* ────────── SECTION 2: ROOM SETUP ────────── */}
          <SectionTitle label="Room Setup" />
          <div
            className="p-3 rounded-sm flex flex-col gap-4 mb-5"
            style={{
              background: "rgba(0,5,20,0.65)",
              border: "1px solid rgba(0,60,150,0.18)",
            }}
          >
            <SliderRow
              label="Room Width (Feet)"
              sub="Sets how far the beam reaches left and right"
              value={settings.roomWidth}
              min={1}
              max={20}
              unit="ft"
              onChange={(v) => update("roomWidth", v)}
              ocid="beam.room_width_slider"
            />
            <SliderRow
              label="Listener Height (Feet)"
              sub="Your height or average listener height"
              value={settings.listenerHeight}
              min={5}
              max={7}
              step={0.5}
              unit="ft"
              color="rgba(0,200,180,0.85)"
              onChange={(v) => update("listenerHeight", v)}
              ocid="beam.height_slider"
            />
            <TapCounter
              label="Listeners in Room"
              sub="How many people the beam covers simultaneously"
              value={settings.listenerCount}
              min={1}
              max={8}
              onDec={() =>
                update("listenerCount", Math.max(1, settings.listenerCount - 1))
              }
              onInc={() =>
                update("listenerCount", Math.min(8, settings.listenerCount + 1))
              }
              ocid="beam.listener_count"
            />
            <SliderRow
              label="Beam Strength"
              sub="How focused and powerful the directional beam is"
              value={settings.beamStrength}
              min={0}
              max={100}
              unit="%"
              color="rgba(153,69,255,0.85)"
              onChange={(v) => update("beamStrength", v)}
              ocid="beam.strength_slider"
            />
          </div>

          {/* ────────── SECTION 3: VR CONTROLS (only when VR on) ────────── */}
          {settings.vrEnabled && (
            <div className="mb-5">
              <SectionTitle label="VR Depth Zones" />
              <div
                className="p-3 rounded-sm flex flex-col gap-4"
                style={{
                  background: "rgba(10,4,30,0.65)",
                  border: "1px solid rgba(100,40,200,0.2)",
                }}
              >
                <SliderRow
                  label="Depth Intensity"
                  sub="How deep the 3D effects go"
                  value={settings.vrDepth}
                  min={0}
                  max={100}
                  unit="%"
                  color="rgba(153,69,255,0.9)"
                  onChange={(v) => update("vrDepth", v)}
                  ocid="beam.vr_depth_slider"
                />

                {/* Depth zone badges */}
                <div className="grid grid-cols-3 gap-1.5">
                  {(["near", "mid", "far"] as DepthZone[]).map((zone) => {
                    const labels = {
                      near: "0–3 FEET",
                      mid: "3–10 FEET",
                      far: "10–20 FEET",
                    };
                    const subs = {
                      near: "Close sounds",
                      mid: "Room sounds",
                      far: "Distance sounds",
                    };
                    const active = depthZoneLabel === zone;
                    return (
                      <div
                        key={zone}
                        data-ocid={`beam.vr_zone.${zone}`}
                        className="py-2 px-1.5 rounded-sm flex flex-col items-center gap-0.5 transition-all duration-200"
                        style={{
                          background: active
                            ? "rgba(100,40,220,0.2)"
                            : "rgba(0,6,22,0.5)",
                          border: active
                            ? "1px solid rgba(150,80,255,0.5)"
                            : "1px solid rgba(0,30,80,0.18)",
                          boxShadow: active
                            ? "0 0 10px rgba(130,60,255,0.2)"
                            : "none",
                        }}
                      >
                        <span
                          className="text-[7px] font-mono font-bold tracking-[0.2em] uppercase"
                          style={{
                            color: active
                              ? "rgba(200,160,255,0.95)"
                              : "rgba(70,90,150,0.4)",
                          }}
                        >
                          {labels[zone]}
                        </span>
                        <span
                          className="text-[6.5px] font-mono"
                          style={{ color: "rgba(100,80,180,0.4)" }}
                        >
                          {subs[zone]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Active depth display */}
                <div
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-sm"
                  style={{
                    background: "rgba(80,30,200,0.12)",
                    border: "1px solid rgba(130,60,255,0.2)",
                  }}
                >
                  <span
                    className="text-[7.5px] font-mono tracking-[0.2em] uppercase"
                    style={{ color: "rgba(140,90,240,0.6)" }}
                  >
                    Active Zone
                  </span>
                  <span
                    className="text-[8px] font-mono font-bold"
                    style={{ color: "rgba(190,140,255,0.85)" }}
                  >
                    {depthDisplay}
                  </span>
                </div>

                {/* VR effect toggles */}
                <div>
                  <p
                    className="text-[7.5px] font-mono tracking-[0.2em] uppercase mb-2"
                    style={{ color: "rgba(120,90,200,0.55)" }}
                  >
                    VR Effects
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {[
                      {
                        id: "fly-past" as VrEffect,
                        label: "FLY-PAST EFFECTS",
                        sub: "Sounds sweep left to right",
                      },
                      {
                        id: "behind-sweep" as VrEffect,
                        label: "BEHIND SWEEP",
                        sub: "Sounds come from behind and sweep forward",
                      },
                      {
                        id: "height-effects" as VrEffect,
                        label: "HEIGHT EFFECTS",
                        sub: "Sounds pass above your head",
                      },
                      {
                        id: "environmental" as VrEffect,
                        label: "ENVIRONMENTAL",
                        sub: "Adds subtle spatial atmosphere",
                      },
                    ].map((effect) => {
                      const on = settings.vrEffects.includes(effect.id);
                      return (
                        <button
                          key={effect.id}
                          type="button"
                          data-ocid={`beam.vr_effect.${effect.id}`}
                          onClick={() => toggleVrEffect(effect.id)}
                          aria-pressed={on}
                          className="flex items-center justify-between px-2.5 py-2 rounded-sm transition-all duration-150 active:scale-[0.98] text-left"
                          style={{
                            background: on
                              ? "rgba(80,20,180,0.25)"
                              : "rgba(0,4,16,0.5)",
                            border: on
                              ? "1px solid rgba(140,60,255,0.38)"
                              : "1px solid rgba(0,25,70,0.15)",
                          }}
                        >
                          <div>
                            <p
                              className="text-[8px] font-mono font-bold tracking-[0.18em] uppercase"
                              style={{
                                color: on
                                  ? "rgba(190,140,255,0.9)"
                                  : "rgba(60,80,140,0.45)",
                              }}
                            >
                              {effect.label}
                            </p>
                            <p
                              className="text-[6.5px] font-mono mt-0.5"
                              style={{ color: "rgba(80,70,140,0.4)" }}
                            >
                              {effect.sub}
                            </p>
                          </div>
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0 ml-2 transition-all duration-200"
                            style={{
                              background: on
                                ? "rgba(150,80,255,0.9)"
                                : "rgba(40,30,80,0.4)",
                              boxShadow: on
                                ? "0 0 5px rgba(140,70,255,0.6)"
                                : "none",
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────── SECTION 4: BEAM STATUS ────────── */}
          <SectionTitle label="Beam Status" />
          <div
            className="grid grid-cols-2 gap-2 mb-5"
            data-ocid="beam.status_panel"
          >
            <StatusCard
              title="BASS"
              subtitle="ROOM FILL"
              detail="Bass fills room naturally — not beamed"
              status={bassActive ? "ACTIVE" : "STANDBY"}
              dotColor="rgba(255,180,30,0.9)"
              active={bassActive}
            />
            <StatusCard
              title="MIDS"
              subtitle="HRTF BEAM"
              detail="HRTF beam direct to each listener"
              status={midsBeaming ? "BEAMING" : "STANDBY"}
              dotColor="rgba(0,220,200,0.9)"
              active={midsBeaming}
            />
            <StatusCard
              title="HIGHS"
              subtitle="HRTF BEAM"
              detail="Crystal clear highs beamed direct"
              status={highsBeaming ? "BEAMING" : "STANDBY"}
              dotColor="rgba(0,240,255,0.9)"
              active={highsBeaming}
            />
            <StatusCard
              title="BUBBLE"
              subtitle="PERSONAL ZONE"
              detail="360° sealed per listener"
              status={bubbleSealed ? "SEALED" : "OPEN"}
              dotColor="rgba(153,69,255,0.9)"
              active={bubbleSealed}
            />
          </div>

          {/* Live energy bars */}
          {isActive && (
            <div
              className="px-3 py-2.5 rounded-sm mb-5"
              style={{
                background: "rgba(0,5,18,0.6)",
                border: "1px solid rgba(0,60,150,0.15)",
              }}
            >
              <p
                className="text-[7px] font-mono tracking-[0.22em] uppercase mb-2"
                style={{ color: "rgba(80,110,180,0.45)" }}
              >
                Live Signal Energy
              </p>
              {(
                [
                  {
                    label: "BASS",
                    val: energy.bass,
                    color: "rgba(255,180,30,0.8)",
                  },
                  {
                    label: "MIDS",
                    val: energy.mids,
                    color: "rgba(0,220,200,0.8)",
                  },
                  {
                    label: "HIGHS",
                    val: energy.highs,
                    color: "rgba(0,200,255,0.8)",
                  },
                ] as const
              ).map((band) => {
                const pct = Math.round(Math.min(1, band.val) * 100);
                return (
                  <div
                    key={band.label}
                    className="flex items-center gap-2 mb-1.5"
                  >
                    <span
                      className="text-[7px] font-mono w-8 shrink-0"
                      style={{ color: "rgba(100,130,200,0.45)" }}
                    >
                      {band.label}
                    </span>
                    <div
                      className="flex-1 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(0,15,50,0.6)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{ width: `${pct}%`, background: band.color }}
                      />
                    </div>
                    <span
                      className="text-[7px] font-mono w-7 text-right tabular-nums shrink-0"
                      style={{ color: "rgba(80,110,180,0.4)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ────────── SECTION 5: PERSONAL BUBBLE SPECS ────────── */}
          <SectionTitle label="Personal Bubble — Sealed Zone" />
          <div className="grid grid-cols-2 gap-1.5 mb-5">
            <SpecCard
              icon={Circle}
              text="360° Coverage"
              sub="Above, below, all sides — no gaps"
            />
            <SpecCard
              icon={Activity}
              text="No Escape"
              sub="Only the off switch exits the bubble"
            />
            <SpecCard
              icon={Waves}
              text="Group Safe"
              sub="Each person gets their own sealed bubble"
            />
            <SpecCard
              icon={Radio}
              text="Walls Active"
              sub="Front room walls still work alongside bubbles"
            />
            <SpecCard
              icon={Zap}
              text="Protected"
              sub="Engine 1 + Protection System powered"
            />
            <SpecCard
              icon={Volume2}
              text="Phone as Center"
              sub="Set phone anywhere — beam radiates outward"
            />
          </div>

          {/* Bubble detail block */}
          <div
            className="px-3 py-2.5 rounded-sm mb-5"
            style={{
              background: bubbleSealed
                ? "rgba(50,10,120,0.18)"
                : "rgba(0,4,16,0.5)",
              border: bubbleSealed
                ? "1px solid rgba(140,60,255,0.28)"
                : "1px solid rgba(0,25,70,0.15)",
            }}
          >
            {[
              {
                label: "FREQUENCIES",
                val: "Bass + Mids + Highs · All three inside bubble",
              },
              {
                label: "VOICES",
                val: "Come with frequencies — part of the beam",
              },
              {
                label: "BASS IN BUBBLE",
                val: "Surrounds from within — not hitting from outside",
              },
              {
                label: "VR IN BUBBLE",
                val: settings.vrEnabled
                  ? "Active — fly-past + depth zones"
                  : "Standby — enable VR mode",
              },
              {
                label: "POWERED BY",
                val: "Engine 1 · 80,000 × per channel · 12 channels",
              },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="flex items-start justify-between gap-2 py-1.5"
                style={{ borderBottom: "1px solid rgba(0,25,70,0.1)" }}
              >
                <span
                  className="text-[7px] font-mono tracking-[0.18em] uppercase shrink-0"
                  style={{ color: "rgba(100,130,200,0.45)" }}
                >
                  {label}
                </span>
                <span
                  className="text-[7px] font-mono text-right"
                  style={{
                    color: bubbleSealed
                      ? "rgba(170,120,255,0.7)"
                      : "rgba(70,90,160,0.4)",
                  }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>

          {/* ────────── SECTION 6: WORKS ON ────────── */}
          <SectionTitle label="Works On" />
          <div className="flex flex-col gap-2 mb-5">
            <div
              className="p-3 rounded-sm flex items-start gap-3"
              style={{
                background: "rgba(0,6,22,0.65)",
                border: "1px solid rgba(0,60,150,0.18)",
              }}
            >
              <div
                className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "rgba(0,20,70,0.5)",
                  border: "1px solid rgba(0,120,220,0.25)",
                }}
              >
                <Smartphone
                  className="w-4 h-4"
                  style={{ color: "rgba(0,180,255,0.65)" }}
                />
              </div>
              <div>
                <p
                  className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase"
                  style={{ color: "rgba(0,200,255,0.85)" }}
                >
                  Phone Speaker
                </p>
                <p
                  className="text-[7px] font-mono mt-1 leading-relaxed"
                  style={{ color: "rgba(80,120,190,0.5)" }}
                >
                  Test before connecting to stereo. Highs and mids beam fully.
                  Bass is limited by phone speaker size but system still runs.
                </p>
              </div>
            </div>

            <div
              className="p-3 rounded-sm flex items-start gap-3"
              style={{
                background: "rgba(0,8,28,0.65)",
                border: "1px solid rgba(0,80,180,0.18)",
              }}
            >
              <div
                className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "rgba(0,25,85,0.5)",
                  border: "1px solid rgba(0,140,255,0.28)",
                }}
              >
                <Speaker
                  className="w-4 h-4"
                  style={{ color: "rgba(0,200,255,0.7)" }}
                />
              </div>
              <div>
                <p
                  className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase"
                  style={{ color: "rgba(0,220,255,0.9)" }}
                >
                  QFX 15 / Stereo
                </p>
                <p
                  className="text-[7px] font-mono mt-1 leading-relaxed"
                  style={{ color: "rgba(80,130,200,0.5)" }}
                >
                  Full experience. 15&quot; woofer handles 14–60Hz bass
                  physically. Beamed highs and mids hit sharp. VR fly-past
                  effects felt in the body. Works inside and outside — bubble
                  follows listeners anywhere.
                </p>
              </div>
            </div>
          </div>

          {/* ────────── SYSTEM STATUS FOOTER ────────── */}
          <div
            className="px-3 py-2 rounded-sm"
            style={{
              background: "rgba(0,4,16,0.7)",
              border: "1px solid rgba(0,40,110,0.15)",
            }}
          >
            {[
              { label: "STABILIZER", val: "ENGINE HIDDEN INSIDE · ACTIVE" },
              { label: "SIGNAL BOOSTER", val: "STABILIZER HIDDEN INSIDE" },
              { label: "CREDITS", val: "DO NOT SEE THIS · HIDDEN" },
              {
                label: "BASS PATH",
                val: "OMNI · 14–60Hz · Fills room naturally",
              },
              {
                label: "MIDS + HIGHS",
                val: isActive ? "HRTF BEAM · ACTIVE" : "HRTF BEAM · STANDBY",
              },
              {
                label: "VR LAYER",
                val: settings.vrEnabled
                  ? "FLY-PAST · DEPTH ZONES · ACTIVE"
                  : "STANDBY",
              },
            ].map(({ label, val }) => (
              <div
                key={label}
                className="flex items-center justify-between py-1"
                style={{ borderBottom: "1px solid rgba(0,25,70,0.1)" }}
              >
                <span
                  className="text-[6.5px] font-mono tracking-[0.18em] uppercase"
                  style={{ color: "rgba(80,110,180,0.38)" }}
                >
                  {label}
                </span>
                <span
                  className="text-[6.5px] font-mono"
                  style={{ color: "rgba(80,120,200,0.38)" }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════ FOOTER ════════════════ */}
        <div
          className="shrink-0 px-4 py-2 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(0,40,110,0.15)" }}
        >
          <p
            className="text-[7px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(0,50,120,0.38)" }}
          >
            Hidden inside Stabilizer · Engine 1 · 80,000 × per channel
          </p>
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
            style={{
              background: "rgba(0,10,40,0.5)",
              border: "1px solid rgba(153,69,255,0.15)",
            }}
          >
            <span
              className="text-[6px] font-mono tracking-wide"
              style={{ color: "rgba(120,70,200,0.45)" }}
            >
              AUTO-SAVE ON
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
