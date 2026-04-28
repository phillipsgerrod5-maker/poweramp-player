import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface PowerChainBarProps {
  isPlaying: boolean;
  startupDone: boolean;
  liveSignal: number;
}

interface BootStage {
  id: string;
  label: string;
  abbrev: string;
  description: string;
  doneLabel: string;
  color: "green" | "amber" | "blue";
}

// 10 boot stages in exact order per user spec — 500ms between each
const BOOT_STAGES: BootStage[] = [
  {
    id: "powerchain",
    label: "POWER CHAIN",
    abbrev: "PWR",
    description: "Power chain backbone — 4 gauge direct slot-to-slot",
    doneLabel: "4-GAUGE WIRED",
    color: "blue",
  },
  {
    id: "batteries",
    label: "BATTERIES",
    abbrev: "BATT",
    description: "Virtual batteries — powered by Ch2, self-sustaining loop",
    doneLabel: "LIVE — CH2 POWERED",
    color: "green",
  },
  {
    id: "charger",
    label: "CHARGER",
    abbrev: "CHG",
    description: "Virtual Battery Charger — 15,000×86 always running",
    doneLabel: "15,000×86 ACTIVE",
    color: "amber",
  },
  {
    id: "fuses",
    label: "FUSES",
    abbrev: "FUSE",
    description: "20 × 4,000 fuses — Ch1 powered — 80,000 total",
    doneLabel: "80,000 — ALL LIT",
    color: "amber",
  },
  {
    id: "converter",
    label: "CONVERTER",
    abbrev: "CONV",
    description: "Milliwatt → 80,000,000× signal strength converter",
    doneLabel: "80M SIGNAL STRENGTH",
    color: "blue",
  },
  {
    id: "engine1",
    label: "ENGINE 1",
    abbrev: "ENG1",
    description: "Engine 1 — 12 channels × 80,000 — hidden inside Stabilizer",
    doneLabel: "12 CH — ONLINE",
    color: "blue",
  },
  {
    id: "booster",
    label: "SIG BOOSTER",
    abbrev: "BOOST",
    description: "Signal booster — Engine 1 + Stabilizer hidden inside",
    doneLabel: "BOOSTING",
    color: "green",
  },
  {
    id: "amp",
    label: "MAIN AMP",
    abbrev: "AMP",
    description: "Combined amp — Virtual + Digital + Analog Tube — Ch3 powered",
    doneLabel: "CH3 POWERED",
    color: "blue",
  },
  {
    id: "highamp",
    label: "HIGH AMP",
    abbrev: "HAMP",
    description: "High Amp — browser powered, no bass features",
    doneLabel: "BROWSER POWERED",
    color: "green",
  },
  {
    id: "features",
    label: "ALL FEATURES",
    abbrev: "FEAT",
    description: "SRS, XM, EQ, Protection — all engaged",
    doneLabel: "FULLY ENGAGED",
    color: "green",
  },
];

const STAGE_COLOR: Record<BootStage["color"], string> = {
  green: "rgba(0,255,120,0.85)",
  amber: "rgba(255,180,0,0.85)",
  blue: "rgba(0,213,255,0.85)",
};

const STAGE_BORDER: Record<BootStage["color"], string> = {
  green: "1px solid rgba(0,255,120,0.3)",
  amber: "1px solid rgba(255,180,0,0.4)",
  blue: "1px solid rgba(0,213,255,0.3)",
};

const STAGE_BG: Record<BootStage["color"], string> = {
  green: "rgba(0,255,120,0.07)",
  amber: "rgba(255,180,0,0.07)",
  blue: "rgba(0,213,255,0.06)",
};

function formatSignal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
}

