/**
 * EqPanel — 6-Band EQ with Commander Protection
 *
 * CRITICAL INDEPENDENCE RULES:
 * - Each of the 6 bands has its OWN isolated useState.
 * - Moving any ONE slider ONLY calls that band's setter + applies that band's filter.
 * - NO useEffect syncing bands together. NO shared state. NO cross-band side effects.
 * - If you move VOCALS slider, ONLY vocals changes. Period.
 *
 * BANDS: BASS (14-50Hz) · LOW MID · VOCALS (Dark Nice Crystal 3Ω) · MID · HIGH MID · TREBLE
 * NO TWEETERS in EQ — tweeters are a separate channel, not an EQ band.
 *
 * All sliders are drag sliders (HTML range input).
 * E-Quake section below the 6 bands — toggle + drag slider.
 * Auto-save happens inside each setter.
 */

import { commanderReachesEQ } from "@/hooks/useCombinedAmps";
import {
  getSharedBass2Filter,
  getSharedBassFilter,
  getSharedCtx,
  getSharedHighsFilter,
  getSharedLowMidFilter,
  getSharedMidsFilter,
  getSharedTweetersFilter,
  getSharedVocalFilter,
} from "@/hooks/usePlayer";
import { useCallback, useEffect, useState } from "react";

// ─── Band definitions ─────────────────────────────────────────────────────────
// EXACTLY 6 bands. No tweeters band.

type BandKey = "bass" | "lowmid" | "vocals" | "mids" | "highmid" | "treble";

interface BandDef {
  key: BandKey;
  label: string;
  freqLabel: string;
  color: string;
  accentColor: string;
  badge?: string;
  isVocals?: boolean;
}

const BANDS: BandDef[] = [
  {
    key: "bass",
    label: "BASS",
    freqLabel: "14–50Hz",
    color: "rgba(255,140,0,0.9)",
    accentColor: "rgba(255,140,0,0.5)",
    badge: "COMMANDER: EARLY RESPONSE",
  },
  {
    key: "lowmid",
    label: "LOW MID",
    freqLabel: "200Hz",
    color: "rgba(255,100,30,0.9)",
    accentColor: "rgba(255,100,30,0.5)",
  },
  {
    key: "vocals",
    label: "VOCALS",
    freqLabel: "1kHz · 3Ω",
    color: "rgba(200,100,255,0.9)",
    accentColor: "rgba(200,100,255,0.5)",
    badge: "DARK NICE CRYSTAL 3Ω",
    isVocals: true,
  },
  {
    key: "mids",
    label: "MID",
    freqLabel: "2.5kHz",
    color: "rgba(0,150,255,0.9)",
    accentColor: "rgba(0,150,255,0.5)",
  },
  {
    key: "highmid",
    label: "HIGH MID",
    freqLabel: "5kHz",
    color: "rgba(0,220,220,0.9)",
    accentColor: "rgba(0,220,220,0.5)",
  },
  {
    key: "treble",
    label: "TREBLE",
    freqLabel: "8kHz+",
    color: "rgba(0,255,130,0.9)",
    accentColor: "rgba(0,255,130,0.5)",
  },
];

// ─── Gain mapping ─────────────────────────────────────────────────────────────
// BASS: power curve — deep from first touch (NO DEAD ZONE), full depth by halfway
//   gain = -4 + 22 * (v/100)^0.55
//   0 → -4dB, 1 → ~0.9dB (immediate response), 50 → ~11dB, 100 → +18dB
// Others: 0→-12dB, 50→0dB, 100→+12dB (linear)

function bassToGain(v: number): number {
  // No dead zone: at value=1, gain already > 0
  return Math.round((-4 + 22 * (v / 100) ** 0.55) * 10) / 10;
}

function otherToGain(v: number): number {
  return Math.round(((v - 50) / 50) * 12 * 10) / 10;
}

export function valueToGainDb(band: BandKey, v: number): number {
  return band === "bass" ? bassToGain(v) : otherToGain(v);
}

// ─── Apply each band directly to its own dedicated filter node ────────────────
// Commander authority — protection cannot knock these back.
// Each case only touches its OWN node.

