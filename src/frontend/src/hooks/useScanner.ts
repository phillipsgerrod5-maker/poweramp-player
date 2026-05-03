import type { ScannerState } from "@/types/player";
import { useCallback, useRef, useState } from "react";

export interface UseScannerReturn {
  state: ScannerState;
  start: (analyser: AnalyserNode) => void;
  stop: () => void;
}

export function useScanner(): UseScannerReturn {
  const [state, setState] = useState<ScannerState>({
    active: false,
    bassEnergy: 0,
    midEnergy: 0,
    highEnergy: 0,
    dominantFreq: 0,
  });
  const rafRef = useRef<number | null>(null);

  const scan = useCallback((analyser: AnalyserNode) => {
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    const binSize = analyser.context.sampleRate / analyser.fftSize;

    const avg = (lo: number, hi: number): number => {
      const start = Math.floor(lo / binSize);
      const end = Math.min(Math.floor(hi / binSize), buf.length - 1);
      let sum = 0;
      for (let i = start; i <= end; i++) sum += buf[i];
      return sum / Math.max(1, end - start + 1) / 255;
    };

    let maxVal = 0;
    let maxBin = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] > maxVal) {
        maxVal = buf[i];
        maxBin = i;
      }
    }

    setState({
      active: true,
      bassEnergy: avg(20, 200),
      midEnergy: avg(200, 5000),
      highEnergy: avg(5000, 20000),
      dominantFreq: Math.round(maxBin * binSize),
    });
  }, []);

  const start = useCallback(
    (analyser: AnalyserNode) => {
      const loop = () => {
        scan(analyser);
        rafRef.current = requestAnimationFrame(loop);
      };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    },
    [scan],
  );

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setState((prev) => ({ ...prev, active: false }));
  }, []);

  return { state, start, stop };
}
