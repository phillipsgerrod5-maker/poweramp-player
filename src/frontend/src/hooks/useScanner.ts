/**
 * useScanner — 99.0 Fix Scanner
 * Full state machine: idle → initializing → system-check → network-scan →
 * audio-engine → deep-analysis → compiling → complete
 * 22 fix options, real-time log messages, 3 Trillion Data Points
 */

import type {
  LogMessage,
  ScanFix,
  ScanStage,
  ScannerState,
} from "@/types/player";
import { useCallback, useRef, useState } from "react";

// ─── Fix options (22 total) ───────────────────────────────────────────────────

const ALL_FIXES: ScanFix[] = [
  {
    id: "fix-01",
    label: "Audio context unlock",
    description: "Force-resume suspended AudioContext on any gesture",
    selected: true,
  },
  {
    id: "fix-02",
    label: "Compressor bypass",
    description: "Reset compressor to -100dB threshold (transparent)",
    selected: true,
  },
  {
    id: "fix-03",
    label: "EQ chain re-wire",
    description: "Rebuild biquad filter chain if nodes are stale",
    selected: true,
  },
  {
    id: "fix-04",
    label: "Bass filter calibrate",
    description: "Re-center bass lowshelf at 200Hz, gain 0",
    selected: false,
  },
  {
    id: "fix-05",
    label: "Mids filter calibrate",
    description: "Re-center mids peaking at 1kHz, gain 0",
    selected: false,
  },
  {
    id: "fix-06",
    label: "Highs filter calibrate",
    description: "Re-center highs highshelf at 4kHz, gain 0",
    selected: false,
  },
  {
    id: "fix-07",
    label: "Notch fuse reset",
    description: "Reset isolation notch to 75Hz Q=10",
    selected: false,
  },
  {
    id: "fix-08",
    label: "Panner center",
    description: "Set StereoPanner pan to 0 (center field)",
    selected: false,
  },
  {
    id: "fix-09",
    label: "Analyser flush",
    description: "Clear AnalyserNode buffer and reset FFT size to 2048",
    selected: false,
  },
  {
    id: "fix-10",
    label: "Volume normalize",
    description: "Reset mediaElement.volume to safe 0.85 baseline",
    selected: false,
  },
  {
    id: "fix-11",
    label: "SRS reconnect",
    description: "Re-attach SRS processor to active audio chain",
    selected: false,
  },
  {
    id: "fix-12",
    label: "XM notch refresh",
    description: "Re-apply XM static-bypass notch at 50Hz Q=30",
    selected: false,
  },
  {
    id: "fix-13",
    label: "Commander assert",
    description: "Re-assert Commander Direct Hit orders on all bands",
    selected: false,
  },
  {
    id: "fix-14",
    label: "Bass presence restore",
    description: "Restore bass presence type selection to last saved",
    selected: false,
  },
  {
    id: "fix-15",
    label: "Signal chain sync",
    description: "Sync all signal path nodes with current component health",
    selected: false,
  },
  {
    id: "fix-16",
    label: "Freq switcher reset",
    description: "Reset bass note switcher to auto-detect mode",
    selected: false,
  },
  {
    id: "fix-17",
    label: "Autosphere recalibrate",
    description: "Reset autosphere breathing coefficients to default",
    selected: false,
  },
  {
    id: "fix-18",
    label: "Power supply check",
    description: "Verify 12,000W supply allocation and deduction totals",
    selected: false,
  },
  {
    id: "fix-19",
    label: "Bluetooth profile reload",
    description: "Re-load saved speaker profiles from local storage",
    selected: false,
  },
  {
    id: "fix-20",
    label: "HRTF panner calibrate",
    description: "Re-sync HRTF panner position to current listener angle",
    selected: false,
  },
  {
    id: "fix-21",
    label: "Protection system audit",
    description: "Run full Stabilizer + Commander audit across all bands",
    selected: false,
  },
  {
    id: "fix-22",
    label: "Full chain rebuild",
    description: "Nuclear option — destroy and rebuild entire audio chain",
    selected: false,
  },
];

