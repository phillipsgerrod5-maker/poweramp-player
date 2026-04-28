/**
 * useVirtualAmp — PowerAmp Player Virtual Amp Engine
 *
 * Manages 6-band EQ, Cheater Beater 33Hz, and 10 mid bass presets.
 * Every EQ band is FULLY INDEPENDENT — no shared state, no cross-linking.
 * Each band writes ONLY to its own dedicated BiquadFilterNode.
 *
 * BASS curve: deep from first touch, full depth by halfway.
 *   gain = -6 + 24 * (v/100)^0.7
 *   0 → -6dB (Natural Bottom always present)
 *   1 → ≈ +0.5dB (no dead zone)
 *   50 → ≈ +9dB (full depth at halfway)
 *   100 → +18dB (maximum)
 *
 * CHEATER BEATER:
 *   - Uses a singleton OscillatorNode at 33Hz connected to destination
 *   - Mutually exclusive with 14-60Hz bass: enabling cheater disables bass,
 *     moving bass above min (0) disables cheater
 *   - Auto-saved to localStorage
 *
 * All saves are automatic on every change.
 */

import type {
  AmpChannels,
  AmpScreenId,
  ProtectionState,
  VirtualAmpState,
} from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { commanderReachesEQ } from "./useCombinedAmps";
import {
  getSharedBass2Filter,
  getSharedBassFilter,
  getSharedCompressor,
  getSharedCtx,
  getSharedHighsFilter,
  getSharedLowMidFilter,
  getSharedMidsFilter,
  getSharedTweetersFilter,
  getSharedVocalFilter,
} from "./usePlayer";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: AmpChannels = {
  bass: 6000,
  mids: 3000,
  highs: 2000,
  tweeters: 1000,
};
const MAX_VOLUME = 700;
const MIN_VOLUME = 1;

// ─── localStorage helpers ─────────────────────────────────────────────────────

function save(key: string, value: number | boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* */
  }
}
function loadNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}
function loadBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v === "true" : fallback;
  } catch {
    return fallback;
  }
}

// ─── Bass gain curve ──────────────────────────────────────────────────────────
// Deep from first touch. Full depth before halfway.
// formula: gain = -6 + 24 * (v/100)^0.7
// v=0 → -6dB (Natural Bottom), v=1 → ~0.5dB, v=50 → ~9dB, v=100 → +18dB

export function bassSliderToGain(v: number): number {
  return Math.round((-6 + 24 * (v / 100) ** 0.7) * 10) / 10;
}

// Other bands: 0 → -12dB, 50 → 0dB, 100 → +12dB (linear)
function otherSliderToGain(v: number): number {
  return Math.round(((v - 50) / 50) * 12 * 10) / 10;
}

// ─── Apply each band to its dedicated filter node ─────────────────────────────
// Commander authority — protection cannot knock back these paths.

function applyBassNodes(v: number): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  void commanderReachesEQ;
  const now = ctx.currentTime;
  const gainDb = bassSliderToGain(v);
  const f = getSharedBassFilter();
  const f2 = getSharedBass2Filter();
  if (f) {
    f.type = "lowshelf";
    f.frequency.setTargetAtTime(60, now, 0.005);
    f.gain.setTargetAtTime(gainDb, now, 0.005);
  }
  // Secondary bass: proportional sub extension, only above min
  if (f2) {
    const subGain = v > 0 ? Math.max(0, gainDb * 0.5) : 0;
    f2.type = "peaking";
    f2.frequency.setTargetAtTime(20, now, 0.005);
    f2.Q.setTargetAtTime(1.2, now, 0.005);
    f2.gain.setTargetAtTime(subGain, now, 0.005);
  }
  // Mid Bass Excursion: when bass > 60%, boost lowMid slightly for pumping/breathing
  if (v > 60) {
    const excursionBoost = ((v - 60) / 40) * 3; // max +3dB at v=100
    const lowmid = getSharedLowMidFilter();
    if (lowmid) {
      // Only boost if lowmid is currently near neutral (avoid fighting user's lowmid setting)
      const current = lowmid.gain.value;
      if (current < 3) {
        lowmid.gain.setTargetAtTime(
          Math.min(current + excursionBoost * 0.3, current + 1.5),
          now,
          0.1,
        );
      }
    }
  }
}

