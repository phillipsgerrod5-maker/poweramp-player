import type { PowerAmpEngine } from "../audio/engine";
// ═══════════════════════════════════════════════════
// PowerAmp Player — Shared Types
// ═══════════════════════════════════════════════════

export type ChannelStatus = "green" | "yellow" | "standby";
export type EQBand =
  | "bass"
  | "lowMid"
  | "vocals"
  | "mid"
  | "highMid"
  | "treble";
export type BoosterTier = "A+" | "B+" | "C+" | "D+";

export interface ChannelInfo {
  id: number;
  name: string;
  status: ChannelStatus;
  locked: boolean;
  feature?: string;
}

export interface AudioEngineState {
  initialized: boolean;
  volume: number;
  masterPower: number;
  sampleRate: number;
  latency: number;
  boosterTier: BoosterTier;
  channelStatuses: ChannelInfo[];
  isLocked: boolean;
}

export interface EQState {
  bass: number;
  lowMid: number;
  vocals: number;
  mid: number;
  highMid: number;
  treble: number;
}

export interface OldProtectionState {
  engineGuard: number;
  bassMidsGuard: number;
  highsGuard: number;
}

export interface NewProtectionState {
  distortionClean: number;
  clippingNoise: number;
  protectionPower: number;
}

export interface BassPreset {
  id: number;
  name: string;
  bass: number;
  lowMid: number;
  vocals: number;
  mid: number;
  highMid: number;
  treble: number;
}

export const BASS_PRESETS: BassPreset[] = [
  {
    id: 1,
    name: "Street Slam",
    bass: 9,
    lowMid: 8,
    vocals: 2,
    mid: 1,
    highMid: 1,
    treble: 0,
  },
  {
    id: 2,
    name: "Bass Head",
    bass: 10,
    lowMid: 9,
    vocals: 1,
    mid: 0,
    highMid: 0,
    treble: 0,
  },
  {
    id: 3,
    name: "Competition Hit",
    bass: 10,
    lowMid: 10,
    vocals: 3,
    mid: 2,
    highMid: 1,
    treble: 0,
  },
  {
    id: 4,
    name: "Trunk Rattler",
    bass: 9,
    lowMid: 10,
    vocals: 2,
    mid: 1,
    highMid: 0,
    treble: -1,
  },
  {
    id: 5,
    name: "Deep Punch",
    bass: 8,
    lowMid: 7,
    vocals: 2,
    mid: 2,
    highMid: 2,
    treble: 1,
  },
  {
    id: 6,
    name: "Club Boom",
    bass: 8,
    lowMid: 9,
    vocals: 4,
    mid: 3,
    highMid: 2,
    treble: 1,
  },
  {
    id: 7,
    name: "Hydraulic Drop",
    bass: 10,
    lowMid: 8,
    vocals: 1,
    mid: 0,
    highMid: 0,
    treble: -2,
  },
  {
    id: 8,
    name: "Iron Chest",
    bass: 9,
    lowMid: 10,
    vocals: 2,
    mid: 2,
    highMid: 1,
    treble: 0,
  },
  {
    id: 9,
    name: "Power Slam",
    bass: 12,
    lowMid: 10,
    vocals: 3,
    mid: 2,
    highMid: 2,
    treble: 1,
  },
  {
    id: 10,
    name: "Sub Foundation",
    bass: 10,
    lowMid: 8,
    vocals: 2,
    mid: 1,
    highMid: 1,
    treble: 2,
  },
];

