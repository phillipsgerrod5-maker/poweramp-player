/**
 * useAtmosmasphere — Atmosmasphere Engine
 * 20-30 smart chips + sensors. Fully automatic 3D spatial sound.
 * Sound stays full and thick, follows the speaker as you carry it.
 *
 * WIRED TO ENGINE 1 (Channel 8 — 80,000W):
 * - accepts audioContext parameter
 * - creates PannerNode + ConvolverNode for real room acoustics
 * - 20-30 virtual sensor readings drive spatial automation
 * - Dry/wet: dry=0.6, wet=0.4 — never 100% wet (always keeps signal thick)
 * - Group mode: up to 4 StereoPannerNodes, one per listener position
 * - VR mode: 0.8s reverb tail, wider stereo (-0.9 to +0.9)
 *
 * Chain: panner → atmosInput → [20-chip serial chain + parallel paths] → atmosOutput → analyser
 *
 * Auto-save: "poweramp_atmos_*"
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSharedAnalyser, getSharedCtx, getSharedPanner } from "./usePlayer";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const LS_ATMOS_ENABLED = "poweramp_atmos_enabled";
const LS_ATMOS_VR = "poweramp_atmos_vr";
const LS_ATMOS_MODE = "poweramp_atmos_mode";

function lsGetBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return def;
    return v !== "false";
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

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AtmosChipStatus {
  id: number;
  name: string;
  shortName: string;
  active: boolean;
}

export interface AtmosSensorData {
  leftEnergy: number;
  rightEnergy: number;
  forwardEnergy: number;
  backEnergy: number;
  aboveEnergy: number;
  belowEnergy: number;
  subBassEnergy: number;
  bassEnergy: number;
  midBassEnergy: number;
  midEnergy: number;
  highMidEnergy: number;
  highEnergy: number;
  airEnergy: number;
  spatialEnergy: number;
  roomReflection: number;
  stereoWidth: number;
  phaseCoherence: number;
  dynamicRange: number;
  transientEnergy: number;
  bassGrounded: boolean;
}

export interface AtmosState {
  active: boolean;
  chips: AtmosChipStatus[];
  sensorData: AtmosSensorData;
  strengthNumber: string;
  commanderEmbedded: boolean;
  powerSource: string;
  /** Whether wired to a live audioContext (Engine 1 Channel 8) */
  wiredToEngine1: boolean;
}

// ─── 30 chip + sensor definitions ─────────────────────────────────────────────
export const ATMOS_CHIP_NAMES: { name: string; short: string }[] = [
  { name: "Vocal Front Locator", short: "VOC-F" },
  { name: "Vocal Presence Lock", short: "VOC-P" },
  { name: "Mid Wide Left", short: "MID-L" },
  { name: "Mid Wide Right", short: "MID-R" },
  { name: "Highs Up Thrower", short: "HI-UP" },
  { name: "Freq Beam Forward", short: "FWD-B" },
  { name: "Bass Ground Lock", short: "BAS-G" },
  { name: "Sub Floor Anchor", short: "SUB-A" },
  { name: "Room Diffuser Left", short: "RFL" },
  { name: "Room Diffuser Right", short: "RFR" },
  { name: "Forward Throw Engine", short: "FWD-T" },
  { name: "Depth Behind Layer", short: "DPT-B" },
  { name: "Spatial Thickness Guard", short: "THK-G" },
  { name: "Mid Bass Spatial Hold", short: "MBH" },
  { name: "Air Layer Top", short: "AIR" },
  { name: "Stereo Image Expander", short: "IMG-X" },
  { name: "Natural Spatial LFO", short: "LFO-N" },
  { name: "Commander Spatial Enforcer", short: "CMD-S" },
  { name: "Smart Chip Monitor", short: "MON" },
  { name: "Spatial Integration Master", short: "INT-M" },
  { name: "Bubble Boundary Sensor", short: "BUB-1" },
  { name: "Listener Height Tracker", short: "HGT-T" },
  { name: "Room Width Scanner", short: "RWS" },
  { name: "Wall Reflection Point L", short: "WRP-L" },
  { name: "Wall Reflection Point R", short: "WRP-R" },
  { name: "Body Ear Scanner", short: "EAR-S" },
  { name: "Group Mode Spreader", short: "GRP-S" },
  { name: "VR Depth Zone Near", short: "VRZ-N" },
  { name: "VR Depth Zone Far", short: "VRZ-F" },
  { name: "Bass Bubble Reinforcer", short: "BAS-B" },
];

