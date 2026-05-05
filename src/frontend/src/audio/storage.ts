// PowerAmp Player — localStorage persistence for all settings
// Clean cache MUST be called before anything else on every load.

const PREFIX = "pa_";
const CHIP_PREFIX = "pa_chip_";

// SYS/DIAG keys that get cleared every session (never user settings)
const STALE_PREFIXES = ["pa_sys_", "pa_diag_", "pa_restore_"];

/**
 * clearStaleCaches — removes only system/diagnostic keys.
 * PRESERVES all pa_chip_* user settings.
 * Called as FIRST operation on every load.
 */
export function clearStaleCaches(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && STALE_PREFIXES.some((p) => key.startsWith(p))) {
        toRemove.push(key);
      }
    }
    for (const k of toRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

export const storage = {
  save(key: string, value: number | boolean | string): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  },

  loadNum(key: string, defaultValue: number): number {
    // Commander chip takes priority — check pa_chip_ first
    try {
      const chipRaw = localStorage.getItem(CHIP_PREFIX + key);
      if (chipRaw !== null) {
        const v = Number(JSON.parse(chipRaw));
        if (Number.isFinite(v)) return v;
      }
    } catch {
      // fall through
    }
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      const v = Number(JSON.parse(raw));
      return Number.isFinite(v) ? v : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  loadBool(key: string, defaultValue: boolean): boolean {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) === true;
    } catch {
      return defaultValue;
    }
  },

  clear(key: string): void {
    localStorage.removeItem(PREFIX + key);
  },
};
