/**
 * useSoundBeaming — Sound Beaming + VR Bubble System
 * Hidden inside the Stabilizer (inside Signal Booster) — Engine 1 powered.
 * Bass: omnidirectional fill. Mids + Highs: HRTF beam to each listener.
 * Personal bubble seals around each listener (360°). Front room wall reflections.
 * VR mode: fly-past sweep L-R. Group mode: all listeners simultaneously.
 * Volume follows main PowerAmp Player volume — no separate volume.
 * Auto-saves to localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSharedAnalyser, getSharedCtx } from "./usePlayer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DepthZone = "near" | "mid" | "far";

export interface BeamListener {
  id: number;
  label: string;
  /** 3D position in metres from phone centre */
  x: number;
  y: number;
  z: number;
  bubbleRadius: number;
  active: boolean;
}

export interface BodyScanData {
  headAngle: number; // -1 to 1
  earL: number; // 0-1
  earR: number; // 0-1
  shoulderWidth: number; // normalised 0-1
  heightFt: number; // 5-7
  chestEnergy: number;
  handsEnergy: number;
  [key: string]: number;
}

export interface SoundBeamingState {
  beamActive: boolean;
  groupMode: boolean;
  wallMapping: boolean;
  vrMode: boolean;
  phoneSpeakerMode: boolean;
  roomWidth: number; // feet, 5-20
  heightFt: number; // 5-7
  beamStrength: number; // 0-100
  vrDepth: DepthZone;
  listeners: BeamListener[];
  bodyScan: BodyScanData;
  engine1Power: string;
  bubbleStatus: "SEALED" | "STANDBY";
  sensorEnergy: number;
}

export interface UseSoundBeamingReturn extends SoundBeamingState {
  toggleBeam: () => void;
  toggleGroupMode: () => void;
  toggleWallMapping: () => void;
  toggleVrMode: () => void;
  togglePhoneSpeaker: () => void;
  setRoomWidth: (v: number) => void;
  setHeightFt: (v: number) => void;
  setBeamStrength: (v: number) => void;
  setVrDepth: (z: DepthZone) => void;
}

// ─── Default listeners (10 slots) ────────────────────────────────────────────

function makeDefaultListeners(): BeamListener[] {
  const positions: [number, number, number][] = [
    [0, 0, -2], // 1 – directly in front
    [-2, 0, -2], // 2 – left front
    [2, 0, -2], // 3 – right front
    [-4, 0, -1], // 4 – far left
    [4, 0, -1], // 5 – far right
    [0, 0, -5], // 6 – centre back
    [-3, 0, -5], // 7 – back left
    [3, 0, -5], // 8 – back right
    [-6, 0, -3], // 9 – wall left
    [6, 0, -3], // 10 – wall right
  ];
  return positions.map(([x, y, z], i) => ({
    id: i + 1,
    label: `L${i + 1}`,
    x,
    y,
    z,
    bubbleRadius: 1.5,
    active: i === 0, // only L1 active by default
  }));
}

function makeDefaultBodyScan(): BodyScanData {
  return {
    headAngle: 0,
    earL: 0,
    earR: 0,
    shoulderWidth: 0.5,
    heightFt: 5.8,
    chestEnergy: 0,
    handsEnergy: 0,
  };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "poweramp_sound_beaming";

function loadState(): Partial<SoundBeamingState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<SoundBeamingState>;
  } catch {
    /* ignore */
  }
  return {};
}

function saveState(s: Partial<SoundBeamingState>) {
  try {
    const existing = loadState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...s }));
  } catch {
    /* ignore */
  }
}

// ─── Impulse response generators ─────────────────────────────────────────────

/** Personal bubble IR — 2s, 360° sealed */
function generateBubbleIR(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const decay = Math.exp(-5 * (i / len));
      data[i] = (Math.random() * 2 - 1) * decay * (ch === 0 ? 1 : 0.97);
    }
  }
  return buf;
}