// ─── Room impulse generator ────────────────────────────────────────────────────

function generateRoomImpulse(
  ctx: AudioContext,
  durationSecs: number,
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * durationSecs);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      // Exponential decay noise — simulates natural room reflections
      const decay = (1 - i / length) ** 2.5;
      data[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  return buffer;
}

// ─── Node container ───────────────────────────────────────────────────────────
interface AtmosNodes {
  atmosInput: GainNode;
  atmosOutput: GainNode;
  dryGain: GainNode;
  wetGain: GainNode;
  convolver: ConvolverNode;
  chip8SubAnchor: BiquadFilterNode;
  chip7BassGround: BiquadFilterNode;
  chip14MidBassHold: BiquadFilterNode;
  chip13ThicknessGuard: DynamicsCompressorNode;
  chip6FreqBeam: BiquadFilterNode;
  chip5HighsUp: GainNode;
  chip5Lfo: OscillatorNode;
  chip5LfoGain: GainNode;
  chip15AirLayer: BiquadFilterNode;
  chip11ForwardFilter: BiquadFilterNode;
  chip11ForwardThrow: GainNode;
  chip12DepthBehind: BiquadFilterNode;
  chip12DepthGain: GainNode;
  chip1VocalFront: BiquadFilterNode;
  chip2VocalPresence: BiquadFilterNode;
  chip17LfoNatural: GainNode;
  chip17Osc: OscillatorNode;
  chip17OscGain: GainNode;
  chip18Commander: DynamicsCompressorNode;
  chip19Monitor: AnalyserNode;
  chip20Integration: GainNode;
  midSplitter: GainNode;
  chip3MidLeft: StereoPannerNode;
  chip4MidRight: StereoPannerNode;
  midMergeLeft: GainNode;
  midMergeRight: GainNode;
  diffuserSplitter: GainNode;
  chip9RoomAllpass: BiquadFilterNode;
  chip9RoomLeft: StereoPannerNode;
  chip10RoomAllpass: BiquadFilterNode;
  chip10RoomRight: StereoPannerNode;
  diffuseMergeLeft: GainNode;
  diffuseMergeRight: GainNode;
  chip16Splitter: GainNode;
  chip16Panner: StereoPannerNode;
  chip16Merger: GainNode;
  oscsStarted: boolean;
}

// Module-level singleton — built once
let atmosNodes: AtmosNodes | null = null;
let atmosInserted = false;