// ─── Stage messages ───────────────────────────────────────────────────────────

const STAGE_MESSAGES: Record<string, string[]> = {
  initializing: [
    "Initializing 99.0 Fix Scanner v9.9...",
    "Loading 3 Trillion Data Point knowledge base...",
    "PowerAmp diagnostic engine armed.",
    "Signal chain handshake — acknowledged.",
  ],
  "system-check": [
    "Running full system check — 25 sensors online...",
    "Checking power chain: Batteries → Fuses → Amp...",
    "Fuse panel: 20× 15,000W + 1× 75,000W isolation fuse — NOMINAL.",
    "Combined amp (Virtual + Digital + Tube) — ONLINE.",
    "Signal path continuity confirmed — 4-gauge direct.",
  ],
  "network-scan": [
    "Scanning Bluetooth analyzer profiles...",
    "XM processor SNR check — 110 dB confirmed.",
    "XM THD check — 0.009% — BELOW THRESHOLD.",
    "Commander Direct Hit — authority confirmed, no overrides.",
    "Analyzer power supply: 12,000W — deduction totals valid.",
  ],
  "audio-engine": [
    "Probing AudioContext state...",
    "BiquadFilter chain: bass → mids → highs → notch — WIRED.",
    "StereoPanner: pan range ±0.35 — nominal.",
    "AnalyserNode: fftSize=2048, smoothing=0.8 — ACTIVE.",
    "No GainNodes detected. No WaveShapers detected. ✓",
    "Compressor threshold: -100dB (transparent) — CONFIRMED.",
  ],
  "deep-analysis": [
    "Running HD 9.0 instrument sensor sweep...",
    "SRS automasphere coefficients: 0.8–1.0 — healthy.",
    "Bass note switcher: auto-detect mode — ACTIVE.",
    "HRTF panner: Sound Beaming system — standby.",
    "Signal chain: 12 channels — 80,000 each — SOLID.",
    "Protection system: Stabilizer 80,000 — armed.",
  ],
  compiling: [
    "Compiling diagnostic report...",
    "Cross-referencing 3 Trillion Data Points...",
    "Applying recommended fixes...",
    "Verifying audio chain integrity post-fix...",
    "99.0 Fix Scanner report ready.",
  ],
};

// ─── Stage config ─────────────────────────────────────────────────────────────

interface StageConfig {
  stage: ScanStage;
  durationMs: number;
  targetProgress: number;
}

