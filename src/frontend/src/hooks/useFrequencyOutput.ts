import { useCallback, useEffect, useRef, useState } from "react";
import { ensureEQuakeNodes } from "./useEQuake";
import {
  getSharedAnalyser,
  getSharedBassFilter,
  getSharedCtx,
  getSharedMidsFilter,
} from "./usePlayer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrequencyBand {
  centerHz: number;
  strength: number; // 0–1
}

export interface FrequencyOutputState {
  bands: FrequencyBand[];
  surroundRadius: number;
  surroundAngle: number;
  projectionActive: boolean;
  bassEqLevel: number;
  allChannelsActive: boolean;
  assignedSpeakerFreqMin: number;
  assignedSpeakerFreqMax: number;
  outputLevel: number;
  dominantFrequency: number;
  outputStrength: number;
  frequencyOutputActive: boolean;
  distortionGateActive: boolean;
}

export type CheaterBeaterStatus = "OFF" | "SENSING" | "ACTIVE";

export interface UseCheaterBeaterReturn {
  status: CheaterBeaterStatus;
  foundationGainDb: number;
  bassEnergy: number;
  switchOn: boolean;
  toggleSwitch: () => void;
  strength: number;
  setStrength: (v: number) => void;
}

export interface UseFrequencyOutputReturn {
  state: FrequencyOutputState;
  frequencyOutputActive: boolean;
  dominantFrequency: number;
  outputStrength: number;
  cheaterBeater: UseCheaterBeaterReturn;
  /** Whether standard 14-60Hz bass is active (false when Cheater Beater switch is ON) */
  standardBassActive: boolean;
  /** Explicit toggle functions for mutual exclusivity */
  toggleCheaterBeater: (on: boolean) => void;
  toggle14to60: (on: boolean) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NUM_BANDS = 30;
const FREQ_MIN = 14;
const FREQ_MAX = 300;
const BAND_STEP = (FREQ_MAX - FREQ_MIN) / NUM_BANDS;

const CHEATER_BASS_DETECT_LOW = 20;
const CHEATER_BASS_DETECT_HIGH = 80;
const CHEATER_ENERGY_THRESHOLD = 0.08;
const CHEATER_STRENGTH_MAX_DB = 12;
const CHEATER_DISTORTION_RMS_CAP = 0.85;
const CHEATER_DIAL_BACK_DB = 1;

const NATURAL_BOTTOM_FREQ = 45;
const NATURAL_BOTTOM_GAIN = 4.0;

const LS_PREFIX = "poweramp_freq_";
function saveLS(key: string, value: boolean | number): void {
  try {
    localStorage.setItem(LS_PREFIX + key, String(value));
  } catch {
    /* */
  }
}
function loadLS(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v !== null ? v === "true" : fallback;
  } catch {
    return fallback;
  }
}
function loadLSNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

function buildIdleBands(): FrequencyBand[] {
  return Array.from({ length: NUM_BANDS }, (_, i) => ({
    centerHz: FREQ_MIN + (i + 0.5) * BAND_STEP,
    strength: 0,
  }));
}

function freqToBin(hz: number, binCount: number, sampleRate: number): number {
  return Math.min(binCount - 1, Math.round((hz / (sampleRate / 2)) * binCount));
}

function buildIdle(): FrequencyOutputState {
  return {
    bands: buildIdleBands(),
    surroundRadius: 0,
    surroundAngle: 0,
    projectionActive: false,
    bassEqLevel: 0,
    allChannelsActive: false,
    assignedSpeakerFreqMin: FREQ_MIN,
    assignedSpeakerFreqMax: FREQ_MAX,
    outputLevel: 0,
    dominantFrequency: 0,
    outputStrength: 1,
    frequencyOutputActive: false,
    distortionGateActive: false,
  };
}

// ─── Sub-bass 14Hz Deep Node (singleton) ─────────────────────────────────────
let subDeepNode: BiquadFilterNode | null = null;
let subDeepInserted = false;
const SUB_DEEP_FREQ = 14;
const SUB_DEEP_GAIN = 8.0;