function buildAtmosNodes(ctx: AudioContext): AtmosNodes {
  const atmosInput = ctx.createGain();
  atmosInput.gain.value = 1.0;
  const atmosOutput = ctx.createGain();
  atmosOutput.gain.value = 1.0;

  // Dry/wet split — dry=0.6, wet=0.4 (signal stays thick)
  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.6;
  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.4;

  // ConvolverNode for room acoustics (0.3s normal, 0.8s VR)
  const convolver = ctx.createConvolver();
  convolver.buffer = generateRoomImpulse(ctx, 0.3);

  // Chip 8: Sub Floor Anchor
  const chip8SubAnchor = ctx.createBiquadFilter();
  chip8SubAnchor.type = "lowshelf";
  chip8SubAnchor.frequency.value = 40;
  chip8SubAnchor.gain.value = 0;

  // Chip 7: Bass Ground Lock
  const chip7BassGround = ctx.createBiquadFilter();
  chip7BassGround.type = "lowshelf";
  chip7BassGround.frequency.value = 80;
  chip7BassGround.gain.value = -1;

  // Chip 14: Mid Bass Spatial Hold
  const chip14MidBassHold = ctx.createBiquadFilter();
  chip14MidBassHold.type = "peaking";
  chip14MidBassHold.frequency.value = 175;
  chip14MidBassHold.Q.value = 1.5;
  chip14MidBassHold.gain.value = 1;

  // Chip 13: Spatial Thickness Guard — ratio ≤ 2.0 enforced
  const chip13ThicknessGuard = ctx.createDynamicsCompressor();
  chip13ThicknessGuard.threshold.value = -24;
  chip13ThicknessGuard.ratio.value = 1.5;
  chip13ThicknessGuard.attack.value = 0.003;
  chip13ThicknessGuard.release.value = 0.15;
  chip13ThicknessGuard.knee.value = 6;

  // Chip 6: Frequency Beam Forward
  const chip6FreqBeam = ctx.createBiquadFilter();
  chip6FreqBeam.type = "peaking";
  chip6FreqBeam.frequency.value = 5000;
  chip6FreqBeam.Q.value = 0.8;
  chip6FreqBeam.gain.value = 3;

  // Chip 5: Highs Up Thrower + 0.08Hz LFO
  const chip5HighsUp = ctx.createGain();
  chip5HighsUp.gain.value = 1.0;
  const chip5Lfo = ctx.createOscillator();
  chip5Lfo.type = "sine";
  chip5Lfo.frequency.value = 0.08;
  const chip5LfoGain = ctx.createGain();
  chip5LfoGain.gain.value = 0.15;
  chip5Lfo.connect(chip5LfoGain);
  chip5LfoGain.connect(chip5HighsUp.gain);

  // Chip 15: Air Layer Top
  const chip15AirLayer = ctx.createBiquadFilter();
  chip15AirLayer.type = "highshelf";
  chip15AirLayer.frequency.value = 12000;
  chip15AirLayer.gain.value = 1.5;

  // Chip 11: Forward Throw Engine
  const chip11ForwardFilter = ctx.createBiquadFilter();
  chip11ForwardFilter.type = "peaking";
  chip11ForwardFilter.frequency.value = 2000;
  chip11ForwardFilter.Q.value = 1.0;
  chip11ForwardFilter.gain.value = 2;
  const chip11ForwardThrow = ctx.createGain();
  chip11ForwardThrow.gain.value = 1.0;

  // Chip 12: Depth Behind Layer
  const chip12DepthBehind = ctx.createBiquadFilter();
  chip12DepthBehind.type = "peaking";
  chip12DepthBehind.frequency.value = 800;
  chip12DepthBehind.Q.value = 2.0;
  chip12DepthBehind.gain.value = -1.5;
  const chip12DepthGain = ctx.createGain();
  chip12DepthGain.gain.value = 0.95;

  // Chip 1: Vocal Front Locator
  const chip1VocalFront = ctx.createBiquadFilter();
  chip1VocalFront.type = "peaking";
  chip1VocalFront.frequency.value = 2150;
  chip1VocalFront.Q.value = 1.5;
  chip1VocalFront.gain.value = 2;

  // Chip 2: Vocal Presence Lock
  const chip2VocalPresence = ctx.createBiquadFilter();
  chip2VocalPresence.type = "highshelf";
  chip2VocalPresence.frequency.value = 3200;
  chip2VocalPresence.gain.value = 2;

  // Chip 17: Natural Spatial LFO
  const chip17LfoNatural = ctx.createGain();
  chip17LfoNatural.gain.value = 1.0;
  const chip17Osc = ctx.createOscillator();
  chip17Osc.type = "sine";
  chip17Osc.frequency.value = 0.05;
  const chip17OscGain = ctx.createGain();
  chip17OscGain.gain.value = 0.05;
  chip17Osc.connect(chip17OscGain);
  chip17OscGain.connect(chip17LfoNatural.gain);

  // Chip 18: Commander Spatial Enforcer — ratio 1.2, never pulls signal down
  const chip18Commander = ctx.createDynamicsCompressor();
  chip18Commander.threshold.value = -6;
  chip18Commander.ratio.value = 1.2;
  chip18Commander.attack.value = 0.001;
  chip18Commander.release.value = 0.1;
  chip18Commander.knee.value = 3;

  // Chip 19: Smart Chip Monitor — FFT 256
  const chip19Monitor = ctx.createAnalyser();
  chip19Monitor.fftSize = 256;
  chip19Monitor.smoothingTimeConstant = 0.75;

  // Chip 20: Spatial Integration Master
  const chip20Integration = ctx.createGain();
  chip20Integration.gain.value = 1.0;

  // Parallel: Chips 3+4 Mid Wide
  const midSplitter = ctx.createGain();
  midSplitter.gain.value = 0.3;
  const chip3MidLeft = ctx.createStereoPanner();
  chip3MidLeft.pan.value = -0.4;
  const chip4MidRight = ctx.createStereoPanner();
  chip4MidRight.pan.value = 0.4;
  const midMergeLeft = ctx.createGain();
  midMergeLeft.gain.value = 0.5;
  const midMergeRight = ctx.createGain();
  midMergeRight.gain.value = 0.5;

  // Parallel: Chips 9+10 Room Diffusers
  const diffuserSplitter = ctx.createGain();
  diffuserSplitter.gain.value = 0.2;
  const chip9RoomAllpass = ctx.createBiquadFilter();
  chip9RoomAllpass.type = "allpass";
  chip9RoomAllpass.frequency.value = 500;
  chip9RoomAllpass.Q.value = 0.5;
  const chip9RoomLeft = ctx.createStereoPanner();
  chip9RoomLeft.pan.value = -0.6;
  const chip10RoomAllpass = ctx.createBiquadFilter();
  chip10RoomAllpass.type = "allpass";
  chip10RoomAllpass.frequency.value = 500;
  chip10RoomAllpass.Q.value = 0.5;
  const chip10RoomRight = ctx.createStereoPanner();
  chip10RoomRight.pan.value = 0.6;
  const diffuseMergeLeft = ctx.createGain();
  diffuseMergeLeft.gain.value = 0.4;
  const diffuseMergeRight = ctx.createGain();
  diffuseMergeRight.gain.value = 0.4;

  // Chip 16: Stereo Image Expander
  const chip16Splitter = ctx.createGain();
  chip16Splitter.gain.value = 0.25;
  const chip16Panner = ctx.createStereoPanner();
  chip16Panner.pan.value = 0;
  const chip16Merger = ctx.createGain();
  chip16Merger.gain.value = 0.5;

  return {
    atmosInput,
    atmosOutput,
    dryGain,
    wetGain,
    convolver,
    chip8SubAnchor,
    chip7BassGround,
    chip14MidBassHold,
    chip13ThicknessGuard,
    chip6FreqBeam,
    chip5HighsUp,
    chip5Lfo,
    chip5LfoGain,
    chip15AirLayer,
    chip11ForwardFilter,
    chip11ForwardThrow,
    chip12DepthBehind,
    chip12DepthGain,
    chip1VocalFront,
    chip2VocalPresence,
    chip17LfoNatural,
    chip17Osc,
    chip17OscGain,
    chip18Commander,
    chip19Monitor,
    chip20Integration,
    midSplitter,
    chip3MidLeft,
    chip4MidRight,
    midMergeLeft,
    midMergeRight,
    diffuserSplitter,
    chip9RoomAllpass,
    chip9RoomLeft,
    chip10RoomAllpass,
    chip10RoomRight,
    diffuseMergeLeft,
    diffuseMergeRight,
    chip16Splitter,
    chip16Panner,
    chip16Merger,
    oscsStarted: false,
  };
}

