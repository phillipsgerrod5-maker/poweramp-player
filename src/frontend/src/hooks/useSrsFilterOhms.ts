/**
 * useSrsFilterOhms
 * SRS Filter for 8 Ohms — 9 DEDICATED BiquadFilter nodes truly wired into the chain.
 * Emulates 2-4 ohm sound character through 8 ohm output.
 * All 9 mimick filters feed into the 8 OHM DUMMY LOAD (WaveShaper soft-clipping).
 * Range: 14–60Hz bass system. SRS Filter sits inside the bass system.
 * Runs when SRS is enabled.
 *
 * 9 Dedicated filters:
 * 1. Current Force       — peaking 30Hz Q=2.0  — extra cone force at low bass
 * 2. Cone Freedom        — lowshelf 50Hz Q=0.8 — simulates loose cone movement
 * 3. Sensitivity Boost   — peaking 100Hz Q=1.5 — bass presence sensitivity
 * 4. Crossover Comp      — peaking 200Hz Q=2.0 — compensates crossover rolloff
 * 5. Dynamic Headroom    — highshelf 300Hz Q=1.0 — upper bass headroom
 * 6. Low-Mid Warmth      — peaking 400Hz Q=1.2 — warmth in low-mid
 * 7. Drop Descent        — lowshelf 25Hz Q=3.0 — descent of a bass drop
 * 8. Landing Weight      — peaking 60Hz Q=2.5  — landing impact weight
 * 9. Drop Clarity        — peaking 80Hz Q=2.0  — clarity after the drop
 *
 * Chain inserted: bassFilter → [9 filters] → WaveShaper(8Ω dummy load) → lowmidFilter
 *
 * Commander: caps at ±12dB — nothing exceeds this
 * Auto-save: localStorage "poweramp_ohms_*"
 */

import type { OhmCharacter, SrsOhmsState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedBassFilter,
  getSharedCtx,
  getSharedLowMidFilter,
} from "./usePlayer";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const LS_PREFIX = "poweramp_ohms_";

function lsGetNum(key: string, def: number): number {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    if (v === null) return def;
    const n = Number.parseFloat(v);
    return Number.isNaN(n) ? def : n;
  } catch {
    return def;
  }
}

function lsGetBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    if (v === null) return def;
    return v !== "false";
  } catch {
    return def;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    /* ignore */
  }
}

// ─── Module-level dedicated filter nodes ─────────────────────────────────────
let mfCurrentForce: BiquadFilterNode | null = null;
let mfConeFreedom: BiquadFilterNode | null = null;
let mfSensitivityBoost: BiquadFilterNode | null = null;
let mfCrossoverComp: BiquadFilterNode | null = null;
let mfDynamicHeadroom: BiquadFilterNode | null = null;
let mfLowMidWarmth: BiquadFilterNode | null = null;
let mfDropDescent: BiquadFilterNode | null = null;
let mfLandingWeight: BiquadFilterNode | null = null;
let mfDropClarity: BiquadFilterNode | null = null;
let mfDummyLoad: WaveShaperNode | null = null;
let nodesBuilt = false;

// Stored slider values (persisted across enable/disable cycles)
const storedValues: Record<string, number> = {
  currentForce: lsGetNum("currentForce", 50),
  coneFreedom: lsGetNum("coneFreedom", 50),
  sensitivityPresence: lsGetNum("sensitivityPresence", 50),
  crossoverCompensation: lsGetNum("crossoverCompensation", 50),
  dynamicHeadroom: lsGetNum("dynamicHeadroom", 50),
  lowMidWarmth: lsGetNum("lowMidWarmth", 50),
  dropDescent: lsGetNum("dropDescent", 50),
  landingWeight: lsGetNum("landingWeight", 50),
  dropClarity: lsGetNum("dropClarity", 50),
};

// ─── 8-Ohm Dummy Load WaveShaper ─────────────────────────────────────────────
// Models 8-ohm speaker thermal limit: warm saturation, never harsh.
// tanh-based soft clipping — thermal saturation model.
function buildDummyLoadCurve(drive = 1.0): Float32Array<ArrayBuffer> {
  const samples = 256;
  const buf = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buf) as Float32Array<ArrayBuffer>;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1; // -1 to +1
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
}

