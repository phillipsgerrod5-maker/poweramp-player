import type { CheaterBeaterState } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// FIX: ON gain = (depth/100)*12 — strong sub foundation, clearly audible vs OFF (0).
// Toggle fires ON/OFF at 5ms time constant for instant response.

export interface UseCheaterBeaterReturn {
  state: CheaterBeaterState;
  toggle: () => void;
  setDepth: (v: number) => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
}

export function useCheaterBeater(): UseCheaterBeaterReturn {
  const [state, setState] = useState<CheaterBeaterState>(() => ({
    enabled: localStorage.getItem("pamp_cb_on") !== "0",
    depth: Number.parseFloat(localStorage.getItem("pamp_cb_depth") ?? "60"),
  }));

  const savedBassGainRef = useRef<number>(
    Number.parseFloat(localStorage.getItem("poweramp_eq_bass") ?? "6"),
  );
  const nodesRef = useRef<Record<string, AudioNode>>({});

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>, st: CheaterBeaterState = state) => {
      nodesRef.current = nodes;
      const cb = nodes.cheaterBeater as BiquadFilterNode | undefined;
      if (!cb?.context) return;

      // FIX: ON gain = (depth/100)*12. OFF = 0. Instant 5ms time constant.
      const gain = st.enabled ? (st.depth / 100) * 12 : 0;
      cb.gain.setTargetAtTime(gain, cb.context.currentTime, 0.005);

      // Mutual exclusion with standard bass EQ (14–50Hz):
      const bass = nodes.bassFilter as BiquadFilterNode | undefined;
      if (bass?.context) {
        if (st.enabled) {
          bass.gain.setTargetAtTime(0, bass.context.currentTime, 0.005);
        } else {
          const restoredGain = savedBassGainRef.current;
          bass.gain.setTargetAtTime(
            restoredGain,
            bass.context.currentTime,
            0.005,
          );
        }
      }
    },
    [state],
  );

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      localStorage.setItem("pamp_cb_on", next.enabled ? "1" : "0");
      // FIX: Instant — apply immediately at 5ms time constant
      applyToNodes(nodesRef.current, next);
      return next;
    });
  }, [applyToNodes]);

  const setDepth = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(100, v));
      localStorage.setItem("pamp_cb_depth", String(clamped));
      setState((prev) => {
        const next = { ...prev, depth: clamped };
        applyToNodes(nodesRef.current, next);
        return next;
      });
    },
    [applyToNodes],
  );

  return { state, toggle, setDepth, applyToNodes };
}
