// Memory Commander Chip — 3,000 slot virtual battery/memory system
// Supreme authority — the app reads from the chip on every startup
// Acts as a virtual battery: stores power, holds charge, delivers on demand

import type { CommanderLights } from "../types";
import type { PowerAmpEngine } from "./engine";

const STORAGE_KEY = "commander_slots_v2";
const ACTIVITY_KEY = "commander_activity_v2";
const MAX_SLOTS = 3000;

export class MemoryCommanderChip {
  private static _instance: MemoryCommanderChip | null = null;

  static getInstance(): MemoryCommanderChip {
    if (!MemoryCommanderChip._instance) {
      MemoryCommanderChip._instance = new MemoryCommanderChip();
    }
    return MemoryCommanderChip._instance;
  }

  private slots: Map<string, number> = new Map();
  private activityLog: string[] = [];

  lights: CommanderLights = {
    audioCtx: false,
    powerChain: false,
    commander: false,
    vpc120kw: false,
    bassCh1: false,
    bassCh2: false,
    mids: false,
    highs: false,
  };

  private _systemPower = 10;

  private constructor() {
    this._loadFromStorage();
  }

  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, number>;
        this.slots = new Map(Object.entries(obj));
      }
      const actRaw = localStorage.getItem(ACTIVITY_KEY);
      if (actRaw) {
        this.activityLog = JSON.parse(actRaw) as string[];
      }
      const savedPower = this.load("CHIPPOWER", 10);
      this._systemPower = Math.max(1, Math.min(20, savedPower));
      this.lights.commander = true;
    } catch {
      this.slots = new Map();
      this.activityLog = [];
    }
  }

  private _saveToStorage(): void {
    try {
      const obj: Record<string, number> = {};
      this.slots.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // storage full — silent
    }
  }

  save(key: string, value: number): void {
    if (this.slots.size >= MAX_SLOTS && !this.slots.has(key)) return;
    this.slots.set(key, value);
    this._saveToStorage();
  }

  load(key: string, defaultValue: number): number {
    const val = this.slots.get(key);
    return val !== undefined ? val : defaultValue;
  }

  loadAll(): Map<string, number> {
    return new Map(this.slots);
  }

  applyToEngine(engine: PowerAmpEngine): void {
    if (!engine.ctx) return;

    const frontline = this.load("FRONTLINEV", 490);
    const masterGainVal = this.load("MASTERGAIN", 1.0);
    const bassEQ = this.load("EQ_BASS", 0);
    const lowMidEQ = this.load("EQ_LOWMID", 0);
    const vocalsEQ = this.load("EQ_VOCALS", 0);
    const midEQ = this.load("EQ_MID", 0);
    const highMidEQ = this.load("EQ_HIGHMID", 0);
    const trebleEQ = this.load("EQ_TREBLE", 0);
    const naturalBottom = this.load("NATURALBOTTOM", 15);
    const mids = this.load("MIDS", 50);
    const highs = this.load("HIGHS", 50);

    if (engine.frontlineGain) {
      engine.frontlineGain.gain.value = Math.max(
        0,
        Math.min(1, frontline / 700),
      );
    }
    if (engine.masterGain)
      engine.masterGain.gain.value = Math.max(0, Math.min(1, masterGainVal));
    if (engine.eqBass)
      engine.eqBass.gain.value = Math.max(-12, Math.min(12, bassEQ));
    if (engine.eqLowMid)
      engine.eqLowMid.gain.value = Math.max(-12, Math.min(12, lowMidEQ));
    if (engine.eqVocals)
      engine.eqVocals.gain.value = Math.max(-12, Math.min(12, vocalsEQ));
    if (engine.eqMid)
      engine.eqMid.gain.value = Math.max(-12, Math.min(12, midEQ));
    if (engine.eqHighMid)
      engine.eqHighMid.gain.value = Math.max(-12, Math.min(12, highMidEQ));
    if (engine.eqTreble)
      engine.eqTreble.gain.value = Math.max(-12, Math.min(12, trebleEQ));
    if (engine.naturalBottomGain) {
      engine.naturalBottomGain.gain.value = Math.max(0.05, naturalBottom / 100);
    }
    if (engine.midsGain)
      engine.midsGain.gain.value = Math.max(0, Math.min(2, (mids / 100) * 2));
    if (engine.highsGain)
      engine.highsGain.gain.value = Math.max(0, Math.min(2, (highs / 100) * 2));

    this.logActivity("Commander delivered all saved values to audio nodes");
  }

  setLight(key: keyof CommanderLights, value: boolean): void {
    this.lights[key] = value;
  }

  getAllLights(): CommanderLights {
    return { ...this.lights };
  }

  getSlotCount(): number {
    return MAX_SLOTS;
  }

  getUsedSlots(): number {
    return this.slots.size;
  }

  logActivity(action: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.activityLog.unshift(`[${timestamp}] ${action}`);
    if (this.activityLog.length > 20)
      this.activityLog = this.activityLog.slice(0, 20);
    try {
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(this.activityLog));
    } catch {
      // silent
    }
  }

  getRecentActivity(): string[] {
    return [...this.activityLog];
  }

  setSystemPower(value: number): void {
    this._systemPower = Math.max(1, Math.min(20, value));
    this.save("CHIPPOWER", this._systemPower);
    this.logActivity(`System power set to ${this._systemPower}`);
  }

  getSystemPower(): number {
    return this._systemPower;
  }

  getSlotEntries(): Array<{ key: string; value: number }> {
    const entries: Array<{ key: string; value: number }> = [];
    this.slots.forEach((value, key) => {
      entries.push({ key, value });
    });
    return entries.slice(0, 60);
  }

  clearAll(): void {
    this.slots = new Map();
    this._saveToStorage();
    this.logActivity("Commander memory cleared — fresh start");
  }
}
