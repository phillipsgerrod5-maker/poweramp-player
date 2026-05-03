import type { EQuakeState } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// FIX: ON gain = (depth/100)*14, max 14dB (was 12). Instant 5ms time constant.
// OFF = 0. The earthquake effect must be physically felt.

export interface UseEQuakeReturn {
  state: EQuakeState;
  toggle: () => void;
  setDepth: (v: number) => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
}

export function useEQuake(): UseEQuakeReturn {
  // FIX6: Default enabled = true (was: off unless explicitly saved as "1")
  const [state, setState] = useState<EQuakeState>({
    enabled: localStorage.getItem("pamp_eqk_on") !== "0",
    depth: Number.parseFloat(localStorage.getItem("pamp_eqk_depth") ?? "50"),
  });

  const nodesRef = useRef<Record<string, AudioNode>>({});

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>, st: EQuakeState = state) => {
      nodesRef.current = nodes;
      const eqNode = nodes.equake as BiquadFilterNode | undefined;
      if (!eqNode) return;

      // FIX: max 14dB (upgraded from 12). ON = strong earthquake feel.
      const rawGain = st.enabled ? (st.depth / 100) * 14 : 0;
      const gain = Math.min(14, rawGain);

      if (eqNode.context) {
        // FIX: 5ms time constant for instant audible response
        eqNode.gain.setTargetAtTime(gain, eqNode.context.currentTime, 0.005);
      }
    },
    [state],
  );

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      localStorage.setItem("pamp_eqk_on", next.enabled ? "1" : "0");
      // FIX: Instant application — 5ms time constant in applyToNodes
      applyToNodes(nodesRef.current, next);
      return next;
    });
  }, [applyToNodes]);

  const setDepth = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(100, v));
      localStorage.setItem("pamp_eqk_depth", String(clamped));
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