// ─── Slider → gain conversion ─────────────────────────────────────────────────
// Slider 0–100: center 50 = 0dB. At 100 = +8dB. At 0 = -8dB.
function sliderToGain(value: number): number {
  return ((value - 50) / 50) * 8;
}

// ─── Commander cap — nothing over ±12dB ──────────────────────────────────────
function commanderCap(gainDb: number): number {
  return Math.max(-12, Math.min(12, gainDb));
}

// ─── Build and wire all 9 filter nodes ────────────────────────────────────────
function ensureMimickNodes(): boolean {
  if (nodesBuilt) return true;
  const ctx = getSharedCtx();
  const bassF = getSharedBassFilter();
  const lowmidF = getSharedLowMidFilter();
  if (!ctx || !bassF || !lowmidF) return false;

  try {
    // 1. CURRENT FORCE — peaking 30Hz, Q=2.0 — simulates extra cone force at low bass
    mfCurrentForce = ctx.createBiquadFilter();
    mfCurrentForce.type = "peaking";
    mfCurrentForce.frequency.value = 30;
    mfCurrentForce.Q.value = 2.0;
    mfCurrentForce.gain.value = 0;

    // 2. CONE FREEDOM — lowshelf 50Hz, Q=0.8 — simulates loose cone movement
    mfConeFreedom = ctx.createBiquadFilter();
    mfConeFreedom.type = "lowshelf";
    mfConeFreedom.frequency.value = 50;
    mfConeFreedom.Q.value = 0.8;
    mfConeFreedom.gain.value = 0;

    // 3. SENSITIVITY BOOST — peaking 100Hz, Q=1.5 — sensitivity at bass presence
    mfSensitivityBoost = ctx.createBiquadFilter();
    mfSensitivityBoost.type = "peaking";
    mfSensitivityBoost.frequency.value = 100;
    mfSensitivityBoost.Q.value = 1.5;
    mfSensitivityBoost.gain.value = 0;

    // 4. CROSSOVER COMP — peaking 200Hz, Q=2.0 — compensates crossover rolloff
    mfCrossoverComp = ctx.createBiquadFilter();
    mfCrossoverComp.type = "peaking";
    mfCrossoverComp.frequency.value = 200;
    mfCrossoverComp.Q.value = 2.0;
    mfCrossoverComp.gain.value = 0;

    // 5. DYNAMIC HEADROOM — highshelf 300Hz, Q=1.0 — upper bass headroom
    mfDynamicHeadroom = ctx.createBiquadFilter();
    mfDynamicHeadroom.type = "highshelf";
    mfDynamicHeadroom.frequency.value = 300;
    mfDynamicHeadroom.Q.value = 1.0;
    mfDynamicHeadroom.gain.value = 0;

    // 6. LOW-MID WARMTH — peaking 400Hz, Q=1.2 — warmth in low-mid
    mfLowMidWarmth = ctx.createBiquadFilter();
    mfLowMidWarmth.type = "peaking";
    mfLowMidWarmth.frequency.value = 400;
    mfLowMidWarmth.Q.value = 1.2;
    mfLowMidWarmth.gain.value = 0;

    // 7. DROP DESCENT — lowshelf 25Hz, Q=3.0 — descent of a bass drop
    mfDropDescent = ctx.createBiquadFilter();
    mfDropDescent.type = "lowshelf";
    mfDropDescent.frequency.value = 25;
    mfDropDescent.Q.value = 3.0;
    mfDropDescent.gain.value = 0;

    // 8. LANDING WEIGHT — peaking 60Hz, Q=2.5 — landing impact weight
    mfLandingWeight = ctx.createBiquadFilter();
    mfLandingWeight.type = "peaking";
    mfLandingWeight.frequency.value = 60;
    mfLandingWeight.Q.value = 2.5;
    mfLandingWeight.gain.value = 0;

    // 9. DROP CLARITY — peaking 80Hz, Q=2.0 — clarity after the drop
    mfDropClarity = ctx.createBiquadFilter();
    mfDropClarity.type = "peaking";
    mfDropClarity.frequency.value = 80;
    mfDropClarity.Q.value = 2.0;
    mfDropClarity.gain.value = 0;

    // 8 OHM DUMMY LOAD — WaveShaper after all 9 filters
    // Thermal saturation model: warm at high levels, never harsh
    mfDummyLoad = ctx.createWaveShaper();
    mfDummyLoad.curve = buildDummyLoadCurve(1.0);
    mfDummyLoad.oversample = "2x";

    // Disconnect bass → lowmid, insert 9 filters + dummy load in between
    bassF.disconnect(lowmidF);

    // Wire: bass → filter1..9 → dummyLoad → lowmid
    bassF
      .connect(mfCurrentForce)
      .connect(mfConeFreedom)
      .connect(mfSensitivityBoost)
      .connect(mfCrossoverComp)
      .connect(mfDynamicHeadroom)
      .connect(mfLowMidWarmth)
      .connect(mfDropDescent)
      .connect(mfLandingWeight)
      .connect(mfDropClarity)
      .connect(mfDummyLoad)
      .connect(lowmidF);

    nodesBuilt = true;
    console.log(
      "[PowerAmp] 9 SRS Ohm Mimick Filters + 8Ω Dummy Load wired: bass → 9filters → WaveShaper → lowmid",
      "| Covers 14-60Hz | Commander cap ±12dB",
    );
    return true;
  } catch (e) {
    console.error("[PowerAmp] useSrsFilterOhms ensureMimickNodes error:", e);
    nodesBuilt = false;
    return false;
  }
}

