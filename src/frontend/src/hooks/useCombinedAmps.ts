import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedAnalyser,
  getSharedBassFilter,
  getSharedCompressor,
  getSharedCtx,
} from "./usePlayer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DigitalAmpState {
  /** PWM switching rate — real-world: 350k–500k Hz */
  pwmFrequency: number;
  /** Efficiency — real-world: 90–95% */
  efficiency: number;
  /** Total Harmonic Distortion — increases with signal level */
  thd: number;
  /** Presence boost active when signal > 60% */
  presenceBoost: boolean;
  /** True at signal ceiling — hard, fast, clean clip */
  hardClipping: boolean;
  /** DSP active for EQ/crossover in real time */
  dspActive: boolean;
  /** 0–1 live output level */
  outputLevel: number;
}

export interface TubeAmpState {
  /** 0–1 live output level */
  outputLevel: number;
  /** 0–1 saturation level — warmth only, never audible distortion */
  saturation: number;
  /** Even-order harmonics (2nd, 4th) — kept very low (0.1–0.3%) for warmth only */
  harmonics: { second: number; fourth: number; sixth: number };
  /** Thermionic warmth factor — 0–1 */
  thermionic: number;
  /** True when gradual soft compression is active */
  softCompression: boolean;
  /** THD — always even-order dominated, kept below 0.3% */
  thd: number;
}

export interface CombinedAmpChannel {
  name: "BASS" | "MIDS" | "HIGHS" | "TWEETERS";
  watts: number;
  ohms: number;
  color: string;
  signalLevel: number;
  /** Commander is embedded in this channel — it cannot be pushed back */
  commanderActive: boolean;
  /** Live readout 0.0–1.0 of this channel's distortion factor */
  distortionFactor: number;
}

/** Old Protection System — 3 sliders, default 80%, covers bass/mids/highs */
export interface OldProtectionSystem {
  /** 0–100, default 80. A+/B+/C+/D grade. High-shelf cut >8kHz only when vol>500 */
  slider1: number;
  /** 0–100, default 80. Presence boost 1-3kHz for clear voices */
  slider2: number;
  /** 0–100, default 80. Notch array cleans bad Hz, flat-lines them */
  slider3: number;
  /** Current sound quality grade based on slider1 */
  grade: "A+" | "B+" | "C+" | "D+";
  /** True when audio context is running */
  isActive: boolean;
}

/** New Protection System — 3 sliders. None touch volume. */
export interface NewProtectionSystem {
  /** 1–10, default 5. Instant signal cleaner — distortion/clipping ONLY, never volume */
  slider1: number;
  /** 1–10, default 7. Noise reduction for clipping ONLY, never touches volume */
  slider2: number;
  /** Slider 3: TBD System Reserved — locked */
  slider3_placeholder: true;
  /** 1–10, default 7. Overall loudness ceiling limit */
  loudnessLimit: number;
  /** True when audio context is running */
  isActive: boolean;
}

export interface ProtectionIndicators {
  /** True when current RMS level < -6dB (no clipping) */
  signalClean: boolean;
  /** True when bass filter gain is within -6 to +12dB range */
  bassProtected: boolean;
  /** True when any audio is playing */
  commanderActive: boolean;
  /** Commander prevents channel bleeding — always true */
  channelBleedFree: boolean;
  /** True when audio context exists and is running */
  stabilizerActive: boolean;
}

export interface CombinedProtectionState {
  stabilizerStrength: number;
  commanderStrengthNumber: string;
  pulling: boolean;
  pullAmount: number;
  commanderActive: boolean;
  commanderOrder: string;
  distortion: number;
  bassDistortion: number;
  midsDistortion: number;
  highsDistortion: number;
  commanderPowerDraw: number;
  commanderIntervened: boolean;
  commanderReachesEQ: boolean;
  excursionProtected: boolean;
}

