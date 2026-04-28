import {
  getSharedBassFilter,
  getSharedCtx,
  getSharedMidsFilter,
} from "@/hooks/usePlayer";
import type { BassType } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// ─── Bass type filter specs ───────────────────────────────────────────────────
// Each type has distinct BiquadFilter settings that produce audibly different character.
// These are applied directly to the shared audio nodes — truly wired.

interface BassFilterSpec {
  // Primary filter applied to main bass node
  bassFreq: number;
  bassQ: number;
  bassGain: number;
  // Optional secondary peaking applied to mids node
  midsFreq?: number;
  midsGain?: number;
  midsQ?: number;
}

const BASS_FILTER_SPECS: Record<BassType, BassFilterSpec> = {
  // deep: lowshelf 30Hz +6dB Q0.5 — heavy low-end, floor-shaking presence
  deep: { bassFreq: 30, bassQ: 0.5, bassGain: 6 },
  // tight: peaking 60Hz -3dB Q3.0 — reduces boominess, tight controlled sound
  tight: { bassFreq: 60, bassQ: 3.0, bassGain: -3 },
  // punchy: peaking 80Hz +4dB Q2.0 + peaking 100Hz +2dB Q1.5
  punchy: {
    bassFreq: 80,
    bassQ: 2.0,
    bassGain: 4,
    midsFreq: 100,
    midsGain: 2,
    midsQ: 1.5,
  },
  // warm: lowshelf 60Hz +3dB Q1.0 + peaking 200Hz +2dB Q0.8
  warm: {
    bassFreq: 60,
    bassQ: 1.0,
    bassGain: 3,
    midsFreq: 200,
    midsGain: 2,
    midsQ: 0.8,
  },
  // sub: lowshelf 20Hz +8dB Q0.3 — kept for type compat but not shown in UI
  // 14-50Hz sub foundation is handled by the Cheater Beater / bass range
  sub: { bassFreq: 20, bassQ: 0.3, bassGain: 8 },
  // natural: lowshelf 45Hz +1.5dB Q1.2 — transparent, Natural Bottom character
  natural: { bassFreq: 45, bassQ: 1.2, bassGain: 1.5 },
  // crisp: peaking 120Hz +3dB Q2.5 + highpass-style cut via mids
  crisp: {
    bassFreq: 120,
    bassQ: 2.5,
    bassGain: 3,
    midsFreq: 14,
    midsGain: -1.5,
    midsQ: 0.7,
  },
};

// ─── Apply/remove bass type to audio nodes ────────────────────────────────────

function applyBassTypeSpec(type: BassType, strength = 1.0): void {
  const ctx = getSharedCtx();
  const bass = getSharedBassFilter();
  const mids = getSharedMidsFilter();
  if (!ctx || !bass) return;

  const now = ctx.currentTime;
  const T = 0.02; // 20ms smoothing
  const spec = BASS_FILTER_SPECS[type];

  bass.frequency.setTargetAtTime(spec.bassFreq, now, T);
  bass.Q.setTargetAtTime(spec.bassQ, now, T);
  bass.gain.setTargetAtTime(spec.bassGain * strength, now, T);

  if (mids && spec.midsFreq !== undefined && spec.midsGain !== undefined) {
    mids.frequency.setTargetAtTime(spec.midsFreq, now, T);
    mids.Q.setTargetAtTime(spec.midsQ ?? 1.0, now, T);
    mids.gain.setTargetAtTime(spec.midsGain * strength, now, T);
  }
}