/** Room wall IR — 3s, 20×15ft room simulation */
function generateRoomIR(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 3);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      // Early reflections (0–60ms) + late reverb tail
      const t = i / sr;
      const earlyDecay = t < 0.06 ? 1 : Math.exp(-3.5 * (t - 0.06));
      const amplitude =
        t < 0.002 ? 0 : (Math.random() * 2 - 1) * earlyDecay * 0.35;
      data[i] = amplitude * (ch === 0 ? 1 : 0.93);
    }
  }
  return buf;
}

// ─── Audio node container ─────────────────────────────────────────────────────

interface BeamNodes {
  splitInput: GainNode;
  // Bass path — omnidirectional
  bassFilter: BiquadFilterNode;
  bassOmniGain: GainNode;
  // Mids path — HRTF panner
  midsFilter: BiquadFilterNode;
  midsPanner: PannerNode;
  // Highs path — HRTF panner
  highsFilter: BiquadFilterNode;
  highsPanner: PannerNode;
  // Personal bubble convolver (shared for primary listener)
  bubbleConvolver: ConvolverNode;
  bubbleGain: GainNode;
  // Room wall convolver
  roomConvolver: ConvolverNode;
  roomGain: GainNode;
  // Master merge
  masterMerge: GainNode;
  inserted: boolean;
  irReady: boolean;
}

let beamNodes: BeamNodes | null = null;
let beamInserted = false;

function buildBeamNodes(ctx: AudioContext): BeamNodes {
  const splitInput = ctx.createGain();
  splitInput.gain.value = 1.0;

  // ── Bass: lowpass → omnidirectional gain (wide spread, low rolloff)
  const bassFilter = ctx.createBiquadFilter();
  bassFilter.type = "lowpass";
  bassFilter.frequency.value = 80;
  bassFilter.Q.value = 0.7;

  const bassOmniGain = ctx.createGain();
  bassOmniGain.gain.value = 1.0;

  // ── Mids: bandpass → HRTF PannerNode
  const midsFilter = ctx.createBiquadFilter();
  midsFilter.type = "bandpass";
  midsFilter.frequency.value = 1000;
  midsFilter.Q.value = 0.5; // covers ~200Hz-4kHz

  const midsPanner = ctx.createPanner();
  midsPanner.panningModel = "HRTF";
  midsPanner.distanceModel = "inverse";
  midsPanner.refDistance = 1;
  midsPanner.maxDistance = 20;
  midsPanner.rolloffFactor = 0.5;
  midsPanner.positionX.value = 0;
  midsPanner.positionY.value = 0;
  midsPanner.positionZ.value = -2;

  // ── Highs: highpass → HRTF PannerNode (tighter rolloff)
  const highsFilter = ctx.createBiquadFilter();
  highsFilter.type = "highpass";
  highsFilter.frequency.value = 4000;
  highsFilter.Q.value = 0.5;

  const highsPanner = ctx.createPanner();
  highsPanner.panningModel = "HRTF";
  highsPanner.distanceModel = "inverse";
  highsPanner.refDistance = 1;
  highsPanner.maxDistance = 20;
  highsPanner.rolloffFactor = 1.2; // tighter — highs stay focused
  highsPanner.positionX.value = 0;
  highsPanner.positionY.value = 0;
  highsPanner.positionZ.value = -2;

  // ── Bubble convolver + gain
  const bubbleConvolver = ctx.createConvolver();
  const bubbleGain = ctx.createGain();
  bubbleGain.gain.value = 0.35;

  // ── Room convolver + gain
  const roomConvolver = ctx.createConvolver();
  const roomGain = ctx.createGain();
  roomGain.gain.value = 0.25;

  // ── Master merge
  const masterMerge = ctx.createGain();
  masterMerge.gain.value = 1.0;

  return {
    splitInput,
    bassFilter,
    bassOmniGain,
    midsFilter,
    midsPanner,
    highsFilter,
    highsPanner,
    bubbleConvolver,
    bubbleGain,
    roomConvolver,
    roomGain,
    masterMerge,
    inserted: false,
    irReady: false,
  };
}

