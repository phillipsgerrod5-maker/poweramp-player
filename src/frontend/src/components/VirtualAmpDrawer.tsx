import { CombinedAmpsPanel } from "@/components/CombinedAmpsPanel";
import { EqPanel } from "@/components/EqPanel";
import type { CombinedAmpState } from "@/hooks/useCombinedAmps";
import { commanderReachesEQ } from "@/hooks/useCombinedAmps";
import type { FrequencyOutputState } from "@/hooks/useFrequencyOutput";
import { getSharedCtx } from "@/hooks/usePlayer";
import { BASS_PRESETS } from "@/hooks/useVirtualAmp";
import type { XmState } from "@/types/player";
import type {
  AmpScreenId,
  ProtectionState,
  SrsState,
  VirtualAmpState,
} from "@/types/player";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Screen Tab config ────────────────────────────────────────────────────────

const SCREENS: { id: AmpScreenId; short: string }[] = [
  { id: "signal-chain", short: "SIGNAL" },
  { id: "power-bank", short: "POWER" },
  { id: "volume-eq", short: "VOL/EQ" },
  { id: "commander", short: "CH OUTPUT" },
];

// ─── Channel config (4-channel power chart) ────────────────────────────────────

const CHANNELS = [
  { name: "BASS", watts: 20000, ohms: 2, color: "rgba(153,69,255,0.9)" },
  { name: "MIDS", watts: 20000, ohms: 4, color: "rgba(0,213,255,0.9)" },
  { name: "HIGHS", watts: 20000, ohms: 8, color: "rgba(0,200,255,0.75)" },
  { name: "TWEETERS", watts: 20000, ohms: 8, color: "rgba(153,69,255,0.65)" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAudioState(isPlaying: boolean): "ACTIVE" | "STANDBY" | "IDLE" {
  const ctx = getSharedCtx();
  if (!ctx) return "IDLE";
  if (isPlaying && ctx.state === "running") return "ACTIVE";
  if (ctx.state === "running") return "STANDBY";
  return "IDLE";
}

// ─── Shared SlotPanel ─────────────────────────────────────────────────────────

function SlotPanel({
  label,
  children,
  className = "",
  glowBlue = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  glowBlue?: boolean;
}) {
  return (
    <div
      className={`slot-panel flex flex-col gap-2 ${glowBlue ? "glow-blue" : ""} ${className}`}
    >
      <p
        className="text-[9px] font-mono tracking-[0.2em] uppercase"
        style={{ color: "rgba(0,213,255,0.7)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Stage node for signal chain ──────────────────────────────────────────────

function StageNode({
  label,
  value,
  status,
  last = false,
}: {
  label: string;
  value?: string;
  status: "ACTIVE" | "STANDBY" | "IDLE";
  last?: boolean;
}) {
  const isActive = status === "ACTIVE";
  const isStandby = status === "STANDBY";
  const borderColor = isActive
    ? "rgba(0,213,255,0.6)"
    : isStandby
      ? "rgba(0,213,255,0.3)"
      : "rgba(255,255,255,0.1)";
  const bg = isActive
    ? "rgba(0,213,255,0.08)"
    : isStandby
      ? "rgba(0,213,255,0.03)"
      : "rgba(255,255,255,0.03)";
  const dotColor = isActive
    ? "rgba(0,255,120,0.9)"
    : isStandby
      ? "rgba(255,180,0,0.7)"
      : "rgba(60,90,130,0.5)";

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-full px-2 py-1.5 rounded-sm border transition-all duration-300 flex items-center justify-between gap-2"
        style={{ borderColor, background: bg }}
      >
        <div className="min-w-0">
          <p className="text-[8px] font-mono tracking-[0.2em] text-[rgba(0,213,255,0.5)] uppercase truncate">
            {label}
          </p>
          {value && (
            <p
              className="text-[9px] font-mono font-bold tracking-wider truncate"
              style={{
                color: isActive
                  ? "rgba(0,213,255,0.95)"
                  : "rgba(255,255,255,0.4)",
              }}
            >
              {value}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: dotColor,
              boxShadow: isActive ? `0 0 5px ${dotColor}` : "none",
            }}
          />
          <span
            className="text-[6px] font-mono tracking-widest"
            style={{ color: dotColor }}
          >
            {status}
          </span>
        </div>
      </div>
      {!last && (
        <div className="w-px h-3 relative">
          <div
            className="absolute inset-0"
            style={{
              background: isActive
                ? "linear-gradient(to bottom, rgba(0,213,255,0.6), rgba(153,69,255,0.4))"
                : "rgba(255,255,255,0.1)",
            }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: "3px solid transparent",
              borderRight: "3px solid transparent",
              borderTop: isActive
                ? "5px solid rgba(0,213,255,0.7)"
                : "5px solid rgba(255,255,255,0.15)",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── True Indicator Row ───────────────────────────────────────────────────────

function TrueIndicator({
  label,
  active,
  status,
  color,
  ocid,
}: {
  label: string;
  active: boolean;
  status: string;
  color: string;
  ocid: string;
}) {
  return (
    <div
      className="flex items-center justify-between px-2 py-1 rounded-sm transition-all duration-300"
      data-ocid={ocid}
      style={{
        background: active
          ? color.replace(/[\d.]+\)$/, "0.06)")
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${active ? color.replace(/[\d.]+\)$/, "0.3)") : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: active ? color : "rgba(255,255,255,0.15)",
            boxShadow: active ? `0 0 5px ${color}` : "none",
          }}
        />
        <span
          className="text-[7px] font-mono tracking-widest uppercase"
          style={{ color: active ? color : "rgba(255,255,255,0.3)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-[7px] font-mono tracking-widest font-bold"
        style={{ color: active ? color : "rgba(255,255,255,0.2)" }}
      >
        {active ? status : "INACTIVE"}
      </span>
    </div>
  );
}

// ─── Screen 1: Signal Chain ────────────────────────────────────────────────────

function Screen1SignalChain({ isPlaying }: { isPlaying: boolean }) {
  const audioState = getAudioState(isPlaying);

  const stages: { label: string; value?: string }[] = [
    { label: "ENGINE 1 — STRAIGHT POWER", value: "12 CH × 80,000" },
    { label: "CHANNEL 5 → MAIN VIRTUAL AMP PS", value: "80,000 → 4×20,000" },
    {
      label: "MAIN VIRTUAL AMP — UNIFIED",
      value: isPlaying ? "MIDS / HIGHS / BASS / TWEETERS" : "STANDBY",
    },
    {
      label: "VIRTUAL + ANALOG SIM + DIGITAL TUBE",
      value: "ONE AMP — ALL THREE INSIDE",
    },
    { label: "8 OHM LOAD", value: "WIRED — ALL FILTERS FEEDING" },
  ];

  return (
    <div className="flex flex-col gap-1 px-1">
      {/* Unified amp header */}
      <div
        className="mb-2 rounded-sm p-2.5"
        style={{
          background: "rgba(0,213,255,0.06)",
          border: "1px solid rgba(0,213,255,0.3)",
        }}
      >
        <p
          className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
          style={{ color: "rgba(0,213,255,0.95)" }}
        >
          MAIN VIRTUAL AMP — UNIFIED
        </p>
        <p
          className="text-[7px] font-mono tracking-widest mt-0.5"
          style={{ color: "rgba(0,213,255,0.5)" }}
        >
          Virtual · Analog Simulation · Digital Tube Stimulation
        </p>
        <div className="flex gap-1.5 mt-1.5">
          {["VIRTUAL", "ANALOG SIM", "DIGITAL TUBE"].map((mode) => (
            <span
              key={mode}
              className="text-[6.5px] font-mono tracking-widest px-1.5 py-0.5 rounded-sm"
              style={{
                background: "rgba(0,255,120,0.08)",
                border: "1px solid rgba(0,255,120,0.3)",
                color: "rgba(0,255,120,0.9)",
              }}
            >
              {mode} ● ACTIVE
            </span>
          ))}
        </div>
        <p
          className="text-[7px] font-mono tracking-widest mt-1.5"
          style={{ color: "rgba(255,180,0,0.7)" }}
        >
          STRAIGHT ENGINE POWER — NO MILLIWATTS
        </p>
      </div>

      {/* Stage nodes */}
      {stages.map((s, i) => (
        <StageNode
          key={s.label}
          label={s.label}
          value={s.value}
          status={audioState}
          last={i === stages.length - 1}
        />
      ))}

      {/* True indicators */}
      <div className="mt-2 flex flex-col gap-1">
        <p
          className="text-[7px] font-mono tracking-[0.25em] uppercase"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          AMP STATUS INDICATORS — REAL STATE
        </p>
        <TrueIndicator
          label="VIRTUAL MAGNET"
          active={isPlaying}
          status="ENGAGED"
          color="rgba(0,213,255,0.9)"
          ocid="signal.virtual_magnet"
        />
        <TrueIndicator
          label="8 OHM DUMMY LOAD"
          active={!!getSharedCtx()}
          status="ALWAYS WIRED"
          color="rgba(255,180,0,0.9)"
          ocid="signal.dummy_load"
        />
      </div>

      {/* SMD Meter inline */}
      <div
        className="mt-2 rounded-sm p-2 flex items-center justify-between"
        style={{
          background: "oklch(0.09 0.06 258)",
          border: "1px solid rgba(0,213,255,0.4)",
          boxShadow:
            "0 0 12px rgba(0,213,255,0.2), inset 0 0 6px rgba(0,0,50,0.6)",
        }}
      >
        <span
          className="text-[8px] font-mono tracking-[0.25em] uppercase"
          style={{ color: "rgba(0,213,255,0.5)" }}
        >
          SMD AMM-1 LIVE
        </span>
        <div className="flex items-center gap-3">
          <p
            className="meter-readout text-sm leading-none"
            style={{ color: "rgba(0,213,255,0.95)" }}
          >
            {isPlaying ? "2.0" : "0.0"} OHMS
          </p>
          <p
            className="meter-readout text-sm leading-none"
            style={{ color: "rgba(153,69,255,0.95)" }}
          >
            {isPlaying ? "80,000" : "0"} VIRTUAL
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Power (Channel Assignments) ────────────────────────────────────

function BatterySlot({ active }: { active: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-sm border py-1 px-0.5"
      style={{
        borderColor: active ? "rgba(0,213,255,0.5)" : "rgba(255,255,255,0.1)",
        background: active ? "rgba(0,213,255,0.06)" : "rgba(255,255,255,0.02)",
        minWidth: 0,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: active ? "rgba(0,255,120,0.9)" : "rgba(255,255,255,0.2)",
          boxShadow: active ? "0 0 6px rgba(0,255,120,0.7)" : "none",
        }}
      />
    </div>
  );
}

function FuseSlot() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-sm border py-1 px-0.5"
      style={{
        borderColor: "rgba(255,180,0,0.4)",
        background: "rgba(255,150,0,0.05)",
        minWidth: 0,
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{
          background: "rgba(255,180,0,0.85)",
          boxShadow: "0 0 6px rgba(255,150,0,0.6)",
        }}
      />
    </div>
  );
}

const CHANNEL_ASSIGNMENTS_DISPLAY = [
  {
    ch: 1,
    label: "FUSES — 30 × 2,667W",
    power: "80,000 → 30 fuses × 2,667 each",
    color: "rgba(255,180,0,0.85)",
  },
  {
    ch: 2,
    label: "BATTERIES — ALWAYS FULL",
    power: "ENGINE 1 → CH2 → BATTERIES → ALWAYS 100%",
    color: "rgba(0,255,180,0.85)",
  },
  {
    ch: 3,
    label: "HIGH AMP — 80,000 DEDICATED",
    power: "CH3 → BATTERIES → AMP · CH3 → POWER SUPPLY → 4 OUTPUTS",
    color: "rgba(153,69,255,0.85)",
  },
  {
    ch: 4,
    label: "BOTH PROTECTION SYSTEMS",
    power: "Old Protection (3) + New Protection (3) = 6 sliders total",
    color: "rgba(255,80,80,0.85)",
  },
  {
    ch: 5,
    label: "MAIN VIRTUAL AMP POWER SUPPLY",
    power: "80,000 → split 4×20,000 (BASS / MIDS / HIGHS / TWEETERS)",
    color: "rgba(0,213,255,0.85)",
  },
] as const;

function Screen2PowerBank(_: { isPlaying: boolean }) {
  const batterySlots = Array.from({ length: 24 }, (_, i) => i + 1);
  const fuseSlots = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-3">
      {/* Channel assignments */}
      <SlotPanel label="ENGINE 1 CHANNEL ASSIGNMENTS — STRAIGHT POWER">
        <div className="flex flex-col gap-1">
          {CHANNEL_ASSIGNMENTS_DISPLAY.map(({ ch, label, power, color }) => (
            <div
              key={ch}
              className="flex items-start gap-2 px-2 py-1.5 rounded-sm"
              style={{
                background: "rgba(0,5,20,0.5)",
                border: `1px solid ${color.replace(/[\d.]+\)$/, "0.2)")}`,
              }}
            >
              <span
                className="text-[8px] font-mono font-bold tracking-widest shrink-0 w-6 text-center"
                style={{ color }}
              >
                CH{ch}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[8px] font-mono tracking-widest font-bold uppercase"
                  style={{ color }}
                >
                  {label}
                </p>
                <p
                  className="text-[7px] font-mono tracking-widest"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {power}
                </p>
              </div>
            </div>
          ))}
          <div
            className="px-2 py-1 rounded-sm"
            style={{
              background: "rgba(0,5,18,0.3)",
              border: "1px solid rgba(0,40,100,0.15)",
            }}
          >
            <p
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(60,90,130,0.4)" }}
            >
              CH6–CH12 — FREE — UNASSIGNED
            </p>
          </div>
        </div>
      </SlotPanel>

      {/* Safety switch status */}
      <div
        className="rounded-sm p-2 text-center"
        style={{
          background: "rgba(0,213,255,0.04)",
          border: "1px solid rgba(0,213,255,0.25)",
        }}
      >
        <p
          className="text-[8px] font-mono tracking-widest font-bold"
          style={{ color: "rgba(0,213,255,0.8)" }}
        >
          SAFETY SWITCH — CUT 60% POWER — SEE ENGINES TAB TO TOGGLE
        </p>
        <p
          className="text-[7px] font-mono tracking-widest mt-0.5"
          style={{ color: "rgba(0,180,255,0.4)" }}
        >
          OFF: 80,000/channel · ON: 32,000/channel (60% cut)
        </p>
      </div>

      {/* Power bank cells */}
      <div className="flex gap-2">
        <SlotPanel label="POWER BANK — 24 CELLS" className="flex-1">
          <div className="grid grid-cols-4 gap-1">
            {batterySlots.map((num) => (
              <BatterySlot key={`bat-${num}`} active={true} />
            ))}
          </div>
          <div
            className="mt-1 rounded-sm px-2 py-1 text-center"
            style={{
              background: "rgba(0,255,120,0.06)",
              border: "1px solid rgba(0,255,120,0.3)",
            }}
          >
            <p
              className="text-[8px] font-mono tracking-widest font-bold"
              style={{ color: "rgba(0,255,120,0.85)" }}
            >
              ✓ ALL 24 CELLS — LIVE — ALWAYS 100%
            </p>
          </div>
        </SlotPanel>

        <SlotPanel label="FUSES — 30 × 2,667W" className="flex-1">
          <div className="grid grid-cols-4 gap-1">
            {fuseSlots.map((num) => (
              <FuseSlot key={`fuse-${num}`} />
            ))}
          </div>
          <div
            className="mt-1 rounded-sm px-2 py-1 text-center"
            style={{
              background: "rgba(255,150,0,0.08)",
              border: "1px solid rgba(255,150,0,0.4)",
            }}
          >
            <p
              className="meter-readout text-sm"
              style={{ color: "rgba(255,180,0,0.95)" }}
            >
              80,000
            </p>
          </div>
        </SlotPanel>
      </div>
    </div>
  );
}

// ─── Screen 3: Volume / EQ ────────────────────────────────────────────────────

function Screen3VolumeEQ({
  eqBass,
  eqMids,
  eqHighs,
  eqTweeters,
  srsActive,
  srsExpansionFactor,
  presetStrength,
  onEqBassChange,
  onEqMidsChange,
  onEqHighsChange,
  onEqTweetersChange,
  onSrsToggle,
}: {
  eqBass: number;
  eqMids: number;
  eqHighs: number;
  eqTweeters: number;
  srsActive: boolean;
  srsExpansionFactor: number;
  presetStrength: number;
  onEqBassChange: (v: number) => void;
  onEqMidsChange: (v: number) => void;
  onEqHighsChange: (v: number) => void;
  onEqTweetersChange: (v: number) => void;
  onSrsToggle: (on: boolean) => void;
}) {
  const surroundFeet = Math.round(srsExpansionFactor * 30);

  return (
    <div className="flex flex-col gap-3">
      {/* EQ */}
      <div>
        <p
          className="text-[8px] font-mono tracking-[0.2em] uppercase mb-1"
          style={{ color: "rgba(100,80,255,0.6)" }}
        >
          EQ PROCESSOR — COMMANDER HOLDING PATH OPEN
        </p>
        {commanderReachesEQ && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm mb-2"
            style={{
              background: "rgba(0,255,120,0.05)",
              border: "1px solid rgba(0,255,120,0.2)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "rgba(0,255,120,0.8)" }}
            />
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(0,255,120,0.7)" }}
            >
              EQ AUTHORITY LOCKED — PROTECTION NEVER KNOCKS EQ BACK
            </span>
          </div>
        )}
        <EqPanel
          bass={eqBass}
          mids={eqMids}
          highs={eqHighs}
          tweeters={eqTweeters}
          presetStrength={presetStrength}
          onBassChange={onEqBassChange}
          onMidsChange={onEqMidsChange}
          onHighsChange={onEqHighsChange}
          onTweetersChange={onEqTweetersChange}
        />
      </div>

      {/* SRS Surround */}
      <SlotPanel label="SRS SURROUND — 30FT RADIUS · 360°">
        <div className="flex items-center gap-4">
          <button
            type="button"
            data-ocid="amp.srs.toggle"
            onClick={() => onSrsToggle(!srsActive)}
            className="relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0"
            style={{
              borderColor: srsActive
                ? "rgba(0,213,255,0.8)"
                : "rgba(255,255,255,0.2)",
              background: srsActive
                ? "rgba(0,213,255,0.12)"
                : "rgba(255,255,255,0.03)",
              boxShadow: srsActive ? "0 0 24px rgba(0,213,255,0.5)" : "none",
            }}
            aria-label="Toggle SRS Surround"
          >
            <span
              className="text-[9px] font-mono tracking-[0.1em] font-bold"
              style={{
                color: srsActive
                  ? "rgba(0,213,255,0.95)"
                  : "rgba(255,255,255,0.4)",
              }}
            >
              {srsActive ? "ACTIVE" : "OFF"}
            </span>
          </button>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-mono font-bold"
              style={{
                color: srsActive
                  ? "rgba(0,213,255,0.9)"
                  : "rgba(255,255,255,0.3)",
              }}
            >
              {srsActive ? "HRTF SURROUND ON" : "SURROUND DISABLED"}
            </p>
            <p className="text-[9px] font-mono tracking-wide text-muted-foreground mt-0.5">
              CRYSTAL CLEAR A+/B+/C+/D+ ULTRA
            </p>
            {srsActive && (
              <p
                className="text-[10px] font-mono font-bold tracking-widest mt-1"
                style={{ color: "rgba(0,213,255,0.8)" }}
              >
                ⟳ {surroundFeet} FT SURROUND · 360°
              </p>
            )}
          </div>
        </div>
      </SlotPanel>
    </div>
  );
}

// ─── Screen 4: Channel Output ─────────────────────────────────────────────────

function Screen4ChannelOutput({
  isPlaying,
  combinedAmpsState,
}: {
  isPlaying: boolean;
  combinedAmpsState: CombinedAmpState;
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Unified amp header */}
      <SlotPanel label="MAIN VIRTUAL AMP — UNIFIED UNIT" glowBlue={isPlaying}>
        <div
          className="px-2 py-2 rounded-sm"
          style={{
            background: "rgba(0,213,255,0.05)",
            border: "1px solid rgba(0,213,255,0.2)",
          }}
        >
          <p
            className="text-[9px] font-mono tracking-[0.2em] font-bold uppercase"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            MAIN VIRTUAL AMP — STRAIGHT ENGINE POWER
          </p>
          <p
            className="text-[7px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Virtual Amp + Analog Simulation + Digital Tube Stimulation — ONE
            UNIT
          </p>
          <div className="flex gap-1.5 mt-1.5">
            {["VIRTUAL", "ANALOG SIM", "DIGITAL TUBE"].map((mode) => (
              <span
                key={mode}
                className="text-[6px] font-mono px-1.5 py-0.5 rounded-sm"
                style={{
                  background: "rgba(0,255,120,0.08)",
                  border: "1px solid rgba(0,255,120,0.25)",
                  color: "rgba(0,255,120,0.85)",
                }}
              >
                {mode} ● ACTIVE
              </span>
            ))}
          </div>
        </div>
      </SlotPanel>

      {/* 4-Channel output slots */}
      <div className="grid grid-cols-2 gap-2">
        {CHANNELS.map((ch) => (
          <div
            key={ch.name}
            data-ocid={`amp.channel.${ch.name.toLowerCase()}`}
            className="slot-panel flex flex-col gap-1"
            style={{ borderColor: ch.color.replace(/[\d.]+\)$/, "0.4)") }}
          >
            <p
              className="text-[9px] font-mono tracking-[0.2em]"
              style={{ color: ch.color }}
            >
              {ch.name}
            </p>
            <div
              className="h-1.5 rounded-full"
              style={{
                background: isPlaying
                  ? `linear-gradient(to right, rgba(0,80,200,0.6), ${ch.color})`
                  : "rgba(255,255,255,0.08)",
              }}
            />
            <p className="meter-readout text-base" style={{ color: ch.color }}>
              {ch.watts.toLocaleString()}W
            </p>
            <p className="text-[9px] font-mono text-[rgba(255,255,255,0.4)]">
              {ch.ohms}Ω LOAD · 4GA
            </p>
            <div
              className={`w-2 h-2 rounded-full ${isPlaying ? "animate-pulse-glow" : ""}`}
              style={{
                background: isPlaying ? ch.color : "rgba(255,255,255,0.2)",
                boxShadow: isPlaying ? `0 0 8px ${ch.color}` : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Commander note */}
      <div
        className="slot-panel flex flex-col gap-2"
        style={{ borderColor: "rgba(0,213,255,0.3)" }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[9px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            COMMANDER DIRECT HIT
          </p>
          <div
            className="w-2 h-2 rounded-full animate-pulse-glow"
            style={{
              background: "rgba(0,213,255,0.9)",
              boxShadow: "0 0 8px rgba(0,213,255,0.7)",
            }}
          />
        </div>
        <p
          className="meter-readout text-xs"
          style={{ color: "rgba(0,213,255,0.85)" }}
        >
          80,000
        </p>
        <p
          className="text-[8px] font-mono tracking-wide leading-tight"
          style={{ color: "rgba(0,213,255,0.6)" }}
        >
          STRENGTH: 80,000 · ALL 4 CHANNELS PROTECTED · EQ PATH HELD OPEN
        </p>
      </div>

      {/* Combined Amp Engine Panel */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          border: "1px solid rgba(0,213,255,0.25)",
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="px-3 py-1.5"
          style={{
            background: "rgba(0,213,255,0.06)",
            borderBottom: "1px solid rgba(0,213,255,0.15)",
          }}
        >
          <p
            className="text-[8px] font-mono tracking-[0.3em] uppercase"
            style={{ color: "rgba(0,213,255,0.5)" }}
          >
            ▶ COMBINED AMP ENGINE — VIRTUAL + ANALOG SIM + DIGITAL TUBE
          </p>
        </div>
        <div className="p-3">
          <CombinedAmpsPanel state={combinedAmpsState} isPlaying={isPlaying} />
        </div>
      </div>
    </div>
  );
}

// ─── SMD AMM-1 Meter ─────────────────────────────────────────────────────────

function SMDMeter({ ohms, watts }: { ohms: number; watts: number }) {
  return (
    <div
      className="absolute bottom-14 right-3 z-10 rounded-sm p-2"
      style={{
        background: "oklch(0.09 0.06 258)",
        border: "1px solid rgba(0,213,255,0.5)",
        boxShadow:
          "0 0 16px rgba(0,213,255,0.3), inset 0 0 8px rgba(0,0,50,0.8)",
        minWidth: "90px",
      }}
    >
      <p
        className="text-[8px] font-mono tracking-[0.25em] uppercase text-center mb-1"
        style={{ color: "rgba(0,213,255,0.5)" }}
      >
        SMD AMM-1
      </p>
      <div className="flex flex-col gap-0.5">
        <div>
          <p
            className="meter-readout text-sm leading-none"
            style={{ color: "rgba(0,213,255,0.95)" }}
          >
            {ohms.toFixed(1)}
          </p>
          <p
            className="text-[8px] font-mono tracking-widest"
            style={{ color: "rgba(0,213,255,0.4)" }}
          >
            OHMS
          </p>
        </div>
        <div>
          <p
            className="meter-readout text-sm leading-none"
            style={{ color: "rgba(153,69,255,0.95)" }}
          >
            {watts.toLocaleString()}
          </p>
          <p
            className="text-[8px] font-mono tracking-widest"
            style={{ color: "rgba(153,69,255,0.4)" }}
          >
            WATTS
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Bass Analysis sub-component (for channel output screen) ──────────────────

function AnalysisBar({
  label,
  pct,
  color,
}: { label: string; pct: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[7px] font-mono tracking-widest uppercase"
          style={{ color }}
        >
          {label}
        </span>
        <span className="text-[7px] font-mono tabular-nums" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div
        className="h-3 w-full rounded-sm overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-sm transition-all duration-100"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: pct > 10 ? `0 0 6px ${color}` : "none",
          }}
        />
      </div>
    </div>
  );
}

export function BassAnalyzerContent({
  bassPreset,
  earthquakeMode,
  onPresetSelect,
  onEarthquakeToggle,
  analyserNode,
  isPlaying,
}: {
  bassPreset: number;
  earthquakeMode: boolean;
  onPresetSelect: (i: number) => void;
  onEarthquakeToggle: (on: boolean) => void;
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}) {
  const [freqs, setFreqs] = useState({
    bass: 0,
    mids: 0,
    highs: 0,
    tweeters: 0,
  });

  useEffect(() => {
    if (!isPlaying || !analyserNode) {
      setFreqs({ bass: 0, mids: 0, highs: 0, tweeters: 0 });
      return;
    }

    let rafId: number;
    const tick = () => {
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      const sRate = analyserNode.context.sampleRate;
      const binCount = analyserNode.frequencyBinCount;

      function bandAvg(loHz: number, hiHz: number): number {
        const lo = Math.floor((loHz / (sRate / 2)) * binCount);
        const hi = Math.min(
          binCount - 1,
          Math.ceil((hiHz / (sRate / 2)) * binCount),
        );
        let sum = 0;
        for (let i = lo; i <= hi; i++) sum += data[i] ?? 0;
        return (sum / Math.max(1, hi - lo + 1) / 255) * 100;
      }

      setFreqs({
        bass: bandAvg(14, 300),
        mids: bandAvg(300, 3000),
        highs: bandAvg(3000, 8000),
        tweeters: bandAvg(8000, 20000),
      });

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, analyserNode]);

  return (
    <div className="flex flex-col gap-3">
      <SlotPanel label="REAL-TIME FREQUENCY ANALYSIS — 60FPS">
        <div className="flex flex-col gap-2">
          <AnalysisBar
            label="BASS 14-50Hz"
            pct={freqs.bass}
            color="rgba(153,69,255,0.9)"
          />
          <AnalysisBar
            label="MIDS"
            pct={freqs.mids}
            color="rgba(0,213,255,0.9)"
          />
          <AnalysisBar
            label="HIGHS"
            pct={freqs.highs}
            color="rgba(0,200,255,0.8)"
          />
          <AnalysisBar
            label="TWEETERS"
            pct={freqs.tweeters}
            color="rgba(153,69,255,0.65)"
          />
        </div>
        <p className="text-[7px] font-mono tracking-widest text-[rgba(255,255,255,0.25)]">
          EACH BAR = 0–100% BASED ON CURRENT AUDIO FREQUENCY CONTENT
        </p>
      </SlotPanel>

      <SlotPanel label="BASS PRESETS — 10 MID BASS HARD &amp; PUMPING">
        <div className="grid grid-cols-4 gap-1">
          {BASS_PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              type="button"
              data-ocid={`amp.bass_preset.${i + 1}`}
              onClick={() => onPresetSelect(i)}
              className="text-[8px] font-mono py-1 px-0.5 rounded-sm border transition-all duration-200"
              style={{
                borderColor:
                  bassPreset === i
                    ? "rgba(0,213,255,0.7)"
                    : "rgba(255,255,255,0.1)",
                background:
                  bassPreset === i
                    ? "rgba(0,213,255,0.12)"
                    : "rgba(255,255,255,0.02)",
                color:
                  bassPreset === i
                    ? "rgba(0,213,255,0.95)"
                    : "rgba(255,255,255,0.4)",
                boxShadow:
                  bassPreset === i ? "0 0 8px rgba(0,213,255,0.4)" : "none",
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-ocid="amp.earthquake_mode.toggle"
          onClick={() => onEarthquakeToggle(!earthquakeMode)}
          className="mt-2 w-full py-1.5 rounded-sm border text-[9px] font-mono tracking-[0.2em] uppercase transition-all duration-300"
          style={{
            borderColor: earthquakeMode
              ? "rgba(255,80,80,0.7)"
              : "rgba(255,255,255,0.15)",
            background: earthquakeMode
              ? "rgba(255,80,80,0.1)"
              : "rgba(255,255,255,0.02)",
            color: earthquakeMode
              ? "rgba(255,120,120,0.9)"
              : "rgba(255,255,255,0.4)",
            boxShadow: earthquakeMode ? "0 0 12px rgba(255,80,80,0.4)" : "none",
          }}
        >
          ⚡ EARTHQUAKE SAFETY MODE — {earthquakeMode ? "ARMED" : "OFF"}
        </button>
      </SlotPanel>

      <SlotPanel label="4-CHANNEL POWER CHART — OHM / WATT">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr>
              {["CHANNEL", "WATTS", "OHMS", "WIRED"].map((h) => (
                <th
                  key={h}
                  className="text-left pb-1 tracking-widest"
                  style={{ color: "rgba(0,213,255,0.5)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((ch) => (
              <tr key={ch.name}>
                <td style={{ color: ch.color }}>{ch.name}</td>
                <td className="text-[rgba(255,255,255,0.7)]">
                  {ch.watts.toLocaleString()}W
                </td>
                <td className="text-[rgba(255,255,255,0.5)]">{ch.ohms}Ω</td>
                <td className="text-[rgba(0,213,255,0.5)]">4GA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SlotPanel>
    </div>
  );
}

// ─── Main Drawer ─────────────────────────────────────────────────────────────

export interface VirtualAmpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ampState: VirtualAmpState;
  protection: ProtectionState;
  isPlaying: boolean;
  srsActive: boolean;
  srsState: SrsState;
  xmState: XmState;
  freqOutputState: FrequencyOutputState;
  onVolumeChange: (v: number) => void;
  onEqBassChange: (v: number) => void;
  onEqMidsChange: (v: number) => void;
  onEqHighsChange: (v: number) => void;
  onEqTweetersChange: (v: number) => void;
  onBassPreset: (i: number) => void;
  onEarthquakeToggle: (on: boolean) => void;
  onSrsToggle: (on: boolean) => void;
  onScreenChange: (screen: AmpScreenId) => void;
  onExpansionChange: (v: number) => void;
  combinedAmpsState: CombinedAmpState;
  srsExpansionFactor: number;
  presetStrength?: number;
  analyserNode?: AnalyserNode | null;
}

export function VirtualAmpDrawer({
  isOpen,
  onClose,
  ampState,
  protection,
  isPlaying,
  srsActive,
  srsState,
  xmState,
  freqOutputState,
  onVolumeChange,
  onEqBassChange,
  onEqMidsChange,
  onEqHighsChange,
  onEqTweetersChange,
  onBassPreset,
  onEarthquakeToggle,
  onSrsToggle,
  onScreenChange,
  onExpansionChange,
  combinedAmpsState,
  srsExpansionFactor,
  presetStrength = 10,
  analyserNode = null,
}: VirtualAmpDrawerProps) {
  const contentRef = useRef<HTMLDialogElement>(null);

  // Suppress unused var warnings for props that are passed through but not
  // consumed directly in this redesign
  void xmState;
  void freqOutputState;
  void onExpansionChange;
  void protection;
  void srsState;
  void srsActive;
  void onVolumeChange;

  useEffect(() => {
    if (isOpen) contentRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const {
    currentScreen,
    volume: _volume,
    eqBass,
    eqMids,
    eqHighs,
    eqTweeters,
    bassPreset,
    earthquakeMode,
  } = ampState;
  void _volume;

  const smdOhms = combinedAmpsState.channels[0]?.ohms ?? 2;
  const smdWatts = combinedAmpsState.channels[0]?.watts ?? 20000;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        aria-hidden="true"
        role="presentation"
      />

      {/* Drawer */}
      <dialog
        ref={contentRef}
        open
        data-ocid="amp.drawer"
        className="fixed left-0 top-0 bottom-0 z-50 flex flex-col animate-slide-in-left focus-visible:outline-none m-0 p-0 max-h-none h-full"
        style={{
          width: "min(640px, 100vw)",
          background:
            "linear-gradient(180deg, oklch(0.14 0.08 262) 0%, oklch(0.11 0.07 255) 100%)",
          borderRight: "2px solid rgba(0,213,255,0.45)",
          boxShadow:
            "4px 0 40px rgba(0,213,255,0.2), 8px 0 80px rgba(0,100,255,0.15)",
          border: "none",
        }}
        aria-label="Main Virtual Amp — PowerAmp System"
      >
        {/* ── Chassis top rail ── */}
        <div
          className="shrink-0 px-3 py-2 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(to right, oklch(0.10 0.07 260), oklch(0.14 0.09 265), oklch(0.10 0.07 260))",
            borderBottom: "1px solid rgba(0,213,255,0.3)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse-glow"
              style={{
                background: isPlaying
                  ? "rgba(0,255,80,0.9)"
                  : "rgba(0,213,255,0.7)",
                boxShadow: isPlaying
                  ? "0 0 10px rgba(0,255,80,0.8)"
                  : "0 0 10px rgba(0,213,255,0.6)",
              }}
            />
            <div>
              <p
                className="text-[10px] font-mono tracking-[0.25em] uppercase leading-none font-bold"
                style={{ color: "rgba(0,213,255,0.9)" }}
              >
                MAIN VIRTUAL AMP
              </p>
              <p
                className="text-[7px] font-mono tracking-[0.18em] mt-0.5"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Virtual · Analog Simulation · Digital Tube Stimulation — UNIFIED
              </p>
              <p
                className="text-[6.5px] font-mono tracking-widest"
                style={{ color: "rgba(255,180,0,0.6)" }}
              >
                STRAIGHT ENGINE POWER — NO MILLIWATTS · CH5 + CH3 · OUTPUTS:
                BASS / MIDS / HIGHS / TWEETERS
              </p>
            </div>
          </div>
          <button
            type="button"
            data-ocid="amp.close_button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-sm transition-smooth hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Close amp drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Amp Mode Badges ── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{
            background: "rgba(0,6,22,0.7)",
            borderBottom: "1px solid rgba(0,100,200,0.15)",
          }}
        >
          {["VIRTUAL", "ANALOG SIMULATION", "DIGITAL TUBE STIMULATION"].map(
            (mode) => (
              <span
                key={mode}
                className="text-[6.5px] font-mono tracking-widest px-1.5 py-0.5 rounded-sm"
                style={{
                  background: "rgba(0,255,120,0.07)",
                  border: "1px solid rgba(0,255,120,0.25)",
                  color: "rgba(0,255,120,0.85)",
                }}
              >
                {mode} ● ACTIVE
              </span>
            ),
          )}
        </div>

        {/* ── Screen Tab Bar ── */}
        <div
          className="shrink-0 flex"
          style={{
            borderBottom: "1px solid rgba(0,213,255,0.2)",
            background: "oklch(0.12 0.08 260)",
          }}
        >
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              data-ocid={`amp.screen.${s.id}`}
              onClick={() => onScreenChange(s.id)}
              className="flex-1 py-2 text-[8px] font-mono tracking-[0.15em] uppercase transition-all duration-200"
              style={{
                color:
                  currentScreen === s.id
                    ? "rgba(0,213,255,0.95)"
                    : "rgba(255,255,255,0.3)",
                borderBottom:
                  currentScreen === s.id
                    ? "2px solid rgba(0,213,255,0.8)"
                    : "2px solid transparent",
                background:
                  currentScreen === s.id
                    ? "rgba(0,213,255,0.06)"
                    : "transparent",
              }}
              aria-pressed={currentScreen === s.id}
            >
              {s.short}
            </button>
          ))}
        </div>

        {/* ── Screen Content ── */}
        <div
          className="flex-1 overflow-y-auto p-3 relative"
          style={{ scrollbarWidth: "thin" }}
        >
          {currentScreen === "signal-chain" && (
            <Screen1SignalChain isPlaying={isPlaying} />
          )}
          {currentScreen === "power-bank" && (
            <Screen2PowerBank isPlaying={isPlaying} />
          )}
          {currentScreen === "volume-eq" && (
            <Screen3VolumeEQ
              eqBass={eqBass}
              eqMids={eqMids}
              eqHighs={eqHighs}
              eqTweeters={eqTweeters}
              srsActive={srsActive}
              srsExpansionFactor={srsExpansionFactor}
              presetStrength={presetStrength}
              onEqBassChange={onEqBassChange}
              onEqMidsChange={onEqMidsChange}
              onEqHighsChange={onEqHighsChange}
              onEqTweetersChange={onEqTweetersChange}
              onSrsToggle={onSrsToggle}
            />
          )}
          {currentScreen === "commander" && (
            <Screen4ChannelOutput
              isPlaying={isPlaying}
              combinedAmpsState={combinedAmpsState}
            />
          )}
          {/* Fallback for any legacy screen ids */}
          {currentScreen !== "signal-chain" &&
            currentScreen !== "power-bank" &&
            currentScreen !== "volume-eq" &&
            currentScreen !== "commander" && (
              <BassAnalyzerContent
                bassPreset={bassPreset}
                earthquakeMode={earthquakeMode}
                onPresetSelect={onBassPreset}
                onEarthquakeToggle={onEarthquakeToggle}
                analyserNode={analyserNode}
                isPlaying={isPlaying}
              />
            )}

          {/* SMD AMM-1 Meter — always visible */}
          <SMDMeter ohms={smdOhms} watts={smdWatts} />
        </div>

        {/* ── Chassis bottom rail ── */}
        <div
          className="shrink-0 px-3 py-1.5 flex items-center justify-between"
          style={{
            background: "oklch(0.10 0.07 260)",
            borderTop: "1px solid rgba(0,213,255,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            {CHANNELS.map((ch) => (
              <div key={ch.name} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isPlaying ? ch.color : "rgba(255,255,255,0.2)",
                    boxShadow: isPlaying ? `0 0 6px ${ch.color}` : "none",
                  }}
                />
                <span
                  className="text-[8px] font-mono"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {ch.name[0]}
                </span>
              </div>
            ))}
          </div>
          <span
            className="text-[8px] font-mono tracking-widest"
            style={{ color: "rgba(0,213,255,0.35)" }}
          >
            {isPlaying ? "▶ PLAYING · MAIN VIRTUAL AMP ONLINE" : "■ STANDBY"}
          </span>
        </div>
      </dialog>
    </>
  );
}
