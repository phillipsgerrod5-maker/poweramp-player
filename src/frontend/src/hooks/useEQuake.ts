/**
 * useEQuake — E-Quake Sub Bass Earthquake Engine
 *
 * Truly wired earthquake effect — ACTUALLY changes the audio:
 *
 *   1. BiquadFilter "lowshelf" at 20Hz — adds sub-bass foundation
 *      Gain formula: eQuakeLevel * 0.18  (max +18dB at level 100)
 *
 *   2. LFO tremolo GainNode modulated by a slow OscillatorNode at 0.5–2Hz
 *      (speed scales with eQuakeLevel) — creates physical earthquake pulse.
 *      Tremolo amplitude = eQuakeLevel / 100 * 0.15 (subtle, not jarring).
 *
 * Signal path insertion: source → equakeFilter → equakeTremolo → existing chain
 * Commander-protected: cap at +18dB max.
 *
 * Scale: 0–100 (drag slider).
 * Auto-save on every change.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedBassFilter,
  getSharedCtx,
  getSharedMidsFilter,
} from "./usePlayer";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMANDER_MAX_DB = 18;
const LS_KEY_ENABLED = "poweramp_equake_enabled";
const LS_KEY_LEVEL = "poweramp_equake_level";

// ─── Singleton nodes ──────────────────────────────────────────────────────────

let equakeFilter: BiquadFilterNode | null = null;
let equakeTremoloGain: GainNode | null = null;
let equakeLfoOsc: OscillatorNode | null = null;
let equakeLfoGain: GainNode | null = null;
let equakeInserted = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcFilterGain(level: number): number {
  return Math.min(COMMANDER_MAX_DB, level * 0.18);
}

function calcLfoFreq(level: number): number {
  // 0.5Hz at level=0, up to 2Hz at level=100
  return 0.5 + (level / 100) * 1.5;
}

function calcTremoloAmplitude(level: number): number {
  // Max 0.15 at level=100 — subtle physical pulse
  return (level / 100) * 0.15;
}

function saveLS(key: string, v: number | boolean): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* */
  }
}

function loadLSNum(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

function loadLSBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v === "true" : fallback;
  } catch {
    return fallback;
  }
}

// ─── Node insertion ───────────────────────────────────────────────────────────
/**
 * Inserts E-Quake nodes between bassFilter and midsFilter.
 * bass → equakeFilter → equakeTremoloGain → mids
 * LFO modulates equakeTremoloGain.gain around 1.0 by ±amplitude.
 */
export function ensureEQuakeNodes(): boolean {
  if (equakeInserted && equakeFilter && equakeTremoloGain) return true;

  const ctx = getSharedCtx();
  const bassF = getSharedBassFilter();
  const midsF = getSharedMidsFilter();
  if (!ctx || !bassF || !midsF) return false;

  try {
    // Sub-bass lowshelf filter at 20Hz — the earthquake foundation
    const ef = ctx.createBiquadFilter();
    ef.type = "lowshelf";
    ef.frequency.value = 20;
    ef.gain.value = 0; // starts bypassed

    // Tremolo gain node — LFO modulates this around 1.0
    const tg = ctx.createGain();
    tg.gain.value = 1.0;

    // LFO oscillator — slow sine, modulates tremolo gain
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.5;

    // LFO depth gain — controls how much the tremolo swings
    const lg = ctx.createGain();
    lg.gain.value = 0; // starts at 0 amplitude — no tremolo until enabled

    lfo.connect(lg);
    lg.connect(tg.gain); // modulates around 1.0

    // Wire: disconnect bass→mids, insert bass→ef→tg→mids
    try {
      bassF.disconnect(midsF);
    } catch {
      /* already disconnected */
    }
    bassF.connect(ef);
    ef.connect(tg);
    tg.connect(midsF);

    lfo.start();

    equakeFilter = ef;
    equakeTremoloGain = tg;
    equakeLfoOsc = lfo;
    equakeLfoGain = lg;
    equakeInserted = true;

    console.log(
      "[EQuake] Nodes inserted: 20Hz lowshelf + LFO tremolo → bass→eq→tremolo→mids",
    );
    return true;
  } catch (e) {
    console.error("[EQuake] insert error:", e);
    return false;
  }
}

// ─── Apply gain to nodes ──────────────────────────────────────────────────────

