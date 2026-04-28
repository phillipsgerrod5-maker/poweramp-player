import type { OhmCharacter, SrsOhmsState } from "@/types/player";
import React from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SrsOhmsPanelProps {
  state: SrsOhmsState;
  filterValues: Record<string, number>;
  onSetActive: (v: boolean) => void;
  onSetFilterValue: (key: string, value: number) => void;
  onSetPunch: (v: number) => void;
  onSetPresence: (v: number) => void;
  onSetResponse: (v: number) => void;
  onSetCharacter: (v: OhmCharacter) => void;
}

const OHM_CHARS: { id: OhmCharacter; label: string; desc: string }[] = [
  { id: "2ohm", label: "2-OHM", desc: "Maximum punch & current" },
  { id: "4ohm", label: "4-OHM", desc: "Balanced presence & response" },
  { id: "blend", label: "BLEND", desc: "Best of both characters" },
];

// ─── 9 Filter definitions ─────────────────────────────────────────────────────
// All 9 truly wired dedicated BiquadFilter nodes. Slider 0–100.
// At 50 = neutral (0dB). At 100 = +8dB. At 0 = -8dB.
// All fed into the 8 OHM DUMMY LOAD (WaveShaper after filter 9).

interface FilterDef {
  key: string;
  label: string;
  freq: string;
  type: string;
  desc: string;
  color: string;
  group: 1 | 2;
}

const NINE_FILTERS: FilterDef[] = [
  // Group 1 — 2-4 ohm mimick (6 filters)
  {
    key: "currentForce",
    label: "CURRENT FORCE",
    freq: "30Hz peaking Q2.0",
    type: "peaking",
    desc: "Simulates extra cone force at low bass — current push",
    color: "rgba(153,69,255,0.85)",
    group: 1,
  },
  {
    key: "coneFreedom",
    label: "CONE FREEDOM",
    freq: "50Hz lowshelf Q0.8",
    type: "lowshelf",
    desc: "Simulates loose cone movement — expressive bass",
    color: "rgba(180,80,255,0.85)",
    group: 1,
  },
  {
    key: "sensitivityPresence",
    label: "SENSITIVITY PRESENCE",
    freq: "100Hz peaking Q1.5",
    type: "peaking",
    desc: "Sensitivity at bass presence — 2-4 ohm response",
    color: "rgba(0,200,255,0.85)",
    group: 1,
  },
  {
    key: "crossoverCompensation",
    label: "CROSSOVER COMPENSATION",
    freq: "200Hz peaking Q2.0",
    type: "peaking",
    desc: "Compensates for crossover rolloff at 8 ohms",
    color: "rgba(0,180,255,0.85)",
    group: 1,
  },
  {
    key: "dynamicHeadroom",
    label: "DYNAMIC HEADROOM",
    freq: "300Hz highshelf Q1.0",
    type: "highshelf",
    desc: "Opens upper bass peaks — prevents early compression",
    color: "rgba(100,220,255,0.85)",
    group: 1,
  },
  {
    key: "lowMidWarmth",
    label: "LOW-MID WARMTH",
    freq: "400Hz peaking Q1.2",
    type: "peaking",
    desc: "Body and warmth in low-mid — 60–400Hz region",
    color: "rgba(255,180,80,0.85)",
    group: 1,
  },
  // Group 2 — bass drop filters (3 filters)
  {
    key: "dropDescent",
    label: "DROP DESCENT",
    freq: "25Hz lowshelf Q3.0",
    type: "lowshelf",
    desc: "Bass descends fast and hits the bottom — drop entry",
    color: "rgba(255,80,120,0.85)",
    group: 2,
  },
  {
    key: "landingWeight",
    label: "LANDING WEIGHT",
    freq: "60Hz peaking Q2.5",
    type: "peaking",
    desc: "Physical weight when bass lands — heavy and present",
    color: "rgba(200,60,255,0.85)",
    group: 2,
  },
  {
    key: "dropClarity",
    label: "DROP CLARITY",
    freq: "80Hz peaking Q2.0",
    type: "peaking",
    desc: "Clear drop, zero mud — defined and precise after landing",
    color: "rgba(0,255,200,0.85)",
    group: 2,
  },
];

// ─── Slider row — tap up / tap down only ──────────────────────────────────────