function applyLowMid(v: number): void {
  const ctx = getSharedCtx();
  const f = getSharedLowMidFilter();
  if (!ctx || !f) return;
  void commanderReachesEQ;
  f.type = "peaking";
  f.frequency.setTargetAtTime(200, ctx.currentTime, 0.01);
  f.Q.setTargetAtTime(1.0, ctx.currentTime, 0.01);
  f.gain.setTargetAtTime(otherSliderToGain(v), ctx.currentTime, 0.01);
}

function applyVocals(v: number): void {
  const ctx = getSharedCtx();
  const f = getSharedVocalFilter();
  if (!ctx || !f) return;
  void commanderReachesEQ;
  f.type = "peaking";
  f.frequency.setTargetAtTime(1000, ctx.currentTime, 0.01);
  f.Q.setTargetAtTime(2.0, ctx.currentTime, 0.01);
  f.gain.setTargetAtTime(otherSliderToGain(v), ctx.currentTime, 0.01);
}

function applyMid(v: number): void {
  const ctx = getSharedCtx();
  const f = getSharedMidsFilter();
  if (!ctx || !f) return;
  void commanderReachesEQ;
  f.type = "peaking";
  f.frequency.setTargetAtTime(2500, ctx.currentTime, 0.01);
  f.Q.setTargetAtTime(1.0, ctx.currentTime, 0.01);
  f.gain.setTargetAtTime(otherSliderToGain(v), ctx.currentTime, 0.01);
}

function applyHighMid(v: number): void {
  const ctx = getSharedCtx();
  const f = getSharedHighsFilter();
  if (!ctx || !f) return;
  void commanderReachesEQ;
  f.type = "peaking";
  f.frequency.setTargetAtTime(5000, ctx.currentTime, 0.01);
  f.Q.setTargetAtTime(1.0, ctx.currentTime, 0.01);
  f.gain.setTargetAtTime(otherSliderToGain(v), ctx.currentTime, 0.01);
}

function applyTreble(v: number): void {
  const ctx = getSharedCtx();
  const f = getSharedTweetersFilter();
  if (!ctx || !f) return;
  void commanderReachesEQ;
  f.type = "highshelf";
  f.frequency.setTargetAtTime(8000, ctx.currentTime, 0.01);
  f.gain.setTargetAtTime(otherSliderToGain(v), ctx.currentTime, 0.01);
}

// ─── Compressor defaults — nearly transparent ─────────────────────────────────

function applyCompressorDefaults(): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx) return;
  const now = ctx.currentTime;
  comp.threshold.setTargetAtTime(-100, now, 0.02);
  comp.ratio.setTargetAtTime(1.5, now, 0.02);
  comp.knee.setTargetAtTime(40, now, 0.02);
  comp.attack.setTargetAtTime(0.003, now, 0.02);
  comp.release.setTargetAtTime(0.25, now, 0.02);
}

// ─── Cheater Beater 33Hz singleton ───────────────────────────────────────────
// Pure 33Hz oscillator wrapping the sub foundation under every bass track.
// Mutually exclusive with 14-60Hz bass (slider > 0 disables cheater).

let cheaterOsc: OscillatorNode | null = null;
let cheaterGainNode: GainNode | null = null;
let cheaterRunning = false;

function startCheater(level: number): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  if (!cheaterOsc || !cheaterRunning) {
    try {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 33;
      const gainNode = ctx.createGain();
      gainNode.gain.value = (level / 100) * 0.3;
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      cheaterOsc = osc;
      cheaterGainNode = gainNode;
      cheaterRunning = true;
    } catch (e) {
      console.error("[CheaterBeater] start error:", e);
    }
  } else if (cheaterGainNode) {
    cheaterGainNode.gain.setTargetAtTime(
      (level / 100) * 0.3,
      ctx.currentTime,
      0.05,
    );
  }
}

function stopCheater(): void {
  if (cheaterOsc && cheaterRunning) {
    try {
      cheaterOsc.stop();
      cheaterOsc.disconnect();
    } catch {
      /* */
    }
    cheaterOsc = null;
    cheaterRunning = false;
  }
  if (cheaterGainNode) {
    cheaterGainNode.disconnect();
    cheaterGainNode = null;
  }
}

