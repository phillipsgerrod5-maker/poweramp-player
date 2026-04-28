/**
 * useStackedFilters
 * 6 DEDICATED BiquadFilter nodes — truly wired into the signal chain.
 * Inserted between the notch filter and the panner (before panner→SRS chain).
 * Mid Stacked Filters (200Hz–2500Hz): Presence (1000Hz), Body (300Hz), Clarity (2000Hz)
 * High Stacked Filters (2500Hz–14000Hz): Air (10kHz), Detail (4000Hz), Brilliance (7000Hz)
 *
 * Stack strength: 50,000,000 × 86 on each
 * Commander Direct Hit: always active — caps at ±12dB max gain
 * Each filter is FULLY INDEPENDENT — no linked state, no shared controls
 *
 * Chain: notch → Presence → Body → Clarity → Air → Detail → Brilliance → panner
 *
 * Auto-save: localStorage keys per filter
 */

import type { StackedFiltersState } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSharedCtx,
  getSharedNotchFilter,
  getSharedPanner,
} from "./usePlayer";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const LS_PREFIX = "poweramp_sf_";

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

function lsSet(key: string, value: number): void {
  try {
    localStorage.setItem(LS_PREFIX + key, String(value));
  } catch {
    /* ignore */
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STACK_STRENGTH = "50,000,000 × 86";

// Commander Direct Hit: hard cap at ±12dB — nothing over this ever
const COMMANDER_MAX_DB = 12;

// ─── Frequency reference for display ─────────────────────────────────────────
export const MID_FREQS = { presence: 1000, body: 300, clarity: 2000 };
export const HIGH_FREQS = { air: 10000, detail: 4000, brilliance: 7000 };

// ─── Module-level dedicated filter nodes ─────────────────────────────────────
// Each filter is its own BiquadFilterNode — fully independent.
// Wired: notch → Presence → Body → Clarity → Air → Detail → Brilliance → panner
let sfMidPresence: BiquadFilterNode | null = null; // peaking 1000Hz Q=1.5 (presence 800-1200Hz)
let sfMidBody: BiquadFilterNode | null = null; // peaking 300Hz Q=1.2  (body 200-500Hz)
let sfMidClarity: BiquadFilterNode | null = null; // peaking 2000Hz Q=2.0  (clarity 1500-2500Hz)
let sfHighAir: BiquadFilterNode | null = null; // highshelf 10kHz Q=0.7 (air 8-14kHz)
let sfHighDetail: BiquadFilterNode | null = null; // peaking 4000Hz Q=2.0  (detail 3-6kHz)
let sfHighBrilliance: BiquadFilterNode | null = null; // highshelf 7kHz Q=1.0  (brilliance 6-8kHz)
let sfNodesBuilt = false;

/** Wire 6 stacked filter nodes between notch and panner. */
function ensureStackedNodes(): boolean {
  const ctx = getSharedCtx();
  const notch = getSharedNotchFilter();
  const panner = getSharedPanner();
  if (!ctx || !notch || !panner) return false;
  if (sfNodesBuilt) return true;

  try {
    // MID PRESENCE — peaking 1000Hz, Q=1.5 (800-1200Hz presence range)
    sfMidPresence = ctx.createBiquadFilter();
    sfMidPresence.type = "peaking";
    sfMidPresence.frequency.value = 1000;
    sfMidPresence.Q.value = 1.5;
    sfMidPresence.gain.value = 0; // neutral at 50

    // MID BODY — peaking 300Hz, Q=1.2 (200-500Hz body range)
    sfMidBody = ctx.createBiquadFilter();
    sfMidBody.type = "peaking";
    sfMidBody.frequency.value = 300;
    sfMidBody.Q.value = 1.2;
    sfMidBody.gain.value = 0;

    // MID CLARITY — peaking 2000Hz, Q=2.0 (1500-2500Hz clarity range)
    sfMidClarity = ctx.createBiquadFilter();
    sfMidClarity.type = "peaking";
    sfMidClarity.frequency.value = 2000;
    sfMidClarity.Q.value = 2.0;
    sfMidClarity.gain.value = 0;

    // HIGH AIR — highshelf 10kHz, Q=0.7 (8-14kHz air range)
    sfHighAir = ctx.createBiquadFilter();
    sfHighAir.type = "highshelf";
    sfHighAir.frequency.value = 10000;
    sfHighAir.Q.value = 0.7;
    sfHighAir.gain.value = 0;

    // HIGH DETAIL — peaking 4000Hz, Q=2.0 (3-6kHz detail range)
    sfHighDetail = ctx.createBiquadFilter();
    sfHighDetail.type = "peaking";
    sfHighDetail.frequency.value = 4000;
    sfHighDetail.Q.value = 2.0;
    sfHighDetail.gain.value = 0;

    // HIGH BRILLIANCE — highshelf 7kHz, Q=1.0 (6-8kHz brilliance range)
    sfHighBrilliance = ctx.createBiquadFilter();
    sfHighBrilliance.type = "highshelf";
    sfHighBrilliance.frequency.value = 7000;
    sfHighBrilliance.Q.value = 1.0;
    sfHighBrilliance.gain.value = 0;

    // Rewire: notch → Presence → Body → Clarity → Air → Detail → Brilliance → panner
    notch.disconnect(panner);

    notch
      .connect(sfMidPresence)
      .connect(sfMidBody)
      .connect(sfMidClarity)
      .connect(sfHighAir)
      .connect(sfHighDetail)
      .connect(sfHighBrilliance)
      .connect(panner);

    sfNodesBuilt = true;
    console.log(
      "[PowerAmp] Stacked Filters wired: notch → Presence(1kHz) → Body(300Hz) → Clarity(2kHz) → Air(10kHz) → Detail(4kHz) → Brilliance(7kHz) → panner",
      "| Commander Direct Hit cap: ±12dB",
    );
    return true;
  } catch (e) {
    console.error("[PowerAmp] Stacked Filters setup error:", e);
    return false;
  }
}

// ─── Gain conversion helpers ──────────────────────────────────────────────────
// Slider: 0–100, center (50) = 0dB.
// Commander Direct Hit: hard cap at ±12dB — no single filter can exceed this.

function sliderToDb(slider: number, maxDb: number): number {
  const raw = ((slider - 50) / 50) * maxDb;
  return Math.max(-COMMANDER_MAX_DB, Math.min(COMMANDER_MAX_DB, raw));
}

function applyGain(
  node: BiquadFilterNode | null,
  db: number,
  ctx: AudioContext,
): void {
  if (!node) return;
  // Commander Direct Hit: cap here as final guarantee
  const capped = Math.max(-COMMANDER_MAX_DB, Math.min(COMMANDER_MAX_DB, db));
  node.gain.setTargetAtTime(capped, ctx.currentTime, 0.05);
}

// ─── Initial slider values from localStorage ──────────────────────────────────
function loadInitialState(): StackedFiltersState {
  return {
    midFilters: {
      presence: lsGetNum("mid_presence", 50),
      body: lsGetNum("mid_body", 50),
      clarity: lsGetNum("mid_clarity", 50),
    },
    highFilters: {
      air: lsGetNum("high_air", 50),
      detail: lsGetNum("high_detail", 50),
      brilliance: lsGetNum("high_brilliance", 50),
    },
    stackStrength: STACK_STRENGTH,
    commanderActive: true,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────
export interface UseStackedFiltersReturn {
  state: StackedFiltersState;
  // Individual setters — each is fully independent
  setMidPresence: (v: number) => void;
  setMidBody: (v: number) => void;
  setMidClarity: (v: number) => void;
  setHighAir: (v: number) => void;
  setHighDetail: (v: number) => void;
  setHighBrilliance: (v: number) => void;
  // Spec-matching aliases
  midFilters: StackedFiltersState["midFilters"];
  highFilters: StackedFiltersState["highFilters"];
  setMidFilter: (
    key: keyof StackedFiltersState["midFilters"],
    v: number,
  ) => void;
  setHighFilter: (
    key: keyof StackedFiltersState["highFilters"],
    v: number,
  ) => void;
  commanderActive: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useStackedFilters(): UseStackedFiltersReturn {
  const [state, setState] = useState<StackedFiltersState>(loadInitialState);
  const nodesBuilt = useRef(false);

  // Build nodes on mount, retry until audio chain is available
  useEffect(() => {
    if (nodesBuilt.current) return;
    const tryBuild = () => {
      if (ensureStackedNodes()) {
        nodesBuilt.current = true;
        // Apply saved values immediately on first build
        const ctx = getSharedCtx();
        if (!ctx) return;
        const s = loadInitialState();
        applyGain(sfMidPresence, sliderToDb(s.midFilters.presence, 10), ctx);
        applyGain(sfMidBody, sliderToDb(s.midFilters.body, 8), ctx);
        applyGain(sfMidClarity, sliderToDb(s.midFilters.clarity, 10), ctx);
        applyGain(sfHighAir, sliderToDb(s.highFilters.air, 10), ctx);
        applyGain(sfHighDetail, sliderToDb(s.highFilters.detail, 10), ctx);
        applyGain(
          sfHighBrilliance,
          sliderToDb(s.highFilters.brilliance, 12),
          ctx,
        );
      }
    };
    tryBuild();
    if (!nodesBuilt.current) {
      const retry = setInterval(() => {
        tryBuild();
        if (nodesBuilt.current) clearInterval(retry);
      }, 500);
      return () => clearInterval(retry);
    }
  }, []);

  // ─── Individual setters — each only touches its own node ─────────────────────
  // Presence: (v-50)/50 * 10dB — Commander cap ±12dB
  const setMidPresence = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({
      ...prev,
      midFilters: { ...prev.midFilters, presence: clamped },
    }));
    lsSet("mid_presence", clamped);
    const ctx = getSharedCtx();
    if (ctx) applyGain(sfMidPresence, sliderToDb(clamped, 10), ctx);
  }, []);

  // Body: (v-50)/50 * 8dB — Commander cap ±12dB
  const setMidBody = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({
      ...prev,
      midFilters: { ...prev.midFilters, body: clamped },
    }));
    lsSet("mid_body", clamped);
    const ctx = getSharedCtx();
    if (ctx) applyGain(sfMidBody, sliderToDb(clamped, 8), ctx);
  }, []);

  // Clarity: (v-50)/50 * 10dB — Commander cap ±12dB
  const setMidClarity = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({
      ...prev,
      midFilters: { ...prev.midFilters, clarity: clamped },
    }));
    lsSet("mid_clarity", clamped);
    const ctx = getSharedCtx();
    if (ctx) applyGain(sfMidClarity, sliderToDb(clamped, 10), ctx);
  }, []);

  // Air: (v-50)/50 * 10dB — Commander cap ±12dB
  const setHighAir = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({
      ...prev,
      highFilters: { ...prev.highFilters, air: clamped },
    }));
    lsSet("high_air", clamped);
    const ctx = getSharedCtx();
    if (ctx) applyGain(sfHighAir, sliderToDb(clamped, 10), ctx);
  }, []);

  // Detail: (v-50)/50 * 10dB — Commander cap ±12dB
  const setHighDetail = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({
      ...prev,
      highFilters: { ...prev.highFilters, detail: clamped },
    }));
    lsSet("high_detail", clamped);
    const ctx = getSharedCtx();
    if (ctx) applyGain(sfHighDetail, sliderToDb(clamped, 10), ctx);
  }, []);

  // Brilliance: (v-50)/50 * 12dB — Commander cap ±12dB
  const setHighBrilliance = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setState((prev) => ({
      ...prev,
      highFilters: { ...prev.highFilters, brilliance: clamped },
    }));
    lsSet("high_brilliance", clamped);
    const ctx = getSharedCtx();
    if (ctx) applyGain(sfHighBrilliance, sliderToDb(clamped, 12), ctx);
  }, []);

  // Generic setters (spec aliases)
  const setMidFilter = useCallback(
    (key: keyof StackedFiltersState["midFilters"], v: number) => {
      if (key === "presence") setMidPresence(v);
      else if (key === "body") setMidBody(v);
      else if (key === "clarity") setMidClarity(v);
    },
    [setMidPresence, setMidBody, setMidClarity],
  );

  const setHighFilter = useCallback(
    (key: keyof StackedFiltersState["highFilters"], v: number) => {
      if (key === "air") setHighAir(v);
      else if (key === "detail") setHighDetail(v);
      else if (key === "brilliance") setHighBrilliance(v);
    },
    [setHighAir, setHighDetail, setHighBrilliance],
  );

  return {
    state,
    setMidPresence,
    setMidBody,
    setMidClarity,
    setHighAir,
    setHighDetail,
    setHighBrilliance,
    midFilters: state.midFilters,
    highFilters: state.highFilters,
    setMidFilter,
    setHighFilter,
    commanderActive: true, // Commander Direct Hit is always active
  };
}