function FilterSliderRow({
  filter,
  value,
  onChange,
}: {
  filter: FilterDef;
  value: number;
  onChange: (v: number) => void;
}) {
  const gainDb = (((value - 50) / 50) * 8).toFixed(1);
  const gainSign = Number(gainDb) >= 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span
            className="text-[7px] font-mono tracking-widest uppercase font-bold"
            style={{ color: filter.color }}
          >
            {filter.label}
          </span>
          <span
            className="text-[5.5px] font-mono"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            {filter.freq}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-ocid={`srs_ohms.filter.${filter.key}.down`}
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-5 h-5 flex items-center justify-center rounded-sm text-[9px] font-mono font-bold transition-all duration-100 active:scale-90"
            style={{
              background: "rgba(0,20,60,0.6)",
              border: `1px solid ${filter.color.replace(/[\d.]+\)$/, "0.3)")}`,
              color: filter.color,
            }}
            aria-label={`${filter.label} down`}
          >
            −
          </button>
          <span
            className="text-[7px] font-mono tabular-nums font-bold w-8 text-center"
            style={{ color: filter.color }}
          >
            {gainSign}
            {gainDb}dB
          </span>
          <button
            type="button"
            data-ocid={`srs_ohms.filter.${filter.key}.up`}
            onClick={() => onChange(Math.min(100, value + 1))}
            className="w-5 h-5 flex items-center justify-center rounded-sm text-[9px] font-mono font-bold transition-all duration-100 active:scale-90"
            style={{
              background: "rgba(0,20,60,0.6)",
              border: `1px solid ${filter.color.replace(/[\d.]+\)$/, "0.3)")}`,
              color: filter.color,
            }}
            aria-label={`${filter.label} up`}
          >
            +
          </button>
        </div>
      </div>
      {/* Visual bar */}
      <div
        className="relative h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(0,20,60,0.4)" }}
      >
        <div
          className="absolute top-0 bottom-0 rounded-full transition-all duration-100"
          style={{
            left: value < 50 ? `${value}%` : "50%",
            width: `${Math.abs(value - 50)}%`,
            background: filter.color,
          }}
        />
        {/* Center mark */}
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: "50%", background: "rgba(255,255,255,0.3)" }}
        />
      </div>
      <span
        className="text-[5.5px] font-mono"
        style={{ color: "rgba(255,255,255,0.18)" }}
      >
        {filter.desc}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SrsOhmsPanel({
  state,
  filterValues,
  onSetActive,
  onSetFilterValue,
  onSetCharacter,
}: SrsOhmsPanelProps) {
  // Default filter values to 50 if not present
  const getVal = (key: string) => filterValues[key] ?? 50;

  const group1 = NINE_FILTERS.filter((f) => f.group === 1);
  const group2 = NINE_FILTERS.filter((f) => f.group === 2);

  return (
    <div
      className="mx-4 my-3 rounded-sm overflow-hidden"
      data-ocid="srs_ohms.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,6,25,0.97), rgba(10,0,35,0.96))",
        border: state.active
          ? "1px solid rgba(153,69,255,0.45)"
          : "1px solid rgba(80,30,180,0.2)",
        boxShadow: state.active ? "0 0 16px rgba(153,69,255,0.12)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,4,18,0.65)",
          borderBottom: "1px solid rgba(100,50,200,0.18)",
        }}
      >
        <div className="flex flex-col">
          <span
            className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase"
            style={{ color: "rgba(200,150,255,0.9)" }}
          >
            SRS FILTER 8 OHMS — 9 FILTERS
          </span>
          <span
            className="text-[6px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(130,90,220,0.55)" }}
          >
            14–60 Hz · 2-4 OHM CHARACTER → 9 BIQUAD NODES → 8 OHM DUMMY LOAD
          </span>
        </div>
        <button
          type="button"
          data-ocid="srs_ohms.toggle"
          onClick={() => onSetActive(!state.active)}
          className="px-2.5 py-1 rounded-sm text-[7px] font-mono tracking-[0.2em] uppercase transition-all duration-200"
          style={{
            background: state.active
              ? "rgba(153,69,255,0.2)"
              : "rgba(0,10,40,0.5)",
            border: state.active
              ? "1px solid rgba(153,69,255,0.6)"
              : "1px solid rgba(80,40,160,0.3)",
            color: state.active
              ? "rgba(200,150,255,0.95)"
              : "rgba(100,60,180,0.5)",
          }}
        >
          {state.active ? "ON" : "OFF"}
        </button>
      </div>

      {/* 8 Ohm Dummy Load status */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(80,30,160,0.12)" }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: state.active
              ? "rgba(0,255,120,0.8)"
              : "rgba(0,80,50,0.4)",
            boxShadow: state.active ? "0 0 5px rgba(0,255,120,0.6)" : "none",
          }}
        />
        <span
          className="text-[6px] font-mono tracking-widest uppercase"
          style={{
            color: state.active ? "rgba(0,200,100,0.7)" : "rgba(0,60,40,0.4)",
          }}
        >
          8 OHM DUMMY LOAD — ALL 9 FILTERS WIRED → WAVESHAPER THERMAL MODEL
        </span>
      </div>

      {/* Ohm character selector */}
      <div className="px-3 py-2 flex gap-1.5">
        {OHM_CHARS.map((ch) => (
          <button
            key={ch.id}
            type="button"
            data-ocid={`srs_ohms.character.${ch.id}`}
            onClick={() => onSetCharacter(ch.id)}
            className="flex-1 py-1.5 px-1 rounded-sm text-center transition-all duration-200"
            style={{
              background:
                state.ohmCharacter === ch.id
                  ? "rgba(153,69,255,0.18)"
                  : "rgba(0,5,20,0.4)",
              border:
                state.ohmCharacter === ch.id
                  ? "1px solid rgba(153,69,255,0.55)"
                  : "1px solid rgba(80,30,150,0.2)",
            }}
          >
            <div
              className="text-[7px] font-mono tracking-widest font-bold"
              style={{
                color:
                  state.ohmCharacter === ch.id
                    ? "rgba(200,150,255,0.95)"
                    : "rgba(120,80,200,0.5)",
              }}
            >
              {ch.label}
            </div>
            <div
              className="text-[5.5px] font-mono mt-0.5"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {ch.desc}
            </div>
          </button>
        ))}
      </div>

      {/* ── Group 1: 2-4 OHM MIMICK FILTERS (6 filters) ── */}
      <div className="px-3 pb-2">
        <div
          className="px-2 py-1 mb-2 rounded-sm"
          style={{
            background: "rgba(153,69,255,0.06)",
            border: "1px solid rgba(153,69,255,0.2)",
          }}
        >
          <span
            className="text-[7px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{ color: "rgba(153,69,255,0.8)" }}
          >
            2-4 OHM MIMICK FILTERS — DEDICATED BIQUAD NODES
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {group1.map((f) => (
            <FilterSliderRow
              key={f.key}
              filter={f}
              value={getVal(f.key)}
              onChange={(v) => onSetFilterValue(f.key, v)}
            />
          ))}
        </div>
      </div>

      {/* ── Group 2: BASS DROP FILTER MIX (3 filters) ── */}
      <div className="px-3 pb-3">
        <div
          className="px-2 py-1 mb-2 rounded-sm"
          style={{
            background: "rgba(255,80,120,0.06)",
            border: "1px solid rgba(255,80,120,0.2)",
          }}
        >
          <span
            className="text-[7px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{ color: "rgba(255,120,150,0.8)" }}
          >
            BASS DROP FILTER MIX — STRONGLY CLEAR DROP
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {group2.map((f) => (
            <FilterSliderRow
              key={f.key}
              filter={f}
              value={getVal(f.key)}
              onChange={(v) => onSetFilterValue(f.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Range indicator */}
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: "rgba(0,3,14,0.5)",
          borderTop: "1px solid rgba(70,20,150,0.15)",
        }}
      >
        <span
          className="text-[6px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(130,90,200,0.4)" }}
        >
          RANGE: 14Hz → 60Hz · 9 BIQUAD NODES ACTIVE
        </span>
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: state.active
                ? "rgba(0,255,120,0.7)"
                : "rgba(0,80,50,0.3)",
            }}
          />
          <span
            className="text-[6px] font-mono tracking-widest"
            style={{
              color: state.active
                ? "rgba(153,69,255,0.6)"
                : "rgba(80,40,130,0.35)",
            }}
          >
            {state.active ? "DUMMY LOAD: ACTIVE" : "DISABLED"}
          </span>
        </div>
      </div>
    </div>
  );
}

// React import needed for local usage
export { React };
