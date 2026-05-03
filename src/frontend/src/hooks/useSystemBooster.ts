import { useCallback, useRef, useState } from "react";

// ─── System Booster ────────────────────────────────────────────────────────────
// FIX: Dedicated systemBooster GainNode in the signal chain.
// boostLevel 0–20 → systemBooster gain 1.0 + (level/20)*1.8 → max 2.8 at level 20.
// Self-contained: draws from xmFeed branch (isolated), protection built-in via gain cap.
// Saves state to localStorage automatically.

export interface SystemBoosterState {
  enabled: boolean;
  boostLevel: number; // 0–20
}

export interface UseSystemBoosterReturn {
  state: SystemBoosterState;
  toggle: () => void;
  setBoostLevel: (v: number) => void;
  applyToNodes: (nodes: Record<string, AudioNode>) => void;
}

function load(key: string, def: number): number {
  const v = localStorage.getItem(key);
  return v !== null ? Number.parseFloat(v) : def;
}

// FIX: boostLevel 0–20 → gain 1.0–2.8 (was 1.0–1.3).
// At level 20: gain 2.8 (almost 3x — clearly audible vs level 0 = 1.0).
function levelToGain(level: number): number {
  return 1.0 + (level / 20) * 1.8;
}

export function useSystemBooster(): UseSystemBoosterReturn {
  const [state, setState] = useState<SystemBoosterState>({
    enabled: localStorage.getItem("pamp_booster_on") !== "0",
    boostLevel: load("pamp_booster_level", 10),
  });

  const nodesRef = useRef<Record<string, AudioNode>>({});

  const applyToNodes = useCallback(
    (nodes: Record<string, AudioNode>, st: SystemBoosterState = state) => {
      nodesRef.current = nodes;
      // FIX: Target the dedicated systemBooster node (new in useAudioEngine).
      // Falls back to signalBooster if systemBooster is not present (backward compat).
      const targetNode =
        (nodes.systemBooster as GainNode | undefined) ??
        (nodes.signalBooster as GainNode | undefined) ??
        (nodes.stabCommander as GainNode | undefined);
      if (targetNode?.context) {
        const gain = st.enabled ? levelToGain(st.boostLevel) : 1.0;
        targetNode.gain.setTargetAtTime(
          gain,
          targetNode.context.currentTime,
          0.005,
        );
      }
      // Protection built-in: boost protectionChannelGain proportionally
      const pCh = nodes.protectionChannelGain as GainNode | undefined;
      if (pCh?.context && st.enabled) {
        const protBoost = 1.0 + (st.boostLevel / 20) * 0.2;
        pCh.gain.setTargetAtTime(protBoost, pCh.context.currentTime, 0.005);
      }
    },
    [state],
  );

  const toggle = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      localStorage.setItem("pamp_booster_on", next.enabled ? "1" : "0");
      const nodes = nodesRef.current;
      const targetNode =
        (nodes.systemBooster as GainNode | undefined) ??
        (nodes.signalBooster as GainNode | undefined) ??
        (nodes.stabCommander as GainNode | undefined);
      if (targetNode?.context) {
        const gain = next.enabled ? levelToGain(next.boostLevel) : 1.0;
        // FIX: Instant 5ms time constant so toggle is immediately audible
        targetNode.gain.setTargetAtTime(
          gain,
          targetNode.context.currentTime,
          0.005,
        );
      }
      return next;
    });
  }, []);

  const setBoostLevel = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(20, Math.round(v)));
    localStorage.setItem("pamp_booster_level", String(clamped));
    setState((prev) => {
      const next = { ...prev, boostLevel: clamped };
      const nodes = nodesRef.current;
      const targetNode =
        (nodes.systemBooster as GainNode | undefined) ??
        (nodes.signalBooster as GainNode | undefined) ??
        (nodes.stabCommander as GainNode | undefined);
      if (targetNode?.context && next.enabled) {
        // FIX: Use setValueAtTime for instant gain change on slider move
        targetNode.gain.setValueAtTime(
          levelToGain(clamped),
          targetNode.context.currentTime,
        );
      }
      return next;
    });
  }, []);

  return { state, toggle, setBoostLevel, applyToNodes };
}
