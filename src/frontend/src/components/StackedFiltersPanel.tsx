import type { StackedFiltersState } from "@/types/player";

// ─── Props ────────────────────────────────────────────────────────────────────

interface StackedFiltersPanelProps {
  state: StackedFiltersState;
  onMidPresence: (v: number) => void;
  onMidBody: (v: number) => void;
  onMidClarity: (v: number) => void;
  onHighAir: (v: number) => void;
  onHighDetail: (v: number) => void;
  onHighBrilliance: (v: number) => void;
}

// ─── Filter slider with toggle ON/OFF ────────────────────────────────────────
// Toggle ON: sets filter gain to its active value
// Toggle OFF: sets gain to 0 (neutral — still in chain, not affecting signal)
// Indicator only green when gain > 0 (actually affecting signal)

function FilterSlider({
  label,
  hz,
  value,
  maxDb,
  onChange,
  ocid,
  color,
}: {
  label: string;
  hz: string;
  value: number; // 0–100
  maxDb: number;
  onChange: (v: number) => void;
  ocid: string;
  color: string;
}) {
  const gainDb = (((value - 50) / 50) * maxDb).toFixed(1);
  const gainSign = Number(gainDb) >= 0 ? "+" : "";
  // Filter is "active" when gain is non-zero (value != 50)
  const isActive = value !== 50;
  const isOn = value > 50; // boosting
  const isCut = value < 50; // cutting

  const handleToggle = () => {
    if (isActive) {
      // Turn off — set to neutral (50)
      onChange(50);
    } else {
      // Turn on — set to a meaningful boost (+2 steps from center)
      onChange(52);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Toggle button + label */}
      <div className="w-24 shrink-0 flex items-center gap-1.5">
        {/* True indicator dot — only green when gain > 0 */}
        <button
          type="button"
          data-ocid={`${ocid}.toggle`}
          onClick={handleToggle}
          aria-pressed={isActive}
          aria-label={`${label} toggle`}
          className="w-4 h-4 rounded-full shrink-0 transition-all duration-200 hover:scale-110 active:scale-90 border-0"
          style={{
            background: isOn
              ? color
              : isCut
                ? "rgba(255,80,80,0.7)"
                : "rgba(255,255,255,0.12)",
            boxShadow: isOn
              ? `0 0 6px ${color}`
              : isCut
                ? "0 0 4px rgba(255,80,80,0.5)"
                : "none",
          }}
          title={
            isActive
              ? `${label} ON — click to set neutral`
              : `${label} neutral — click to boost`
          }
        />
        <div className="min-w-0">
          <p
            className="text-[7px] font-mono tracking-widest uppercase truncate"
            style={{
              color: isActive
                ? "rgba(200,210,255,0.9)"
                : "rgba(200,210,255,0.5)",
            }}
          >
            {label}
          </p>
          <p
            className="text-[6px] font-mono truncate"
            style={{ color: "rgba(150,160,220,0.35)" }}
          >
            {hz}
          </p>
        </div>
      </div>

      {/* Tap down button */}
      <button
        type="button"
        data-ocid={`${ocid}.down`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 flex items-center justify-center rounded-sm font-mono font-bold text-[10px] transition-all duration-100 active:scale-90 shrink-0"
        style={{
          background: "rgba(0,15,50,0.6)",
          border: `1px solid ${color.replace(/[\d.]+\)$/, "0.3)")}`,
          color,
        }}
        aria-label={`${label} decrease`}
      >
        −
      </button>

      {/* Visual bar */}
      <div className="flex-1 relative">
        <div
          className="relative h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(0,15,50,0.4)" }}
        >
          {/* Fill from center */}
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-100"
            style={{
              left: value < 50 ? `${value}%` : "50%",
              width: `${Math.abs(value - 50)}%`,
              background: isOn ? color : "rgba(255,80,80,0.7)",
            }}
          />
          {/* Center mark */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: "50%", background: "rgba(255,255,255,0.25)" }}
          />
        </div>
        {/* Keyboard-accessible range input */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          data-ocid={ocid}
          className="sr-only"
          aria-label={`${label} — ${gainSign}${gainDb}dB`}
        />
      </div>

      {/* Tap up button */}
      <button
        type="button"
        data-ocid={`${ocid}.up`}
        onClick={() => onChange(Math.min(100, value + 1))}
        className="w-6 h-6 flex items-center justify-center rounded-sm font-mono font-bold text-[10px] transition-all duration-100 active:scale-90 shrink-0"
        style={{
          background: "rgba(0,15,50,0.6)",
          border: `1px solid ${color.replace(/[\d.]+\)$/, "0.3)")}`,
          color,
        }}
        aria-label={`${label} increase`}
      >
        +
      </button>

      {/* dB readout */}
      <span
        className="text-[7px] font-mono w-10 text-right shrink-0 tabular-nums"
        style={{
          color: isActive ? color : "rgba(255,255,255,0.25)",
        }}
      >
        {gainSign}
        {gainDb}dB
      </span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  range,
  color,
}: { title: string; range: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: color, boxShadow: `0 0 5px ${color}` }}
      />
      <span
        className="text-[8px] font-mono tracking-[0.25em] font-bold uppercase"
        style={{ color }}
      >
        {title}
      </span>
      <span
        className="text-[6.5px] font-mono tracking-widest"
        style={{ color: "rgba(150,160,220,0.4)" }}
      >
        {range}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StackedFiltersPanel({
  state,
  onMidPresence,
  onMidBody,
  onMidClarity,
  onHighAir,
  onHighDetail,
  onHighBrilliance,
}: StackedFiltersPanelProps) {
  return (
    <div
      className="mx-4 my-3 rounded-sm overflow-hidden"
      data-ocid="stacked_filters.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,6,25,0.97), rgba(0,12,40,0.96))",
        border: "1px solid rgba(0,160,255,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,4,18,0.65)",
          borderBottom: "1px solid rgba(0,100,200,0.18)",
        }}
      >
        <div>
          <span
            className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase"
            style={{ color: "rgba(0,200,255,0.9)" }}
          >
            STACKED FILTERS
          </span>
          <p
            className="text-[6px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(0,120,200,0.5)" }}
          >
            MID + HIGH · 6 DEDICATED BIQUAD NODES · DOT = ON/OFF · COMMANDER
            ±12dB
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-[6px] font-mono tracking-widest"
            style={{ color: "rgba(255,100,200,0.7)" }}
          >
            STACK STRENGTH
          </p>
          <p
            className="text-[7px] font-mono font-bold"
            style={{ color: "rgba(255,100,200,0.85)" }}
          >
            {state.stackStrength}
          </p>
        </div>
      </div>

      {/* Mid Filters */}
      <div className="px-3 pt-3 pb-2">
        <SectionHeader
          title="MID STACKED FILTERS"
          range="200Hz–2,500Hz"
          color="rgba(0,200,255,0.8)"
        />
        <div className="flex flex-col gap-2.5">
          <FilterSlider
            label="PRESENCE"
            hz="1000Hz peaking Q1.5"
            value={state.midFilters.presence}
            maxDb={10}
            onChange={onMidPresence}
            ocid="stacked_filters.mid_presence"
            color="rgba(0,200,255,0.8)"
          />
          <FilterSlider
            label="BODY"
            hz="300Hz peaking Q1.2"
            value={state.midFilters.body}
            maxDb={8}
            onChange={onMidBody}
            ocid="stacked_filters.mid_body"
            color="rgba(0,170,255,0.7)"
          />
          <FilterSlider
            label="CLARITY"
            hz="2000Hz peaking Q2.0"
            value={state.midFilters.clarity}
            maxDb={10}
            onChange={onMidClarity}
            ocid="stacked_filters.mid_clarity"
            color="rgba(0,230,255,0.75)"
          />
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-3 my-1"
        style={{ height: 1, background: "rgba(0,80,180,0.18)" }}
      />

      {/* High Filters */}
      <div className="px-3 pt-2 pb-3">
        <SectionHeader
          title="HIGH STACKED FILTERS"
          range="2,500Hz–14,000Hz"
          color="rgba(153,69,255,0.8)"
        />
        <div className="flex flex-col gap-2.5">
          <FilterSlider
            label="AIR"
            hz="10000Hz highshelf Q0.7"
            value={state.highFilters.air}
            maxDb={10}
            onChange={onHighAir}
            ocid="stacked_filters.high_air"
            color="rgba(153,69,255,0.8)"
          />
          <FilterSlider
            label="DETAIL"
            hz="4000Hz peaking Q2.0"
            value={state.highFilters.detail}
            maxDb={10}
            onChange={onHighDetail}
            ocid="stacked_filters.high_detail"
            color="rgba(180,100,255,0.75)"
          />
          <FilterSlider
            label="BRILLIANCE"
            hz="7000Hz highshelf Q1.0"
            value={state.highFilters.brilliance}
            maxDb={12}
            onChange={onHighBrilliance}
            ocid="stacked_filters.high_brilliance"
            color="rgba(200,130,255,0.75)"
          />
        </div>
      </div>

      {/* Commander badge */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{
          background: "rgba(0,3,14,0.5)",
          borderTop: "1px solid rgba(60,20,150,0.18)",
        }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: "rgba(255,100,200,0.9)",
            boxShadow: "0 0 5px rgba(255,100,200,0.7)",
          }}
        />
        <span
          className="text-[6px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(255,100,200,0.55)" }}
        >
          COMMANDER DIRECT HIT 50,000,000,000 × 86 — CAP ±12dB — NOTHING GETS
          PUSHED BACK — INDICATOR DOT = TRULY ACTIVE
        </span>
      </div>
    </div>
  );
}
