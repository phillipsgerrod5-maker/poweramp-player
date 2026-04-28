import type { MasterPowerState } from "@/types/player";

// ─── Props ────────────────────────────────────────────────────────────────────

interface MasterPowerPanelProps {
  state: MasterPowerState;
  onChange: (value: number) => void;
}

function getStrengthLabel(power: number): string {
  if (power >= 96) return "MAXIMUM FORCE";
  if (power >= 81) return "FULL POWER";
  if (power >= 61) return "STRONG";
  if (power >= 41) return "MODERATE";
  if (power >= 21) return "LOW";
  return "MINIMAL";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MasterPowerPanel({ state, onChange }: MasterPowerPanelProps) {
  const { masterPower, chargerActive, chargeLevel } = state;
  const strengthLabel = getStrengthLabel(masterPower);

  const sliderTrackColor =
    masterPower >= 80
      ? "rgba(0,220,255,0.8)"
      : masterPower >= 50
        ? "rgba(0,180,255,0.7)"
        : "rgba(0,100,200,0.5)";

  return (
    <div
      className="mx-4 my-3 rounded-sm overflow-hidden"
      data-ocid="master_power.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,5,20,0.98), rgba(0,12,40,0.97))",
        border: "1px solid rgba(0,180,255,0.35)",
        boxShadow: "0 0 24px rgba(0,150,255,0.1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,4,18,0.7)",
          borderBottom: "1px solid rgba(0,120,255,0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background:
                masterPower >= 80
                  ? "rgba(0,220,255,0.95)"
                  : "rgba(0,130,255,0.6)",
              boxShadow:
                masterPower >= 80
                  ? "0 0 10px rgba(0,220,255,0.8)"
                  : "0 0 5px rgba(0,130,255,0.4)",
            }}
          />
          <span
            className="text-[9px] font-mono tracking-[0.3em] font-bold uppercase"
            style={{ color: "rgba(0,200,255,0.9)" }}
          >
            MASTER POWER
          </span>
        </div>
        <span
          className="text-[8px] font-mono tracking-widest font-bold"
          style={{ color: sliderTrackColor }}
        >
          {masterPower}%
        </span>
      </div>

      {/* Power combined indicator */}
      <div
        className="px-3 py-1.5 flex items-center gap-3"
        style={{ borderBottom: "1px solid rgba(0,80,180,0.15)" }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(0,255,180,0.8)",
              boxShadow: "0 0 5px rgba(0,255,180,0.6)",
            }}
          />
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(0,255,180,0.6)" }}
          >
            BROWSER PWR: ACTIVE
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(153,69,255,0.8)",
              boxShadow: "0 0 5px rgba(153,69,255,0.6)",
            }}
          />
          <span
            className="text-[7px] font-mono tracking-widest"
            style={{ color: "rgba(153,69,255,0.6)" }}
          >
            VIRTUAL PWR: ACTIVE
          </span>
        </div>
        <span
          className="text-[7px] font-mono tracking-widest ml-auto"
          style={{ color: "rgba(0,200,255,0.45)" }}
        >
          COMBINED ✓
        </span>
      </div>

      {/* BIG SLIDER — user manually drags this, pure power not volume */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(0,100,200,0.5)" }}
          >
            0% MIN
          </span>
          <span
            className="text-sm font-mono font-black tracking-[0.15em]"
            style={{
              color: sliderTrackColor,
              textShadow: `0 0 16px ${sliderTrackColor}`,
            }}
          >
            {strengthLabel}
          </span>
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(0,100,200,0.5)" }}
          >
            100% MAX
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={masterPower}
            onChange={(e) => onChange(Number(e.target.value))}
            data-ocid="master_power.slider"
            className="w-full"
            aria-label="Master power slider — controls system power level 0 to 100 percent"
            style={{
              WebkitAppearance: "none",
              appearance: "none",
              height: 22,
              background: `linear-gradient(to right, ${sliderTrackColor} 0%, ${sliderTrackColor} ${masterPower}%, rgba(0,30,80,0.5) ${masterPower}%, rgba(0,30,80,0.5) 100%)`,
              borderRadius: 11,
              outline: "none",
              cursor: "pointer",
              border: "1px solid rgba(0,120,255,0.25)",
              boxShadow: `inset 0 0 8px rgba(0,0,40,0.4), 0 0 6px ${sliderTrackColor.replace(/[\d.]+\)$/, "0.2)")}`,
            }}
          />
        </div>

        {/* Power level zone markers */}
        <div className="flex justify-between mt-2">
          {[
            { v: 0, label: "0" },
            { v: 20, label: "MIN" },
            { v: 40, label: "LOW" },
            { v: 60, label: "MOD" },
            { v: 80, label: "FULL" },
            { v: 100, label: "MAX" },
          ].map(({ v, label }) => (
            <div key={v} className="flex flex-col items-center gap-0.5">
              <div
                className="w-px h-2"
                style={{
                  background:
                    masterPower >= v
                      ? "rgba(0,200,255,0.5)"
                      : "rgba(0,60,150,0.3)",
                }}
              />
              <span
                className="text-[6px] font-mono"
                style={{
                  color:
                    masterPower >= v
                      ? "rgba(0,180,255,0.5)"
                      : "rgba(0,60,150,0.3)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <p
          className="text-[7px] font-mono tracking-widest mt-2 text-center"
          style={{ color: "rgba(0,120,200,0.4)" }}
        >
          PURE POWER ONLY — NOT VOLUME — DRAG TO CONTROL AMP POWER
        </p>
      </div>

      {/* PROTECTION: ALWAYS 100% — exact label per spec */}
      <div
        className="mx-3 mb-3 px-3 py-2 rounded-sm"
        style={{
          background: "rgba(0,180,60,0.08)",
          border: "1px solid rgba(0,220,80,0.4)",
          boxShadow: "0 0 10px rgba(0,255,80,0.1)",
        }}
        data-ocid="master_power.protection_status"
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: "rgba(0,255,100,0.9)",
              boxShadow: "0 0 8px rgba(0,255,100,0.7)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span
            className="text-[8px] font-mono tracking-[0.15em] font-bold uppercase"
            style={{ color: "rgba(0,255,100,0.9)" }}
          >
            PROTECTION: 100% — ZERO STRAIN / ZERO DISTORTION / ZERO CLIPPING
          </span>
        </div>
        <p
          className="text-[7px] font-mono tracking-widest ml-4"
          style={{ color: "rgba(0,200,80,0.5)" }}
        >
          ALWAYS AT FULL STRENGTH · INDEPENDENT OF POWER SLIDER POSITION
        </p>
      </div>

      {/* Virtual charger status */}
      <div
        className="px-3 py-2 flex flex-col gap-1"
        style={{
          background: "rgba(0,4,16,0.5)",
          borderTop: "1px solid rgba(0,60,150,0.15)",
        }}
      >
        {/* Charger row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: chargerActive
                  ? "rgba(255,220,0,0.9)"
                  : "rgba(100,80,0,0.4)",
                boxShadow: chargerActive
                  ? "0 0 6px rgba(255,200,0,0.7)"
                  : "none",
                animation: chargerActive
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
              }}
            />
            <span
              className="text-[7px] font-mono tracking-widest uppercase"
              style={{ color: "rgba(255,200,0,0.7)" }}
            >
              CHARGING: ACTIVE — 15,000×86
            </span>
          </div>
          <span
            className="text-[7px] font-mono tracking-widest font-bold"
            style={{ color: "rgba(0,255,120,0.7)" }}
          >
            BATTERY: {chargeLevel}%
          </span>
        </div>

        {/* Converter row */}
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(0,213,255,0.9)",
              boxShadow: "0 0 5px rgba(0,213,255,0.6)",
            }}
          />
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(0,180,255,0.65)" }}
          >
            CONVERTER: ACTIVE — 80,000,000× SIGNAL STRENGTH
          </span>
        </div>
      </div>
    </div>
  );
}
