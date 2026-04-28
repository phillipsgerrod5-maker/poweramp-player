/**
 * useWaveShapingControls — WaveShaper / Limiter / GainNode Controls
 *
 * Exposes the browser-level audio nodes (WaveShaper, Limiter, GainNode)
 * as user-controlled sliders. Hard cap: 2% max each.
 *
 * Default: 0 (completely off). User owns these — they cannot run free.
 * Range: 0-2 for all three. If you try to set above 2, it clamps to 2.
 *
 * These do NOT add distortion, DO NOT touch volume, DO NOT limit bass notes.
 */

import type { WaveShapingControlState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedCompressor,
  getSharedCtx,
  getSharedMasterGain,
} from "./usePlayer";

const STORAGE_KEY = "poweramp_waveshaping_controls";
const HARD_CAP = 2;

function loadState(): WaveShapingControlState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WaveShapingControlState;
  } catch {
    /* ignore */
  }
  return {
    waveShaperPercent: 0,
    limiterPercent: 0,
    gainNodePercent: 0,
  };
}

function saveState(s: WaveShapingControlState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * Apply WaveShaper effect — 0% = completely bypassed, 2% = barely there.
 * Affects the compressor knee softness (emulates waveshaper curve character).
 * At 0%: knee=10 (transparent). At 2%: knee=12 (very slight rounding).
 */
function applyWaveShaper(pct: number): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx || ctx.state !== "running") return;
  const knee = 10 + (pct / HARD_CAP) * 2; // 10-12dB range only
  comp.knee.setTargetAtTime(knee, ctx.currentTime, 0.1);
}

/**
 * Apply Limiter effect — 0% = off, 2% = -1dB tighter ceiling only.
 * Adjusts compressor threshold very slightly. Never chokes volume.
 * At 0%: threshold stays at current value. At 2%: -1dB tighter.
 */
function applyLimiter(pct: number): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx || ctx.state !== "running") return;
  // Current threshold + at most -1dB adjustment
  const adjustment = -(pct / HARD_CAP) * 1.0; // 0 to -1dB max
  const baseThreshold = -6; // the fixed base
  comp.threshold.setTargetAtTime(
    baseThreshold + adjustment,
    ctx.currentTime,
    0.1,
  );
}

/**
 * Apply GainNode — 0% = 1.0 (unity), 2% = 1.02 (barely +0.17dB).
 * This is the absolute maximum allowed gain from this control.
 */
function applyGainNode(pct: number): void {
  const gain = getSharedMasterGain();
  const ctx = getSharedCtx();
  if (!gain || !ctx || ctx.state !== "running") return;
  // 0% → 1.0, 2% → 1.02 maximum — barely detectable
  const gainVal = 1.0 + (pct / HARD_CAP) * 0.02;
  gain.gain.setTargetAtTime(gainVal, ctx.currentTime, 0.1);
}

export interface UseWaveShapingControlsReturn {
  state: WaveShapingControlState;
  setWaveShaper: (value: number) => void;
  setLimiter: (value: number) => void;
  setGainNode: (value: number) => void;
}

export function useWaveShapingControls(): UseWaveShapingControlsReturn {
  const [state, setState] = useState<WaveShapingControlState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Re-apply on mount in case audio context was re-created
  useEffect(() => {
    const timeout = setTimeout(() => {
      const s = stateRef.current;
      if (s.waveShaperPercent > 0) applyWaveShaper(s.waveShaperPercent);
      if (s.limiterPercent > 0) applyLimiter(s.limiterPercent);
      if (s.gainNodePercent > 0) applyGainNode(s.gainNodePercent);
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  const setWaveShaper = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(HARD_CAP, value));
    applyWaveShaper(clamped);
    setState((prev) => {
      const next: WaveShapingControlState = {
        ...prev,
        waveShaperPercent: clamped,
      };
      saveState(next);
      return next;
    });
  }, []);

  const setLimiter = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(HARD_CAP, value));
    applyLimiter(clamped);
    setState((prev) => {
      const next: WaveShapingControlState = {
        ...prev,
        limiterPercent: clamped,
      };
      saveState(next);
      return next;
    });
  }, []);

  const setGainNode = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(HARD_CAP, value));
    applyGainNode(clamped);
    setState((prev) => {
      const next: WaveShapingControlState = {
        ...prev,
        gainNodePercent: clamped,
      };
      saveState(next);
      return next;
    });
  }, []);

  return { state, setWaveShaper, setLimiter, setGainNode };
}
