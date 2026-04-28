/**
 * Engine1Panel — displays Engine 1 status.
 *
 * STRAIGHT ENGINE POWER — NO MILLIWATTS, NO HIDDEN CHAINS.
 * Stabilizer strength is always 80,000 — NEVER × 86.
 * Commander strength is always 80,000 — NEVER × 86.
 *
 * Channel indicators:
 *   GREEN  = safety switch OFF (full 80,000/channel)
 *   AMBER  = safety switch ON  (cut to 32,000/channel)
 */

import { useEngine1 } from "@/hooks/useEngine1";
import type { ChannelAssignment } from "@/hooks/useEngine1";
import { useEngine1Internals } from "@/hooks/useEngine1Internals";

// ─── Channel config ────────────────────────────────────────────────────────────

const ASSIGNMENT_LABELS: Record<ChannelAssignment, string> = {
  mainOutputBus: "MAIN BUS",
  batteryConverter: "BATTERIES",
  highAmp: "HIGH AMP",
  newProtection: "NEW PROT",
  fuses: "FUSES",
  bassAmp: "BASS AMP",
  mainVirtualAmp: "MAIN VAMP",
  atmosmasphere: "ATMOS",
  srsXm: "SRS+XM",
  smartChipBus: "CHIP BUS",
  reserved: "RESERVED",
};

const ASSIGNMENT_COLOR: Record<ChannelAssignment, string> = {
  mainOutputBus: "rgba(0,255,120,0.9)",
  batteryConverter: "rgba(0,255,180,0.9)",
  highAmp: "rgba(153,69,255,0.9)",
  newProtection: "rgba(255,80,80,0.9)",
  fuses: "rgba(255,180,0,0.9)",
  bassAmp: "rgba(100,80,255,0.9)",
  mainVirtualAmp: "rgba(0,213,255,0.9)",
  atmosmasphere: "rgba(0,200,160,0.9)",
  srsXm: "rgba(200,100,255,0.9)",
  smartChipBus: "rgba(0,180,255,0.9)",
  reserved: "rgba(60,90,130,0.5)",
};

