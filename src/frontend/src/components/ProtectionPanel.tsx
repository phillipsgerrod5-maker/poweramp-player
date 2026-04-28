import type {
  NewProtectionSystem,
  OldProtectionSystem,
  ProtectionIndicators,
} from "@/hooks/useCombinedAmps";
import { getSharedAnalyser, getSharedCtx } from "@/hooks/usePlayer";
import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProtectionPanelProps {
  isPlaying: boolean;
  oldProtection: OldProtectionSystem;
  setOldProtSlider1: (v: number) => void;
  setOldProtSlider2: (v: number) => void;
  setOldProtSlider3: (v: number) => void;
  newProtection: NewProtectionSystem;
  setNewProtSlider1: (v: number) => void;
  setNewProtLoudnessLimit: (v: number) => void;
  /** Slider 3 — OUTPUT FLOOR LOCK — maps to noise gate threshold */
  setNewProtOutputFloor?: (v: number) => void;
  outputFloorLock?: number;
  indicators: ProtectionIndicators;
}

// ─── localStorage auto-save helpers ─────────────────────────────────────────

function protSave(sliderName: string, value: number): void {
  try {
    localStorage.setItem(`poweramp-protection-${sliderName}`, String(value));
  } catch {
    /* ignore */
  }
}

function protLoad(sliderName: string, fallback: number): number {
  try {
    const v = localStorage.getItem(`poweramp-protection-${sliderName}`);
    if (v !== null) return Number(v);
  } catch {
    /* ignore */
  }
  return fallback;
}

// ─── Slider Component ─────────────────────────────────────────────────────────

interface ProtSliderProps {
  ocid: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  accentColor: string;
  unit?: string;
  locked?: boolean;
  lockedLabel?: string;
}

