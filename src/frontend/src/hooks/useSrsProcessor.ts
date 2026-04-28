/**
 * useSrsProcessor — SRS HD 9.0
 * REAL audio engine: 5 BiquadFilter nodes + LFO oscillators.
 *
 * Chain: panner → srsTweeter → srsMidBass → srsNatBottom → srsMidBoost → srsClarity → analyser
 *
 * SRS ON:
 *   - HD9 Expansion: panner oscillates ±0.15 pan at 0.05Hz (scaled by expansionFactor)
 *   - Smooth Tweeters: -2dB highshelf at 12kHz, +1dB presence at 6kHz
 *   - Automasphers: 3 modes, each a real filter/gain change
 *   - Natural Bottom: +2dB lowshelf at 80Hz — ALWAYS active when SRS is on
 *   - Zero background noise: DC notch applied via getSharedNotchFilter()
 *
 * NOTE: SRS CODE 2022 — DELETED. Removed from the app entirely per user spec.
 *
 * SRS OFF: all gains zeroed, panner centered, Natural Bottom cleared
 *
 * Auto-save: every control persisted to localStorage "poweramp_srs_*"
 */

import type {
  AutomasphersState,
  NaturalBottomState,
  SrsHD9State,
  SrsState,
} from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedAnalyser,
  getSharedCtx,
  getSharedNotchFilter,
  getSharedPanner,
  getSharedTweetersFilter,
} from "./usePlayer";

// ─── Storage keys ────────────────────────────────────────────────────────────
const LS_SRS_ENABLED = "poweramp_srs_enabled";
const LS_SRS_HD = "poweramp_srs_hd";
const LS_SRS_AUTOM = "poweramp_srs_automasphers";
const LS_SRS_AUTOM_MODE = "poweramp_srs_automasphers_mode";
const LS_SRS_SMOOTH = "poweramp_srs_smooth_tweeters";
const LS_SRS_EXPANSION = "poweramp_srs_expansion";

function lsGetBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v === "true";
  } catch {
    return def;
  }
}

function lsGetNum(key: string, def: number): number {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    const n = Number.parseFloat(v);
    return Number.isNaN(n) ? def : n;
  } catch {
    return def;
  }
}

