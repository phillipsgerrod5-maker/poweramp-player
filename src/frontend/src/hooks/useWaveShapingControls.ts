import type { WaveShapingState } from "@/types/player";
import { useCallback, useState } from "react";

// Build mild curve inline for WaveShaper node updates
function makeMildCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 256;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (amount === 0) {
      curve[i] = x;
    } else {
      curve[i] =
        Math.tanh(x * (1 + amount * 0.5)) / Math.tanh(1 + amount * 0.5);
    }
  }
  return curve;
}

export interface UseWaveShapingReturn {
  state: WaveShapingState;
  setWaveShaper: (v: number) => void;
  setLimiter: (v: number) => void;
  setGainNode: (v: number) => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
}

export function useWaveShapingControls(): UseWaveShapingReturn {
  const [state, setState] = useState<WaveShapingState>({
    waveShaper: Number.parseFloat(
      localStorage.getItem("poweramp_ws_waveshaper") ?? "2",
    ),
    limiter: Number.parseFloat(
      localStorage.getItem("poweramp_ws_limiter") ?? "2",
    ),
    gainNode: Number.parseFloat(
      localStorage.getItem("poweramp_ws_gain") ?? "2",
    ),
  });

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>, st: WaveShapingState = state) => {
      // NOTE: waveShapingWS, waveShapingComp, waveShapingGain are GainNodes in the engine
      // (transparent passthrough — no distortion). We treat them as gain passthrough only.

      // waveShapingWS — GainNode passthrough (no WaveShaper curve applied)
      // We only adjust if it is a WaveShaperNode (has .curve property); skip otherwise
      const wsNode = nodes.waveShapingWS as AudioNode | undefined;
      if (wsNode && "curve" in wsNode) {
        const ws = wsNode as WaveShaperNode;
        const amount = (st.waveShaper / 2) * 0.5;
        ws.curve = makeMildCurve(amount);
      }

      // waveShapingComp — GainNode passthrough (check for .ratio before using as compressor)
      const compNode = nodes.waveShapingComp as AudioNode | undefined;
      if (compNode && "ratio" in compNode) {
        const comp = compNode as DynamicsCompressorNode;
        if (comp.ratio && comp.context) {
          // At 0: ratio 1.0 (no compression), at 2: ratio 1.05 (barely there)
          const ratio = 1.0 + (st.limiter / 2) * 0.05;
          comp.ratio.setTargetAtTime(ratio, comp.context.currentTime, 0.05);
        }
      } else if (compNode && "gain" in compNode) {
        // It's a GainNode — leave at 1.0 (transparent)
        const g = compNode as GainNode;
        if (g.gain && g.context) {
          g.gain.setTargetAtTime(1.0, g.context.currentTime, 0.05);
        }
      }

      // waveShapingGain — GainNode (2% max boost)
      const gainNode = nodes.waveShapingGain as GainNode | undefined;
      if (gainNode?.context) {
        // At 0: gain 1.0, at 2: gain 1.02 (2% max boost)
        const g = 1.0 + (st.gainNode / 100) * 0.02;
        gainNode.gain.setTargetAtTime(g, gainNode.context.currentTime, 0.05);
      }
    },
    [state],
  );

  const setWaveShaper = useCallback((v: number) => {
    const c = Math.max(0, Math.min(2, v));
    localStorage.setItem("poweramp_ws_waveshaper", String(c));
    setState((prev) => ({ ...prev, waveShaper: c }));
  }, []);

  const setLimiter = useCallback((v: number) => {
    const c = Math.max(0, Math.min(2, v));
    localStorage.setItem("poweramp_ws_limiter", String(c));
    setState((prev) => ({ ...prev, limiter: c }));
  }, []);

  const setGainNode = useCallback((v: number) => {
    const c = Math.max(0, Math.min(2, v));
    localStorage.setItem("poweramp_ws_gain", String(c));
    setState((prev) => ({ ...prev, gainNode: c }));
  }, []);

  return { state, setWaveShaper, setLimiter, setGainNode, applyToNodes };
}