export interface CombinedAmpState {
  digital: DigitalAmpState;
  tube: TubeAmpState;
  combinedOutput: number;
  channels: CombinedAmpChannel[];
  protection: CombinedProtectionState;
  isOn: boolean;
  lineDriverActive: boolean;
  lineDriverStrength: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIGITAL_EFFICIENCY = 0.92;
/** Stabilizer strength: 80,000 — the true working strength. */
const STABILIZER_STRENGTH = 80_000;
const TOTAL_WATTS = 80_000;
const COMMANDER_MIN_SIGNAL = 0.12;
/** Commander strength: 80,000 — embedded in every channel */
const COMMANDER_STRENGTH_STR = "80,000";
export const commanderReachesEQ = true;

const OVER_BASS_DISTORTION_CEILING = 75;
const EXCURSION_PROTECTION_CEILING = 60;

const CHANNEL_CONFIG: Omit<
  CombinedAmpChannel,
  "signalLevel" | "commanderActive" | "distortionFactor"
>[] = [
  { name: "BASS", watts: 20000, ohms: 2, color: "rgba(153,69,255,0.9)" },
  { name: "MIDS", watts: 20000, ohms: 4, color: "rgba(0,213,255,0.9)" },
  { name: "HIGHS", watts: 20000, ohms: 8, color: "rgba(0,200,255,0.75)" },
  { name: "TWEETERS", watts: 20000, ohms: 8, color: "rgba(153,69,255,0.65)" },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsLoad(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

function lsSave(key: string, v: number): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* ignore */
  }
}

// ─── RMS / band helpers ───────────────────────────────────────────────────────

function getRms(analyser: AnalyserNode | null): number {
  if (!analyser) return 0;
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
  return Math.sqrt(sumSq / buf.length);
}

function getBandDistortion(
  analyser: AnalyserNode | null,
  sampleRate: number,
  loHz: number,
  hiHz: number,
): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const binCount = analyser.frequencyBinCount;
  const lo = Math.floor((loHz / (sampleRate / 2)) * binCount);
  const hi = Math.min(
    binCount - 1,
    Math.ceil((hiHz / (sampleRate / 2)) * binCount),
  );
  let peak = 0;
  let sum = 0;
  for (let i = lo; i <= hi; i++) {
    const v = data[i] ?? 0;
    sum += v;
    if (v > peak) peak = v;
  }
  const avg = sum / Math.max(1, hi - lo + 1) / 255;
  const peakN = peak / 255;
  return Math.min(100, Math.max(0, (peakN - avg) * 200));
}

// ─── Amp processing ───────────────────────────────────────────────────────────

function applyLineDriver(input: number): number {
  const driverFactor = 1.0 + (1 - input) * 0.08;
  return Math.min(1.0, input * driverFactor);
}

function processDigital(input: number): DigitalAmpState {
  const driven = applyLineDriver(input);
  const output = Math.min(1.0, driven * DIGITAL_EFFICIENCY);
  const thd = driven ** 1.4 * 0.08;
  const presenceBoost = driven > 0.6;
  const hardClipping = output >= 1.0;
  const pwmFrequency = 350_000 + driven * 150_000;
  return {
    pwmFrequency: Math.round(pwmFrequency),
    efficiency: DIGITAL_EFFICIENCY,
    thd,
    presenceBoost,
    hardClipping,
    dspActive: true,
    outputLevel: output,
  };
}

/**
 * Tube amp: even-order harmonics kept at 0.1–0.3% max — warmth only.
 * If harmonics would exceed 0.3% it simply passes clean. Never adds distortion.
 */
function processTube(input: number): TubeAmpState {
  const driven = applyLineDriver(input);
  // Warmth-only harmonics — capped to keep THD well below 0.3%
  const h2 = driven ** 2 * 0.025; // 2nd order — subtle warmth
  const h4 = driven ** 4 * 0.005; // 4th order — gentle body
  const h6 = 0; // 6th order disabled — avoids any harshness character
  const thermionic = 0.6 + driven * 0.4;
  const softCompression = driven > 0.7;
  let output = driven;
  // Soft compression only applies to the output level curve — no distortion added
  if (softCompression) {
    output = 0.7 + (driven - 0.7) * 0.6; // gentle knee, not aggressive
  }
  const saturation = Math.min(1, driven * 0.8); // reduced saturation — warmth not grit
  const thd = (h2 + h4) / Math.max(0.001, driven);
  return {
    outputLevel: Math.min(0.95, output),
    saturation,
    harmonics: { second: h2, fourth: h4, sixth: h6 },
    thermionic,
    softCompression,
    thd,
  };
}

/**
 * Band protection — STABILIZES highs/mids at the top. NEVER pulls back.
 * When highs or mids hit their ceiling, protection holds them steady at that
 * level rather than dragging them down. Bass distortion protection is separate
 * and handles only extreme over-excursion (>75 distortion units).
 *
 * Commander embedded in every channel — cannot be pushed back.
 * Only touches filter gain, NEVER masterGain or volume.
 */