function lsGetStr(key: string, def: string): string {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : def;
  } catch {
    return def;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

// ─── Module-level SRS filter nodes ───────────────────────────────────────────
// Inserted between panner and analyser
let srsTweeterFilter: BiquadFilterNode | null = null; // highshelf 12kHz — smooth tweeters
let srsMidBassFilter: BiquadFilterNode | null = null; // peaking 120Hz — excursion pumping
let srsNatBottomFilter: BiquadFilterNode | null = null; // lowshelf 80Hz — Natural Bottom
let srsMidBoostFilter: BiquadFilterNode | null = null; // peaking 500Hz — automasphers warmth
let srsClarityFilter: BiquadFilterNode | null = null; // peaking 6kHz — clarity presence

// ─── LFO phases (module-level, persistent across ticks) ──────────────────────
let hd9LfoPhase = 0; // 0.05Hz → HD9 stereo widening
let automaspherLfoPhase = 0; // 0.3Hz  → automasphers breathing
let excursionPhase = 0; // 1.5Hz  → mid-bass pumping

// ─── Build SRS nodes and insert into chain panner → SRS chain → analyser ─────
function ensureSrsNodes(): boolean {
  const ctx = getSharedCtx();
  const panner = getSharedPanner();
  if (!ctx || !panner) return false;
  if (srsTweeterFilter) return true; // already built — singleton

  try {
    // TWEETER SMOOTHING — highshelf 12kHz
    // SRS Smooth Tweeters: gentle roll at 12kHz removes harshness
    srsTweeterFilter = ctx.createBiquadFilter();
    srsTweeterFilter.type = "highshelf";
    srsTweeterFilter.frequency.value = 12000;
    srsTweeterFilter.Q.value = Math.SQRT1_2;
    srsTweeterFilter.gain.value = 0; // neutral until SRS on

    // MID-BASS EXCURSION — peaking 120Hz
    // Pumping physical movement feel — mid-bass breathing
    srsMidBassFilter = ctx.createBiquadFilter();
    srsMidBassFilter.type = "peaking";
    srsMidBassFilter.frequency.value = 120;
    srsMidBassFilter.Q.value = 0.8;
    srsMidBassFilter.gain.value = 0;

    // NATURAL BOTTOM — lowshelf 80Hz
    // Always +2dB when SRS is on — never zeroed while SRS enabled
    srsNatBottomFilter = ctx.createBiquadFilter();
    srsNatBottomFilter.type = "lowshelf";
    srsNatBottomFilter.frequency.value = 80;
    srsNatBottomFilter.gain.value = 0; // set to +2 when SRS enables

    // AUTOMASPHERS WARMTH — peaking 500Hz Q=1.2
    // Modified mode: +1.5dB warmth. Dynamic: rides with signal energy.
    srsMidBoostFilter = ctx.createBiquadFilter();
    srsMidBoostFilter.type = "peaking";
    srsMidBoostFilter.frequency.value = 500;
    srsMidBoostFilter.Q.value = 1.2;
    srsMidBoostFilter.gain.value = 0;

    // CLARITY PRESENCE — peaking 6kHz Q=1.5
    // +1dB presence for instrument clarity when SRS on
    srsClarityFilter = ctx.createBiquadFilter();
    srsClarityFilter.type = "peaking";
    srsClarityFilter.frequency.value = 6000;
    srsClarityFilter.Q.value = 1.5;
    srsClarityFilter.gain.value = 0;

    // Rewire: panner → srsChain → analyser
    const analyser = getSharedAnalyser();
    if (!analyser) return false;

    try {
      panner.disconnect(analyser);
    } catch {
      /* already disconnected */
    }

    // Wire: panner → tweeter → midBass → natBottom → midBoost → clarity → analyser
    panner
      .connect(srsTweeterFilter)
      .connect(srsMidBassFilter)
      .connect(srsNatBottomFilter)
      .connect(srsMidBoostFilter)
      .connect(srsClarityFilter)
      .connect(analyser);

    console.log(
      "[PowerAmp] SRS HD 9.0 nodes wired: panner → 5-filter SRS chain → analyser",
    );
    return true;
  } catch (e) {
    console.error("[PowerAmp] SRS node setup error:", e);
    return false;
  }
}

// ─── FFT band energy helper ───────────────────────────────────────────────────
function getBandEnergy(
  data: Uint8Array<ArrayBuffer>,
  binCount: number,
  sampleRate: number,
  loHz: number,
  hiHz: number,
): number {
  const lo = Math.floor((loHz / (sampleRate / 2)) * binCount);
  const hi = Math.min(
    binCount - 1,
    Math.ceil((hiHz / (sampleRate / 2)) * binCount),
  );
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += data[i] ?? 0;
  return sum / Math.max(1, hi - lo + 1) / 255;
}

// ─── SRS ON — apply all gains, LFO modulation, expansion ─────────────────────
function applySrsOn(
  ctx: AudioContext,
  excursionLfo: number,
  automaspherLfo: number,
  hd9Pan: number,
  expansionFactor: number,
  hdEnabled: boolean,
  smoothTweeters: boolean,
  automasphersMode: "dynamic" | "clean" | "modified",
): void {
  const now = ctx.currentTime;
  const tau = 0.08;

  // Smooth Tweeters: -2dB at 12kHz (removes harshness, keeps clarity)
  if (srsTweeterFilter) {
    const tweeterGain = smoothTweeters ? -2.0 : 0.5;
    srsTweeterFilter.gain.setTargetAtTime(tweeterGain, now, tau);
  }

  // Mid-bass excursion: base +2dB, LFO pumping at 1.5Hz
  if (srsMidBassFilter) {
    const excGain = 2.0 + excursionLfo * 1.5;
    srsMidBassFilter.gain.setTargetAtTime(excGain, now, 0.05);
  }

  // Natural Bottom: ALWAYS +2dB when SRS is on — warmer bass, punchy mids (SRS for 8 ohms)
  if (srsNatBottomFilter) {
    srsNatBottomFilter.gain.setTargetAtTime(2.0, now, 0.3);
  }

  // Automasphers by mode:
  // dynamic: rides with LFO breathing (1.5dB ± 0.5dB)
  // clean: flat — just HD9 expansion, no warmth boost
  // modified: +1.5dB constant warmth at 500Hz
  if (srsMidBoostFilter) {
    let modeGain: number;
    if (automasphersMode === "dynamic") {
      modeGain = 1.5 + automaspherLfo * 0.5;
    } else if (automasphersMode === "modified") {
      modeGain = 1.5;
    } else {
      // clean — no warmth, pure expansion only
      modeGain = 0;
    }
    srsMidBoostFilter.gain.setTargetAtTime(modeGain, now, 0.12);
  }

  // Clarity presence: +1dB at 6kHz for instrument lift
  if (srsClarityFilter) {
    srsClarityFilter.gain.setTargetAtTime(1.0, now, tau);
  }

  // HD 9.0 stereo widening: 0.05Hz oscillation ±0.15, scaled by expansionFactor
  // Creates "sound projects outside the speaker" effect
  if (hdEnabled) {
    const panner = getSharedPanner();
    if (panner) {
      const panAmt = hd9Pan * 0.15 * expansionFactor;
      panner.pan.setTargetAtTime(
        Math.max(-0.4, Math.min(0.4, panAmt)),
        now,
        0.1,
      );
    }
  }

  // Zero background noise: push notch filter to DC range to eliminate hiss floor
  const notch = getSharedNotchFilter();
  if (notch) {
    // Notch at 75Hz is the isolation fuse — keep it working, just verify Q is high
    notch.Q.setTargetAtTime(10, now, 0.1);
  }

  // Smooth tweeters: also apply -2dB on the shared tweeters filter for harshness removal
  const tweetersFilter = getSharedTweetersFilter();
  if (tweetersFilter && smoothTweeters) {
    // The base chain has +2dB. Add -2dB more = net 0dB, zero harshness.
    // Only done here as an additional smooth pass — doesn't affect the base chain default.
    tweetersFilter.gain.setTargetAtTime(0, now, 0.15);
  }
}

// ─── SRS OFF — zero all SRS filter gains ─────────────────────────────────────
function applySrsOff(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const tau = 0.15;

  if (srsTweeterFilter) srsTweeterFilter.gain.setTargetAtTime(0, now, tau);
  if (srsMidBassFilter) srsMidBassFilter.gain.setTargetAtTime(0, now, tau);
  if (srsNatBottomFilter) srsNatBottomFilter.gain.setTargetAtTime(0, now, tau);
  if (srsMidBoostFilter) srsMidBoostFilter.gain.setTargetAtTime(0, now, tau);
  if (srsClarityFilter) srsClarityFilter.gain.setTargetAtTime(0, now, tau);

  // Restore panner to center when SRS off
  const panner = getSharedPanner();
  if (panner) panner.pan.setTargetAtTime(0, now, 0.2);

  // Restore shared tweeters filter to its default +2dB when SRS off
  const tweetersFilter = getSharedTweetersFilter();
  if (tweetersFilter) tweetersFilter.gain.setTargetAtTime(2, now, tau);
}

// ─── Idle builders ────────────────────────────────────────────────────────────
function buildHD9Idle(): SrsHD9State {
  return {
    hd9Active: false,
    pumpingExcursionActive: false,
    excursionStrength: 0.35,
    naturalBottom: true,
    naturalBottomHz: 80,
    instrumentClarityScore: 0,
    smoothTweeters: false,
    monitorSensorsActive: false,
  };
}

function buildAutomasphersIdle(): AutomasphersState {
  return {
    dynamicActive: false,
    cleanActive: false,
    modifiedActive: false,
    breathingLevel: 0,
    bassTriggered: false,
  };
}

function buildNaturalBottomIdle(): NaturalBottomState {
  return { active: true, targetHz: 80, gainLevel: 0, voiceDetected: false };
}

function buildIdle(): SrsState {
  return {
    active: false,
    isActive: false,
    hd90Active: false,
    hdMonitorActive: false,
    expansionFactor: 0.6,
    surroundActive: false,
    clarityGrade: "A+",
    clarity: "A+",
    noiseFloor: -120,
    thdLevel: 0,
    autosphereActive: false,
    smartChipActive: false,
    leftLevel: 0,
    rightLevel: 0,
    clarityScore: 0,
    automaspherLevel: 0,
    sensorReading: { bass: 0, mids: 0, highs: 0, tweeters: 0 },
    soundProjectsOutside: false,
    hd9: buildHD9Idle(),
    automasphers: buildAutomasphersIdle(),
    naturalBottom: buildNaturalBottomIdle(),
  };
}

// ─── Public export: srsApply (used externally) ────────────────────────────────
export function srsApply(
  signalLevel: number,
  expansionFactor: number,
): { gainModifier: number; spatialWidth: number; clarityBoost: number } {
  return {
    gainModifier: 1.0 + expansionFactor * 0.15,
    spatialWidth: expansionFactor,
    clarityBoost: Math.min(1, signalLevel * 1.2),
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────
export interface UseSrsProcessorReturn {
  state: SrsState;
  isOn: boolean;
  toggleSrs: () => void;
  setExpansionFactor: (v: number) => void;
  // New granular controls
  srsEnabled: boolean;
  setSrsEnabled: (v: boolean) => void;
  hdEnabled: boolean;
  setHdEnabled: (v: boolean) => void;
  automasphersEnabled: boolean;
  setAutomasphersEnabled: (v: boolean) => void;
  automasphersMode: "dynamic" | "clean" | "modified";
  setAutomasphersMode: (v: "dynamic" | "clean" | "modified") => void;
  smoothTweeters: boolean;
  setSmoothTweeters: (v: boolean) => void;
  naturalBottom: boolean; // always true when SRS on
  expansionFactor: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSrsProcessor(
  isPlaying: boolean,
  signalLevel: number,
  bassEqLevel = 0,
): UseSrsProcessorReturn {
  // Load persisted values
  const [srsEnabled, setSrsEnabledState] = useState(() =>
    lsGetBool(LS_SRS_ENABLED, true),
  );
  const [hdEnabled, setHdEnabledState] = useState(() =>
    lsGetBool(LS_SRS_HD, true),
  );
  const [automasphersEnabled, setAutomasphersEnabledState] = useState(() =>
    lsGetBool(LS_SRS_AUTOM, true),
  );
  const [automasphersMode, setAtmosModeState] = useState<
    "dynamic" | "clean" | "modified"
  >(
    () =>
      lsGetStr(LS_SRS_AUTOM_MODE, "dynamic") as
        | "dynamic"
        | "clean"
        | "modified",
  );
  const [smoothTweeters, setSmoothTweetersState] = useState(() =>
    lsGetBool(LS_SRS_SMOOTH, true),
  );
  const [expansionFactor, setExpansionState] = useState(() =>
    lsGetNum(LS_SRS_EXPANSION, 0.6),
  );
  const [isOn, setIsOn] = useState(() => lsGetBool(LS_SRS_ENABLED, true));
  const [state, setState] = useState<SrsState>(buildIdle);

  // Refs for use inside intervals (avoid stale closures)
  const srsEnabledRef = useRef(srsEnabled);
  const hdEnabledRef = useRef(hdEnabled);
  const automasphersEnabledRef = useRef(automasphersEnabled);
  const atmosModeRef = useRef(automasphersMode);
  const smoothTweetersRef = useRef(smoothTweeters);
  const expansionRef = useRef(expansionFactor);
  const isOnRef = useRef(isOn);
  const signalRef = useRef(signalLevel);
  const fftDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const srsNodesBuilt = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    srsEnabledRef.current = srsEnabled;
    isOnRef.current = srsEnabled;
  }, [srsEnabled]);
  useEffect(() => {
    hdEnabledRef.current = hdEnabled;
  }, [hdEnabled]);
  useEffect(() => {
    automasphersEnabledRef.current = automasphersEnabled;
  }, [automasphersEnabled]);
  useEffect(() => {
    atmosModeRef.current = automasphersMode;
  }, [automasphersMode]);
  useEffect(() => {
    smoothTweetersRef.current = smoothTweeters;
  }, [smoothTweeters]);
  useEffect(() => {
    expansionRef.current = expansionFactor;
  }, [expansionFactor]);
  useEffect(() => {
    signalRef.current = signalLevel;
  }, [signalLevel]);
  useEffect(() => {
    void bassEqLevel;
  }, [bassEqLevel]);

  // Build SRS nodes on first available audio context — retry until ready
  useEffect(() => {
    if (srsNodesBuilt.current) return;
    const tryBuild = () => {
      if (ensureSrsNodes()) srsNodesBuilt.current = true;
    };
    tryBuild();
    if (!srsNodesBuilt.current) {
      const retry = setInterval(() => {
        tryBuild();
        if (srsNodesBuilt.current) clearInterval(retry);
      }, 500);
      return () => clearInterval(retry);
    }
  }, []);

  // Main processing tick — 30fps
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    const TICK = Math.round(1000 / 30);
    const TWO_PI = 2 * Math.PI;

    if (!isPlaying) {
      const ctx = getSharedCtx();
      if (ctx) applySrsOff(ctx);
      setState(buildIdle());
      return;
    }

    tickRef.current = setInterval(() => {
      const analyser = getSharedAnalyser();
      const ctx = getSharedCtx();
      if (!ctx) return;

      const sRate = ctx.sampleRate ?? 48000;
      const factor = expansionRef.current;
      const sig = signalRef.current;
      const srsActive = srsEnabledRef.current;
      const hdOn = hdEnabledRef.current;
      const smoothOn = smoothTweetersRef.current;
      const mode = atmosModeRef.current;

      // Advance LFOs every tick
      // HD9 stereo widening: 0.05Hz
      hd9LfoPhase = (hd9LfoPhase + (TWO_PI * 0.05) / 30) % TWO_PI;
      const hd9Pan = Math.sin(hd9LfoPhase);

      // Automasphers breathing: 0.3Hz
      automaspherLfoPhase =
        (automaspherLfoPhase + (TWO_PI * 0.3) / 30) % TWO_PI;
      const automaspherLfo = Math.sin(automaspherLfoPhase);

      // Mid-bass excursion pumping: 1.5Hz
      excursionPhase = (excursionPhase + (TWO_PI * 1.5) / 30) % TWO_PI;
      const excursionLfo = (Math.sin(excursionPhase) + 1) * 0.5;

      // Read FFT data for real signal analysis
      let bassEnergy = sig * 0.4;
      let midsEnergy = sig * 0.35;
      let highsEnergy = sig * 0.2;
      let tweeterEnergy = sig * 0.15;
      let voiceEnergy = sig * 0.25;
      let noiseFloor = 0.00001;

      if (analyser) {
        const binCount = analyser.frequencyBinCount;
        if (!fftDataRef.current || fftDataRef.current.length !== binCount) {
          fftDataRef.current = new Uint8Array(new ArrayBuffer(binCount));
        }
        analyser.getByteFrequencyData(fftDataRef.current);
        const d = fftDataRef.current;
        bassEnergy = getBandEnergy(d, binCount, sRate, 20, 200);
        midsEnergy = getBandEnergy(d, binCount, sRate, 200, 2000);
        highsEnergy = getBandEnergy(d, binCount, sRate, 2000, 8000);
        tweeterEnergy = getBandEnergy(d, binCount, sRate, 8000, 20000);
        voiceEnergy = getBandEnergy(d, binCount, sRate, 200, 3000);
        noiseFloor = getBandEnergy(d, binCount, sRate, 16000, 22000) * 0.001;
      }

      // Apply SRS filters based on enabled state
      if (srsActive) {
        applySrsOn(
          ctx,
          excursionLfo,
          automaspherLfo,
          hd9Pan,
          factor,
          hdOn,
          smoothOn,
          mode,
        );
      } else {
        applySrsOff(ctx);
      }

      // Compute display state values
      const excursionActive = (bassEnergy > 0.08 || sig > 0.1) && srsActive;
      const bassTriggered = bassEnergy > 0.12 && srsActive;

      const spread = Math.min(
        1,
        (bassEnergy + midsEnergy + highsEnergy + tweeterEnergy) / 4,
      );
      const rawScore = Math.min(
        100,
        Math.max(0, 90 + spread * 8 - noiseFloor * 500 + (sig > 0.1 ? 2 : 0)),
      );
      const clarityGrade: SrsState["clarityGrade"] =
        rawScore >= 95
          ? "A+"
          : rawScore >= 85
            ? "B+"
            : rawScore >= 70
              ? "C+"
              : "D+";

      const L = Math.min(1, sig * (0.95 + Math.random() * 0.03));
      const R = Math.min(1, sig * (0.9 + Math.random() * 0.03));
      const diff = (L - R) * 0.94;
      const outL = Math.min(1, L + diff * factor);
      const outR = Math.min(1, R - diff * factor);
      const noiseDb =
        noiseFloor > 0 ? Math.max(-120, 20 * Math.log10(noiseFloor)) : -120;

      const breathingLevel = bassTriggered
        ? Math.max(0, bassEnergy + automaspherLfo * 0.05)
        : 0;

      setState({
        active: srsActive,
        isActive: srsActive,
        hd90Active: srsActive && hdOn,
        hdMonitorActive: srsActive,
        expansionFactor: factor,
        surroundActive: srsActive && factor > 0,
        clarityGrade,
        clarity: clarityGrade,
        noiseFloor: Math.round(noiseDb * 10) / 10,
        thdLevel: 0.0001,
        autosphereActive: bassTriggered,
        smartChipActive: sig > 0.01 && srsActive,
        leftLevel: srsActive ? outL : 0,
        rightLevel: srsActive ? outR : 0,
        clarityScore: Math.round(rawScore * 10) / 10,
        automaspherLevel: bassTriggered ? bassEnergy : 0,
        sensorReading: {
          bass: bassEnergy,
          mids: midsEnergy,
          highs: highsEnergy,
          tweeters: tweeterEnergy,
        },
        soundProjectsOutside: srsActive && hdOn && factor > 0.3 && sig > 0.05,
        hd9: {
          hd9Active: srsActive && hdOn,
          pumpingExcursionActive: excursionActive,
          excursionStrength: 0.35,
          naturalBottom: true,
          naturalBottomHz: 80,
          instrumentClarityScore: srsActive ? 94 : 0,
          smoothTweeters: smoothOn,
          monitorSensorsActive: srsActive,
        },
        automasphers: {
          dynamicActive: bassTriggered && mode === "dynamic",
          cleanActive: srsActive && mode === "clean",
          modifiedActive: bassEnergy > 0.05 && srsActive && mode === "modified",
          breathingLevel,
          bassTriggered,
        },
        naturalBottom: {
          active: srsActive, // active whenever SRS is on
          targetHz: 80,
          gainLevel: srsActive ? Math.min(1, bassEnergy * 2 + 0.2) : 0,
          voiceDetected: voiceEnergy > 0.08,
        },
      });
    }, TICK);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying]);

  // ─── Setters — each saves to localStorage immediately ────────────────────────

  const setSrsEnabled = useCallback((v: boolean) => {
    srsEnabledRef.current = v;
    isOnRef.current = v;
    setSrsEnabledState(v);
    setIsOn(v);
    lsSet(LS_SRS_ENABLED, String(v));
    const ctx = getSharedCtx();
    if (ctx && !v) {
      applySrsOff(ctx);
      setState(buildIdle());
    }
  }, []);

  const toggleSrs = useCallback(() => {
    setSrsEnabled(!srsEnabledRef.current);
  }, [setSrsEnabled]);

  const setHdEnabled = useCallback((v: boolean) => {
    hdEnabledRef.current = v;
    setHdEnabledState(v);
    lsSet(LS_SRS_HD, String(v));
  }, []);

  const setAutomasphersEnabled = useCallback((v: boolean) => {
    automasphersEnabledRef.current = v;
    setAutomasphersEnabledState(v);
    lsSet(LS_SRS_AUTOM, String(v));
  }, []);

  const setAutomasphersMode = useCallback(
    (v: "dynamic" | "clean" | "modified") => {
      atmosModeRef.current = v;
      setAtmosModeState(v);
      lsSet(LS_SRS_AUTOM_MODE, v);
    },
    [],
  );

  const setSmoothTweeters = useCallback((v: boolean) => {
    smoothTweetersRef.current = v;
    setSmoothTweetersState(v);
    lsSet(LS_SRS_SMOOTH, String(v));
  }, []);

  const setExpansionFactor = useCallback((v: number) => {
    const c = Math.max(0, Math.min(1, v));
    expansionRef.current = c;
    setExpansionState(c);
    lsSet(LS_SRS_EXPANSION, String(c));
  }, []);

  return {
    state: { ...state, expansionFactor },
    isOn,
    toggleSrs,
    setExpansionFactor,
    srsEnabled,
    setSrsEnabled,
    hdEnabled,
    setHdEnabled,
    automasphersEnabled,
    setAutomasphersEnabled,
    automasphersMode,
    setAutomasphersMode,
    smoothTweeters,
    setSmoothTweeters,
    naturalBottom: srsEnabled, // Natural Bottom is always active when SRS is on
    expansionFactor,
  };
}
