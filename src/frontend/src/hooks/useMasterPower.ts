/**
 * useMasterPower — Master Power Slider (0–100%)
 *
 * This is a POWER slider, not a volume slider.
 * It controls how much power the amps receive — 0% → minimum output, 100% → full output.
 *
 * Signal path position: AFTER volume.
 * The compressor threshold is NEVER touched here. NEVER.
 *
 * Gain mapping: 0% → 0.1 (system stays alive), 100% → 1.0 (full amp power)
 * Default: 80% (strong, not maxed out by default)
 *
 * Labels: 0-20="MINIMAL", 21-40="LOW", 41-60="MODERATE", 61-80="STRONG",
 *         81-95="FULL POWER", 96-100="MAXIMUM FORCE"
 *
 * Auto-saves to localStorage "poweramp_master_power" on every change.
 */

import type { MasterPowerState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSharedMasterGain } from "./usePlayer";

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "poweramp_master_power";

/** Virtual charger strength display — shown in the panel */
const CHARGER_STRENGTH = "80,000";

/** Battery tick interval — keeps batteries visually alive */
const TICK_MS = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * powerToGain — maps power level 0-100 to gain multiplier 0.1-1.0.
 * 0%   → 0.1 (never silent — system stays alive)
 * 100% → 1.0 (full amp power)
 * Linear mapping: gain = 0.1 + (level / 100) * 0.9
 */
export function powerToGain(power: number): number {
  const clamped = Math.max(0, Math.min(100, power));
  return 0.1 + (clamped / 100) * 0.9;
}

/**
 * getStrengthLabel — human-readable label for the current power level.
 * Ranges match the spec exactly.
 */
function getStrengthLabel(power: number): string {
  if (power >= 96) return "MAXIMUM FORCE";
  if (power >= 81) return "FULL POWER";
  if (power >= 61) return "STRONG";
  if (power >= 41) return "MODERATE";
  if (power >= 21) return "LOW";
  return "MINIMAL";
}

function loadSavedPower(): number {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v !== null) {
      const n = Number(v);
      if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
    }
  } catch {
    /* ignore */
  }
  return 80; // default 80%
}

function buildState(masterPower: number): MasterPowerState {
  const label = getStrengthLabel(masterPower);
  const multiplier = powerToGain(masterPower);
  return {
    masterPower,
    powerLevel: masterPower, // alias — both names point to the same value
    isActive: masterPower > 0,
    strengthLabel: label,
    gainMultiplier: multiplier,
    virtualPower: masterPower,
    realPower: masterPower,
    chargerActive: true,
    batteriesCharged: true,
    chargeLevel: 100, // virtual batteries always full
    chargerStrength: CHARGER_STRENGTH,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseMasterPowerReturn {
  state: MasterPowerState;
  /** protectionActive is always true — protection never turns off */
  protectionActive: true;
  /** Current gain multiplier: 0% → 0.1, 100% → 1.0 */
  masterGainMultiplier: number;
  /**
   * setMasterPower — user-controlled power slider.
   * Range: 0–100. Every integer is a real stop.
   * Adjusts gain on the master GainNode — NEVER touches compressor.
   * Auto-saves to localStorage on every call.
   */
  setMasterPower: (value: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMasterPower(): UseMasterPowerReturn {
  const [state, setState] = useState<MasterPowerState>(() =>
    buildState(loadSavedPower()),
  );
  const masterPowerRef = useRef(state.masterPower);
  const chargeTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apply saved power level to the master GainNode on mount
  useEffect(() => {
    const gainNode = getSharedMasterGain();
    if (gainNode) {
      gainNode.gain.setTargetAtTime(
        powerToGain(masterPowerRef.current),
        gainNode.context.currentTime,
        0.05,
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setMasterPower = useCallback((value: number) => {
    // Integer clamp: 0–100, every number is a real stop
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    masterPowerRef.current = clamped;

    // Auto-save every touch — instantly
    try {
      localStorage.setItem(LS_KEY, String(clamped));
    } catch {
      /* ignore */
    }

    // Apply to master GainNode — POWER slider, not volume.
    // The compressor threshold is NEVER modified here. NEVER.
    const gainNode = getSharedMasterGain();
    if (gainNode) {
      gainNode.gain.setTargetAtTime(
        powerToGain(clamped),
        gainNode.context.currentTime,
        0.05, // smooth 50ms ramp — no pops
      );
    }

    setState(buildState(clamped));
  }, []);

  // Virtual charger keeps batteries at 100% — ticking half-second
  useEffect(() => {
    chargeTickRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        chargeLevel: 100,
        chargerActive: true,
        batteriesCharged: true,
      }));
    }, TICK_MS);

    return () => {
      if (chargeTickRef.current) clearInterval(chargeTickRef.current);
      // Restore gain to full on unmount — clean exit
      const gainNode = getSharedMasterGain();
      if (gainNode) {
        gainNode.gain.setTargetAtTime(1.0, gainNode.context.currentTime, 0.1);
      }
    };
  }, []);

  return {
    state,
    protectionActive: true,
    masterGainMultiplier: state.gainMultiplier,
    setMasterPower,
  };
}
