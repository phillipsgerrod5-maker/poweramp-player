import type { StartupStageId } from "@/types/player";
import { useEffect, useRef, useState } from "react";

interface StageConfig {
  id: StartupStageId;
  label: string;
  subLabel: string;
  symbol: string;
  delay: number;
  glowColor: string;
}

// Phase names match exact boot order and requirements spec
const STAGES: StageConfig[] = [
  {
    id: "batteries",
    label: "POWER CHAIN",
    subLabel: "4-GAUGE DIRECT — BACKBONE ONLINE",
    symbol: "⚡",
    delay: 0,
    glowColor: "rgba(0,213,255,0.95)",
  },
  {
    id: "batteries",
    label: "BATTERIES LIVE",
    subLabel: "ENGINE 1 CH2 → BATTERIES — ALWAYS FULL",
    symbol: "🔋",
    delay: 300,
    glowColor: "rgba(255,200,0,0.92)",
  },
  {
    id: "fuses",
    label: "FUSES ARMED",
    subLabel: "CH1 — 80,000W ÷ 30 = 2,667W EACH — ALL LIT",
    symbol: "⊠",
    delay: 600,
    glowColor: "rgba(255,130,0,0.92)",
  },
  {
    id: "amp",
    label: "ENGINE 1 — ONLINE",
    subLabel: "12 CHANNELS × 80,000W — 960,000W TOTAL",
    symbol: "⚙",
    delay: 900,
    glowColor: "rgba(0,180,255,0.95)",
  },
  {
    id: "features",
    label: "AMPS ENGAGED",
    subLabel: "MAIN AMP — VIRTUAL + DIGITAL + ANALOG TUBE — CH3 HIGH AMP",
    symbol: "◈",
    delay: 1200,
    glowColor: "rgba(153,69,255,0.95)",
  },
  {
    id: "settings",
    label: "FEATURES LIVE",
    subLabel: "SRS · XM · PROTECTION · RUBBER CARBON FIBER · SMART CHIPS",
    symbol: "✦",
    delay: 1500,
    glowColor: "rgba(0,213,255,0.9)",
  },
  {
    id: "settings",
    label: "SYSTEM READY",
    subLabel: "GERROD POWERAMP — ALL SYSTEMS 4-GAUGE WIRED",
    symbol: "✓",
    delay: 1800,
    glowColor: "rgba(0,255,120,0.95)",
  },
];

// Total: last stage at 1800ms, then online msg at 2200ms, hold 1500ms, fade at 3700ms, done at 4400ms
const ONLINE_SHOW_DELAY = 2200;
const ONLINE_HOLD_MS = 1500; // hold "POWERAMP PLAYER — SYSTEM ONLINE" for 1.5 seconds
const FADE_DELAY = ONLINE_SHOW_DELAY + ONLINE_HOLD_MS; // 3700
const DONE_DELAY = FADE_DELAY + 700; // 4400

interface StartupSequenceProps {
  onComplete: () => void;
}