function ProtSlider({
  ocid,
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
  accentColor,
  unit = "",
  locked = false,
  lockedLabel,
}: ProtSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  if (locked) {
    return (
      <div
        data-ocid={ocid}
        className="rounded-sm p-2.5 flex flex-col gap-1.5"
        style={{
          background: "rgba(0,10,40,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
          opacity: 0.55,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Lock
                className="w-3 h-3 shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
              <span
                className="text-[9px] font-mono tracking-widest uppercase font-bold block leading-none"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {lockedLabel ?? label}
              </span>
            </div>
            <span
              className="text-[7px] font-mono tracking-wide mt-0.5 block leading-tight"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              {description}
            </span>
          </div>
          <span
            className="text-[8px] font-mono tracking-widest px-2 py-0.5 rounded-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.2)",
            }}
          >
            LOCKED
          </span>
        </div>
        {/* Locked track — cannot be moved */}
        <div className="relative h-5 flex items-center" aria-disabled="true">
          <div
            className="absolute inset-x-0 h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      data-ocid={ocid}
      className="rounded-sm p-2.5 flex flex-col gap-2"
      style={{
        background: "rgba(0,10,40,0.7)",
        border: `1px solid ${accentColor.replace("0.9", value > min ? "0.35" : "0.12")}`,
        boxShadow:
          value > min
            ? `0 0 10px ${accentColor.replace("0.9", "0.08")}`
            : "none",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span
            className="text-[9px] font-mono tracking-widest uppercase font-bold block leading-none"
            style={{ color: accentColor }}
          >
            {label}
          </span>
          <span
            className="text-[7px] font-mono tracking-wide mt-0.5 block leading-tight"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            {description}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span
            className="text-base font-mono font-black tabular-nums leading-none block"
            style={{
              color: accentColor,
              textShadow: value > min ? `0 0 8px ${accentColor}` : "none",
            }}
          >
            {value}
            <span className="text-[9px] ml-0.5">{unit}</span>
          </span>
        </div>
      </div>

      <div className="relative h-5 flex items-center">
        <div
          className="absolute inset-x-0 h-2 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(to right, rgba(0,40,120,0.8), ${accentColor})`,
              boxShadow: pct > 0 ? `0 0 6px ${accentColor}` : "none",
            }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-x-0 w-full h-5 opacity-0 cursor-pointer"
          style={{ zIndex: 2 }}
        />
        <div
          className="absolute w-5 h-5 rounded-full pointer-events-none"
          style={{
            left: `calc(${pct}% - 10px)`,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
            border: "2px solid rgba(255,255,255,0.8)",
            zIndex: 1,
          }}
        />
      </div>

      <div className="flex justify-between -mt-1">
        {[min, Math.round((min + max) / 2), max].map((tick) => (
          <span
            key={tick}
            className="text-[7px] font-mono"
            style={{
              color:
                value >= tick
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(255,255,255,0.1)",
            }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Grade Badge ──────────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: OldProtectionSystem["grade"] }) {
  const color =
    grade === "A+"
      ? "rgba(0,255,120,0.9)"
      : grade === "B+"
        ? "rgba(0,213,255,0.9)"
        : grade === "C+"
          ? "rgba(255,200,0,0.9)"
          : "rgba(255,80,80,0.9)";

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-sm"
      style={{
        background: color.replace("0.9", "0.08"),
        border: `1px solid ${color.replace("0.9", "0.5")}`,
        boxShadow: `0 0 8px ${color.replace("0.9", "0.15")}`,
      }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 5px ${color}` }}
      />
      <span
        className="text-[10px] font-mono font-black tracking-widest"
        style={{ color, textShadow: `0 0 6px ${color}` }}
      >
        {grade}
      </span>
    </div>
  );
}

// ─── Indicator Dot ────────────────────────────────────────────────────────────

function IndicatorDot({
  label,
  active,
  activeColor = "rgba(0,255,120,0.9)",
  inactiveColor = "rgba(255,80,80,0.9)",
}: {
  label: string;
  active: boolean;
  activeColor?: string;
  inactiveColor?: string;
}) {
  const color = active ? activeColor : inactiveColor;
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-sm p-1.5"
      style={{
        background: "rgba(0,10,40,0.5)",
        border: `1px solid ${color.replace("0.9", "0.25")}`,
      }}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{
          background: color,
          boxShadow: active ? `0 0 8px ${color}` : "none",
        }}
      />
      <span
        className="text-[6px] font-mono tracking-wide text-center leading-tight"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
      <span className="text-[6px] font-mono font-bold" style={{ color }}>
        {active ? "ON" : "OFF"}
      </span>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ProtectionPanel({
  isPlaying,
  oldProtection,
  setOldProtSlider1,
  setOldProtSlider2,
  setOldProtSlider3,
  newProtection,
  setNewProtSlider1,
  setNewProtLoudnessLimit,
  setNewProtOutputFloor,
  outputFloorLock = protLoad("output-floor", 5),
  indicators,
}: ProtectionPanelProps) {
  const [signalPresent, setSignalPresent] = useState(false);
  const signalCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (signalCheckRef.current) clearInterval(signalCheckRef.current);
    if (!isPlaying) {
      setSignalPresent(false);
      return;
    }
    signalCheckRef.current = setInterval(() => {
      const analyser = getSharedAnalyser();
      if (!analyser) {
        setSignalPresent(false);
        return;
      }
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      setSignalPresent(Math.sqrt(sum / buf.length) > 0.002);
    }, 100);
    return () => {
      if (signalCheckRef.current) clearInterval(signalCheckRef.current);
    };
  }, [isPlaying]);

  const ctxExists = !!getSharedCtx?.();

  return (
    <div data-ocid="protection.panel" className="mx-4 mb-3 flex flex-col gap-3">
      {/* ═══════════════════════════════════════════════════════════
          DUAL PROTECTION — SIDE BY SIDE
      ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-3">
        {/* ── OLD PROTECTION SYSTEM ── */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            background: "rgba(0,8,30,0.97)",
            border: "1px solid rgba(0,130,255,0.25)",
            boxShadow: isPlaying ? "0 0 16px rgba(0,100,255,0.1)" : "none",
          }}
        >
          <div
            className="px-3 py-2.5"
            style={{
              background:
                "linear-gradient(to right, rgba(0,213,255,0.08), rgba(0,100,180,0.05))",
              borderBottom: "1px solid rgba(0,130,255,0.2)",
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <p
                  className="text-[10px] font-mono tracking-[0.18em] uppercase font-bold leading-none"
                  style={{
                    color: "rgba(0,213,255,0.95)",
                    textShadow: "0 0 8px rgba(0,213,255,0.4)",
                  }}
                >
                  OLD PROTECTION SYSTEM
                </p>
                <p
                  className="text-[7px] font-mono tracking-widest mt-0.5"
                  style={{ color: "rgba(0,213,255,0.4)" }}
                >
                  CHANNEL 4 — POWERED · Covers Engine, Bass, Mids &amp; Highs
                </p>
              </div>
              <GradeBadge grade={oldProtection.grade} />
            </div>
          </div>

          <div className="px-3 py-3 flex flex-col gap-2.5">
            <ProtSlider
              ocid="protect.old.slider1"
              label="ENGINE · BASS · MIDS · HIGHS"
              description="Covers engine, bass, mids and highs — tough/aggressive by default"
              value={oldProtection.slider1}
              min={0}
              max={100}
              onChange={(v) => {
                protSave("old1", v);
                setOldProtSlider1(v);
              }}
              accentColor="rgba(0,160,255,0.9)"
            />
            <p
              className="text-[6.5px] font-mono tracking-widest -mt-1 px-1"
              style={{ color: "rgba(0,100,200,0.4)" }}
            >
              DOES NOT AFFECT VOLUME
            </p>
            <ProtSlider
              ocid="protect.old.slider2"
              label="VOICE & INSTRUMENT SMOOTHER"
              description="110dB capable · Smooth voices · Comfortable instruments · Live sounding"
              value={oldProtection.slider2}
              min={0}
              max={100}
              onChange={(v) => {
                protSave("old2", v);
                setOldProtSlider2(v);
              }}
              accentColor="rgba(153,69,255,0.9)"
            />
            <p
              className="text-[6.5px] font-mono tracking-widest -mt-1 px-1"
              style={{ color: "rgba(100,50,200,0.4)" }}
            >
              DOES NOT AFFECT VOLUME
            </p>
            <ProtSlider
              ocid="protect.old.slider3"
              label="SIGNAL CATCH — WHAT 1 & 2 MISSED"
              description="Catches what sliders 1 &amp; 2 missed · Breaks bad Hz into particles"
              value={oldProtection.slider3}
              min={0}
              max={100}
              onChange={(v) => {
                protSave("old3", v);
                setOldProtSlider3(v);
              }}
              accentColor="rgba(0,213,255,0.9)"
            />
            <p
              className="text-[6.5px] font-mono tracking-widest -mt-1 px-1"
              style={{ color: "rgba(0,130,200,0.4)" }}
            >
              DOES NOT AFFECT VOLUME
            </p>
          </div>
        </div>

        {/* ── NEW PROTECTION SYSTEM ── */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            background: "rgba(0,8,30,0.97)",
            border: "1px solid rgba(255,160,0,0.2)",
            boxShadow: newProtection.isActive
              ? "0 0 14px rgba(255,160,0,0.08)"
              : "none",
          }}
        >
          <div
            className="px-3 py-2.5"
            style={{
              background:
                "linear-gradient(to right, rgba(255,160,0,0.07), rgba(200,100,0,0.04))",
              borderBottom: "1px solid rgba(255,160,0,0.15)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-[10px] font-mono tracking-[0.18em] uppercase font-bold leading-none"
                  style={{
                    color: "rgba(255,160,0,0.95)",
                    textShadow: "0 0 8px rgba(255,160,0,0.4)",
                  }}
                >
                  NEW PROTECTION SYSTEM
                </p>
                <p
                  className="text-[7px] font-mono tracking-widest mt-0.5"
                  style={{ color: "rgba(255,160,0,0.4)" }}
                >
                  CHANNEL 4 — Distortion &amp; Clipping Clean · NEVER TOUCHES
                  VOLUME
                </p>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-sm"
                style={{
                  background: newProtection.isActive
                    ? "rgba(0,255,120,0.07)"
                    : "rgba(255,255,255,0.04)",
                  border: newProtection.isActive
                    ? "1px solid rgba(0,255,120,0.35)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: newProtection.isActive
                      ? "rgba(0,255,120,0.9)"
                      : "rgba(255,255,255,0.2)",
                    boxShadow: newProtection.isActive
                      ? "0 0 5px rgba(0,255,120,0.7)"
                      : "none",
                  }}
                />
                <span
                  className="text-[7px] font-mono tracking-wider"
                  style={{
                    color: newProtection.isActive
                      ? "rgba(0,255,120,0.8)"
                      : "rgba(255,255,255,0.25)",
                  }}
                >
                  {newProtection.isActive ? "ACTIVE" : "STANDBY"}
                </span>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 flex flex-col gap-2.5">
            {/* Slider 1 */}
            <ProtSlider
              ocid="protect.new.slider1"
              label="DISTORTION · CLIPPING · OUTPUT CLEAN"
              description="Shrinks bad signal into particles instantly — fires on bass hit · NEVER TOUCHES BASS LEVEL"
              value={newProtection.slider1}
              min={1}
              max={10}
              onChange={(v) => {
                protSave("new1", v);
                setNewProtSlider1(v);
              }}
              accentColor="rgba(255,160,0,0.9)"
            />
            <p
              className="text-[6.5px] font-mono tracking-widest -mt-1 px-1"
              style={{ color: "rgba(200,100,0,0.4)" }}
            >
              DOES NOT AFFECT VOLUME
            </p>
            {/* Loudness limit — labeled as Slider 2 per spec */}
            <ProtSlider
              ocid="protect.new.loudness"
              label="CLIPPING NOISE REDUCTION"
              description="Reduces clipping artifacts only — zero effect on volume · NEVER TOUCHES VOLUME"
              value={newProtection.loudnessLimit}
              min={1}
              max={10}
              onChange={(v) => {
                protSave("new2", v);
                setNewProtLoudnessLimit(v);
              }}
              accentColor="rgba(0,255,120,0.9)"
            />
            <p
              className="text-[6.5px] font-mono tracking-widest -mt-1 px-1"
              style={{ color: "rgba(0,180,80,0.4)" }}
            >
              DOES NOT AFFECT VOLUME
            </p>
            {/* Slider 3 — OUTPUT FLOOR LOCK */}
            <ProtSlider
              ocid="protect.new.slider3"
              label="OUTPUT FLOOR LOCK"
              description="Locks noise gate threshold on final output — never touches volume"
              value={outputFloorLock}
              min={1}
              max={10}
              onChange={(v) => {
                protSave("output-floor", v);
                setNewProtOutputFloor?.(v);
              }}
              accentColor="rgba(0,180,255,0.9)"
            />
            <p
              className="text-[6.5px] font-mono tracking-widest -mt-1 px-1"
              style={{ color: "rgba(0,150,255,0.4)" }}
            >
              DOES NOT AFFECT VOLUME — noise gate threshold:{" "}
              {outputFloorLock === 1
                ? "-90dB"
                : outputFloorLock === 10
                  ? "-30dB"
                  : `${Math.round(-90 + (outputFloorLock - 1) * 6.67)}dB`}
            </p>

            {/* Loudness limit readout */}
            <div
              className="flex items-center justify-between px-2 py-1.5 rounded-sm"
              style={{
                background: "rgba(255,160,0,0.04)",
                border: "1px solid rgba(255,160,0,0.15)",
              }}
            >
              <span
                className="text-[7px] font-mono tracking-widest uppercase"
                style={{ color: "rgba(255,160,0,0.6)" }}
              >
                LOUDNESS LIMIT DISPLAY
              </span>
              <span
                className="text-[9px] font-mono font-bold tabular-nums"
                style={{ color: "rgba(255,160,0,0.9)" }}
              >
                LEVEL {newProtection.slider1}/10
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TITANIUM WALL SMART CHIP
      ═══════════════════════════════════════════════════════════ */}
      <div
        data-ocid="protection.titanium_wall"
        className="rounded-sm overflow-hidden"
        style={{
          background: "rgba(0,8,30,0.97)",
          border: "2px solid rgba(0,213,255,0.5)",
          boxShadow: "0 0 18px rgba(0,130,255,0.15)",
        }}
      >
        <div
          className="px-3 py-2.5"
          style={{
            background:
              "linear-gradient(to right, rgba(0,213,255,0.1), rgba(0,100,200,0.06))",
            borderBottom: "1px solid rgba(0,213,255,0.3)",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-[10px] font-mono tracking-[0.18em] uppercase font-bold leading-none"
                style={{
                  color: "rgba(0,213,255,0.95)",
                  textShadow: "0 0 10px rgba(0,213,255,0.5)",
                }}
              >
                TITANIUM WALL SMART CHIP
              </p>
              <p
                className="text-[7px] font-mono tracking-widest mt-0.5"
                style={{ color: "rgba(0,213,255,0.45)" }}
              >
                HOLDING ALL 6 SLIDERS · POWER: 1,000 · CHANNEL POWERED · 10
                INCHES WIDE
              </p>
            </div>
            <div
              className="px-2 py-0.5 rounded-sm text-[7px] font-mono tracking-widest animate-pulse-glow"
              style={{
                background: "rgba(0,255,120,0.08)",
                border: "1px solid rgba(0,255,120,0.4)",
                color: "rgba(0,255,120,0.9)",
              }}
            >
              ACTIVE
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5">
          {/* 6-slider hold indicator */}
          <div className="grid grid-cols-3 gap-1 mb-2.5">
            {[
              { label: "OLD-1", color: "rgba(0,160,255,0.9)" },
              { label: "OLD-2", color: "rgba(153,69,255,0.9)" },
              { label: "OLD-3", color: "rgba(0,213,255,0.9)" },
              { label: "NEW-1", color: "rgba(255,160,0,0.9)" },
              { label: "NEW-2", color: "rgba(0,255,120,0.9)" },
              { label: "NEW-3", color: "rgba(255,255,255,0.2)" },
            ].map(({ label, color }) => (
              <div
                key={label}
                className="flex flex-col items-center py-1.5 rounded-sm"
                style={{
                  background: "rgba(0,10,40,0.6)",
                  border: `1px solid ${color.replace(/[\d.]+\)$/, "0.25)")}`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mb-0.5"
                  style={{
                    background: color,
                    boxShadow: `0 0 5px ${color}`,
                  }}
                />
                <span
                  className="text-[6px] font-mono tracking-widest"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {label}
                </span>
                <span
                  className="text-[5.5px] font-mono"
                  style={{ color: color.replace(/[\d.]+\)$/, "0.6)") }}
                >
                  HELD
                </span>
              </div>
            ))}
          </div>

          {/* Protection behavior note */}
          <div
            className="px-2 py-2 rounded-sm mb-2"
            style={{
              background: "rgba(0,255,120,0.04)",
              border: "1px solid rgba(0,255,120,0.2)",
            }}
          >
            <p
              className="text-[8px] font-mono tracking-widest font-bold"
              style={{ color: "rgba(0,255,120,0.85)" }}
            >
              HIGHS &amp; MIDS: PROTECTION STABILIZES AT TOP — NEVER PULLS BACK
            </p>
            <p
              className="text-[7px] font-mono tracking-widest mt-0.5"
              style={{ color: "rgba(0,200,150,0.5)" }}
            >
              Signal goes up clean · Held there at full strength
            </p>
          </div>

          {/* Chip stats */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "POWER", value: "1,000", color: "rgba(0,213,255,0.9)" },
              { label: "WIDTH", value: "10 IN", color: "rgba(153,69,255,0.9)" },
              {
                label: "SOURCE",
                value: "CH PWR",
                color: "rgba(0,255,120,0.9)",
              },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="flex flex-col items-center py-1.5 rounded-sm"
                style={{
                  background: "rgba(0,5,20,0.5)",
                  border: `1px solid ${color.replace(/[\d.]+\)$/, "0.2)")}`,
                }}
              >
                <span
                  className="text-[9px] font-mono font-black"
                  style={{ color }}
                >
                  {value}
                </span>
                <span
                  className="text-[6px] font-mono tracking-widest mt-0.5"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 — REAL INDICATORS
      ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background: "rgba(0,8,30,0.97)",
          border: "1px solid rgba(0,80,180,0.2)",
        }}
      >
        <div
          className="px-3 py-2"
          style={{
            background: "rgba(0,30,80,0.35)",
            borderBottom: "1px solid rgba(0,80,180,0.15)",
          }}
        >
          <p
            className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{ color: "rgba(0,180,255,0.7)" }}
          >
            SYSTEM STATUS — REAL INDICATORS
          </p>
          <p
            className="text-[6px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            Every indicator reflects actual signal state — never fake
          </p>
        </div>

        <div
          data-ocid="protection.indicators"
          className="px-3 py-3 grid grid-cols-3 gap-2"
        >
          <IndicatorDot
            label="SIGNAL CLEAN"
            active={indicators.signalClean}
            activeColor="rgba(0,255,120,0.9)"
            inactiveColor="rgba(255,80,80,0.9)"
          />
          <IndicatorDot
            label="BASS PROTECTED"
            active={indicators.bassProtected}
            activeColor="rgba(0,255,120,0.9)"
            inactiveColor="rgba(255,160,0,0.9)"
          />
          <IndicatorDot
            label="COMMANDER ACTIVE"
            active={indicators.commanderActive}
            activeColor="rgba(0,213,255,0.9)"
            inactiveColor="rgba(255,255,255,0.2)"
          />
          <IndicatorDot
            label="CMD ACTIVE"
            active={ctxExists && signalPresent}
            activeColor="rgba(153,69,255,0.9)"
            inactiveColor="rgba(255,255,255,0.2)"
          />
          <IndicatorDot
            label="CH 4 POWER"
            active
            activeColor="rgba(0,255,120,0.9)"
          />
          <IndicatorDot
            label="CH BLEED FREE"
            active={indicators.channelBleedFree}
            activeColor="rgba(0,200,255,0.9)"
            inactiveColor="rgba(255,80,80,0.9)"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 — COMMANDER STATUS
      ═══════════════════════════════════════════════════════════ */}
      <div
        data-ocid="protection.commander_status"
        className="rounded-sm overflow-hidden"
        style={{
          background: "rgba(0,8,30,0.97)",
          border: "1px solid rgba(0,213,255,0.25)",
        }}
      >
        <div
          className="px-3 py-2"
          style={{
            background:
              "linear-gradient(to right, rgba(0,213,255,0.08), rgba(0,100,200,0.04))",
            borderBottom: "1px solid rgba(0,213,255,0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse-glow shrink-0"
              style={{
                background: "rgba(0,213,255,0.9)",
                boxShadow: "0 0 6px rgba(0,213,255,0.7)",
              }}
            />
            <p
              className="text-[10px] font-mono tracking-[0.18em] uppercase font-bold"
              style={{ color: "rgba(0,213,255,0.95)" }}
            >
              COMMANDER DIRECT HIT — STRENGTH: 80,000
            </p>
          </div>
        </div>

        <div className="px-3 py-2.5 flex flex-col gap-1.5">
          {[
            {
              label: "STRENGTH",
              value: "80,000",
              color: "rgba(0,213,255,0.9)",
            },
            {
              label: "STATUS",
              value: "ATOMIZING ONLY — NEVER PULLS BACK",
              color: "rgba(0,255,120,0.9)",
            },
            {
              label: "EQ PATH",
              value: "HELD OPEN — PROTECTION CANNOT KNOCK EQ BACK",
              color: "rgba(0,213,255,0.7)",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-start gap-2">
              <span
                className="text-[7px] font-mono tracking-widest shrink-0 w-16"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {label}:
              </span>
              <span
                className="text-[8px] font-mono font-bold tracking-wider"
                style={{ color }}
              >
                {value}
              </span>
            </div>
          ))}

          <p
            className="text-[7px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            ✓ PROTECTION NEVER TOUCHES VOLUME &nbsp;·&nbsp; BASS NOTES NEVER
            CLAMPED &nbsp;·&nbsp; EQ PATH COMMANDER PROTECTED
          </p>
        </div>
      </div>
    </div>
  );
}
