import { Cpu, Shield, X, Zap } from "lucide-react";
import { useState } from "react";

type Section = "titanium" | "zero-restriction" | "virtual-cpu";

interface SmartChipsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  engineRunning?: boolean;
}

const SECTION_TABS: { id: Section; label: string; icon: typeof Shield }[] = [
  { id: "titanium", label: "TITANIUM WALL", icon: Shield },
  { id: "zero-restriction", label: "ZERO RESTRICT", icon: Zap },
  { id: "virtual-cpu", label: "VIRTUAL CPU", icon: Cpu },
];

export function SmartChipsDrawer({
  isOpen,
  onClose,
  isPlaying,
  engineRunning = true,
}: SmartChipsDrawerProps) {
  const [activeSection, setActiveSection] = useState<Section>("titanium");
  const [gainForDistortion, setGainForDistortion] = useState(75);
  const [gainForClipping, setGainForClipping] = useState(70);

  if (!isOpen) return null;

  const cpuLoad = isPlaying ? Math.floor(42 + Math.random() * 18) : 12;
  const activeChips = isPlaying ? 38 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,4,16,0.97)" }}
      data-ocid="smart_chips.dialog"
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
            SMART CHIPS
          </h2>
        </div>
        <button
          type="button"
          data-ocid="smart_chips.close_button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90"
          style={{
            border: "1px solid rgba(0,130,255,0.3)",
            color: "rgba(0,180,255,0.7)",
          }}
          aria-label="Close smart chips"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section tabs */}
      <div
        className="shrink-0 flex overflow-x-auto"
        style={{
          borderBottom: "1px solid rgba(0,80,200,0.2)",
          background: "rgba(0,5,18,0.98)",
          scrollbarWidth: "none",
        }}
      >
        {SECTION_TABS.map(({ id, label, icon: TIcon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              data-ocid={`smart_chips.tab.${id}`}
              onClick={() => setActiveSection(id)}
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
        {/* TITANIUM WALL */}
        {activeSection === "titanium" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="smart_chips.titanium_section"
          >
            {/* Main chip header */}
            <div
              className="p-4 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,15,50,0.9), rgba(0,25,70,0.85))",
                border: "1px solid rgba(0,180,255,0.35)",
                boxShadow: engineRunning
                  ? "0 0 24px rgba(0,140,255,0.2)"
                  : "none",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-mono font-black tracking-[0.3em] uppercase"
                  style={{ color: "rgba(0,213,255,0.95)" }}
                >
                  TITANIUM WALL SMART CHIP
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: engineRunning
                      ? "rgba(0,255,120,0.9)"
                      : "rgba(120,130,160,0.4)",
                    boxShadow: engineRunning
                      ? "0 0 6px rgba(0,255,120,0.7)"
                      : "none",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {[
                  { label: "SIZE", val: "10 INCHES WIDE" },
                  { label: "POWER RATING", val: "1,000" },
                  { label: "PROTECTION SLOTS", val: "HOLDING 6" },
                  { label: "CHANNEL POWER", val: "ENGINE 1 — CH5" },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span
                      className="text-[6px] font-mono tracking-widest uppercase"
                      style={{ color: "rgba(0,100,180,0.5)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[8px] font-mono font-bold"
                      style={{ color: "rgba(0,200,255,0.85)" }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
              <div
                className="text-center py-1.5 rounded-lg"
                style={{
                  background: "rgba(0,10,40,0.7)",
                  border: "1px solid rgba(0,100,200,0.2)",
                }}
              >
                <span
                  className="text-[8px] font-mono tracking-[0.2em] uppercase"
                  style={{ color: "rgba(0,180,255,0.6)" }}
                >
                  SILENT WALL — ONLY VOLUME + BASS NOTES PASS THROUGH
                </span>
              </div>
            </div>

            {/* Bass side */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(80,0,160,0.15)",
                border: "1px solid rgba(153,69,255,0.3)",
              }}
            >
              <p
                className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                style={{ color: "rgba(153,69,255,0.8)" }}
              >
                BASS SIDE — ENGINE CHANNEL
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["BANG", "BOOM", "BOTTOM", "SUB FOUNDATION"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{
                      background: "rgba(0,5,20,0.6)",
                      border: "1px solid rgba(153,69,255,0.2)",
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: "rgba(0,255,120,0.9)",
                        boxShadow: "0 0 4px rgba(0,255,120,0.7)",
                      }}
                    />
                    <span
                      className="text-[8px] font-mono font-bold"
                      style={{ color: "rgba(153,69,255,0.85)" }}
                    >
                      {item} ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mids side */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,50,120,0.2)",
                border: "1px solid rgba(0,160,255,0.25)",
              }}
            >
              <p
                className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                style={{ color: "rgba(0,200,255,0.8)" }}
              >
                MIDS SIDE — INSTRUMENT FOCUS ONLY
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["INSTRUMENT FOCUS", "ISOLATION"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                    style={{
                      background: "rgba(0,5,20,0.6)",
                      border: "1px solid rgba(0,130,255,0.2)",
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: "rgba(0,255,120,0.9)",
                        boxShadow: "0 0 4px rgba(0,255,120,0.7)",
                      }}
                    />
                    <span
                      className="text-[8px] font-mono font-bold"
                      style={{ color: "rgba(0,200,255,0.85)" }}
                    >
                      {item} ✓
                    </span>
                  </div>
                ))}
              </div>
              <p
                className="text-[7px] font-mono mt-2 tracking-wide"
                style={{ color: "rgba(80,120,200,0.5)" }}
              >
                Bang / Boom / Bottom stay on bass side only — nothing crosses
                over
              </p>
            </div>

            {/* Protection slots */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.8)",
                border: "1px solid rgba(0,80,180,0.2)",
              }}
            >
              <p
                className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                style={{ color: "rgba(0,180,255,0.7)" }}
              >
                PROTECTION SLOTS — 6 TOTAL
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  "OLD PROT 1",
                  "OLD PROT 2",
                  "OLD PROT 3",
                  "NEW PROT 1",
                  "NEW PROT 2",
                  "NEW PROT 3",
                ].map((slot) => (
                  <div
                    key={slot}
                    className="px-2 py-1 rounded-md text-center"
                    style={{
                      background: "rgba(0,10,40,0.7)",
                      border: "1px solid rgba(0,80,200,0.25)",
                    }}
                  >
                    <span
                      className="text-[6px] font-mono tracking-widest uppercase"
                      style={{ color: "rgba(0,150,255,0.6)" }}
                    >
                      {slot}
                    </span>
                    <div className="flex justify-center mt-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "rgba(0,255,120,0.8)",
                          boxShadow: "0 0 3px rgba(0,255,120,0.6)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ZERO RESTRICTION GAIN */}
        {activeSection === "zero-restriction" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="smart_chips.zero_restriction_section"
          >
            {/* Header */}
            <div
              className="p-4 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,20,60,0.9), rgba(0,30,80,0.85))",
                border: "1px solid rgba(0,200,180,0.35)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-mono font-black tracking-[0.25em] uppercase"
                  style={{ color: "rgba(0,200,180,0.95)" }}
                >
                  ZERO RESTRICTION GAIN CHIP
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: engineRunning
                      ? "rgba(0,255,120,0.9)"
                      : "rgba(120,130,160,0.4)",
                    boxShadow: engineRunning
                      ? "0 0 6px rgba(0,255,120,0.7)"
                      : "none",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "CONNECTED TO", val: "LOW END" },
                  { label: "COMMANDER", val: "WIRED TO ENGINE" },
                  { label: "TITANIUM WALL", val: "INSIDE CHIP" },
                  { label: "ENGINE POWER", val: "CHANNEL DIRECT" },
                ].map(({ label, val }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span
                      className="text-[6px] font-mono tracking-widest uppercase"
                      style={{ color: "rgba(0,120,160,0.5)" }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[8px] font-mono font-bold"
                      style={{ color: "rgba(0,200,180,0.85)" }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gain for Distortion slider */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.8)",
                border: "1px solid rgba(0,80,180,0.2)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p
                    className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
                    style={{ color: "rgba(0,200,180,0.8)" }}
                  >
                    GAIN — DISTORTION CLEANING
                  </p>
                  <p
                    className="text-[7px] font-mono mt-0.5"
                    style={{ color: "rgba(80,120,180,0.5)" }}
                  >
                    Cleaning strength — never adds distortion
                  </p>
                </div>
                <span
                  className="text-lg font-mono font-black"
                  style={{ color: "rgba(0,200,180,0.9)" }}
                >
                  {gainForDistortion}
                </span>
              </div>
              <input
                type="range"
                data-ocid="smart_chips.gain_distortion_slider"
                min={0}
                max={100}
                value={gainForDistortion}
                onChange={(e) => setGainForDistortion(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgba(0,200,180,0.7) ${gainForDistortion}%, rgba(0,30,80,0.5) ${gainForDistortion}%)`,
                  accentColor: "rgba(0,200,180,0.9)",
                }}
                aria-label="Gain for distortion cleaning"
              />
            </div>

            {/* Gain for Clipping slider */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.8)",
                border: "1px solid rgba(0,80,180,0.2)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p
                    className="text-[9px] font-mono tracking-[0.2em] uppercase font-bold"
                    style={{ color: "rgba(0,180,255,0.8)" }}
                  >
                    GAIN — CLIPPING CLEANING
                  </p>
                  <p
                    className="text-[7px] font-mono mt-0.5"
                    style={{ color: "rgba(80,120,180,0.5)" }}
                  >
                    Clipping removal — never touches volume
                  </p>
                </div>
                <span
                  className="text-lg font-mono font-black"
                  style={{ color: "rgba(0,180,255,0.9)" }}
                >
                  {gainForClipping}
                </span>
              </div>
              <input
                type="range"
                data-ocid="smart_chips.gain_clipping_slider"
                min={0}
                max={100}
                value={gainForClipping}
                onChange={(e) => setGainForClipping(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgba(0,180,255,0.7) ${gainForClipping}%, rgba(0,30,80,0.5) ${gainForClipping}%)`,
                  accentColor: "rgba(0,180,255,0.9)",
                }}
                aria-label="Gain for clipping cleaning"
              />
            </div>
          </div>
        )}

        {/* VIRTUAL CPU */}
        {activeSection === "virtual-cpu" && (
          <div
            className="flex flex-col gap-4"
            data-ocid="smart_chips.virtual_cpu_section"
          >
            {/* Header */}
            <div
              className="p-4 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,10,40,0.95), rgba(0,20,60,0.9))",
                border: `1px solid ${isPlaying ? "rgba(0,213,255,0.45)" : "rgba(0,80,180,0.25)"}`,
                boxShadow: isPlaying ? "0 0 28px rgba(0,140,255,0.18)" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[10px] font-mono font-black tracking-[0.25em] uppercase"
                  style={{ color: "rgba(0,213,255,0.95)" }}
                >
                  VIRTUAL CPU — UPGRADED
                </span>
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: engineRunning
                      ? "rgba(0,255,120,0.9)"
                      : "rgba(120,130,160,0.4)",
                    boxShadow: engineRunning
                      ? "0 0 8px rgba(0,255,120,0.7)"
                      : "none",
                  }}
                />
              </div>

              {/* Active chips */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-[8px] font-mono tracking-[0.2em] uppercase"
                  style={{ color: "rgba(0,150,200,0.6)" }}
                >
                  TOTAL CHIPS ACTIVE
                </span>
                <span
                  className="text-xl font-mono font-black"
                  style={{ color: "rgba(0,213,255,0.9)" }}
                >
                  {activeChips}{" "}
                  <span
                    className="text-xs"
                    style={{ color: "rgba(0,120,180,0.5)" }}
                  >
                    / 48
                  </span>
                </span>
              </div>

              {/* CPU load bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[7px] font-mono tracking-widest uppercase"
                    style={{ color: "rgba(0,130,200,0.5)" }}
                  >
                    CPU LOAD
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold"
                    style={{
                      color: isPlaying
                        ? "rgba(0,255,120,0.9)"
                        : "rgba(80,100,160,0.5)",
                    }}
                  >
                    {cpuLoad}%
                  </span>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ background: "rgba(0,10,40,0.8)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cpuLoad}%`,
                      background:
                        cpuLoad > 70
                          ? "linear-gradient(to right, rgba(255,100,0,0.8), rgba(255,60,60,0.9))"
                          : "linear-gradient(to right, rgba(0,180,255,0.7), rgba(0,255,120,0.8))",
                      boxShadow: isPlaying
                        ? "0 0 8px rgba(0,200,255,0.4)"
                        : "none",
                    }}
                  />
                </div>
              </div>

              {/* Clean signal */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[7px] font-mono tracking-widest uppercase"
                  style={{ color: "rgba(0,130,200,0.5)" }}
                >
                  CLEAN SIGNAL
                </span>
                <span
                  className="text-[8px] font-mono font-bold"
                  style={{
                    color: isPlaying
                      ? "rgba(0,255,120,0.9)"
                      : "rgba(80,100,160,0.5)",
                  }}
                >
                  {isPlaying ? "✓ CONFIRMED" : "✗ PROCESSING"}
                </span>
              </div>
            </div>

            {/* Processing window */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.8)",
                border: "1px solid rgba(0,80,180,0.2)",
              }}
            >
              <p
                className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                style={{ color: "rgba(0,180,255,0.7)" }}
              >
                PROCESSING WINDOW
              </p>
              <div
                className="px-3 py-2 rounded-lg text-center"
                style={{
                  background: "rgba(0,10,40,0.7)",
                  border: "1px solid rgba(0,100,200,0.2)",
                }}
              >
                <span
                  className="text-[9px] font-mono font-bold"
                  style={{ color: "rgba(0,200,255,0.85)" }}
                >
                  20–30 SECOND WINDOW
                </span>
                <p
                  className="text-[6px] font-mono mt-0.5"
                  style={{ color: "rgba(80,120,180,0.5)" }}
                >
                  Opens automatically when bottleneck detected — prevents pops
                  and cracks
                </p>
              </div>
            </div>

            {/* Status strip */}
            <div
              className="py-3 rounded-xl text-center"
              style={{
                background: isPlaying
                  ? "rgba(0,20,60,0.6)"
                  : "rgba(0,8,28,0.6)",
                border: `1px solid ${isPlaying ? "rgba(0,255,120,0.3)" : "rgba(0,60,150,0.2)"}`,
              }}
            >
              <span
                className="text-[9px] font-mono font-black tracking-[0.2em] uppercase"
                style={{
                  color: isPlaying
                    ? "rgba(0,255,120,0.9)"
                    : "rgba(80,100,160,0.45)",
                }}
              >
                {isPlaying
                  ? "NO POPS — NO CRACKS — ZERO DROPPED SAMPLES ✓"
                  : "STANDBY — ENGINE READY"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