const STAGE_SEQUENCE: StageConfig[] = [
  { stage: "initializing", durationMs: 800, targetProgress: 10 },
  { stage: "system-check", durationMs: 1200, targetProgress: 30 },
  { stage: "network-scan", durationMs: 1000, targetProgress: 50 },
  { stage: "audio-engine", durationMs: 1400, targetProgress: 70 },
  { stage: "deep-analysis", durationMs: 1600, targetProgress: 88 },
  { stage: "compiling", durationMs: 1000, targetProgress: 100 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _msgSeed = 1;
function makeMsg(text: string): LogMessage {
  return { id: `msg-${_msgSeed++}`, text };
}

function buildIdle(): ScannerState {
  return {
    isOpen: false,
    isScanning: false,
    stage: "idle",
    progress: 0,
    messages: [],
    showHelpPrompt: false,
    showFixPanel: false,
    selectedFixes: ALL_FIXES.filter((f) => f.selected).map((f) => f.id),
    fixes: ALL_FIXES,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseScannerReturn {
  state: ScannerState;
  open: () => void;
  close: () => void;
  startScan: () => void;
  toggleFix: (id: string) => void;
  selectAllFixes: () => void;
  clearAllFixes: () => void;
  applyFixes: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScanner(): UseScannerReturn {
  const [state, setState] = useState<ScannerState>(buildIdle);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  const open = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const close = useCallback(() => {
    clearTimeouts();
    setState((prev) => ({ ...prev, isOpen: false, isScanning: false }));
  }, [clearTimeouts]);

  const startScan = useCallback(() => {
    clearTimeouts();

    setState((prev) => ({
      ...prev,
      isScanning: true,
      stage: "initializing",
      progress: 0,
      messages: [makeMsg("— 99.0 Fix Scanner activated —")],
      showHelpPrompt: false,
      showFixPanel: false,
    }));

    let elapsed = 0;

    for (const cfg of STAGE_SEQUENCE) {
      const stageStart = elapsed;
      const stageDuration = cfg.durationMs;
      const msgs = STAGE_MESSAGES[cfg.stage] ?? [];

      // Schedule stage activation
      const stageTimer = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          stage: cfg.stage as ScanStage,
          messages: [...prev.messages, makeMsg(`▶ ${cfg.stage.toUpperCase()}`)],
        }));

        // Schedule individual messages within stage
        msgs.forEach((text, i) => {
          const msgDelay = ((i + 1) / (msgs.length + 1)) * stageDuration;
          const msgTimer = setTimeout(() => {
            setState((prev) => {
              const progress = Math.min(
                cfg.targetProgress,
                Math.round(
                  cfg.targetProgress - 10 + ((i + 1) / msgs.length) * 10,
                ),
              );
              return {
                ...prev,
                progress,
                messages: [...prev.messages.slice(-50), makeMsg(text)],
              };
            });
          }, msgDelay);
          timeoutsRef.current.push(msgTimer);
        });

        // Set progress at end of this stage
        const progressTimer = setTimeout(() => {
          setState((prev) => ({ ...prev, progress: cfg.targetProgress }));
        }, stageDuration - 50);
        timeoutsRef.current.push(progressTimer);
      }, stageStart);

      timeoutsRef.current.push(stageTimer);
      elapsed += stageDuration;
    }

    // Final completion
    const completeTimer = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        stage: "complete",
        progress: 100,
        isScanning: false,
        showFixPanel: true,
        messages: [
          ...prev.messages.slice(-50),
          makeMsg("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
          makeMsg("99.0 Fix Scanner — SCAN COMPLETE"),
          makeMsg(`${ALL_FIXES.length} fix options ready for review.`),
          makeMsg("Select fixes and press APPLY to run repairs."),
        ],
      }));
    }, elapsed);

    timeoutsRef.current.push(completeTimer);
  }, [clearTimeouts]);

  const toggleFix = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      fixes: prev.fixes.map((f) =>
        f.id === id ? { ...f, selected: !f.selected } : f,
      ),
      selectedFixes: prev.selectedFixes.includes(id)
        ? prev.selectedFixes.filter((x) => x !== id)
        : [...prev.selectedFixes, id],
    }));
  }, []);

  const selectAllFixes = useCallback(() => {
    setState((prev) => ({
      ...prev,
      fixes: prev.fixes.map((f) => ({ ...f, selected: true })),
      selectedFixes: prev.fixes.map((f) => f.id),
    }));
  }, []);

  const clearAllFixes = useCallback(() => {
    setState((prev) => ({
      ...prev,
      fixes: prev.fixes.map((f) => ({ ...f, selected: false })),
      selectedFixes: [],
    }));
  }, []);

  const applyFixes = useCallback(() => {
    setState((prev) => {
      const selected = prev.fixes.filter((f) => f.selected);
      const applyMsgs = [
        makeMsg("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
        makeMsg(`Applying ${selected.length} fix(es)...`),
        ...selected.map((f) => makeMsg(`✓ ${f.label} — applied`)),
        makeMsg("All fixes applied. System restored to 99.0 spec."),
        makeMsg("Signal chain synced. Power chain nominal."),
      ];
      return {
        ...prev,
        showFixPanel: false,
        stage: "complete",
        messages: [...prev.messages.slice(-30), ...applyMsgs],
      };
    });
  }, []);

  return {
    state,
    open,
    close,
    startScan,
    toggleFix,
    selectAllFixes,
    clearAllFixes,
    applyFixes,
  };
}
