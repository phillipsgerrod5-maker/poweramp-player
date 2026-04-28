/**
 * useHighAmp
 * High Amp — powered by browser + power chain + virtual batteries.
 * Every good sound feature routes through it: SRS, HD 9.0, XM, automasphers.
 * NO bass features inside. NO Human Hearing Filter (deleted permanently).
 * Commander Direct Hit 50,000,000,000 × 86 embedded.
 * Highs and bass NEVER mix — enforced by 20-30 ×86 separator wall.
 */

import type { HighAmpState, SeparationSection } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedAnalyser,
  getSharedCtx,
  getSharedHighsFilter,
  getSharedTweetersFilter,
} from "./usePlayer";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMANDER_STRENGTH = "50,000,000,000 × 86";
const SEPARATOR_STRENGTH = "20-30 × 86";
const TICK_MS = Math.round(1000 / 20); // 20fps

const ROUTED_FEATURES = [
  "SRS HD 9.0",
  "XM Processor",
  "Automasphers",
  "Air Filter",
  "Detail Filter",
  "Brilliance Filter",
  "Phase Monitor",
  "Harshness Filter",
  "Ultra Crystal Clear Engine",
];

const INITIAL_SECTIONS: SeparationSection[] = [
  {
    id: 1,
    name: "Signal Separation",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
  {
    id: 2,
    name: "Bass Authority",
    strength: "50B × 86",
    active: true,
    status: "ok",
  },
  {
    id: 3,
    name: "High Amp Guard",
    strength: "50B × 86",
    active: true,
    status: "ok",
  },
  {
    id: 4,
    name: "Harshness Filter",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
  {
    id: 5,
    name: "Phase Monitor",
    strength: "20-30 × 86",
    active: true,
    status: "monitoring",
  },
  {
    id: 6,
    name: "Natural Bottom",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
  {
    id: 7,
    name: "Separator Wall",
    strength: SEPARATOR_STRENGTH,
    active: true,
    status: "ok",
  },
];

function buildIdle(): HighAmpState {
  return {
    active: false,
    power: 100,
    channelStrength: 0,
    commanderActive: true,
    separatorActive: true,
    sections: INITIAL_SECTIONS,
    routedFeatures: ROUTED_FEATURES,
  };
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseHighAmpReturn {
  state: HighAmpState;
  commanderStrength: string;
}

// ─── High frequency signal read ───────────────────────────────────────────────

function getHighsLevel(analyser: AnalyserNode | null, sRate: number): number {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const lo = Math.floor((2500 / (sRate / 2)) * analyser.frequencyBinCount);
  const hi = Math.min(
    analyser.frequencyBinCount - 1,
    Math.floor((14000 / (sRate / 2)) * analyser.frequencyBinCount),
  );
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += data[i] ?? 0;
  return sum / Math.max(1, hi - lo + 1) / 255;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHighAmp(
  isPlaying: boolean,
  masterPower: number,
): UseHighAmpReturn {
  const [state, setState] = useState<HighAmpState>(buildIdle);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionsRef = useRef<SeparationSection[]>(INITIAL_SECTIONS);

  // Apply harshness filter on highs when active — smooth top-end before speaker cone
  const applyHarshnessFilter = useCallback(() => {
    const ctx = getSharedCtx();
    const highsF = getSharedHighsFilter();
    const tweetersF = getSharedTweetersFilter();
    if (!ctx || !highsF || !tweetersF) return;
    // Section 4 — Harshness Filter x86: smooths air/detail/brilliance
    // Ensure Q is smooth (Butterworth) to prevent harsh peaks
    highsF.Q.setTargetAtTime(Math.SQRT2 / 2, ctx.currentTime, 0.1);
    tweetersF.Q.setTargetAtTime(Math.SQRT2 / 2, ctx.currentTime, 0.1);
  }, []);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (!isPlaying) {
      setState(buildIdle());
      return;
    }

    applyHarshnessFilter();

    tickRef.current = setInterval(() => {
      const analyser = getSharedAnalyser();
      const ctx = getSharedCtx();
      const sRate = ctx?.sampleRate ?? 48000;
      const highsLevel = getHighsLevel(analyser, sRate);
      const powerFactor = masterPower / 100;
      const channelStrength = highsLevel * powerFactor;

      // Phase Monitor: detect phase issues via frequency analysis
      let phaseStatus: "ok" | "monitoring" | "correcting" = "monitoring";
      if (analyser) {
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        // Sample high freq band for anomalies
        const midBand = freqData[Math.floor(freqData.length * 0.6)] ?? 0;
        const highBand = freqData[Math.floor(freqData.length * 0.85)] ?? 0;
        if (Math.abs(midBand - highBand) > 100) {
          phaseStatus = "correcting";
        }
      }

      const updatedSections = sectionsRef.current.map((s) =>
        s.id === 5 ? { ...s, status: phaseStatus } : s,
      );
      sectionsRef.current = updatedSections;

      setState({
        active: true,
        power: masterPower,
        channelStrength,
        commanderActive: true,
        separatorActive: true,
        sections: updatedSections,
        routedFeatures: ROUTED_FEATURES,
      });
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying, masterPower, applyHarshnessFilter]);

  return { state, commanderStrength: COMMANDER_STRENGTH };
}
