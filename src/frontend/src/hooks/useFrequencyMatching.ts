import type { FreqMatchingState } from "@/types/player";
import { BASS_PROFILES, HIGH_PROFILES } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// FIX: freqMatchBass ON = +9dB (was +7dB). freqMatchHigh ON = +7dB (was +5dB).
// When disabled: gain = 0. Instant 5ms time constant on toggle.
// ─── Auto-switch interval: every 60 frames (~1 second at 60fps) ───────────────
const AUTO_SWITCH_FRAMES = 60;
const MANUAL_OVERRIDE_MS = 30_000;

export interface UseFreqMatchingReturn {
  state: FreqMatchingState;
  setEnabled: (v: boolean) => void;
  lockBassProfile: (id: number) => void;
  lockHighProfile: (id: number) => void;
  startAnalysis: (
    analyser: AnalyserNode,
    nodes: Record<string, AudioNode>,
  ) => void;
  stopAnalysis: () => void;
}

export function useFrequencyMatching(): UseFreqMatchingReturn {
  // FIX6: Default enabled = true (was: off unless explicitly saved as "1")
  const [state, setState] = useState<FreqMatchingState>({
    enabled: localStorage.getItem("pamp_fm_on") !== "0",
    bassProfile: Number.parseInt(
      localStorage.getItem("pamp_fm_bass") ?? "9",
      10,
    ),
    highProfile: Number.parseInt(
      localStorage.getItem("pamp_fm_high") ?? "9",
      10,
    ),
    bassLocked: false,
    highLocked: false,
  });

  const rafRef = useRef<number | null>(null);
  const nodesRef = useRef<Record<string, AudioNode>>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const frameCountRef = useRef(0);
  const manualOverrideUntilRef = useRef<number>(0);

  const applyProfile = useCallback(
    (nodes: Record<string, AudioNode>, bassIdx: number, highIdx: number) => {
      const bp = BASS_PROFILES[bassIdx];
      const hp = HIGH_PROFILES[highIdx];
      const bassNode = nodes.freqMatchBass as BiquadFilterNode | undefined;
      const highNode = nodes.freqMatchHigh as BiquadFilterNode | undefined;

      if (bassNode?.context && bp) {
        const eqBass = Number.parseFloat(
          localStorage.getItem("poweramp_eq_bass") ?? "0",
        );
        const eqScale = eqBass < 0 ? Math.max(0.1, 1 + eqBass / 12) : 1;
        bassNode.type = bp.type;
        bassNode.frequency.setTargetAtTime(
          bp.freqHz,
          bassNode.context.currentTime,
          0.05,
        );
        // FIX: +9dB base (was +7). Profile gain multiplied by eqScale.
        const baseGain = Math.max(9, bp.gain);
        bassNode.gain.setTargetAtTime(
          baseGain * eqScale,
          bassNode.context.currentTime,
          0.005,
        );
        if (bp.q)
          bassNode.Q.setTargetAtTime(bp.q, bassNode.context.currentTime, 0.05);
      }
      if (highNode?.context && hp) {
        highNode.type = hp.type;
        highNode.frequency.setTargetAtTime(
          hp.freqHz,
          highNode.context.currentTime,
          0.05,
        );
        // FIX: +7dB base (was +5).
        const baseHighGain = Math.max(7, hp.gain);
        highNode.gain.setTargetAtTime(
          baseHighGain,
          highNode.context.currentTime,
          0.005,
        );
        if (hp.q)
          highNode.Q.setTargetAtTime(hp.q, highNode.context.currentTime, 0.05);
      }
    },
    [],
  );

  const startAnalysis = useCallback(
    (analyser: AnalyserNode, nodes: Record<string, AudioNode>) => {
      nodesRef.current = nodes;
      applyProfile(
        nodes,
        stateRef.current.bassProfile,
        stateRef.current.highProfile,
      );
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        const st = stateRef.current;
        frameCountRef.current++;

        if (st.enabled && frameCountRef.current % AUTO_SWITCH_FRAMES === 0) {
          analyser.getByteFrequencyData(buf);
          const binSize = analyser.context.sampleRate / analyser.fftSize;
          const eqBass = Number.parseFloat(
            localStorage.getItem("poweramp_eq_bass") ?? "0",
          );
          const now = Date.now();
          const manualActive = now < manualOverrideUntilRef.current;

          if (!manualActive) {
            let bestBassProfile = st.bassProfile;
            let bestScore = -1;
            for (let pi = 0; pi < BASS_PROFILES.length; pi++) {
              const bin = Math.min(
                Math.floor(BASS_PROFILES[pi].freqHz / binSize),
                buf.length - 1,
              );
              const rawEnergy = buf[bin];
              let eqWeight = 1;
              if (eqBass >= 6) {
                eqWeight = BASS_PROFILES[pi].freqHz < 50 ? 1.4 : 0.7;
              } else if (eqBass <= 0) {
                eqWeight = BASS_PROFILES[pi].freqHz > 60 ? 1.3 : 0.8;
              }
              const score = rawEnergy * eqWeight;
              if (score > bestScore) {
                bestScore = score;
                bestBassProfile = pi;
              }
            }
            if (bestBassProfile !== st.bassProfile) {
              localStorage.setItem("pamp_fm_bass", String(bestBassProfile));
              setState((prev) => ({ ...prev, bassProfile: bestBassProfile }));
              applyProfile(nodes, bestBassProfile, st.highProfile);
            }
          }

          if (!st.highLocked) {
            let bestHighProfile = st.highProfile;
            let maxHigh = 0;
            for (let pi = 0; pi < HIGH_PROFILES.length; pi++) {
              const bin = Math.min(
                Math.floor(HIGH_PROFILES[pi].freqHz / binSize),
                buf.length - 1,
              );
              if (buf[bin] > maxHigh) {
                maxHigh = buf[bin];
                bestHighProfile = pi;
              }
            }
            if (bestHighProfile !== st.highProfile) {
              localStorage.setItem("pamp_fm_high", String(bestHighProfile));
              setState((prev) => ({ ...prev, highProfile: bestHighProfile }));
              applyProfile(nodes, st.bassProfile, bestHighProfile);
            }
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      frameCountRef.current = 0;
      rafRef.current = requestAnimationFrame(loop);
    },
    [applyProfile],
  );

  const stopAnalysis = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    // FIX: When freq match stops (OFF), silence its nodes
    const bassNode = nodesRef.current.freqMatchBass as
      | BiquadFilterNode
      | undefined;
    const highNode = nodesRef.current.freqMatchHigh as
      | BiquadFilterNode
      | undefined;
    if (bassNode?.context)
      bassNode.gain.setTargetAtTime(0, bassNode.context.currentTime, 0.005);
    if (highNode?.context)
      highNode.gain.setTargetAtTime(0, highNode.context.currentTime, 0.005);
  }, []);

  const setEnabled = useCallback(
    (v: boolean) => {
      localStorage.setItem("pamp_fm_on", v ? "1" : "0");
      setState((prev) => ({ ...prev, enabled: v }));
      // FIX: instantly apply gain change when toggled
      const bassNode = nodesRef.current.freqMatchBass as
        | BiquadFilterNode
        | undefined;
      const highNode = nodesRef.current.freqMatchHigh as
        | BiquadFilterNode
        | undefined;
      if (v) {
        // Re-apply profile at strong gains
        applyProfile(
          nodesRef.current,
          stateRef.current.bassProfile,
          stateRef.current.highProfile,
        );
      } else {
        if (bassNode?.context)
          bassNode.gain.setTargetAtTime(0, bassNode.context.currentTime, 0.005);
        if (highNode?.context)
          highNode.gain.setTargetAtTime(0, highNode.context.currentTime, 0.005);
      }
    },
    [applyProfile],
  );

  const lockBassProfile = useCallback(
    (id: number) => {
      manualOverrideUntilRef.current = Date.now() + MANUAL_OVERRIDE_MS;
      localStorage.setItem("pamp_fm_bass", String(id));
      setState((prev) => ({ ...prev, bassProfile: id, bassLocked: true }));
      applyProfile(nodesRef.current, id, stateRef.current.highProfile);
      setTimeout(() => {
        setState((prev) => ({ ...prev, bassLocked: false }));
      }, MANUAL_OVERRIDE_MS);
    },
    [applyProfile],
  );

  const lockHighProfile = useCallback(
    (id: number) => {
      localStorage.setItem("pamp_fm_high", String(id));
      setState((prev) => ({ ...prev, highProfile: id, highLocked: true }));
      applyProfile(nodesRef.current, stateRef.current.bassProfile, id);
    },
    [applyProfile],
  );

  return {
    state,
    setEnabled,
    lockBassProfile,
    lockHighProfile,
    startAnalysis,
    stopAnalysis,
  };
}