function applyBand(band: BandKey, value: number): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  void commanderReachesEQ;
  const gainDb = valueToGainDb(band, value);
  const now = ctx.currentTime;

  switch (band) {
    case "bass": {
      const f = getSharedBassFilter();
      const f2 = getSharedBass2Filter();
      if (!f) return;
      f.type = "lowshelf";
      f.frequency.setTargetAtTime(60, now, 0.005);
      f.gain.setTargetAtTime(gainDb, now, 0.005);
      // Sub extension: proportional, only when above 0
      if (f2) {
        f2.type = "peaking";
        f2.frequency.setTargetAtTime(20, now, 0.005);
        f2.Q.setTargetAtTime(1.2, now, 0.005);
        const subGain = value > 0 ? Math.max(0, gainDb * 0.5) : 0;
        f2.gain.setTargetAtTime(subGain, now, 0.005);
      }
      return;
    }
    case "lowmid": {
      const f = getSharedLowMidFilter();
      if (!f) return;
      f.type = "peaking";
      f.frequency.setTargetAtTime(200, now, 0.01);
      f.Q.setTargetAtTime(1.0, now, 0.01);
      f.gain.setTargetAtTime(gainDb, now, 0.01);
      return;
    }
    case "vocals": {
      const f = getSharedVocalFilter();
      if (!f) return;
      f.type = "peaking";
      f.frequency.setTargetAtTime(1000, now, 0.01);
      f.Q.setTargetAtTime(2.0, now, 0.01);
      f.gain.setTargetAtTime(gainDb, now, 0.01);
      return;
    }
    case "mids": {
      const f = getSharedMidsFilter();
      if (!f) return;
      f.type = "peaking";
      f.frequency.setTargetAtTime(2500, now, 0.01);
      f.Q.setTargetAtTime(1.0, now, 0.01);
      f.gain.setTargetAtTime(gainDb, now, 0.01);
      return;
    }
    case "highmid": {
      const f = getSharedHighsFilter();
      if (!f) return;
      f.type = "peaking";
      f.frequency.setTargetAtTime(5000, now, 0.01);
      f.Q.setTargetAtTime(1.0, now, 0.01);
      f.gain.setTargetAtTime(gainDb, now, 0.01);
      return;
    }
    case "treble": {
      const f = getSharedTweetersFilter();
      if (!f) return;
      f.type = "highshelf";
      f.frequency.setTargetAtTime(8000, now, 0.01);
      f.gain.setTargetAtTime(gainDb, now, 0.01);
      return;
    }
  }
}

// ─── E-Quake lowshelf BiquadFilter (20Hz) — wired directly ────────────────────
let eQuakeNode: BiquadFilterNode | null = null;

function ensureEQuakeNode(): BiquadFilterNode | null {
  const ctx = getSharedCtx();
  if (!ctx) return null;
  if (eQuakeNode) return eQuakeNode;
  try {
    eQuakeNode = ctx.createBiquadFilter();
    eQuakeNode.type = "lowshelf";
    eQuakeNode.frequency.value = 20;
    eQuakeNode.gain.value = 0;
    // Insert: bass filter → equake → rest of chain (bass2 filter)
    const bassF = getSharedBassFilter();
    const bass2F = getSharedBass2Filter();
    if (bassF && bass2F) {
      try {
        bassF.disconnect(bass2F);
      } catch {
        /* ok */
      }
      bassF.connect(eQuakeNode);
      eQuakeNode.connect(bass2F);
    }
    return eQuakeNode;
  } catch {
    return null;
  }
}

function applyEQuakeLevel(levelVal: number): void {
  const ctx = getSharedCtx();
  if (!ctx) return;
  const node = ensureEQuakeNode();
  if (!node) return;
  // Map 0-100 → 0 to +15dB
  const gainDb = (levelVal / 100) * 15;
  node.gain.setTargetAtTime(gainDb, ctx.currentTime, 0.02);
}

// ─── localStorage auto-save ───────────────────────────────────────────────────

const LS_KEYS: Record<BandKey, string> = {
  bass: "poweramp_eq_bass",
  lowmid: "poweramp_eq_lowmid",
  vocals: "poweramp_eq_vocals",
  mids: "poweramp_eq_mid",
  highmid: "poweramp_eq_highmid",
  treble: "poweramp_eq_treble",
};

