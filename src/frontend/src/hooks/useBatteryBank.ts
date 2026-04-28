/**
 * useBatteryBank — Full Side Battery Bank
 *
 * 20-30 batteries in their own dedicated section.
 * Powered by one channel from Engine 1 (Channel 2).
 * Each battery receives: 80,000 / batteryCount watts.
 * All batteries are wired together → combined output = 80,000 straight to the amp.
 * Charge level always 100% — Engine 1 Channel 2 keeps them full continuously.
 *
 * Toggle between 20 and 30 battery configurations.
 */

import type { BatteryBankState, BatteryUnit } from "@/types/player";
import { useCallback, useState } from "react";

const STORAGE_KEY = "poweramp_battery_bank";
const COMBINED_OUTPUT = 80_000;
const CHANNEL_SOURCE = 2;

function buildBatteries(count: number): BatteryUnit[] {
  const wattsEach = Math.round(COMBINED_OUTPUT / count);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    chargeLevel: 100,
    wattsReceived: wattsEach,
    active: true,
  }));
}

function loadState(): BatteryBankState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BatteryBankState;
  } catch {
    /* ignore */
  }
  return {
    batteries: buildBatteries(20),
    channelSource: CHANNEL_SOURCE,
    combinedOutput: COMBINED_OUTPUT,
    allWiredTogether: true,
  };
}

function saveState(s: BatteryBankState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface UseBatteryBankReturn {
  state: BatteryBankState;
  /** Switch between 20 and 30 battery configuration */
  toggleBatteryCount: () => void;
}

export function useBatteryBank(): UseBatteryBankReturn {
  const [state, setState] = useState<BatteryBankState>(loadState);

  const toggleBatteryCount = useCallback(() => {
    setState((prev) => {
      const currentCount = prev.batteries.length;
      const newCount = currentCount === 20 ? 30 : 20;
      const next: BatteryBankState = {
        ...prev,
        batteries: buildBatteries(newCount),
        combinedOutput: COMBINED_OUTPUT, // always 80,000 combined
        allWiredTogether: true,
      };
      saveState(next);
      return next;
    });
  }, []);

  return { state, toggleBatteryCount };
}
