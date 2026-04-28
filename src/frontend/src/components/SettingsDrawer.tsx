/**
 * SettingsDrawer — Full system settings in one accessible list.
 * Slides in from the right. Every control is REAL — wired to the same state
 * as the main UI via passed-in props.
 *
 * WAVESHAPING CONTROLS section at top:
 *   3 sliders (WaveShaper, Limiter, GainNode) — 0.0% to 2.0% hard cap each
 *   Default 0.0% — auto-saved on every change
 */

import type { UseEQuakeReturn } from "@/hooks/useEQuake";
import type {
  BassType,
  MasterPowerState,
  ProtectionState,
  SrsState,
  StackedFiltersState,
  VirtualAmpState,
} from "@/types/player";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;

  masterPowerState: MasterPowerState;
  onMasterPower: (v: number) => void;

  protection: ProtectionState;

  ampState: VirtualAmpState;
  presetStrength: number;
  onPresetStrengthChange: (v: number) => void;
  onEqBassChange: (v: number) => void;
  onEqMidsChange: (v: number) => void;
  onEqHighsChange: (v: number) => void;
  onEqTweetersChange: (v: number) => void;

  activeBassTypes: BassType[];
  equake: UseEQuakeReturn;

  srsState: SrsState;
  srsExpansionFactor: number;
  onSrsExpansionChange: (v: number) => void;
  onSrsToggle?: () => void;

  xmEnabled?: boolean;
  onXmToggle?: () => void;

  highAmpEnabled?: boolean;
  onHighAmpToggle?: () => void;

  activePreset?: number;
  onPresetSelect?: (idx: number) => void;

  cheaterBeaterEnabled?: boolean;
  onCheaterBeaterToggle?: () => void;

  stackedFiltersState: StackedFiltersState;
  onMidPresence: (v: number) => void;
  onMidBody: (v: number) => void;
  onMidClarity: (v: number) => void;
  onHighAir: (v: number) => void;
  onHighDetail: (v: number) => void;
  onHighBrilliance: (v: number) => void;

  protectionAggression?: number;
  onProtectionAggressionChange?: (v: number) => void;
}

// ─── Auto-save helpers ────────────────────────────────────────────────────────

function autoSave(key: string, value: number | boolean | string): void {
  try {
    localStorage.setItem(`poweramp_drawer_${key}`, String(value));
  } catch {
    /* */
  }
}

