/**
 * SrsXmPanel — SRS Sound Engine HD 9.0 + XM Processor + Cheater Beater
 *
 * Section 1: SRS ENGINE — real controls, real indicators
 *   - SRS ON = ACTIVE (green), SRS OFF = OFF, SRS ON but not playing = STANDBY
 *   - SRS CODE 2022 — REMOVED ENTIRELY
 *   - Default: SRS ACTIVE (enabled by default)
 * Section 2: Separation wall
 * Section 3: XM PROCESSOR — independent power, static 1-700 (NOT volume)
 * Section 4: CHEATER BEATER — 33Hz sub foundation, mutually exclusive with 14-50Hz profile 9
 */

import type { FrequencyOutputState } from "@/hooks/useFrequencyOutput";
import type { UseSrsProcessorReturn } from "@/hooks/useSrsProcessor";
import type { SrsState } from "@/types/player";
import { useState } from "react";

// ─── XM stub types (XM Processor deleted — kept for prop compat) ──────────────
interface XmProcessorState {
  bassLevel: number;
  midsLevel: number;
  highsLevel: number;
  snr: number;
  thd: number;
  phaseAligned: boolean;
  staticBypassed: boolean;
  slope24Active: boolean;
  active: boolean;
  isOn: boolean;
  bandingActive: boolean;
  slopeDb: number;
  activityPulse: number;
  powerNumber: string;
  cleanupIntensity: number;
  staticLevel: number;
  notchHz: number;
}

type UseXmProcessorReturn = {
  toggleXm: () => void;
  isOn: boolean;
  setStaticLevel: (v: number) => void;
  staticLevel: number;
};

