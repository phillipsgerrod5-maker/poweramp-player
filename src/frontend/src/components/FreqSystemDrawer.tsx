import { Layers, Music, Radio, X, Zap } from "lucide-react";
import { useState } from "react";

// ─── Bass frequency profiles ──────────────────────────────────────────────────
const BASS_PROFILES = [
  { id: 1, range: "14–20Hz", char: "Pure sub — body hit, felt not heard" },
  { id: 2, range: "20–30Hz", char: "Deep sub — Cheater Beater zone" },
  { id: 3, range: "30–40Hz", char: "Sub boom — chest hit, physical impact" },
  { id: 4, range: "40–50Hz", char: "Deep bass — kick drum weight" },
  { id: 5, range: "50–60Hz", char: "Full bass — warm, thick, punchy" },
  { id: 6, range: "60–80Hz", char: "Mid-low bass — bass guitar body" },
  { id: 7, range: "80–100Hz", char: "Upper bass — punch and attack" },
  { id: 8, range: "100–120Hz", char: "Bass presence — note definition" },
  { id: 9, range: "120–150Hz", char: "Bass clarity — instrument separation" },
  { id: 10, range: "14–50Hz", char: "Full deep sweep — all bass layers" },
] as const;

const HIGH_PROFILES = [
  { id: 1, range: "8–10kHz", char: "Air and shimmer — cymbals, top vocals" },
  { id: 2, range: "10–12kHz", char: "Clarity — strings, upper harmonics" },
  { id: 3, range: "12–14kHz", char: "Brilliance — acoustic instruments" },
  { id: 4, range: "14–16kHz", char: "Extended highs — sparkle, studio" },
  { id: 5, range: "16–18kHz", char: "Ultra high — premium speaker territory" },
  { id: 6, range: "18–20kHz", char: "Ceiling highs — edge of hearing" },
  { id: 7, range: "4–8kHz", char: "Presence — vocals cut through" },
  { id: 8, range: "6–12kHz", char: "Smooth highs — tweeters, silky clean" },
  { id: 9, range: "8–16kHz", char: "Full high sweep — shimmer to ceiling" },
  { id: 10, range: "4–20kHz", char: "Complete range — rich high content" },
] as const;

type TabId = "epicenter" | "freq-matching" | "multi-freq" | "bass-switching";

interface FreqSystemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  activeBassProfile?: number;
  activeHighProfile?: number;
  bassFreqs?: number[];
  midFreqs?: number[];
  highFreqs?: number[];
  currentBassNote?: number;
}

const TABS: { id: TabId; label: string; icon: typeof Zap }[] = [
  { id: "epicenter", label: "EPICENTER", icon: Zap },
  { id: "freq-matching", label: "FREQ MATCH", icon: Radio },
  { id: "multi-freq", label: "MULTI-FREQ", icon: Layers },
  { id: "bass-switching", label: "BASS SWITCH", icon: Music },
];

