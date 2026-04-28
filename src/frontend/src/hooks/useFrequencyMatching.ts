/**
 * useFrequencyMatching — Automatic Frequency Matching + Multi-Freq Hit System
 *                        + Bass Note Switching
 *
 * Three systems unified:
 *  1. Automatic Frequency Matching: 10 bass profiles + 10 high profiles,
 *     smart chips auto-select per song based on real-time frequency analysis.
 *  2. Multi-Frequency Hit System: locks 3-4 dominant frequencies per layer
 *     (bass, mids, highs) simultaneously, no crowding.
 *  3. Bass Note Switching: dominant bass note detected in real time, frequency
 *     profiles switch to match. Mids/highs switch independently.
 *     manualOverride lets you lock to one profile.
 */

import type {
  BassNoteSwitchingState,
  FrequencyMatchingState,
  FrequencyProfile,
  MultiFreqHitState,
} from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSharedAnalyser, getSharedCtx } from "./usePlayer";

const STORAGE_KEY = "poweramp_frequency_matching";

// ─── Bass Profiles (exactly 10) ───────────────────────────────────────────────

export const BASS_PROFILES: FrequencyProfile[] = [
  {
    id: 0,
    name: "Pure Sub",
    range: "14-20Hz",
    character: "Body hit only, felt not heard",
    active: false,
  },
  {
    id: 1,
    name: "Deep Sub Foundation",
    range: "20-30Hz",
    character: "Cheater Beater 33Hz zone",
    active: false,
  },
  {
    id: 2,
    name: "Sub Boom",
    range: "30-40Hz",
    character: "Chest hit, physical impact",
    active: false,
  },
  {
    id: 3,
    name: "Deep Bass",
    range: "40-50Hz",
    character: "Kick drum weight, heavy bottom",
    active: false,
  },
  {
    id: 4,
    name: "Full Bass",
    range: "50-60Hz",
    character: "Warm, thick, punchy",
    active: false,
  },
  {
    id: 5,
    name: "Mid-Low Bass",
    range: "60-80Hz",
    character: "Bass guitar body, fullness",
    active: false,
  },
  {
    id: 6,
    name: "Upper Bass",
    range: "80-100Hz",
    character: "Punch and attack",
    active: false,
  },
  {
    id: 7,
    name: "Bass Presence",
    range: "100-120Hz",
    character: "Note definition",
    active: false,
  },
  {
    id: 8,
    name: "Bass Clarity",
    range: "120-150Hz",
    character: "Instrument separation in low end",
    active: false,
  },
  {
    id: 9,
    name: "Full Deep Sweep",
    range: "14-50Hz",
    character: "All bass layers, bass-heavy tracks",
    active: true,
  },
];

// ─── High Profiles (exactly 10) ──────────────────────────────────────────────

export const HIGH_PROFILES: FrequencyProfile[] = [
  {
    id: 0,
    name: "Air and Shimmer",
    range: "8-10kHz",
    character: "Cymbals, top of vocals",
    active: false,
  },
  {
    id: 1,
    name: "Clarity and Detail",
    range: "10-12kHz",
    character: "Strings, upper harmonics",
    active: false,
  },
  {
    id: 2,
    name: "Brilliance",
    range: "12-14kHz",
    character: "Presence in acoustic instruments",
    active: false,
  },
  {
    id: 3,
    name: "Extended Highs",
    range: "14-16kHz",
    character: "Sparkle, studio quality",
    active: false,
  },
  {
    id: 4,
    name: "Ultra High Presence",
    range: "16-18kHz",
    character: "Only high-quality speakers touch this",
    active: false,
  },
  {
    id: 5,
    name: "Ceiling Highs",
    range: "18-20kHz",
    character: "Edge of human hearing, pure air",
    active: false,
  },
  {
    id: 6,
    name: "Presence Zone",
    range: "4-8kHz",
    character: "Vocals cut through, instruments bite",
    active: true,
  },
  {
    id: 7,
    name: "Smooth Highs",
    range: "6-12kHz",
    character: "Tweeters, silky and clean",
    active: false,
  },
  {
    id: 8,
    name: "Full High Sweep",
    range: "8-16kHz",
    character: "Everything from shimmer to ceiling",
    active: false,
  },
  {
    id: 9,
    name: "Complete High Range",
    range: "4-20kHz",
    character: "Tracks rich in high frequency content",
    active: false,
  },
];

