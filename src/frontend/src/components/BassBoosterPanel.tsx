import { getSharedAnalyser } from "@/hooks/usePlayer";
import type { BassType } from "@/types/player";
import { useEffect, useRef, useState } from "react";

// ─── Sound Quality Class System ───────────────────────────────────────────────
// A+ = booster on + punchy/deep/sub presence + E-Quake > 5
// B+ = booster on + any presence selected
// C+ = booster off + presence selected
// D+ = default, no special bass processing

type QualityClass = "A+" | "B+" | "C+" | "D+";

function calcQualityClass(
  isBoosterOn: boolean,
  activeTypes: BassType[],
  equakeValue: number,
): QualityClass {
  const topTierTypes: BassType[] = ["deep", "punchy", "sub"];
  const hasTopTier = activeTypes.some((t) => topTierTypes.includes(t));

  if (isBoosterOn && hasTopTier && equakeValue > 5) return "A+";
  if (isBoosterOn && activeTypes.length > 0) return "B+";
  if (!isBoosterOn && activeTypes.length > 0) return "C+";
  return "D+";
}

const QUALITY_CLASS_COLORS: Record<QualityClass, string> = {
  "A+": "rgba(0,255,120,0.95)",
  "B+": "rgba(80,160,255,0.95)",
  "C+": "rgba(255,180,0,0.9)",
  "D+": "rgba(255,255,255,0.35)",
};

