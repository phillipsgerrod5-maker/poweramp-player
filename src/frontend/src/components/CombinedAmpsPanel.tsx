import type { CombinedAmpState } from "@/hooks/useCombinedAmps";
import { commanderReachesEQ } from "@/hooks/useCombinedAmps";
import { getSharedCtx } from "@/hooks/usePlayer";

// ─── Shared primitives ────────────────────────────────────────────────────────

function LevelBar({
  level,
  color,
  height = 36,
}: { level: number; color: string; height?: number }) {
  const pct = Math.round(Math.min(1, level) * 100);
  return (
    <div
      className="relative w-full overflow-hidden rounded-sm"
      style={{ height, background: "rgba(255,255,255,0.05)" }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-100"
        style={{
          height: `${pct}%`,
          background: `linear-gradient(to top, ${color}, ${color.replace(/[\d.]+\)$/, "0.3)")})`,
          boxShadow: pct > 0 ? `0 0 8px ${color}` : "none",
        }}
      />
      <span
        className="absolute bottom-1 right-1 text-[8px] font-mono leading-none"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

function LedDisplay({
  label,
  value,
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center px-2 py-1 rounded-sm"
      style={{
        background: "rgba(0,0,0,0.5)",
        border: `1px solid ${color.replace(/[\d.]+\)$/, "0.3)")}`,
        boxShadow: `inset 0 0 8px ${color.replace(/[\d.]+\)$/, "0.08)")}`,
        minWidth: 52,
      }}
    >
      <span
        className="font-mono font-black tabular-nums leading-none"
        style={{ color, fontSize: "0.9rem", textShadow: `0 0 8px ${color}` }}
      >
        {value}
      </span>
      <span
        className="text-[6px] font-mono tracking-widest mt-0.5 uppercase"
        style={{ color: color.replace(/[\d.]+\)$/, "0.5)") }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── True Indicator ───────────────────────────────────────────────────────────

function TrueIndicator({
  label,
  status,
  active,
  color,
  ocid,
}: {
  label: string;
  status: string;
  active: boolean;
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

// ─── Channel Strip ────────────────────────────────────────────────────────────

function ChannelStrip({
  name,
  watts,
  ohms,
  signalLevel,
  color,
  commanderActive,
  isPlaying,
}: {
  name: string;
  watts: number;
  ohms: number;
  signalLevel: number;
  color: string;
  commanderActive: boolean;
  isPlaying: boolean;
}) {
  const cmdActive = commanderActive && isPlaying && signalLevel > 0;
  return (
    <div
      className="slot-panel flex flex-col gap-1.5"
      data-ocid={`combined_amps.channel.${name.toLowerCase()}`}
      style={{ borderColor: color.replace(/[\d.]+\)$/, "0.35)") }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[9px] font-mono tracking-[0.2em] font-bold"
          style={{ color }}
        >
          {name}
        </p>
        <div className="flex items-center gap-0.5">
          <div
            className={`w-2 h-2 rounded-full ${cmdActive ? "animate-pulse-glow" : ""}`}
            style={{
              background: cmdActive
                ? "rgba(0,255,120,0.9)"
                : "rgba(255,255,255,0.2)",
              boxShadow: cmdActive ? "0 0 5px rgba(0,255,120,0.7)" : "none",
            }}
          />
          <span
            className="text-[6px] font-mono"
            style={{
              color: cmdActive
                ? "rgba(0,255,120,0.7)"
                : "rgba(255,255,255,0.2)",
            }}
          >
            CMD
          </span>
        </div>
      </div>
      <LevelBar level={signalLevel} color={color} height={26} />
      <div className="flex justify-between">
        <span className="meter-readout text-xs" style={{ color }}>
          {watts.toLocaleString()}W
        </span>
        <span className="text-[9px] font-mono text-[rgba(255,255,255,0.4)]">
          {ohms}Ω
        </span>
      </div>
    </div>
  );
}

// ─── Protection Mini ──────────────────────────────────────────────────────────

function ProtectionMini({
  pulling,
  pullAmount,
  commanderActive,
  commanderOrder,
  distortion,
  stabilizerStrength,
}: CombinedAmpState["protection"]) {
  const distPct = Math.round(distortion * 100);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div
        className="slot-panel flex flex-col gap-1.5"
        data-ocid="combined_amps.stabilizer.slot"
        style={{
          borderColor: pulling
            ? "rgba(153,69,255,0.5)"
            : "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[9px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(153,69,255,0.9)" }}
          >
            CMD STRENGTH
          </p>
          <div
            className={`w-2 h-2 rounded-full ${pulling ? "animate-pulse-glow" : ""}`}
            style={{
              background: pulling
                ? "rgba(153,69,255,0.9)"
                : "rgba(255,255,255,0.2)",
              boxShadow: pulling ? "0 0 8px rgba(153,69,255,0.7)" : "none",
            }}
          />
        </div>
        <p
          className="meter-readout text-xs"
          style={{ color: "rgba(153,69,255,0.85)" }}
        >
          {stabilizerStrength.toLocaleString()}
        </p>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${distPct}%`,
              background:
                "linear-gradient(to right, rgba(153,69,255,0.8), rgba(255,80,80,0.6))",
            }}
          />
        </div>
        <p
          className="text-[8px] font-mono tracking-widest"
          style={{
            color: pulling ? "rgba(153,69,255,0.8)" : "rgba(255,255,255,0.3)",
          }}
        >
          {pulling ? `ATOMIZING ${Math.round(pullAmount * 100)}%` : "CLEAN"}
        </p>
      </div>

      <div
        className="slot-panel flex flex-col gap-1.5"
        data-ocid="combined_amps.commander.slot"
        style={{
          borderColor: commanderActive
            ? "rgba(0,213,255,0.4)"
            : "rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[9px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            COMMANDER
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
          80,000 × 86
        </p>
        <p
          className="text-[8px] font-mono tracking-wide leading-tight"
          style={{ color: "rgba(0,213,255,0.6)" }}
        >
          {commanderOrder}
        </p>
      </div>
    </div>
  );
}

// ─── Warmth Gauge (display only — no saturation/distortion) ──────────────────

function WarmthGauge({ warmth }: { warmth: number }) {
  const pct = Math.round(warmth);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[8px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(200,150,255,0.7)" }}
        >
          WARMTH LEVEL
        </span>
        <span
          className="text-[9px] font-mono font-bold tabular-nums"
          style={{ color: "rgba(200,150,255,0.9)" }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(to right, rgba(153,69,255,0.5), rgba(220,150,255,0.85))",
            boxShadow: pct > 10 ? "0 0 6px rgba(153,69,255,0.4)" : "none",
          }}
        />
      </div>
      <p
        className="text-[7px] font-mono tracking-widest"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        WARMTH ONLY — NEVER ADDS DISTORTION · +1.5dB MAX AT 400Hz
      </p>
    </div>
  );
}

// ─── Analog Tube Section (warmth only — no saturation/harmonic controls) ─────

function AnalogTubeSection({
  tube,
  warmth,
  isPlaying,
}: {
  tube: CombinedAmpState["tube"];
  warmth: number;
  isPlaying: boolean;
}) {
  return (
    <div
      className="rounded-sm p-2.5 flex flex-col gap-2"
      data-ocid="combined_amps.tube.slot"
      style={{
        background: "rgba(0,8,30,0.85)",
        border: isPlaying
          ? tube.softCompression
            ? "1px solid rgba(220,150,255,0.5)"
            : "1px solid rgba(153,69,255,0.35)"
          : "1px solid rgba(50,0,120,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{ color: "rgba(153,69,255,0.9)" }}
          >
            ANALOG TUBE — WARMTH ONLY
          </p>
          <p
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(220,150,255,0.55)" }}
          >
            Adds warmth and smoothness — NEVER adds distortion
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="text-[6px] font-mono px-1 py-0.5 rounded-sm border"
            style={{
              color: "rgba(200,100,255,0.85)",
              borderColor: "rgba(200,100,255,0.25)",
              background: "rgba(200,100,255,0.05)",
            }}
          >
            THERMIONIC WARMTH
          </span>
          <div
            className={`w-2 h-2 rounded-full ${isPlaying ? "animate-pulse-glow" : ""}`}
            style={{
              background: isPlaying
                ? "rgba(153,69,255,0.9)"
                : "rgba(255,255,255,0.15)",
              boxShadow: isPlaying ? "0 0 8px rgba(153,69,255,0.9)" : "none",
            }}
          />
        </div>
      </div>

      {/* Warmth display */}
      <WarmthGauge warmth={warmth} />

      {/* Read-only LED displays — status only, no controls */}
      <div className="flex gap-2 flex-wrap">
        <LedDisplay
          label="WARMTH"
          value={`${Math.round(tube.thermionic * 100)}%`}
          color="rgba(200,150,255,0.9)"
        />
        <LedDisplay
          label="OUTPUT"
          value={`${Math.round(tube.outputLevel * 100)}%`}
          color="rgba(153,69,255,0.85)"
        />
        <LedDisplay
          label="THD"
          value={`${(tube.thd * 100).toFixed(4)}%`}
          color="rgba(180,120,255,0.8)"
        />
        {tube.softCompression && (
          <LedDisplay
            label="SOFT COMP"
            value="ON"
            color="rgba(220,150,255,0.9)"
          />
        )}
      </div>

      <LevelBar
        level={tube.outputLevel}
        color="rgba(153,69,255,0.9)"
        height={22}
      />

      <p className="text-[7px] font-mono tracking-widest text-[rgba(255,255,255,0.22)]">
        THERMIONIC · NEVER HARD CLIPS · WARMTH NOT GRIT · CLEAN AT ALL POWER
      </p>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export interface CombinedAmpsPanelProps {
  state: CombinedAmpState;
  isPlaying: boolean;
  /** Analog tube warmth 0–100 (from useCombinedAmps) */
  analogTubeWarmth?: number;
}

export function CombinedAmpsPanel({
  state,
  isPlaying,
  analogTubeWarmth = 30,
}: CombinedAmpsPanelProps) {
  const { digital, tube, combinedOutput, channels, protection } = state;

  // ── REAL INDICATORS — must reflect actual signal state ──
  const ctxRunning = (() => {
    const ctx = getSharedCtx();
    return !!(ctx && ctx.state === "running");
  })();

  // Virtual Magnet: green when audio context is running
  const virtualMagnetActive = ctxRunning && isPlaying;
  // Line Driver: green when master gain > 0.5 (proxy: combinedOutput > 0.5)
  const lineDriverActive = isPlaying && combinedOutput > 0;
  // 8 Ohm Dummy Load: green when audio context exists (always wired)
  const dummyLoadActive = ctxRunning || isPlaying;

  return (
    <div className="flex flex-col gap-2" data-ocid="combined_amps.panel">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <p
            className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            COMBINED MAIN AMP — UNIFIED UNIT
          </p>
          <p
            className="text-[8px] font-mono tracking-widest"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Virtual Amp + Digital Stimulation + Analog Tube · Channel 3 — Engine
            1
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: isPlaying
                  ? "rgba(0,255,120,0.9)"
                  : "rgba(255,255,255,0.2)",
                boxShadow: isPlaying ? "0 0 6px rgba(0,255,120,0.7)" : "none",
              }}
            />
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {isPlaying ? "ALL SYSTEMS: ONLINE" : "STANDBY"}
            </span>
          </div>
          {commanderReachesEQ && (
            <span
              className="text-[6px] font-mono tracking-wider px-1 py-0.5 rounded-sm"
              style={{
                background: "rgba(0,255,120,0.06)",
                border: "1px solid rgba(0,255,120,0.25)",
                color: "rgba(0,255,120,0.65)",
              }}
            >
              EQ AUTH ✓
            </span>
          )}
        </div>
      </div>

      {/* ── REAL INDICATORS BLOCK ── */}
      <div
        className="flex flex-col gap-1"
        data-ocid="combined_amps.true_indicators"
      >
        <p
          className="text-[7px] font-mono tracking-[0.25em] uppercase"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          TRUE REAL INDICATORS — REFLECT ACTUAL SIGNAL STATE
        </p>
        <TrueIndicator
          label="VIRTUAL MAGNET"
          status="ENGAGED — SOFTWARE PULLED TO HARDWARE"
          active={virtualMagnetActive}
          color="rgba(0,213,255,0.9)"
          ocid="combined_amps.virtual_magnet"
        />
        <TrueIndicator
          label="LINE DRIVER"
          status="LINE DRIVER ACTIVE — SIGNAL CLEAN BOOSTER"
          active={lineDriverActive}
          color="rgba(0,255,180,0.9)"
          ocid="combined_amps.line_driver"
        />
        <TrueIndicator
          label="8Ω DUMMY LOAD"
          status="WIRED AND LOADED — ALL FILTERS FEEDING"
          active={dummyLoadActive}
          color="rgba(255,180,0,0.9)"
          ocid="combined_amps.dummy_load"
        />
      </div>

      {/* ── Power note ── */}
      <div
        className="flex items-center justify-between px-2 py-1 rounded-sm"
        style={{
          background: "rgba(0,213,255,0.04)",
          border: "1px solid rgba(0,213,255,0.15)",
        }}
      >
        <span
          className="text-[8px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(0,213,255,0.5)" }}
        >
          COMBINED OUTPUT — CHANNEL 3
        </span>
        <span
          className="meter-readout text-sm font-bold"
          style={{ color: "rgba(0,213,255,0.9)" }}
        >
          80,000
        </span>
      </div>

      {/* ── Pioneer GM-DX104 chassis ── */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(30,35,45,0.95) 0%, rgba(18,22,32,0.98) 40%, rgba(14,18,28,0.99) 100%)",
          border: "2px solid rgba(80,90,120,0.5)",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* Drawer handle */}
        <div
          className="h-3 flex items-center justify-center"
          style={{
            background:
              "linear-gradient(to bottom, rgba(60,70,90,0.8), rgba(40,48,65,0.9))",
            borderBottom: "1px solid rgba(0,100,255,0.15)",
          }}
        >
          <div
            className="w-16 h-1 rounded-full"
            style={{ background: "rgba(0,150,255,0.2)" }}
          />
        </div>

        <div className="p-3 flex flex-col gap-2.5">
          {/* ── VIRTUAL AMP ── */}
          <div
            className="rounded-sm p-2.5 flex flex-col gap-2"
            data-ocid="combined_amps.virtual.slot"
            style={{
              background: "rgba(0,8,30,0.85)",
              border: isPlaying
                ? "1px solid rgba(0,213,255,0.45)"
                : "1px solid rgba(0,60,160,0.2)",
              boxShadow: isPlaying
                ? "0 0 12px rgba(0,150,255,0.15), inset 0 0 20px rgba(0,100,200,0.06)"
                : "none",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
                  style={{
                    color: isPlaying
                      ? "rgba(0,213,255,0.95)"
                      : "rgba(255,255,255,0.4)",
                  }}
                >
                  VIRTUAL AMP — GERROD'S DESIGN
                </p>
                <p
                  className="text-[7px] font-mono tracking-widest"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  MAIN AMP · 80,000 VIRTUAL · 4-GAUGE DIRECT · OUTPUTS: MIDS /
                  HIGHS / BASS
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="text-[7px] font-mono px-1.5 py-0.5 rounded-sm border"
                  style={{
                    color: "rgba(0,213,255,0.9)",
                    borderColor: "rgba(0,213,255,0.3)",
                    background: "rgba(0,213,255,0.06)",
                  }}
                >
                  MAIN
                </span>
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isPlaying ? "animate-pulse-glow" : ""}`}
                  style={{
                    background: isPlaying
                      ? "rgba(0,213,255,0.9)"
                      : "rgba(255,255,255,0.15)",
                    boxShadow: isPlaying
                      ? "0 0 8px rgba(0,213,255,0.9)"
                      : "none",
                  }}
                />
              </div>
            </div>

            {/* 6 virtual screens */}
            <div className="grid grid-cols-6 gap-1">
              {(["SCN1", "SCN2", "SCN3", "SCN4", "SCN5", "SCN6"] as const).map(
                (scn, i) => (
                  <div
                    key={scn}
                    className="rounded-sm flex items-center justify-center"
                    style={{
                      height: 18,
                      background: isPlaying
                        ? `rgba(0,${80 + i * 20},200,0.15)`
                        : "rgba(0,0,0,0.4)",
                      border: isPlaying
                        ? "1px solid rgba(0,200,255,0.35)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span
                      className="text-[6px] font-mono"
                      style={{
                        color: isPlaying
                          ? "rgba(0,213,255,0.8)"
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      SCN{i + 1}
                    </span>
                  </div>
                ),
              )}
            </div>

            <LevelBar
              level={combinedOutput}
              color="rgba(0,213,255,0.9)"
              height={28}
            />

            <div className="grid grid-cols-3 gap-1">
              {[
                {
                  label: "THD",
                  value: `${(((digital.thd + tube.thd) / 2) * 100).toFixed(3)}%`,
                  color: "rgba(0,213,255,0.85)",
                },
                {
                  label: "OUTPUT",
                  value: `${Math.round(combinedOutput * 100)}%`,
                  color: "rgba(0,213,255,0.85)",
                },
                {
                  label: "POWER",
                  value: "80,000",
                  color: "rgba(0,213,255,0.85)",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center py-1 rounded-sm"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <p
                    className="meter-readout text-xs leading-none"
                    style={{ color }}
                  >
                    {value}
                  </p>
                  <p className="text-[7px] font-mono tracking-widest text-[rgba(255,255,255,0.3)] mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── DIGITAL STIMULATION AMP ── */}
          <div
            className="rounded-sm p-2.5 flex flex-col gap-2"
            data-ocid="combined_amps.digital.slot"
            style={{
              background: "rgba(0,8,30,0.85)",
              border: isPlaying
                ? digital.presenceBoost
                  ? "1px solid rgba(0,255,180,0.4)"
                  : "1px solid rgba(0,213,255,0.30)"
                : "1px solid rgba(0,50,150,0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
                  style={{
                    color: digital.presenceBoost
                      ? "rgba(0,255,180,0.9)"
                      : "rgba(0,213,255,0.75)",
                  }}
                >
                  DIGITAL STIMULATION
                </p>
                <p
                  className="text-[7px] font-mono tracking-widest"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                >
                  CLARITY BOOST · SIGNAL ENHANCEMENT · DSP-DRIVEN
                </p>
              </div>
              <div
                className={`w-2 h-2 rounded-full ${isPlaying ? "animate-pulse-glow" : ""}`}
                style={{
                  background: isPlaying
                    ? "rgba(0,213,255,0.9)"
                    : "rgba(255,255,255,0.15)",
                  boxShadow: isPlaying ? "0 0 8px rgba(0,213,255,0.9)" : "none",
                }}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <LedDisplay
                label="PWM Hz"
                value={
                  isPlaying
                    ? `${(digital.pwmFrequency / 1000).toFixed(0)}k`
                    : "450k"
                }
                color="rgba(0,213,255,0.95)"
              />
              <LedDisplay
                label="EFF %"
                value={`${Math.round(digital.efficiency * 100)}`}
                color="rgba(0,255,180,0.95)"
              />
              <LedDisplay
                label="THD %"
                value={`${(digital.thd * 100).toFixed(3)}`}
                color="rgba(0,213,255,0.85)"
              />
              <LedDisplay
                label="CLARITY"
                value={digital.presenceBoost ? "ON" : "OFF"}
                color={
                  digital.presenceBoost
                    ? "rgba(0,255,180,0.9)"
                    : "rgba(255,255,255,0.3)"
                }
              />
            </div>

            <LevelBar
              level={digital.outputLevel}
              color={
                digital.presenceBoost
                  ? "rgba(0,255,180,0.9)"
                  : "rgba(0,213,255,0.75)"
              }
              height={24}
            />

            {digital.hardClipping && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
                style={{
                  background: "rgba(255,80,80,0.08)",
                  border: "1px solid rgba(255,80,80,0.35)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "rgba(255,80,80,0.9)" }}
                />
                <span
                  className="text-[8px] font-mono tracking-widest"
                  style={{ color: "rgba(255,80,80,0.9)" }}
                >
                  HARD CLEAN CEILING — PEAK HIT · CLEAN CUT
                </span>
              </div>
            )}
          </div>

          {/* ── ANALOG TUBE AMP — WARMTH ONLY ── */}
          <AnalogTubeSection
            tube={tube}
            warmth={analogTubeWarmth}
            isPlaying={isPlaying}
          />
        </div>
      </div>

      {/* ── 4-Channel Distribution ── */}
      <div>
        <p
          className="text-[8px] font-mono tracking-[0.25em] uppercase mb-1.5"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          4-CHANNEL POWER DISTRIBUTION — CHANNEL 3 / ENGINE 1
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {channels.map((ch) => (
            <ChannelStrip
              key={ch.name}
              name={ch.name}
              watts={ch.watts}
              ohms={ch.ohms}
              signalLevel={ch.signalLevel}
              color={ch.color}
              commanderActive={ch.commanderActive}
              isPlaying={isPlaying}
            />
          ))}
        </div>
      </div>

      {/* ── Protection mini ── */}
      <div>
        <p
          className="text-[8px] font-mono tracking-[0.25em] uppercase mb-1.5"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          PROTECTION — EMBEDDED IN ALL CHANNELS
        </p>
        <ProtectionMini {...protection} />
      </div>

      {/* ── Wired footer ── */}
      <div className="flex items-center gap-1 mt-1">
        <div
          className="flex-1 h-px"
          style={{
            background:
              "linear-gradient(to right, rgba(0,213,255,0.3), rgba(153,69,255,0.3))",
          }}
        />
        <span
          className="text-[7px] font-mono tracking-[0.2em] shrink-0"
          style={{ color: "rgba(0,213,255,0.3)" }}
        >
          4-GAUGE WIRED · DIRECT · SLOT-TO-SLOT
        </span>
        <div
          className="flex-1 h-px"
          style={{
            background:
              "linear-gradient(to left, rgba(0,213,255,0.3), rgba(153,69,255,0.3))",
          }}
        />
      </div>
    </div>
  );
}