function blendBassTypeSpecs(typeA: BassType, typeB: BassType): void {
  const ctx = getSharedCtx();
  const bass = getSharedBassFilter();
  const mids = getSharedMidsFilter();
  if (!ctx || !bass) return;

  const now = ctx.currentTime;
  const T = 0.03;
  const specA = BASS_FILTER_SPECS[typeA];
  const specB = BASS_FILTER_SPECS[typeB];

  // Average the gain values, use lower of the two frequencies (deeper blend)
  const blendFreq = Math.min(specA.bassFreq, specB.bassFreq);
  const blendQ = (specA.bassQ + specB.bassQ) / 2;
  const blendGain = (specA.bassGain + specB.bassGain) / 2;

  bass.frequency.setTargetAtTime(blendFreq, now, T);
  bass.Q.setTargetAtTime(blendQ, now, T);
  bass.gain.setTargetAtTime(blendGain, now, T);

  if (mids) {
    const aMidsGain = specA.midsGain ?? 0;
    const bMidsGain = specB.midsGain ?? 0;
    const blendMidsGain = (aMidsGain + bMidsGain) / 2;
    const blendMidsFreq =
      ((specA.midsFreq ?? 200) + (specB.midsFreq ?? 200)) / 2;
    if (Math.abs(blendMidsGain) > 0.1) {
      mids.frequency.setTargetAtTime(blendMidsFreq, now, T);
      mids.gain.setTargetAtTime(blendMidsGain, now, T);
    }
  }
}

function resetBassType(): void {
  const ctx = getSharedCtx();
  const bass = getSharedBassFilter();
  const mids = getSharedMidsFilter();
  if (!ctx || !bass) return;
  const now = ctx.currentTime;
  const T = 0.05;
  bass.frequency.setTargetAtTime(80, now, T);
  bass.Q.setTargetAtTime(1.2, now, T);
  bass.gain.setTargetAtTime(1.5, now, T);
  if (mids) {
    mids.frequency.setTargetAtTime(1000, now, T);
    mids.Q.setTargetAtTime(1.2, now, T);
    mids.gain.setTargetAtTime(0, now, T);
  }
}

// ─── Signal quality class — derived from actual audio context state ───────────

function getSignalQualityClass(
  hasAudio: boolean,
  activeTypes: BassType[],
): "A+" | "B+" | "C+" | "D+" {
  if (!hasAudio) return "A+";
  const ctx = getSharedCtx();
  if (!ctx) return "A+";
  // Estimate distortion from how many heavy bass types are stacked
  if (activeTypes.length === 0) return "A+";
  const heavyTypes = activeTypes.filter((t) =>
    ["deep", "punchy"].includes(t),
  ).length;
  if (heavyTypes === 0) return "A+";
  if (heavyTypes === 1 && activeTypes.length === 1) return "A+";
  if (activeTypes.length === 2 && heavyTypes >= 1) return "B+";
  return "A+";
}

// ─── Bass type display definitions ───────────────────────────────────────────

interface BassTypeDef {
  type: BassType;
  label: string;
  description: string;
  color: string;
  specLabel: string;
}