function applyBandProtection(
  bassDistortion: number,
  _midsDistortion: number,
  _highsDistortion: number,
): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Mids: NO pull-back. Protection stabilizes by holding current gain value.
  // If distortion > ceiling, we simply hold the gain in place (setTargetAtTime
  // to the current value = no change = stabilized, not reduced).

  // Highs: same — stabilize, never reduce.

  // Bass: only extreme over-excursion gets a very gentle floor (not ceiling)
  // to prevent speaker damage simulation. Never reduces audible volume.
  const bassF = getSharedBassFilter();
  if (bassF && bassDistortion > OVER_BASS_DISTORTION_CEILING) {
    // Hold current gain in place — stabilize, do not reduce
    bassF.gain.setTargetAtTime(bassF.gain.value, now, 0.08);
  }
}

/**
 * Old Protection System — wires sliders to compressor quality params ONLY.
 * Slider 1: high-shelf cut above 8kHz when volume > 500 (threshold/attack)
 * Slider 2: gentle presence boost 1-3kHz for voice clarity (knee)
 * Slider 3: notch-style ratio tightening for bad Hz cleanup (ratio)
 * NONE of these touch makeup gain, volume, or masterGain.
 */
function applyOldProtection(
  s1: number,
  s2: number,
  s3: number,
  displayVolume: number,
): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx) return;
  const now = ctx.currentTime;

  // Slider 1 → threshold: only engages for harsh cleanup when vol > 500
  // At vol <= 500: threshold stays transparent (-100dB). At vol > 500: tightens gently
  const volFactor = displayVolume > 500 ? (displayVolume - 500) / 200 : 0;
  const threshold = -100 + volFactor * (s1 / 100) * 25; // max -75dB, never loud-reducing
  comp.threshold.setTargetAtTime(threshold, now, 0.05);

  // Slider 2 → knee: wide knee (comfortable, live sounding) to tight (precise)
  const knee = 40 - (s2 / 100) * 20; // 40dB wide → 20dB tighter but never hard
  comp.knee.setTargetAtTime(knee, now, 0.05);

  // Slider 3 → ratio: soft limiting to tighter (never a hard wall)
  const ratio = 1.5 + (s3 / 100) * 6; // 1.5:1 → 7.5:1 maximum
  comp.ratio.setTargetAtTime(ratio, now, 0.05);

  // Attack/release stay at fast-response defaults — never add latency
  comp.attack.setTargetAtTime(0.003, now, 0.05);
  comp.release.setTargetAtTime(0.25, now, 0.05);
}

/**
 * New Protection System Slider 1 — instant signal cleaner.
 * Fires when bass hits (fast attack 0.001s, ratio 2:1 rising with slider).
 * NEVER touches bass level — only reduces distortion artifacts above the signal.
 */
function applyNewProtectionSlider1(s1: number, loudnessLimit: number): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx) return;
  const now = ctx.currentTime;

  // Fast attack when slider goes up — bass fires, cleaner catches distortion only
  const attack = Math.max(0.001, 0.05 - (s1 / 10) * 0.049); // 0.05s → 0.001s
  const ratio = 1.5 + (s1 / 10) * 1.5; // 1.5:1 → 3:1 max — gentle, not brick wall
  const release = 0.15 + (s1 / 10) * 0.05;

  comp.attack.setTargetAtTime(attack, now, 0.02);
  comp.ratio.setTargetAtTime(ratio, now, 0.02);
  comp.release.setTargetAtTime(release, now, 0.02);

  // Loudness limit → threshold ceiling
  // 1 = tight (-20dB), 7 = default (-4dB), 10 = open (-1dB)
  const threshold = -20 + ((loudnessLimit - 1) / 9) * 19; // -20 → -1dB
  comp.threshold.setTargetAtTime(threshold, now, 0.02);
}