function saveEq(band: BandKey, v: number): void {
  try {
    localStorage.setItem(LS_KEYS[band], String(v));
  } catch {
    /* */
  }
}

function loadEq(band: BandKey, fallback: number): number {
  try {
    const v = localStorage.getItem(LS_KEYS[band]);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

function saveEQuake(key: string, v: string): void {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* */
  }
}

function loadEQuakeBool(fallback: boolean): boolean {
  try {
    const v = localStorage.getItem("poweramp_eq_equake_enabled");
    return v !== null ? v === "true" : fallback;
  } catch {
    return fallback;
  }
}

function loadEQuakeLevel(fallback: number): number {
  try {
    const v = localStorage.getItem("poweramp_eq_equake_level");
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EqPanelProps {
  bass?: number;
  mids?: number;
  highs?: number;
  tweeters?: number;
  presetStrength?: number;
  onBassChange?: (v: number) => void;
  onMidsChange?: (v: number) => void;
  onHighsChange?: (v: number) => void;
  onTweetersChange?: (v: number) => void;
  // E-Quake — can be controlled externally or managed internally
  eQuakeEnabled?: boolean;
  eQuakeLevel?: number;
  onEQuakeEnabled?: (on: boolean) => void;
  onEQuakeLevelChange?: (v: number) => void;
  eQuakeIntensityLabel?: string;
}

// ─── Single Band Drag Slider ──────────────────────────────────────────────────

function BandControl({
  band,
  def,
  value,
  onChange,
}: {
  band: BandKey;
  def: BandDef;
  value: number;
  onChange: (v: number) => void;
}) {
  const gainDb = valueToGainDb(band, value);
  const neutral = band === "bass" ? 0 : 50;
  const isAboveNeutral = band === "bass" ? value > 0 : value > neutral;
  const isBelowNeutral = band !== "bass" && value < neutral;
  const isNeutral = band === "bass" ? value === 0 : value === neutral;

  const fillPct = isAboveNeutral
    ? band === "bass"
      ? (value / 100) * 100
      : ((value - neutral) / 50) * 100
    : isBelowNeutral
      ? ((neutral - value) / 50) * 100
      : 0;

  const fillColor = isAboveNeutral
    ? def.color
    : isBelowNeutral
      ? "rgba(255,60,60,0.8)"
      : "rgba(255,255,255,0.2)";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      onChange(next);
      applyBand(band, next);
    },
    [band, onChange],
  );

  return (
    <div
      className="flex flex-col items-center gap-1 flex-1 min-w-0"
      data-ocid={`eq.${band}.control`}
      style={
        def.isVocals
          ? {
              background: "rgba(200,100,255,0.04)",
              borderRadius: "4px",
              padding: "2px",
              border: "1px solid rgba(200,100,255,0.15)",
            }
          : undefined
      }
    >
      {/* dB readout */}
      <div className="text-center">
        <span
          className="text-[11px] font-mono font-black tabular-nums"
          style={{
            color: isNeutral ? "rgba(255,255,255,0.25)" : fillColor,
            textShadow: !isNeutral ? `0 0 8px ${fillColor}` : "none",
          }}
        >
          {gainDb > 0 ? `+${gainDb.toFixed(1)}` : gainDb.toFixed(1)}
        </span>
        <span
          className="text-[7px] font-mono"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          dB
        </span>
      </div>

      {/* Slider value */}
      <div
        className="text-[9px] font-mono font-bold tabular-nums"
        style={{ color: isNeutral ? "rgba(255,255,255,0.2)" : def.color }}
      >
        {value}
      </div>

      {/* Visual bar + range input */}
      <div
        className="relative w-full rounded-sm overflow-hidden"
        style={{ height: "90px", background: "rgba(255,255,255,0.05)" }}
      >
        {/* Center/bottom line */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            top: band === "bass" ? "100%" : "50%",
            background: "rgba(255,255,255,0.2)",
            zIndex: 2,
          }}
        />
        {/* Fill bar */}
        {!isNeutral && (
          <div
            className="absolute left-0 right-0 transition-all duration-75"
            style={
              isAboveNeutral
                ? {
                    bottom: band === "bass" ? "0%" : "50%",
                    height: `${band === "bass" ? fillPct : fillPct / 2}%`,
                    background: `linear-gradient(to top, ${def.color}, ${def.accentColor})`,
                    boxShadow: `0 0 6px ${def.color}`,
                  }
                : {
                    top: "50%",
                    height: `${fillPct / 2}%`,
                    background:
                      "linear-gradient(to bottom, rgba(255,60,60,0.8), rgba(255,60,60,0.2))",
                  }
            }
          />
        )}
        {/* Thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full transition-all duration-75"
          style={{
            top:
              band === "bass"
                ? `calc(${100 - value}%)`
                : isAboveNeutral
                  ? `calc(50% - ${fillPct / 2}%)`
                  : isBelowNeutral
                    ? `calc(50% + ${fillPct / 2}% - 3px)`
                    : "calc(50% - 3px)",
            background: isNeutral ? "rgba(255,255,255,0.25)" : fillColor,
            boxShadow: !isNeutral ? `0 0 6px ${fillColor}` : "none",
          }}
        />
        {/* Drag input — covers entire bar */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleChange}
          data-ocid={`eq.${band}.slider`}
          aria-label={`${def.label} EQ — drag to adjust`}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize touch-none"
          style={{
            zIndex: 3,
            WebkitAppearance: "slider-vertical",
            writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
            direction: "rtl",
          }}
        />
      </div>

      {/* Band label */}
      <div className="text-center px-0.5 mt-0.5">
        {def.badge && (
          <div
            className="mb-0.5 px-1 py-0.5 rounded-sm"
            style={{
              background: `${def.accentColor.replace("0.5", "0.10")}`,
              border: `1px solid ${def.accentColor}`,
            }}
          >
            <span
              className="text-[5.5px] font-mono font-bold leading-tight block"
              style={{ color: def.color }}
            >
              {def.badge}
            </span>
          </div>
        )}
        <span
          className="text-[7px] font-mono tracking-[0.1em] font-bold uppercase block"
          style={{ color: def.isVocals ? "rgba(200,100,255,0.95)" : def.color }}
        >
          {def.label}
        </span>
        <span
          className="text-[6px] font-mono block mt-0.5"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {def.freqLabel}
        </span>
      </div>
    </div>
  );
}