function wireBeamNodes(n: BeamNodes): void {
  // Input splits into 3 paths
  n.splitInput.connect(n.bassFilter);
  n.splitInput.connect(n.midsFilter);
  n.splitInput.connect(n.highsFilter);

  // Bass path — through bubble and room convolvers
  n.bassFilter.connect(n.bassOmniGain);
  n.bassOmniGain.connect(n.masterMerge);

  // Mids path
  n.midsFilter.connect(n.midsPanner);
  n.midsPanner.connect(n.bubbleConvolver);

  // Highs path
  n.highsFilter.connect(n.highsPanner);
  n.highsPanner.connect(n.bubbleConvolver);

  // Bubble → gain → masterMerge
  n.bubbleConvolver.connect(n.bubbleGain);
  n.bubbleGain.connect(n.masterMerge);

  // Room reflections — tap from masterMerge, add back
  n.masterMerge.connect(n.roomConvolver);
  n.roomConvolver.connect(n.roomGain);
  n.roomGain.connect(n.masterMerge);
}

function insertBeamIntoChain(n: BeamNodes): void {
  const analyser = getSharedAnalyser();
  if (!analyser || beamInserted) return;
  try {
    // Tap from analyser — we add AFTER analyser so beam is an additional parallel output
    analyser.connect(n.splitInput);
    n.masterMerge.connect(analyser.context.destination);
    beamInserted = true;
    n.inserted = true;
    console.log(
      "[SoundBeaming] Beam inserted — hidden inside Stabilizer, Engine 1 powered",
    );
  } catch (e) {
    console.warn("[SoundBeaming] Insert failed:", e);
  }
}

function setDepthZoneOnPanners(n: BeamNodes, zone: DepthZone): void {
  const configs: Record<DepthZone, { ref: number; rolloff: number }> = {
    near: { ref: 0.5, rolloff: 1.0 },
    mid: { ref: 3, rolloff: 0.7 },
    far: { ref: 10, rolloff: 0.4 },
  };
  const cfg = configs[zone];
  n.midsPanner.refDistance = cfg.ref;
  n.midsPanner.rolloffFactor = cfg.rolloff;
  n.highsPanner.refDistance = cfg.ref;
  n.highsPanner.rolloffFactor = cfg.rolloff + 0.3; // highs always tighter
}

