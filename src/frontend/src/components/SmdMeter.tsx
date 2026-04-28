import { getSharedAnalyser } from "@/hooks/usePlayer";
import { useEffect, useRef, useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SmdMeterProps {
  isPlaying: boolean;
  volume: number; // display 1–700
  ohmsProfile?: number; // from analyzer profile, default 8
}

// ─── Live meter readings ──────────────────────────────────────────────────────

interface MeterReadings {
  ohms: number;
  watts: number;
  inputLevel: number; // 0–100
  outputLevel: number; // 0–100
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmdMeter({
  isPlaying,
  volume,
  ohmsProfile = 8,
}: SmdMeterProps) {
  const [readings, setReadings] = useState<MeterReadings>({
    ohms: 0,
    watts: 0,
    inputLevel: 0,
    outputLevel: 0,
  });
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    const loop = () => {
      const analyser = getSharedAnalyser();
      if (analyser && isPlaying) {
        const bin = analyser.frequencyBinCount;
        if (!dataRef.current || dataRef.current.length !== bin) {
          dataRef.current = new Uint8Array(bin) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(dataRef.current);

        let sum = 0;
        let peakBin = 0;
        for (let i = 0; i < bin; i++) {
          const v = dataRef.current[i] ?? 0;
          sum += v;
          if (v > peakBin) peakBin = v;
        }
        const avg = sum / bin / 255; // 0–1
        const peak = peakBin / 255; // 0–1

        // Volume 1–700 → normalized 0–1
        const volNorm = (volume - 1) / 699;

        // P = V²/R — scale to 12kW max
        const measuredWatts = Math.round(avg * volNorm * 12000);

        // Ohms: profile ± variation from signal energy
        const measuredOhms = +(ohmsProfile + (1 - avg) * 1.5).toFixed(1);

        // Input: raw signal average 0–100
        const inputLevel = Math.round(avg * 100);
        // Output: peak-weighted after amp gain (0.85 master)
        const outputLevel = Math.round(Math.min(100, peak * volNorm * 100));

        setReadings({
          ohms: measuredOhms,
          watts: measuredWatts,
          inputLevel,
          outputLevel,
        });
      } else {
        setReadings({ ohms: 0, watts: 0, inputLevel: 0, outputLevel: 0 });
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, volume, ohmsProfile]);

  const wattsBarPct = Math.min(100, (readings.watts / 12000) * 100);
  const isHot = readings.watts > 9000;

  return (
    <div
      className="mx-4 mb-3 rounded-sm"
      data-ocid="smd_meter.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,6,18,0.97), rgba(0,10,28,0.95))",
        border: "1px solid rgba(0,213,255,0.4)",
        boxShadow:
          "0 0 18px rgba(0,213,255,0.12), inset 0 0 12px rgba(0,0,40,0.5)",
        overflow: "visible",
        position: "relative",
        zIndex: 5,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,213,255,0.06)",
          borderBottom: "1px solid rgba(0,213,255,0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: isPlaying
                ? "rgba(0,255,120,0.9)"
                : "rgba(0,213,255,0.4)",
              boxShadow: isPlaying ? "0 0 6px rgba(0,255,120,0.7)" : "none",
              animation: isPlaying ? "pulse-glow 1.2s infinite" : "none",
            }}
          />
          <span
            className="text-[9px] font-mono tracking-[0.3em] uppercase font-bold"
            style={{ color: "rgba(0,213,255,0.85)" }}
          >
            SMD AMM-1
          </span>
        </div>
        <span
          className="text-[8px] font-mono tracking-widest"
          style={{ color: "rgba(0,150,255,0.5)" }}
        >
          LIVE DIAGNOSTIC METER
        </span>
      </div>

      {/* 2×2 grid of readouts */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {/* OHMS */}
        <ReadoutCell
          label="IMPEDANCE"
          unit="OHMS"
          value={isPlaying ? readings.ohms.toFixed(1) : "0.0"}
          sub={`REF ${ohmsProfile}Ω`}
          ledColor="rgba(0,213,255,0.9)"
          valueColor="rgba(0,213,255,0.95)"
          active={isPlaying}
          dataOcid="smd_meter.ohms"
        />

        {/* WATTS */}
        <ReadoutCell
          label="POWER OUT"
          unit="WATTS"
          value={isPlaying ? readings.watts.toLocaleString() : "0"}
          sub="MAX 12,000W"
          ledColor={isHot ? "rgba(255,80,0,0.9)" : "rgba(153,69,255,0.9)"}
          valueColor={isHot ? "rgba(255,100,0,0.95)" : "rgba(153,69,255,0.95)"}
          active={isPlaying}
          dataOcid="smd_meter.watts"
        />

        {/* INPUT */}
        <ReadoutCell
          label="INPUT SIG"
          unit="INPUT %"
          value={isPlaying ? `${readings.inputLevel}` : "0"}
          sub="RAW SIGNAL"
          ledColor="rgba(0,255,180,0.9)"
          valueColor="rgba(0,255,180,0.95)"
          active={isPlaying}
          dataOcid="smd_meter.input"
          isPercent
          barPct={readings.inputLevel}
        />

        {/* OUTPUT */}
        <ReadoutCell
          label="OUTPUT SIG"
          unit="OUTPUT %"
          value={isPlaying ? `${readings.outputLevel}` : "0"}
          sub="AMP OUT"
          ledColor="rgba(255,180,0,0.9)"
          valueColor="rgba(255,180,0,0.95)"
          active={isPlaying}
          dataOcid="smd_meter.output"
          isPercent
          barPct={readings.outputLevel}
        />
      </div>

      {/* Power bar */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(0,150,255,0.4)" }}
          >
            CHAIN OUTPUT
          </span>
          <span
            className="text-[7px] font-mono tabular-nums"
            style={{
              color: isHot ? "rgba(255,80,0,0.7)" : "rgba(0,213,255,0.5)",
            }}
          >
            {isPlaying ? `${wattsBarPct.toFixed(1)}%` : "0.0%"}
          </span>
        </div>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(0,213,255,0.07)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: isPlaying ? `${wattsBarPct}%` : "0%",
              background: isHot
                ? "linear-gradient(to right, rgba(255,80,0,0.8), rgba(255,30,0,0.95))"
                : "linear-gradient(to right, rgba(0,213,255,0.8), rgba(153,69,255,0.9))",
              boxShadow:
                isPlaying && readings.watts > 6000
                  ? "0 0 8px rgba(153,69,255,0.5)"
                  : "none",
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span
            className="text-[6px] font-mono"
            style={{ color: "rgba(0,100,200,0.3)" }}
          >
            0W
          </span>
          <span
            className="text-[6px] font-mono"
            style={{ color: "rgba(0,100,200,0.3)" }}
          >
            12,000W
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Readout Cell ─────────────────────────────────────────────────────────────

interface ReadoutCellProps {
  label: string;
  unit: string;
  value: string;
  sub: string;
  ledColor: string;
  valueColor: string;
  active: boolean;
  dataOcid: string;
  isPercent?: boolean;
  barPct?: number;
}

function ReadoutCell({
  label,
  unit,
  value,
  sub,
  ledColor,
  valueColor,
  active,
  dataOcid,
  isPercent,
  barPct = 0,
}: ReadoutCellProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-2.5 px-2 rounded-sm"
      style={{
        background: active
          ? ledColor.replace(/[\d.]+\)$/, "0.05)")
          : "rgba(0,15,50,0.3)",
        border: `1px solid ${active ? ledColor.replace(/[\d.]+\)$/, "0.2)") : "rgba(0,60,160,0.15)"}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-1.5 h-1.5 rounded-sm shrink-0"
          style={{
            background: active ? ledColor : "rgba(255,255,255,0.1)",
            boxShadow: active ? `0 0 5px ${ledColor}` : "none",
          }}
        />
        <span
          className="text-[7px] font-mono tracking-widest uppercase"
          style={{
            color: active
              ? ledColor.replace(/[\d.]+\)$/, "0.55)")
              : "rgba(0,80,180,0.3)",
          }}
        >
          {label}
        </span>
      </div>

      <p
        className="font-mono font-black tabular-nums leading-none"
        data-ocid={dataOcid}
        style={{
          fontSize: "1.35rem",
          color: active ? valueColor : "rgba(0,80,180,0.3)",
          textShadow: active
            ? `0 0 14px ${valueColor.replace(/[\d.]+\)$/, "0.5)")}`
            : "none",
        }}
      >
        {value}
        {isPercent && (
          <span style={{ fontSize: "0.65em", marginLeft: "2px", opacity: 0.7 }}>
            %
          </span>
        )}
      </p>

      <p
        className="text-[7px] font-mono tracking-[0.3em] mt-1 uppercase"
        style={{
          color: active
            ? ledColor.replace(/[\d.]+\)$/, "0.45)")
            : "rgba(0,60,160,0.2)",
        }}
      >
        {unit}
      </p>

      {isPercent && (
        <div
          className="w-full mt-1.5 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(0,40,120,0.4)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${barPct}%`,
              background: ledColor.replace(/[\d.]+\)$/, "0.75)"),
            }}
          />
        </div>
      )}

      <p
        className="text-[6px] font-mono tracking-widest mt-0.5"
        style={{ color: "rgba(0,80,160,0.3)" }}
      >
        {sub}
      </p>
    </div>
  );
}