function insertSubDeepNode(): boolean {
  if (subDeepInserted && subDeepNode) return true;
  const ctx = getSharedCtx();
  const bassF = getSharedBassFilter();
  const midsF = getSharedMidsFilter();
  if (!ctx || !bassF || !midsF) return false;
  try {
    const node = ctx.createBiquadFilter();
    node.type = "lowshelf";
    node.frequency.value = SUB_DEEP_FREQ;
    node.Q.value = 4.0;
    node.gain.value = SUB_DEEP_GAIN;
    try {
      bassF.disconnect(midsF);
    } catch {
      /* */
    }
    bassF.connect(node);
    node.connect(midsF);
    subDeepNode = node;
    subDeepInserted = true;
    return true;
  } catch (e) {
    console.error("[SubDeep] insert error:", e);
    return false;
  }
}

// ─── Cheater Beater Node (singleton) ─────────────────────────────────────────
let cheaterNode: BiquadFilterNode | null = null;
let cheaterInserted = false;

function insertCheaterNode(): boolean {
  if (cheaterInserted && cheaterNode) return true;
  const ctx = getSharedCtx();
  const bassF = getSharedBassFilter();
  const midsF = getSharedMidsFilter();
  if (!ctx || !bassF || !midsF) return false;
  try {
    const cb = ctx.createBiquadFilter();
    cb.type = "peaking";
    cb.frequency.value = 33;
    cb.Q.value = 4.0;
    cb.gain.value = 0;
    bassF.connect(cb);
    cb.connect(midsF);
    cheaterNode = cb;
    cheaterInserted = true;
    return true;
  } catch (e) {
    console.error("[CheaterBeater] insert error:", e);
    return false;
  }
}

// ─── Natural Bottom Node (singleton) ─────────────────────────────────────────
let naturalBottomNode: BiquadFilterNode | null = null;
let naturalBottomInserted = false;

function insertNaturalBottomNode(): boolean {
  if (naturalBottomInserted && naturalBottomNode) return true;
  const ctx = getSharedCtx();
  const bassF = getSharedBassFilter();
  const midsF = getSharedMidsFilter();
  if (!ctx || !bassF || !midsF) return false;
  try {
    const nb = ctx.createBiquadFilter();
    nb.type = "lowshelf";
    nb.frequency.value = NATURAL_BOTTOM_FREQ;
    nb.Q.value = 1.2;
    nb.gain.value = NATURAL_BOTTOM_GAIN;
    bassF.connect(nb);
    nb.connect(midsF);
    naturalBottomNode = nb;
    naturalBottomInserted = true;
    return true;
  } catch (e) {
    console.error("[NaturalBottom] insert error:", e);
    return false;
  }
}

// ─── Mid Bass Excursion LFO (singleton) ──────────────────────────────────────
let _excursionOsc: OscillatorNode | null = null;
let _excursionLfoGain: GainNode | null = null;
let _excursionFilter: BiquadFilterNode | null = null;
let excursionInserted = false;

function insertExcursionNodes(): boolean {
  if (excursionInserted) return true;
  const ctx = getSharedCtx();
  const midsF = getSharedMidsFilter();
  const bassF = getSharedBassFilter();
  if (!ctx || !midsF || !bassF) return false;
  try {
    const ef = ctx.createBiquadFilter();
    ef.type = "peaking";
    ef.frequency.value = 120;
    ef.Q.value = 2.0;
    ef.gain.value = 0;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 1.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 1.5;
    osc.connect(lfoGain);
    lfoGain.connect(ef.gain);
    bassF.connect(ef);
    ef.connect(midsF);
    osc.start();
    _excursionOsc = osc;
    _excursionLfoGain = lfoGain;
    _excursionFilter = ef;
    excursionInserted = true;
    return true;
  } catch (e) {
    console.error("[MidBassExcursion] insert error:", e);
    return false;
  }
}

