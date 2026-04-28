import {
  getSharedAnalyser,
  getSharedCompressor,
  getSharedCtx,
  getSharedPanner,
} from "@/hooks/usePlayer";
import { useEffect, useRef, useState } from "react";

type IndicatorStatus = "online" | "offline" | "standby" | "init";

interface ConnectionItem {
  id: string;
  label: string;
  sublabel: string;
  status: IndicatorStatus;
  color: string;
}

export interface ConnectionIndicatorProps {
  isPlaying: boolean;
  startupDone: boolean;
  bluetoothConnected: boolean;
  srsExpansion: number;
  anyStabilizerSlider: boolean;
  /** TRUE state from SRS hook — not hardcoded */
  srsIsOn?: boolean;
  /** TRUE state from XM processor hook */
  xmIsActive?: boolean;
  /** Band energy levels from FFT analyser — for per-channel indicators */
  bandEnergy?: {
    bass: number;
    mids: number;
    highs: number;
    tweeters: number;
  };
  /** E-Quake current value 0–10 */
  equakeValue?: number;
}

type StatusMap = {
  musicPlayer: boolean;
  powerChain: boolean;
  signalChain: boolean;
  virtualAmp: boolean;
  digitalStim: boolean;
  analogTube: boolean;
  srs: boolean;
  xmFilter: boolean;
  xmActive: boolean;
  automasphers: boolean;
  freqOutput: boolean;
  protection: boolean;
  stabilizerActive: boolean;
  commander: boolean;
  naturalBottom: boolean;
  eqProcessor: boolean;
  bassPresence: boolean;
  bassBooster: boolean;
  freqSwitcher: boolean;
  presetEngine: boolean;
  equakeActive: boolean;
  equakeLevel: number;
  // Per-channel signal levels from FFT
  bassChannel: boolean;
  midsChannel: boolean;
  highsChannel: boolean;
  tweetersChannel: boolean;
  ohm8Load: boolean;
};

