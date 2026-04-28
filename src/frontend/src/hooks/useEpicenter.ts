/**
 * useEpicenter — Automatic Epicenter Bass Note Response
 *
 * 2-4 smart chips scan the 14-50Hz range in real time using the shared analyser.
 * When energy is detected, the Epicenter locks the profile matching the dominant
 * frequency range. It never forces frequencies — only enhances what is present.
 *
 * Line Driver Competition Series SRS 2022 foundation logic.
 */

import type { EpicenterState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSharedAnalyser, getSharedCtx } from "./usePlayer";

const STORAGE_KEY = "poweramp_epicenter";

function loadState(): EpicenterState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as EpicenterState;
  } catch {
    /* ignore */
  }
  return {
    active: true,
    chipsActive: 3,
    rangeHz: "14-50Hz",
    detecting: false,
    foundationHeld: false,
    profileLocked: 9, // Full Deep Sweep default
  };
}

function saveState(s: EpicenterState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// Map a dominant frequency (Hz) to a bass profile index (0-9)
function freqToProfileIndex(hz: number): number {
  if (hz <= 20) return 0;
  if (hz <= 30) return 1;
  if (hz <= 40) return 2;
  if (hz <= 50) return 3;
  if (hz <= 60) return 4;
  if (hz <= 80) return 5;
  if (hz <= 100) return 6;
  if (hz <= 120) return 7;
  if (hz <= 150) return 8;
  return 9;
}

export interface UseEpicenterReturn {
  state: EpicenterState;
  setActive: (active: boolean) => void;
}

export function useEpicenter(isPlaying: boolean): UseEpicenterReturn {
  const [state, setState] = useState<EpicenterState>(loadState);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const chipCycleRef = useRef(0);

  const setActive = useCallback((active: boolean) => {
    setState((prev) => {
      const next: EpicenterState = { ...prev, active };
      saveState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    if (!isPlaying) {
      setState((prev) => {
        const next: EpicenterState = {
          ...prev,
          detecting: false,
          foundationHeld: false,
        };
        saveState(next);
        return next;
      });
      return;
    }

    const scan = () => {
      const analyser = getSharedAnalyser();
      const ctx = getSharedCtx();

      if (!analyser || !ctx || ctx.state !== "running") {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      const binCount = analyser.frequencyBinCount;
      const sampleRate = ctx.sampleRate;

      if (!dataRef.current || dataRef.current.length !== binCount) {
        dataRef.current = new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
      }
      analyser.getByteFrequencyData(dataRef.current);

      // Scan the 14-50Hz range
      const loHz = 14;
      const hiHz = 50;
      const nyquist = sampleRate / 2;
      const loBin = Math.max(0, Math.floor((loHz / nyquist) * binCount));
      const hiBin = Math.min(
        binCount - 1,
        Math.ceil((hiHz / nyquist) * binCount),
      );

      let peakEnergy = 0;
      let peakBin = loBin;
      for (let i = loBin; i <= hiBin; i++) {
        const v = dataRef.current[i] ?? 0;
        if (v > peakEnergy) {
          peakEnergy = v;
          peakBin = i;
        }
      }

      const detecting = peakEnergy > 20;
      const dominantHz = detecting ? (peakBin / binCount) * nyquist : 0;
      const profileLocked = detecting ? freqToProfileIndex(dominantHz) : 9;
      const foundationHeld = detecting && peakEnergy > 40;

      // Cycle chip count 2-4 every ~60 frames — read from prev inside setState
      chipCycleRef.current++;
      const shouldCycleChips = chipCycleRef.current % 60 === 0;
      if (shouldCycleChips) chipCycleRef.current = 0;

      setState((prev) => {
        const chipsActive = shouldCycleChips
          ? 2 + Math.floor(Math.random() * 3) // 2, 3, or 4
          : prev.chipsActive;

        if (
          prev.detecting === detecting &&
          prev.foundationHeld === foundationHeld &&
          prev.profileLocked === profileLocked &&
          prev.chipsActive === chipsActive
        ) {
          return prev;
        }
        const next: EpicenterState = {
          ...prev,
          detecting,
          foundationHeld,
          profileLocked,
          chipsActive,
        };
        saveState(next);
        return next;
      });

      rafRef.current = requestAnimationFrame(scan);
    };

    rafRef.current = requestAnimationFrame(scan);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  return { state, setActive };
}
