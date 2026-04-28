import { useCallback, useState } from "react";

const LS_SOUL_MODE = "poweramp_soul_mode";
const LS_SOUL_HARMONIC = "poweramp_soul_harmonic_level";

function lsGetBool(key: string, def: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v !== "false";
  } catch {
    return def;
  }
}

function lsGetNum(key: string, def: number): number {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : Number(v);
  } catch {
    return def;
  }
}

export function SoulModePanel() {
  const [soulOn, setSoulOn] = useState(() => lsGetBool(LS_SOUL_MODE, false));
  const [harmonicLevel, setHarmonicLevel] = useState(() =>
    lsGetNum(LS_SOUL_HARMONIC, 75),
  );

  const handleToggle = useCallback(() => {
    setSoulOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LS_SOUL_MODE, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const handleHarmonic = useCallback((v: number) => {
    setHarmonicLevel(v);
    try {
      localStorage.setItem(LS_SOUL_HARMONIC, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="flex flex-col gap-3" data-ocid="soul_mode.panel">
      {/* Toggle row */}
      <div
        className="flex items-center justify-between p-3 rounded-xl"
        style={{
          background: soulOn ? "rgba(153,69,255,0.12)" : "rgba(0,8,28,0.7)",
          border: `1px solid ${soulOn ? "rgba(153,69,255,0.4)" : "rgba(0,80,180,0.2)"}`,
          boxShadow: soulOn ? "0 0 16px rgba(153,69,255,0.15)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[9px] font-mono font-black tracking-[0.2em] uppercase"
            style={{
              color: soulOn
                ? "rgba(200,160,255,0.95)"
                : "rgba(140,160,220,0.7)",
            }}
          >
            SOUL MODE
          </span>
          <span
            className="text-[7px] font-mono tracking-wide"
            style={{ color: "rgba(80,100,160,0.55)" }}
          >
            Harmonic preservation for bass notes
          </span>
        </div>
        <button
          type="button"
          data-ocid="soul_mode.toggle"
          onClick={handleToggle}
          className="px-4 py-1.5 rounded-lg font-mono text-[9px] font-bold tracking-[0.2em] uppercase transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: soulOn ? "rgba(153,69,255,0.25)" : "rgba(0,20,60,0.4)",
            border: `1px solid ${soulOn ? "rgba(153,69,255,0.6)" : "rgba(0,100,200,0.3)"}`,
            color: soulOn ? "rgba(200,160,255,0.95)" : "rgba(100,140,200,0.6)",
            boxShadow: soulOn ? "0 0 12px rgba(153,69,255,0.3)" : "none",
          }}
          aria-pressed={soulOn}
        >
          {soulOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* Status message */}
      {soulOn && (
        <div
          className="p-3 rounded-xl animate-fade-in"
          style={{
            background: "rgba(80,0,160,0.12)",
            border: "1px solid rgba(153,69,255,0.25)",
          }}
        >
          <p
            className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold mb-1"
            style={{ color: "rgba(153,69,255,0.8)" }}
          >
            HARMONIC PRESERVATION ACTIVE
          </p>
          <p
            className="text-[7px] font-mono tracking-wide leading-relaxed"
            style={{ color: "rgba(100,80,180,0.7)" }}
          >
            Bass notes live through the mids channel — even when bass is off
          </p>
        </div>
      )}

      {/* Harmonic preservation level */}
      <div
        className="p-3 rounded-xl"
        style={{
          background: "rgba(0,8,28,0.7)",
          border: "1px solid rgba(0,80,180,0.2)",
          opacity: soulOn ? 1 : 0.4,
          transition: "opacity 0.3s ease",
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <p
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(153,69,255,0.8)" }}
            >
              HARMONIC PRESERVATION LEVEL
            </p>
            <p
              className="text-[6px] font-mono mt-0.5"
              style={{ color: "rgba(80,100,160,0.5)" }}
            >
              How much bass note character passes through mids
            </p>
          </div>
          <span
            className="text-lg font-mono font-black"
            style={{ color: "rgba(153,69,255,0.9)" }}
          >
            {harmonicLevel}%
          </span>
        </div>
        <input
          type="range"
          data-ocid="soul_mode.harmonic_slider"
          min={0}
          max={100}
          value={harmonicLevel}
          disabled={!soulOn}
          onChange={(e) => handleHarmonic(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, rgba(153,69,255,0.7) ${harmonicLevel}%, rgba(0,20,60,0.5) ${harmonicLevel}%)`,
            accentColor: "rgba(153,69,255,0.9)",
          }}
          aria-label="Harmonic preservation level"
        />
      </div>

      {/* Explanation */}
      <div
        className="p-3 rounded-xl"
        style={{
          background: "rgba(0,5,20,0.5)",
          border: "1px solid rgba(0,60,150,0.15)",
        }}
      >
        <p
          className="text-[7px] font-mono tracking-wide leading-relaxed"
          style={{ color: "rgba(100,120,180,0.6)" }}
        >
          Even when the bass channel is off, the <em>shape</em> and{" "}
          <em>character</em> of every bass note still plays through the mids
          channel. Only the physical sub hit is missing — the harmonics, attack,
          and sustain of that note are still there and full. The system has
          enough intelligence and depth that it always has soul.
        </p>
      </div>
    </div>
  );
}