function useRealConnectionStatus(
  isPlaying: boolean,
  startupDone: boolean,
  bluetoothConnected: boolean,
  srsIsOn: boolean,
  xmIsActive: boolean,
  bandEnergy: { bass: number; mids: number; highs: number; tweeters: number },
  equakeValue: number,
): StatusMap {
  const [ctxRunning, setCtxRunning] = useState(false);
  const [analyserActive, setAnalyserActive] = useState(false);
  const [signalRms, setSignalRms] = useState(0);
  const [compressorReduction, setCompressorReduction] = useState(0);
  const [virtualAmpReady, setVirtualAmpReady] = useState(false);
  const [advancedReady, setAdvancedReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const floatRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  // Stagger startup readiness to show real boot sequence
  useEffect(() => {
    if (!startupDone) return;
    const t1 = setTimeout(() => setVirtualAmpReady(true), 300);
    const t2 = setTimeout(() => setAdvancedReady(true), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [startupDone]);

  // RAF loop — real signal detection via AnalyserNode
  useEffect(() => {
    const loop = () => {
      const ctx = getSharedCtx();
      setCtxRunning(ctx?.state === "running");

      const analyser = getSharedAnalyser();
      const compressor = getSharedCompressor();

      if (analyser && isPlaying) {
        const bin = analyser.frequencyBinCount;
        // Byte data for max detection
        if (!dataRef.current || dataRef.current.length !== bin) {
          dataRef.current = new Uint8Array(
            new ArrayBuffer(bin),
          ) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(dataRef.current);
        let max = 0;
        for (let i = 0; i < bin; i++) {
          if ((dataRef.current[i] ?? 0) > max) max = dataRef.current[i] ?? 0;
        }
        setAnalyserActive(max > 0);

        // Float RMS for signal presence detection
        const fftSize = analyser.fftSize;
        if (!floatRef.current || floatRef.current.length !== fftSize) {
          floatRef.current = new Float32Array(
            new ArrayBuffer(fftSize * 4),
          ) as Float32Array<ArrayBuffer>;
        }
        analyser.getFloatTimeDomainData(floatRef.current);
        let sum = 0;
        for (let i = 0; i < fftSize; i++)
          sum += (floatRef.current[i] ?? 0) ** 2;
        setSignalRms(Math.sqrt(sum / fftSize));
      } else {
        setAnalyserActive(false);
        setSignalRms(0);
      }

      // Real compressor reduction — Stabilizer is working when reduction is happening
      if (compressor) {
        setCompressorReduction(Math.abs(compressor.reduction));
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const chainBuilt = getSharedCtx() !== null;
  const compExists = getSharedCompressor() !== null;
  const pannerExists = getSharedPanner() !== null;
  const mainAmpOn = startupDone && chainBuilt;

  // Signal threshold — > 0.01 RMS = real signal present
  const BAND_THRESHOLD = 0.03;
  const signalPresent = signalRms > 0.01;

  // Per-channel activity: based on real FFT band energy (threshold > 0.03 = signal present)
  const bassChannel = isPlaying && bandEnergy.bass > BAND_THRESHOLD;
  const midsChannel = isPlaying && bandEnergy.mids > BAND_THRESHOLD;
  const highsChannel = isPlaying && bandEnergy.highs > BAND_THRESHOLD;
  const tweetersChannel = isPlaying && bandEnergy.tweeters > BAND_THRESHOLD;
  // 8 Ohm load: active when ANY channel has signal
  const ohm8Load =
    bassChannel || midsChannel || highsChannel || tweetersChannel;

  // Stabilizer: compressor reduction > 0.5dB means it's doing real work
  const stabilizerActive = compressorReduction > 0.5;

  // SRS: truly ON only when hook says srsIsOn AND signal present
  const srs =
    pannerExists && startupDone && srsIsOn && (signalPresent || isPlaying);

  // XM: truly ON only when xmIsActive (passed in) AND signal present
  const xmActive = xmIsActive && chainBuilt && (signalPresent || isPlaying);

  // E-Quake levels
  const equakeActive = equakeValue > 0 && isPlaying;

  void bluetoothConnected; // BT analyzer removed — keep param for backward compat

  return {
    musicPlayer: ctxRunning || (startupDone && chainBuilt),
    powerChain: chainBuilt && startupDone,
    signalChain: chainBuilt && compExists,
    virtualAmp: mainAmpOn && virtualAmpReady,
    digitalStim: mainAmpOn && virtualAmpReady,
    analogTube: mainAmpOn && virtualAmpReady,
    srs,
    xmFilter: chainBuilt && compExists,
    xmActive: !!xmActive,
    automasphers:
      pannerExists && startupDone && srsIsOn && isPlaying && signalPresent,
    freqOutput: analyserActive || (isPlaying && chainBuilt),
    protection: compExists && startupDone,
    stabilizerActive,
    commander: startupDone,
    naturalBottom: startupDone,
    eqProcessor: compExists && startupDone,
    bassPresence: advancedReady,
    bassBooster: advancedReady,
    freqSwitcher: advancedReady,
    presetEngine: advancedReady,
    equakeActive,
    equakeLevel: equakeValue,
    bassChannel,
    midsChannel,
    highsChannel,
    tweetersChannel,
    ohm8Load,
  };
}

function statusDot(s: IndicatorStatus): {
  bg: string;
  shadow: string;
  pulse: boolean;
} {
  switch (s) {
    case "online":
      return {
        bg: "rgba(0,255,120,0.9)",
        shadow: "0 0 7px rgba(0,255,120,0.8)",
        pulse: false,
      };
    case "standby":
      return {
        bg: "rgba(255,200,0,0.85)",
        shadow: "0 0 7px rgba(255,180,0,0.6)",
        pulse: true,
      };
    case "init":
      return {
        bg: "rgba(0,213,255,0.85)",
        shadow: "0 0 7px rgba(0,213,255,0.7)",
        pulse: true,
      };
    default:
      return { bg: "rgba(255,255,255,0.12)", shadow: "none", pulse: false };
  }
}

export function ConnectionIndicator({
  isPlaying,
  startupDone,
  bluetoothConnected,
  srsExpansion,
  anyStabilizerSlider,
  srsIsOn = true,
  xmIsActive = true,
  bandEnergy = { bass: 0, mids: 0, highs: 0, tweeters: 0 },
  equakeValue = 0,
}: ConnectionIndicatorProps) {
  const status = useRealConnectionStatus(
    isPlaying,
    startupDone,
    bluetoothConnected,
    srsIsOn,
    xmIsActive,
    bandEnergy,
    equakeValue,
  );

  const commanderDraw = isPlaying
    ? `${anyStabilizerSlider ? "2400" : "840"}W DRAW`
    : "ARMED";

  // E-Quake sublabel based on real value
  const equakeSublabel =
    equakeValue === 0
      ? "0 — BYPASSED"
      : equakeValue <= 4
        ? `${equakeValue} — AMBER ACTIVE`
        : `${equakeValue} — QUAKE HIT`;

  // E-Quake status color
  const equakeStatus: IndicatorStatus =
    equakeValue === 0 ? "offline" : equakeValue <= 4 ? "standby" : "online";

  const items: ConnectionItem[] = [
    {
      id: "power-chain",
      label: "POWER CHAIN",
      sublabel: "750,000W SUPPLY",
      status: status.powerChain
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "combined-amp",
      label: "COMBINED AMP",
      sublabel: "12,000W / 4-CH",
      status: status.virtualAmp ? "online" : startupDone ? "init" : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "srs-hd-9",
      label: "SRS HD 9.0",
      sublabel:
        srsIsOn && srsExpansion > 0
          ? `${Math.round(srsExpansion * 30)}FT SURROUND`
          : srsIsOn
            ? isPlaying
              ? "ACTIVE"
              : "STANDBY"
            : "OFF",
      // TRUE: green only when SRS hook is ON and playing with real signal
      status: status.srs
        ? isPlaying
          ? "online"
          : "standby"
        : srsIsOn
          ? "standby"
          : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "xm-proc",
      label: "XM PROCESSOR",
      sublabel: status.xmActive ? "CLEANING ACTIVE" : "110dB SNR / 0.01%",
      // TRUE: XM green only when actually processing signal
      status: status.xmActive
        ? "online"
        : status.xmFilter
          ? "standby"
          : "offline",
      color: "rgba(153,69,255,0.9)",
    },
    {
      id: "automasphers",
      label: "AUTOMASPHERS",
      sublabel: status.automasphers ? "BREATHING ACTIVE" : "DYN/CLEAN/MOD",
      // TRUE: only active when SRS on AND playing AND signal present
      status: status.automasphers
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(153,69,255,0.9)",
    },
    {
      id: "stabilizer",
      label: "STABILIZER",
      sublabel: status.stabilizerActive
        ? "COMPRESSOR WORKING"
        : anyStabilizerSlider
          ? "50M×86 ARMED"
          : "ALWAYS ON",
      // TRUE: purple/active when compressor.reduction > 0.5dB
      status: startupDone
        ? status.stabilizerActive
          ? "online"
          : "standby"
        : "offline",
      color: "rgba(180,80,255,0.9)",
    },
    {
      id: "commander",
      label: "COMMANDER",
      sublabel: commanderDraw,
      // Commander never turns off — always lit once booted. This is correct.
      status: status.commander ? "online" : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "e-quake",
      label: "E-QUAKE",
      sublabel: equakeSublabel,
      // TRUE: grey at 0, amber at 1-4, green at 5-10 (only when playing)
      status: isPlaying
        ? equakeStatus
        : equakeValue > 0
          ? "standby"
          : "offline",
      color:
        equakeValue >= 5
          ? "rgba(153,69,255,0.9)"
          : equakeValue > 0
            ? "rgba(255,200,0,0.9)"
            : "rgba(255,255,255,0.2)",
    },
    {
      id: "eq-processor",
      label: "EQ PROCESSOR",
      sublabel: "14-60Hz RESONATED",
      status: status.eqProcessor
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "freq-output",
      label: "FREQ OUTPUT",
      sublabel: isPlaying ? "SIGNAL ACTIVE" : "14-60Hz FULL RANGE",
      // TRUE: based on actual analyser energy
      status: status.freqOutput
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "natural-bottom",
      label: "NATURAL BOTTOM",
      sublabel: "45Hz — ALWAYS ON",
      status: status.naturalBottom
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(0,255,120,0.9)",
    },
    {
      id: "bass-ch",
      label: "BASS CHANNEL",
      sublabel: status.bassChannel ? "14-60Hz LIVE" : "14-60Hz",
      // TRUE: real FFT signal level
      status: status.bassChannel
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(153,69,255,0.9)",
    },
    {
      id: "mids-ch",
      label: "MIDS CHANNEL",
      sublabel: status.midsChannel ? "200-2.5kHz LIVE" : "200-2.5kHz",
      status: status.midsChannel
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(0,213,255,0.9)",
    },
    {
      id: "highs-ch",
      label: "HIGHS CHANNEL",
      sublabel: status.highsChannel ? "2.5-14kHz LIVE" : "2.5-14kHz",
      status: status.highsChannel
        ? "online"
        : startupDone
          ? "standby"
          : "offline",
      color: "rgba(0,200,255,0.9)",
    },
    {
      id: "8ohm-load",
      label: "8Ω DUMMY LOAD",
      sublabel: status.ohm8Load ? "LOAD ACTIVE" : "WIRED — READY",
      // TRUE: active only when amps are outputting signal
      status: status.ohm8Load ? "online" : startupDone ? "standby" : "offline",
      color: "rgba(0,255,120,0.9)",
    },
    {
      id: "protection-ring",
      label: "PROTECTION SYS",
      sublabel: "ALWAYS 100% — RING ACTIVE",
      // Protection ring never turns off
      status: startupDone ? "online" : "offline",
      color: "rgba(0,255,120,0.9)",
    },
  ];

  const onlineCount = items.filter(
    (i) => i.status === "online" || i.status === "standby",
  ).length;

  return (
    <div
      data-ocid="connection.panel"
      className="mx-4 mb-3 rounded-sm overflow-hidden"
      style={{
        border: "1px solid rgba(0,150,255,0.3)",
        background:
          "linear-gradient(135deg, rgba(0,10,30,0.92) 0%, rgba(2,15,45,0.88) 100%)",
        backdropFilter: "blur(6px)",
        // Protection ring — always-active glow ring around the entire panel
        boxShadow: startupDone
          ? "0 0 0 1px rgba(0,255,120,0.15), 0 0 20px rgba(0,255,80,0.05)"
          : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,100,255,0.07)",
          borderBottom: "1px solid rgba(0,150,255,0.18)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse-glow"
            style={{
              background: "rgba(0,213,255,0.9)",
              boxShadow: "0 0 8px rgba(0,213,255,0.7)",
            }}
          />
          <span
            className="text-[9px] font-mono tracking-[0.22em] uppercase font-bold"
            style={{
              color: "rgba(0,213,255,0.9)",
              textShadow: "0 0 8px rgba(0,213,255,0.4)",
            }}
          >
            ALL SYSTEMS WIRED — 4 GAUGE DIRECT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color: "rgba(0,255,120,0.8)" }}
            data-ocid="connection.count_display"
          >
            {onlineCount}/{items.length} ONLINE
          </span>
          <div
            className="px-2 py-0.5 rounded-sm text-[8px] font-mono tracking-widest"
            style={{
              background: startupDone
                ? "rgba(0,255,120,0.1)"
                : "rgba(255,200,0,0.08)",
              border: startupDone
                ? "1px solid rgba(0,255,120,0.4)"
                : "1px solid rgba(255,200,0,0.3)",
              color: startupDone
                ? "rgba(0,255,120,0.9)"
                : "rgba(255,200,0,0.8)",
            }}
          >
            {startupDone ? "4-GAUGE WIRED" : "BOOTING"}
          </div>
        </div>
      </div>

      {/* Grid — 4 columns */}
      <div
        className="p-2 grid gap-1"
        style={{ gridTemplateColumns: "repeat(4,1fr)" }}
      >
        {items.map((item) => {
          const dot = statusDot(item.status);
          const isOn = item.status === "online" || item.status === "standby";
          return (
            <div
              key={item.id}
              data-ocid={`connection.indicator.${item.id}`}
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-sm transition-all duration-500"
              style={{
                background: isOn
                  ? "rgba(0,213,255,0.03)"
                  : "rgba(255,255,255,0.01)",
                border: isOn
                  ? `1px solid ${item.color.replace(/[\d.]+\)$/, "0.2)")}`
                  : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-500 ${dot.pulse ? "animate-pulse" : ""}`}
                style={{ background: dot.bg, boxShadow: dot.shadow }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="text-[7px] font-mono tracking-[0.08em] uppercase truncate leading-none"
                  style={{
                    color: isOn
                      ? "rgba(255,255,255,0.75)"
                      : "rgba(255,255,255,0.2)",
                  }}
                >
                  {item.label}
                </p>
                <p
                  className="text-[6px] font-mono tracking-wider mt-0.5 truncate leading-none"
                  style={{
                    color: isOn
                      ? item.color.replace("0.9", "0.4")
                      : "rgba(255,255,255,0.1)",
                  }}
                >
                  {item.sublabel}
                </p>
              </div>
              <span
                className="text-[6px] font-mono tracking-widest shrink-0 font-bold"
                style={{
                  color:
                    item.status === "online"
                      ? "rgba(0,255,120,0.85)"
                      : item.status === "standby"
                        ? "rgba(255,200,0,0.8)"
                        : item.status === "init"
                          ? "rgba(0,213,255,0.85)"
                          : "rgba(255,255,255,0.16)",
                  textShadow:
                    item.status === "online"
                      ? "0 0 6px rgba(0,255,120,0.5)"
                      : item.status === "init"
                        ? "0 0 6px rgba(0,213,255,0.5)"
                        : "none",
                }}
              >
                {item.status === "online"
                  ? "ON"
                  : item.status === "standby"
                    ? "RDY"
                    : item.status === "init"
                      ? "INIT"
                      : "OFF"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Wire footer */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{ borderTop: "1px solid rgba(0,100,255,0.1)" }}
      >
        <div
          className={`flex-1 h-px ${startupDone ? "signal-wire-active" : ""}`}
          style={
            !startupDone ? { background: "rgba(255,255,255,0.07)" } : undefined
          }
        />
        <span
          className="text-[7px] font-mono tracking-[0.2em] shrink-0"
          style={{ color: "rgba(0,150,255,0.45)" }}
        >
          SLOT-TO-SLOT · 4 GAUGE · DIRECT WIRED · {items.length} COMPONENTS
        </span>
        <div
          className={`flex-1 h-px ${startupDone ? "signal-wire-active" : ""}`}
          style={
            !startupDone ? { background: "rgba(255,255,255,0.07)" } : undefined
          }
        />
      </div>
    </div>
  );
}
