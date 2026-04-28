/**
 * useEngine1 — Engine 1
 *
 * Architecture:
 *   Engine 1 → 12 Channels → Features
 *
 * Engine 1 is PURE POWER DELIVERY ONLY.
 * No audio processing. No EQ. Just clean virtual power to all channels.
 * STRAIGHT ENGINE POWER — NO MILLIWATTS, NO HIDDEN CHAINS.
 *
 * Power numbers:
 *   Working strength per channel: 80,000 (this is what gets displayed)
 *   Safety switch cuts each channel from 80,000 → 32,000 (60% cut)
 *
 * Channel assignments (Shot 2 — locked):
 *   Ch1:  Engine 1 main output bus (960,000W source)
 *   Ch2:  Battery power converter (80,000W → 20-30 batteries)
 *   Ch3:  High Amp dedicated (80,000W)
 *   Ch4:  New Protection System (80,000W)
 *   Ch5:  Fuses (80,000W ÷ 20-30 fuses)
 *   Ch6:  Bass Amp (80,000W)
 *   Ch7:  Main Virtual Amp (80,000W)
 *   Ch8:  Atmosmasphere Engine (80,000W)
 *   Ch9:  SRS HD 9.0 + XM Processor (80,000W)
 *   Ch10: Smart Chip Support Bus (80,000W)
 *   Ch11: RESERVED — not yet assigned
 *   Ch12: RESERVED — not yet assigned
 *
 * Stabilizer strength: 80,000 — NO × 86 MULTIPLIER
 * Commander strength:  80,000 — NO × 86 MULTIPLIER
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Displayed working strength per channel. */
const ENGINE_WORKING_STRENGTH = 80_000;

/** Safety cut factor: 60% cut → each channel drops to 40% = 32,000 */
const SAFETY_CUT_FACTOR = 0.4;

/** Fuse count: 30 fuses powered by Channel 5 */
const FUSE_COUNT = 30;

/** Power per fuse = 80,000 ÷ 30 = ~2,667 */
const FUSE_POWER_EACH = Math.round(ENGINE_WORKING_STRENGTH / FUSE_COUNT);

const LS_KEY = "poweramp_engine1_safety";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ChannelAssignment =
  | "mainOutputBus"
  | "batteryConverter"
  | "highAmp"
  | "newProtection"
  | "fuses"
  | "bassAmp"
  | "mainVirtualAmp"
  | "atmosmasphere"
  | "srsXm"
  | "smartChipBus"
  | "reserved";

export interface Engine1Channel {
  id: number;
  assignment: ChannelAssignment;
  label: string;
  /** Virtual power output: 80,000 (full) or 32,000 (safety switch on) */
  output: number;
  active: boolean;
}

export interface Engine1FuseConfig {
  count: number;
  powerEach: number;
  totalPower: number;
  source: "Channel 5";
  allLit: boolean;
}

export interface Engine1BatteryState {
  /** Batteries are always LIVE — Channel 2 keeps them powered */
  live: boolean;
  chargePercent: number; // always 100
  poweredByChannel: 2;
  /** Self-sustaining: Ch2 → batteries → always full */
  selfSustaining: boolean;
}

export interface VirtualAmpPowerSupply {
  /** Channel 7 output — 80,000 full, 32,000 safety */
  sourceChannel: 7;
  sourceOutput: number;
  outputs: {
    tweeters: { display: string; real: number };
    mids: { display: string; real: number };
    highs: { display: string; real: number };
    bass: { display: string; real: number };
  };
  totalPowerSupply: number;
}

