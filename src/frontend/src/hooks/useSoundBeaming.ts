import type { SoundBeamingState } from "@/types/player";
import { useCallback, useRef, useState } from "react";

// ─── Sound Beaming Hook ───────────────────────────────────────────────────────
// 4 beam paths: left wall, right wall, front wall, rear (reflected)
// Dynamic power tracking: RAF loop reads Analyser total energy → maps to beamGain
// When more energy → more beam power (power chain weight drives it)
// Fixed 200Hz highpass crossover on ALL beaming paths — bass NEVER bleeds in

const BEAM_KEYS = ["beamLeft", "beamRight", "beamFront", "beamRear"] as const;
type BeamKey = (typeof BEAM_KEYS)[number];

export const BEAM_CONFIG: { key: BeamKey; label: string; pan: number }[] = [
  { key: "beamLeft", label: "Left Wall", pan: -0.9 },
  { key: "beamRight", label: "Right Wall", pan: 0.9 },
  { key: "beamFront", label: "Front Wall", pan: 0.0 },
  { key: "beamRear", label: "Rear Reflected", pan: 0.0 },
];

export interface UseSoundBeamingReturn {
  state: SoundBeamingState;
  beamEnergy: number;
  toggle: () => void;
  toggleListener: (idx: number) => void;
  setVRDepth: (d: SoundBeamingState["vrDepth"]) => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
  startBeamTracking: (
    analyser: AnalyserNode,
    nodes: Record<string, AudioNode>,
  ) => void;
}

export function useSoundBeaming(): UseSoundBeamingReturn {
  const [state, setState] = useState<SoundBeamingState>(() => ({
    enabled: localStorage.getItem("pamp_sb_on") !== "0",
    listeners: BEAM_CONFIG.map((b) => ({
      enabled: true,
      pan: b.pan,
      label: b.label,
    })),
    vrDepth:
      (localStorage.getItem("pamp_sb_depth") as SoundBeamingState["vrDepth"]) ??
      "Mid",
  }));

  const [beamEnergy, setBeamEnergy] = useState(0);
  const nodesRef = useRef<Record<string, AudioNode>>({});
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── RAF-based dynamic power tracking ─────────────────────────────────────
  const startBeamTracking = useCallback(
    (analyser: AnalyserNode, nodes: Record<string, AudioNode>) => {
      nodesRef.current = nodes;
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!stateRef.current.enabled) {
          rafRef.current = null;
          setBeamEnergy(0);
          return;
        }
        analyser.getByteFrequencyData(buf);
        // Measure signal energy above 200Hz (matching the beam crossover wall)
        const binSize = analyser.context.sampleRate / analyser.fftSize;
        const startBin = Math.floor(200 / binSize);
        let sum = 0;
        let count = 0;
        for (let i = startBin; i < buf.length; i++) {
          sum += buf[i];
          count++;
        }
        const energy = count > 0 ? sum / count / 255 : 0;

        // More power chain energy → stronger beam (0.3 minimum, 0.8 maximum)
        const beamGain = 0.3 + energy * 0.5;

        for (const key of BEAM_KEYS) {
          const g = nodesRef.current[key] as GainNode | undefined;
          if (g?.context) {
            g.gain.setTargetAtTime(
              stateRef.current.enabled ? beamGain : 0,
              g.context.currentTime,
              0.08,
            );
          }
        }

        setBeamEnergy(energy);
        rafRef.current = requestAnimationFrame(loop);
      };

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    },
    [],
  );

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>, st: SoundBeamingState = state) => {
      nodesRef.current = nodes;
      const powerSource = nodes.powerSource as GainNode | undefined;
      const baseBeamGain = powerSource ? powerSource.gain.value * 0.8 : 0.4;

      for (const key of BEAM_KEYS) {
        const g = nodes[key] as GainNode | undefined;
        if (g?.context) {
          const target = st.enabled ? baseBeamGain : 0;
          g.gain.setTargetAtTime(target, g.context.currentTime, 0.05);
        }
      }
    },
    [state],
  );

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      localStorage.setItem("pamp_sb_on", next.enabled ? "1" : "0");
      const powerSource = nodesRef.current.powerSource as GainNode | undefined;
      const baseBeamGain = powerSource ? powerSource.gain.value * 0.8 : 0.4;
      for (const key of BEAM_KEYS) {
        const g = nodesRef.current[key] as GainNode | undefined;
        if (g?.context) {
          g.gain.setTargetAtTime(
            next.enabled ? baseBeamGain : 0,
            g.context.currentTime,
            0.05,
          );
        }
      }
      if (!next.enabled && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setBeamEnergy(0);
      }
      return next;
    });
  }, []);

  const toggleListener = useCallback((idx: number) => {
    setState((prev) => ({
      ...prev,
      listeners: prev.listeners.map((l, i) =>
        i === idx ? { ...l, enabled: !l.enabled } : l,
      ),
    }));
  }, []);

  const setVRDepth = useCallback((d: SoundBeamingState["vrDepth"]) => {
    localStorage.setItem("pamp_sb_depth", d);
    setState((prev) => ({ ...prev, vrDepth: d }));
  }, []);

  return {
    state,
    beamEnergy,
    toggle,
    toggleListener,
    setVRDepth,
    applyToNodes: (nodes) => applyToNodes(nodes, state),
    startBeamTracking,
  };
}