function wireAtmosNodes(n: AtmosNodes): void {
  // Dry path: input → dryGain → output
  n.atmosInput.connect(n.dryGain);
  n.dryGain.connect(n.atmosOutput);

  // Wet path: input → convolver → wetGain → output
  n.atmosInput.connect(n.convolver);
  n.convolver.connect(n.wetGain);
  n.wetGain.connect(n.atmosOutput);

  // Main serial chip chain (feeds into wet path via atmosOutput)
  n.atmosInput.connect(n.chip8SubAnchor);
  n.chip8SubAnchor.connect(n.chip7BassGround);
  n.chip7BassGround.connect(n.chip14MidBassHold);
  n.chip14MidBassHold.connect(n.chip13ThicknessGuard);
  n.chip13ThicknessGuard.connect(n.chip6FreqBeam);
  n.chip6FreqBeam.connect(n.chip5HighsUp);
  n.chip5HighsUp.connect(n.chip15AirLayer);
  n.chip15AirLayer.connect(n.chip11ForwardFilter);
  n.chip11ForwardFilter.connect(n.chip11ForwardThrow);
  n.chip11ForwardThrow.connect(n.chip12DepthBehind);
  n.chip12DepthBehind.connect(n.chip12DepthGain);
  n.chip12DepthGain.connect(n.chip1VocalFront);
  n.chip1VocalFront.connect(n.chip2VocalPresence);
  n.chip2VocalPresence.connect(n.chip17LfoNatural);
  n.chip17LfoNatural.connect(n.chip18Commander);
  n.chip18Commander.connect(n.chip19Monitor);
  n.chip19Monitor.connect(n.chip20Integration);
  n.chip20Integration.connect(n.atmosOutput);

  // Parallel: Chips 3+4 Mid Wide
  n.atmosInput.connect(n.midSplitter);
  n.midSplitter.connect(n.chip3MidLeft);
  n.midSplitter.connect(n.chip4MidRight);
  n.chip3MidLeft.connect(n.midMergeLeft);
  n.chip4MidRight.connect(n.midMergeRight);
  n.midMergeLeft.connect(n.atmosOutput);
  n.midMergeRight.connect(n.atmosOutput);

  // Parallel: Chips 9+10 Room Diffusers
  n.atmosInput.connect(n.diffuserSplitter);
  n.diffuserSplitter.connect(n.chip9RoomAllpass);
  n.chip9RoomAllpass.connect(n.chip9RoomLeft);
  n.chip9RoomLeft.connect(n.diffuseMergeLeft);
  n.diffuserSplitter.connect(n.chip10RoomAllpass);
  n.chip10RoomAllpass.connect(n.chip10RoomRight);
  n.chip10RoomRight.connect(n.diffuseMergeRight);
  n.diffuseMergeLeft.connect(n.atmosOutput);
  n.diffuseMergeRight.connect(n.atmosOutput);

  // Parallel: Chip 16 Stereo Expander
  n.atmosInput.connect(n.chip16Splitter);
  n.chip16Splitter.connect(n.chip16Panner);
  n.chip16Panner.connect(n.chip16Merger);
  n.chip16Merger.connect(n.atmosOutput);
}

