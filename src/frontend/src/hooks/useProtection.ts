// useProtection — New Protection ONLY. Old Protection completely removed.
// No Threshold/Ratio/Release. No limiter. No old system.
import { useCallback, useState } from "react";

const PROT_ENABLED_KEY = "poweramp_protection_enabled";

function loadProtectionEnabled(): boolean {
  try {
    const v = localStorage.getItem(PROT_ENABLED_KEY);
    return v === null ? true : v === "true";
  } catch {
    return true;
  }
}

// Legacy compat types kept so ProtectionDrawer stub doesn't break if imported
export interface OldProtState {
  engine: number;
  bassMidds: number;
  highs: number;
}

export interface NewProtState {
  distClean: number;
  clipping: number;
  power: number;
}

export function useProtection() {
  const [protectionEnabled, setProtectionEnabledState] = useState<boolean>(() =>
    loadProtectionEnabled(),
  );

  const setProtectionEnabled = useCallback((enabled: boolean) => {
    setProtectionEnabledState(enabled);
    try {
      localStorage.setItem(PROT_ENABLED_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  }, []);

  // Legacy compat no-ops — ProtectionDrawer stub may reference these
  const oldProt: OldProtState = { engine: 80, bassMidds: 80, highs: 80 };
  const newProt: NewProtState = { distClean: 80, clipping: 80, power: 80 };
  const setOldProt = useCallback(
    (_key: keyof OldProtState, _v: number) => {},
    [],
  );
  const setNewProt = useCallback(
    (_key: keyof NewProtState, _v: number) => {},
    [],
  );

  return {
    oldProt,
    newProt,
    setOldProt,
    setNewProt,
    protectionEnabled,
    setProtectionEnabled,
  };
}
