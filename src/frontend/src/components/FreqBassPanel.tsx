import type { UseCheaterBeaterReturn } from "@/hooks/useFrequencyOutput";
import { getSharedAnalyser } from "@/hooks/usePlayer";
import { useEffect, useRef, useState } from "react";

// ─── Note frequency table (equal temperament, A4=440Hz) ──────────────────────

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

function freqToNote(freq: number): string {
  if (freq <= 0) return "—";
  const semitone = Math.round(12 * Math.log2(freq / 440)) + 69;
  const octave = Math.floor(semitone / 12) - 1;
  const noteIdx = ((semitone % 12) + 12) % 12;
  return `${NOTE_NAMES[noteIdx] ?? "?"}${octave}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FreqBassPanelProps {
  isPlaying: boolean;
  cheaterBeater?: UseCheaterBeaterReturn;
  /** Explicit toggle handlers for mutual exclusivity */
  toggleCheaterBeater?: (on: boolean) => void;
  toggle14to60?: (on: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FreqBassPanel({
  isPlaying,
  cheaterBeater,
  toggleCheaterBeater,
  toggle14to60,
}: FreqBassPanelProps) {
  const [dominantFreq, setDominantFreq] = useState(0);
  const [amplitude, setAmplitude] = useState(0);
  const [isDialingBack, setIsDialingBack] = useState(false);
  const [cleanCeiling, setCleanCeiling] = useState(0.85);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const maxAmpRef = useRef(0);

  const cheaterStatus = cheaterBeater?.status ?? "OFF";
  const cheaterGainDb = cheaterBeater?.foundationGainDb ?? 0;
  const cheaterEnergy = cheaterBeater?.bassEnergy ?? 0;
  const cheaterSwitchOn = cheaterBeater?.switchOn ?? false;
  const toggleCheaterSwitch = cheaterBeater?.toggleSwitch;

  useEffect(() => {
    const DISTORTION_THRESHOLD = 0.85;
    const DIAL_BACK_RATE = 0.98;

    const loop = () => {
      const analyser = getSharedAnalyser();

      if (analyser && isPlaying) {
        const bin = analyser.frequencyBinCount;
        if (!dataRef.current || dataRef.current.length !== bin) {
          dataRef.current = new Uint8Array(bin) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(dataRef.current);

        const sampleRate = 48000;
        const binHz = sampleRate / analyser.fftSize;
        const maxBin = Math.floor(200 / binHz);
        const minBin = Math.floor(10 / binHz);

        let peakBin = minBin;
        let peakVal = 0;
        for (let i = minBin; i <= maxBin; i++) {
          const v = dataRef.current[i] ?? 0;
          if (v > peakVal) {
            peakVal = v;
            peakBin = i;
          }
        }
        const freq = peakBin * binHz;
        const amp = peakVal / 255;

        if (amp > maxAmpRef.current) maxAmpRef.current = amp;
        const dialing = amp > DISTORTION_THRESHOLD;
        const ceiling = dialing
          ? maxAmpRef.current * DIAL_BACK_RATE
          : cleanCeiling;
        if (dialing) maxAmpRef.current = ceiling;

        setDominantFreq(Math.round(freq));
        setAmplitude(amp);
        setIsDialingBack(dialing);
        setCleanCeiling(Math.min(1, Math.max(0.6, ceiling)));
      } else {
        setDominantFreq(0);
        setAmplitude(0);
        setIsDialingBack(false);
        maxAmpRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, cleanCeiling]);

  const noteName = freqToNote(dominantFreq);
  const ampPct = Math.round(amplitude * 100);
  const ceilingPct = Math.round(cleanCeiling * 100);
  const cheaterEnergyPct = Math.round(cheaterEnergy * 100);

  const cheaterColor = cheaterSwitchOn
    ? cheaterStatus === "ACTIVE"
      ? "rgba(0,255,120,0.95)"
      : "rgba(255,200,0,0.9)"
    : "rgba(255,255,255,0.25)";

  const standardBassActive = !cheaterSwitchOn;

  return (
    <div
      className="rounded-sm overflow-hidden"
      data-ocid="freq_bass.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,5,25,0.96), rgba(0,8,35,0.94))",
        border: isPlaying
          ? "1px solid rgba(0,213,255,0.35)"
          : "1px solid rgba(0,80,180,0.2)",
        boxShadow: isPlaying ? "0 0 14px rgba(0,150,255,0.1)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: isPlaying ? "rgba(0,213,255,0.06)" : "rgba(0,20,60,0.3)",
          borderBottom: "1px solid rgba(0,150,255,0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isPlaying
                ? "rgba(0,213,255,0.9)"
                : "rgba(255,255,255,0.2)",
              boxShadow: isPlaying ? "0 0 8px rgba(0,213,255,0.8)" : "none",
              animation: isPlaying ? "pulse-glow 1.5s infinite" : "none",
            }}
          />
          <span
            className="text-[9px] font-mono tracking-[0.15em] uppercase font-bold"
            style={{ color: "rgba(0,180,255,0.85)" }}
          >
            FREQ BASS SWITCHER + GENERATOR
          </span>
        </div>
        <div
          className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest"
          style={{
            background: isPlaying
              ? "rgba(0,213,255,0.06)"
              : "rgba(255,255,255,0.03)",
            border: isPlaying
              ? "1px solid rgba(0,213,255,0.3)"
              : "1px solid rgba(255,255,255,0.08)",
            color: isPlaying ? "rgba(0,213,255,0.9)" : "rgba(255,255,255,0.3)",
          }}
        >
          {isPlaying ? "GENERATING" : "SENSING"}
        </div>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        {/* ── MUTUAL EXCLUSIVITY MODE SELECTOR ── */}
        <div
          className="rounded-sm overflow-hidden"
          style={{
            background: "rgba(0,5,20,0.5)",
            border: "1px solid rgba(0,130,255,0.25)",
          }}
        >
          <div
            className="px-3 py-1.5"
            style={{ borderBottom: "1px solid rgba(0,80,180,0.2)" }}
          >
            <p
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(0,180,255,0.7)" }}
            >
              BASS MODE — SELECT ONE
            </p>
            <p
              className="text-[6.5px] font-mono tracking-widest mt-0.5"
              style={{ color: "rgba(255,100,100,0.5)" }}
            >
              MUTUAL EXCLUSIVITY ENFORCED — NEVER BOTH AT ONCE
            </p>
          </div>
          <div className="flex gap-0 p-2">
            {/* 14-60Hz MODE button */}
            <button
              type="button"
              data-ocid="freq_bass.mode_14to60"
              onClick={() => {
                toggle14to60?.(true);
                cheaterBeater?.switchOn && cheaterBeater?.toggleSwitch?.();
              }}
              className="flex-1 py-2.5 rounded-sm mr-1 flex flex-col items-center gap-1 transition-all duration-200 active:scale-95"
              style={{
                background: !cheaterSwitchOn
                  ? "rgba(0,213,255,0.14)"
                  : "rgba(255,255,255,0.04)",
                border: !cheaterSwitchOn
                  ? "2px solid rgba(0,213,255,0.7)"
                  : "1px solid rgba(255,255,255,0.12)",
                boxShadow: !cheaterSwitchOn
                  ? "0 0 12px rgba(0,213,255,0.25)"
                  : "none",
              }}
              aria-pressed={!cheaterSwitchOn}
            >
              <span
                className="text-[10px] font-mono font-black tracking-widest"
                style={{
                  color: !cheaterSwitchOn
                    ? "rgba(0,213,255,0.98)"
                    : "rgba(255,255,255,0.3)",
                  textShadow: !cheaterSwitchOn
                    ? "0 0 8px rgba(0,213,255,0.6)"
                    : "none",
                }}
              >
                14-60Hz MODE
              </span>
              <span
                className="text-[7px] font-mono tracking-widest"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                SUB DEEP + NATURAL BOTTOM
              </span>
              {!cheaterSwitchOn && (
                <span
                  className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: "rgba(0,213,255,0.1)",
                    border: "1px solid rgba(0,213,255,0.4)",
                    color: "rgba(0,213,255,0.9)",
                  }}
                >
                  ACTIVE
                </span>
              )}
            </button>

            {/* 33Hz CLOUD CITY button */}
            <button
              type="button"
              data-ocid="freq_bass.mode_33hz"
              onClick={() => {
                toggleCheaterBeater?.(true);
                if (!cheaterSwitchOn) cheaterBeater?.toggleSwitch?.();
              }}
              className="flex-1 py-2.5 rounded-sm flex flex-col items-center gap-1 transition-all duration-200 active:scale-95"
              style={{
                background: cheaterSwitchOn
                  ? "rgba(0,255,120,0.12)"
                  : "rgba(255,255,255,0.04)",
                border: cheaterSwitchOn
                  ? "2px solid rgba(0,255,120,0.6)"
                  : "1px solid rgba(255,255,255,0.12)",
                boxShadow: cheaterSwitchOn
                  ? "0 0 12px rgba(0,255,120,0.2)"
                  : "none",
              }}
              aria-pressed={cheaterSwitchOn}
            >
              <span
                className="text-[10px] font-mono font-black tracking-widest"
                style={{
                  color: cheaterSwitchOn
                    ? "rgba(0,255,120,0.98)"
                    : "rgba(255,255,255,0.3)",
                  textShadow: cheaterSwitchOn
                    ? "0 0 8px rgba(0,255,120,0.6)"
                    : "none",
                }}
              >
                33Hz SUB
              </span>
              <span
                className="text-[7px] font-mono tracking-widest"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                CLOUD CITY FOUNDATION
              </span>
              {cheaterSwitchOn && (
                <span
                  className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-sm"
                  style={{
                    background: "rgba(0,255,120,0.1)",
                    border: "1px solid rgba(0,255,120,0.4)",
                    color: "rgba(0,255,120,0.9)",
                  }}
                >
                  ACTIVE
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Dominant bass note display */}
        <div
          className="flex items-center justify-between px-3 py-2 rounded-sm"
          style={{
            background: "rgba(0,213,255,0.04)",
            border: "1px solid rgba(0,213,255,0.18)",
          }}
        >
          <div>
            <p
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(0,150,255,0.5)" }}
            >
              LOCKED ON
            </p>
            <p
              className="text-2xl font-mono font-black tabular-nums leading-tight"
              data-ocid="freq_bass.locked_freq"
              style={{
                color: isPlaying
                  ? "rgba(0,213,255,0.98)"
                  : "rgba(0,100,200,0.4)",
                textShadow: isPlaying
                  ? "0 0 12px rgba(0,213,255,0.7), 0 0 24px rgba(0,150,255,0.4)"
                  : "none",
              }}
            >
              {isPlaying && dominantFreq > 0 ? `${dominantFreq} Hz` : "—"}
            </p>
            <p
              className="text-[8px] font-mono tracking-widest mt-0.5"
              style={{ color: "rgba(0,150,255,0.45)" }}
            >
              SMART FILTER SENSOR ACTIVE
            </p>
          </div>

          <div className="text-right">
            <p
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(0,150,255,0.5)" }}
            >
              MUSIC NOTE
            </p>
            <p
              className="text-xl font-mono font-black tracking-widest"
              data-ocid="freq_bass.note_name"
              style={{
                color: isPlaying
                  ? "rgba(153,69,255,0.9)"
                  : "rgba(80,30,150,0.4)",
                textShadow: isPlaying
                  ? "0 0 10px rgba(153,69,255,0.6)"
                  : "none",
              }}
            >
              {isPlaying ? noteName : "—"}
            </p>
            <p
              className="text-[7px] font-mono tracking-widest mt-0.5"
              style={{ color: "rgba(153,69,255,0.4)" }}
            >
              EQUAL TEMPERAMENT
            </p>
          </div>
        </div>

        {/* ── CHEATER BEATER — Manual ON/OFF Switch ── */}
        <div
          className="rounded-sm overflow-hidden"
          data-ocid="freq_bass.cheater_beater"
          style={{
            background: cheaterSwitchOn
              ? cheaterStatus === "ACTIVE"
                ? "rgba(0,255,120,0.05)"
                : "rgba(255,200,0,0.04)"
              : "rgba(0,5,20,0.4)",
            border: `1px solid ${
              cheaterSwitchOn
                ? cheaterStatus === "ACTIVE"
                  ? "rgba(0,255,120,0.4)"
                  : "rgba(255,200,0,0.35)"
                : "rgba(0,60,150,0.25)"
            }`,
          }}
        >
          {/* Cheater Beater header row with ON/OFF toggle */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              borderBottom: cheaterSwitchOn
                ? "1px solid rgba(0,255,120,0.15)"
                : "1px solid rgba(0,60,150,0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: cheaterColor,
                  boxShadow: cheaterSwitchOn
                    ? `0 0 6px ${cheaterColor}`
                    : "none",
                  animation:
                    cheaterSwitchOn && cheaterStatus === "ACTIVE"
                      ? "pulse-glow 1.2s infinite"
                      : "none",
                }}
              />
              <div>
                <span
                  className="text-[9px] font-mono tracking-[0.15em] uppercase font-bold block"
                  style={{ color: cheaterColor }}
                >
                  CHEATER BEATER
                </span>
                <span
                  className="text-[7px] font-mono tracking-widest"
                  style={{ color: "rgba(0,180,120,0.4)" }}
                >
                  33Hz CLOUD CITY SUB FOUNDATION
                </span>
              </div>
            </div>

            {/* ON/OFF Toggle switch */}
            <button
              type="button"
              data-ocid="freq_bass.cheater_switch"
              onClick={toggleCheaterSwitch}
              aria-pressed={cheaterSwitchOn}
              aria-label={
                cheaterSwitchOn
                  ? "Cheater Beater ON — tap to turn off"
                  : "Cheater Beater OFF — tap to turn on"
              }
              className="flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all duration-200 active:scale-95"
              style={{
                background: cheaterSwitchOn
                  ? "rgba(0,255,120,0.12)"
                  : "rgba(255,255,255,0.04)",
                border: cheaterSwitchOn
                  ? "1px solid rgba(0,255,120,0.5)"
                  : "1px solid rgba(255,255,255,0.15)",
                boxShadow: cheaterSwitchOn
                  ? "0 0 12px rgba(0,255,120,0.2)"
                  : "none",
              }}
            >
              {/* Toggle pill */}
              <div
                className="relative w-8 h-4 rounded-full transition-colors duration-200"
                style={{
                  background: cheaterSwitchOn
                    ? "rgba(0,255,120,0.5)"
                    : "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200"
                  style={{
                    left: cheaterSwitchOn ? "calc(100% - 14px)" : "2px",
                    background: cheaterSwitchOn
                      ? "rgba(0,255,120,0.95)"
                      : "rgba(255,255,255,0.4)",
                    boxShadow: cheaterSwitchOn
                      ? "0 0 6px rgba(0,255,120,0.8)"
                      : "none",
                  }}
                />
              </div>
              <span
                className="text-[9px] font-mono font-black tracking-widest"
                style={{
                  color: cheaterSwitchOn
                    ? "rgba(0,255,120,0.95)"
                    : "rgba(255,255,255,0.35)",
                }}
              >
                {cheaterSwitchOn ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          {/* Active bass mode indicator */}
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: cheaterSwitchOn
                    ? "rgba(0,255,120,0.9)"
                    : "rgba(0,213,255,0.9)",
                  boxShadow: cheaterSwitchOn
                    ? "0 0 5px rgba(0,255,120,0.8)"
                    : "0 0 5px rgba(0,213,255,0.8)",
                }}
              />
              <span
                className="text-[9px] font-mono font-bold tracking-widest"
                data-ocid="freq_bass.active_mode"
                style={{
                  color: cheaterSwitchOn
                    ? "rgba(0,255,120,0.9)"
                    : "rgba(0,213,255,0.9)",
                }}
              >
                {cheaterSwitchOn ? "33Hz ACTIVE" : "14-60Hz ACTIVE"}
              </span>
            </div>

            {cheaterSwitchOn && cheaterStatus === "ACTIVE" && (
              <span
                className="text-[8px] font-mono tabular-nums font-bold"
                style={{ color: "rgba(0,255,120,0.9)" }}
              >
                +{cheaterGainDb.toFixed(1)}dB
              </span>
            )}
          </div>

          {/* Energy bar — only visible when switch is on */}
          {cheaterSwitchOn && (
            <div className="px-3 pb-2 flex items-center gap-2">
              <span
                className="text-[7px] font-mono tracking-widest shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                BASS ENERGY
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${cheaterEnergyPct}%`,
                    background:
                      cheaterStatus === "ACTIVE"
                        ? "linear-gradient(to right, rgba(0,200,100,0.7), rgba(0,255,120,0.9))"
                        : "linear-gradient(to right, rgba(255,200,0,0.5), rgba(255,220,0,0.7))",
                  }}
                />
              </div>
              <span
                className="text-[7px] font-mono tabular-nums shrink-0"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {cheaterEnergyPct}%
              </span>
            </div>
          )}

          {/* Mutual exclusivity notice */}
          <div className="px-3 pb-2">
            <p
              className="text-[6.5px] font-mono tracking-widest"
              style={{
                color: cheaterSwitchOn
                  ? "rgba(0,255,120,0.35)"
                  : "rgba(0,120,200,0.35)",
              }}
            >
              {cheaterSwitchOn
                ? "33Hz CLOUD CITY FOUNDATION ACTIVE · 14-60Hz BYPASSED · AUTO-DETECT"
                : "14-60Hz RESONATED ACTIVE · 33Hz BYPASSED · SWITCH ON TO ACTIVATE CLOUD CITY"}
            </p>
          </div>
        </div>

        {/* Standard bass active indicator */}
        {standardBassActive && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm"
            style={{
              background: "rgba(0,213,255,0.04)",
              border: "1px solid rgba(0,213,255,0.2)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: "rgba(0,213,255,0.85)",
                boxShadow: "0 0 4px rgba(0,213,255,0.7)",
              }}
            />
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(0,180,255,0.7)" }}
            >
              14-60Hz — 14Hz DEEP SUB CHARACTER ACTIVE · NATURAL BOTTOM 45Hz
              ALWAYS ON
            </span>
          </div>
        )}

        {/* Amplitude + distortion gate */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="flex flex-col gap-1 px-2 py-1.5 rounded-sm"
            style={{
              background: "rgba(0,213,255,0.03)",
              border: "1px solid rgba(0,213,255,0.15)",
            }}
          >
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(0,150,255,0.55)" }}
            >
              AMPLITUDE
            </span>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${ampPct}%`,
                  background: isDialingBack
                    ? "linear-gradient(to right, rgba(255,140,0,0.7), rgba(255,60,60,0.9))"
                    : "linear-gradient(to right, rgba(0,150,255,0.7), rgba(0,213,255,0.9))",
                  boxShadow: isDialingBack
                    ? "0 0 6px rgba(255,100,0,0.5)"
                    : "none",
                }}
              />
            </div>
            <span
              className="text-[9px] font-mono tabular-nums font-bold text-right"
              style={{
                color: isDialingBack
                  ? "rgba(255,140,0,0.9)"
                  : "rgba(0,213,255,0.85)",
              }}
            >
              {ampPct}%
            </span>
          </div>

          <div
            className="flex flex-col gap-1 px-2 py-1.5 rounded-sm"
            style={{
              background: isDialingBack
                ? "rgba(255,80,0,0.05)"
                : "rgba(0,255,120,0.03)",
              border: isDialingBack
                ? "1px solid rgba(255,80,0,0.35)"
                : "1px solid rgba(0,255,120,0.18)",
            }}
          >
            <span
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              GATE STATUS
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: isDialingBack
                    ? "rgba(255,80,0,0.9)"
                    : "rgba(0,255,120,0.9)",
                  boxShadow: isDialingBack
                    ? "0 0 6px rgba(255,80,0,0.7)"
                    : "0 0 6px rgba(0,255,120,0.7)",
                  animation: isDialingBack
                    ? "pulse-glow 0.8s infinite"
                    : "none",
                }}
              />
              <span
                className="text-[9px] font-mono font-bold tracking-widest"
                data-ocid="freq_bass.gate_status"
                style={{
                  color: isDialingBack
                    ? "rgba(255,100,0,0.9)"
                    : "rgba(0,255,120,0.9)",
                }}
              >
                {isDialingBack ? "DIALING BACK" : "CLEAN"}
              </span>
            </div>
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              CEILING: {ceilingPct}%
            </span>
          </div>
        </div>

        <p
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(0,100,200,0.4)" }}
        >
          SMART SENSOR — DETECTS EXISTING FREQ · NEVER FORCES · DIALS BACK AT
          DISTORTION
        </p>
      </div>
    </div>
  );
}