export function StartupSequence({ onComplete }: StartupSequenceProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [fading, setFading] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    STAGES.forEach((stage, i) => {
      const t = setTimeout(() => setActiveIndex(i), stage.delay);
      timersRef.current.push(t);
    });

    const onlineT = setTimeout(() => setShowOnline(true), ONLINE_SHOW_DELAY);
    timersRef.current.push(onlineT);

    const fadeT = setTimeout(() => setFading(true), FADE_DELAY);
    timersRef.current.push(fadeT);

    const doneT = setTimeout(onComplete, DONE_DELAY);
    timersRef.current.push(doneT);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [onComplete]);

  const currentStage = activeIndex >= 0 ? STAGES[activeIndex] : null;
  const progress =
    activeIndex >= 0 ? ((activeIndex + 1) / STAGES.length) * 100 : 0;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-700 ${fading ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{
        background:
          "linear-gradient(160deg, #020a1c 0%, #030c28 30%, #050f38 55%, #030b26 80%, #02091a 100%)",
      }}
      aria-label="System starting up"
      aria-live="polite"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,130,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,130,255,0.06) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 48%, rgba(0,60,200,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Branding */}
      <div
        className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-center"
        data-ocid="startup.branding"
      >
        <p
          className="text-[9px] font-mono tracking-[0.45em] uppercase"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,180,255,0.8), rgba(153,69,255,0.8))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 6px rgba(0,150,255,0.4))",
          }}
        >
          gerrod/engeeier/product/desiger
        </p>
      </div>

      {/* Logo */}
      <div className="relative mb-6 text-center z-10">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse-glow"
          style={{
            background: "rgba(0,22,70,0.88)",
            border: "2px solid rgba(0,190,255,0.75)",
            boxShadow:
              "0 0 32px rgba(0,160,255,0.65), 0 0 64px rgba(0,80,220,0.35)",
          }}
        >
          <span
            className="font-display font-black text-3xl"
            style={{
              color: "rgba(0,213,255,1)",
              textShadow: "0 0 24px rgba(0,213,255,0.8)",
            }}
          >
            P
          </span>
        </div>
        <h1
          className="text-2xl font-display font-black tracking-[0.25em] uppercase"
          style={{
            color: "rgba(0,213,255,1)",
            textShadow: "0 0 20px rgba(0,213,255,0.7)",
          }}
        >
          POWERAMP
        </h1>
        <p
          className="text-[10px] font-mono tracking-[0.4em] mt-1 uppercase"
          style={{ color: "rgba(0,150,255,0.55)" }}
        >
          PLAYER SYSTEM · BOOTING
        </p>
      </div>

      {/* Stage nodes — horizontal (desktop) */}
      <div className="relative z-10 w-full max-w-2xl px-4 hidden sm:block">
        <div className="flex items-center gap-0">
          {STAGES.map((stage, i) => {
            const isActive = i <= activeIndex;
            const isCurrent = i === activeIndex;
            return (
              <div
                key={`${stage.id}-${i}`}
                className="flex items-center flex-1"
              >
                <div
                  data-ocid={`startup.stage.${i + 1}`}
                  className={`flex flex-col items-center gap-1 transition-all duration-400 ${isActive ? "opacity-100" : "opacity-20"}`}
                >
                  <div
                    className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-lg transition-all duration-500"
                    style={{
                      borderColor: isCurrent
                        ? stage.glowColor
                        : isActive
                          ? stage.glowColor.replace(/[\d.]+\)$/, "0.5)")
                          : "rgba(0,60,160,0.18)",
                      background: isCurrent
                        ? stage.glowColor.replace(/[\d.]+\)$/, "0.12)")
                        : isActive
                          ? "rgba(0,35,110,0.10)"
                          : "rgba(0,12,45,0.25)",
                      boxShadow: isCurrent
                        ? `0 0 24px ${stage.glowColor}, 0 0 48px ${stage.glowColor.replace(/[\d.]+\)$/, "0.35)")}`
                        : isActive
                          ? `0 0 10px ${stage.glowColor.replace(/[\d.]+\)$/, "0.3)")}`
                          : "none",
                    }}
                  >
                    <span
                      style={{
                        color: isActive
                          ? stage.glowColor
                          : "rgba(0,60,180,0.3)",
                        fontSize: "1.1rem",
                      }}
                    >
                      {stage.symbol}
                    </span>
                  </div>
                  <span
                    className="text-[7px] font-mono tracking-widest uppercase text-center leading-tight max-w-[70px]"
                    style={{
                      color: isActive
                        ? isCurrent
                          ? stage.glowColor
                          : "rgba(255,255,255,0.5)"
                        : "rgba(0,55,150,0.3)",
                      wordBreak: "break-word",
                    }}
                  >
                    {stage.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div
                    className="flex-1 h-[2px] mx-0.5 rounded-full transition-all duration-500"
                    style={{
                      background:
                        i < activeIndex
                          ? `linear-gradient(to right, ${STAGES[i].glowColor.replace(/[\d.]+\)$/, "0.7)")}, ${STAGES[i + 1]?.glowColor?.replace(/[\d.]+\)$/, "0.6)") ?? "rgba(0,213,255,0.4)"})`
                          : "rgba(0,45,150,0.15)",
                      boxShadow:
                        i < activeIndex
                          ? `0 0 6px ${STAGES[i].glowColor.replace(/[\d.]+\)$/, "0.4)")}`
                          : "none",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: vertical list */}
      <div className="flex sm:hidden flex-col gap-1.5 w-full max-w-xs px-4 z-10">
        {STAGES.map((stage, i) => {
          const isActive = i <= activeIndex;
          const isCurrent = i === activeIndex;
          return (
            <div
              key={`${stage.id}-m-${i}`}
              data-ocid={`startup.stage.${i + 1}`}
              className={`flex items-center gap-3 px-3 py-1.5 rounded-sm border transition-all duration-300 ${isActive ? "opacity-100" : "opacity-25"}`}
              style={{
                borderColor: isCurrent
                  ? stage.glowColor
                  : isActive
                    ? stage.glowColor.replace(/[\d.]+\)$/, "0.3)")
                    : "rgba(0,50,160,0.12)",
                background: isCurrent
                  ? stage.glowColor.replace(/[\d.]+\)$/, "0.1)")
                  : "rgba(0,12,45,0.22)",
                boxShadow: isCurrent
                  ? `0 0 12px ${stage.glowColor.replace(/[\d.]+\)$/, "0.2)")}`
                  : "none",
              }}
            >
              <span
                className="text-base w-6 text-center shrink-0"
                style={{
                  color: isActive ? stage.glowColor : "rgba(0,60,160,0.3)",
                }}
              >
                {stage.symbol}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[8px] font-mono tracking-[0.15em] uppercase font-bold leading-none truncate"
                  style={{
                    color: isActive
                      ? "rgba(255,255,255,0.85)"
                      : "rgba(0,60,160,0.3)",
                  }}
                >
                  {stage.label}
                </p>
                <p
                  className="text-[7px] font-mono tracking-wider mt-0.5 truncate"
                  style={{ color: "rgba(0,140,255,0.38)" }}
                >
                  {stage.subLabel}
                </p>
              </div>
              <span
                className="text-[7px] font-mono tracking-widest shrink-0 font-bold"
                style={{
                  color: isActive
                    ? isCurrent
                      ? stage.glowColor
                      : "rgba(0,255,120,0.7)"
                    : "rgba(255,255,255,0.12)",
                }}
              >
                {isActive ? (isCurrent ? "NOW" : "ON") : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current stage callout */}
      {currentStage && !showOnline && (
        <div
          className="mt-5 z-10 text-center px-4"
          key={`detail-${activeIndex}`}
          style={{ animation: "fade-in 0.4s ease-out" }}
        >
          <p
            className="text-sm font-mono font-black tracking-[0.2em] uppercase"
            style={{
              color: currentStage.glowColor,
              textShadow: `0 0 16px ${currentStage.glowColor}, 0 0 32px ${currentStage.glowColor.replace(/[\d.]+\)$/, "0.35)")}`,
            }}
          >
            {currentStage.label}
          </p>
          <p
            className="text-[9px] font-mono tracking-widest mt-0.5 uppercase"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            {currentStage.subLabel}
          </p>
        </div>
      )}

      {/* POWERAMP PLAYER — SYSTEM ONLINE — holds for 1.5 seconds */}
      {showOnline && (
        <div
          className="mt-3 z-10 flex flex-col items-center gap-2"
          style={{ animation: "fade-in 0.5s ease-out" }}
          data-ocid="startup.system_online"
        >
          <div
            className="px-6 py-2.5 rounded-sm"
            style={{
              background: "rgba(0,255,120,0.08)",
              border: "1px solid rgba(0,255,120,0.5)",
              boxShadow: "0 0 24px rgba(0,255,120,0.25)",
            }}
          >
            <span
              className="text-base font-mono tracking-[0.3em] font-black uppercase"
              style={{
                color: "rgba(0,255,120,0.95)",
                textShadow: "0 0 16px rgba(0,255,120,0.8)",
              }}
            >
              ✓ POWERAMP PLAYER — SYSTEM ONLINE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "rgba(0,255,180,0.9)",
                  boxShadow: "0 0 5px rgba(0,255,180,0.7)",
                }}
              />
              <span
                className="text-[8px] font-mono tracking-widest"
                style={{ color: "rgba(0,255,180,0.7)" }}
              >
                BROWSER POWER: ACTIVE
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "rgba(153,69,255,0.9)",
                  boxShadow: "0 0 5px rgba(153,69,255,0.7)",
                }}
              />
              <span
                className="text-[8px] font-mono tracking-widest"
                style={{ color: "rgba(153,69,255,0.7)" }}
              >
                VIRTUAL POWER: ACTIVE
              </span>
            </div>
          </div>
          <span
            className="text-[8px] font-mono tracking-[0.25em]"
            style={{ color: "rgba(255,180,0,0.6)" }}
          >
            ENGINE 1: 12 CH × 80,000 — FUSES: 30 × 2,667 — CH1 POWERED
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-16 left-8 right-8 z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[7px] font-mono tracking-[0.3em] uppercase"
            style={{ color: "rgba(0,150,255,0.45)" }}
          >
            {activeIndex < 0
              ? "INITIALIZING..."
              : activeIndex < STAGES.length - 1
                ? `${STAGES[activeIndex]?.label ?? ""} ONLINE`
                : showOnline
                  ? "ALL SYSTEMS ARMED"
                  : "SYSTEM READY"}
          </span>
          <span
            className="text-[8px] font-mono tabular-nums"
            style={{ color: "rgba(0,213,255,0.6)" }}
          >
            {showOnline ? 100 : Math.round(progress)}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(0,35,120,0.4)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-400"
            style={{
              width: `${showOnline ? 100 : progress}%`,
              background:
                "linear-gradient(90deg, rgba(0,213,255,0.8) 0%, rgba(0,213,255,1) 50%, rgba(153,69,255,0.9) 100%)",
              boxShadow: "0 0 8px rgba(0,213,255,0.5)",
            }}
          />
        </div>
      </div>

      {/* Animated signal wire */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 h-px signal-wire-active"
        style={{ width: "280px" }}
      />
    </div>
  );
}
