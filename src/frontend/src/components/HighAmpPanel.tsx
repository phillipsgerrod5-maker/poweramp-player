import type { HighAmpState } from "@/types/player";

// ─── Output Layer Row ─────────────────────────────────────────────────────────

function OutputLayer({
  label,
  watts,
  color,
  active,
}: {
  label: string;
  watts: number;
  color: string;
  active: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-2 py-1.5 rounded-sm"
      style={{
        background: active
          ? color.replace(/[\d.]+\)$/, "0.06)")
          : "rgba(0,5,18,0.4)",
        border: `1px solid ${active ? color.replace(/[\d.]+\)$/, "0.3)") : "rgba(255,255,255,0.07)"}`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${active ? "animate-pulse-glow" : ""}`}
          style={{
            background: active ? color : "rgba(255,255,255,0.15)",
            boxShadow: active ? `0 0 5px ${color}` : "none",
          }}
        />
        <span
          className="text-[8px] font-mono tracking-widest uppercase font-bold"
          style={{ color: active ? color : "rgba(255,255,255,0.3)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-[9px] font-mono tabular-nums font-bold"
        style={{ color: active ? color : "rgba(255,255,255,0.2)" }}
      >
        {watts.toLocaleString()}W
      </span>
    </div>
  );
}

// ─── Feature Badge ────────────────────────────────────────────────────────────

function FeatureBadge({
  label,
  active,
  alwaysOn,
  ocid,
}: {
  label: string;
  active: boolean;
  alwaysOn?: boolean;
  ocid: string;
}) {
  const color = alwaysOn
    ? "rgba(0,255,180,0.9)"
    : active
      ? "rgba(0,213,255,0.9)"
      : "rgba(255,255,255,0.2)";

  return (
    <div
      className="flex items-center justify-between px-2 py-1.5 rounded-sm"
      data-ocid={ocid}
      style={{
        background: alwaysOn
          ? "rgba(0,255,180,0.05)"
          : active
            ? "rgba(0,213,255,0.05)"
            : "rgba(255,255,255,0.02)",
        border: `1px solid ${color.replace(/[\d.]+\)$/, "0.3)")}`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${active || alwaysOn ? "animate-pulse-glow" : ""}`}
          style={{
            background: color,
            boxShadow: active || alwaysOn ? `0 0 6px ${color}` : "none",
          }}
        />
        <span
          className="text-[8px] font-mono tracking-widest uppercase font-bold"
          style={{ color }}
        >
          {label}
        </span>
      </div>
      {alwaysOn ? (
        <span
          className="text-[6px] font-mono tracking-widest px-1.5 py-0.5 rounded-sm"
          style={{
            background: "rgba(0,255,180,0.08)",
            border: "1px solid rgba(0,255,180,0.3)",
            color: "rgba(0,255,180,0.9)",
          }}
        >
          ALWAYS ON
        </span>
      ) : (
        <span
          className="text-[7px] font-mono tracking-widest font-bold"
          style={{ color }}
        >
          {active ? "ON" : "OFF"}
        </span>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HighAmpPanelProps {
  state: HighAmpState;
  commanderStrength: string;
  isPlaying: boolean;
  srsEnabled?: boolean;
  oldProtSlider1?: number;
  trebleEq?: number;
  atmosEnabled?: boolean;
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function HighAmpPanel({
  state,
  commanderStrength,
  isPlaying,
  srsEnabled = false,
  oldProtSlider1 = 80,
  trebleEq = 0,
  atmosEnabled = false,
}: HighAmpPanelProps) {
  const active = isPlaying && state.active;

  const highAmpActive = active && srsEnabled;
  const smoothTweetersActive = srsEnabled && trebleEq > 0;
  const zeroBgNoiseActive = isPlaying && oldProtSlider1 > 50;
  const instrumentsClassActive = oldProtSlider1 > 60;

  const OUTPUT_LAYERS = [
    { label: "BASS", watts: 20000, color: "rgba(255,180,0,0.9)" },
    { label: "MIDS", watts: 20000, color: "rgba(0,213,255,0.9)" },
    { label: "HIGHS", watts: 20000, color: "rgba(0,200,255,0.85)" },
    { label: "TWEETERS", watts: 20000, color: "rgba(153,69,255,0.85)" },
  ];

  return (
    <div
      className="mx-4 my-3 rounded-sm overflow-hidden"
      data-ocid="high_amp.panel"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,8,28,0.97), rgba(0,15,45,0.96))",
        border: active
          ? "1px solid rgba(0,200,255,0.5)"
          : "1px solid rgba(0,100,200,0.2)",
        boxShadow: active ? "0 0 18px rgba(0,200,255,0.12)" : "none",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: "rgba(0,5,20,0.6)",
          borderBottom: "1px solid rgba(0,150,255,0.15)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: active ? "rgba(0,200,255,0.9)" : "rgba(0,70,180,0.4)",
              boxShadow: active ? "0 0 8px rgba(0,200,255,0.8)" : "none",
              animation: active ? "pulse 1.8s ease-in-out infinite" : "none",
            }}
          />
          <div>
            <p
              className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase leading-none"
              style={{
                color: active ? "rgba(0,200,255,0.95)" : "rgba(0,100,200,0.5)",
              }}
            >
              HIGH AMP
            </p>
            <p
              className="text-[6.5px] font-mono tracking-widest mt-0.5"
              style={{ color: "rgba(0,150,255,0.5)" }}
            >
              CHANNEL 3 — 80,000W DEDICATED
            </p>
          </div>
        </div>
        <span
          className="text-[8px] font-mono tracking-widest font-bold"
          style={{
            color: active ? "rgba(0,255,120,0.8)" : "rgba(0,100,150,0.4)",
          }}
        >
          {state.power}% PWR
        </span>
      </div>

      {/* Power Chain Display */}
      <div
        className="px-3 py-1.5"
        style={{ borderBottom: "1px solid rgba(0,80,180,0.15)" }}
      >
        <p
          className="text-[7px] font-mono tracking-widest uppercase"
          style={{ color: "rgba(0,150,255,0.6)" }}
        >
          CH 3 → BATTERIES → AMP · CH 3 → POWER SUPPLY → 4 OUTPUTS
        </p>
      </div>

      {/* Signal level bar */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(0,150,255,0.5)" }}
          >
            HIGHS SIGNAL
          </span>
          <span
            className="text-[7px] font-mono tracking-widest ml-auto"
            style={{ color: "rgba(0,200,255,0.7)" }}
          >
            {(state.channelStrength * 100).toFixed(0)}%
          </span>
        </div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 4, background: "rgba(0,30,80,0.5)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${Math.min(100, state.channelStrength * 100)}%`,
              background:
                "linear-gradient(to right, rgba(0,150,255,0.8), rgba(0,220,255,0.95))",
              boxShadow: "0 0 6px rgba(0,200,255,0.4)",
            }}
          />
        </div>
      </div>

      {/* ── BASS BLOCKER SECTION ── */}
      <div
        className="mx-3 mb-2 p-2.5 rounded-sm"
        data-ocid="high_amp.bass_blocker"
        style={{
          background: "rgba(255,80,80,0.04)",
          border: "2px solid rgba(255,80,80,0.5)",
          boxShadow: "0 0 10px rgba(255,60,60,0.1)",
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse-glow"
              style={{
                background: "rgba(255,80,80,0.9)",
                boxShadow: "0 0 6px rgba(255,80,80,0.7)",
              }}
            />
            <span
              className="text-[9px] font-mono tracking-[0.18em] uppercase font-bold"
              style={{ color: "rgba(255,100,100,0.95)" }}
            >
              BASS BLOCKER — ACTIVE
            </span>
          </div>
          <span
            className="text-[6px] font-mono tracking-widest px-1.5 py-0.5 rounded-sm"
            style={{
              background: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.4)",
              color: "rgba(255,100,100,0.9)",
            }}
          >
            CANNOT DISABLE
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[6px] font-mono tracking-widest"
              style={{ color: "rgba(255,80,80,0.7)" }}
            >
              🚫 BLOCKS:
            </span>
            <span
              className="text-[7px] font-mono tracking-widest font-bold"
              style={{ color: "rgba(255,120,120,0.85)" }}
            >
              Heavy bass notes below 150Hz
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-[6px] font-mono tracking-widest"
              style={{ color: "rgba(0,255,120,0.7)" }}
            >
              ✓ ALLOWS:
            </span>
            <span
              className="text-[7px] font-mono tracking-widest font-bold"
              style={{ color: "rgba(0,255,120,0.85)" }}
            >
              Mid bass 150–300Hz — gives highs and mids their body
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 OUTPUT LAYERS SECTION ── */}
      <div className="mx-3 mb-2" data-ocid="high_amp.output_layers">
        <p
          className="text-[7px] font-mono tracking-[0.2em] uppercase mb-1.5"
          style={{ color: "rgba(0,150,255,0.5)" }}
        >
          4 OUTPUT LAYERS — 20,000W EACH
        </p>
        <div className="flex flex-col gap-1">
          {OUTPUT_LAYERS.map((layer) => (
            <OutputLayer
              key={layer.label}
              label={layer.label}
              watts={layer.watts}
              color={layer.color}
              active={active}
            />
          ))}
        </div>
      </div>

      {/* ── NO PULL BACK SECTION ── */}
      <div
        className="mx-3 mb-2 px-2.5 py-2 rounded-sm"
        style={{
          background: "rgba(0,255,120,0.04)",
          border: "1px solid rgba(0,255,120,0.3)",
        }}
      >
        <p
          className="text-[8px] font-mono tracking-[0.15em] uppercase font-bold"
          style={{ color: "rgba(0,255,120,0.9)" }}
        >
          PROTECTION STABILIZES AT TOP — NEVER PULLS BACK
        </p>
        <p
          className="text-[6.5px] font-mono tracking-widest mt-0.5"
          style={{ color: "rgba(0,200,150,0.55)" }}
        >
          Signal goes up clean · Held there at full strength · Ultra Crystal all
          the way
        </p>
      </div>

      {/* ── HIGH AMP FEATURES (NO BASS) ── */}
      <div
        className="px-3 py-2"
        style={{ borderTop: "1px solid rgba(0,80,180,0.12)" }}
      >
        <p
          className="text-[7px] font-mono tracking-[0.2em] uppercase mb-2"
          style={{ color: "rgba(0,150,255,0.5)" }}
        >
          HIGH AMP FEATURES — NO BASS
        </p>
        <div className="flex flex-col gap-1">
          <FeatureBadge
            label="SRS HD 9.0"
            active={srsEnabled}
            ocid="high_amp.srs_toggle"
          />
          <FeatureBadge
            label="SMOOTH TWEETERS"
            active={smoothTweetersActive}
            ocid="high_amp.smooth_tweeters"
          />
          <FeatureBadge
            label="AUTOMASPHERS"
            active={atmosEnabled}
            ocid="high_amp.automasphers_toggle"
          />
          <FeatureBadge
            label="XM PROCESSOR"
            active={isPlaying}
            ocid="high_amp.xm_link"
          />
          <FeatureBadge
            label="ULTRA CRYSTAL CLEAR"
            active={isPlaying}
            alwaysOn={true}
            ocid="high_amp.ultra_crystal"
          />
        </div>
      </div>

      {/* Clarity Indicators */}
      <div
        className="px-3 py-2"
        style={{ borderTop: "1px solid rgba(0,80,180,0.12)" }}
      >
        <p
          className="text-[7px] font-mono tracking-[0.2em] uppercase mb-2"
          style={{ color: "rgba(0,150,255,0.45)" }}
        >
          CLARITY INDICATORS — REAL SIGNAL STATE
        </p>
        <div className="grid grid-cols-2 gap-1">
          {[
            {
              label: "HIGH AMP ACTIVE",
              active: highAmpActive,
              color: "rgba(0,200,255,0.9)",
              ocid: "high_amp.active_indicator",
            },
            {
              label: "SMOOTH TWEETERS",
              active: smoothTweetersActive,
              color: "rgba(0,255,180,0.9)",
              ocid: "high_amp.tweeter_indicator",
            },
            {
              label: "ZERO BG NOISE",
              active: zeroBgNoiseActive,
              color: "rgba(0,213,255,0.9)",
              ocid: "high_amp.noise_indicator",
            },
            {
              label: "INSTRUMENTS A+",
              active: instrumentsClassActive,
              color: "rgba(153,69,255,0.9)",
              ocid: "high_amp.instruments_indicator",
            },
          ].map(({ label, active: ind, color, ocid }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
              data-ocid={ocid}
              style={{
                background: ind
                  ? color.replace(/[\d.]+\)$/, "0.05)")
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${ind ? color.replace(/[\d.]+\)$/, "0.25)") : "rgba(255,255,255,0.07)"}`,
              }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${ind ? "animate-pulse-glow" : ""}`}
                style={{
                  background: ind ? color : "rgba(255,255,255,0.15)",
                  boxShadow: ind ? `0 0 4px ${color}` : "none",
                }}
              />
              <span
                className="text-[6px] font-mono tracking-widest uppercase"
                style={{ color: ind ? color : "rgba(255,255,255,0.25)" }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Commander */}
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,80,180,0.12)" }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(255,100,200,0.9)",
              boxShadow: "0 0 5px rgba(255,100,200,0.7)",
            }}
          />
          <span
            className="text-[7px] font-mono tracking-widest uppercase"
            style={{ color: "rgba(255,100,200,0.7)" }}
          >
            CMDR: {commanderStrength}
          </span>
        </div>
        <span
          className="text-[7px] font-mono tracking-widest"
          style={{ color: "rgba(0,200,255,0.5)" }}
        >
          ENGINE 1 — CH3 POWERED
        </span>
      </div>

      {/* 4 gauge wiring footer */}
      <div
        className="px-3 py-1.5 flex items-center gap-2"
        style={{
          background: "rgba(0,4,15,0.4)",
          borderTop: "1px solid rgba(0,60,150,0.15)",
        }}
      >
        {["PWR CHAIN", "BASS BLOCKER", "COMMANDER", "4 OUTPUTS"].map(
          (label, i) => (
            <div key={label} className="flex items-center gap-1">
              {i > 0 && (
                <div
                  className="w-4 h-px"
                  style={{ background: "rgba(0,200,255,0.3)" }}
                />
              )}
              <span
                className="text-[6px] font-mono tracking-widest uppercase"
                style={{ color: "rgba(0,150,255,0.45)" }}
              >
                {label}
              </span>
            </div>
          ),
        )}
        <span
          className="text-[6px] font-mono tracking-widest ml-auto"
          style={{ color: "rgba(0,130,255,0.3)" }}
        >
          4 GAUGE DIRECT WIRED
        </span>
      </div>
    </div>
  );
}
