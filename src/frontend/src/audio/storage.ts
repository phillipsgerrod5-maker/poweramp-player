// PowerAmp Player — localStorage persistence for all settings

const PREFIX = "pa_";

export const storage = {
  save(key: string, value: number | boolean | string): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  },

  loadNum(key: string, defaultValue: number): number {
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