export interface Engine1State {
  channels: Engine1Channel[];
  safetySwitch: boolean;
  fuses: Engine1FuseConfig;
  batteries: Engine1BatteryState;
  virtualAmpPowerSupply: VirtualAmpPowerSupply;
  hiddenComponentCount: 100;
  engineStrength: number;
  signalBoosterActive: boolean;
  /** Stabilizer strength = 80,000 — never 50M, never × 86 */
  stabilizerStrength: number;
  /** Commander strength = 80,000 — never × 86 */
  commanderStrength: number;
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseEngine1Return {
  channels: Engine1Channel[];
  safetySwitch: boolean;
  toggleSafetySwitch: () => void;
  fuses: Engine1FuseConfig;
  batteries: Engine1BatteryState;
  virtualAmpPowerSupply: VirtualAmpPowerSupply;
  hiddenComponentCount: 100;
  engineStrength: number;
  stabilizerStrength: number;
  commanderStrength: number;
  signalBoosterActive: boolean;
  channelAssignments: Record<number, string>;
  state: Engine1State;
}

// ─── Channel definitions (Shot 2 locked) ─────────────────────────────────────

interface ChannelDef {
  assignment: ChannelAssignment;
  label: string;
}

const CHANNEL_DEFS: ChannelDef[] = [
  {
    assignment: "mainOutputBus",
    label: "ENGINE 1 MAIN OUTPUT BUS — 960,000W SOURCE",
  },
  {
    assignment: "batteryConverter",
    label: "BATTERY CONVERTER — 20-30 BATTERIES ALWAYS FULL",
  },
  { assignment: "highAmp", label: "HIGH AMP — 80,000 DEDICATED" },
  {
    assignment: "newProtection",
    label: "NEW PROTECTION SYSTEM — DISTORTION & CLIPPING CLEAN",
  },
  { assignment: "fuses", label: "FUSES — 30 × 2,667W EACH" },
  { assignment: "bassAmp", label: "BASS AMP — 80,000 DEDICATED" },
  {
    assignment: "mainVirtualAmp",
    label: "MAIN VIRTUAL AMP — VIRTUAL+ANALOG+DIGITAL",
  },
  {
    assignment: "atmosmasphere",
    label: "ATMOSMASPHERE ENGINE — 30 CHIPS 3D SPATIAL",
  },
  { assignment: "srsXm", label: "SRS HD 9.0 + XM PROCESSOR" },
  {
    assignment: "smartChipBus",
    label: "SMART CHIP SUPPORT BUS — 148 COMPONENTS",
  },
  { assignment: "reserved", label: "RESERVED — AVAILABLE" },
  { assignment: "reserved", label: "RESERVED — AVAILABLE" },
];

const CHANNEL_LABELS: Record<number, string> = Object.fromEntries(
  CHANNEL_DEFS.map((d, i) => [i + 1, d.label]),
);

// ─── Builder helpers ──────────────────────────────────────────────────────────

function buildChannels(safetyOn: boolean): Engine1Channel[] {
  const output = safetyOn
    ? Math.round(ENGINE_WORKING_STRENGTH * SAFETY_CUT_FACTOR) // 32,000
    : ENGINE_WORKING_STRENGTH; // 80,000

  return CHANNEL_DEFS.map((def, i) => ({
    id: i + 1,
    assignment: def.assignment,
    label: def.label,
    output,
    active: def.assignment !== "reserved",
  }));
}

function buildFuses(): Engine1FuseConfig {
  return {
    count: FUSE_COUNT, // 30
    powerEach: FUSE_POWER_EACH, // ~2,667
    totalPower: FUSE_COUNT * FUSE_POWER_EACH, // ~80,000
    source: "Channel 5",
    allLit: true,
  };
}

function buildBatteries(): Engine1BatteryState {
  return {
    live: true,
    chargePercent: 100,
    poweredByChannel: 2,
    selfSustaining: true,
  };
}

function buildVirtualAmpPowerSupply(safetyOn: boolean): VirtualAmpPowerSupply {
  const ch7Output = safetyOn
    ? Math.round(ENGINE_WORKING_STRENGTH * SAFETY_CUT_FACTOR) // 32,000
    : ENGINE_WORKING_STRENGTH; // 80,000

  const realPerOutput = Math.round(ch7Output / 4); // 20,000

  return {
    sourceChannel: 7,
    sourceOutput: ch7Output,
    outputs: {
      tweeters: {
        display: `${ch7Output.toLocaleString()}`,
        real: realPerOutput,
      },
      mids: { display: `${ch7Output.toLocaleString()}`, real: realPerOutput },
      highs: { display: `${ch7Output.toLocaleString()}`, real: realPerOutput },
      bass: { display: `${ch7Output.toLocaleString()}`, real: realPerOutput },
    },
    totalPowerSupply: ch7Output,
  };
}

function buildState(safetyOn: boolean): Engine1State {
  return {
    channels: buildChannels(safetyOn),
    safetySwitch: safetyOn,
    fuses: buildFuses(),
    batteries: buildBatteries(),
    virtualAmpPowerSupply: buildVirtualAmpPowerSupply(safetyOn),
    hiddenComponentCount: 100,
    engineStrength: ENGINE_WORKING_STRENGTH, // 80,000
    signalBoosterActive: true,
    stabilizerStrength: ENGINE_WORKING_STRENGTH, // 80,000 — NEVER × 86
    commanderStrength: ENGINE_WORKING_STRENGTH, // 80,000 — NEVER × 86
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadSavedSafetySwitch(): boolean {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (!v) return false;
    const parsed = JSON.parse(v) as { safetySwitch?: boolean };
    return parsed.safetySwitch === true;
  } catch {
    return false;
  }
}

function saveSafetySwitch(on: boolean): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ safetySwitch: on }));
  } catch {
    /* ignore */
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEngine1(): UseEngine1Return {
  const [state, setState] = useState<Engine1State>(() =>
    buildState(loadSavedSafetySwitch()),
  );
  const batteryTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Self-sustaining battery loop — Ch2 keeps batteries always full
  useEffect(() => {
    batteryTickRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        batteries: {
          ...prev.batteries,
          live: true,
          chargePercent: 100,
          selfSustaining: true,
        },
      }));
    }, 1000);

    return () => {
      if (batteryTickRef.current) clearInterval(batteryTickRef.current);
    };
  }, []);

  const toggleSafetySwitch = useCallback(() => {
    setState((prev) => {
      const next = !prev.safetySwitch;
      saveSafetySwitch(next);
      return buildState(next);
    });
  }, []);

  return {
    channels: state.channels,
    safetySwitch: state.safetySwitch,
    toggleSafetySwitch,
    fuses: state.fuses,
    batteries: state.batteries,
    virtualAmpPowerSupply: state.virtualAmpPowerSupply,
    hiddenComponentCount: 100,
    engineStrength: state.engineStrength,
    stabilizerStrength: state.stabilizerStrength,
    commanderStrength: state.commanderStrength,
    signalBoosterActive: state.signalBoosterActive,
    channelAssignments: CHANNEL_LABELS,
    state,
  };
}