const QUALITY_CLASS_LABELS: Record<QualityClass, string> = {
  "A+": "TOP CLASS — FULL POWER BASS",
  "B+": "STRONG CLASS — BOOSTER ACTIVE",
  "C+": "MID CLASS — PRESENCE ONLY",
  "D+": "BASE CLASS — DEFAULT PROCESSING",
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BassBoosterPanelProps {
  isPlaying: boolean;
  bassGain: number; // -15..+15 dB from EQ
  tubeHarmonic2: number; // 0–1 from useCombinedAmps tube
  activePresenceTypes?: BassType[];
  equakeValue?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BassBoosterPanel({
  isPlaying,
  bassGain,
  tubeHarmonic2,
  activePresenceTypes = [],
  equakeValue = 0,
}: BassBoosterPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [bassEnergy, setBassEnergy] = useState(0);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Boost level 0–100 based on bass filter gain
  const boostLevel = Math.round(
    Math.max(0, Math.min(100, ((bassGain + 15) / 30) * 100)),
  );
  const isActive = isPlaying && bassGain > 0;

  // Harmonic warmth factor from tube amp
  const h2Pct = Math.round(tubeHarmonic2 * 800);

  // Sound Quality Class
  const qualityClass = calcQualityClass(
    isActive,
    activePresenceTypes,
    equakeValue,
  );
  const classColor = QUALITY_CLASS_COLORS[qualityClass];
  const classLabel = QUALITY_CLASS_LABELS[qualityClass];

  // Canvas mini waveform of sub-bass energy
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const analyser = getSharedAnalyser();
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (analyser && isPlaying) {
        const bin = analyser.frequencyBinCount;
        if (!dataRef.current || dataRef.current.length !== bin) {
          dataRef.current = new Uint8Array(bin) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(dataRef.current);

        // Sub-bass: first 5% of bins (0–200Hz roughly)
        const subBassEnd = Math.floor(bin * 0.05);
        let sum = 0;
        for (let i = 0; i < subBassEnd; i++) sum += dataRef.current[i] ?? 0;
        const energy = sum / subBassEnd / 255;
        setBassEnergy(energy);

        // Draw waveform using time domain
        const timeDomain = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(timeDomain);
        const step = Math.floor(timeDomain.length / W);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(153,69,255,${0.4 + energy * 0.55})`;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < W; i++) {
          const sample = timeDomain[i * step] ?? 0;
          const y = H / 2 + sample * (H / 2) * 0.85;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();

        // Glow fill below waveform
        ctx.beginPath();
        for (let i = 0; i < W; i++) {
          const sample = timeDomain[i * step] ?? 0;
          const y = H / 2 + sample * (H / 2) * 0.85;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, `rgba(153,69,255,${energy * 0.3})`);
        grad.addColorStop(1, "rgba(153,69,255,0)");
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        // Idle flat line
        setBassEnergy(0);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(153,69,255,0.15)";
        ctx.lineWidth = 1;
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const physicalFeel = Math.round(bassEnergy * 100);

  return (
    <div
      className="rounded-sm overflow-hidden"
      data-ocid="bass_booster.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(5,0,25,0.96), rgba(10,5,40,0.94))",
        border: isActive
          ? "1px solid rgba(153,69,255,0.5)"
          : "1px solid rgba(80,30,150,0.2)",
        boxShadow: isActive ? "0 0 16px rgba(153,69,255,0.15)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: isActive ? "rgba(153,69,255,0.07)" : "rgba(0,10,30,0.3)",
          borderBottom: "1px solid rgba(153,69,255,0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isActive
                ? "rgba(153,69,255,0.9)"
                : "rgba(255,255,255,0.2)",
              boxShadow: isActive ? "0 0 8px rgba(153,69,255,0.8)" : "none",
              animation: isActive ? "pulse-glow 1.5s infinite" : "none",
            }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.15em] uppercase font-bold"
            style={{ color: "rgba(153,69,255,0.85)" }}
          >
            BASS PRESENCE BOOSTER
          </span>
        </div>
        <div
          className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest"
          style={{
            background: isActive
              ? "rgba(153,69,255,0.1)"
              : "rgba(255,255,255,0.04)",
            border: isActive
              ? "1px solid rgba(153,69,255,0.4)"
              : "1px solid rgba(255,255,255,0.08)",
            color: isActive ? "rgba(153,69,255,0.9)" : "rgba(255,255,255,0.3)",
          }}
        >
          {isActive ? "ACTIVE" : "STANDBY"}
        </div>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2.5">
        {/* ── Sound Quality Class Display ── */}
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-sm"
          data-ocid="bass_booster.quality_class"
          style={{
            background: `${classColor.replace(/[\d.]+\)$/, "0.06)")}`,
            border: `1px solid ${classColor.replace(/[\d.]+\)$/, "0.35)")}`,
            boxShadow:
              qualityClass === "A+"
                ? `0 0 16px ${classColor.replace(/[\d.]+\)$/, "0.2)")}`
                : "none",
          }}
        >
          {/* Big grade badge */}
          <div
            className="shrink-0 w-12 h-12 rounded-sm flex items-center justify-center"
            style={{
              background: `${classColor.replace(/[\d.]+\)$/, "0.1)")}`,
              border: `2px solid ${classColor}`,
              boxShadow: `0 0 12px ${classColor.replace(/[\d.]+\)$/, "0.3)")}`,
            }}
          >
            <span
              className="text-xl font-mono font-black leading-none"
              style={{
                color: classColor,
                textShadow: `0 0 12px ${classColor}`,
              }}
            >
              {qualityClass}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span
              className="text-[10px] font-mono font-black tracking-widest"
              style={{ color: classColor }}
            >
              SOUND QUALITY CLASS
            </span>
            <span
              className="text-[8px] font-mono tracking-wider leading-snug"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {classLabel}
            </span>
            {qualityClass !== "A+" && (
              <span
                className="text-[7px] font-mono tracking-widest mt-0.5"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                {qualityClass === "D+" &&
                  "→ Select presence + boost bass to upgrade"}
                {qualityClass === "C+" && "→ Turn on bass boost to reach B+"}
                {qualityClass === "B+" &&
                  "→ Use DEEP/PUNCHY/SUB + E-Quake > 5 for A+"}
              </span>
            )}
          </div>
        </div>

        {/* Tagline */}
        <p
          className="text-[8px] font-mono tracking-wider"
          style={{ color: "rgba(153,69,255,0.5)" }}
        >
          MAKING BASS FEEL ALIVE AND PHYSICAL — MID BASS EXCURSION 120Hz PUMPING
        </p>

        {/* Boost level bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.6)" }}
            >
              BOOST LEVEL
            </span>
            <span
              className="text-sm font-mono font-black tabular-nums"
              style={{
                color: isActive
                  ? "rgba(153,69,255,0.95)"
                  : "rgba(255,255,255,0.3)",
                textShadow: isActive ? "0 0 10px rgba(153,69,255,0.7)" : "none",
              }}
              data-ocid="bass_booster.boost_level"
            >
              {boostLevel}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${boostLevel}%`,
                background:
                  "linear-gradient(to right, rgba(80,30,200,0.8), rgba(153,69,255,0.95))",
                boxShadow: isActive ? "0 0 8px rgba(153,69,255,0.5)" : "none",
              }}
            />
          </div>
        </div>

        {/* Canvas mini waveform */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            border: "1px solid rgba(153,69,255,0.2)",
            background: "rgba(0,0,20,0.5)",
          }}
        >
          <canvas
            ref={canvasRef}
            width={280}
            height={64}
            className="w-full"
            style={{ display: "block" }}
            aria-label="Bass waveform preview"
          />
        </div>

        {/* Physical feel + Analog tube row */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="flex flex-col gap-1 px-2 py-1.5 rounded-sm"
            style={{
              background: "rgba(153,69,255,0.04)",
              border: "1px solid rgba(153,69,255,0.18)",
            }}
          >
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.6)" }}
            >
              PHYSICAL FEEL
            </span>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${physicalFeel}%`,
                  background:
                    "linear-gradient(to right, rgba(153,69,255,0.7), rgba(220,100,255,0.9))",
                }}
              />
            </div>
            <span
              className="text-[9px] font-mono tabular-nums font-bold text-right"
              style={{ color: "rgba(153,69,255,0.85)" }}
            >
              {physicalFeel}%
            </span>
          </div>

          <div
            className="flex flex-col gap-1 px-2 py-1.5 rounded-sm"
            style={{
              background: "rgba(80,0,150,0.05)",
              border: "1px solid rgba(80,0,150,0.2)",
            }}
          >
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.5)" }}
            >
              ANALOG TUBE 2ND
            </span>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(100, h2Pct)}%`,
                  background:
                    "linear-gradient(to right, rgba(100,0,200,0.7), rgba(180,80,255,0.9))",
                }}
              />
            </div>
            <span
              className="text-[9px] font-mono tabular-nums font-bold text-right"
              style={{ color: "rgba(180,80,255,0.85)" }}
            >
              {(tubeHarmonic2 * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Mid Bass Excursion status */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-sm"
          style={{
            background: isPlaying ? "rgba(255,100,30,0.04)" : "rgba(0,0,0,0)",
            border: isPlaying
              ? "1px solid rgba(255,100,30,0.25)"
              : "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              background: isPlaying
                ? "rgba(255,120,50,0.9)"
                : "rgba(255,255,255,0.2)",
              boxShadow: isPlaying ? "0 0 5px rgba(255,120,50,0.7)" : "none",
              animation: isPlaying ? "pulse-glow 0.7s infinite" : "none",
            }}
          />
          <span
            className="text-[7.5px] font-mono tracking-widest"
            style={{
              color: isPlaying
                ? "rgba(255,120,50,0.8)"
                : "rgba(255,255,255,0.25)",
            }}
          >
            MID BASS EXCURSION — 120Hz LFO 1.5Hz PUMPING ±1.5dB — COMMANDER
            PROTECTED
          </span>
        </div>
      </div>
    </div>
  );
}
