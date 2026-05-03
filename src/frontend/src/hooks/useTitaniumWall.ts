import type { TitaniumWallState } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// FIX: Titanium Wall — stronger gains for clearly audible ON/OFF.
// titaniumBass ON = +6dB (was +4). titaniumMids ON = +4dB (was +2).
// Instant 5ms time constant.

export interface UseTitaniumWallReturn {
  state: TitaniumWallState;
  toggleBass: () => void;
  toggleMids: () => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
}

export function useTitaniumWall(): UseTitaniumWallReturn {
  const [state, setState] = useState<TitaniumWallState>({
    bassEnabled: localStorage.getItem("pamp_tw_bass") !== "0",
    midsEnabled: localStorage.getItem("pamp_tw_mids") !== "0",
  });

  const nodesRef = useRef<Record<string, AudioNode>>({});

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>, st: TitaniumWallState = state) => {
      nodesRef.current = nodes;
      const bassNode = nodes.titaniumBass as BiquadFilterNode | undefined;
      const midsNode = nodes.titaniumMids as BiquadFilterNode | undefined;

      // FIX: Bass +6dB (was +4). Audible bang/boom/bottom authority.
      if (bassNode?.context)
        bassNode.gain.setTargetAtTime(
          st.bassEnabled ? 6 : 0,
          bassNode.context.currentTime,
          0.005,
        );

      // FIX: Mids +4dB (was +2). Audible instrument focus and separation.
      if (midsNode?.context)
        midsNode.gain.setTargetAtTime(
          st.midsEnabled ? 4 : 0,
          midsNode.context.currentTime,
          0.005,
        );
    },
    [state],
  );

  const toggleBass = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, bassEnabled: !prev.bassEnabled };
      localStorage.setItem("pamp_tw_bass", next.bassEnabled ? "1" : "0");
      const bassNode = nodesRef.current.titaniumBass as
        | BiquadFilterNode
        | undefined;
      // FIX: Instant 5ms time constant
      if (bassNode?.context)
        bassNode.gain.setTargetAtTime(
          next.bassEnabled ? 6 : 0,
          bassNode.context.currentTime,
          0.005,
        );
      return next;
    });
  }, []);

  const toggleMids = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, midsEnabled: !prev.midsEnabled };
      localStorage.setItem("pamp_tw_mids", next.midsEnabled ? "1" : "0");
      const midsNode = nodesRef.current.titaniumMids as
        | BiquadFilterNode
        | undefined;
      // FIX: Instant 5ms time constant
      if (midsNode?.context)
        midsNode.gain.setTargetAtTime(
          next.midsEnabled ? 4 : 0,
          midsNode.context.currentTime,
          0.005,
        );
      return next;
    });
  }, []);

  return { state, toggleBass, toggleMids, applyToNodes };
}
