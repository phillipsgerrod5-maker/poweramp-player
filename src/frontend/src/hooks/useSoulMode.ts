/**
 * useSoulMode — Soul Mode Engine
 *
 * When bass channel is off/at 0, Soul Mode routes the harmonic content
 * (overtones) of bass notes through the mids filter so the note still
 * has presence, body, and character — even without the sub hit underneath.
 *
 * Harmonics = fundamental × 2 (2nd partial) and fundamental × 3 (3rd partial).
 * These live in the mids range (150-600Hz), so they still play through even
 * when deep bass is absent. The result: full, real sound even when bass is
 * physically missing.
 *
 * Audio chain when Soul Mode is active and bass is off:
 *   bassFilter output → lowpass 300Hz → WaveShaperNode (harmonic generator)
 *   → bandpass 300-2000Hz → midHarmonicGain → routed to mids output
 */

import type { SoulModeState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedBassFilter,
  getSharedCtx,
  getSharedMidsFilter,
} from "./usePlayer";

const STORAGE_KEY = "poweramp_soul_mode";

// ─── Harmonic shaper curve (light saturation to generate 2nd+3rd harmonics) ──

function buildHarmonicCurve(samples = 512): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1; // -1 to +1
    // Soft-clip: generates even harmonics. Light — preserves character.
    curve[i] = ((Math.PI + 100) * x) / (Math.PI + 100 * Math.abs(x));
  }
  return curve;
}

// ─── Module-level soul nodes (created once per audioContext) ──────────────────

interface SoulNodes {
  inputGain: GainNode;
  lowpassFilter: BiquadFilterNode;
  harmonicShaper: WaveShaperNode;
  bandpassFilter: BiquadFilterNode;
  midHarmonicGain: GainNode;
  ctx: AudioContext;
}

let soulNodes: SoulNodes | null = null;
let soulInserted = false;

function buildSoulNodes(ctx: AudioContext): SoulNodes {
  const inputGain = ctx.createGain();
  inputGain.gain.value = 0.8; // slightly reduced input to harmonic path

  const lowpassFilter = ctx.createBiquadFilter();
  lowpassFilter.type = "lowpass";
  lowpassFilter.frequency.value = 300; // capture bass fundamentals only
  lowpassFilter.Q.value = Math.SQRT1_2;

  const harmonicShaper = ctx.createWaveShaper();
  harmonicShaper.curve = buildHarmonicCurve();
  harmonicShaper.oversample = "2x";

  const bandpassFilter = ctx.createBiquadFilter();
  bandpassFilter.type = "bandpass";
  bandpassFilter.frequency.value = 800; // center of 2nd+3rd harmonics zone
  bandpassFilter.Q.value = 0.5; // wide pass: 300-2000Hz

  const midHarmonicGain = ctx.createGain();
  midHarmonicGain.gain.value = 0; // starts OFF — enabled when soul mode active

  return {
    inputGain,
    lowpassFilter,
    harmonicShaper,
    bandpassFilter,
    midHarmonicGain,
    ctx,
  };
}

function wireSoulNodes(n: SoulNodes): void {
  n.inputGain.connect(n.lowpassFilter);
  n.lowpassFilter.connect(n.harmonicShaper);
  n.harmonicShaper.connect(n.bandpassFilter);
  n.bandpassFilter.connect(n.midHarmonicGain);
  // midHarmonicGain output is connected to mids filter when soul mode activates
}

function insertSoulChain(): boolean {
  const ctx = getSharedCtx();
  const bassFilter = getSharedBassFilter();
  const midsFilter = getSharedMidsFilter();
  if (!ctx || !bassFilter || !midsFilter) return false;

  if (!soulNodes) {
    soulNodes = buildSoulNodes(ctx);
    wireSoulNodes(soulNodes);
  }

  if (!soulInserted) {
    // Tap from bass filter output into soul chain
    bassFilter.connect(soulNodes.inputGain);
    // Soul chain output feeds mids filter
    soulNodes.midHarmonicGain.connect(midsFilter);
    soulInserted = true;
  }
  return true;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadState(): SoulModeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SoulModeState;
  } catch {
    /* ignore */
  }
  return {
    enabled: false,
    harmonicPreservation: 60,
    bassChannelActive: true,
    harmonicsPlayingThroughMids: false,
  };
}

function saveState(s: SoulModeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface UseSoulModeReturn {
  state: SoulModeState;
  toggle: () => void;
  setHarmonicPreservation: (value: number) => void;
}

export function useSoulMode(): UseSoulModeReturn {
  const [state, setState] = useState<SoulModeState>(loadState);
  const insertAttempted = useRef(false);

  // Try to insert the soul chain once the audio context is ready
  useEffect(() => {
    if (insertAttempted.current) return;
    const timer = setTimeout(() => {
      const ok = insertSoulChain();
      if (ok) insertAttempted.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Monitor bass channel activity and drive the harmonic gain
  useEffect(() => {
    const interval = setInterval(() => {
      const bassF = getSharedBassFilter();
      const ctx = getSharedCtx();
      if (!bassF || !ctx) return;

      // Try inserting chain if not done yet
      if (!insertAttempted.current) {
        const ok = insertSoulChain();
        if (ok) insertAttempted.current = true;
      }

      // Bass channel is "active" when its gain is above -12dB (not silenced)
      const bassActive = bassF.gain.value > -12;

      setState((prev) => {
        const harmonicsActive = prev.enabled && !bassActive;

        // Drive the midHarmonicGain based on soul mode state
        if (soulNodes && ctx.state === "running") {
          const targetGain = harmonicsActive
            ? (prev.harmonicPreservation / 100) * 0.6 // max 0.6 gain — enough for body, not overwhelming
            : 0;
          soulNodes.midHarmonicGain.gain.setTargetAtTime(
            targetGain,
            ctx.currentTime,
            0.1,
          );
        }

        const next: SoulModeState = {
          ...prev,
          bassChannelActive: bassActive,
          harmonicsPlayingThroughMids: harmonicsActive,
        };

        if (
          next.bassChannelActive !== prev.bassChannelActive ||
          next.harmonicsPlayingThroughMids !== prev.harmonicsPlayingThroughMids
        ) {
          saveState(next);
          return next;
        }
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => {
      const next: SoulModeState = { ...prev, enabled: !prev.enabled };
      // If disabling, ensure harmonic gain goes to 0
      if (!next.enabled && soulNodes) {
        const ctx = getSharedCtx();
        if (ctx && ctx.state === "running") {
          soulNodes.midHarmonicGain.gain.setTargetAtTime(
            0,
            ctx.currentTime,
            0.05,
          );
        }
      }
      saveState(next);
      return next;
    });
  }, []);

  const setHarmonicPreservation = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setState((prev) => {
      const next: SoulModeState = { ...prev, harmonicPreservation: clamped };
      // Update gain in real time if soul mode is active
      if (next.enabled && !next.bassChannelActive && soulNodes) {
        const ctx = getSharedCtx();
        if (ctx && ctx.state === "running") {
          const targetGain = (clamped / 100) * 0.6;
          soulNodes.midHarmonicGain.gain.setTargetAtTime(
            targetGain,
            ctx.currentTime,
            0.05,
          );
        }
      }
      saveState(next);
      return next;
    });
  }, []);

  return { state, toggle, setHarmonicPreservation };
}