function formatPower(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Fuse dot ─────────────────────────────────────────────────────────────────

function FuseDot({ index, active }: { index: number; active: boolean }) {
  return (
    <div
      key={`fuse-${index}`}
      className="rounded-sm flex items-center justify-center"
      title={`Fuse ${index + 1} — 2,667W`}
      style={{
        width: 18,
        height: 16,
        background: "rgba(255,160,0,0.08)",
        border: `1px solid ${active ? "rgba(255,160,0,0.5)" : "rgba(255,160,0,0.2)"}`,
      }}
    >
      <div
        className="w-1 h-1 rounded-full"
        style={{
          background: active ? "rgba(255,180,0,0.95)" : "rgba(255,180,0,0.3)",
          boxShadow: active ? "0 0 3px rgba(255,180,0,0.8)" : "none",
        }}
      />
    </div>
  );
}

// ─── Battery indicator ────────────────────────────────────────────────────────

function BatteryBar({ live, pct }: { live: boolean; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative flex-1 h-4 rounded-sm overflow-hidden border"
        style={{
          background: "rgba(0,30,20,0.5)",
          borderColor: live ? "rgba(0,255,180,0.4)" : "rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: live
              ? "linear-gradient(to right, rgba(0,200,120,0.7), rgba(0,255,180,0.9))"
              : "rgba(60,90,130,0.3)",
            boxShadow: live ? "0 0 6px rgba(0,255,180,0.5)" : "none",
          }}
        />
        <span
          className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold tracking-widest"
          style={{
            color: live ? "rgba(0,255,180,0.95)" : "rgba(255,255,255,0.3)",
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="w-1.5 h-3 rounded-sm shrink-0"
        style={{
          background: live ? "rgba(0,255,180,0.7)" : "rgba(60,90,130,0.3)",
          boxShadow: live ? "0 0 4px rgba(0,255,180,0.6)" : "none",
        }}
      />
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function Engine1Panel() {
  const {
    channels,
    safetySwitch,
    toggleSafetySwitch,
    fuses,
    batteries,
    virtualAmpPowerSupply: vps,
    hiddenComponentCount,
    engineStrength,
  } = useEngine1();

  // Real ENGINE INTERNALS indicator — reads cached module-level state
  // Pass null/null since chain is already built; hook returns the cached _engineReady flag
  const { internalsReady, componentCount } = useEngine1Internals(null, null);

  const chPower = safetySwitch ? 32_000 : 80_000;

  // Indicator color based on safety switch:
  // safety OFF → green (full power), safety ON → amber (cut power)
  const indicatorColor = safetySwitch
    ? "rgba(255,160,0,0.9)"
    : "rgba(0,255,120,0.9)";

  return (
    <div className="mx-4 my-3" data-ocid="engine1.panel">
      <div
        className="rounded-sm overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,6,22,0.98), rgba(0,10,32,0.96))",
          border: "1px solid rgba(0,213,255,0.35)",
          boxShadow: "0 0 18px rgba(0,130,255,0.08)",
        }}
      >
        {/* ── ENGINE 1 HEADER ── */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            background: "rgba(0,213,255,0.05)",
            borderBottom: "1px solid rgba(0,130,255,0.18)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse-glow"
              style={{
                background: indicatorColor,
                boxShadow: `0 0 6px ${indicatorColor}`,
              }}
            />
            <span
              className="text-[10px] font-mono tracking-[0.25em] uppercase font-bold"
              style={{ color: "rgba(0,213,255,0.9)" }}
            >
              ENGINE 1
            </span>
            <span
              className="text-[7px] font-mono tracking-widest ml-1"
              style={{ color: "rgba(0,130,255,0.45)" }}
            >
              STRAIGHT ENGINE POWER — NO MILLIWATTS
            </span>
          </div>
          <div
            className="px-2 py-0.5 rounded-sm text-[7px] font-mono tracking-widest uppercase"
            style={{
              background: "rgba(0,255,120,0.08)",
              border: "1px solid rgba(0,255,120,0.3)",
              color: "rgba(0,255,120,0.85)",
            }}
          >
            ACTIVE
          </div>
        </div>

        {/* Power flow — no milliwatts */}
        <div
          className="mx-3 mt-2 px-2 py-1.5 rounded-sm"
          style={{
            background: "rgba(0,213,255,0.04)",
            border: "1px solid rgba(0,213,255,0.15)",
          }}
        >
          <p
            className="text-[7px] font-mono tracking-[0.18em] uppercase"
            style={{ color: "rgba(0,213,255,0.6)" }}
          >
            ENGINE 1 → 12 CHANNELS → FEATURES
          </p>
          <p
            className="text-[7px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(0,180,255,0.4)" }}
          >
            12 Channels × {engineStrength.toLocaleString()} = 960,000 total
            virtual power
          </p>
        </div>

        {/* Safety Switch */}
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(255,180,0,0.8)" }}
            >
              SAFETY SWITCH — CUT 60% POWER
            </span>
            <span
              className="text-[7px] font-mono tracking-widest"
              style={{
                color: safetySwitch
                  ? "rgba(255,80,80,0.85)"
                  : "rgba(0,255,120,0.75)",
              }}
            >
              {safetySwitch
                ? `60% CUT — ${formatPower(32_000)}/ch`
                : `FULL — ${formatPower(80_000)}/ch`}
            </span>
          </div>
          <button
            type="button"
            data-ocid="engine1.safety_switch"
            onClick={toggleSafetySwitch}
            className="w-full py-2 rounded-sm font-mono text-[9px] tracking-[0.2em] uppercase transition-all duration-200 active:scale-95"
            style={{
              background: safetySwitch
                ? "rgba(255,80,80,0.12)"
                : "rgba(0,255,120,0.08)",
              border: safetySwitch
                ? "2px solid rgba(255,80,80,0.5)"
                : "2px solid rgba(0,255,120,0.4)",
              color: safetySwitch
                ? "rgba(255,80,80,0.9)"
                : "rgba(0,255,120,0.85)",
              boxShadow: safetySwitch
                ? "0 0 12px rgba(255,80,80,0.2)"
                : "0 0 12px rgba(0,255,120,0.15)",
            }}
            aria-pressed={safetySwitch}
          >
            {safetySwitch
              ? `⚠ SAFETY ON — ALL CHANNELS: ${formatPower(32_000)} (60% CUT)`
              : `✓ SAFETY SWITCH — OFF | ALL CHANNELS: ${formatPower(80_000)}`}
          </button>
        </div>

        {/* 12 Channels grid */}
        <div className="px-3 pb-2">
          <p
            className="text-[7px] font-mono tracking-[0.2em] uppercase mb-1.5 mt-1"
            style={{ color: "rgba(0,130,255,0.5)" }}
          >
            12 CHANNELS — EACH AT {formatPower(chPower)} VIRTUAL POWER
            {safetySwitch && " (SAFETY 60% CUT ACTIVE)"}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {channels.map((ch) => {
              const color = ASSIGNMENT_COLOR[ch.assignment];
              const isFree = ch.assignment === "reserved";
              // Use safety-aware indicator: green = full, amber = cut
              const dotColor = isFree
                ? "rgba(60,90,130,0.3)"
                : safetySwitch
                  ? "rgba(255,160,0,0.9)"
                  : "rgba(0,255,120,0.9)";
              return (
                <div
                  key={ch.id}
                  data-ocid={`engine1.channel.${ch.id}`}
                  className="flex flex-col gap-0.5 px-1.5 py-1.5 rounded-sm"
                  style={{
                    background: isFree
                      ? "rgba(0,5,18,0.4)"
                      : "rgba(0,10,30,0.6)",
                    border: `1px solid ${isFree ? "rgba(0,40,100,0.18)" : color.replace(/[\d.]+\)$/, "0.25)")}`,
                  }}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isFree ? "animate-pulse-glow" : ""}`}
                      style={{
                        background: dotColor,
                        boxShadow: isFree ? "none" : `0 0 4px ${dotColor}`,
                      }}
                    />
                    <span
                      className="text-[7px] font-mono tracking-widest font-bold"
                      style={{ color: "rgba(180,200,240,0.7)" }}
                    >
                      CH{ch.id}
                    </span>
                  </div>
                  <span
                    className="text-[6px] font-mono tracking-wide truncate"
                    style={{
                      color: isFree
                        ? "rgba(60,90,130,0.4)"
                        : color.replace(/[\d.]+\)$/, "0.75)"),
                    }}
                  >
                    {ASSIGNMENT_LABELS[ch.assignment]}
                  </span>
                  <span
                    className="text-[8px] font-mono tabular-nums font-bold"
                    style={{
                      color: isFree
                        ? "rgba(60,90,130,0.3)"
                        : safetySwitch
                          ? "rgba(255,160,0,0.85)"
                          : "rgba(0,213,255,0.85)",
                    }}
                  >
                    {isFree ? "—" : formatPower(ch.output)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Fuses — Channel 1 ── */}
        <div
          className="mx-3 mb-2 p-2 rounded-sm"
          style={{
            background: "rgba(255,180,0,0.04)",
            border: "1px solid rgba(255,180,0,0.2)",
          }}
          data-ocid="engine1.fuses_panel"
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(255,180,0,0.85)" }}
            >
              FUSES — CH1 | 80,000 ÷ 30 = 2,667W EACH
            </span>
            <span
              className="text-[7px] font-mono font-bold"
              style={{
                color: fuses.allLit
                  ? "rgba(0,255,120,0.75)"
                  : "rgba(255,255,255,0.3)",
              }}
            >
              {fuses.allLit ? "ALL LIT ✓" : "STANDBY"}
            </span>
          </div>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
          >
            {Array.from({ length: fuses.count }, (_, i) => i + 1).map(
              (fuseNum) => (
                <FuseDot
                  key={`fuse-${fuseNum}`}
                  index={fuseNum - 1}
                  active={fuses.allLit}
                />
              ),
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span
              className="text-[6px] font-mono tracking-widest"
              style={{ color: "rgba(255,140,0,0.55)" }}
            >
              {fuses.powerEach.toLocaleString()} × {fuses.count} ={" "}
              {fuses.totalPower.toLocaleString()} TOTAL
            </span>
            <span
              className="text-[6px] font-mono tracking-widest"
              style={{ color: "rgba(255,180,0,0.4)" }}
            >
              CHANNEL 1
            </span>
          </div>
        </div>

        {/* ── Batteries — Channel 2 — Always Full ── */}
        <div
          className="mx-3 mb-2 p-2 rounded-sm"
          style={{
            background: "rgba(0,255,180,0.03)",
            border: "1px solid rgba(0,255,180,0.2)",
          }}
          data-ocid="engine1.battery_panel"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(0,255,180,0.8)" }}
            >
              BATTERIES — CH2 | ALWAYS 100%
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-1.5 h-1.5 rounded-full ${batteries.live ? "animate-pulse-glow" : ""}`}
                style={{
                  background: batteries.live
                    ? "rgba(0,255,180,0.9)"
                    : "rgba(60,90,130,0.4)",
                  boxShadow: batteries.live
                    ? "0 0 5px rgba(0,255,180,0.7)"
                    : "none",
                }}
              />
              <span
                className="text-[7px] font-mono font-bold"
                style={{ color: "rgba(0,255,180,0.85)" }}
              >
                {batteries.live ? "LIVE" : "OFF"}
              </span>
            </div>
          </div>
          <BatteryBar live={batteries.live} pct={batteries.chargePercent} />
          <p
            className="text-[6.5px] font-mono tracking-wide mt-1.5"
            style={{ color: "rgba(0,200,150,0.5)" }}
          >
            ALWAYS 100% — CHANNEL 2 SELF-SUSTAINING LOOP
          </p>
          <p
            className="text-[6px] font-mono tracking-widest mt-0.5"
            style={{ color: "rgba(0,180,130,0.35)" }}
          >
            ENGINE 1 → CH2 → BATTERIES → ALWAYS FULL
          </p>
        </div>

        {/* ── High Amp Channel 3 ── */}
        <div
          className="mx-3 mb-2 p-2 rounded-sm"
          style={{
            background: "rgba(153,69,255,0.04)",
            border: "1px solid rgba(153,69,255,0.25)",
          }}
          data-ocid="engine1.high_amp_channel"
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(153,69,255,0.85)" }}
            >
              HIGH AMP — CH3 DEDICATED
            </span>
            <span
              className="text-[8px] font-mono tabular-nums font-bold"
              style={{
                color: safetySwitch
                  ? "rgba(255,160,0,0.85)"
                  : "rgba(153,69,255,0.9)",
              }}
            >
              {formatPower(chPower)}W
            </span>
          </div>
          <p
            className="text-[6.5px] font-mono tracking-widest"
            style={{ color: "rgba(153,69,255,0.45)" }}
          >
            CH3 → BATTERIES → AMP + CH3 → POWER SUPPLY → 4 OUTPUTS (20,000 each)
          </p>
        </div>

        {/* ── Main Virtual Amp Power Supply — Channel 5 ── */}
        <div
          className="mx-3 mb-2 p-2 rounded-sm"
          style={{
            background: "rgba(0,213,255,0.03)",
            border: "1px solid rgba(0,213,255,0.2)",
          }}
          data-ocid="engine1.vamp_power_supply"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(0,213,255,0.8)" }}
            >
              MAIN VIRTUAL AMP POWER SUPPLY — CH5
            </span>
            <span
              className="text-[7px] font-mono"
              style={{ color: "rgba(0,180,255,0.5)" }}
            >
              {vps.sourceOutput.toLocaleString()} total
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(
              [
                {
                  label: "TWEETERS",
                  key: "tweeters" as const,
                  color: "rgba(0,255,120,0.85)",
                },
                {
                  label: "MIDS",
                  key: "mids" as const,
                  color: "rgba(0,213,255,0.85)",
                },
                {
                  label: "HIGHS",
                  key: "highs" as const,
                  color: "rgba(0,200,255,0.85)",
                },
                {
                  label: "BASS",
                  key: "bass" as const,
                  color: "rgba(255,180,0,0.85)",
                },
              ] as const
            ).map(({ label, key, color }) => {
              const out = vps.outputs[key];
              return (
                <div
                  key={key}
                  className="flex flex-col gap-0.5 px-2 py-1.5 rounded-sm"
                  style={{
                    background: "rgba(0,10,30,0.5)",
                    border: `1px solid ${color.replace(/[\d.]+\)$/, "0.2)")}`,
                  }}
                >
                  <span
                    className="text-[6.5px] font-mono tracking-wide uppercase"
                    style={{ color: color.replace(/[\d.]+\)$/, "0.6)") }}
                  >
                    {label}
                  </span>
                  <span
                    className="text-[9px] font-mono tabular-nums font-bold"
                    style={{ color }}
                  >
                    20,000W
                  </span>
                  <span
                    className="text-[6px] font-mono tracking-widest"
                    style={{ color: color.replace(/[\d.]+\)$/, "0.4)") }}
                  >
                    {out.real.toLocaleString()} actual
                  </span>
                </div>
              );
            })}
          </div>
          <p
            className="text-[6px] font-mono tracking-widest mt-1.5"
            style={{ color: "rgba(0,130,180,0.38)" }}
          >
            {vps.sourceOutput.toLocaleString()} ÷ 4 = 20,000 each — adds back to{" "}
            {vps.totalPowerSupply.toLocaleString()}
          </p>
        </div>

        {/* ── Commander & Stabilizer — 80,000 only, no × 86 ── */}
        <div
          className="mx-3 mb-2 p-2 rounded-sm"
          style={{
            background: "rgba(153,69,255,0.04)",
            border: "1px solid rgba(153,69,255,0.25)",
          }}
          data-ocid="engine1.commander_panel"
        >
          <p
            className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold mb-1.5"
            style={{ color: "rgba(153,69,255,0.8)" }}
          >
            COMMANDER STATUS
          </p>
          {[
            {
              label: "COMMANDER STRENGTH",
              value: "80,000",
              color: "rgba(0,213,255,0.85)",
            },
            {
              label: "STATUS",
              value: "STABILIZES — NEVER PULLS BACK",
              color: "rgba(0,255,120,0.9)",
            },
            {
              label: "EQ PATH",
              value: "OPEN — CMD PROTECTED",
              color: "rgba(153,69,255,0.85)",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-start gap-2 mb-0.5">
              <span
                className="text-[7px] font-mono tracking-widest shrink-0 w-32"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {label}:
              </span>
              <span
                className="text-[8px] font-mono font-bold tracking-wider"
                style={{ color }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Hidden components count — REAL indicator from useEngine1Internals */}
        <div
          className="mx-3 mb-2 px-2 py-1.5 rounded-sm flex items-center justify-between"
          style={{
            background: "rgba(100,0,200,0.06)",
            border: "1px solid rgba(100,0,200,0.2)",
          }}
        >
          <span
            className="text-[7px] font-mono tracking-[0.18em] uppercase"
            style={{ color: "rgba(153,69,255,0.65)" }}
          >
            HIDDEN COMPONENTS INSIDE ENGINE
          </span>
          <span
            className="text-[8px] font-mono font-bold"
            style={{ color: "rgba(153,69,255,0.9)" }}
          >
            {hiddenComponentCount} COMPONENTS: ACTIVE
          </span>
        </div>

        {/* ENGINE INTERNALS: 100 COMPONENTS ACTIVE — real Web Audio graph status */}
        <div
          className="mx-3 mb-3 px-2 py-2 rounded-sm flex items-center justify-between"
          data-ocid="engine1.internals_status"
          style={{
            background: internalsReady
              ? "rgba(0,255,120,0.05)"
              : "rgba(255,80,80,0.05)",
            border: `1px solid ${internalsReady ? "rgba(0,255,120,0.3)" : "rgba(255,80,80,0.25)"}`,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${internalsReady ? "animate-pulse-glow" : ""}`}
              style={{
                background: internalsReady
                  ? "rgba(0,255,120,0.9)"
                  : "rgba(255,80,80,0.6)",
                boxShadow: internalsReady
                  ? "0 0 6px rgba(0,255,120,0.7)"
                  : "none",
              }}
            />
            <span
              className="text-[8px] font-mono tracking-[0.18em] uppercase font-bold"
              style={{
                color: internalsReady
                  ? "rgba(0,255,120,0.9)"
                  : "rgba(255,80,80,0.75)",
              }}
            >
              ENGINE INTERNALS
            </span>
          </div>
          <span
            className="text-[8px] font-mono font-bold tabular-nums"
            style={{
              color: internalsReady
                ? "rgba(0,255,120,0.9)"
                : "rgba(255,120,120,0.7)",
            }}
          >
            {internalsReady
              ? `${componentCount} COMPONENTS ACTIVE`
              : "STANDBY — PLAY TO ACTIVATE"}
          </span>
        </div>
      </div>
    </div>
  );
}
