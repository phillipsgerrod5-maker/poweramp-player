import { useCallback } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PresetStrengthPanelProps {
  value: number; // 0–10
  onChange: (v: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PresetStrengthPanel({
  value,
  onChange,
}: PresetStrengthPanelProps) {
  const pct = (value / 10) * 100;
  const isActive = value > 0;

  const fillColor =
    value <= 3
      ? "rgba(0,213,255,0.9)"
      : value <= 7
        ? "rgba(100,100,255,0.9)"
        : "rgba(153,69,255,0.95)";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  return (
    <div
      className="mx-4 mb-3 rounded-sm overflow-hidden"
      data-ocid="preset_strength.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,8,30,0.94), rgba(5,5,40,0.92))",
        border: isActive
          ? "1px solid rgba(153,69,255,0.35)"
          : "1px solid rgba(0,80,200,0.18)",
        boxShadow: isActive ? "0 0 14px rgba(153,69,255,0.1)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: isActive ? "rgba(153,69,255,0.07)" : "rgba(0,20,60,0.3)",
          borderBottom: "1px solid rgba(153,69,255,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: isActive ? fillColor : "rgba(255,255,255,0.2)",
              boxShadow: isActive ? `0 0 8px ${fillColor}` : "none",
            }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.2em] uppercase font-bold"
            style={{
              color: isActive
                ? "rgba(153,69,255,0.85)"
                : "rgba(100,80,200,0.45)",
            }}
          >
            PRESET STRENGTH
          </span>
        </div>
        <span
          className="text-[8px] font-mono tracking-widest"
          style={{ color: "rgba(153,69,255,0.35)" }}
        >
          EQ INTENSITY MULTIPLIER
        </span>
      </div>

      {/* Slider */}
      <div className="px-4 pt-4 pb-2">
        {/* Value display */}
        <div className="flex items-end justify-center gap-1 mb-4">
          <span
            className="font-mono font-black tabular-nums leading-none"
            data-ocid="preset_strength.value"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4rem)",
              color: isActive ? fillColor : "rgba(255,255,255,0.2)",
              textShadow: isActive ? `0 0 20px ${fillColor}` : "none",
            }}
          >
            {value.toFixed(1)}
          </span>
          <span
            className="text-sm font-mono mb-2"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            / 10
          </span>
        </div>

        {/* Track + slider */}
        <div className="relative h-8 flex items-center">
          {/* Track */}
          <div
            className="absolute inset-x-0 h-3 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {/* Fill */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
              style={{
                width: `${pct}%`,
                background: isActive
                  ? `linear-gradient(to right, rgba(0,80,200,0.8), ${fillColor})`
                  : "rgba(255,255,255,0.1)",
                boxShadow: isActive ? `0 0 8px ${fillColor}` : "none",
              }}
            />
          </div>

          {/* Input overlay */}
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={value}
            onChange={handleChange}
            aria-label="Preset strength"
            className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer"
            style={{ zIndex: 2 }}
            data-ocid="preset_strength.slider"
          />

          {/* Thumb */}
          <div
            className="absolute w-7 h-7 rounded-full pointer-events-none"
            style={{
              left: `calc(${pct}% - 14px)`,
              background: fillColor,
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: isActive
                ? `0 0 12px ${fillColor}, 0 0 24px ${fillColor.replace(/[\d.]+\)$/, "0.4)")}`
                : "none",
              zIndex: 1,
            }}
          />
        </div>

        {/* Tick marks */}
        <div className="flex justify-between mt-1 px-1">
          {[0, 2, 4, 6, 8, 10].map((tick) => (
            <div key={tick} className="flex flex-col items-center">
              <div
                className="h-1.5 w-px"
                style={{
                  background:
                    value >= tick ? fillColor : "rgba(255,255,255,0.12)",
                }}
              />
              <span
                className="text-[7px] font-mono mt-0.5"
                style={{
                  color:
                    value >= tick
                      ? "rgba(255,255,255,0.45)"
                      : "rgba(255,255,255,0.15)",
                }}
              >
                {tick}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-2.5">
        <p
          className="text-[7px] font-mono tracking-widest text-center"
          style={{ color: "rgba(153,69,255,0.35)" }}
        >
          SCALES ALL EQ GAINS BY {((value / 10) * 100).toFixed(0)}% · 0 =
          BYPASSED · 10 = FULL INTENSITY
        </p>
      </div>
    </div>
  );
}