export function FreqSystemDrawer({
  isOpen,
  onClose,
  isPlaying,
  activeBassProfile = 4,
  activeHighProfile = 7,
  bassFreqs = [28, 40, 55],
  midFreqs = [320, 800, 2100],
  highFreqs = [5200, 9400, 14000],
  currentBassNote = 40,
}: FreqSystemDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("epicenter");
  const [manualOverride, setManualOverride] = useState(false);
  const [lockedBassProfile, setLockedBassProfile] = useState(4);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,4,16,0.97)" }}
      data-ocid="freq_system.dialog"
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(0,8,30,0.98)",
          borderBottom: "1px solid rgba(0,130,255,0.25)",
        }}
      >
        <div>
          <p
            className="text-[8px] font-mono tracking-[0.3em] uppercase"
            style={{ color: "rgba(0,130,255,0.5)" }}
          >
            POWERAMP PLAYER
          </p>
          <h2
            className="text-sm font-display font-bold tracking-[0.15em] uppercase"
            style={{ color: "rgba(0,213,255,0.95)" }}
          >
            FREQUENCY SYSTEM
          </h2>
        </div>
        <button
          type="button"
          data-ocid="freq_system.close_button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90"
          style={{
            border: "1px solid rgba(0,130,255,0.3)",
            color: "rgba(0,180,255,0.7)",
          }}
          aria-label="Close frequency system"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="shrink-0 flex overflow-x-auto"
        style={{
          borderBottom: "1px solid rgba(0,80,200,0.2)",
          background: "rgba(0,5,18,0.98)",
          scrollbarWidth: "none",
        }}
      >
        {TABS.map(({ id, label, icon: TIcon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              data-ocid={`freq_system.tab.${id}`}
              onClick={() => setActiveTab(id)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 font-mono text-[8px] tracking-[0.2em] uppercase transition-all duration-200"
              style={{
                color: active ? "rgba(0,213,255,0.98)" : "rgba(0,100,200,0.45)",
                borderBottom: active
                  ? "2px solid rgba(0,213,255,0.8)"
                  : "2px solid transparent",
                background: active ? "rgba(0,213,255,0.05)" : "transparent",
              }}
              aria-pressed={active}
            >
              <TIcon className="w-3 h-3" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,100,255,0.25) transparent",
        }}
      >
        {/* EPICENTER TAB */}
        {activeTab === "epicenter" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="freq_system.epicenter_section"
          >
            {/* Status row */}
            <div
              className="p-4 rounded-xl flex flex-col gap-3"
              style={{
                background: "rgba(0,20,60,0.6)",
                border: `1px solid ${isPlaying ? "rgba(0,213,255,0.4)" : "rgba(0,80,180,0.2)"}`,
                boxShadow: isPlaying ? "0 0 20px rgba(0,150,255,0.15)" : "none",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-mono tracking-[0.25em] uppercase font-bold"
                  style={{ color: "rgba(0,213,255,0.8)" }}
                >
                  AUTOMATIC EPICENTER
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isPlaying
                      ? "rgba(0,255,120,0.9)"
                      : "rgba(120,130,160,0.4)",
                    boxShadow: isPlaying
                      ? "0 0 6px rgba(0,255,120,0.7)"
                      : "none",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "ACTIVE CHIPS", val: isPlaying ? "4 / 4" : "0 / 4" },
                  { label: "RANGE", val: "14–50Hz" },
                  { label: "DETECTING", val: isPlaying ? "YES" : "STANDBY" },
                  { label: "FOUNDATION", val: isPlaying ? "HELD" : "WAITING" },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span
                      className="text-[7px] font-mono tracking-widest uppercase"
                      style={{ color: "rgba(0,120,200,0.5)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{ color: "rgba(0,200,255,0.85)" }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="mt-1 p-2 rounded-lg text-center"
                style={{
                  background: "rgba(0,10,40,0.7)",
                  border: "1px solid rgba(0,100,200,0.2)",
                }}
              >
                <span
                  className="text-[8px] font-mono tracking-[0.2em] uppercase"
                  style={{ color: "rgba(0,180,255,0.6)" }}
                >
                  LOCKED PROFILE — BASS{" "}
                  {
                    BASS_PROFILES[
                      (manualOverride ? lockedBassProfile : activeBassProfile) -
                        1
                    ]?.range
                  }
                </span>
              </div>
            </div>

            {/* Line Driver chip info */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.8)",
                border: "1px solid rgba(153,69,255,0.25)",
              }}
            >
              <p
                className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2"
                style={{ color: "rgba(153,69,255,0.7)" }}
              >
                LINE DRIVER COMPETITION SERIES SRS 2022
              </p>
              <p
                className="text-[7px] font-mono tracking-wide leading-relaxed"
                style={{ color: "rgba(120,140,200,0.65)" }}
              >
                2–4 smart chips auto-detect and enhance 14–50Hz bass notes. No
                manual trigger needed. Epicenter holds the sub foundation during
                every frequency switch — the bottom never drops out.
              </p>
            </div>
          </div>
        )}

        {/* FREQ MATCHING TAB */}
        {activeTab === "freq-matching" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="freq_system.freq_matching_section"
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Bass profiles */}
              <div>
                <p
                  className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                  style={{ color: "rgba(153,69,255,0.8)" }}
                >
                  10 BASS PROFILES
                </p>
                <div className="flex flex-col gap-1">
                  {BASS_PROFILES.map((p) => {
                    const isActive = p.id === activeBassProfile;
                    return (
                      <div
                        key={p.id}
                        data-ocid={`freq_system.bass_profile.${p.id}`}
                        className="px-2 py-1.5 rounded-lg transition-all duration-200"
                        style={{
                          background: isActive
                            ? "rgba(153,69,255,0.2)"
                            : "rgba(0,5,20,0.5)",
                          border: `1px solid ${isActive ? "rgba(153,69,255,0.5)" : "rgba(0,60,150,0.15)"}`,
                          boxShadow: isActive
                            ? "0 0 10px rgba(153,69,255,0.2)"
                            : "none",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                background: "rgba(153,69,255,0.9)",
                                boxShadow: "0 0 4px rgba(153,69,255,0.8)",
                              }}
                            />
                          )}
                          <span
                            className="text-[8px] font-mono font-bold"
                            style={{
                              color: isActive
                                ? "rgba(200,160,255,0.95)"
                                : "rgba(100,120,180,0.6)",
                            }}
                          >
                            {p.range}
                          </span>
                        </div>
                        {isActive && (
                          <p
                            className="text-[6px] font-mono mt-0.5 ml-3"
                            style={{ color: "rgba(153,69,255,0.6)" }}
                          >
                            {p.char}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* High profiles */}
              <div>
                <p
                  className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                  style={{ color: "rgba(0,213,255,0.8)" }}
                >
                  10 HIGH PROFILES
                </p>
                <div className="flex flex-col gap-1">
                  {HIGH_PROFILES.map((p) => {
                    const isActive = p.id === activeHighProfile;
                    return (
                      <div
                        key={p.id}
                        data-ocid={`freq_system.high_profile.${p.id}`}
                        className="px-2 py-1.5 rounded-lg transition-all duration-200"
                        style={{
                          background: isActive
                            ? "rgba(0,100,200,0.2)"
                            : "rgba(0,5,20,0.5)",
                          border: `1px solid ${isActive ? "rgba(0,180,255,0.5)" : "rgba(0,60,150,0.15)"}`,
                          boxShadow: isActive
                            ? "0 0 10px rgba(0,180,255,0.2)"
                            : "none",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {isActive && (
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{
                                background: "rgba(0,213,255,0.9)",
                                boxShadow: "0 0 4px rgba(0,213,255,0.8)",
                              }}
                            />
                          )}
                          <span
                            className="text-[8px] font-mono font-bold"
                            style={{
                              color: isActive
                                ? "rgba(160,230,255,0.95)"
                                : "rgba(100,120,180,0.6)",
                            }}
                          >
                            {p.range}
                          </span>
                        </div>
                        {isActive && (
                          <p
                            className="text-[6px] font-mono mt-0.5 ml-3"
                            style={{ color: "rgba(0,180,255,0.5)" }}
                          >
                            {p.char}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MULTI-FREQ HIT TAB */}
        {activeTab === "multi-freq" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="freq_system.multi_freq_section"
          >
            <p
              className="text-[8px] font-mono tracking-widest uppercase"
              style={{ color: "rgba(0,120,200,0.5)" }}
            >
              3–4 DOMINANT FREQUENCIES LOCKED PER LAYER — REAL TIME
            </p>

            {[
              {
                label: "BASS LAYER",
                freqs: bassFreqs,
                color: "rgba(153,69,255,0.9)",
                glow: "rgba(153,69,255,0.5)",
              },
              {
                label: "MIDS LAYER",
                freqs: midFreqs,
                color: "rgba(0,200,180,0.9)",
                glow: "rgba(0,200,180,0.5)",
              },
              {
                label: "HIGHS LAYER",
                freqs: highFreqs,
                color: "rgba(0,213,255,0.9)",
                glow: "rgba(0,213,255,0.5)",
              },
            ].map(({ label, freqs, color, glow }) => (
              <div
                key={label}
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(0,8,28,0.8)",
                  border: "1px solid rgba(0,80,180,0.2)",
                }}
              >
                <p
                  className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                  style={{ color }}
                >
                  {label}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {freqs.map((hz) => (
                    <div
                      key={hz}
                      className="px-3 py-1.5 rounded-lg"
                      style={{
                        background: "rgba(0,5,20,0.7)",
                        border: `1px solid ${color.replace("0.9)", "0.35)")}`,
                        boxShadow: isPlaying
                          ? `0 0 8px ${glow.replace("0.5)", "0.3)")}`
                          : "none",
                      }}
                    >
                      <span
                        className="text-[10px] font-mono font-bold"
                        style={{ color }}
                      >
                        {hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${hz}`}
                        <span
                          className="text-[7px] ml-0.5"
                          style={{ color: color.replace("0.9)", "0.5)") }}
                        >
                          Hz
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                {!isPlaying && (
                  <p
                    className="text-[7px] font-mono mt-2 tracking-widest"
                    style={{ color: "rgba(80,100,160,0.5)" }}
                  >
                    SCANNING — PLAY MUSIC TO LOCK FREQUENCIES
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* BASS NOTE SWITCHING TAB */}
        {activeTab === "bass-switching" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="freq_system.bass_switching_section"
          >
            {/* Live note */}
            <div
              className="p-4 rounded-xl text-center"
              style={{
                background: isPlaying
                  ? "rgba(0,20,60,0.7)"
                  : "rgba(0,8,28,0.6)",
                border: `1px solid ${isPlaying ? "rgba(153,69,255,0.4)" : "rgba(0,60,150,0.2)"}`,
              }}
            >
              <p
                className="text-[7px] font-mono tracking-[0.3em] uppercase mb-1"
                style={{ color: "rgba(153,69,255,0.5)" }}
              >
                CURRENT BASS NOTE
              </p>
              <span
                className="text-3xl font-mono font-black"
                style={{
                  color: isPlaying
                    ? "rgba(153,69,255,0.95)"
                    : "rgba(80,80,120,0.4)",
                  textShadow: isPlaying
                    ? "0 0 20px rgba(153,69,255,0.5)"
                    : "none",
                }}
              >
                {currentBassNote}
              </span>
              <span
                className="text-sm font-mono ml-1"
                style={{ color: "rgba(153,69,255,0.5)" }}
              >
                Hz
              </span>
            </div>

            {/* Profile readouts */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "BASS PROFILE",
                  val: `#${manualOverride ? lockedBassProfile : activeBassProfile}`,
                  color: "rgba(153,69,255,0.9)",
                },
                {
                  label: "MID PROFILE",
                  val: "VOCAL/INST",
                  color: "rgba(0,200,180,0.9)",
                },
                {
                  label: "HIGH PROFILE",
                  val: `#${activeHighProfile}`,
                  color: "rgba(0,213,255,0.9)",
                },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  className="p-2 rounded-lg text-center"
                  style={{
                    background: "rgba(0,8,28,0.8)",
                    border: "1px solid rgba(0,60,150,0.2)",
                  }}
                >
                  <p
                    className="text-[6px] font-mono tracking-widest uppercase mb-1"
                    style={{ color: "rgba(80,100,160,0.6)" }}
                  >
                    {label}
                  </p>
                  <span
                    className="text-[9px] font-mono font-bold"
                    style={{ color }}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* Manual override */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.8)",
                border: "1px solid rgba(0,80,180,0.2)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
                  style={{ color: "rgba(0,180,255,0.7)" }}
                >
                  MANUAL OVERRIDE
                </span>
                <button
                  type="button"
                  data-ocid="freq_system.manual_override_toggle"
                  onClick={() => setManualOverride((v) => !v)}
                  className="px-3 py-1 rounded-lg font-mono text-[8px] tracking-widest uppercase transition-all duration-200"
                  style={{
                    background: manualOverride
                      ? "rgba(255,140,0,0.2)"
                      : "rgba(0,50,120,0.3)",
                    border: `1px solid ${manualOverride ? "rgba(255,140,0,0.5)" : "rgba(0,130,255,0.3)"}`,
                    color: manualOverride
                      ? "rgba(255,180,0,0.9)"
                      : "rgba(0,180,255,0.6)",
                  }}
                  aria-pressed={manualOverride}
                >
                  {manualOverride ? "ON" : "AUTO"}
                </button>
              </div>

              {manualOverride && (
                <div>
                  <p
                    className="text-[7px] font-mono tracking-widest uppercase mb-2"
                    style={{ color: "rgba(80,100,160,0.6)" }}
                  >
                    LOCK BASS PROFILE
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {BASS_PROFILES.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        data-ocid={`freq_system.lock_profile.${p.id}`}
                        onClick={() => setLockedBassProfile(p.id)}
                        className="px-2 py-1 rounded-md font-mono text-[7px] transition-all duration-200"
                        style={{
                          background:
                            lockedBassProfile === p.id
                              ? "rgba(153,69,255,0.3)"
                              : "rgba(0,5,20,0.6)",
                          border: `1px solid ${lockedBassProfile === p.id ? "rgba(153,69,255,0.6)" : "rgba(0,60,150,0.2)"}`,
                          color:
                            lockedBassProfile === p.id
                              ? "rgba(200,160,255,0.95)"
                              : "rgba(80,100,160,0.6)",
                        }}
                      >
                        {p.range}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.6)",
                border: "1px solid rgba(0,60,150,0.15)",
              }}
            >
              <p
                className="text-[7px] font-mono tracking-wide leading-relaxed"
                style={{ color: "rgba(100,130,200,0.6)" }}
              >
                Bass notes and frequency profiles are locked together. They
                switch in real time as the song plays. The Epicenter holds the
                sub foundation during every switch — no gap, no click, seamless.
                Mids switch by vocal/instrument movement. Highs switch by high
                note and cymbal hits.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