export const CHANNEL_MAP: Array<{
  ch: number;
  label: string;
  watts: string;
  type: "system" | "software" | "reserved";
}> = [
  { ch: 1, label: "Bass Out", watts: "80,000W", type: "system" },
  { ch: 2, label: "Mids Out", watts: "80,000W", type: "system" },
  { ch: 3, label: "Highs Out", watts: "80,000W", type: "system" },
  { ch: 4, label: "Tweeters Out", watts: "80,000W", type: "system" },
  { ch: 5, label: "Power Source", watts: "80,000W", type: "system" },
  { ch: 6, label: "Stabilizer", watts: "80,000W", type: "system" },
  { ch: 7, label: "Signal Booster", watts: "80,000W", type: "system" },
  { ch: 8, label: "Atmosmasphere", watts: "80,000W", type: "system" },
  { ch: 9, label: "SRS HD 9.0", watts: "80,000W", type: "system" },
  { ch: 10, label: "Smart Chip Bus", watts: "80,000W", type: "system" },
  { ch: 11, label: "Epicenter", watts: "80,000W", type: "software" },
  { ch: 12, label: "Freq Match Bass", watts: "80,000W", type: "software" },
  { ch: 13, label: "Freq Match Highs", watts: "80,000W", type: "software" },
  { ch: 14, label: "Multi-Hit 1", watts: "80,000W", type: "software" },
  { ch: 15, label: "Multi-Hit 2", watts: "80,000W", type: "software" },
  { ch: 16, label: "Multi-Hit 3", watts: "80,000W", type: "software" },
  { ch: 17, label: "Multi-Hit 4", watts: "80,000W", type: "software" },
  { ch: 18, label: "Bass Note Switch", watts: "80,000W", type: "software" },
  { ch: 19, label: "Virtual Magnet", watts: "80,000W", type: "software" },
  { ch: 20, label: "XM Processor", watts: "80,000W", type: "software" },
];

export type ProtectionGrade = "A+" | "B+" | "C+" | "D+";

export function getProtectionGrade(value: number): ProtectionGrade {
  // Legacy types — kept for backward compatibility with old hooks/components

  if (value >= 8) return "A+";
  if (value >= 6) return "B+";
  if (value >= 4) return "C+";
  return "D+";
}
// ─── Legacy Types (compat) ────────────────────────────────────────────────────

export interface AtmosmashereState {
  enabled: boolean;
  vrMode: boolean;
  chipStatuses: boolean[];
}

export interface SRSState {
  enabled: boolean;
  vrMode: boolean;
}

export interface UltraCrystalState {
  enabled: boolean;
}

export interface VirtualCPUState {
  active: boolean;
  chipCount: number;
}

export interface TitaniumWallState {
  bassEnabled: boolean;
  midsEnabled: boolean;
}

export interface XMProcessorState {
  enabled: boolean;
  staticControl: number;
  powerNumber: number;
}

export interface WaveShapingState {
  waveShaper: number;
  limiter: number;
  gainNode: number;
}

export interface ScannerState {
  active: boolean;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  dominantFreq: number;
}

export interface SoulModeState {
  enabled: boolean;
  harmonicsActive: boolean;
  bassPresent: boolean;
}

export interface SoundBeamingState {
  enabled: boolean;
  listeners: ListenerState[];
  vrDepth: "Near" | "Mid" | "Far";
}

export interface ListenerState {
  enabled: boolean;
  pan: number;
  label: string;
}

export interface CheaterBeaterState {
  enabled: boolean;
  depth: number;
}

export interface EpicenterState {
  enabled: boolean;
  detectedFreq: number;
  strength: number;
}

export interface FreqMatchingState {
  enabled: boolean;
  bassProfile: number;
  highProfile: number;
  bassLocked: boolean;
  highLocked: boolean;
}

export interface MultiHitState {
  enabled: boolean;
  bassFreqs: number[];
  midFreqs: number[];
  highFreqs: number[];
}

export interface BassNoteSwitchState {
  enabled: boolean;
  currentBassNote: number;
  currentProfile: string;
}

export interface EQuakeState {
  enabled: boolean;
  depth: number;
}

export interface FreqProfile {
  id: number;
  name: string;
  freqHz: number;
  type: BiquadFilterType;
  gain: number;
  q?: number;
}