// ─── Default state ────────────────────────────────────────────────────────────

interface FreqMatchingFullState {
  matching: FrequencyMatchingState;
  multiFreq: MultiFreqHitState;
  bassSwitch: BassNoteSwitchingState;
}

function buildDefault(): FreqMatchingFullState {
  return {
    matching: {
      bassProfileIndex: 9,
      highProfileIndex: 6,
      autoSelect: true,
      bassProfiles: BASS_PROFILES.map((p) => ({ ...p })),
      highProfiles: HIGH_PROFILES.map((p) => ({ ...p })),
    },
    multiFreq: {
      bassFreqs: [30, 40, 50],
      midFreqs: [400, 800, 1200],
      highFreqs: [4000, 8000, 12000],
      switching: false,
    },
    bassSwitch: {
      enabled: true,
      currentBassNote: 0,
      currentMidProfile: "Presence Zone",
      currentHighProfile: "Smooth Highs",
      manualOverride: false,
      lockedProfile: null,
    },
  };
}

function loadState(): FreqMatchingFullState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as FreqMatchingFullState;
  } catch {
    /* ignore */
  }
  return buildDefault();
}

function saveState(s: FreqMatchingFullState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTopFreqs(
  data: Uint8Array,
  binCount: number,
  nyquist: number,
  loHz: number,
  hiHz: number,
  count: number,
): number[] {
  const loBin = Math.max(0, Math.floor((loHz / nyquist) * binCount));
  const hiBin = Math.min(binCount - 1, Math.ceil((hiHz / nyquist) * binCount));

  const entries: { hz: number; energy: number }[] = [];
  for (let i = loBin; i <= hiBin; i++) {
    const energy = data[i] ?? 0;
    if (energy > 10) {
      const hz = (i / binCount) * nyquist;
      entries.push({ hz, energy });
    }
  }

  entries.sort((a, b) => b.energy - a.energy);
  return entries.slice(0, count).map((e) => Math.round(e.hz));
}

function bassNoteToProfile(hz: number): number {
  if (hz <= 20) return 0;
  if (hz <= 30) return 1;
  if (hz <= 40) return 2;
  if (hz <= 50) return 3;
  if (hz <= 60) return 4;
  if (hz <= 80) return 5;
  if (hz <= 100) return 6;
  if (hz <= 120) return 7;
  if (hz <= 150) return 8;
  return 9;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseFrequencyMatchingReturn {
  matching: FrequencyMatchingState;
  multiFreq: MultiFreqHitState;
  bassSwitch: BassNoteSwitchingState;
  toggleManualOverride: () => void;
  setLockedProfile: (index: number) => void;
}

export function useFrequencyMatching(
  isPlaying: boolean,
): UseFrequencyMatchingReturn {
  const [fullState, setFullState] = useState<FreqMatchingFullState>(loadState);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const frameRef = useRef(0);

  const toggleManualOverride = useCallback(() => {
    setFullState((prev) => {
      const next: FreqMatchingFullState = {
        ...prev,
        bassSwitch: {
          ...prev.bassSwitch,
          manualOverride: !prev.bassSwitch.manualOverride,
        },
      };
      saveState(next);
      return next;
    });
  }, []);

  const setLockedProfile = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(9, index));
    setFullState((prev) => {
      const next: FreqMatchingFullState = {
        ...prev,
        bassSwitch: {
          ...prev.bassSwitch,
          lockedProfile: clamped,
          manualOverride: true,
        },
      };
      saveState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    if (!isPlaying) return;

    const scan = () => {
      frameRef.current++;

      const analyser = getSharedAnalyser();
      const ctx = getSharedCtx();

      if (!analyser || !ctx || ctx.state !== "running") {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      const binCount = analyser.frequencyBinCount;
      const nyquist = ctx.sampleRate / 2;

      if (!dataRef.current || dataRef.current.length !== binCount) {
        dataRef.current = new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
      }
      analyser.getByteFrequencyData(dataRef.current);

      // Run heavy analysis every 6 frames (~10fps) to avoid CPU overload
      if (frameRef.current % 6 !== 0) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      const data = dataRef.current;

      // Multi-Freq Hit — top 3-4 frequencies per layer
      const bassFreqs = getTopFreqs(data, binCount, nyquist, 20, 300, 4);
      const midFreqs = getTopFreqs(data, binCount, nyquist, 300, 3000, 4);
      const highFreqs = getTopFreqs(data, binCount, nyquist, 3000, 20000, 4);

      // Dominant bass note (single strongest bin in 20-300Hz)
      const dominantBassFreqs = getTopFreqs(
        data,
        binCount,
        nyquist,
        20,
        300,
        1,
      );
      const dominantBass = dominantBassFreqs[0] ?? 0;

      setFullState((prev) => {
        if (prev.bassSwitch.manualOverride) {
          // Manual override — only update multiFreq, leave bass profile locked
          const next: FreqMatchingFullState = {
            ...prev,
            multiFreq: {
              bassFreqs:
                bassFreqs.length > 0 ? bassFreqs : prev.multiFreq.bassFreqs,
              midFreqs:
                midFreqs.length > 0 ? midFreqs : prev.multiFreq.midFreqs,
              highFreqs:
                highFreqs.length > 0 ? highFreqs : prev.multiFreq.highFreqs,
              switching: false,
            },
          };
          saveState(next);
          return next;
        }

        // Auto-select bass profile based on dominant bass note
        const newBassProfileIdx =
          dominantBass > 0
            ? bassNoteToProfile(dominantBass)
            : prev.matching.bassProfileIndex;

        // Auto-select high profile based on dominant high energy bin
        const highBinIdx =
          getTopFreqs(data, binCount, nyquist, 4000, 20000, 1)[0] ?? 0;
        let newHighProfileIdx = prev.matching.highProfileIndex;
        if (highBinIdx >= 18000) newHighProfileIdx = 5;
        else if (highBinIdx >= 14000) newHighProfileIdx = 3;
        else if (highBinIdx >= 10000) newHighProfileIdx = 1;
        else if (highBinIdx >= 8000) newHighProfileIdx = 0;
        else if (highBinIdx >= 6000) newHighProfileIdx = 7;
        else if (highBinIdx >= 4000) newHighProfileIdx = 6;

        const profileChanged =
          newBassProfileIdx !== prev.matching.bassProfileIndex ||
          newHighProfileIdx !== prev.matching.highProfileIndex;

        const currentBassProfile = BASS_PROFILES[newBassProfileIdx];
        const currentHighProfile = HIGH_PROFILES[newHighProfileIdx];

        const next: FreqMatchingFullState = {
          matching: {
            ...prev.matching,
            bassProfileIndex: newBassProfileIdx,
            highProfileIndex: newHighProfileIdx,
            bassProfiles: BASS_PROFILES.map((p) => ({
              ...p,
              active: p.id === newBassProfileIdx,
            })),
            highProfiles: HIGH_PROFILES.map((p) => ({
              ...p,
              active: p.id === newHighProfileIdx,
            })),
          },
          multiFreq: {
            bassFreqs:
              bassFreqs.length > 0 ? bassFreqs : prev.multiFreq.bassFreqs,
            midFreqs: midFreqs.length > 0 ? midFreqs : prev.multiFreq.midFreqs,
            highFreqs:
              highFreqs.length > 0 ? highFreqs : prev.multiFreq.highFreqs,
            switching: profileChanged,
          },
          bassSwitch: {
            ...prev.bassSwitch,
            currentBassNote: dominantBass,
            currentMidProfile:
              currentBassProfile?.name ?? prev.bassSwitch.currentMidProfile,
            currentHighProfile:
              currentHighProfile?.name ?? prev.bassSwitch.currentHighProfile,
          },
        };

        saveState(next);
        return next;
      });

      rafRef.current = requestAnimationFrame(scan);
    };

    rafRef.current = requestAnimationFrame(scan);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  return {
    matching: fullState.matching,
    multiFreq: fullState.multiFreq,
    bassSwitch: fullState.bassSwitch,
    toggleManualOverride,
    setLockedProfile,
  };
}