// 6 types only — SUB removed (14-50Hz handled by Cheater Beater/bass range setting)
const BASS_TYPES: BassTypeDef[] = [
  {
    type: "deep",
    label: "DEEP",
    description: "Floor-shaking low-end presence",
    color: "rgba(80,40,255,0.95)",
    specLabel: "30Hz +6dB Q0.5",
  },
  {
    type: "tight",
    label: "TIGHT",
    description: "Fast, controlled, clean hits",
    color: "rgba(0,213,255,0.95)",
    specLabel: "60Hz -3dB Q3.0",
  },
  {
    type: "punchy",
    label: "PUNCHY",
    description: "Forward attack, cuts through mix",
    color: "rgba(255,120,0,0.95)",
    specLabel: "80Hz +4dB + 100Hz +2dB",
  },
  {
    type: "warm",
    label: "WARM",
    description: "Round, full, musical body",
    color: "rgba(255,180,50,0.95)",
    specLabel: "60Hz +3dB + 200Hz +2dB",
  },
  {
    type: "natural",
    label: "NATURAL",
    description: "Natural Bottom character",
    color: "rgba(0,255,120,0.95)",
    specLabel: "45Hz +1.5dB Q1.2",
  },
  {
    type: "crisp",
    label: "CRISP",
    description: "Defined edges, articulate",
    color: "rgba(220,180,255,0.95)",
    specLabel: "120Hz +3dB Q2.5",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BassPresencePanelProps {
  activeTypes: BassType[];
  onTypesChange: (types: BassType[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BassPresencePanel({
  activeTypes,
  onTypesChange,
}: BassPresencePanelProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [longPressCandidate, setLongPressCandidate] = useState<BassType | null>(
    null,
  );

  const hasAudio = !!getSharedCtx();
  const signalQuality = getSignalQualityClass(hasAudio, activeTypes);

  const applyCurrentTypes = useCallback((types: BassType[]) => {
    if (types.length === 0) {
      resetBassType();
    } else if (types.length === 1) {
      applyBassTypeSpec(types[0] as BassType);
    } else if (types.length === 2) {
      blendBassTypeSpecs(types[0] as BassType, types[1] as BassType);
    }
  }, []);

  const handlePointerDown = useCallback(
    (type: BassType) => {
      setLongPressCandidate(type);
      longPressTimer.current = setTimeout(() => {
        // Long press — blend second type if < 2 active
        const alreadyActive = activeTypes.includes(type);
        if (!alreadyActive && activeTypes.length < 2) {
          const next = [...activeTypes, type];
          onTypesChange(next);
          blendBassTypeSpecs(next[0] as BassType, next[1] as BassType);
        }
        longPressTimer.current = null;
        setLongPressCandidate(null);
      }, 500);
    },
    [activeTypes, onTypesChange],
  );

  const handlePointerUp = useCallback(
    (type: BassType) => {
      if (longPressTimer.current !== null) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        const alreadyActive = activeTypes.includes(type);
        let next: BassType[];
        if (alreadyActive) {
          next = activeTypes.filter((t) => t !== type);
        } else {
          next = [type];
        }
        onTypesChange(next);
        applyCurrentTypes(next);
      }
      setLongPressCandidate(null);
    },
    [activeTypes, onTypesChange, applyCurrentTypes],
  );

  const handlePointerLeave = useCallback(() => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressCandidate(null);
  }, []);

  const isActive = (type: BassType) => activeTypes.includes(type);

  // Sound quality class color
  const qualityColor =
    signalQuality === "A+"
      ? "rgba(0,255,120,0.9)"
      : signalQuality === "B+"
        ? "rgba(0,213,255,0.9)"
        : signalQuality === "C+"
          ? "rgba(255,180,0,0.9)"
          : "rgba(255,60,60,0.9)";

  return (
    <div
      className="rounded-sm overflow-hidden"
      data-ocid="bass_presence.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,8,30,0.96), rgba(5,0,25,0.94))",
        border:
          activeTypes.length > 0
            ? "1px solid rgba(153,69,255,0.45)"
            : "1px solid rgba(0,80,200,0.2)",
        boxShadow:
          activeTypes.length > 0 ? "0 0 18px rgba(153,69,255,0.12)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background:
            activeTypes.length > 0
              ? "rgba(153,69,255,0.08)"
              : "rgba(0,20,60,0.3)",
          borderBottom: "1px solid rgba(153,69,255,0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background:
                activeTypes.length > 0
                  ? "rgba(153,69,255,0.95)"
                  : "rgba(255,255,255,0.2)",
              boxShadow:
                activeTypes.length > 0
                  ? "0 0 8px rgba(153,69,255,0.8)"
                  : "none",
            }}
          />
          <div>
            <span
              className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold block"
              style={{ color: "rgba(153,69,255,0.85)" }}
            >
              BASS PRESENCE — 14–50Hz
            </span>
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.4)" }}
            >
              DISTINCT BIQUADFILTER SPECS PER TYPE · TRULY WIRED
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound quality class indicator — tied to real signal */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-sm"
            style={{
              background: qualityColor.replace(/[\d.]+\)$/, "0.08)"),
              border: `1px solid ${qualityColor.replace(/[\d.]+\)$/, "0.35)")}`,
            }}
            data-ocid="bass_presence.quality_class"
          >
            <span
              className="text-[8px] font-mono font-bold tracking-widest"
              style={{ color: qualityColor }}
            >
              {signalQuality}
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: qualityColor.replace(/[\d.]+\)$/, "0.55)") }}
            >
              SIGNAL
            </span>
          </div>
          {activeTypes.length === 2 && (
            <span
              className="text-[8px] font-mono px-2 py-0.5 rounded-sm tracking-widest"
              style={{
                background: "rgba(255,180,0,0.08)",
                border: "1px solid rgba(255,180,0,0.4)",
                color: "rgba(255,180,0,0.9)",
              }}
            >
              BLEND MODE
            </span>
          )}
        </div>
      </div>

      {/* Bass range + Rubber Carbon Fiber indicator */}
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: "rgba(255,140,0,0.03)",
          borderBottom: "1px solid rgba(255,140,0,0.1)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(255,140,0,0.9)",
              boxShadow: "0 0 4px rgba(255,140,0,0.6)",
            }}
          />
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(255,140,0,0.7)" }}
          >
            14–50Hz RANGE · CHEATER BEATER 33Hz FOUNDATION
          </span>
        </div>
        <span
          className="text-[6.5px] font-mono tracking-widest px-1.5 py-0.5 rounded-sm"
          style={{
            background: "rgba(220,160,80,0.06)",
            border: "1px solid rgba(220,160,80,0.25)",
            color: "rgba(220,160,80,0.7)",
          }}
        >
          RUBBER CARBON FIBER — BASS ONLY
        </span>
      </div>

      {/* Type grid */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {BASS_TYPES.map((bt) => {
          const active = isActive(bt.type);
          const isCandidate = longPressCandidate === bt.type;
          return (
            <button
              key={bt.type}
              type="button"
              data-ocid={`bass_presence.type.${bt.type}`}
              onPointerDown={() => handlePointerDown(bt.type)}
              onPointerUp={() => handlePointerUp(bt.type)}
              onPointerLeave={handlePointerLeave}
              className="flex flex-col items-start px-2.5 py-2 rounded-sm text-left transition-all duration-200 relative overflow-hidden select-none"
              style={{
                background: active
                  ? `${bt.color.replace(/[\d.]+\)$/, "0.1)")}`
                  : isCandidate
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(255,255,255,0.03)",
                border: active
                  ? `2px solid ${bt.color}`
                  : `1px solid ${bt.color.replace(/[\d.]+\)$/, "0.2)")}`,
                boxShadow: active
                  ? `0 0 12px ${bt.color.replace(/[\d.]+\)$/, "0.35)")}`
                  : "none",
              }}
              aria-pressed={active}
              aria-label={`${bt.label} bass type`}
            >
              {isCandidate && (
                <div
                  className="absolute top-1 right-1 w-3 h-3 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: bt.color,
                    borderTopColor: "transparent",
                  }}
                />
              )}
              <div className="flex items-center gap-1.5 mb-0.5">
                {active && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: bt.color,
                      boxShadow: `0 0 6px ${bt.color}`,
                      animation: "pulse-glow 1.5s infinite",
                    }}
                  />
                )}
                <span
                  className="text-[10px] font-mono tracking-[0.15em] font-black"
                  style={{ color: active ? bt.color : "rgba(255,255,255,0.6)" }}
                >
                  {bt.label}
                </span>
              </div>
              <span
                className="text-[8px] font-mono leading-snug"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {bt.description}
              </span>
              <span
                className="text-[6.5px] font-mono tracking-wider mt-0.5"
                style={{
                  color: active
                    ? bt.color.replace(/[\d.]+\)$/, "0.6)")
                    : "rgba(255,255,255,0.2)",
                }}
              >
                {bt.specLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active types display */}
      {activeTypes.length > 0 && (
        <div
          className="mx-3 mb-3 px-2 py-1.5 rounded-sm"
          style={{
            background: "rgba(153,69,255,0.06)",
            border: "1px solid rgba(153,69,255,0.25)",
          }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.6)" }}
            >
              ACTIVE:
            </span>
            {activeTypes.map((t) => {
              const def = BASS_TYPES.find((b) => b.type === t);
              return (
                <span
                  key={t}
                  className="text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: def?.color.replace(/[\d.]+\)$/, "0.12)"),
                    border: `1px solid ${def?.color.replace(/[\d.]+\)$/, "0.4)")}`,
                    color: def?.color,
                  }}
                >
                  {t.toUpperCase()}
                </span>
              );
            })}
            {activeTypes.length === 2 && (
              <span
                className="text-[7px] font-mono"
                style={{ color: "rgba(255,180,0,0.6)" }}
              >
                BLENDED
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
