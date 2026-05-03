import type { EpicenterState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";

// FIX: Epicenter ON gain = strength * 8dB (was 6dB).
// When no signal: holds at +8dB floor so ON is always clearly louder than OFF (0).
// Instant 5ms time constant on every update.

export interface UseEpicenterReturn {
  state: EpicenterState;
  startAnalysis: (
    analyser: AnalyserNode,
    nodes: Record<string, AudioNode>,
  ) => void;
  stopAnalysis: () => void;
}

export function useEpicenter(): UseEpicenterReturn {
  const [state, setState] = useState<EpicenterState>({
    enabled: true,
    detectedFreq: 40,
    strength: 0,
  });
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nodesRef = useRef<Record<string, AudioNode>>({});

  const analyse = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(buf);
    const sampleRate = analyser.context.sampleRate;
    const binSize = sampleRate / analyser.fftSize;

    // Scan 14–50Hz for dominant bass frequency
    const lowBin = Math.floor(14 / binSize);
    const highBin = Math.floor(50 / binSize);
    let maxVal = 0;
    let maxBin = lowBin;
    for (let i = lowBin; i <= highBin && i < buf.length; i++) {
      if (buf[i] > maxVal) {
        maxVal = buf[i];
        maxBin = i;
      }
    }
    const detectedFreq = Math.max(14, maxBin * binSize);
    const strength = maxVal / 255;

    const epicenter = nodesRef.current.epicenterFilter as
      | BiquadFilterNode
      | undefined;
    if (epicenter?.context) {
      epicenter.frequency.setTargetAtTime(
        detectedFreq,
        epicenter.context.currentTime,
        0.05,
      );
      // FIX: ON gain = max(8, strength*8) — minimum +8dB so ON is always loud.
      // OFF would be 0. Clearly audible difference.
      const gain = Math.max(8, strength * 8);
      epicenter.gain.setTargetAtTime(
        gain,
        epicenter.context.currentTime,
        0.005,
      );
    }

    setState({
      enabled: true,
      detectedFreq: Math.round(detectedFreq),
      strength,
    });
    rafRef.current = requestAnimationFrame(analyse);
  }, []);

  const startAnalysis = useCallback(
    (analyser: AnalyserNode, nodes: Record<string, AudioNode>) => {
      analyserRef.current = analyser;
      nodesRef.current = nodes;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(analyse);
    },
    [analyse],
  );

  const stopAnalysis = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    // FIX: When stopping, set epicenter to 0 (OFF state)
    const epicenter = nodesRef.current.epicenterFilter as
      | BiquadFilterNode
      | undefined;
    if (epicenter?.context) {
      epicenter.gain.setTargetAtTime(0, epicenter.context.currentTime, 0.005);
    }
  }, []);

  useEffect(
    () => () => {
      stopAnalysis();
    },
    [stopAnalysis],
  );

  return { state, startAnalysis, stopAnalysis };
}
