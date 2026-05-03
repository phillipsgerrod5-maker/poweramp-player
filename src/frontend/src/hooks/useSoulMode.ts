import type { SoulModeState } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// FIX: Soul Mode ON = +5dB on soulFilter ALWAYS when enabled (was only when bass absent).
// This makes the toggle produce an IMMEDIATELY AUDIBLE effect.
// OFF = 0. Instant 5ms time constant.

export interface UseSoulModeReturn {
  state: SoulModeState;
  toggle: () => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
  updateFromEQBass: (
    bassGain: number,
    nodes: Record<string, AudioNode>,
    analyser: AnalyserNode | null,
  ) => void;
}

export function useSoulMode(): UseSoulModeReturn {
  // FIX6: Default enabled = true (was: off unless explicitly saved as "1")
  const [state, setState] = useState<SoulModeState>({
    enabled: localStorage.getItem("pamp_soul_on") !== "0",
    harmonicsActive: false,
    bassPresent: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const nodesRef = useRef<Record<string, AudioNode>>({});

  // Apply soul filter gain based on enabled state
  const applySoulGain = useCallback(
    (nodes: Record<string, AudioNode>, enabled: boolean) => {
      const soulFilter = nodes.soulFilter as BiquadFilterNode | undefined;
      if (!soulFilter?.context) return;
      // FIX: ON = +5dB always. OFF = 0. Instantly audible.
      soulFilter.gain.setTargetAtTime(
        enabled ? 5 : 0,
        soulFilter.context.currentTime,
        0.005,
      );
    },
    [],
  );

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>) => {
      nodesRef.current = nodes;
      applySoulGain(nodes, stateRef.current.enabled);
    },
    [applySoulGain],
  );

  const updateFromEQBass = useCallback(
    (
      bassGain: number,
      nodes: Record<string, AudioNode>,
      analyser: AnalyserNode | null,
    ) => {
      nodesRef.current = nodes;
      const soulFilter = nodes.soulFilter as BiquadFilterNode | undefined;
      if (!soulFilter) return;

      const enabled = stateRef.current.enabled;

      // FIX: Soul is always ON (+5dB) when enabled.
      // The "harmonicsActive" signal is still computed for display purposes.
      let bassPresent = false;
      if (analyser) {
        const buf = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(buf);
        const binSize = analyser.context.sampleRate / analyser.fftSize;
        const lo = Math.floor(20 / binSize);
        const hi = Math.floor(200 / binSize);
        for (let i = lo; i <= hi && i < buf.length; i++) {
          if (buf[i] > 40) {
            bassPresent = true;
            break;
          }
        }
      }

      // When enabled, always apply +5dB (not conditionally based on bassGain)
      const gain = enabled ? 5 : 0;
      if (soulFilter?.context) {
        soulFilter.gain.setTargetAtTime(
          gain,
          soulFilter.context.currentTime,
          0.05,
        );
      }

      const harmonicsActive = enabled && bassPresent;
      setState((prev) => ({
        ...prev,
        harmonicsActive,
        bassPresent,
      }));

      // Suppress unused parameter warning
      void bassGain;
    },
    [],
  );

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      localStorage.setItem("pamp_soul_on", next.enabled ? "1" : "0");
      // FIX: Instant application — 5ms time constant
      applySoulGain(nodesRef.current, next.enabled);
      return next;
    });
  }, [applySoulGain]);

  return { state, toggle, applyToNodes, updateFromEQBass };
}
