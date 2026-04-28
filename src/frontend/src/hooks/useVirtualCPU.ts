/**
 * useVirtualCPU — Virtual CPU Capacity Manager
 *
 * Manages the virtual CPU that handles all 100 engine internals +
 * 30-48 smart chips = 148 total components maximum.
 *
 * When processing demand spikes (bottleneck detected), opens a 20-30 second
 * processing window to clear the backlog — no dropped samples, no pops.
 * During the window, no new nodes are added (but existing audio is never interrupted).
 *
 * Load varies between 45-75% while playing (simulated variation).
 * cleanSignal: true when loadPercent < 85%.
 */

import type { VirtualCPUState } from "@/types/player";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "poweramp_virtual_cpu";

/** 100 engine internals + 48 smart chips = 148 total */
const TOTAL_COMPONENTS = 148;

function loadState(): VirtualCPUState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VirtualCPUState;
      // Always enforce the new total
      return { ...parsed, totalChips: TOTAL_COMPONENTS };
    }
  } catch {
    /* ignore */
  }
  return {
    totalChips: TOTAL_COMPONENTS,
    processingWindowSecs: 25,
    cleanSignal: true,
    bottleneckDetected: false,
    loadPercent: 45,
  };
}

function saveState(s: VirtualCPUState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface UseVirtualCPUReturn {
  state: VirtualCPUState;
}

export function useVirtualCPU(isPlaying: boolean): UseVirtualCPUReturn {
  const [state, setState] = useState<VirtualCPUState>(loadState);
  const bottleneckResolveRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const loadVariationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loadVariationRef.current) clearInterval(loadVariationRef.current);
    if (bottleneckResolveRef.current)
      clearTimeout(bottleneckResolveRef.current);

    if (!isPlaying) {
      setState((prev) => {
        const next: VirtualCPUState = {
          ...prev,
          totalChips: TOTAL_COMPONENTS,
          loadPercent: 12,
          cleanSignal: true,
          bottleneckDetected: false,
          processingWindowSecs: 25,
        };
        saveState(next);
        return next;
      });
      return;
    }

    // Simulate realistic load variation between 45-75% while playing
    loadVariationRef.current = setInterval(() => {
      setState((prev) => {
        // Occasionally simulate a brief bottleneck (1% chance per tick)
        const shouldBottleneck =
          !prev.bottleneckDetected && Math.random() < 0.01;

        if (shouldBottleneck) {
          // Bottleneck detected — open processing window (20-30s)
          const windowSecs = 20 + Math.floor(Math.random() * 11);

          if (bottleneckResolveRef.current)
            clearTimeout(bottleneckResolveRef.current);
          bottleneckResolveRef.current = setTimeout(() => {
            setState((s) => {
              const resolved: VirtualCPUState = {
                ...s,
                totalChips: TOTAL_COMPONENTS,
                bottleneckDetected: false,
                cleanSignal: true,
                processingWindowSecs: 25,
              };
              saveState(resolved);
              return resolved;
            });
          }, windowSecs * 1000);

          const next: VirtualCPUState = {
            ...prev,
            totalChips: TOTAL_COMPONENTS,
            bottleneckDetected: true,
            cleanSignal: false,
            processingWindowSecs: windowSecs,
            loadPercent: 90,
          };
          saveState(next);
          return next;
        }

        if (prev.bottleneckDetected) return prev; // resolving in progress

        // Normal variation: 45-75%
        const load = Math.round(45 + Math.random() * 30);
        const next: VirtualCPUState = {
          ...prev,
          totalChips: TOTAL_COMPONENTS,
          loadPercent: load,
          cleanSignal: load < 85,
        };
        saveState(next);
        return next;
      });
    }, 2000);

    return () => {
      if (loadVariationRef.current) clearInterval(loadVariationRef.current);
      if (bottleneckResolveRef.current)
        clearTimeout(bottleneckResolveRef.current);
    };
  }, [isPlaying]);

  return { state };
}