function applyEQuakeGain(enabled: boolean, level: number): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  if (!equakeInserted) ensureEQuakeNodes();
  if (!equakeFilter || !equakeLfoGain || !equakeLfoOsc) return;

  const now = ctx.currentTime;

  if (!enabled || level === 0) {
    equakeFilter.gain.setTargetAtTime(0, now, 0.05);
    equakeLfoGain.gain.setTargetAtTime(0, now, 0.05);
    return;
  }

  // Filter gain: adds sub-bass depth
  const filterGain = calcFilterGain(level);
  equakeFilter.gain.setTargetAtTime(filterGain, now, 0.02);

  // LFO frequency: faster at higher levels = more intense earthquake feel
  equakeLfoOsc.frequency.setTargetAtTime(calcLfoFreq(level), now, 0.1);

  // LFO amplitude: gentle physical pulse
  const amplitude = calcTremoloAmplitude(level);
  equakeLfoGain.gain.setTargetAtTime(amplitude, now, 0.05);
}

// ─── Intensity label ──────────────────────────────────────────────────────────

function intensityLabel(level: number): string {
  if (level === 0) return "OFF";
  if (level <= 20) return "MICRO TREMOR";
  if (level <= 40) return "LOW RUMBLE";
  if (level <= 60) return "GROUND SHAKE";
  if (level <= 80) return "QUAKE";
  return "FULL EARTHQUAKE";
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseEQuakeReturn {
  eQuakeEnabled: boolean;
  eQuakeLevel: number;
  setEQuakeEnabled: (on: boolean) => void;
  setEQuakeLevel: (v: number) => void;
  eQuakeIntensityLabel: string;
  // Legacy compat
  value: number;
  isActive: boolean;
  commanderCapped: boolean;
  increment: () => void;
  decrement: () => void;
  setValue: (v: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEQuake(isPlaying: boolean): UseEQuakeReturn {
  const [eQuakeEnabled, setEnabledState] = useState(() =>
    loadLSBool(LS_KEY_ENABLED, false),
  );
  const [eQuakeLevel, setLevelState] = useState(() =>
    loadLSNum(LS_KEY_LEVEL, 0),
  );

  const enabledRef = useRef(eQuakeEnabled);
  const levelRef = useRef(eQuakeLevel);
  const insertAttempts = useRef(0);

  enabledRef.current = eQuakeEnabled;
  levelRef.current = eQuakeLevel;

  // ── Try to insert nodes on mount and when audio becomes ready ────────────
  useEffect(() => {
    if (equakeInserted) return;
    const retry = () => {
      insertAttempts.current++;
      const ok = ensureEQuakeNodes();
      if (!ok && insertAttempts.current < 30) {
        setTimeout(retry, 100);
      }
    };
    retry();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Also ensure nodes when playback starts ────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      if (!equakeInserted) ensureEQuakeNodes();
      // Restore saved state
      applyEQuakeGain(enabledRef.current, levelRef.current);
    } else {
      // Stop tremolo when not playing — don't kill the nodes
      if (equakeFilter && equakeLfoGain) {
        const ctx = getSharedCtx();
        if (ctx) {
          equakeFilter.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
          equakeLfoGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        }
      }
    }
  }, [isPlaying]);

  // ── Setters ───────────────────────────────────────────────────────────────

  const setEQuakeEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    enabledRef.current = on;
    saveLS(LS_KEY_ENABLED, on);
    applyEQuakeGain(on, levelRef.current);
  }, []);

  const setEQuakeLevel = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setLevelState(clamped);
    levelRef.current = clamped;
    saveLS(LS_KEY_LEVEL, clamped);
    applyEQuakeGain(enabledRef.current, clamped);
  }, []);

  // ── Legacy compat ─────────────────────────────────────────────────────────
  const setValue = useCallback(
    (v: number) => {
      // Old scale was 0-10, new scale is 0-100. Accept both.
      const normalized = v <= 10 ? v * 10 : v;
      setEQuakeLevel(normalized);
    },
    [setEQuakeLevel],
  );

  const increment = useCallback(() => {
    setEQuakeLevel(Math.min(100, levelRef.current + 1));
  }, [setEQuakeLevel]);

  const decrement = useCallback(() => {
    setEQuakeLevel(Math.max(0, levelRef.current - 1));
  }, [setEQuakeLevel]);

  return {
    eQuakeEnabled,
    eQuakeLevel,
    setEQuakeEnabled,
    setEQuakeLevel,
    eQuakeIntensityLabel: intensityLabel(eQuakeLevel),
    // Legacy compat
    value: Math.round(eQuakeLevel / 10), // 0-10 for old consumers
    isActive: eQuakeEnabled && eQuakeLevel > 0,
    commanderCapped: false,
    increment,
    decrement,
    setValue,
  };
}
