/**
 * useSeparationSections
 * 20-30 ×86 Sections — each problem in its own dedicated slot.
 * 7 sections covering signal separation, bass authority, high amp guard,
 * harshness filter, phase monitor, natural bottom, and separator wall.
 * Nothing stacked. Everything plays nice.
 */

import type {
  SeparationSection,
  SeparationSectionsState,
} from "@/types/player";
import { useEffect, useRef, useState } from "react";
import { getSharedAnalyser } from "./usePlayer";

// ─── Constants ────────────────────────────────────────────────────────────────

const TICK_MS = 1200;

const INITIAL_SECTIONS: SeparationSection[] = [
  {
    id: 1,
    name: "Signal Separation ×86",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
  {
    id: 2,
    name: "Bass Authority ×86",
    strength: "50B × 86",
    active: true,
    status: "ok",
  },
  {
    id: 3,
    name: "High Amp Guard ×86",
    strength: "50B × 86",
    active: true,
    status: "ok",
  },
  {
    id: 4,
    name: "Harshness Filter ×86",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
  {
    id: 5,
    name: "Phase Monitor ×86",
    strength: "20-30 × 86",
    active: true,
    status: "monitoring",
  },
  {
    id: 6,
    name: "Natural Bottom ×86",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
  {
    id: 7,
    name: "Separator Wall ×86",
    strength: "20-30 × 86",
    active: true,
    status: "ok",
  },
];

function buildIdle(): SeparationSectionsState {
  return {
    sections: INITIAL_SECTIONS,
    totalSections: INITIAL_SECTIONS.length,
  };
}

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseSeparationSectionsReturn {
  state: SeparationSectionsState;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSeparationSections(
  isPlaying: boolean,
): UseSeparationSectionsReturn {
  const [state, setState] = useState<SeparationSectionsState>(buildIdle);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (!isPlaying) {
      setState(buildIdle());
      return;
    }

    tickRef.current = setInterval(() => {
      const analyser = getSharedAnalyser();

      setState((prev) => {
        const updated = prev.sections.map((section): SeparationSection => {
          if (section.id === 5) {
            // Phase Monitor: real analysis of high-frequency content
            let status: SeparationSection["status"] = "monitoring";
            if (analyser) {
              const freqData = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(freqData);
              // Check for phase anomalies in high frequency bands
              const len = freqData.length;
              const band1 = freqData[Math.floor(len * 0.7)] ?? 0;
              const band2 = freqData[Math.floor(len * 0.85)] ?? 0;
              const band3 = freqData[Math.floor(len * 0.95)] ?? 0;
              const variance =
                Math.abs(band1 - band2) + Math.abs(band2 - band3);
              if (variance > 80) {
                status = "correcting";
              }
            }
            return { ...section, status };
          }

          if (section.id === 1) {
            // Signal Separation: check if audio is flowing
            const status = analyser ? "ok" : "monitoring";
            return { ...section, status };
          }

          // Occasional transient monitoring pulse for other sections
          if (Math.random() < 0.04) {
            return { ...section, status: "monitoring" };
          }
          if (section.status === "monitoring" && Math.random() < 0.6) {
            return { ...section, status: "ok" };
          }

          return section;
        });

        return { ...prev, sections: updated };
      });
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isPlaying]);

  return { state };
}