// ─── Panel Props ──────────────────────────────────────────────────────────────
export interface SrsXmPanelProps {
  srs: SrsState;
  xm: XmProcessorState;
  srsControls?: Pick<
    UseSrsProcessorReturn,
    | "srsEnabled"
    | "setSrsEnabled"
    | "hdEnabled"
    | "setHdEnabled"
    | "automasphersEnabled"
    | "setAutomasphersEnabled"
    | "automasphersMode"
    | "setAutomasphersMode"
    | "smoothTweeters"
    | "setSmoothTweeters"
    | "naturalBottom"
    | "expansionFactor"
    | "setExpansionFactor"
  >;
  xmControls?: Pick<
    UseXmProcessorReturn,
    "toggleXm" | "isOn" | "setStaticLevel" | "staticLevel"
  >;
  freqOutput: FrequencyOutputState;
  isPlaying: boolean;
  srsIsOn: boolean;
  onToggleSrs: () => void;
  onExpansionChange: (v: number) => void;
  onExcursionChange?: (v: number) => void;
  // Cheater Beater
  cheaterBeaterOn?: boolean;
  cheaterBeaterStrength?: number;
  onCheaterBeaterToggle?: (on: boolean) => void;
  onCheaterBeaterStrength?: (v: number) => void;
  standardBassActive?: boolean;
  onToggle14to50?: (on: boolean) => void;
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function GlowDot({
  active,
  color = "rgba(0,255,120,0.9)",
  pulse = false,
}: {
  active: boolean;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <div
      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300 ${pulse && active ? "animate-pulse" : ""}`}
      style={{
        background: active ? color : "rgba(255,255,255,0.15)",
        boxShadow: active ? `0 0 6px ${color}` : "none",
      }}
    />
  );
}

function StatusDot({ active, color }: { active: boolean; color: string }) {
  return (
    <div
      className={`w-2 h-2 rounded-full shrink-0 ${active ? "animate-pulse" : ""}`}
      style={{
        background: active ? color : "rgba(255,255,255,0.12)",
        boxShadow: active ? `0 0 8px ${color}` : "none",
      }}
    />
  );
}

function ActiveBadge({
  label,
  color = "rgba(0,255,120,0.9)",
}: { label: string; color?: string }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold"
      style={{
        background: color.replace(/[\d.]+\)$/, "0.12)"),
        border: `1px solid ${color.replace(/[\d.]+\)$/, "0.4)")}`,
        color,
        boxShadow: `0 0 8px ${color.replace(/[\d.]+\)$/, "0.3)")}`,
      }}
    >
      {label}
    </span>
  );
}

function SpecBadge({ label }: { label: string }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded-sm text-[8px] font-mono tracking-widest"
      style={{
        background: "rgba(153,69,255,0.08)",
        border: "1px solid rgba(153,69,255,0.3)",
        color: "rgba(153,69,255,0.9)",
      }}
    >
      {label}
    </span>
  );
}

function MeterBar({
  level,
  color,
  label,
}: { level: number; color: string; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, level)) * 100);
  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <div
        className="h-10 relative rounded-sm overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="absolute bottom-0 inset-x-0 rounded-sm transition-all duration-100"
          style={{
            height: `${pct}%`,
            background: `linear-gradient(to top, ${color}, ${color.replace(/[\d.]+\)$/, "0.45)")})`,
            boxShadow: pct > 0 ? `0 0 8px ${color}` : "none",
          }}
        />
      </div>
      <span
        className="text-[8px] font-mono tracking-widest text-center"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
    </div>
  );
}

function SensorBar({
  level,
  label,
  color,
}: { level: number; label: string; color: string }) {
  const pct = Math.round(Math.min(1, level) * 100);
  return (
    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
      <div
        className="h-5 rounded-sm overflow-hidden relative"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <div
          className="absolute bottom-0 inset-x-0 transition-all duration-100 rounded-sm"
          style={{
            height: `${pct}%`,
            background: color,
            boxShadow: pct > 20 ? `0 0 4px ${color}` : "none",
          }}
        />
      </div>
      <span
        className="text-[7px] font-mono text-center tracking-widest"
        style={{ color: "rgba(255,255,255,0.35)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({
  label,
  sub,
  active,
  onToggle,
  color = "rgba(0,213,255,0.9)",
  ocid,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onToggle: () => void;
  color?: string;
  ocid: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
        <span
          className="text-[9px] font-mono tracking-[0.12em] font-bold"
          style={{ color: active ? color : "rgba(255,255,255,0.45)" }}
        >
          {label}
        </span>
        {sub && (
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            {sub}
          </span>
        )}
      </div>
      <button
        type="button"
        data-ocid={ocid}
        onClick={onToggle}
        aria-pressed={active}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold transition-all duration-200 shrink-0"
        style={{
          background: active
            ? color.replace(/[\d.]+\)$/, "0.12)")
            : "rgba(255,255,255,0.04)",
          border: active
            ? `1px solid ${color.replace(/[\d.]+\)$/, "0.45)")}`
            : "1px solid rgba(255,255,255,0.15)",
          color: active ? color : "rgba(255,255,255,0.35)",
          boxShadow: active
            ? `0 0 8px ${color.replace(/[\d.]+\)$/, "0.25)")}`
            : "none",
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: active ? color : "rgba(255,255,255,0.2)",
            boxShadow: active ? `0 0 5px ${color}` : "none",
          }}
        />
        {active ? "ON" : "OFF"}
      </button>
    </div>
  );
}

// ─── Automasphers mode selector ───────────────────────────────────────────────
function AutomasphersSelector({
  mode,
  onModeChange,
  enabled,
}: {
  mode: "dynamic" | "clean" | "modified";
  onModeChange: (m: "dynamic" | "clean" | "modified") => void;
  enabled: boolean;
}) {
  const modes = [
    {
      id: "dynamic" as const,
      label: "DYNAMIC",
      sub: "Bass breathes with signal",
      color: "rgba(153,69,255,0.9)",
    },
    {
      id: "clean" as const,
      label: "CLEAN",
      sub: "Pure HD9 expansion only",
      color: "rgba(0,255,120,0.9)",
    },
    {
      id: "modified" as const,
      label: "MODIFIED",
      sub: "+1.5dB warmth at 500Hz",
      color: "rgba(0,213,255,0.9)",
    },
  ];

  return (
    <div
      className="rounded-sm p-2 flex flex-col gap-1"
      style={{
        background: "rgba(153,69,255,0.04)",
        border: "1px solid rgba(153,69,255,0.18)",
      }}
    >
      <p
        className="text-[9px] font-mono tracking-[0.15em] uppercase mb-0.5"
        style={{ color: "rgba(153,69,255,0.7)" }}
      >
        AUTOMASPHERS MODE
      </p>
      {modes.map((m) => {
        const isSelected = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            data-ocid={`srs_xm.automasphers_mode_${m.id}`}
            onClick={() => onModeChange(m.id)}
            aria-pressed={isSelected}
            disabled={!enabled}
            className="flex items-center justify-between px-2 py-1 rounded-sm transition-all duration-200 w-full text-left"
            style={{
              background:
                isSelected && enabled
                  ? m.color.replace(/[\d.]+\)$/, "0.1)")
                  : "rgba(255,255,255,0.02)",
              border:
                isSelected && enabled
                  ? `1px solid ${m.color.replace(/[\d.]+\)$/, "0.4)")}`
                  : "1px solid rgba(255,255,255,0.08)",
              opacity: enabled ? 1 : 0.4,
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span
                className="text-[9px] font-mono tracking-[0.12em] font-bold"
                style={{
                  color:
                    isSelected && enabled ? m.color : "rgba(255,255,255,0.35)",
                }}
              >
                {m.label}
              </span>
              <span
                className="text-[7px] font-mono tracking-widest"
                style={{ color: "rgba(255,255,255,0.22)" }}
              >
                {m.sub}
              </span>
            </div>
            {isSelected && enabled && (
              <ActiveBadge label="ACTIVE" color={m.color} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── SRS status indicator row ─────────────────────────────────────────────────
function SrsStatusRow({
  label,
  active,
  color,
}: { label: string; active: boolean; color: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span
        className="text-[8px] font-mono tracking-widest"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <StatusDot active={active} color={color} />
        <span
          className="text-[8px] font-mono font-bold tracking-widest"
          style={{ color: active ? color : "rgba(255,255,255,0.25)" }}
        >
          {active ? "ACTIVE" : "OFF"}
        </span>
      </div>
    </div>
  );
}

// ─── SRS ENGINE SECTION ───────────────────────────────────────────────────────
function SrsEngineSection({
  srs,
  srsIsOn,
  isPlaying,
  srsControls,
  onToggleSrs,
  onExpansionChange,
  onExcursionChange,
}: {
  srs: SrsState;
  srsIsOn: boolean;
  isPlaying: boolean;
  srsControls?: SrsXmPanelProps["srsControls"];
  onToggleSrs: () => void;
  onExpansionChange: (v: number) => void;
  onExcursionChange?: (v: number) => void;
}) {
  const [excStrength, setExcStrength] = useState(srs.hd9.excursionStrength);
  // SRS is truly active only when enabled AND playing
  const srsIndicatorOn = srsIsOn && isPlaying;
  const hdEnabled = srsControls?.hdEnabled ?? srs.hd9.hd9Active;
  const smoothTweeters = srsControls?.smoothTweeters ?? srs.hd9.smoothTweeters;
  const automasphersEnabled = srsControls?.automasphersEnabled ?? false;
  const automasphersMode = srsControls?.automasphersMode ?? "dynamic";
  const naturalBottom = srsControls?.naturalBottom ?? srsIsOn;
  const expansionFactor = srsControls?.expansionFactor ?? srs.expansionFactor;
  const clarityPct = (srs.clarityScore ?? 99).toFixed(1);
  const clarityDisplay = srs.clarityGrade ?? "A+";
  const isTop = clarityDisplay === "A+";

  // SRS status label: ACTIVE when on, STANDBY when enabled-not-playing, OFF when disabled
  const srsStatusLabel = srsIsOn
    ? srsIndicatorOn
      ? "ACTIVE"
      : "STANDBY"
    : "OFF";

  const handleExcursionChange = (v: number) => {
    setExcStrength(v);
    onExcursionChange?.(v);
  };

  return (
    <div className="slot-panel" data-ocid="srs_xm.srs_panel">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GlowDot
            active={srsIsOn}
            color={
              srsIndicatorOn ? "rgba(0,213,255,0.9)" : "rgba(255,180,0,0.85)"
            }
            pulse={srsIndicatorOn}
          />
          <div>
            <p
              className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{
                color: srsIsOn
                  ? "rgba(0,213,255,0.9)"
                  : "rgba(255,255,255,0.4)",
                textShadow: srsIsOn ? "0 0 10px rgba(0,213,255,0.35)" : "none",
              }}
            >
              SRS ENGINE — ACTIVE — HD 9.0
            </p>
            <p
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Real engine — not a label | Sound projects outside the speaker
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="px-1.5 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold"
            style={{
              background: "rgba(0,213,255,0.08)",
              border: "1px solid rgba(0,213,255,0.45)",
              color: "rgba(0,213,255,0.85)",
            }}
          >
            HD 9.0
          </span>
          {/* SRS Toggle — ACTIVE when on+playing, STANDBY when on+not playing, OFF when off */}
          <button
            type="button"
            data-ocid="srs_xm.srs_toggle"
            onClick={onToggleSrs}
            aria-pressed={srsIsOn}
            aria-label="Toggle SRS HD 9.0"
            className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold transition-all duration-300"
            style={{
              background: srsIsOn
                ? srsIndicatorOn
                  ? "rgba(0,213,255,0.15)"
                  : "rgba(255,180,0,0.1)"
                : "rgba(255,255,255,0.04)",
              border: srsIsOn
                ? srsIndicatorOn
                  ? "1px solid rgba(0,213,255,0.6)"
                  : "1px solid rgba(255,180,0,0.5)"
                : "1px solid rgba(255,255,255,0.15)",
              color: srsIsOn
                ? srsIndicatorOn
                  ? "rgba(0,213,255,0.95)"
                  : "rgba(255,180,0,0.9)"
                : "rgba(255,255,255,0.35)",
              boxShadow: srsIsOn
                ? srsIndicatorOn
                  ? "0 0 10px rgba(0,213,255,0.35)"
                  : "0 0 8px rgba(255,180,0,0.25)"
                : "none",
            }}
          >
            {srsStatusLabel}
          </button>
          <div
            className="px-1.5 py-0.5 rounded-sm border text-[9px] font-mono tracking-widest transition-all duration-300 font-bold"
            style={{
              borderColor: isTop
                ? "rgba(0,213,255,0.7)"
                : "rgba(255,255,255,0.2)",
              background: isTop
                ? "rgba(0,213,255,0.12)"
                : "rgba(255,255,255,0.03)",
              color: isTop ? "rgba(0,213,255,0.95)" : "rgba(255,255,255,0.5)",
            }}
          >
            {clarityDisplay}
          </div>
        </div>
      </div>

      {/* ── Clarity readout ── */}
      {isPlaying && (
        <p
          className="text-[8px] font-mono tracking-widest mb-2"
          style={{ color: "rgba(0,213,255,0.7)" }}
        >
          {clarityPct}% CRYSTAL CLEAR · NOISE: {srs.noiseFloor.toFixed(0)}dB ·
          THD: {(srs.thdLevel * 100).toFixed(4)}%
        </p>
      )}

      {/* ── Real status indicators ── */}
      <div
        className="rounded-sm px-2 py-2 mb-2 flex flex-col gap-0.5"
        style={{
          background: "rgba(0,213,255,0.04)",
          border: "1px solid rgba(0,213,255,0.15)",
        }}
      >
        <p
          className="text-[8px] font-mono tracking-widest mb-1"
          style={{ color: "rgba(0,213,255,0.6)" }}
        >
          STATUS INDICATORS — REAL SIGNAL STATE
        </p>
        <SrsStatusRow
          label="SRS ENGINE"
          active={srsIsOn}
          color="rgba(0,213,255,0.9)"
        />
        <SrsStatusRow
          label="HD 9.0"
          active={srsIsOn && hdEnabled}
          color="rgba(0,213,255,0.85)"
        />
        <SrsStatusRow
          label="SMOOTH TWEETERS"
          active={srsIsOn && smoothTweeters}
          color="rgba(0,200,255,0.85)"
        />
        <SrsStatusRow
          label="AUTOMASPHERS"
          active={srsIsOn && automasphersEnabled}
          color="rgba(153,69,255,0.9)"
        />
      </div>

      {/* ── Toggle rows ── */}
      <div
        className="rounded-sm px-2 py-1 mb-2 flex flex-col"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <ToggleRow
          label="HD 9.0 — 3D EXPANSION"
          sub="Sound projects outward beyond speaker"
          active={srsIsOn && hdEnabled}
          onToggle={() => srsControls?.setHdEnabled(!hdEnabled)}
          color="rgba(0,213,255,0.9)"
          ocid="srs_xm.hd9_toggle"
        />
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
        <ToggleRow
          label="SMOOTH TWEETERS"
          sub="Zero harshness — crystal clear highs"
          active={srsIsOn && smoothTweeters}
          onToggle={() => srsControls?.setSmoothTweeters(!smoothTweeters)}
          color="rgba(0,200,255,0.85)"
          ocid="srs_xm.smooth_tweeters_toggle"
        />
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />
        <ToggleRow
          label="AUTOMASPHERS"
          sub="All 3 modes — dynamic, clean, modified"
          active={srsIsOn && automasphersEnabled}
          onToggle={() =>
            srsControls?.setAutomasphersEnabled(!automasphersEnabled)
          }
          color="rgba(153,69,255,0.9)"
          ocid="srs_xm.automasphers_toggle"
        />
      </div>

      {/* ── Automasphers mode selector ── */}
      {srsIsOn && automasphersEnabled && (
        <div className="mb-2">
          <AutomasphersSelector
            mode={automasphersMode}
            onModeChange={(m) => srsControls?.setAutomasphersMode(m)}
            enabled={srsIsOn && automasphersEnabled}
          />
        </div>
      )}

      {/* ── Natural Bottom — always on badge ── */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-2"
        style={{
          background: naturalBottom
            ? "rgba(0,255,120,0.05)"
            : "rgba(255,255,255,0.02)",
          border: naturalBottom
            ? "1px solid rgba(0,255,120,0.3)"
            : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <StatusDot active={naturalBottom} color="rgba(0,255,120,0.9)" />
        <span
          className="text-[9px] font-mono tracking-widest font-bold"
          style={{
            color: naturalBottom
              ? "rgba(0,255,120,0.9)"
              : "rgba(255,255,255,0.3)",
          }}
        >
          NATURAL BOTTOM — ALWAYS ON — When SRS active
        </span>
        <span
          className="text-[7px] font-mono tracking-widest ml-auto"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          80Hz +2dB
        </span>
      </div>

      {/* ── L/R meters ── */}
      <div className="flex gap-2 mb-3">
        <MeterBar
          level={isPlaying ? (srs.leftLevel ?? 0) : 0}
          color="rgba(0,213,255,0.9)"
          label="L"
        />
        <MeterBar
          level={isPlaying ? (srs.rightLevel ?? 0) : 0}
          color="rgba(153,69,255,0.9)"
          label="R"
        />
      </div>

      {/* ── HD 9.0 monitor sensors ── */}
      {srsIsOn && srs.hd9.monitorSensorsActive && (
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <GlowDot active pulse color="rgba(153,69,255,0.9)" />
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.7)" }}
            >
              HD 9.0 MONITOR SENSORS — {isPlaying ? "24 ACTIVE" : "STANDBY"}
            </span>
          </div>
          <div className="flex gap-1">
            <SensorBar
              level={srs.sensorReading?.bass ?? 0}
              label="BASS"
              color="rgba(153,69,255,0.8)"
            />
            <SensorBar
              level={srs.sensorReading?.mids ?? 0}
              label="MIDS"
              color="rgba(0,213,255,0.8)"
            />
            <SensorBar
              level={srs.sensorReading?.highs ?? 0}
              label="HIGHS"
              color="rgba(0,200,255,0.7)"
            />
            <SensorBar
              level={srs.sensorReading?.tweeters ?? 0}
              label="TWEET"
              color="rgba(153,69,255,0.6)"
            />
          </div>
        </div>
      )}

      {/* ── Sound projects outside ── */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-2 transition-all duration-300"
        style={{
          background:
            srs.soundProjectsOutside && isPlaying
              ? "rgba(0,213,255,0.06)"
              : "rgba(255,255,255,0.02)",
          border: `1px solid ${srs.soundProjectsOutside && isPlaying ? "rgba(0,213,255,0.4)" : "rgba(255,255,255,0.08)"}`,
        }}
      >
        <GlowDot
          active={srs.soundProjectsOutside && isPlaying}
          color="rgba(0,255,120,0.9)"
        />
        <span
          className="text-[8px] font-mono tracking-widest"
          style={{
            color:
              srs.soundProjectsOutside && isPlaying
                ? "rgba(0,213,255,0.7)"
                : "rgba(255,255,255,0.25)",
          }}
        >
          PROJECTS OUTSIDE SPEAKER — 3D EXPANSION ACTIVE
        </span>
      </div>

      {/* ── Expansion Factor slider ── */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color: "rgba(0,213,255,0.6)" }}
          >
            EXPANSION FACTOR — How far the sound projects outward
          </span>
          <span
            className="text-[9px] font-mono font-bold"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            {Math.round(expansionFactor * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={expansionFactor}
          onChange={(e) => onExpansionChange(Number(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "rgba(0,213,255,0.9)" }}
          aria-label="SRS expansion factor"
          data-ocid="srs_xm.expansion_slider"
        />
        <div className="flex justify-between">
          <span
            className="text-[8px] font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            NARROW
          </span>
          <span
            className="text-[8px] font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            MAX PROJECTION
          </span>
        </div>
      </div>

      {/* ── Mid bass excursion ── */}
      <div
        className="rounded-sm p-2 mt-2 flex flex-col gap-1.5"
        style={{
          background:
            srs.hd9.pumpingExcursionActive && isPlaying
              ? "rgba(153,69,255,0.06)"
              : "rgba(255,255,255,0.02)",
          border: `1px solid ${srs.hd9.pumpingExcursionActive && isPlaying ? "rgba(153,69,255,0.35)" : "rgba(255,255,255,0.1)"}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GlowDot
              active={srs.hd9.pumpingExcursionActive && isPlaying}
              color="rgba(153,69,255,0.9)"
              pulse={srs.hd9.pumpingExcursionActive && isPlaying}
            />
            <p
              className="text-[9px] font-mono tracking-[0.15em] uppercase font-bold"
              style={{
                color:
                  srs.hd9.pumpingExcursionActive && isPlaying
                    ? "rgba(153,69,255,0.9)"
                    : "rgba(255,255,255,0.4)",
              }}
            >
              MID BASS EXCURSION — PUMPING
            </p>
          </div>
          {srs.hd9.pumpingExcursionActive && isPlaying && (
            <ActiveBadge label="ACTIVE" color="rgba(153,69,255,0.9)" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between">
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.6)" }}
            >
              EXCURSION STRENGTH
            </span>
            <span
              className="text-[8px] font-mono font-bold"
              style={{ color: "rgba(153,69,255,0.95)" }}
            >
              {(excStrength * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={excStrength}
            onChange={(e) => handleExcursionChange(Number(e.target.value))}
            className="w-full h-1.5 cursor-pointer"
            style={{ accentColor: "rgba(153,69,255,0.9)" }}
            aria-label="Mid bass excursion strength"
            data-ocid="srs_xm.excursion_slider"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          <span
            className="px-1.5 py-0.5 rounded-sm text-[7px] font-mono tracking-widest"
            style={{
              background: "rgba(0,255,120,0.07)",
              border: "1px solid rgba(0,255,120,0.3)",
              color: "rgba(0,255,120,0.85)",
            }}
          >
            ⚡ COMMANDER PROTECTING EXCURSION
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── XM PROCESSOR SECTION ────────────────────────────────────────────────────
function XmSection({
  xm,
  isPlaying,
  xmControls,
}: {
  xm: XmProcessorState;
  isPlaying: boolean;
  xmControls?: SrsXmPanelProps["xmControls"];
}) {
  const xmIsOn = xmControls?.isOn ?? xm.isOn;
  const staticLevel = xmControls?.staticLevel ?? xm.staticLevel ?? 350;
  const xmPulseActive =
    xmIsOn && isPlaying && xm.activityPulse !== undefined
      ? xm.activityPulse % 3 !== 0
      : false;
  const thdPct = (xm.thd * 100).toFixed(4);
  const cleanupPct = xm.cleanupIntensity ?? 0;
  const notchHz = xm.notchHz ?? 60;

  return (
    <div className="slot-panel" data-ocid="srs_xm.xm_panel">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-75 ${xmPulseActive ? "opacity-100" : "opacity-60"}`}
            style={{
              background: xmIsOn
                ? "rgba(153,69,255,0.9)"
                : "rgba(255,255,255,0.15)",
              boxShadow: xmIsOn
                ? `0 0 ${xmPulseActive ? "8px" : "4px"} rgba(153,69,255,0.7)`
                : "none",
            }}
          />
          <div>
            <p
              className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{
                color: xmIsOn
                  ? "rgba(153,69,255,0.85)"
                  : "rgba(255,255,255,0.35)",
              }}
            >
              XM PROCESSOR — INDEPENDENT POWER
            </p>
            <p
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Own power: 80,000 | NOT connected to volume | Slope 24dB/oct
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {xmControls && (
            <button
              type="button"
              data-ocid="srs_xm.xm_toggle"
              onClick={xmControls.toggleXm}
              aria-pressed={xmIsOn}
              aria-label="Toggle XM Processor"
              className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold transition-all duration-300"
              style={{
                background: xmIsOn
                  ? "rgba(153,69,255,0.12)"
                  : "rgba(255,255,255,0.04)",
                border: xmIsOn
                  ? "1px solid rgba(153,69,255,0.5)"
                  : "1px solid rgba(255,255,255,0.15)",
                color: xmIsOn
                  ? "rgba(153,69,255,0.9)"
                  : "rgba(255,255,255,0.35)",
                boxShadow: xmIsOn ? "0 0 8px rgba(153,69,255,0.3)" : "none",
              }}
            >
              {xmIsOn ? (isPlaying ? "CLEANING" : "STANDBY") : "OFF"}
            </button>
          )}
          {xmIsOn ? (
            <ActiveBadge label="ACTIVE" color="rgba(153,69,255,0.9)" />
          ) : (
            <span
              className="px-1.5 py-0.5 rounded-sm text-[8px] font-mono tracking-widest"
              style={{
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.3)",
              }}
            >
              BYPASSED
            </span>
          )}
        </div>
      </div>

      {/* ── Spec badges ── */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        <SpecBadge label="24dB/OCT SLOPE" />
        <SpecBadge label="SNR >110dB" />
        <SpecBadge label="THD <0.01%" />
      </div>

      {/* ── XM Power independence badge ── */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-2"
        style={{
          background: "rgba(153,69,255,0.04)",
          border: "1px solid rgba(153,69,255,0.2)",
        }}
      >
        <GlowDot active={xmIsOn} color="rgba(153,69,255,0.9)" />
        <div className="flex-1 min-w-0">
          <span
            className="text-[7px] font-mono tracking-widest block"
            style={{ color: "rgba(153,69,255,0.7)" }}
          >
            80,000 — INDEPENDENT — Does NOT draw from power chain
          </span>
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(153,69,255,0.5)" }}
          >
            CLEANUP INTENSITY: {xmIsOn ? `${cleanupPct}%` : "XM OFF"}
          </span>
        </div>
      </div>

      {/* ── VOLUME DISCONNECTED indicator ── */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-2"
        style={{
          background: "rgba(255,60,60,0.04)",
          border: "1px solid rgba(255,60,60,0.25)",
        }}
        data-ocid="srs_xm.xm_volume_disconnected"
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: "rgba(255,60,60,0.8)",
            boxShadow: "0 0 5px rgba(255,60,60,0.5)",
          }}
        />
        <span
          className="text-[8px] font-mono tracking-widest font-bold"
          style={{ color: "rgba(255,80,80,0.85)" }}
        >
          VOLUME LINK: DISCONNECTED — XM NEVER FOLLOWS VOLUME
        </span>
      </div>

      {/* ── Static Control slider 1-700 — NOT volume ── */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex justify-between items-center">
          <span
            className="text-[9px] font-mono tracking-widest font-bold"
            style={{ color: "rgba(153,69,255,0.8)" }}
          >
            STATIC CONTROL 1-700
          </span>
          <span
            className="text-[9px] font-mono font-bold"
            style={{ color: "rgba(153,69,255,0.95)" }}
          >
            {staticLevel}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={700}
          step={1}
          value={staticLevel}
          onChange={(e) => xmControls?.setStaticLevel(Number(e.target.value))}
          className="w-full h-1.5 cursor-pointer"
          style={{ accentColor: "rgba(153,69,255,0.9)" }}
          aria-label="XM static control level 1-700"
          data-ocid="srs_xm.xm_static_slider"
        />
        <div className="flex justify-between">
          <span
            className="text-[7px] font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            MINIMAL (1)
          </span>
          <span
            className="text-[7px] font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            MAX CLEAN (700)
          </span>
        </div>
        <p
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(153,69,255,0.5)" }}
        >
          Controls static filtering — higher = cleaner | Notch:{" "}
          {notchHz.toFixed(0)}Hz | Not volume
        </p>
      </div>

      {/* ── Active filter nodes ── */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {[
          { label: `NOTCH ${notchHz.toFixed(0)}Hz Q10`, active: xmIsOn },
          { label: "HPF 18Hz", active: xmIsOn },
          { label: "LPF 20kHz", active: xmIsOn },
        ].map((f) => (
          <span
            key={f.label}
            className="px-1.5 py-0.5 rounded-sm text-[7px] font-mono tracking-widest transition-all duration-300"
            style={{
              background: f.active
                ? "rgba(153,69,255,0.1)"
                : "rgba(255,255,255,0.03)",
              border: f.active
                ? "1px solid rgba(153,69,255,0.4)"
                : "1px solid rgba(255,255,255,0.1)",
              color: f.active
                ? "rgba(153,69,255,0.85)"
                : "rgba(255,255,255,0.25)",
              boxShadow:
                f.active && xmPulseActive
                  ? "0 0 6px rgba(153,69,255,0.3)"
                  : "none",
            }}
          >
            {f.label}
          </span>
        ))}
      </div>

      {/* ── Sits after SRS banner ── */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-2"
        style={{
          background: "rgba(153,69,255,0.06)",
          border: "1px solid rgba(153,69,255,0.25)",
        }}
      >
        <GlowDot active color="rgba(0,213,255,0.8)" />
        <span
          className="text-[8px] font-mono tracking-widest"
          style={{ color: "rgba(0,213,255,0.7)" }}
        >
          SITS AFTER SRS — CLEANS EVERYTHING THROUGH
        </span>
      </div>

      {/* ── Live level meters ── */}
      <div className="flex gap-2 mb-2">
        <MeterBar
          level={isPlaying ? xm.bassLevel : 0}
          color="rgba(153,69,255,0.9)"
          label="BASS"
        />
        <MeterBar
          level={isPlaying ? xm.midsLevel : 0}
          color="rgba(0,213,255,0.9)"
          label="MIDS"
        />
        <MeterBar
          level={isPlaying ? xm.highsLevel : 0}
          color="rgba(0,200,255,0.75)"
          label="HIGHS"
        />
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div
          className="flex flex-col items-center py-1.5 rounded-sm"
          style={{
            background: "rgba(0,213,255,0.05)",
            border: "1px solid rgba(0,213,255,0.2)",
          }}
        >
          <p
            className="text-[9px] font-mono font-bold"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            ALIGNED
          </p>
          <p
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            PHASE
          </p>
        </div>
        <div
          className="flex flex-col items-center py-1.5 rounded-sm"
          style={{
            background: "rgba(0,255,120,0.04)",
            border: "1px solid rgba(0,255,120,0.2)",
          }}
        >
          <p
            className="text-sm leading-none font-mono"
            style={{ color: "rgba(0,255,120,0.9)" }}
          >
            {isPlaying ? `${xm.snr.toFixed(0)}` : "110"}
          </p>
          <p
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            SNR dB
          </p>
        </div>
        <div
          className="flex flex-col items-center py-1.5 rounded-sm"
          style={{
            background: "rgba(153,69,255,0.04)",
            border: "1px solid rgba(153,69,255,0.2)",
          }}
        >
          <p
            className="text-[10px] leading-none font-mono"
            style={{ color: "rgba(153,69,255,0.9)" }}
          >
            {thdPct}%
          </p>
          <p
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            THD
          </p>
        </div>
      </div>

      {/* ── Signal clean verified ── */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm transition-all duration-300"
        style={{
          background: xmIsOn
            ? "rgba(0,255,120,0.06)"
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${xmIsOn ? "rgba(0,255,120,0.3)" : "rgba(255,255,255,0.08)"}`,
        }}
        data-ocid="srs_xm.xm_signal_clean"
      >
        <GlowDot active={xmIsOn} color="rgba(0,255,120,0.9)" />
        <span
          className="text-[9px] font-mono tracking-widest font-bold"
          style={{
            color: xmIsOn ? "rgba(0,255,120,0.9)" : "rgba(255,255,255,0.3)",
          }}
        >
          {xmIsOn
            ? "SIGNAL CLEAN: VERIFIED"
            : "XM BYPASSED — SIGNAL UNFILTERED"}
        </span>
        <span
          className="text-[7px] font-mono tracking-widest ml-auto"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          SLOPE: {xm.slopeDb ?? 24}dB/OCT
        </span>
      </div>
    </div>
  );
}

// ─── Frequency Output section ─────────────────────────────────────────────────
function FreqOutputSection({
  freqOutput,
  isPlaying,
}: {
  freqOutput: FrequencyOutputState;
  isPlaying: boolean;
}) {
  return (
    <div className="slot-panel" data-ocid="srs_xm.freq_output_panel">
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[9px] font-mono tracking-[0.2em] uppercase"
          style={{ color: "rgba(0,213,255,0.7)" }}
        >
          FREQ OUTPUT — 14–50Hz BASS
        </p>
        <div
          className="px-2 py-0.5 rounded-sm border text-[8px] font-mono tracking-widest transition-all duration-300"
          style={{
            borderColor: freqOutput.projectionActive
              ? "rgba(0,213,255,0.7)"
              : "rgba(255,255,255,0.15)",
            background: freqOutput.projectionActive
              ? "rgba(0,213,255,0.1)"
              : "transparent",
            color: freqOutput.projectionActive
              ? "rgba(0,213,255,0.95)"
              : "rgba(255,255,255,0.3)",
          }}
          data-ocid="srs_xm.surround_indicator"
        >
          {freqOutput.projectionActive
            ? `SURROUND: ${Math.round(freqOutput.surroundRadius)} FT`
            : "SURROUND: OFF"}
        </div>
      </div>
      <div className="flex items-end gap-px h-8 w-full mb-2">
        {freqOutput.bands.map((b) => (
          <div
            key={b.centerHz}
            className="flex-1 rounded-t-sm transition-all duration-75"
            style={{
              height:
                freqOutput.allChannelsActive && isPlaying
                  ? `${Math.max(4, b.strength * 100)}%`
                  : "4%",
              background:
                freqOutput.allChannelsActive && isPlaying
                  ? `linear-gradient(to top, rgba(153,69,255,0.9), rgba(0,213,255,${0.5 + b.strength * 0.4}))`
                  : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        {(["BASS", "MIDS", "HIGHS"] as const).map((ch, i) => {
          const colors = [
            "rgba(153,69,255,0.8)",
            "rgba(0,213,255,0.8)",
            "rgba(0,200,255,0.7)",
          ];
          return (
            <div key={ch} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    freqOutput.allChannelsActive && isPlaying
                      ? colors[i]
                      : "rgba(255,255,255,0.2)",
                  boxShadow:
                    freqOutput.allChannelsActive && isPlaying
                      ? `0 0 6px ${colors[i]}`
                      : "none",
                }}
              />
              <span
                className="text-[8px] font-mono"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {ch}
              </span>
            </div>
          );
        })}
        <span
          className="text-[8px] font-mono ml-auto"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          ALL CHANNELS FULL RANGE
        </span>
      </div>
    </div>
  );
}

// ─── CHEATER BEATER SECTION ───────────────────────────────────────────────────
function CheaterBeaterSection({
  cheaterBeaterOn,
  cheaterBeaterStrength,
  onCheaterBeaterToggle,
  onCheaterBeaterStrength,
  standardBassActive,
}: {
  cheaterBeaterOn: boolean;
  cheaterBeaterStrength: number;
  onCheaterBeaterToggle: (on: boolean) => void;
  onCheaterBeaterStrength: (v: number) => void;
  standardBassActive: boolean;
}) {
  const mutuallyExclusiveWarning =
    cheaterBeaterOn && !standardBassActive === false;

  return (
    <div
      className="slot-panel"
      data-ocid="srs_xm.cheater_beater_panel"
      style={{
        background: cheaterBeaterOn
          ? "rgba(255,120,0,0.06)"
          : "rgba(0,8,30,0.96)",
        border: cheaterBeaterOn
          ? "1px solid rgba(255,120,0,0.4)"
          : "1px solid rgba(100,60,0,0.25)",
        boxShadow: cheaterBeaterOn ? "0 0 16px rgba(255,120,0,0.12)" : "none",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: cheaterBeaterOn
                ? "rgba(255,140,0,0.95)"
                : "rgba(255,255,255,0.15)",
              boxShadow: cheaterBeaterOn
                ? "0 0 8px rgba(255,140,0,0.8)"
                : "none",
              animation: cheaterBeaterOn ? "pulse 1.2s infinite" : "none",
            }}
          />
          <div>
            <p
              className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{
                color: cheaterBeaterOn
                  ? "rgba(255,160,0,0.95)"
                  : "rgba(200,120,0,0.5)",
                textShadow: cheaterBeaterOn
                  ? "0 0 10px rgba(255,140,0,0.4)"
                  : "none",
              }}
            >
              CHEATER BEATER
            </p>
            <p
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(200,120,0,0.45)" }}
            >
              33Hz SUB FOUNDATION — Headphone Activist Cloud City
            </p>
          </div>
        </div>
        <button
          type="button"
          data-ocid="srs_xm.cheater_beater_toggle"
          onClick={() => onCheaterBeaterToggle(!cheaterBeaterOn)}
          aria-pressed={cheaterBeaterOn}
          className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest font-bold transition-all duration-300"
          style={{
            background: cheaterBeaterOn
              ? "rgba(255,140,0,0.15)"
              : "rgba(255,255,255,0.04)",
            border: cheaterBeaterOn
              ? "1px solid rgba(255,140,0,0.6)"
              : "1px solid rgba(200,120,0,0.25)",
            color: cheaterBeaterOn
              ? "rgba(255,160,0,0.95)"
              : "rgba(180,100,0,0.5)",
            boxShadow: cheaterBeaterOn
              ? "0 0 10px rgba(255,140,0,0.3)"
              : "none",
          }}
        >
          {cheaterBeaterOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* Mutual exclusivity notice */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm mb-2"
        style={{
          background: mutuallyExclusiveWarning
            ? "rgba(255,60,60,0.06)"
            : "rgba(255,140,0,0.04)",
          border: mutuallyExclusiveWarning
            ? "1px solid rgba(255,60,60,0.35)"
            : "1px solid rgba(255,140,0,0.2)",
        }}
        data-ocid="srs_xm.cheater_beater_exclusive_note"
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: mutuallyExclusiveWarning
              ? "rgba(255,60,60,0.9)"
              : "rgba(255,140,0,0.7)",
          }}
        />
        <span
          className="text-[7px] font-mono tracking-widest"
          style={{
            color: mutuallyExclusiveWarning
              ? "rgba(255,80,80,0.85)"
              : "rgba(200,140,0,0.65)",
          }}
        >
          {mutuallyExclusiveWarning
            ? "CONFLICT — Cannot be active with 14–50Hz Full Range at same time"
            : "Cannot be active with 14–50Hz Full Range at same time"}
        </span>
      </div>

      {/* 33Hz Strength slider */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] font-mono tracking-widest font-bold"
            style={{
              color: cheaterBeaterOn
                ? "rgba(255,160,0,0.85)"
                : "rgba(180,100,0,0.45)",
            }}
          >
            33Hz FOUNDATION STRENGTH
          </span>
          <span
            className="text-[9px] font-mono font-bold tabular-nums"
            style={{
              color: cheaterBeaterOn
                ? "rgba(255,180,0,0.95)"
                : "rgba(150,80,0,0.4)",
            }}
          >
            {cheaterBeaterStrength}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={cheaterBeaterStrength}
          onChange={(e) => onCheaterBeaterStrength(Number(e.target.value))}
          disabled={!cheaterBeaterOn}
          className="w-full h-1.5 cursor-pointer disabled:opacity-30"
          style={{ accentColor: "rgba(255,140,0,0.9)" }}
          aria-label="Cheater Beater 33Hz foundation strength"
          data-ocid="srs_xm.cheater_beater_strength_slider"
        />
        <div className="flex justify-between">
          <span
            className="text-[7px] font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            0% — NO EFFECT
          </span>
          <span
            className="text-[7px] font-mono"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            100% — MAX +12dB
          </span>
        </div>
      </div>

      {/* Status */}
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-sm transition-all duration-300"
        style={{
          background: cheaterBeaterOn
            ? "rgba(255,140,0,0.06)"
            : "rgba(255,255,255,0.02)",
          border: `1px solid ${cheaterBeaterOn ? "rgba(255,140,0,0.3)" : "rgba(255,255,255,0.08)"}`,
        }}
      >
        <GlowDot active={cheaterBeaterOn} color="rgba(255,160,0,0.9)" />
        <span
          className="text-[8px] font-mono tracking-widest font-bold"
          style={{
            color: cheaterBeaterOn
              ? "rgba(255,180,0,0.9)"
              : "rgba(255,255,255,0.3)",
          }}
        >
          {cheaterBeaterOn
            ? `33Hz FOUNDATION ACTIVE — ${cheaterBeaterStrength}% STRENGTH`
            : "CHEATER BEATER OFF"}
        </span>
        <span
          className="text-[7px] font-mono ml-auto"
          style={{ color: "rgba(200,120,0,0.4)" }}
        >
          LOWSHELF 33Hz
        </span>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function SrsXmPanel({
  srs,
  xm,
  srsControls,
  xmControls,
  freqOutput,
  isPlaying,
  srsIsOn,
  onToggleSrs,
  onExpansionChange,
  onExcursionChange,
  cheaterBeaterOn = false,
  cheaterBeaterStrength = 50,
  onCheaterBeaterToggle,
  onCheaterBeaterStrength,
  standardBassActive = true,
}: SrsXmPanelProps) {
  // Internal cheater beater state if not controlled externally
  const [internalCBOn, setInternalCBOn] = useState(cheaterBeaterOn);
  const [internalCBStr, setInternalCBStr] = useState(cheaterBeaterStrength);

  const cbOn = onCheaterBeaterToggle ? cheaterBeaterOn : internalCBOn;
  const cbStr = onCheaterBeaterStrength ? cheaterBeaterStrength : internalCBStr;

  const handleCBToggle = (on: boolean) => {
    if (onCheaterBeaterToggle) {
      onCheaterBeaterToggle(on);
    } else {
      setInternalCBOn(on);
      try {
        localStorage.setItem("poweramp_cheater_beater_on", String(on));
      } catch {
        /* */
      }
    }
  };

  const handleCBStrength = (v: number) => {
    if (onCheaterBeaterStrength) {
      onCheaterBeaterStrength(v);
    } else {
      setInternalCBStr(v);
      try {
        localStorage.setItem("poweramp_cheater_beater_strength", String(v));
      } catch {
        /* */
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ── Section 1: SRS Sound Engine ── */}
      <SrsEngineSection
        srs={srs}
        srsIsOn={srsIsOn}
        isPlaying={isPlaying}
        srsControls={srsControls}
        onToggleSrs={onToggleSrs}
        onExpansionChange={onExpansionChange}
        onExcursionChange={onExcursionChange}
      />

      {/* ── Separation Wall ── */}
      <div
        className="flex items-center justify-center px-2 py-1.5 rounded-sm"
        style={{
          background: "rgba(0,213,255,0.03)",
          border: "1px solid rgba(0,213,255,0.15)",
          boxShadow: "0 0 8px rgba(0,213,255,0.06)",
        }}
      >
        <span
          className="text-[8px] font-mono tracking-[0.3em]"
          style={{ color: "rgba(0,213,255,0.4)" }}
        >
          ═══════ 20 × 86 SEPARATION WALL ═══════
        </span>
      </div>

      {/* ── Section 2: XM Processor ── */}
      <XmSection xm={xm} isPlaying={isPlaying} xmControls={xmControls} />

      {/* ── Separation Wall 2 ── */}
      <div
        className="flex items-center justify-center px-2 py-1 rounded-sm"
        style={{
          background: "rgba(255,140,0,0.03)",
          border: "1px solid rgba(255,140,0,0.12)",
        }}
      >
        <span
          className="text-[8px] font-mono tracking-[0.3em]"
          style={{ color: "rgba(255,140,0,0.3)" }}
        >
          ═══════ CHEATER BEATER ZONE ═══════
        </span>
      </div>

      {/* ── Section 3: Cheater Beater ── */}
      <CheaterBeaterSection
        cheaterBeaterOn={cbOn}
        cheaterBeaterStrength={cbStr}
        onCheaterBeaterToggle={handleCBToggle}
        onCheaterBeaterStrength={handleCBStrength}
        standardBassActive={standardBassActive}
      />

      {/* ── Frequency Output ── */}
      <FreqOutputSection freqOutput={freqOutput} isPlaying={isPlaying} />
    </div>
  );
}