export function PowerChainBar({
  isPlaying,
  startupDone,
  liveSignal,
}: PowerChainBarProps) {
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startupDoneRef = useRef(startupDone);
  startupDoneRef.current = startupDone;

  const runBootSequence = useCallback(() => {
    for (const t of timerRefs.current) clearTimeout(t);
    timerRefs.current = [];
    setCompletedStages([]);
    if (!startupDoneRef.current) return;
    BOOT_STAGES.forEach((stage, i) => {
      const t = setTimeout(
        () => {
          setCompletedStages((prev) =>
            prev.includes(stage.id) ? prev : [...prev, stage.id],
          );
        },
        i * 500 + 200,
      );
      timerRefs.current.push(t);
    });
  }, []);

  useEffect(() => {
    if (startupDone) runBootSequence();
    return () => {
      for (const t of timerRefs.current) clearTimeout(t);
      timerRefs.current = [];
    };
  }, [startupDone, runBootSequence]);

  const handleRestart = () => {
    runBootSequence();
  };

  const allComplete = completedStages.length === BOOT_STAGES.length;

  return (
    <div
      className="mx-4 mb-3 rounded-sm overflow-hidden"
      data-ocid="power_chain.bar"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,6,20,0.97), rgba(0,10,32,0.95))",
        border: allComplete
          ? "1px solid rgba(0,213,255,0.4)"
          : "1px solid rgba(0,80,200,0.18)",
        boxShadow: allComplete ? "0 0 14px rgba(0,150,255,0.1)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{
          background: allComplete
            ? "rgba(0,213,255,0.05)"
            : "rgba(0,15,55,0.3)",
          borderBottom: "1px solid rgba(0,150,255,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: allComplete
                ? "rgba(0,255,120,0.9)"
                : "rgba(255,255,255,0.18)",
              boxShadow: allComplete ? "0 0 6px rgba(0,255,120,0.7)" : "none",
            }}
          />
          <span
            className="text-[9px] font-mono tracking-[0.22em] uppercase font-bold"
            style={{ color: "rgba(0,200,255,0.8)" }}
          >
            POWER CHAIN — 4-GAUGE DIRECT
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Power source indicators */}
          <div className="flex items-center gap-1">
            <div
              className="w-1 h-1 rounded-full"
              style={{
                background: "rgba(0,255,180,0.9)",
                boxShadow: "0 0 4px rgba(0,255,180,0.7)",
              }}
            />
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(0,255,180,0.65)" }}
            >
              BROWSER
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-1 h-1 rounded-full"
              style={{
                background: "rgba(153,69,255,0.9)",
                boxShadow: "0 0 4px rgba(153,69,255,0.7)",
              }}
            />
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(153,69,255,0.65)" }}
            >
              VIRTUAL
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-1 h-1 rounded-full"
              style={{
                background: isPlaying
                  ? "rgba(0,213,255,0.9)"
                  : "rgba(255,255,255,0.18)",
                animation: isPlaying ? "pulse-glow 1.2s infinite" : "none",
              }}
            />
            <span
              className="text-[8px] font-mono tabular-nums font-bold"
              data-ocid="power_chain.signal_strength"
              style={{
                color: isPlaying
                  ? "rgba(0,213,255,0.95)"
                  : "rgba(0,100,200,0.38)",
              }}
            >
              {isPlaying ? formatSignal(liveSignal) : "80M"} SIG
            </span>
          </div>
          {/* Restart button */}
          {startupDone && (
            <button
              type="button"
              data-ocid="power_chain.restart_button"
              onClick={handleRestart}
              aria-label="Replay boot sequence"
              className="w-5 h-5 flex items-center justify-center rounded-sm transition-all duration-150 active:scale-90"
              style={{
                background: "rgba(0,213,255,0.08)",
                border: "1px solid rgba(0,213,255,0.25)",
                color: "rgba(0,213,255,0.7)",
              }}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chain nodes row */}
      <div
        className="px-3 py-2 flex items-center gap-0.5 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {BOOT_STAGES.map((stage, i) => {
          const done = completedStages.includes(stage.id);
          const isCurrent = !done && completedStages.length === i;
          const stageColor = STAGE_COLOR[stage.color];
          const stageBorder = STAGE_BORDER[stage.color];
          const stageBg = STAGE_BG[stage.color];

          return (
            <div
              key={stage.id}
              className="flex items-center gap-0.5 shrink-0"
              data-ocid={`power_chain.stage.${stage.id}`}
            >
              <div
                className="flex items-center gap-1 px-1 py-0.5 rounded-sm transition-all duration-300"
                title={done ? stage.doneLabel : stage.description}
                style={{
                  background: done
                    ? stageBg
                    : isCurrent
                      ? "rgba(0,213,255,0.07)"
                      : "rgba(255,255,255,0.02)",
                  border: done
                    ? stageBorder
                    : isCurrent
                      ? "1px solid rgba(0,213,255,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{
                    background: done
                      ? stageColor
                      : isCurrent
                        ? "rgba(0,213,255,0.8)"
                        : "rgba(255,255,255,0.12)",
                    boxShadow: done
                      ? `0 0 4px ${stageColor}`
                      : isCurrent
                        ? "0 0 4px rgba(0,213,255,0.6)"
                        : "none",
                  }}
                />
                <span
                  className="text-[6px] font-mono tracking-widest"
                  style={{
                    color: done
                      ? stageColor
                      : isCurrent
                        ? "rgba(0,213,255,0.7)"
                        : "rgba(255,255,255,0.18)",
                  }}
                >
                  {stage.abbrev}
                </span>
              </div>

              {i < BOOT_STAGES.length - 1 && (
                <div
                  className="w-1.5 h-px transition-all duration-300 shrink-0"
                  style={{
                    background: done
                      ? `linear-gradient(to right, ${stageColor.replace(/[\d.]+\)$/, "0.5)")}, rgba(0,213,255,0.35))`
                      : "rgba(255,255,255,0.07)",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Fuse total display */}
        <div className="ml-auto shrink-0 flex items-center gap-2 pl-2">
          <div
            className="w-px h-4 self-stretch"
            style={{ background: "rgba(0,213,255,0.14)" }}
          />
          <div className="flex flex-col items-end gap-0.5">
            <span
              className="text-[6px] font-mono tracking-widest"
              style={{ color: "rgba(255,180,0,0.6)" }}
            >
              20 × 4,000
            </span>
            <span
              className="text-[7px] font-mono tracking-widest font-bold"
              style={{
                color: allComplete
                  ? "rgba(0,255,120,0.8)"
                  : "rgba(255,255,255,0.18)",
              }}
            >
              80,000 {allComplete ? "✓" : "…"}
            </span>
          </div>
        </div>
      </div>

      {/* Signal flow bar */}
      <div className="px-3 pb-1.5">
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: "rgba(0,213,255,0.05)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: allComplete
                ? "100%"
                : `${(completedStages.length / BOOT_STAGES.length) * 100}%`,
              background: isPlaying
                ? "linear-gradient(90deg, rgba(0,213,255,0.3) 0%, rgba(0,213,255,0.85) 45%, rgba(153,69,255,0.9) 65%, rgba(0,213,255,0.3) 100%)"
                : "linear-gradient(to right, rgba(0,130,255,0.4), rgba(0,213,255,0.6))",
              backgroundSize: isPlaying ? "200% 100%" : "100% 100%",
              animation: isPlaying ? "signal-flow 1s linear infinite" : "none",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* SYSTEM ONLINE footer — shown only when all stages complete */}
      {allComplete && (
        <div
          className="px-3 py-1.5"
          style={{ borderTop: "1px solid rgba(0,255,120,0.15)" }}
          data-ocid="power_chain.system_online"
        >
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span
              className="text-[7px] font-mono tracking-[0.2em] font-bold uppercase"
              style={{
                color: "rgba(0,255,120,0.85)",
                textShadow: "0 0 6px rgba(0,255,120,0.4)",
              }}
            >
              ✓ SYSTEM ONLINE — 4 GAUGE WIRED — BROWSER+VIRTUAL COMBINED
            </span>
            <span
              className="text-[6px] font-mono tracking-widest"
              style={{ color: "rgba(255,180,0,0.6)" }}
            >
              ENGINE 1: 12 CH × 80,000 — FUSES: 20 × 4,000 — CH1 POWERED
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <div
                className="w-1 h-1 rounded-full"
                style={{
                  background: "rgba(0,255,180,0.9)",
                  boxShadow: "0 0 4px rgba(0,255,180,0.7)",
                }}
              />
              <span
                className="text-[6px] font-mono tracking-widest"
                style={{ color: "rgba(0,255,180,0.7)" }}
              >
                BROWSER POWER: ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-1 h-1 rounded-full"
                style={{
                  background: "rgba(153,69,255,0.9)",
                  boxShadow: "0 0 4px rgba(153,69,255,0.7)",
                }}
              />
              <span
                className="text-[6px] font-mono tracking-widest"
                style={{ color: "rgba(153,69,255,0.7)" }}
              >
                VIRTUAL POWER: ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-1 h-1 rounded-full"
                style={{
                  background: "rgba(0,213,255,0.9)",
                  boxShadow: "0 0 4px rgba(0,213,255,0.7)",
                }}
              />
              <span
                className="text-[6px] font-mono tracking-widest"
                style={{ color: "rgba(0,213,255,0.7)" }}
              >
                COMBINED
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