function getRmsFromAnalyser(analyser: AnalyserNode): number {
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += (buf[i] ?? 0) ** 2;
  return Math.sqrt(sum / buf.length);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFrequencyOutput(
  isPlaying: boolean,
  signalLevel: number,
  bassEqLevel: number,
  speakerFreqMin = FREQ_MIN,
  speakerFreqMax = FREQ_MAX,
  distortionDetected = false,
): UseFrequencyOutputReturn {
  const [state, setState] = useState<FrequencyOutputState>(buildIdle);
  const [cheaterStatus, setCheaterStatus] =
    useState<CheaterBeaterStatus>("OFF");
  const [cheaterGain, setCheaterGain] = useState(0);
  const [cheaterEnergy, setCheaterEnergy] = useState(0);
  const [cheaterSwitchOn, setCheaterSwitchOn] = useState<boolean>(() =>
    loadLS("cheaterOn", false),
  );
  const cheaterSwitchRef = useRef(loadLS("cheaterOn", false));
  const [cheaterStrength, setCheaterStrengthState] = useState<number>(() =>
    loadLSNum("cheaterStrength", 70),
  );
  const cheaterStrengthRef = useRef(loadLSNum("cheaterStrength", 70));

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const bassEqRef = useRef(bassEqLevel);
  const signalRef = useRef(signalLevel);
  const outputStrengthRef = useRef(1.0);
  const distortionRef = useRef(distortionDetected);
  const cheaterGainRef = useRef(0);
  const insertAttempts = useRef(0);

  useEffect(() => {
    bassEqRef.current = bassEqLevel;
  }, [bassEqLevel]);
  useEffect(() => {
    signalRef.current = signalLevel;
  }, [signalLevel]);
  useEffect(() => {
    distortionRef.current = distortionDetected;
  }, [distortionDetected]);

  // Lock bass filter frequency for 14-60Hz response
  useEffect(() => {
    const ctx = getSharedCtx();
    const bassFilter = getSharedBassFilter();
    if (!ctx || !bassFilter) return;
    bassFilter.frequency.setTargetAtTime(40, ctx.currentTime, 0.08);
    bassFilter.Q.setTargetAtTime(0.8, ctx.currentTime, 0.08);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Insert all bass processing nodes lazily
  useEffect(() => {
    if (isPlaying && insertAttempts.current < 30) {
      const tryInsert = () => {
        insertAttempts.current++;
        const subOk = insertSubDeepNode();
        const cbOk = insertCheaterNode();
        const nbOk = insertNaturalBottomNode();
        const excOk = insertExcursionNodes();
        ensureEQuakeNodes();
        if (
          (!subOk || !cbOk || !nbOk || !excOk) &&
          insertAttempts.current < 30
        ) {
          setTimeout(tryInsert, 150);
        } else {
          // Restore mutual exclusivity state
          const ctx = getSharedCtx();
          if (ctx) {
            const now = ctx.currentTime;
            if (cheaterSwitchRef.current) {
              if (subDeepNode) subDeepNode.gain.setTargetAtTime(0, now, 0.05);
            } else {
              if (cheaterNode) cheaterNode.gain.setTargetAtTime(0, now, 0.05);
            }
          }
        }
      };
      tryInsert();
    }
  }, [isPlaying]);

  // ── MUTUAL EXCLUSIVITY ───────────────────────────────────────────────────
  const applyMutualExclusivity = useCallback((cheaterOn: boolean) => {
    const ctx = getSharedCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (cheaterOn) {
      if (subDeepNode) subDeepNode.gain.setTargetAtTime(0, now, 0.05);
    } else {
      if (subDeepNode)
        subDeepNode.gain.setTargetAtTime(SUB_DEEP_GAIN, now, 0.05);
      if (cheaterNode) cheaterNode.gain.setTargetAtTime(0, now, 0.05);
      setCheaterStatus("OFF");
      setCheaterGain(0);
    }
  }, []);

  const toggleCheaterSwitch = useCallback(() => {
    setCheaterSwitchOn((prev) => {
      const next = !prev;
      cheaterSwitchRef.current = next;
      saveLS("cheaterOn", next);
      applyMutualExclusivity(next);
      return next;
    });
  }, [applyMutualExclusivity]);

  const toggleCheaterBeater = useCallback(
    (on: boolean) => {
      cheaterSwitchRef.current = on;
      setCheaterSwitchOn(on);
      saveLS("cheaterOn", on);
      applyMutualExclusivity(on);
    },
    [applyMutualExclusivity],
  );

  const toggle14to60 = useCallback(
    (on: boolean) => {
      if (on) {
        cheaterSwitchRef.current = false;
        setCheaterSwitchOn(false);
        saveLS("cheaterOn", false);
        applyMutualExclusivity(false);
      }
    },
    [applyMutualExclusivity],
  );

  // ── Main processing tick ──────────────────────────────────────────────────
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (!isPlaying) {
      outputStrengthRef.current = 1.0;
      cheaterGainRef.current = 0;
      if (cheaterNode) {
        const ctx = getSharedCtx();
        if (ctx) cheaterNode.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      }
      setState(buildIdle());
      setCheaterStatus("OFF");
      setCheaterGain(0);
      setCheaterEnergy(0);
      return;
    }

    tickRef.current = setInterval(
      () => {
        const analyser = getSharedAnalyser();
        const ctx = getSharedCtx();
        const sRate = ctx?.sampleRate ?? 48000;
        const eqAbs = Math.abs(bassEqRef.current);
        const sig = signalRef.current;
        const switchOn = cheaterSwitchRef.current;

        if (distortionRef.current) {
          outputStrengthRef.current = Math.max(
            0.5,
            outputStrengthRef.current - 0.1,
          );
        } else {
          outputStrengthRef.current = Math.min(
            1.0,
            outputStrengthRef.current + 0.02,
          );
        }
        const outputStrength = outputStrengthRef.current;
        const distortionGateActive = outputStrength < 0.98;

        let bands: FrequencyBand[];
        let dominantFrequency = 0;
        let bassEnergyNorm = 0;

        if (analyser) {
          const binCount = analyser.frequencyBinCount;
          if (!dataRef.current || dataRef.current.length !== binCount) {
            dataRef.current = new Uint8Array(new ArrayBuffer(binCount));
          }
          analyser.getByteFrequencyData(dataRef.current);

          bands = Array.from({ length: NUM_BANDS }, (_, i) => {
            const centerHz = FREQ_MIN + (i + 0.5) * BAND_STEP;
            const bin = freqToBin(centerHz, binCount, sRate);
            const rawStrength = (dataRef.current![bin] ?? 0) / 255;
            return {
              centerHz,
              strength: Math.min(1, rawStrength * outputStrength),
            };
          });

          let maxStrength = 0;
          let maxBin = 0;
          const loB = freqToBin(FREQ_MIN, binCount, sRate);
          const hiB = freqToBin(FREQ_MAX, binCount, sRate);
          for (let i = loB; i <= hiB; i++) {
            const v = dataRef.current![i] ?? 0;
            if (v > maxStrength) {
              maxStrength = v;
              maxBin = i;
            }
          }
          if (maxStrength > 10) {
            dominantFrequency = Math.round((maxBin / binCount) * (sRate / 2));
          }

          // Cheater Beater detection
          const bassLoB = freqToBin(CHEATER_BASS_DETECT_LOW, binCount, sRate);
          const bassHiB = freqToBin(CHEATER_BASS_DETECT_HIGH, binCount, sRate);
          let bassSum = 0;
          const bassCount = Math.max(1, bassHiB - bassLoB + 1);
          for (let i = bassLoB; i <= bassHiB; i++)
            bassSum += (dataRef.current![i] ?? 0) / 255;
          bassEnergyNorm = bassSum / bassCount;

          if (cheaterNode && ctx) {
            const now = ctx.currentTime;
            if (switchOn) {
              if (bassEnergyNorm >= CHEATER_ENERGY_THRESHOLD) {
                let targetGain =
                  (cheaterStrengthRef.current / 100) * CHEATER_STRENGTH_MAX_DB;
                const rms = getRmsFromAnalyser(analyser);
                if (rms > CHEATER_DISTORTION_RMS_CAP) {
                  cheaterGainRef.current = Math.max(
                    0,
                    cheaterGainRef.current - CHEATER_DIAL_BACK_DB,
                  );
                  targetGain = cheaterGainRef.current;
                } else {
                  cheaterGainRef.current = targetGain;
                }
                cheaterNode.gain.setTargetAtTime(targetGain, now, 0.05);
                setCheaterStatus("ACTIVE");
                setCheaterGain(Math.round(targetGain * 10) / 10);
              } else if (bassEnergyNorm > 0.01) {
                cheaterNode.gain.setTargetAtTime(0, now, 0.1);
                cheaterGainRef.current = 0;
                setCheaterStatus("SENSING");
                setCheaterGain(0);
              } else {
                cheaterNode.gain.setTargetAtTime(0, now, 0.15);
                cheaterGainRef.current = 0;
                setCheaterStatus("SENSING");
                setCheaterGain(0);
              }
            } else {
              cheaterNode.gain.setTargetAtTime(0, now, 0.1);
              cheaterGainRef.current = 0;
              setCheaterStatus("OFF");
              setCheaterGain(0);
            }
            setCheaterEnergy(Math.round(bassEnergyNorm * 100) / 100);
          }
        } else {
          bands = Array.from({ length: NUM_BANDS }, (_, i) => ({
            centerHz: FREQ_MIN + (i + 0.5) * BAND_STEP,
            strength: Math.min(
              1,
              sig * outputStrength * (1 - (i / NUM_BANDS) * 0.05),
            ),
          }));
        }

        const surroundRadius = (eqAbs / 15) * 30;
        const projectionActive = eqAbs > 2;

        setState({
          bands,
          surroundRadius: Math.round(surroundRadius * 10) / 10,
          surroundAngle: projectionActive ? 360 : 0,
          projectionActive,
          bassEqLevel: eqAbs,
          allChannelsActive: true,
          assignedSpeakerFreqMin: speakerFreqMin,
          assignedSpeakerFreqMax: speakerFreqMax,
          outputLevel: sig * outputStrength,
          dominantFrequency,
          outputStrength,
          frequencyOutputActive: true,
          distortionGateActive,
        });
      },
      Math.round(1000 / 30),
    );

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying, speakerFreqMin, speakerFreqMax]);

  return {
    state,
    frequencyOutputActive: state.frequencyOutputActive,
    dominantFrequency: state.dominantFrequency,
    outputStrength: state.outputStrength,
    cheaterBeater: {
      status: cheaterStatus,
      foundationGainDb: cheaterGain,
      bassEnergy: cheaterEnergy,
      switchOn: cheaterSwitchOn,
      toggleSwitch: toggleCheaterSwitch,
      strength: cheaterStrength,
      setStrength: (v: number) => {
        const clamped = Math.max(0, Math.min(100, Math.round(v)));
        cheaterStrengthRef.current = clamped;
        setCheaterStrengthState(clamped);
        saveLS("cheaterStrength", clamped);
        if (cheaterSwitchRef.current && cheaterNode) {
          const ctx = getSharedCtx();
          if (ctx) {
            const targetGain = (clamped / 100) * CHEATER_STRENGTH_MAX_DB;
            cheaterNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.03);
            cheaterGainRef.current = targetGain;
          }
        }
      },
    },
    standardBassActive: !cheaterSwitchOn,
    toggleCheaterBeater,
    toggle14to60,
  };
}