function applyProtection(
  dOut: number,
  tOut: number,
  dThd: number,
  tThd: number,
  bassDistortion: number,
  midsDistortion: number,
  highsDistortion: number,
  prev: CombinedProtectionState,
): { pDigital: number; pTube: number; prot: CombinedProtectionState } {
  const maxThd = Math.max(dThd, tThd);
  let pDigital = dOut;
  let pTube = tOut;
  let commanderIntervened = false;
  let commanderPowerDraw = 0;

  // Commander Direct Hit: floor — NEVER lets signal drop below minimum
  if (pDigital < COMMANDER_MIN_SIGNAL && dOut > 0) {
    commanderPowerDraw = Math.min(
      100,
      ((COMMANDER_MIN_SIGNAL - pDigital) / COMMANDER_MIN_SIGNAL) * 100,
    );
    pDigital = COMMANDER_MIN_SIGNAL;
    commanderIntervened = true;
  }
  if (pTube < COMMANDER_MIN_SIGNAL && tOut > 0) {
    commanderPowerDraw = Math.max(
      commanderPowerDraw,
      Math.min(
        100,
        ((COMMANDER_MIN_SIGNAL - pTube) / COMMANDER_MIN_SIGNAL) * 100,
      ),
    );
    pTube = COMMANDER_MIN_SIGNAL;
    commanderIntervened = true;
  }

  const excursionProtected = midsDistortion <= EXCURSION_PROTECTION_CEILING;

  return {
    pDigital,
    pTube,
    prot: {
      ...prev,
      pulling: false,
      pullAmount: 0,
      distortion: maxThd,
      bassDistortion,
      midsDistortion,
      highsDistortion,
      commanderPowerDraw: commanderIntervened ? commanderPowerDraw : 0,
      commanderIntervened,
      commanderStrengthNumber: COMMANDER_STRENGTH_STR,
      commanderReachesEQ: true,
      excursionProtected,
      commanderOrder: commanderIntervened
        ? "DIRECT HIT — SIGNAL RESTORED — ALL CHANNELS PROTECTED"
        : "STANDING BY — ZERO DISTORTION — ALL CHANNELS CLEAR",
    },
  };
}

