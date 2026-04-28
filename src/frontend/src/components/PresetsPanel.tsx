/**
 * PresetsPanel — 10 Mid Bass Presets, Hard & Pumping
 *
 * EXACTLY 10 presets. No others.
 * Each button fires applyPreset() which sets all 6 EQ bands simultaneously.
 * Active preset glows electric blue.
 * Preset Strength slider multiplies how hard the preset hits (0.5–1.5x).
 * Auto-saves active preset + strength to localStorage.
 */

import type { UseEQuakeReturn } from "@/hooks/useEQuake";
import { BASS_PRESETS } from "@/hooks/useVirtualAmp";
import { useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PresetsPanelProps {
  // New API
  onApplyPreset?: (index: number) => void;
  activePreset?: number | null;
  // Legacy API (backward compat with PlayerPage)
  onBassChange?: (v: number) => void;
  onMidsChange?: (v: number) => void;
  onHighsChange?: (v: number) => void;
  equake?: UseEQuakeReturn;
  onCheaterBeater?: (on: boolean) => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function saveLS(key: string, v: number): void {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* */
  }
}

function loadLS(key: string, fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? Number(v) : fallback;
  } catch {
    return fallback;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PresetsPanel({
  onApplyPreset,
  activePreset: externalActivePreset,
  onBassChange,
  onMidsChange,
  onHighsChange,
  equake,
  onCheaterBeater,
}: PresetsPanelProps) {
  const [internalActivePreset, setInternalActivePreset] = useState<
    number | null
  >(() => {
    try {
      const v = localStorage.getItem("poweramp_active_preset");
      return v !== null ? Number(v) : null;
    } catch {
      return null;
    }
  });
  const [presetStrength, setPresetStrengthState] = useState(() =>
    loadLS("poweramp_preset_strength", 80),
  );

  // Use external if provided, otherwise internal
  const activePreset =
    externalActivePreset !== undefined
      ? externalActivePreset
      : internalActivePreset;

  const handlePreset = useCallback(
    (index: number) => {
      const preset = BASS_PRESETS[index];
      if (!preset) return;
      setInternalActivePreset(index);
      saveLS("poweramp_active_preset", index);

      if (onApplyPreset) {
        // New API — single callback
        onApplyPreset(index);
      } else {
        // Legacy API — individual band callbacks
        // Convert preset 0-100 values to dB for legacy setters
        // bass: gain = -6 + 24 * (v/100)^0.7
        const bassGain = -6 + 24 * (preset.bass / 100) ** 0.7;
        const midGain = ((preset.mid - 50) / 50) * 12;
        const highMidGain = ((preset.highMid - 50) / 50) * 12;
        onBassChange?.(bassGain);
        onMidsChange?.(midGain);
        onHighsChange?.(highMidGain);
        // Legacy equake: old scale was 0-10, map from new 0-100
        if (equake) equake.setValue(0); // reset equake on preset change
        onCheaterBeater?.(false); // presets disable Cheater Beater
      }
    },
    [
      onApplyPreset,
      onBassChange,
      onMidsChange,
      onHighsChange,
      equake,
      onCheaterBeater,
    ],
  );

  const handleStrength = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setPresetStrengthState(clamped);
    saveLS("poweramp_preset_strength", clamped);
  }, []);

  return (
    <div
      className="mx-4 my-3 rounded-sm overflow-hidden"
      data-ocid="presets.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,6,25,0.98), rgba(0,10,35,0.97))",
        border: "1px solid rgba(0,130,255,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,4,18,0.65)",
          borderBottom: "1px solid rgba(0,100,200,0.2)",
        }}
      >
        <div>
          <span
            className="text-[9px] font-mono tracking-[0.2em] font-bold uppercase"
            style={{ color: "rgba(0,200,255,0.9)" }}
          >
            MID BASS PRESETS — HARD &amp; PUMPING
          </span>
          <p
            className="text-[6px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(0,100,200,0.5)" }}
          >
            10 PRESETS · EACH SETS ALL 6 BANDS SIMULTANEOUSLY · AUTO SAVED
          </p>
        </div>
        {activePreset !== null && (
          <span
            className="text-[7px] font-mono tracking-widest px-2 py-0.5 rounded-sm shrink-0"
            style={{
              background: "rgba(0,213,255,0.1)",
              border: "1px solid rgba(0,213,255,0.4)",
              color: "rgba(0,213,255,0.9)",
            }}
          >
            #{activePreset + 1} ACTIVE
          </span>
        )}
      </div>

      {/* Preset grid — 2 columns × 5 rows */}
      <div className="p-3 grid grid-cols-2 gap-2" data-ocid="presets.list">
        {BASS_PRESETS.map((preset, index) => {
          const isActive = activePreset === index;
          return (
            <button
              key={preset.name}
              type="button"
              data-ocid={`presets.item.${index + 1}`}
              onClick={() => handlePreset(index)}
              aria-pressed={isActive}
              className="flex flex-col gap-1 px-2.5 py-2 rounded-sm text-left transition-all duration-200 active:scale-[0.97]"
              style={{
                background: isActive
                  ? "rgba(0,130,255,0.15)"
                  : "rgba(0,8,30,0.6)",
                border: isActive
                  ? "1px solid rgba(0,213,255,0.7)"
                  : "1px solid rgba(0,60,150,0.2)",
                boxShadow: isActive
                  ? "0 0 14px rgba(0,213,255,0.3), inset 0 0 12px rgba(0,130,255,0.08)"
                  : "none",
              }}
            >
              {/* Name row */}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: isActive
                      ? "rgba(0,213,255,0.95)"
                      : "rgba(255,255,255,0.15)",
                    boxShadow: isActive
                      ? "0 0 6px rgba(0,213,255,0.9)"
                      : "none",
                  }}
                />
                <span
                  className="text-[7px] font-mono tracking-widest font-bold uppercase leading-tight"
                  style={{
                    color: isActive
                      ? "rgba(0,213,255,0.98)"
                      : "rgba(180,200,255,0.65)",
                    textShadow: isActive
                      ? "0 0 8px rgba(0,213,255,0.5)"
                      : "none",
                  }}
                >
                  {preset.name}
                </span>
              </div>

              {/* Bass dB indicator */}
              <div className="flex items-center gap-1 pl-3 flex-wrap">
                <span
                  className="text-[5px] font-mono px-1 py-px rounded-sm"
                  style={{
                    background: isActive
                      ? "rgba(255,140,0,0.15)"
                      : "rgba(255,255,255,0.04)",
                    border: isActive
                      ? "1px solid rgba(255,140,0,0.4)"
                      : "1px solid rgba(255,255,255,0.07)",
                    color: isActive
                      ? "rgba(255,160,0,0.9)"
                      : "rgba(150,170,220,0.4)",
                  }}
                >
                  BASS {preset.bassDbLabel}
                </span>
                <span
                  className="text-[5px] font-mono px-1 py-px rounded-sm"
                  style={{
                    background: isActive
                      ? "rgba(0,213,255,0.1)"
                      : "rgba(255,255,255,0.04)",
                    border: isActive
                      ? "1px solid rgba(0,213,255,0.3)"
                      : "1px solid rgba(255,255,255,0.07)",
                    color: isActive
                      ? "rgba(0,213,255,0.8)"
                      : "rgba(150,170,220,0.4)",
                  }}
                >
                  BASS {preset.bass}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Preset Strength slider */}
      <div
        className="mx-3 mb-3 rounded-sm overflow-hidden"
        data-ocid="presets.strength.section"
        style={{
          background: "rgba(0,8,30,0.5)",
          border: "1px solid rgba(0,80,180,0.2)",
        }}
      >
        <div className="px-3 pt-2 pb-0.5 flex items-center justify-between">
          <div>
            <span
              className="text-[8px] font-mono tracking-widest font-bold"
              style={{ color: "rgba(0,200,255,0.85)" }}
            >
              PRESET STRENGTH
            </span>
            <p
              className="text-[6px] font-mono mt-0.5"
              style={{ color: "rgba(0,120,200,0.5)" }}
            >
              Controls how hard the preset hits
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="text-[11px] font-mono font-black tabular-nums"
              style={{
                color:
                  presetStrength > 70
                    ? "rgba(0,213,255,0.9)"
                    : "rgba(100,150,255,0.7)",
              }}
            >
              {presetStrength}
            </span>
            <span
              className="text-[7px] font-mono"
              style={{ color: "rgba(0,130,255,0.5)" }}
            >
              %
            </span>
          </div>
        </div>
        <div className="px-3 pb-3 pt-1.5">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={presetStrength}
            onChange={(e) => handleStrength(Number(e.target.value))}
            data-ocid="presets.strength.slider"
            aria-label="Preset strength — drag to adjust"
            className="w-full h-2 rounded-full cursor-pointer appearance-none"
            style={{
              background: `linear-gradient(to right, rgba(0,213,255,0.8) ${presetStrength}%, rgba(255,255,255,0.1) ${presetStrength}%)`,
              accentColor: "rgba(0,213,255,0.9)",
            }}
          />
          <div className="flex justify-between mt-1">
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(0,130,255,0.4)" }}
            >
              SOFT
            </span>
            <span
              className="text-[6px] font-mono"
              style={{ color: "rgba(0,130,255,0.4)" }}
            >
              FULL HIT
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{
          background: "rgba(0,3,14,0.5)",
          borderTop: "1px solid rgba(0,60,150,0.18)",
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: "rgba(0,213,255,0.7)",
            boxShadow: "0 0 4px rgba(0,213,255,0.5)",
            animation: "pulse 2s infinite",
          }}
        />
        <span
          className="text-[6px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(0,130,255,0.4)" }}
        >
          ALL PRESETS TRULY WIRED · SETS ALL 6 BANDS · AUTO SAVED
        </span>
      </div>
    </div>
  );
}