function beamToListener(n: BeamNodes, listener: BeamListener): void {
  const { x, y, z } = listener;
  n.midsPanner.positionX.value = x;
  n.midsPanner.positionY.value = y;
  n.midsPanner.positionZ.value = z;
  n.highsPanner.positionX.value = x;
  n.highsPanner.positionY.value = y;
  n.highsPanner.positionZ.value = z;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSoundBeaming(): UseSoundBeamingReturn {
  const saved = loadState();

  const [beamActive, setBeamActive] = useState(saved.beamActive ?? false);
  const [groupMode, setGroupMode] = useState(saved.groupMode ?? false);
  const [wallMapping, setWallMapping] = useState(saved.wallMapping ?? true);
  const [vrMode, setVrMode] = useState(saved.vrMode ?? false);
  const [phoneSpeakerMode, setPhoneSpeakerMode] = useState(
    saved.phoneSpeakerMode ?? false,
  );
  const [roomWidth, setRoomWidthState] = useState(saved.roomWidth ?? 15);
  const [heightFt, setHeightFtState] = useState(saved.heightFt ?? 6);
  const [beamStrength, setBeamStrengthState] = useState(
    saved.beamStrength ?? 75,
  );
  const [vrDepth, setVrDepthState] = useState<DepthZone>(
    saved.vrDepth ?? "mid",
  );
  const [listeners, setListeners] =
    useState<BeamListener[]>(makeDefaultListeners);
  const [bodyScan, setBodyScan] = useState<BodyScanData>(makeDefaultBodyScan);
  const [sensorEnergy, setSensorEnergy] = useState(0);

  const vrIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vrXRef = useRef(0);
  const vrDirRef = useRef(1);
  const sensorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // ── Build beam nodes once the AudioContext is ready ──
  useEffect(() => {
    const ctx = getSharedCtx();
    if (!ctx) return;

    if (!beamNodes) {
      beamNodes = buildBeamNodes(ctx);
      wireBeamNodes(beamNodes);
    }

    if (!beamNodes.irReady) {
      beamNodes.bubbleConvolver.buffer = generateBubbleIR(ctx);
      beamNodes.roomConvolver.buffer = generateRoomIR(ctx);
      beamNodes.irReady = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Insert / remove beam from chain based on beamActive ──
  useEffect(() => {
    const ctx = getSharedCtx();
    if (!ctx || !beamNodes) return;

    if (beamActive && !beamInserted) {
      insertBeamIntoChain(beamNodes);
    }

    // Adjust bass omni gain based on phoneSpeakerMode
    if (beamNodes) {
      beamNodes.bassOmniGain.gain.value = phoneSpeakerMode ? 0.6 : 1.0;
    }
  }, [beamActive, phoneSpeakerMode]);

  // ── Depth zone changes ──
  useEffect(() => {
    if (!beamNodes) return;
    setDepthZoneOnPanners(beamNodes, vrDepth);
  }, [vrDepth]);

  // ── Beam strength → adjust gain ──
  useEffect(() => {
    if (!beamNodes) return;
    const g = 0.3 + (beamStrength / 100) * 0.7;
    beamNodes.bubbleGain.gain.value = g * 0.35;
    beamNodes.roomGain.gain.value = wallMapping ? g * 0.25 : 0;
  }, [beamStrength, wallMapping]);

  // ── Group mode → beam to all active listeners in a rotating cycle ──
  // Single mode → beam to first active listener
  useEffect(() => {
    if (!beamNodes || !beamActive) return;
    const active = listeners.filter((l) => l.active);
    if (active.length === 0) return;

    if (!groupMode) {
      const first = active[0];
      if (first) beamToListener(beamNodes, first);
      return;
    }

    // Rotate through listeners every 200ms in group mode
    let idx = 0;
    const interval = setInterval(() => {
      if (!beamNodes) return;
      const listener = active[idx % active.length];
      if (listener) beamToListener(beamNodes, listener);
      idx++;
    }, 200);

    return () => clearInterval(interval);
  }, [beamActive, groupMode, listeners]);

  // ── VR Mode — sweep panner X for fly-past effects ──
  useEffect(() => {
    if (vrIntervalRef.current) clearInterval(vrIntervalRef.current);
    if (!vrMode || !beamActive || !beamNodes) return;

    const speedMap: Record<DepthZone, number> = {
      near: 0.3,
      mid: 0.18,
      far: 0.1,
    };
    const step = speedMap[vrDepth];
    const maxX = Math.min(8, (roomWidth / 20) * 8);

    vrIntervalRef.current = setInterval(() => {
      if (!beamNodes) return;
      vrXRef.current += step * vrDirRef.current;
      if (vrXRef.current > maxX) {
        vrXRef.current = maxX;
        vrDirRef.current = -1;
      }
      if (vrXRef.current < -maxX) {
        vrXRef.current = -maxX;
        vrDirRef.current = 1;
      }
      const x = vrXRef.current;
      beamNodes.midsPanner.positionX.value = x;
      beamNodes.highsPanner.positionX.value = x;
    }, 50);

    return () => {
      if (vrIntervalRef.current) clearInterval(vrIntervalRef.current);
    };
  }, [vrMode, beamActive, vrDepth, roomWidth]);

  // ── Body scan simulation from analyser energy ──
  useEffect(() => {
    if (sensorIntervalRef.current) clearInterval(sensorIntervalRef.current);

    sensorIntervalRef.current = setInterval(() => {
      const analyser = getSharedAnalyser();
      if (!analyser) return;
      const binCount = analyser.frequencyBinCount;
      if (
        !analyserDataRef.current ||
        analyserDataRef.current.length !== binCount
      ) {
        analyserDataRef.current = new Uint8Array(
          binCount,
        ) as Uint8Array<ArrayBuffer>;
      }
      analyser.getByteFrequencyData(analyserDataRef.current);
      const data = analyserDataRef.current;
      const norm = (v: number) => (v ?? 0) / 255;

      let total = 0;
      for (let i = 0; i < binCount; i++) total += norm(data[i] ?? 0);
      const avg = total / binCount;

      const t = Date.now() / 1000;
      setBodyScan({
        headAngle: Math.sin(t * 0.3) * 0.3,
        earL: Math.max(0, avg * (0.7 + Math.sin(t * 0.7) * 0.3)),
        earR: Math.max(0, avg * (0.7 + Math.cos(t * 0.7) * 0.3)),
        shoulderWidth: 0.45 + Math.sin(t * 0.12) * 0.05,
        heightFt,
        chestEnergy: Math.max(0, avg * (0.5 + Math.sin(t * 0.4) * 0.5)),
        handsEnergy: Math.max(0, avg * (0.4 + Math.cos(t * 0.5) * 0.4)),
      });
      setSensorEnergy(avg);
    }, 80);

    return () => {
      if (sensorIntervalRef.current) clearInterval(sensorIntervalRef.current);
    };
  }, [heightFt]);

  // ── Toggle handlers ──

  const toggleBeam = useCallback(() => {
    setBeamActive((v) => {
      saveState({ beamActive: !v });
      return !v;
    });
  }, []);

  const toggleGroupMode = useCallback(() => {
    setGroupMode((v) => {
      saveState({ groupMode: !v });
      return !v;
    });
  }, []);

  const toggleWallMapping = useCallback(() => {
    setWallMapping((v) => {
      saveState({ wallMapping: !v });
      return !v;
    });
  }, []);

  const toggleVrMode = useCallback(() => {
    setVrMode((v) => {
      saveState({ vrMode: !v });
      return !v;
    });
  }, []);

  const togglePhoneSpeaker = useCallback(() => {
    setPhoneSpeakerMode((v) => {
      saveState({ phoneSpeakerMode: !v });
      return !v;
    });
  }, []);

  const setRoomWidth = useCallback((v: number) => {
    const clamped = Math.max(5, Math.min(20, v));
    setRoomWidthState(clamped);
    saveState({ roomWidth: clamped });
  }, []);

  const setHeightFt = useCallback((v: number) => {
    const clamped = Math.max(5, Math.min(7, v));
    setHeightFtState(clamped);
    setListeners((ls) => ls.map((l) => ({ ...l, y: (clamped - 6) * 0.5 })));
    saveState({ heightFt: clamped });
  }, []);

  const setBeamStrength = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setBeamStrengthState(clamped);
    saveState({ beamStrength: clamped });
  }, []);

  const setVrDepth = useCallback((z: DepthZone) => {
    setVrDepthState(z);
    saveState({ vrDepth: z });
  }, []);

  return {
    beamActive,
    groupMode,
    wallMapping,
    vrMode,
    phoneSpeakerMode,
    roomWidth,
    heightFt,
    beamStrength,
    vrDepth,
    listeners,
    bodyScan,
    sensorEnergy,
    engine1Power: "80,000 × per channel — 12 channels",
    bubbleStatus: beamActive ? "SEALED" : "STANDBY",
    toggleBeam,
    toggleGroupMode,
    toggleWallMapping,
    toggleVrMode,
    togglePhoneSpeaker,
    setRoomWidth,
    setHeightFt,
    setBeamStrength,
    setVrDepth,
  };
}