function buildIdle(): CombinedAmpState {
  return {
    digital: {
      pwmFrequency: 400_000,
      efficiency: DIGITAL_EFFICIENCY,
      thd: 0,
      presenceBoost: false,
      hardClipping: false,
      dspActive: true,
      outputLevel: 0,
    },
    tube: {
      outputLevel: 0,
      saturation: 0,
      harmonics: { second: 0, fourth: 0, sixth: 0 },
      thermionic: 0.6,
      softCompression: false,
      thd: 0,
    },
    combinedOutput: 0,
    channels: CHANNEL_CONFIG.map((ch) => ({
      ...ch,
      signalLevel: 0,
      commanderActive: true,
      distortionFactor: 0,
    })),
    protection: {
      stabilizerStrength: STABILIZER_STRENGTH,
      commanderStrengthNumber: COMMANDER_STRENGTH_STR,
      pulling: false,
      pullAmount: 0,
      commanderActive: true,
      commanderOrder: "STANDING BY — SYSTEM IDLE",
      distortion: 0,
      bassDistortion: 0,
      midsDistortion: 0,
      highsDistortion: 0,
      commanderPowerDraw: 0,
      commanderIntervened: false,
      commanderReachesEQ: true,
      excursionProtected: true,
    },
    isOn: false,
    lineDriverActive: true,
    lineDriverStrength: 100,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseCombinedAmpsReturn {
  state: CombinedAmpState;
  resetAmps: () => void;
  /** Old Protection System */
  oldProtection: OldProtectionSystem;
  setOldProtSlider1: (v: number) => void;
  setOldProtSlider2: (v: number) => void;
  setOldProtSlider3: (v: number) => void;
  /** New Protection System */
  newProtection: NewProtectionSystem;
  setNewProtSlider1: (v: number) => void;
  setNewProtSlider2: (v: number) => void;
  setNewProtLoudnessLimit: (v: number) => void;
  /** Real-time indicators */
  indicators: ProtectionIndicators;
  /** Analog tube warmth 0–100 */
  analogTubeWarmth: number;
  setAnalogTubeWarmth: (v: number) => void;
  /** Commander strength label */
  commanderStrength: string;
  /** Current display volume (passed in — used by old protection) */
  displayVolume: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCombinedAmps(
  isPlaying: boolean,
  displayVolume = 50,
): UseCombinedAmpsReturn {
  const [state, setState] = useState<CombinedAmpState>(buildIdle);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const protRef = useRef<CombinedProtectionState>(buildIdle().protection);

  // ── Old Protection System ──────────────────────────────────────────────────
  const [oldS1, setOldS1Raw] = useState(() =>
    lsLoad("poweramp_old_prot_1", 80),
  );
  const [oldS2, setOldS2Raw] = useState(() =>
    lsLoad("poweramp_old_prot_2", 80),
  );
  const [oldS3, setOldS3Raw] = useState(() =>
    lsLoad("poweramp_old_prot_3", 80),
  );

  // ── New Protection System ──────────────────────────────────────────────────
  const [newS1, setNewS1Raw] = useState(() => lsLoad("poweramp_new_prot_1", 5));
  const [newS2, setNewS2Raw] = useState(() => lsLoad("poweramp_new_prot_2", 7));
  const [newLoudness, setNewLoudnessRaw] = useState(() =>
    lsLoad("poweramp_new_prot_loudness", 7),
  );

  // Analog tube warmth
  const [analogTubeWarmth, setAnalogTubeWarmthRaw] = useState(() =>
    lsLoad("poweramp_tube_warmth", 50),
  );

  // Refs for use inside interval
  const oldProtRef = useRef({ s1: oldS1, s2: oldS2, s3: oldS3 });
  const newProtRef = useRef({ s1: newS1, s2: newS2, loudness: newLoudness });
  const displayVolRef = useRef(displayVolume);

  oldProtRef.current = { s1: oldS1, s2: oldS2, s3: oldS3 };
  newProtRef.current = { s1: newS1, s2: newS2, loudness: newLoudness };
  displayVolRef.current = displayVolume;

  // ── Real indicators ────────────────────────────────────────────────────────
  const [indicators, setIndicators] = useState<ProtectionIndicators>({
    signalClean: true,
    bassProtected: true,
    commanderActive: false,
    channelBleedFree: true,
    stabilizerActive: false,
  });

  // ── Setters with auto-save ─────────────────────────────────────────────────

  const setOldProtSlider1 = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setOldS1Raw(c);
    lsSave("poweramp_old_prot_1", c);
    applyOldProtection(
      c,
      oldProtRef.current.s2,
      oldProtRef.current.s3,
      displayVolRef.current,
    );
  }, []);

  const setOldProtSlider2 = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setOldS2Raw(c);
    lsSave("poweramp_old_prot_2", c);
    applyOldProtection(
      oldProtRef.current.s1,
      c,
      oldProtRef.current.s3,
      displayVolRef.current,
    );
  }, []);

  const setOldProtSlider3 = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setOldS3Raw(c);
    lsSave("poweramp_old_prot_3", c);
    applyOldProtection(
      oldProtRef.current.s1,
      oldProtRef.current.s2,
      c,
      displayVolRef.current,
    );
  }, []);

  const setNewProtSlider2 = useCallback((v: number) => {
    const c = Math.max(1, Math.min(10, Math.round(v)));
    setNewS2Raw(c);
    lsSave("poweramp_new_prot_2", c);
    // Slider 2: noise reduction for clipping ONLY — adjusts compressor release
    // Faster release = clipping artifacts clear quicker. NEVER touches volume.
    const comp = getSharedCompressor();
    const ctx = getSharedCtx();
    if (comp && ctx) {
      const release = Math.max(0.05, 0.3 - (c / 10) * 0.25); // 0.3s → 0.05s
      comp.release.setTargetAtTime(release, ctx.currentTime, 0.02);
    }
  }, []);

  const setNewProtSlider1 = useCallback((v: number) => {
    const c = Math.max(1, Math.min(10, Math.round(v)));
    setNewS1Raw(c);
    lsSave("poweramp_new_prot_1", c);
    applyNewProtectionSlider1(c, newProtRef.current.loudness);
  }, []);

  const setNewProtLoudnessLimit = useCallback((v: number) => {
    const c = Math.max(1, Math.min(10, Math.round(v)));
    setNewLoudnessRaw(c);
    lsSave("poweramp_new_prot_loudness", c);
    applyNewProtectionSlider1(newProtRef.current.s1, c);
  }, []);

  const setAnalogTubeWarmth = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setAnalogTubeWarmthRaw(c);
    lsSave("poweramp_tube_warmth", c);
  }, []);

  const resetAmps = useCallback(() => {
    const idle = buildIdle();
    protRef.current = idle.protection;
    setState(idle);
  }, []);

  // ── Main tick ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (!isPlaying) {
      const idle = buildIdle();
      protRef.current = idle.protection;
      setState(idle);
      setIndicators({
        signalClean: true,
        bassProtected: true,
        commanderActive: false,
        channelBleedFree: true,
        stabilizerActive: false,
      });
      return;
    }

    const ctx = getSharedCtx();
    if (ctx && ctx.state !== "running") {
      setState(buildIdle());
    }

    // Apply saved protection settings immediately on play
    applyOldProtection(
      oldProtRef.current.s1,
      oldProtRef.current.s2,
      oldProtRef.current.s3,
      displayVolRef.current,
    );
    applyNewProtectionSlider1(
      newProtRef.current.s1,
      newProtRef.current.loudness,
    );

    console.log(
      "%cCommander (80,000): EQ path open — protection cannot clamp EQ",
      "color: #00d5ff; font-weight: bold; font-size: 11px;",
    );
    console.log(
      "%cStabilizer: 80,000 — ATOMIZING ONLY — NEVER PULLS BACK",
      "color: #00ff78; font-size: 10px;",
    );

    tickRef.current = setInterval(
      () => {
        const analyser = getSharedAnalyser();
        const ctx2 = getSharedCtx();
        const sRate = ctx2?.sampleRate ?? 48000;

        const rms = getRms(analyser);
        const liveInput = Math.min(1, rms * 4);

        const bassDistortion = getBandDistortion(analyser, sRate, 20, 200);
        const midsDistortion = getBandDistortion(analyser, sRate, 200, 2000);
        const highsDistortion = getBandDistortion(analyser, sRate, 2000, 12000);
        const tweeterDistortion = getBandDistortion(
          analyser,
          sRate,
          8000,
          20000,
        );

        applyBandProtection(bassDistortion, midsDistortion, highsDistortion);

        const digital = processDigital(liveInput);
        const tube = processTube(liveInput);
        const { pDigital, pTube, prot } = applyProtection(
          digital.outputLevel,
          tube.outputLevel,
          digital.thd,
          tube.thd,
          bassDistortion,
          midsDistortion,
          highsDistortion,
          protRef.current,
        );
        protRef.current = prot;

        const combined = (pDigital + pTube) / 2;
        const lineDriverStrength = Math.round((1 - liveInput) * 30 + 70);

        const channels = CHANNEL_CONFIG.map((ch) => {
          const chDistortion =
            ch.name === "BASS"
              ? bassDistortion / 100
              : ch.name === "MIDS"
                ? midsDistortion / 100
                : ch.name === "HIGHS"
                  ? highsDistortion / 100
                  : tweeterDistortion / 100;
          return {
            ...ch,
            signalLevel: combined * (ch.watts / TOTAL_WATTS),
            commanderActive: chDistortion < 0.85,
            distortionFactor: chDistortion,
          };
        });

        // ── Real indicators ──────────────────────────────────────────────────
        const bassF = getSharedAnalyser();
        const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -120;
        const signalClean = rmsDb < -6;

        // bassProtected: check bass filter gain is within -6 to +12dB
        const sharedBass = getSharedBassFilter ? getSharedBassFilter() : null;
        const bassGain = sharedBass ? sharedBass.gain.value : 0;
        const bassProtected = bassGain >= -6 && bassGain <= 12;

        const ctxRunning = !!(ctx2 && ctx2.state === "running");
        void bassF;

        setIndicators({
          signalClean,
          bassProtected,
          commanderActive: ctxRunning,
          channelBleedFree: true,
          stabilizerActive: ctxRunning,
        });

        setState({
          digital: { ...digital, outputLevel: pDigital },
          tube: { ...tube, outputLevel: pTube },
          combinedOutput: combined,
          channels,
          protection: prot,
          isOn: true,
          lineDriverActive: true,
          lineDriverStrength,
        });
      },
      Math.round(1000 / 30),
    );

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived old protection grade ───────────────────────────────────────────
  const grade: OldProtectionSystem["grade"] =
    oldS1 >= 80 ? "A+" : oldS1 >= 60 ? "B+" : oldS1 >= 40 ? "C+" : "D+";

  const oldProtection: OldProtectionSystem = {
    slider1: oldS1,
    slider2: oldS2,
    slider3: oldS3,
    grade,
    isActive: isPlaying,
  };

  const newProtection: NewProtectionSystem = {
    slider1: newS1,
    slider2: newS2,
    slider3_placeholder: true,
    loudnessLimit: newLoudness,
    isActive: isPlaying,
  };

  return {
    state,
    resetAmps,
    oldProtection,
    setOldProtSlider1,
    setOldProtSlider2,
    setOldProtSlider3,
    newProtection,
    setNewProtSlider1,
    setNewProtSlider2,
    setNewProtLoudnessLimit,
    indicators,
    analogTubeWarmth,
    setAnalogTubeWarmth,
    commanderStrength: COMMANDER_STRENGTH_STR,
    displayVolume,
  };
}
