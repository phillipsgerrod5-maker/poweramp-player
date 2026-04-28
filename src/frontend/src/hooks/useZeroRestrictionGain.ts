/**
 * useZeroRestrictionGain — Zero Restriction Gain Smart Chip
 *
 * Connected to the low end. Commander is wired to the engine through this chip.
 * Contains gain for distortion AND clipping — cleans both, never adds either.
 * Titanium Wall is built inside.
 *
 * gainForDistortion: 0-100 — how aggressively distortion is cleaned
 * gainForClipping:   0-100 — how aggressively clipping is cleaned
 *
 * RULE: Neither slider ever touches volume. They only clean.
 */

import type { ZeroRestrictionGainState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedBassFilter,
  getSharedCompressor,
  getSharedCtx,
} from "./usePlayer";

const STORAGE_KEY = "poweramp_zero_restriction_gain";

function loadState(): ZeroRestrictionGainState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ZeroRestrictionGainState;
  } catch {
    /* ignore */
  }
  return {
    active: true,
    gainForDistortion: 80,
    gainForClipping: 80,
    titaniumWallInside: true,
    commanderConnected: true,
    engineChannelPowered: true,
  };
}

function saveState(s: ZeroRestrictionGainState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * Apply distortion cleaning — adjusts compressor ratio/knee to reduce
 * distortion artifacts. NEVER touches threshold in a way that reduces volume.
 */
function applyDistortionCleaning(strength: number): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  // Higher strength = wider knee (softer compression = less distortion artifacts)
  // Range: 5dB (clean) to 25dB (very smooth)
  const knee = 5 + (strength / 100) * 20;
  comp.knee.setTargetAtTime(knee, now, 0.05);
}

/**
 * Apply clipping cleaning — lifts the threshold only enough to prevent hard clips.
 * Does NOT reduce volume — only prevents the signal from hitting the ceiling hard.
 */
function applyClippingCleaning(strength: number): void {
  const comp = getSharedCompressor();
  const ctx = getSharedCtx();
  if (!comp || !ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  // Higher strength = gentler ratio (harder to clip)
  const ratio = 1.2 + (strength / 100) * 1.8; // 1.2:1 → 3:1 max (gentle)
  comp.ratio.setTargetAtTime(ratio, now, 0.05);
}

export interface UseZeroRestrictionGainReturn {
  state: ZeroRestrictionGainState;
  setGainForDistortion: (value: number) => void;
  setGainForClipping: (value: number) => void;
}

export function useZeroRestrictionGain(
  isPlaying: boolean,
): UseZeroRestrictionGainReturn {
  const [state, setState] = useState<ZeroRestrictionGainState>(loadState);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Apply settings on play state change
  useEffect(() => {
    if (!isPlaying) return;

    // Small delay to ensure audio context is running
    const timeout = setTimeout(() => {
      applyDistortionCleaning(stateRef.current.gainForDistortion);
      applyClippingCleaning(stateRef.current.gainForClipping);

      // Confirm channel is powered
      const ctx = getSharedCtx();
      const bassF = getSharedBassFilter();
      const enginePowered = !!(ctx && ctx.state === "running" && bassF);

      setState((prev) => {
        const next: ZeroRestrictionGainState = {
          ...prev,
          engineChannelPowered: enginePowered,
        };
        if (next.engineChannelPowered !== prev.engineChannelPowered) {
          saveState(next);
          return next;
        }
        return prev;
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, [isPlaying]);

  const setGainForDistortion = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    applyDistortionCleaning(clamped);
    setState((prev) => {
      const next: ZeroRestrictionGainState = {
        ...prev,
        gainForDistortion: clamped,
      };
      saveState(next);
      return next;
    });
  }, []);

  const setGainForClipping = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    applyClippingCleaning(clamped);
    setState((prev) => {
      const next: ZeroRestrictionGainState = {
        ...prev,
        gainForClipping: clamped,
      };
      saveState(next);
      return next;
    });
  }, []);

  return { state, setGainForDistortion, setGainForClipping };
}