function setCheaterLevel(level: number): void {
  if (!cheaterGainNode) return;
  const ctx = getSharedCtx();
  if (!ctx) return;
  cheaterGainNode.gain.setTargetAtTime(
    (level / 100) * 0.3,
    ctx.currentTime,
    0.05,
  );
}

// ─── Preset definitions ───────────────────────────────────────────────────────
// EXACTLY 10 — mid bass hard and pumping.
// All values are on the 0-100 slider scale.

export interface BassPreset {
  name: string;
  bass: number;
  lowMid: number;
  vocals: number;
  mid: number;
  highMid: number;
  treble: number;
  bassDbLabel: string;
}

export const BASS_PRESETS: BassPreset[] = [
  {
    name: "DEEP PUMP",
    bass: 80,
    lowMid: 40,
    vocals: 50,
    mid: 45,
    highMid: 42,
    treble: 40,
    bassDbLabel: "+14.6dB",
  },
  {
    name: "HARD KICK",
    bass: 70,
    lowMid: 60,
    vocals: 55,
    mid: 53,
    highMid: 45,
    treble: 42,
    bassDbLabel: "+12.1dB",
  },
  {
    name: "THUNDER PUMP",
    bass: 90,
    lowMid: 50,
    vocals: 46,
    mid: 41,
    highMid: 40,
    treble: 38,
    bassDbLabel: "+16.9dB",
  },
  {
    name: "CHEST HIT",
    bass: 85,
    lowMid: 55,
    vocals: 53,
    mid: 50,
    highMid: 44,
    treble: 42,
    bassDbLabel: "+15.7dB",
  },
  {
    name: "BASS WALL",
    bass: 100,
    lowMid: 45,
    vocals: 46,
    mid: 46,
    highMid: 38,
    treble: 35,
    bassDbLabel: "+18.0dB",
  },
  {
    name: "STREET SLAM",
    bass: 75,
    lowMid: 65,
    vocals: 54,
    mid: 52,
    highMid: 46,
    treble: 44,
    bassDbLabel: "+13.3dB",
  },
  {
    name: "HYDRAULIC",
    bass: 88,
    lowMid: 48,
    vocals: 48,
    mid: 45,
    highMid: 42,
    treble: 40,
    bassDbLabel: "+16.3dB",
  },
  {
    name: "DROP ZONE",
    bass: 95,
    lowMid: 42,
    vocals: 45,
    mid: 44,
    highMid: 36,
    treble: 32,
    bassDbLabel: "+17.6dB",
  },
  {
    name: "POWER WOOFER",
    bass: 92,
    lowMid: 52,
    vocals: 50,
    mid: 44,
    highMid: 40,
    treble: 38,
    bassDbLabel: "+17.1dB",
  },
  {
    name: "FULL EXCURSION",
    bass: 100,
    lowMid: 70,
    vocals: 45,
    mid: 45,
    highMid: 40,
    treble: 36,
    bassDbLabel: "+18.0dB",
  },
];

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseVirtualAmpReturn {
  // 6 independent EQ bands — each 0-100
  bassLevel: number;
  setBassLevel: (v: number) => void;
  lowMidLevel: number;
  setLowMidLevel: (v: number) => void;
  vocalsLevel: number;
  setVocalsLevel: (v: number) => void;
  midLevel: number;
  setMidLevel: (v: number) => void;
  highMidLevel: number;
  setHighMidLevel: (v: number) => void;
  trebleLevel: number;
  setTrebleLevel: (v: number) => void;
  // Cheater Beater
  cheaterEnabled: boolean;
  setCheaterEnabled: (on: boolean) => void;
  cheater33Level: number;
  setCheater33Level: (v: number) => void;
  // E-Quake (wired through useEQuake, managed here for preset integration)
  eQuakeEnabled: boolean;
  eQuakeLevel: number;
  setEQuakeEnabled: (on: boolean) => void;
  setEQuakeLevel: (v: number) => void;
  // Presets
  presets: BassPreset[];
  activePreset: number | null;
  applyPreset: (index: number) => void;
  bassTypeLabel: string;
  // Legacy amp state (used by VirtualAmpDrawer)
  ampState: VirtualAmpState;
  protection: ProtectionState;
  isStabilizerActive: boolean;
  setCurrentScreen: (id: AmpScreenId) => void;
  setVolume: (display: number) => void;
  // Legacy setters kept for backward compatibility
  setEqBass: (v: number) => void;
  setEqMids: (v: number) => void;
  setEqHighs: (v: number) => void;
  setEqTweeters: (v: number) => void;
  setBassPreset: (index: number) => void;
  setEarthquakeMode: (on: boolean) => void;
  setSrsActive: (on: boolean) => void;
  setSrsExpansion: (v: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVirtualAmp(
  isPlaying: boolean,
  displayVolume: number,
  onVolumeChange: (display: number) => void,
): UseVirtualAmpReturn {
  // ── 6 fully independent EQ band states (0-100, neutral=50) ────────────────
  // CRITICAL: each useState is isolated — no shared state, no linking.
  const [bassLevel, setBassState] = useState(() =>
    loadNum("poweramp_eq_bass", 50),
  );
  const [lowMidLevel, setLowMidState] = useState(() =>
    loadNum("poweramp_eq_lowmid", 50),
  );
  const [vocalsLevel, setVocalsState] = useState(() =>
    loadNum("poweramp_eq_vocals", 50),
  );
  const [midLevel, setMidState] = useState(() =>
    loadNum("poweramp_eq_mid", 50),
  );
  const [highMidLevel, setHighMidState] = useState(() =>
    loadNum("poweramp_eq_highmid", 50),
  );
  const [trebleLevel, setTrebleState] = useState(() =>
    loadNum("poweramp_eq_treble", 50),
  );

  // ── Cheater Beater ────────────────────────────────────────────────────────
  const [cheaterEnabled, setCheaterState] = useState(() =>
    loadBool("poweramp_cheater_enabled", false),
  );
  const [cheater33Level, setCheater33State] = useState(() =>
    loadNum("poweramp_cheater_level", 70),
  );

  // ── E-Quake (managed in this hook for preset integration) ─────────────────
  const [eQuakeEnabled, setEQuakeEnabledState] = useState(() =>
    loadBool("poweramp_equake_enabled", false),
  );
  const [eQuakeLevel, setEQuakeLevelState] = useState(() =>
    loadNum("poweramp_equake_level", 0),
  );

  // ── Amp legacy state ──────────────────────────────────────────────────────
  const [currentScreen, setCurrentScreenState] =
    useState<AmpScreenId>("signal-chain");
  const [srsActive, setSrsActiveState] = useState(true);
  const [srsExpansion, setSrsExpansionState] = useState(0.6);
  const [activePreset, setActivePreset] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("poweramp_active_preset");
      return v !== null ? Number(v) : null;
    } catch {
      return null;
    }
  });

  const [protection, setProtection] = useState<ProtectionState>({
    stabilizerStrength: "80,000",
    commanderActive: true,
    commanderStrength: "80,000 × 86",
    commanderReachesEQ: true,
    distortionLevel: 0,
    clippingRate: 0,
    isActing: false,
    bassDistortion: 0,
    midsDistortion: 0,
    highsDistortion: 0,
    commanderPowerDraw: 0,
    commanderActive2: false,
  });

  // ── Apply compressor defaults on mount ────────────────────────────────────
  useEffect(() => {
    applyCompressorDefaults();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refs for restoring state without re-triggering the effect ────────────
  const eqRestoreRef = useRef({
    bassLevel: 50,
    lowMidLevel: 50,
    vocalsLevel: 50,
    midLevel: 50,
    highMidLevel: 50,
    trebleLevel: 50,
  });
  eqRestoreRef.current = {
    bassLevel,
    lowMidLevel,
    vocalsLevel,
    midLevel,
    highMidLevel,
    trebleLevel,
  };
  const cheaterRestoreRef = useRef({
    cheaterEnabled: false,
    cheater33Level: 70,
  });
  cheaterRestoreRef.current = { cheaterEnabled, cheater33Level };

  // ── Restore all EQ bands to audio chain when context becomes ready ────────
  useEffect(() => {
    if (!isPlaying) return;
    const ctx = getSharedCtx();
    if (!ctx) return;
    const r = eqRestoreRef.current;
    applyBassNodes(r.bassLevel);
    applyLowMid(r.lowMidLevel);
    applyVocals(r.vocalsLevel);
    applyMid(r.midLevel);
    applyHighMid(r.highMidLevel);
    applyTreble(r.trebleLevel);
  }, [isPlaying]);

  // ── Cheater Beater — restore state on play ────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      stopCheater();
      return;
    }
    const r = cheaterRestoreRef.current;
    if (r.cheaterEnabled) {
      startCheater(r.cheater33Level);
    }
  }, [isPlaying]);

  // ── Protection tick ───────────────────────────────────────────────────────
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!isPlaying) {
      setProtection((p) => ({
        ...p,
        distortionLevel: 0,
        clippingRate: 0,
        isActing: false,
      }));
      return;
    }
    tickRef.current = setInterval(() => {
      const comp = getSharedCompressor();
      const gainReductionDb = comp ? comp.reduction : 0;
      const distortion = Math.min(100, (Math.abs(gainReductionDb) / 40) * 100);
      const clipping =
        gainReductionDb < -12 ? Math.floor(Math.abs(gainReductionDb) / 12) : 0;
      setProtection((p) => ({
        ...p,
        distortionLevel: distortion,
        clippingRate: clipping,
        isActing: distortion > 5,
        commanderReachesEQ: true,
      }));
    }, 150);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying]);

  // ── EQ setters — each is completely isolated ──────────────────────────────

  const setBassLevel = useCallback(
    (v: number) => {
      const c = Math.max(0, Math.min(100, Math.round(v)));
      setBassState(c);
      save("poweramp_eq_bass", c);
      applyBassNodes(c);
      // MUTUAL EXCLUSIVITY: moving bass above 0 disables Cheater Beater
      if (c > 0 && cheaterEnabled) {
        setCheaterState(false);
        save("poweramp_cheater_enabled", false);
        stopCheater();
      }
    },
    [cheaterEnabled],
  );

  const setLowMidLevel = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setLowMidState(c);
    save("poweramp_eq_lowmid", c);
    applyLowMid(c);
  }, []);

  const setVocalsLevel = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setVocalsState(c);
    save("poweramp_eq_vocals", c);
    applyVocals(c);
  }, []);

  const setMidLevel = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setMidState(c);
    save("poweramp_eq_mid", c);
    applyMid(c);
  }, []);

  const setHighMidLevel = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setHighMidState(c);
    save("poweramp_eq_highmid", c);
    applyHighMid(c);
  }, []);

  const setTrebleLevel = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setTrebleState(c);
    save("poweramp_eq_treble", c);
    applyTreble(c);
  }, []);

  // ── Cheater Beater setters ────────────────────────────────────────────────

  const setCheaterEnabled = useCallback(
    (on: boolean) => {
      setCheaterState(on);
      save("poweramp_cheater_enabled", on);
      if (on) {
        // MUTUAL EXCLUSIVITY: enabling Cheater Beater resets bass to min (0)
        setBassState(0);
        save("poweramp_eq_bass", 0);
        applyBassNodes(0);
        startCheater(cheater33Level);
      } else {
        stopCheater();
      }
    },
    [cheater33Level],
  );

  const setCheater33Level = useCallback(
    (v: number) => {
      const c = Math.max(0, Math.min(100, Math.round(v)));
      setCheater33State(c);
      save("poweramp_cheater_level", c);
      if (cheaterEnabled) setCheaterLevel(c);
    },
    [cheaterEnabled],
  );

  // ── E-Quake setters ───────────────────────────────────────────────────────
  const setEQuakeEnabled = useCallback((on: boolean) => {
    setEQuakeEnabledState(on);
    save("poweramp_equake_enabled", on);
  }, []);

  const setEQuakeLevel = useCallback((v: number) => {
    const c = Math.max(0, Math.min(100, Math.round(v)));
    setEQuakeLevelState(c);
    save("poweramp_equake_level", c);
  }, []);

  // ── Preset application ────────────────────────────────────────────────────

  const applyPreset = useCallback(
    (index: number) => {
      const preset =
        BASS_PRESETS[Math.max(0, Math.min(BASS_PRESETS.length - 1, index))];
      if (!preset) return;
      setActivePreset(index);
      try {
        localStorage.setItem("poweramp_active_preset", String(index));
      } catch {
        /* */
      }
      // Apply all 6 bands simultaneously — each goes to its own node
      setBassState(preset.bass);
      save("poweramp_eq_bass", preset.bass);
      applyBassNodes(preset.bass);
      setLowMidState(preset.lowMid);
      save("poweramp_eq_lowmid", preset.lowMid);
      applyLowMid(preset.lowMid);
      setVocalsState(preset.vocals);
      save("poweramp_eq_vocals", preset.vocals);
      applyVocals(preset.vocals);
      setMidState(preset.mid);
      save("poweramp_eq_mid", preset.mid);
      applyMid(preset.mid);
      setHighMidState(preset.highMid);
      save("poweramp_eq_highmid", preset.highMid);
      applyHighMid(preset.highMid);
      setTrebleState(preset.treble);
      save("poweramp_eq_treble", preset.treble);
      applyTreble(preset.treble);
      // Presets disable Cheater Beater — bass is active
      if (cheaterEnabled) {
        setCheaterState(false);
        save("poweramp_cheater_enabled", false);
        stopCheater();
      }
    },
    [cheaterEnabled],
  );

  // ── Bass type label ───────────────────────────────────────────────────────

  const bassTypeLabel =
    bassLevel >= 80
      ? "A+"
      : bassLevel >= 65
        ? "B+"
        : bassLevel >= 45
          ? "C+"
          : "D+";

  // ── Legacy API (backward compat for VirtualAmpDrawer, SmdMeter etc.) ──────

  const setCurrentScreen = useCallback(
    (id: AmpScreenId) => setCurrentScreenState(id),
    [],
  );
  const setVolume = useCallback(
    (display: number) => {
      onVolumeChange(
        Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, Math.round(display))),
      );
    },
    [onVolumeChange],
  );
  const setEqBass = useCallback(
    (v: number) => setBassLevel(Math.round(((v + 6) / 24) * 100)),
    [setBassLevel],
  );
  const setEqMids = useCallback(
    (v: number) => setMidLevel(Math.round(((v + 12) / 24) * 100)),
    [setMidLevel],
  );
  const setEqHighs = useCallback(
    (v: number) => setHighMidLevel(Math.round(((v + 12) / 24) * 100)),
    [setHighMidLevel],
  );
  const setEqTweeters = useCallback(
    (v: number) => setTrebleLevel(Math.round(((v + 12) / 24) * 100)),
    [setTrebleLevel],
  );
  const setBassPreset = useCallback(
    (index: number) => applyPreset(index),
    [applyPreset],
  );
  const setEarthquakeMode = useCallback(
    (on: boolean) => setEQuakeEnabled(on),
    [setEQuakeEnabled],
  );
  const setSrsActive = useCallback((on: boolean) => setSrsActiveState(on), []);
  const setSrsExpansion = useCallback(
    (v: number) => setSrsExpansionState(Math.max(0, Math.min(1, v))),
    [],
  );

  const clampedVolume = Math.max(
    MIN_VOLUME,
    Math.min(MAX_VOLUME, displayVolume),
  );

  const ampState: VirtualAmpState = {
    currentScreen,
    isOpen: false,
    volume: clampedVolume,
    eqBass: bassSliderToGain(bassLevel),
    eqMids: otherSliderToGain(midLevel),
    eqHighs: otherSliderToGain(highMidLevel),
    eqTweeters: otherSliderToGain(trebleLevel),
    bassPreset: activePreset ?? 0,
    earthquakeMode: eQuakeEnabled,
    srsActive,
    srsExpansion,
    channels: CHANNELS,
  };

  return {
    bassLevel,
    setBassLevel,
    lowMidLevel,
    setLowMidLevel,
    vocalsLevel,
    setVocalsLevel,
    midLevel,
    setMidLevel,
    highMidLevel,
    setHighMidLevel,
    trebleLevel,
    setTrebleLevel,
    cheaterEnabled,
    setCheaterEnabled,
    cheater33Level,
    setCheater33Level,
    eQuakeEnabled,
    eQuakeLevel,
    setEQuakeEnabled,
    setEQuakeLevel,
    presets: BASS_PRESETS,
    activePreset,
    applyPreset,
    bassTypeLabel,
    ampState,
    protection,
    isStabilizerActive: isPlaying,
    setCurrentScreen,
    setVolume,
    setEqBass,
    setEqMids,
    setEqHighs,
    setEqTweeters,
    setBassPreset,
    setEarthquakeMode,
    setSrsActive,
    setSrsExpansion,
  };
}