// ─── Apply a single filter gain ───────────────────────────────────────────────
function applyFilterGain(
  node: BiquadFilterNode | null,
  gainDb: number,
  ctx: AudioContext,
): void {
  if (!node) return;
  node.gain.setTargetAtTime(commanderCap(gainDb), ctx.currentTime, 0.04);
}

// ─── Apply all 9 filter values ────────────────────────────────────────────────
function applyAllFilters(
  values: Record<string, number>,
  active: boolean,
): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  if (!nodesBuilt) {
    ensureMimickNodes();
    return;
  }

  if (!active) {
    // Disabled — zero all gains (pass-through)
    for (const f of [
      mfCurrentForce,
      mfConeFreedom,
      mfSensitivityBoost,
      mfCrossoverComp,
      mfDynamicHeadroom,
      mfLowMidWarmth,
      mfDropDescent,
      mfLandingWeight,
      mfDropClarity,
    ]) {
      if (f) f.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
    }
    // Dummy load: linear curve (bypass)
    if (mfDummyLoad) {
      const buf = new ArrayBuffer(256 * 4);
      const flat = new Float32Array(buf) as Float32Array<ArrayBuffer>;
      for (let i = 0; i < 256; i++) flat[i] = (i * 2) / 255 - 1;
      mfDummyLoad.curve = flat;
    }
    return;
  }

  // Enabled — each filter gets its own independent gain value
  applyFilterGain(mfCurrentForce, sliderToGain(values.currentForce ?? 50), ctx);
  applyFilterGain(mfConeFreedom, sliderToGain(values.coneFreedom ?? 50), ctx);
  applyFilterGain(
    mfSensitivityBoost,
    sliderToGain(values.sensitivityPresence ?? 50),
    ctx,
  );
  applyFilterGain(
    mfCrossoverComp,
    sliderToGain(values.crossoverCompensation ?? 50),
    ctx,
  );
  applyFilterGain(
    mfDynamicHeadroom,
    sliderToGain(values.dynamicHeadroom ?? 50),
    ctx,
  );
  applyFilterGain(mfLowMidWarmth, sliderToGain(values.lowMidWarmth ?? 50), ctx);
  applyFilterGain(mfDropDescent, sliderToGain(values.dropDescent ?? 50), ctx);
  applyFilterGain(
    mfLandingWeight,
    sliderToGain(values.landingWeight ?? 50),
    ctx,
  );
  applyFilterGain(mfDropClarity, sliderToGain(values.dropClarity ?? 50), ctx);

  // Dummy load drive scales with average filter level (0.5–1.8)
  const vals = Object.values(values);
  const avgLevel = vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length);
  const drive = 0.5 + (avgLevel / 100) * 1.3;
  if (mfDummyLoad) mfDummyLoad.curve = buildDummyLoadCurve(drive);
}