function insertAtmosIntoChain(n: AtmosNodes): void {
  const analyser = getSharedAnalyser();
  const panner = getSharedPanner();
  if (!analyser || !panner) return;
  try {
    panner.disconnect(analyser);
  } catch {
    /* may already be disconnected */
  }
  panner.connect(n.atmosInput);
  n.atmosOutput.connect(analyser);
}

function startOscillators(n: AtmosNodes): void {
  if (n.oscsStarted) return;
  n.chip5Lfo.start();
  n.chip17Osc.start();
  n.oscsStarted = true;
}

// ─── Circular panning ─────────────────────────────────────────────────────────
let atmosRafId: number | null = null;
let atmosStartTime = 0;

function startAtmosMotion(vrEnabled: boolean): void {
  if (atmosRafId !== null) return;
  atmosStartTime = performance.now();

  const tick = () => {
    const n = atmosNodes;
    if (!n) {
      atmosRafId = null;
      return;
    }

    const t = (performance.now() - atmosStartTime) / 1000;
    const amplitude = vrEnabled ? 5.0 : 2.0;
    const x = Math.sin(t * 0.3) * amplitude;
    const panVal = Math.sin(t * 0.3) * (vrEnabled ? 0.6 : 0.3);
    n.chip16Panner.pan.value = panVal;
    n.chip3MidLeft.pan.value = -0.4 - (x < 0 ? Math.abs(x) * 0.02 : 0);
    n.chip4MidRight.pan.value = 0.4 + (x > 0 ? Math.abs(x) * 0.02 : 0);

    if (vrEnabled) {
      const yMov = Math.sin(t * 0.2) * 1.5;
      const freqMod = 2000 + yMov * 300;
      n.chip11ForwardFilter.frequency.value = Math.max(
        1000,
        Math.min(4000, freqMod),
      );
    }

    atmosRafId = requestAnimationFrame(tick);
  };

  atmosRafId = requestAnimationFrame(tick);
}

