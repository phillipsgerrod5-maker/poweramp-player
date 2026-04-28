import type { UseEQuakeReturn } from "@/hooks/useEQuake";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EQuakePanelProps {
  equake: UseEQuakeReturn;
}

// ─── Earthquake intensity bar ─────────────────────────────────────────────────

function IntensityBar({ value }: { value: number }) {
  const pct = (value / 10) * 100;
  const barColor =
    value === 0
      ? "rgba(100,60,200,0.2)"
      : value <= 4
        ? "linear-gradient(to right, rgba(200,120,0,0.8), rgba(255,160,0,0.95))"
        : "linear-gradient(to right, rgba(255,80,0,0.9), rgba(255,30,0,1))";
  const glow =
    value === 0
      ? "none"
      : value <= 4
        ? "0 0 12px rgba(255,140,0,0.6)"
        : "0 0 20px rgba(255,40,0,0.8), 0 0 40px rgba(255,0,0,0.4)";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span
          className="text-[7px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(153,69,255,0.5)" }}
        >
          EARTHQUAKE INTENSITY
        </span>
        {value > 0 && (
          <span
            className="text-[8px] font-mono tracking-widest font-bold px-1.5 py-0.5 rounded-sm"
            data-ocid="equake.active_indicator"
            style={{
              background:
                value <= 4 ? "rgba(255,140,0,0.12)" : "rgba(255,40,0,0.15)",
              border:
                value <= 4
                  ? "1px solid rgba(255,140,0,0.5)"
                  : "1px solid rgba(255,60,0,0.6)",
              color: value <= 4 ? "rgba(255,160,0,0.95)" : "rgba(255,80,0,1)",
              boxShadow:
                value <= 4
                  ? "0 0 8px rgba(255,140,0,0.3)"
                  : "0 0 12px rgba(255,40,0,0.5)",
              animation: "pulse-glow 0.8s infinite",
            }}
          >
            EARTHQUAKE ACTIVE
          </span>
        )}
      </div>
      {/* Segmented intensity bar */}
      <div
        className="relative h-4 rounded-sm overflow-hidden"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-all duration-200"
          style={{
            width: `${pct}%`,
            background: barColor,
            boxShadow: glow,
          }}
        />
        {/* Segment marks */}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pctMark) => (
          <div
            key={`seg-${pctMark}`}
            className="absolute inset-y-0 w-px"
            style={{
              left: `${pctMark}%`,
              background: "rgba(0,0,0,0.4)",
            }}
          />
        ))}
      </div>
      {/* Scale labels */}
      <div className="flex justify-between">
        {[0, 2, 4, 6, 8, 10].map((v) => (
          <span
            key={v}
            className="text-[6px] font-mono tabular-nums"
            style={{
              color:
                value >= v && v > 0
                  ? v <= 4
                    ? "rgba(255,160,0,0.7)"
                    : "rgba(255,80,0,0.7)"
                  : "rgba(255,255,255,0.18)",
            }}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EQuakePanel({ equake }: EQuakePanelProps) {
  const { value, isActive, commanderCapped, increment, decrement, setValue } =
    equake;

  const accentColor = isActive
    ? commanderCapped
      ? "rgba(255,100,0,0.95)"
      : value <= 4
        ? "rgba(255,160,0,0.95)"
        : "rgba(255,60,0,1)"
    : "rgba(100,60,200,0.45)";

  return (
    <div
      className="rounded-sm overflow-hidden"
      data-ocid="equake.panel"
      style={{
        background: isActive
          ? value <= 4
            ? "linear-gradient(135deg, rgba(30,10,0,0.97), rgba(40,15,0,0.95))"
            : "linear-gradient(135deg, rgba(40,5,0,0.98), rgba(50,8,0,0.97))"
          : "linear-gradient(135deg, rgba(0,5,20,0.96), rgba(0,8,30,0.94))",
        border: `1px solid ${isActive ? accentColor.replace(/[\d.]+\)$/, "0.45)") : "rgba(100,60,200,0.2)"}`,
        boxShadow: isActive
          ? `0 0 24px ${accentColor.replace(/[\d.]+\)$/, "0.15)")}`
          : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: isActive
            ? value > 4
              ? "rgba(255,40,0,0.08)"
              : "rgba(255,140,0,0.07)"
            : "rgba(0,10,40,0.3)",
          borderBottom: `1px solid ${isActive ? accentColor.replace(/[\d.]+\)$/, "0.25)") : "rgba(80,40,180,0.15)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            data-ocid="equake.status_dot"
            style={{
              background: isActive ? accentColor : "rgba(255,255,255,0.18)",
              boxShadow: isActive ? `0 0 10px ${accentColor}` : "none",
              animation: isActive ? "pulse-glow 1.2s infinite" : "none",
            }}
          />
          <div>
            <p
              className="text-[10px] font-mono tracking-[0.2em] uppercase font-black leading-tight"
              style={{
                color: isActive ? accentColor : "rgba(100,60,200,0.55)",
              }}
            >
              E-QUAKE — SUB-BASS EARTHQUAKE ENGINE
            </p>
            <p
              className="text-[7px] font-mono tracking-widest leading-tight"
              style={{ color: "rgba(153,69,255,0.45)" }}
            >
              33Hz CLOUD CITY | 14–50Hz LAYERED SUB | COMMANDER PROTECTED
            </p>
          </div>
        </div>

        {/* Beats beautifier badge */}
        <div
          className="px-1.5 py-0.5 rounded-sm shrink-0"
          style={{
            background: "rgba(100,80,255,0.07)",
            border: "1px solid rgba(100,80,255,0.3)",
          }}
        >
          <span
            className="text-[6px] font-mono tracking-widest font-bold"
            style={{ color: "rgba(100,80,255,0.75)" }}
          >
            BEATS BEAUTIFIER EQ e-QUAKE
          </span>
        </div>
      </div>

      {/* Main body */}
      <div className="px-3 py-3 flex items-center gap-4">
        {/* Big value display */}
        <div className="shrink-0 text-center w-16">
          <span
            className="text-4xl font-mono font-black tabular-nums leading-none"
            data-ocid="equake.value_display"
            style={{
              color: isActive ? accentColor : "rgba(255,255,255,0.2)",
              textShadow: isActive
                ? `0 0 20px ${accentColor}, 0 0 40px ${accentColor.replace(/[\d.]+\)$/, "0.4)")}`
                : "none",
            }}
          >
            {value}
          </span>
          <p
            className="text-[7px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(153,69,255,0.4)" }}
          >
            / 10
          </p>
        </div>

        {/* Tap up / tap down buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-ocid="equake.decrement_button"
            onClick={decrement}
            disabled={value === 0}
            aria-label="E-Quake down"
            className="w-11 h-11 rounded-sm flex items-center justify-center font-mono font-black text-xl transition-all duration-150 active:scale-95 disabled:opacity-30"
            style={{
              background: "rgba(100,60,200,0.15)",
              border: "1px solid rgba(100,60,200,0.35)",
              color: "rgba(153,100,255,0.9)",
            }}
          >
            −
          </button>
          <button
            type="button"
            data-ocid="equake.increment_button"
            onClick={increment}
            disabled={value === 10}
            aria-label="E-Quake up"
            className="w-11 h-11 rounded-sm flex items-center justify-center font-mono font-black text-xl transition-all duration-150 active:scale-95 disabled:opacity-30"
            style={{
              background: isActive
                ? value > 4
                  ? "rgba(255,40,0,0.18)"
                  : "rgba(255,140,0,0.15)"
                : "rgba(100,60,200,0.15)",
              border: `1px solid ${isActive ? accentColor.replace(/[\d.]+\)$/, "0.5)") : "rgba(100,60,200,0.35)"}`,
              color: isActive ? accentColor : "rgba(153,100,255,0.9)",
              boxShadow: isActive
                ? `0 0 10px ${accentColor.replace(/[\d.]+\)$/, "0.25)")}`
                : "none",
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* ── DRAG SLIDER — truly wired to 33Hz + 50Hz filter gain ── */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(153,69,255,0.5)" }}
          >
            EARTHQUAKE STRENGTH — DRAG SLIDER
          </span>
          <span
            className="text-[8px] font-mono font-bold tabular-nums"
            style={{ color: isActive ? accentColor : "rgba(100,60,200,0.4)" }}
          >
            {value}/10
          </span>
        </div>

        <div className="relative h-6 flex items-center">
          {/* Track fill */}
          <div
            className="absolute inset-x-0 h-2.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${(value / 10) * 100}%`,
                background: isActive
                  ? value > 4
                    ? "linear-gradient(to right, rgba(200,60,0,0.7), rgba(255,40,0,0.95))"
                    : "linear-gradient(to right, rgba(180,100,0,0.7), rgba(255,160,0,0.9))"
                  : "linear-gradient(to right, rgba(60,20,120,0.5), rgba(100,60,200,0.7))",
                boxShadow: isActive
                  ? `0 0 8px ${accentColor.replace(/[\d.]+\)$/, "0.5)")}`
                  : "none",
              }}
            />
          </div>
          {/* Invisible range input — truly wired, saves to localStorage via setValue */}
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            data-ocid="equake.drag_slider"
            aria-label="E-Quake earthquake strength — drag to set sub-bass intensity"
            className="absolute inset-x-0 w-full h-6 opacity-0 cursor-pointer"
            style={{ zIndex: 2 }}
          />
          {/* Thumb */}
          <div
            className="absolute w-5 h-5 rounded-full pointer-events-none"
            style={{
              left: `calc(${(value / 10) * 100}% - 10px)`,
              background: isActive ? accentColor : "rgba(80,40,160,0.7)",
              boxShadow: isActive ? `0 0 12px ${accentColor}` : "none",
              border: "2px solid rgba(255,255,255,0.85)",
              zIndex: 1,
              transition: "left 0.05s",
            }}
          />
        </div>

        {/* Notch labels */}
        <div className="flex justify-between mt-0.5">
          {[0, 2, 4, 6, 8, 10].map((n) => (
            <span
              key={n}
              className="text-[6px] font-mono tabular-nums"
              style={{
                color:
                  value >= n && n > 0
                    ? accentColor.replace(/[\d.]+\)$/, "0.6)")
                    : "rgba(255,255,255,0.12)",
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      {/* Earthquake intensity bar */}
      <div className="px-3 pb-3">
        <IntensityBar value={value} />
      </div>

      {/* Commander protection row */}
      <div
        className="flex items-center justify-between px-3 pb-2.5"
        style={{ borderTop: "1px solid rgba(100,60,200,0.1)", paddingTop: 6 }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background: commanderCapped
                ? "rgba(255,100,0,0.9)"
                : "rgba(0,255,120,0.85)",
            }}
          />
          <span
            className="text-[7px] font-mono tracking-widest"
            data-ocid="equake.commander_status"
            style={{
              color: commanderCapped
                ? "rgba(255,120,0,0.9)"
                : "rgba(0,255,120,0.7)",
            }}
          >
            {commanderCapped
              ? "CMD CAPPED — DISTORTION GUARD ACTIVE"
              : "CMD PROTECTED — 50B × 86 AUTHORITY"}
          </span>
        </div>
        <span
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(100,80,200,0.4)" }}
        >
          33Hz + 50Hz · WIRED
        </span>
      </div>
    </div>
  );
}