// ─── EQ Panel ─────────────────────────────────────────────────────────────────

export function EqPanel({
  presetStrength = 10,
  onBassChange,
  onMidsChange,
  onHighsChange,
  onTweetersChange,
  eQuakeEnabled: eQuakeEnabledProp,
  eQuakeLevel: eQuakeLevelProp,
  onEQuakeEnabled,
  onEQuakeLevelChange,
  eQuakeIntensityLabel = "OFF",
}: EqPanelProps) {
  // ── 6 fully independent band states — each is its own useState ───────────
  // CRITICAL: none of these are linked. Changing one NEVER affects any other.
  const [bassVal, setBassVal] = useState(() => loadEq("bass", 0));
  const [lowmidVal, setLowmidVal] = useState(() => loadEq("lowmid", 50));
  const [vocalsVal, setVocalsVal] = useState(() => loadEq("vocals", 50));
  const [midsVal, setMidsVal] = useState(() => loadEq("mids", 50));
  const [highmidVal, setHighmidVal] = useState(() => loadEq("highmid", 50));
  const [trebleVal, setTrebleVal] = useState(() => loadEq("treble", 50));

  // ── Internal E-Quake state (used when no external props provided) ─────────
  const [internalEqEnabled, setInternalEqEnabled] = useState(() =>
    loadEQuakeBool(false),
  );
  const [internalEqLevel, setInternalEqLevel] = useState(() =>
    loadEQuakeLevel(0),
  );

  // Resolve controlled vs uncontrolled
  const eQuakeEnabled = eQuakeEnabledProp ?? internalEqEnabled;
  const eQuakeLevel = eQuakeLevelProp ?? internalEqLevel;

  const handleEQuakeToggle = useCallback(
    (on: boolean) => {
      if (onEQuakeEnabled) {
        onEQuakeEnabled(on);
      } else {
        setInternalEqEnabled(on);
        saveEQuake("poweramp_eq_equake_enabled", String(on));
      }
      if (!on) {
        // When disabled, zero out the filter
        const ctx = getSharedCtx();
        if (ctx && eQuakeNode) {
          eQuakeNode.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        }
      } else {
        // When enabled, apply current level
        applyEQuakeLevel(eQuakeLevel);
      }
    },
    [onEQuakeEnabled, eQuakeLevel],
  );

  const handleEQuakeLevelChange = useCallback(
    (v: number) => {
      if (onEQuakeLevelChange) {
        onEQuakeLevelChange(v);
      } else {
        setInternalEqLevel(v);
        saveEQuake("poweramp_eq_equake_level", String(v));
      }
      if (eQuakeEnabled) {
        applyEQuakeLevel(v);
      }
    },
    [onEQuakeLevelChange, eQuakeEnabled],
  );

  const hasAudio = !!getSharedCtx();
  const anyActive =
    bassVal > 0 ||
    lowmidVal !== 50 ||
    vocalsVal !== 50 ||
    midsVal !== 50 ||
    highmidVal !== 50 ||
    trebleVal !== 50;

  // Apply saved values to audio chain on mount only
  useEffect(() => {
    void commanderReachesEQ;
    applyBand("bass", loadEq("bass", 0));
    applyBand("lowmid", loadEq("lowmid", 50));
    applyBand("vocals", loadEq("vocals", 50));
    applyBand("mids", loadEq("mids", 50));
    applyBand("highmid", loadEq("highmid", 50));
    applyBand("treble", loadEq("treble", 50));
    // Restore E-Quake if it was enabled
    const savedEnabled = loadEQuakeBool(false);
    if (savedEnabled) {
      applyEQuakeLevel(loadEQuakeLevel(0));
    }
  }, []); // mount-only

  // ── Isolated onChange handlers — each ONLY touches its own band ───────────
  const handleBass = useCallback(
    (v: number) => {
      setBassVal(v);
      saveEq("bass", v);
      onBassChange?.(bassToGain(v));
    },
    [onBassChange],
  );

  const handleLowmid = useCallback((v: number) => {
    setLowmidVal(v);
    saveEq("lowmid", v);
  }, []);

  const handleVocals = useCallback((v: number) => {
    setVocalsVal(v);
    saveEq("vocals", v);
  }, []);

  const handleMids = useCallback(
    (v: number) => {
      setMidsVal(v);
      saveEq("mids", v);
      onMidsChange?.(otherToGain(v));
    },
    [onMidsChange],
  );

  const handleHighmid = useCallback(
    (v: number) => {
      setHighmidVal(v);
      saveEq("highmid", v);
      onHighsChange?.(otherToGain(v));
    },
    [onHighsChange],
  );

  const handleTreble = useCallback(
    (v: number) => {
      setTrebleVal(v);
      saveEq("treble", v);
      onTweetersChange?.(otherToGain(v));
    },
    [onTweetersChange],
  );

  const bandHandlers: Record<BandKey, (v: number) => void> = {
    bass: handleBass,
    lowmid: handleLowmid,
    vocals: handleVocals,
    mids: handleMids,
    highmid: handleHighmid,
    treble: handleTreble,
  };

  const bandValues: Record<BandKey, number> = {
    bass: bassVal,
    lowmid: lowmidVal,
    vocals: vocalsVal,
    mids: midsVal,
    highmid: highmidVal,
    treble: trebleVal,
  };

  return (
    <div
      className="mx-4 mb-3 rounded-sm overflow-hidden"
      data-ocid="eq.panel"
      style={{
        background: anyActive
          ? "linear-gradient(135deg, rgba(0,10,40,0.97), rgba(10,5,50,0.95))"
          : "linear-gradient(135deg, rgba(0,8,30,0.94), rgba(0,10,35,0.92))",
        border: anyActive
          ? "1px solid rgba(100,80,255,0.5)"
          : "1px solid rgba(0,100,255,0.2)",
        boxShadow: anyActive ? "0 0 20px rgba(100,80,255,0.12)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: anyActive ? "rgba(100,80,255,0.08)" : "rgba(0,30,80,0.3)",
          borderBottom: anyActive
            ? "1px solid rgba(100,80,255,0.25)"
            : "1px solid rgba(0,80,180,0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: !hasAudio
                ? "rgba(255,255,255,0.15)"
                : anyActive
                  ? "rgba(0,255,80,0.9)"
                  : "rgba(255,180,0,0.8)",
              boxShadow:
                hasAudio && anyActive ? "0 0 8px rgba(0,255,80,0.7)" : "none",
              animation: anyActive && hasAudio ? "pulse 1.5s infinite" : "none",
            }}
          />
          <span
            className="text-[9px] font-mono tracking-[0.2em] font-bold uppercase"
            style={{
              color: anyActive
                ? "rgba(180,150,255,0.95)"
                : "rgba(100,80,200,0.5)",
            }}
          >
            {!hasAudio ? "EQ — IDLE" : anyActive ? "EQ ACTIVE" : "EQ — NEUTRAL"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[7px] font-mono px-2 py-0.5 rounded-sm"
            style={{
              background: "rgba(0,213,255,0.07)",
              border: "1px solid rgba(0,213,255,0.3)",
              color: "rgba(0,213,255,0.85)",
            }}
          >
            6-BAND · DRAG
          </span>
          <span
            className="text-[7px] font-mono px-2 py-0.5 rounded-sm"
            style={{
              background: "rgba(0,255,120,0.06)",
              border: "1px solid rgba(0,255,120,0.3)",
              color: "rgba(0,255,120,0.8)",
            }}
          >
            CMD PROTECTED
          </span>
        </div>
      </div>

      {/* Subheader — Commander + No Dead Zone notice */}
      <div
        className="px-3 py-1"
        style={{
          background: "rgba(255,140,0,0.04)",
          borderBottom: "1px solid rgba(255,140,0,0.1)",
        }}
      >
        <span
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(255,140,0,0.6)" }}
        >
          ⚡ SMART CHIP COMMANDER — BASS NO DEAD ZONE — DEEP FROM FIRST TOUCH ·
          VOCALS DARK NICE CRYSTAL 3Ω
        </span>
      </div>

      {/* 6 Band sliders — BASS · LOW MID · VOCALS · MID · HIGH MID · TREBLE */}
      <div className="px-3 pt-3 pb-2 flex gap-2" data-ocid="eq.bands">
        {BANDS.map((def) => (
          <BandControl
            key={def.key}
            band={def.key}
            def={def}
            value={bandValues[def.key]}
            onChange={bandHandlers[def.key]}
          />
        ))}
      </div>

      {/* Preset strength indicator */}
      {presetStrength < 10 && anyActive && (
        <div
          className="mx-3 mb-2 px-2 py-1 rounded-sm"
          style={{
            background: "rgba(0,213,255,0.04)",
            border: "1px solid rgba(0,213,255,0.12)",
          }}
        >
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(0,150,255,0.5)" }}
          >
            PRESET STRENGTH @ {presetStrength.toFixed(1)} — EFFECTIVE OUTPUT
            SCALED
          </span>
        </div>
      )}

      {/* ── E-Quake Section ── */}
      <div
        className="mx-3 mb-3 rounded-sm overflow-hidden"
        data-ocid="eq.equake.section"
        style={{
          background: eQuakeEnabled
            ? "rgba(180,50,255,0.08)"
            : "rgba(0,0,0,0.2)",
          border: eQuakeEnabled
            ? "1px solid rgba(180,50,255,0.5)"
            : "1px solid rgba(100,50,200,0.2)",
          boxShadow: eQuakeEnabled ? "0 0 12px rgba(180,50,255,0.12)" : "none",
        }}
      >
        {/* E-Quake header + toggle */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: eQuakeEnabled
                  ? "rgba(180,50,255,0.95)"
                  : "rgba(255,255,255,0.15)",
                boxShadow: eQuakeEnabled
                  ? "0 0 8px rgba(180,50,255,0.8)"
                  : "none",
                animation: eQuakeEnabled ? "pulse 1s infinite" : "none",
              }}
            />
            <div className="flex-1 min-w-0">
              <span
                className="text-[9px] font-mono tracking-[0.15em] font-bold uppercase block"
                style={{
                  color: eQuakeEnabled
                    ? "rgba(180,50,255,0.95)"
                    : "rgba(120,80,200,0.6)",
                }}
              >
                EARTHQUAKE MODE
              </span>
              <span
                className="text-[6.5px] font-mono tracking-widest block"
                style={{ color: "rgba(153,69,255,0.45)" }}
              >
                COMMANDER PROTECTED — SUB-BASS EARTHQUAKE EFFECT
              </span>
            </div>
            {eQuakeEnabled && (
              <span
                className="text-[7px] font-mono px-1.5 py-0.5 rounded-sm shrink-0"
                style={{
                  background: "rgba(180,50,255,0.15)",
                  border: "1px solid rgba(180,50,255,0.4)",
                  color: "rgba(200,100,255,0.9)",
                }}
              >
                {eQuakeIntensityLabel !== "OFF"
                  ? eQuakeIntensityLabel
                  : `LVL ${eQuakeLevel}`}
              </span>
            )}
          </div>

          {/* Toggle button */}
          <button
            type="button"
            data-ocid="eq.equake.toggle"
            onClick={() => handleEQuakeToggle(!eQuakeEnabled)}
            aria-pressed={eQuakeEnabled}
            className="px-3 py-1 rounded-sm font-mono text-[8px] tracking-widest font-bold transition-all duration-200 ml-2 shrink-0"
            style={{
              background: eQuakeEnabled
                ? "rgba(180,50,255,0.25)"
                : "rgba(80,40,150,0.2)",
              border: eQuakeEnabled
                ? "1px solid rgba(180,50,255,0.7)"
                : "1px solid rgba(100,60,200,0.3)",
              color: eQuakeEnabled
                ? "rgba(200,100,255,0.95)"
                : "rgba(120,80,200,0.6)",
            }}
          >
            {eQuakeEnabled ? "ON" : "OFF"}
          </button>
        </div>

        {/* E-Quake level slider (only visible when enabled) */}
        {eQuakeEnabled && (
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[7px] font-mono tracking-widest"
                style={{ color: "rgba(180,50,255,0.7)" }}
              >
                E-QUAKE LEVEL — 20Hz LOWSHELF +0 TO +15dB
              </span>
              <span
                className="text-[9px] font-mono font-bold tabular-nums"
                style={{ color: "rgba(200,100,255,0.9)" }}
              >
                {eQuakeLevel}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={eQuakeLevel}
              onChange={(e) => handleEQuakeLevelChange(Number(e.target.value))}
              data-ocid="eq.equake.slider"
              aria-label="E-Quake level — drag to adjust sub-bass earthquake intensity"
              className="w-full h-2 rounded-full cursor-pointer appearance-none"
              style={{
                background: `linear-gradient(to right, rgba(180,50,255,0.8) ${eQuakeLevel}%, rgba(255,255,255,0.1) ${eQuakeLevel}%)`,
                accentColor: "rgba(180,50,255,0.9)",
              }}
            />
            <div className="flex justify-between mt-1">
              <span
                className="text-[6px] font-mono"
                style={{ color: "rgba(180,50,255,0.4)" }}
              >
                0 — NO EFFECT
              </span>
              <span
                className="text-[6px] font-mono"
                style={{ color: "rgba(180,50,255,0.4)" }}
              >
                100 — FULL EARTHQUAKE +15dB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 pb-2 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(100,80,255,0.1)" }}
      >
        <span
          className="text-[6px] font-mono tracking-widest"
          style={{ color: "rgba(100,80,200,0.35)" }}
        >
          BASS 14–50Hz → LOW MID → VOCALS 3Ω → MID → HIGH MID → TREBLE
        </span>
        <span
          className="text-[6px] font-mono tracking-widest"
          style={{ color: "rgba(100,80,200,0.35)" }}
        >
          EACH BAND — DEDICATED NODE · CMD LOCKED
        </span>
      </div>
    </div>
  );
}