export const BASS_PROFILES: FreqProfile[] = [
  { id: 0, name: "Pure Sub", freqHz: 17, type: "lowshelf", gain: 8 },
  { id: 1, name: "Deep Earth", freqHz: 25, type: "peaking", gain: 6, q: 1.0 },
  { id: 2, name: "Thump Core", freqHz: 40, type: "peaking", gain: 5, q: 1.2 },
  { id: 3, name: "Punch Bass", freqHz: 65, type: "peaking", gain: 4, q: 1.5 },
  { id: 4, name: "Mid Punch", freqHz: 100, type: "peaking", gain: 3, q: 1.5 },
  { id: 5, name: "Heavy Chest", freqHz: 45, type: "peaking", gain: 6, q: 1.0 },
  { id: 6, name: "Competition Slam", freqHz: 30, type: "lowshelf", gain: 8 },
  { id: 7, name: "Street Bass", freqHz: 60, type: "peaking", gain: 5, q: 0.8 },
  { id: 8, name: "Boom Box", freqHz: 80, type: "peaking", gain: 4, q: 1.2 },
  { id: 9, name: "Full Deep Sweep", freqHz: 32, type: "lowshelf", gain: 7 },
];

export const HIGH_PROFILES: FreqProfile[] = [
  { id: 0, name: "Pure Air", freqHz: 12000, type: "highshelf", gain: 4 },
  { id: 1, name: "Silk High", freqHz: 8000, type: "highshelf", gain: 3 },
  { id: 2, name: "Crystal", freqHz: 10000, type: "highshelf", gain: 5 },
  { id: 3, name: "Bright Air", freqHz: 6000, type: "highshelf", gain: 4 },
  { id: 4, name: "Airy Shimmer", freqHz: 12000, type: "highshelf", gain: 6 },
  { id: 5, name: "Presence", freqHz: 3500, type: "peaking", gain: 4, q: 1.0 },
  { id: 6, name: "Sizzle", freqHz: 8000, type: "highshelf", gain: 7 },
  {
    id: 7,
    name: "Warmth High",
    freqHz: 6000,
    type: "peaking",
    gain: 3,
    q: 0.8,
  },
  { id: 8, name: "Sparkle", freqHz: 10000, type: "highshelf", gain: 4 },
  {
    id: 9,
    name: "Presence + Brilliance",
    freqHz: 5000,
    type: "highshelf",
    gain: 5,
  },
];

// ─── Memory Commander Chip types ─────────────────────────────────────────────

export interface MemorySlot {
  id: string;
  name: string;
  value: number | boolean | string | null;
}

export interface ChipStatus {
  power: number;
  virtualPower: number;
  slotCount: number;
  lastSaved: number;
  isActive: boolean;
}

/** Props for the Memory Commander Chip panel UI component */
export interface ChipPanelProps {
  onClose: () => void;
  engine: PowerAmpEngine;
}

export interface EngineStatus {
  name: string;
  engine: "bass" | "mids" | "highs" | "system";
  status: "green" | "yellow" | "red";
  detail: string;
  powerWatts: number;
}

export interface DiagnosticResult {
  node: string;
  engine: string;
  status: "pass" | "fail" | "warn";
  direction: "forward" | "backward";
  detail: string;
  autoFixed?: boolean;
  fixDescription?: string;
}

export interface TrackTestResult {
  passed: boolean;
  results: DiagnosticResult[];
  autoFixedCount: number;
  failedCount: number;
  summary: string;
}

export const ATMOSMASPHERE_CHIPS = [
  "Body Scanner",
  "Room Mapper",
  "Wall Mapper",
  "Height Tracker",
  "Bubble Builder",
  "Beam Targeter",
  "Group Mode Controller",
  "VR Depth Zone 1",
  "VR Depth Zone 2",
  "Sound Thickness Monitor",
  "Dead Spot Scanner",
  "Listener Tracker 1",
  "Listener Tracker 2",
  "Listener Tracker 3",
  "Listener Tracker 4",
  "Phase Aligner",
  "Spatial Renderer",
  "Reverb Controller",
  "Width Expander",
  "Depth Processor",
  "Center Lock",
  "Sub Spatial",
  "Height Layer 1",
  "Height Layer 2",
  "Beam Splitter",
];