// ─── Initial state ────────────────────────────────────────────────────────────
function buildIdle(): SrsOhmsState {
  return {
    active: lsGetBool("active", false),
    punchStrength: lsGetNum("punchStrength", 50),
    presenceStrength: lsGetNum("presenceStrength", 50),
    responseSpeed: lsGetNum("responseSpeed", 50),
    ohmCharacter: (lsGetBool("blend", true) ? "blend" : "2ohm") as OhmCharacter,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────
export interface UseSrsFilterOhmsReturn {
  state: SrsOhmsState;
  filterValues: Record<string, number>;
  setActive: (v: boolean) => void;
  setFilterValue: (key: string, value: number) => void;
  setPunchStrength: (v: number) => void;
  setPresenceStrength: (v: number) => void;
  setResponseSpeed: (v: number) => void;
  setOhmCharacter: (v: OhmCharacter) => void;
  // Spec aliases
  srsOhmsFilters: Record<string, number>;
  setSrsOhmsFilter: (key: string, value: number) => void;
  blendMode: OhmCharacter;
  setBlendMode: (v: OhmCharacter) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSrsFilterOhms(): UseSrsFilterOhmsReturn {
  const [state, setState] = useState<SrsOhmsState>(buildIdle);
  const [filterValues, setFilterValuesState] = useState<Record<string, number>>(
    () => ({ ...storedValues }),
  );

  const filterValuesRef = useRef(filterValues);
  filterValuesRef.current = filterValues;
  const activeRef = useRef(state.active);

  // Build nodes on mount, retry until chain is ready
  useEffect(() => {
    const tryBuild = () => {
      if (!nodesBuilt) ensureMimickNodes();
    };
    tryBuild();
    if (!nodesBuilt) {
      const retry = setInterval(() => {
        tryBuild();
        if (nodesBuilt) clearInterval(retry);
      }, 500);
      return () => clearInterval(retry);
    }
    // Apply initial state if already active
    if (activeRef.current) {
      applyAllFilters(filterValuesRef.current, true);
    }
  }, []);

  const setActive = useCallback((v: boolean) => {
    activeRef.current = v;
    setState((prev) => ({ ...prev, active: v }));
    lsSet("active", String(v));
    applyAllFilters(filterValuesRef.current, v);
  }, []);

  const setFilterValue = useCallback((key: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    storedValues[key] = clamped;
    lsSet(key, String(clamped));
    setFilterValuesState((prev) => {
      const next = { ...prev, [key]: clamped };
      filterValuesRef.current = next;
      applyAllFilters(next, activeRef.current);
      return next;
    });
  }, []);

  const setPunchStrength = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({ ...prev, punchStrength: clamped }));
    lsSet("punchStrength", String(clamped));
  }, []);

  const setPresenceStrength = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({ ...prev, presenceStrength: clamped }));
    lsSet("presenceStrength", String(clamped));
  }, []);

  const setResponseSpeed = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({ ...prev, responseSpeed: clamped }));
    lsSet("responseSpeed", String(clamped));
  }, []);

  const setOhmCharacter = useCallback((v: OhmCharacter) => {
    setState((prev) => ({ ...prev, ohmCharacter: v }));
    lsSet("ohmCharacter", v);
  }, []);

  return {
    state,
    filterValues,
    setActive,
    setFilterValue,
    setPunchStrength,
    setPresenceStrength,
    setResponseSpeed,
    setOhmCharacter,
    // Spec aliases
    srsOhmsFilters: filterValues,
    setSrsOhmsFilter: setFilterValue,
    blendMode: state.ohmCharacter,
    setBlendMode: setOhmCharacter,
  };
}

// ─── Export for external preset use ──────────────────────────────────────────
export { applyAllFilters as applyMimickFilters };