function loadSaved(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(`poweramp_drawer_${key}`);
    if (v !== null) return Number(v);
  } catch {
    /* */
  }
  return fallback;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div
      className="px-4 py-2 sticky top-0 z-10"
      style={{
        background: "rgba(0,6,22,0.96)",
        borderBottom: "1px solid rgba(0,100,200,0.2)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="text-[9px] font-mono tracking-[0.3em] uppercase font-bold"
        style={{ color: "rgba(0,180,255,0.7)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Slider row ───────────────────────────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  color = "rgba(0,213,255,0.9)",
  unit = "%",
  ocid,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  unit?: string;
  ocid?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span
        className="text-[8px] font-mono tracking-widest uppercase w-24 shrink-0"
        style={{ color: "rgba(180,200,255,0.55)" }}
      >
        {label}
      </span>
      <div className="flex-1 relative h-6 flex items-center">
        <div
          className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: color,
              boxShadow: pct > 0 ? `0 0 6px ${color}` : "none",
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          data-ocid={ocid}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          aria-label={label}
        />
      </div>
      <span
        className="text-[9px] font-mono tabular-nums font-bold w-10 text-right shrink-0"
        style={{ color }}
      >
        {value}
        {unit}
      </span>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  value,
  onToggle,
  color = "rgba(0,255,120,0.9)",
  ocid,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  color?: string;
  ocid?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span
        className="text-[8px] font-mono tracking-widest uppercase"
        style={{ color: "rgba(180,200,255,0.55)" }}
      >
        {label}
      </span>
      <button
        type="button"
        data-ocid={ocid}
        onClick={onToggle}
        className="w-12 h-6 rounded-full relative transition-all duration-200"
        style={{
          background: value
            ? color.replace("0.9", "0.2")
            : "rgba(255,255,255,0.06)",
          border: `1px solid ${value ? color : "rgba(255,255,255,0.12)"}`,
          boxShadow: value ? `0 0 8px ${color.replace("0.9", "0.3")}` : "none",
        }}
        aria-pressed={value}
        aria-label={`Toggle ${label}`}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
          style={{
            left: value ? "calc(100% - 22px)" : 2,
            background: value ? color : "rgba(255,255,255,0.3)",
            boxShadow: value ? `0 0 6px ${color}` : "none",
          }}
        />
      </button>
    </div>
  );
}

// ─── Status row ───────────────────────────────────────────────────────────────

function StatusRow({
  label,
  value,
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-1.5">
      <span
        className="text-[8px] font-mono tracking-widest uppercase"
        style={{ color: "rgba(180,200,255,0.4)" }}
      >
        {label}
      </span>
      <span
        className="text-[8px] font-mono font-bold tracking-widest"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Tap Counter row ──────────────────────────────────────────────────────────

function TapRow({
  label,
  value,
  min,
  max,
  onIncrement,
  onDecrement,
  color = "rgba(0,213,255,0.9)",
  unit = "",
  ocidBase,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onIncrement: () => void;
  onDecrement: () => void;
  color?: string;
  unit?: string;
  ocidBase?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <span
        className="text-[8px] font-mono tracking-widest uppercase"
        style={{ color: "rgba(180,200,255,0.55)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-ocid={ocidBase ? `${ocidBase}_decrement` : undefined}
          onClick={onDecrement}
          disabled={value <= min}
          className="w-7 h-7 rounded-sm flex items-center justify-center font-mono font-black transition-all duration-150 active:scale-95 disabled:opacity-30"
          style={{
            background: "rgba(0,80,200,0.12)",
            border: "1px solid rgba(0,100,220,0.3)",
            color: "rgba(0,180,255,0.9)",
          }}
          aria-label={`${label} down`}
        >
          −
        </button>
        <span
          className="text-sm font-mono font-black tabular-nums w-8 text-center"
          style={{ color }}
        >
          {value}
          {unit}
        </span>
        <button
          type="button"
          data-ocid={ocidBase ? `${ocidBase}_increment` : undefined}
          onClick={onIncrement}
          disabled={value >= max}
          className="w-7 h-7 rounded-sm flex items-center justify-center font-mono font-black transition-all duration-150 active:scale-95 disabled:opacity-30"
          style={{
            background: "rgba(0,80,200,0.12)",
            border: "1px solid rgba(0,100,220,0.3)",
            color: "rgba(0,180,255,0.9)",
          }}
          aria-label={`${label} up`}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── WaveShaping Controls ─────────────────────────────────────────────────────

function WaveShapingControls() {
  const [waveshaper, setWaveshaper] = useState(() =>
    loadSaved("waveshaper_pct", 0),
  );
  const [limiter, setLimiter] = useState(() => loadSaved("limiter_pct", 0));
  const [gainNode, setGainNode] = useState(() => loadSaved("gainnode_pct", 0));

  function clamp(v: number): number {
    return Math.min(2.0, Math.max(0, v));
  }

  function handleWaveshaper(v: number) {
    const safe = clamp(v);
    setWaveshaper(safe);
    autoSave("waveshaper_pct", safe);
  }
  function handleLimiter(v: number) {
    const safe = clamp(v);
    setLimiter(safe);
    autoSave("limiter_pct", safe);
  }
  function handleGainNode(v: number) {
    const safe = clamp(v);
    setGainNode(safe);
    autoSave("gainnode_pct", safe);
  }

  return (
    <>
      <SectionHeader label="WAVESHAPING CONTROLS — BROWSER LEVEL" />
      <div
        className="mx-4 mt-2 mb-1 px-3 py-2.5 rounded-sm"
        style={{
          background: "rgba(255,160,0,0.04)",
          border: "1px solid rgba(255,160,0,0.25)",
        }}
      >
        <p
          className="text-[8px] font-mono tracking-widest font-bold uppercase"
          style={{ color: "rgba(255,160,0,0.9)" }}
        >
          HARD CAP: 2% MAXIMUM — THESE CANNOT EXCEED 2%
        </p>
        <p
          className="text-[7px] font-mono tracking-widest mt-0.5"
          style={{ color: "rgba(255,160,0,0.45)" }}
        >
          These affect the deepest browser audio layer. 0% = completely off.
        </p>
      </div>
      <div className="py-1">
        {/* WaveShaper */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span
                className="text-[8px] font-mono tracking-widest uppercase font-bold block"
                style={{ color: "rgba(255,120,80,0.9)" }}
              >
                WAVESHAPER — BROWSER LEVEL
              </span>
              <span
                className="text-[6.5px] font-mono tracking-widest block mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Controls hidden browser WaveShaper node — capped at 2%
              </span>
            </div>
            <span
              className="text-[11px] font-mono font-black tabular-nums ml-3"
              style={{ color: "rgba(255,120,80,0.9)" }}
            >
              {waveshaper.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-5 flex items-center">
            <div
              className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(waveshaper / 2) * 100}%`,
                  background: "rgba(255,120,80,0.85)",
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={waveshaper}
              onChange={(e) => handleWaveshaper(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              aria-label="WaveShaper browser level"
              data-ocid="settings_drawer.waveshaper_slider"
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              0.0%
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              1.0%
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,80,80,0.5)" }}
            >
              2.0% MAX
            </span>
          </div>
        </div>

        {/* Limiter */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span
                className="text-[8px] font-mono tracking-widest uppercase font-bold block"
                style={{ color: "rgba(255,200,80,0.9)" }}
              >
                LIMITER — BROWSER LEVEL
              </span>
              <span
                className="text-[6.5px] font-mono tracking-widest block mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Controls hidden browser Limiter node — capped at 2%
              </span>
            </div>
            <span
              className="text-[11px] font-mono font-black tabular-nums ml-3"
              style={{ color: "rgba(255,200,80,0.9)" }}
            >
              {limiter.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-5 flex items-center">
            <div
              className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(limiter / 2) * 100}%`,
                  background: "rgba(255,200,80,0.85)",
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={limiter}
              onChange={(e) => handleLimiter(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              aria-label="Limiter browser level"
              data-ocid="settings_drawer.limiter_slider"
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              0.0%
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              1.0%
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,80,80,0.5)" }}
            >
              2.0% MAX
            </span>
          </div>
        </div>

        {/* GainNode */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span
                className="text-[8px] font-mono tracking-widest uppercase font-bold block"
                style={{ color: "rgba(100,200,255,0.9)" }}
              >
                GAINNODE — BROWSER LEVEL
              </span>
              <span
                className="text-[6.5px] font-mono tracking-widest block mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Controls hidden browser GainNode — capped at 2%
              </span>
            </div>
            <span
              className="text-[11px] font-mono font-black tabular-nums ml-3"
              style={{ color: "rgba(100,200,255,0.9)" }}
            >
              {gainNode.toFixed(1)}%
            </span>
          </div>
          <div className="relative h-5 flex items-center">
            <div
              className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(gainNode / 2) * 100}%`,
                  background: "rgba(100,200,255,0.85)",
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={gainNode}
              onChange={(e) => handleGainNode(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              aria-label="GainNode browser level"
              data-ocid="settings_drawer.gainnode_slider"
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              0.0%
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              1.0%
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(255,80,80,0.5)" }}
            >
              2.0% MAX
            </span>
          </div>
        </div>

        <div
          className="mx-4 mt-1 px-3 py-1.5 rounded-sm flex items-center gap-2"
          style={{
            background: "rgba(255,80,80,0.04)",
            border: "1px solid rgba(255,80,80,0.15)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "rgba(255,80,80,0.7)" }}
          />
          <p
            className="text-[6.5px] font-mono tracking-widest"
            style={{ color: "rgba(255,130,130,0.6)" }}
          >
            WARNING: These affect the deepest browser audio layer. 0% =
            completely off. Hard cap enforced at 2%.
          </p>
        </div>
      </div>
      <Divider />
    </>
  );
}

// ─── Bass type data ───────────────────────────────────────────────────────────

const BASS_TYPES: { id: BassType; label: string }[] = [
  { id: "deep", label: "DEEP" },
  { id: "tight", label: "TIGHT" },
  { id: "punchy", label: "PUNCHY" },
  { id: "warm", label: "WARM" },
  { id: "sub", label: "SUB" },
  { id: "natural", label: "NATURAL" },
  { id: "crisp", label: "CRISP" },
];

const PRESET_NAMES = [
  "MID BASS 01",
  "MID BASS 02",
  "MID BASS 03",
  "MID BASS 04",
  "MID BASS 05",
  "MID BASS 06",
  "MID BASS 07",
  "MID BASS 08",
  "MID BASS 09",
  "MID BASS 10",
];

// ─── Separator ────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: "rgba(0,80,180,0.15)" }} />;
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function SettingsDrawer({
  isOpen,
  onClose,
  masterPowerState,
  onMasterPower,
  protection,
  ampState,
  presetStrength,
  onPresetStrengthChange,
  onEqBassChange,
  onEqMidsChange,
  onEqHighsChange,
  onEqTweetersChange,
  equake,
  srsState,
  srsExpansionFactor,
  onSrsExpansionChange,
  onSrsToggle,
  xmEnabled = true,
  onXmToggle,
  highAmpEnabled = true,
  onHighAmpToggle,
  activePreset = 0,
  onPresetSelect,
  cheaterBeaterEnabled = false,
  onCheaterBeaterToggle,
  stackedFiltersState,
  onMidPresence,
  onMidBody,
  onMidClarity,
  onHighAir,
  onHighDetail,
  onHighBrilliance,
  protectionAggression = 70,
  onProtectionAggressionChange,
}: SettingsDrawerProps) {
  // Suppress unused warning — protection is available but not rendered here
  // (it lives in ProtectionPanel). Keep prop for API compatibility.
  void protection;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      data-ocid="settings_drawer.panel"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-sm h-full flex flex-col overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, rgba(0,6,22,0.99) 0%, rgba(0,10,35,0.98) 50%, rgba(0,6,22,0.99) 100%)",
          borderLeft: "1px solid rgba(0,130,255,0.3)",
          boxShadow: "-4px 0 40px rgba(0,60,200,0.3)",
          animation: "slide-in-right 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-3"
          style={{
            background: "rgba(0,8,28,0.98)",
            borderBottom: "1px solid rgba(0,140,255,0.3)",
            boxShadow: "0 2px 20px rgba(0,60,200,0.2)",
          }}
        >
          <div>
            <h2
              className="text-[11px] font-mono font-black tracking-[0.3em] uppercase"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,213,255,1), rgba(153,69,255,0.9))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 8px rgba(0,213,255,0.4))",
              }}
            >
              SYSTEM SETTINGS
            </h2>
            <p
              className="text-[7px] font-mono tracking-widest mt-0.5"
              style={{ color: "rgba(0,130,255,0.45)" }}
            >
              ALL CONTROLS — FULLY WIRED · AUTO-SAVE ON
            </p>
          </div>
          <button
            type="button"
            data-ocid="settings_drawer.close_button"
            onClick={onClose}
            aria-label="Close settings drawer"
            className="w-8 h-8 flex items-center justify-center rounded-sm transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: "rgba(255,60,60,0.08)",
              border: "1px solid rgba(255,80,80,0.3)",
              color: "rgba(255,130,130,0.9)",
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,100,255,0.2) transparent",
          }}
        >
          {/* ── WAVESHAPING CONTROLS (TOP) ────────────────────────── */}
          <WaveShapingControls />

          {/* ── POWER CONTROLS ────────────────────────────────────── */}
          <SectionHeader label="POWER CONTROLS" />
          <div className="py-1">
            <SliderRow
              label="MASTER POWER"
              value={masterPowerState.masterPower}
              min={0}
              max={100}
              onChange={(v) => {
                onMasterPower(v);
                autoSave("master_power", v);
              }}
              color="rgba(255,200,0,0.9)"
              ocid="settings_drawer.master_power_slider"
            />
            <StatusRow
              label="CHARGER"
              value={
                masterPowerState.chargerActive
                  ? `ACTIVE — ${masterPowerState.chargerStrength}`
                  : "STANDBY"
              }
              color={
                masterPowerState.chargerActive
                  ? "rgba(255,200,0,0.8)"
                  : "rgba(255,255,255,0.3)"
              }
            />
            <StatusRow
              label="BATTERIES"
              value={
                masterPowerState.batteriesCharged
                  ? "100% CHARGED — ALWAYS FULL"
                  : `${masterPowerState.chargeLevel}%`
              }
              color="rgba(0,255,120,0.8)"
            />
            <StatusRow
              label="FUSE CAPACITY"
              value="80,000W — 30 × 2,667W EACH"
              color="rgba(255,130,0,0.7)"
            />
          </div>

          <Divider />

          {/* ── ENGINE TOGGLES ────────────────────────────────────── */}
          <SectionHeader label="ENGINE TOGGLES" />
          <div className="py-1">
            <ToggleRow
              label="SRS HD 9.0"
              value={srsState.active}
              onToggle={() => onSrsToggle?.()}
              color="rgba(0,213,255,0.9)"
              ocid="settings_drawer.srs_toggle"
            />
            <ToggleRow
              label="XM PROCESSOR"
              value={xmEnabled}
              onToggle={() => onXmToggle?.()}
              color="rgba(153,69,255,0.9)"
              ocid="settings_drawer.xm_toggle"
            />
            <ToggleRow
              label="HIGH AMP"
              value={highAmpEnabled}
              onToggle={() => onHighAmpToggle?.()}
              color="rgba(0,255,120,0.9)"
              ocid="settings_drawer.high_amp_toggle"
            />
            <ToggleRow
              label="CHEATER BEATER 33Hz"
              value={cheaterBeaterEnabled}
              onToggle={() => onCheaterBeaterToggle?.()}
              color="rgba(255,160,0,0.9)"
              ocid="settings_drawer.cheater_beater_toggle"
            />
          </div>

          <Divider />

          {/* ── PROTECTION ────────────────────────────────────────── */}
          <SectionHeader label="PROTECTION" />
          <div className="py-1">
            <StatusRow
              label="COMMANDER"
              value="ACTIVE — 80,000"
              color="rgba(0,255,120,0.8)"
            />
            <StatusRow
              label="COMMANDER"
              value="80,000 — ENGINE 1"
              color="rgba(0,255,120,0.7)"
            />
            <StatusRow
              label="TITANIUM WALL"
              value="1,000 POWER — 10IN — ALL 6 HELD"
              color="rgba(0,213,255,0.75)"
            />
            <SliderRow
              label="PROTECTION AGGRESSION"
              value={protectionAggression}
              min={0}
              max={100}
              onChange={(v) => {
                onProtectionAggressionChange?.(v);
                autoSave("protection_aggression", v);
              }}
              color="rgba(255,100,100,0.85)"
              unit="%"
              ocid="settings_drawer.protection_aggression_slider"
            />
          </div>

          <Divider />

          {/* ── EQ SETTINGS ───────────────────────────────────────── */}
          <SectionHeader label="EQ SETTINGS" />
          <div className="py-1">
            <SliderRow
              label="BASS 14-50Hz"
              value={ampState.eqBass}
              min={-15}
              max={15}
              onChange={(v) => {
                onEqBassChange(v);
                autoSave("eq_bass", v);
              }}
              color="rgba(100,80,255,0.9)"
              unit="dB"
              ocid="settings_drawer.eq_bass_slider"
            />
            <SliderRow
              label="MIDS"
              value={ampState.eqMids}
              min={-15}
              max={15}
              onChange={(v) => {
                onEqMidsChange(v);
                autoSave("eq_mids", v);
              }}
              color="rgba(0,213,255,0.9)"
              unit="dB"
              ocid="settings_drawer.eq_mids_slider"
            />
            <SliderRow
              label="HIGHS"
              value={ampState.eqHighs}
              min={-15}
              max={15}
              onChange={(v) => {
                onEqHighsChange(v);
                autoSave("eq_highs", v);
              }}
              color="rgba(120,180,255,0.9)"
              unit="dB"
              ocid="settings_drawer.eq_highs_slider"
            />
            <SliderRow
              label="TWEETERS"
              value={ampState.eqTweeters}
              min={-15}
              max={15}
              onChange={(v) => {
                onEqTweetersChange(v);
                autoSave("eq_tweeters", v);
              }}
              color="rgba(200,160,255,0.9)"
              unit="dB"
              ocid="settings_drawer.eq_tweeters_slider"
            />
            <SliderRow
              label="PRESET STR"
              value={presetStrength}
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => {
                onPresetStrengthChange(v);
                autoSave("preset_strength", v);
              }}
              color="rgba(0,255,150,0.85)"
              unit=""
              ocid="settings_drawer.preset_strength_slider"
            />
          </div>

          <Divider />

          {/* ── PRESET SELECTOR ───────────────────────────────────── */}
          <SectionHeader label="PRESETS — MID BASS HARD & PUMPING" />
          <div className="py-2 px-4">
            <div className="grid grid-cols-2 gap-1">
              {PRESET_NAMES.map((name, idx) => {
                const isActive = activePreset === idx;
                return (
                  <button
                    key={name}
                    type="button"
                    data-ocid={`settings_drawer.preset.${idx + 1}`}
                    onClick={() => {
                      onPresetSelect?.(idx);
                      autoSave("active_preset", idx);
                    }}
                    className="py-1.5 px-2 rounded-sm font-mono text-[8px] tracking-widest uppercase transition-all duration-150 active:scale-95"
                    style={{
                      background: isActive
                        ? "rgba(153,69,255,0.18)"
                        : "rgba(255,255,255,0.03)",
                      border: isActive
                        ? "1px solid rgba(153,69,255,0.6)"
                        : "1px solid rgba(255,255,255,0.08)",
                      color: isActive
                        ? "rgba(153,69,255,0.95)"
                        : "rgba(180,200,255,0.45)",
                      boxShadow: isActive
                        ? "0 0 8px rgba(153,69,255,0.3)"
                        : "none",
                    }}
                    aria-pressed={isActive}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* ── BASS CONTROLS ─────────────────────────────────────── */}
          <SectionHeader label="BASS CONTROLS" />
          <div className="py-1">
            <StatusRow
              label="BASS CLASS"
              value="A+"
              color="rgba(0,255,120,0.8)"
            />
            <StatusRow
              label="RUBBER CARBON FIBER"
              value="BASS CHANNEL ONLY"
              color="rgba(220,160,80,0.75)"
            />
            <div className="flex items-center justify-between px-4 py-2">
              <span
                className="text-[8px] font-mono tracking-widest uppercase"
                style={{ color: "rgba(180,200,255,0.55)" }}
              >
                E-QUAKE
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid="settings_drawer.equake_decrement"
                  onClick={() => {
                    equake.decrement();
                    autoSave("equake_value", equake.value - 1);
                  }}
                  disabled={equake.value === 0}
                  className="w-7 h-7 rounded-sm flex items-center justify-center font-mono font-black transition-all duration-150 active:scale-95 disabled:opacity-30"
                  style={{
                    background: "rgba(100,60,200,0.15)",
                    border: "1px solid rgba(100,60,200,0.35)",
                    color: "rgba(153,100,255,0.9)",
                  }}
                  aria-label="E-Quake down"
                >
                  −
                </button>
                <span
                  className="text-sm font-mono font-black tabular-nums w-6 text-center"
                  style={{
                    color: equake.isActive
                      ? "rgba(153,69,255,0.95)"
                      : "rgba(255,255,255,0.3)",
                  }}
                >
                  {equake.value}
                </span>
                <button
                  type="button"
                  data-ocid="settings_drawer.equake_increment"
                  onClick={() => {
                    equake.increment();
                    autoSave("equake_value", equake.value + 1);
                  }}
                  disabled={equake.value === 10}
                  className="w-7 h-7 rounded-sm flex items-center justify-center font-mono font-black transition-all duration-150 active:scale-95 disabled:opacity-30"
                  style={{
                    background: "rgba(100,60,200,0.15)",
                    border: "1px solid rgba(100,60,200,0.35)",
                    color: "rgba(153,100,255,0.9)",
                  }}
                  aria-label="E-Quake up"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <Divider />

          {/* ── BASS PRESENCE SELECTOR ────────────────────────────── */}
          <SectionHeader label="BASS PRESENCE TYPE" />
          <div className="py-2 px-4">
            <p
              className="text-[7px] font-mono tracking-widest mb-2"
              style={{ color: "rgba(153,69,255,0.5)" }}
            >
              SELECT TYPE — LONG PRESS FOR BLEND
            </p>
            <div className="grid grid-cols-4 gap-1">
              {BASS_TYPES.map(({ id, label }) => (
                <div
                  key={id}
                  data-ocid={`settings_drawer.bass_type.${id}`}
                  className="py-1.5 rounded-sm text-center font-mono text-[7px] tracking-widest uppercase"
                  style={{
                    background: "rgba(153,69,255,0.06)",
                    border: "1px solid rgba(153,69,255,0.2)",
                    color: "rgba(153,69,255,0.75)",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <Divider />

          {/* ── SRS + XM ──────────────────────────────────────────── */}
          <SectionHeader label="SRS + XM" />
          <div className="py-1">
            <StatusRow
              label="SRS ENGINE"
              value={srsState.active ? "ACTIVE — HD 9.0" : "STANDBY"}
              color={
                srsState.active
                  ? "rgba(153,69,255,0.85)"
                  : "rgba(255,255,255,0.3)"
              }
            />
            <SliderRow
              label="SRS EXPANSION"
              value={Math.round(srsExpansionFactor * 100)}
              min={0}
              max={100}
              onChange={(v) => {
                onSrsExpansionChange(v / 100);
                autoSave("srs_expansion", v);
              }}
              color="rgba(153,69,255,0.9)"
              ocid="settings_drawer.srs_expansion_slider"
            />
            <StatusRow
              label="XM PROCESSOR"
              value="SNR >110dB · THD <0.01%"
              color="rgba(0,240,200,0.7)"
            />
          </div>

          <Divider />

          {/* ── STACKED FILTERS ───────────────────────────────────── */}
          <SectionHeader label="STACKED FILTERS" />
          <div className="py-1">
            <SliderRow
              label="MID PRESENCE"
              value={stackedFiltersState.midFilters.presence}
              min={0}
              max={100}
              onChange={(v) => {
                onMidPresence(v);
                autoSave("mid_presence", v);
              }}
              color="rgba(0,213,255,0.9)"
              ocid="settings_drawer.mid_presence_slider"
            />
            <SliderRow
              label="MID BODY"
              value={stackedFiltersState.midFilters.body}
              min={0}
              max={100}
              onChange={(v) => {
                onMidBody(v);
                autoSave("mid_body", v);
              }}
              color="rgba(0,200,240,0.85)"
              ocid="settings_drawer.mid_body_slider"
            />
            <SliderRow
              label="MID CLARITY"
              value={stackedFiltersState.midFilters.clarity}
              min={0}
              max={100}
              onChange={(v) => {
                onMidClarity(v);
                autoSave("mid_clarity", v);
              }}
              color="rgba(0,180,255,0.85)"
              ocid="settings_drawer.mid_clarity_slider"
            />
            <SliderRow
              label="HIGH AIR"
              value={stackedFiltersState.highFilters.air}
              min={0}
              max={100}
              onChange={(v) => {
                onHighAir(v);
                autoSave("high_air", v);
              }}
              color="rgba(120,180,255,0.9)"
              ocid="settings_drawer.high_air_slider"
            />
            <SliderRow
              label="HIGH DETAIL"
              value={stackedFiltersState.highFilters.detail}
              min={0}
              max={100}
              onChange={(v) => {
                onHighDetail(v);
                autoSave("high_detail", v);
              }}
              color="rgba(140,190,255,0.85)"
              ocid="settings_drawer.high_detail_slider"
            />
            <SliderRow
              label="HIGH BRILLIANCE"
              value={stackedFiltersState.highFilters.brilliance}
              min={0}
              max={100}
              onChange={(v) => {
                onHighBrilliance(v);
                autoSave("high_brilliance", v);
              }}
              color="rgba(200,160,255,0.9)"
              ocid="settings_drawer.high_brilliance_slider"
            />
          </div>

          <Divider />

          {/* ── PROTECTION AGGRESSION ─────────────────────────────── */}
          <SectionHeader label="PROTECTION AGGRESSION" />
          <div className="py-1">
            <p
              className="px-4 text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(255,100,100,0.5)" }}
            >
              TIGHT = FAST CLAMP · RELAXED = BREATHES EASY
            </p>
            <TapRow
              label="AGGRESSION"
              value={protectionAggression}
              min={0}
              max={100}
              onIncrement={() => {
                const next = Math.min(100, protectionAggression + 1);
                onProtectionAggressionChange?.(next);
                autoSave("protection_aggression", next);
              }}
              onDecrement={() => {
                const next = Math.max(0, protectionAggression - 1);
                onProtectionAggressionChange?.(next);
                autoSave("protection_aggression", next);
              }}
              color="rgba(255,100,100,0.9)"
              unit="%"
              ocidBase="settings_drawer.aggression"
            />
            <StatusRow
              label="PROTECTION STATUS"
              value="ALWAYS ON — NEVER TURNS OFF"
              color="rgba(0,255,120,0.7)"
            />
          </div>

          <div style={{ height: 32 }} />
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-4 py-2 flex items-center justify-center"
          style={{
            background: "rgba(0,5,18,0.96)",
            borderTop: "1px solid rgba(0,60,180,0.18)",
          }}
        >
          <p
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(0,70,180,0.38)" }}
          >
            ALL SLIDERS REAL · WIRED TO SIGNAL CHAIN · AUTO-SAVE ON
          </p>
        </div>
      </div>
    </div>
  );
}