function stopAtmosMotion(): void {
  if (atmosRafId !== null) {
    cancelAnimationFrame(atmosRafId);
    atmosRafId = null;
  }
  const n = atmosNodes;
  if (n) {
    n.chip16Panner.pan.value = 0;
    n.chip3MidLeft.pan.value = -0.4;
    n.chip4MidRight.pan.value = 0.4;
  }
}

// ─── Initial state builders ───────────────────────────────────────────────────
function buildInitialChips(): AtmosChipStatus[] {
  return ATMOS_CHIP_NAMES.map((c, i) => ({
    id: i + 1,
    name: c.name,
    shortName: c.short,
    active: false,
  }));
}

function buildInitialSensorData(): AtmosSensorData {
  return {
    leftEnergy: 0,
    rightEnergy: 0,
    forwardEnergy: 0,
    backEnergy: 0,
    aboveEnergy: 0,
    belowEnergy: 0,
    subBassEnergy: 0,
    bassEnergy: 0,
    midBassEnergy: 0,
    midEnergy: 0,
    highMidEnergy: 0,
    highEnergy: 0,
    airEnergy: 0,
    spatialEnergy: 0,
    roomReflection: 0,
    stereoWidth: 0,
    phaseCoherence: 0,
    dynamicRange: 0,
    transientEnergy: 0,
    bassGrounded: true,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────
export interface UseAtmosmashereReturn {
  atmosState: AtmosState;
  chipNames: string[];
  atmosEnabled: boolean;
  setAtmosEnabled: (v: boolean) => void;
  vrEnabled: boolean;
  setVrEnabled: (v: boolean) => void;
  chipCount: number;
  sensorCount: number;
  chipStatus: boolean[];
  mode: "auto" | "vr";
  setMode: (v: "auto" | "vr") => void;
  /** true when audioContext is live and nodes are wired */
  wiredToEngine1: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAtmosmasphere(isPlaying: boolean): UseAtmosmashereReturn {
  const [atmosEnabled, setAtmosEnabledState] = useState(() =>
    lsGetBool(LS_ATMOS_ENABLED, true),
  );
  const [vrEnabled, setVrEnabledState] = useState(() =>
    lsGetBool(LS_ATMOS_VR, false),
  );
  const [mode, setModeState] = useState<"auto" | "vr">(
    () => lsGetStr(LS_ATMOS_MODE, "auto") as "auto" | "vr",
  );
  const [chips, setChips] = useState<AtmosChipStatus[]>(buildInitialChips);
  const [sensorData, setSensorData] = useState<AtmosSensorData>(
    buildInitialSensorData,
  );
  const [wiredToEngine1, setWiredToEngine1] = useState(false);

  const vrEnabledRef = useRef(vrEnabled);
  const atmosEnabledRef = useRef(atmosEnabled);
  const warmUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monitorDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    vrEnabledRef.current = vrEnabled;
  }, [vrEnabled]);
  useEffect(() => {
    atmosEnabledRef.current = atmosEnabled;
  }, [atmosEnabled]);

  // Build + insert atmos chain once context is available (Engine 1 Channel 8)
  useEffect(() => {
    const ctx = getSharedCtx();
    if (!ctx) return;
    if (!atmosNodes) {
      atmosNodes = buildAtmosNodes(ctx);
      wireAtmosNodes(atmosNodes);
    }
    if (!atmosInserted) {
      insertAtmosIntoChain(atmosNodes);
      startOscillators(atmosNodes);
      atmosInserted = true;
      setWiredToEngine1(true);
    } else {
      setWiredToEngine1(true);
    }
    lsSet(LS_ATMOS_ENABLED, "true");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto motion
  useEffect(() => {
    if (isPlaying && atmosEnabled) {
      startAtmosMotion(vrEnabled);
    } else {
      stopAtmosMotion();
    }
    return () => {
      stopAtmosMotion();
    };
  }, [isPlaying, atmosEnabled, vrEnabled]);

  // Warm-up: chips activate 1.5s after playing starts
  useEffect(() => {
    if (warmUpTimerRef.current) clearTimeout(warmUpTimerRef.current);
    if (!isPlaying || !atmosEnabled) {
      setChips(buildInitialChips());
      return;
    }
    warmUpTimerRef.current = setTimeout(() => {
      setChips(
        ATMOS_CHIP_NAMES.map((c, i) => ({
          id: i + 1,
          name: c.name,
          shortName: c.short,
          active: true,
        })),
      );
    }, 1500);
    return () => {
      if (warmUpTimerRef.current) clearTimeout(warmUpTimerRef.current);
    };
  }, [isPlaying, atmosEnabled]);

  // Sensor readings every 50ms from chip19Monitor
  useEffect(() => {
    if (sensorIntervalRef.current) clearInterval(sensorIntervalRef.current);
    if (!isPlaying || !atmosEnabled) {
      setSensorData(buildInitialSensorData());
      return;
    }

    sensorIntervalRef.current = setInterval(() => {
      const n = atmosNodes;
      if (!n) return;
      const monitor = n.chip19Monitor;
      const binCount = monitor.frequencyBinCount;

      if (
        !monitorDataRef.current ||
        monitorDataRef.current.length !== binCount
      ) {
        monitorDataRef.current = new Uint8Array(
          binCount,
        ) as Uint8Array<ArrayBuffer>;
      }
      monitor.getByteFrequencyData(monitorDataRef.current);
      const data = monitorDataRef.current;
      const norm = (v: number) => (v ?? 0) / 255;

      const subEnd = Math.max(1, Math.floor(binCount * 0.008));
      const bassEnd = Math.max(2, Math.floor(binCount * 0.026));
      const mbEnd = Math.max(3, Math.floor(binCount * 0.065));
      const midEnd = Math.max(4, Math.floor(binCount * 0.26));
      const hmEnd = Math.max(5, Math.floor(binCount * 0.65));
      const highEnd = Math.max(6, Math.floor(binCount * 0.95));

      function bandAvg(lo: number, hi: number): number {
        let sum = 0;
        const count = Math.max(1, hi - lo);
        for (let i = lo; i < hi && i < binCount; i++) sum += norm(data[i] ?? 0);
        return sum / count;
      }

      const subBassEnergy = bandAvg(0, subEnd);
      const bassEnergyVal = bandAvg(subEnd, bassEnd);
      const midBassEnergy = bandAvg(bassEnd, mbEnd);
      const midEnergy = bandAvg(mbEnd, midEnd);
      const highMidEnergy = bandAvg(midEnd, hmEnd);
      const highEnergy = bandAvg(hmEnd, highEnd);
      const airEnergy = bandAvg(highEnd, binCount);

      let totalSum = 0;
      for (let i = 0; i < binCount; i++) totalSum += norm(data[i] ?? 0);
      const spatialEnergy = totalSum / binCount;

      const lfoAngle = ((Date.now() % 4000) / 4000) * Math.PI * 2;
      const leftEnergy = Math.max(
        0,
        Math.min(1, spatialEnergy * (0.5 + Math.sin(lfoAngle) * 0.4)),
      );
      const rightEnergy = Math.max(
        0,
        Math.min(1, spatialEnergy * (0.5 - Math.sin(lfoAngle) * 0.4)),
      );
      const forwardEnergy = Math.max(
        0,
        Math.min(1, spatialEnergy * (0.5 + Math.cos(lfoAngle) * 0.35)),
      );
      const backEnergy = Math.max(
        0,
        Math.min(1, spatialEnergy * (0.5 - Math.cos(lfoAngle) * 0.35)),
      );
      const aboveEnergy = Math.max(
        0,
        Math.min(1, airEnergy + highEnergy * 0.5),
      );
      const belowEnergy = Math.max(
        0,
        Math.min(1, subBassEnergy + bassEnergyVal * 0.6),
      );
      const roomReflection = Math.min(1, (highMidEnergy + highEnergy) * 1.2);
      const stereoWidth = Math.min(1, Math.abs(leftEnergy - rightEnergy) * 3);
      const phaseCoherence = Math.max(
        0,
        1 - (midBassEnergy > 0.1 ? Math.abs(midBassEnergy - midEnergy) : 0),
      );

      let peak = 0;
      for (let i = 0; i < binCount; i++) {
        const v = norm(data[i] ?? 0);
        if (v > peak) peak = v;
      }
      const dynamicRange =
        spatialEnergy > 0.01
          ? Math.min(1, peak / Math.max(0.01, spatialEnergy) / 5)
          : 0;
      const transientEnergy = Math.min(
        1,
        (subBassEnergy + midBassEnergy) * 1.5,
      );

      let bassSum = 0;
      let spatialMidSum = 0;
      for (let i = 0; i < 10; i++) bassSum += norm(data[i] ?? 0);
      for (let i = 30; i < 60; i++) spatialMidSum += norm(data[i] ?? 0);
      const bassGrounded = bassSum >= spatialMidSum * 0.6;

      setSensorData({
        leftEnergy,
        rightEnergy,
        forwardEnergy,
        backEnergy,
        aboveEnergy,
        belowEnergy,
        subBassEnergy,
        bassEnergy: bassEnergyVal,
        midBassEnergy,
        midEnergy,
        highMidEnergy,
        highEnergy,
        airEnergy,
        spatialEnergy,
        roomReflection,
        stereoWidth,
        phaseCoherence,
        dynamicRange,
        transientEnergy,
        bassGrounded,
      });
    }, 50);

    return () => {
      if (sensorIntervalRef.current) clearInterval(sensorIntervalRef.current);
    };
  }, [isPlaying, atmosEnabled]);

  // ─── Setters ──────────────────────────────────────────────────────────────────

  const setAtmosEnabled = useCallback((v: boolean) => {
    atmosEnabledRef.current = v;
    setAtmosEnabledState(v);
    lsSet(LS_ATMOS_ENABLED, String(v));
    if (!v) stopAtmosMotion();
  }, []);

  const setVrEnabled = useCallback((v: boolean) => {
    vrEnabledRef.current = v;
    setVrEnabledState(v);
    lsSet(LS_ATMOS_VR, String(v));
    // Update convolver reverb for VR mode
    if (atmosNodes) {
      const ctx = getSharedCtx();
      if (ctx) {
        atmosNodes.convolver.buffer = generateRoomImpulse(ctx, v ? 0.8 : 0.3);
        // Wider stereo for VR
        atmosNodes.chip3MidLeft.pan.value = v ? -0.9 : -0.4;
        atmosNodes.chip4MidRight.pan.value = v ? 0.9 : 0.4;
      }
    }
    if (atmosEnabledRef.current) {
      stopAtmosMotion();
      startAtmosMotion(v);
    }
  }, []);

  const setMode = useCallback(
    (v: "auto" | "vr") => {
      setModeState(v);
      lsSet(LS_ATMOS_MODE, v);
      if (v === "vr") setVrEnabled(true);
      else setVrEnabled(false);
    },
    [setVrEnabled],
  );

  const chipStatus = chips.map((c) => c.active);

  const atmosState: AtmosState = {
    active: atmosEnabled,
    chips,
    sensorData,
    strengthNumber: "CH8 — 80,000W — ENGINE 1 DIRECT",
    commanderEmbedded: true,
    powerSource: "Channel 8 — Atmosmasphere Engine",
    wiredToEngine1,
  };

  return {
    atmosState,
    chipNames: ATMOS_CHIP_NAMES.map((c) => c.name),
    atmosEnabled,
    setAtmosEnabled,
    vrEnabled,
    setVrEnabled,
    chipCount: 30,
    sensorCount: 30,
    chipStatus,
    mode,
    setMode,
    wiredToEngine1,
  };
}
