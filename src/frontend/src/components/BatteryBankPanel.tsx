import { Battery, X } from "lucide-react";
import { useState } from "react";

type BatteryCount = 20 | 30;

interface BatteryBankPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatteryBankPanel({ isOpen, onClose }: BatteryBankPanelProps) {
  const [count, setCount] = useState<BatteryCount>(20);

  if (!isOpen) return null;

  const perBattery = count === 20 ? 4000 : Math.round(80000 / count);
  const combined = 80000;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,4,16,0.97)" }}
      data-ocid="battery_bank.dialog"
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(0,8,30,0.98)",
          borderBottom: "1px solid rgba(255,180,0,0.25)",
        }}
      >
        <div className="flex items-center gap-2">
          <Battery
            className="w-4 h-4"
            style={{ color: "rgba(255,200,0,0.8)" }}
          />
          <div>
            <p
              className="text-[8px] font-mono tracking-[0.3em] uppercase"
              style={{ color: "rgba(255,180,0,0.4)" }}
            >
              POWERAMP PLAYER
            </p>
            <h2
              className="text-sm font-display font-bold tracking-[0.15em] uppercase"
              style={{ color: "rgba(255,220,0,0.95)" }}
            >
              BATTERY BANK
            </h2>
          </div>
        </div>
        <button
          type="button"
          data-ocid="battery_bank.close_button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90"
          style={{
            border: "1px solid rgba(255,180,0,0.3)",
            color: "rgba(255,200,0,0.7)",
          }}
          aria-label="Close battery bank"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,180,0,0.2) transparent",
        }}
      >
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "COMBINED OUTPUT",
              val: `${(combined / 1000).toFixed(0)}K W`,
              color: "rgba(255,220,0,0.9)",
            },
            {
              label: "EACH BATTERY",
              val: `${(perBattery / 1000).toFixed(1)}K W`,
              color: "rgba(255,180,0,0.8)",
            },
            { label: "CHARGE", val: "100%", color: "rgba(0,255,120,0.9)" },
          ].map(({ label, val, color }) => (
            <div
              key={label}
              className="p-2.5 rounded-xl text-center"
              style={{
                background: "rgba(30,20,0,0.5)",
                border: "1px solid rgba(255,180,0,0.2)",
              }}
            >
              <p
                className="text-[6px] font-mono tracking-widest uppercase mb-1"
                style={{ color: "rgba(180,140,0,0.5)" }}
              >
                {label}
              </p>
              <span
                className="text-[10px] font-mono font-black"
                style={{ color }}
              >
                {val}
              </span>
            </div>
          ))}
        </div>

        {/* Power source */}
        <div
          className="p-3 rounded-xl"
          style={{
            background: "rgba(20,15,0,0.6)",
            border: "1px solid rgba(255,180,0,0.2)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: "rgba(0,255,120,0.9)",
                boxShadow: "0 0 5px rgba(0,255,120,0.7)",
              }}
            />
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase font-bold"
              style={{ color: "rgba(255,200,0,0.75)" }}
            >
              POWERED BY ENGINE 1 — CHANNEL 2
            </span>
          </div>
          <p
            className="text-[7px] font-mono tracking-wide"
            style={{ color: "rgba(140,120,0,0.6)" }}
          >
            Channel 2 converts Engine 1 watts → battery power. Self-sustaining
            loop. Batteries always full.
          </p>
          <div
            className="mt-2 py-1.5 rounded-lg text-center"
            style={{
              background: "rgba(0,10,40,0.5)",
              border: "1px solid rgba(0,180,255,0.15)",
            }}
          >
            <span
              className="text-[8px] font-mono tracking-[0.15em] uppercase"
              style={{ color: "rgba(0,180,255,0.6)" }}
            >
              ALL BATTERIES WIRED TOGETHER → AMP
            </span>
          </div>
        </div>

        {/* Battery count toggle */}
        <div className="flex items-center gap-3">
          <span
            className="text-[8px] font-mono tracking-[0.2em] uppercase"
            style={{ color: "rgba(180,140,0,0.6)" }}
          >
            BATTERY COUNT
          </span>
          <div className="flex gap-2">
            {([20, 30] as BatteryCount[]).map((n) => (
              <button
                key={n}
                type="button"
                data-ocid={`battery_bank.count_${n}`}
                onClick={() => setCount(n)}
                className="px-3 py-1.5 rounded-lg font-mono text-[8px] tracking-widest uppercase transition-all duration-200"
                style={{
                  background:
                    count === n ? "rgba(255,180,0,0.2)" : "rgba(20,15,0,0.4)",
                  border: `1px solid ${count === n ? "rgba(255,200,0,0.5)" : "rgba(100,80,0,0.25)"}`,
                  color:
                    count === n
                      ? "rgba(255,220,0,0.95)"
                      : "rgba(120,100,0,0.5)",
                  boxShadow:
                    count === n ? "0 0 10px rgba(255,180,0,0.2)" : "none",
                }}
                aria-pressed={count === n}
              >
                {n} BATTERIES
              </button>
            ))}
          </div>
        </div>

        {/* Battery grid */}
        <div
          className="p-3 rounded-xl"
          style={{
            background: "rgba(10,8,0,0.7)",
            border: "1px solid rgba(255,180,0,0.15)",
          }}
        >
          <p
            className="text-[7px] font-mono tracking-widest uppercase mb-3"
            style={{ color: "rgba(180,140,0,0.5)" }}
          >
            {count} BATTERY CELLS — {perBattery.toLocaleString()}W EACH (×
            {count})
          </p>
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${count === 20 ? 5 : 6}, 1fr)`,
            }}
          >
            {Array.from({ length: count }, (_, i) => i + 1).map((cellNum) => (
              <div
                key={cellNum}
                data-ocid={`battery_bank.cell.${cellNum}`}
                className="rounded-md overflow-hidden relative"
                style={{
                  height: "32px",
                  background: "rgba(0,5,20,0.8)",
                  border: "1px solid rgba(255,180,0,0.2)",
                }}
                title={`Cell ${cellNum}: ${perBattery.toLocaleString()}W`}
              >
                {/* Fill — always 100% */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,220,80,0.7), rgba(0,255,120,0.4))",
                    boxShadow: "inset 0 0 6px rgba(0,255,80,0.3)",
                  }}
                />
                {/* Cell number */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-[6px] font-mono font-black"
                    style={{ color: "rgba(0,0,0,0.7)" }}
                  >
                    {cellNum}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charge bar */}
        <div
          className="p-3 rounded-xl"
          style={{
            background: "rgba(10,8,0,0.6)",
            border: "1px solid rgba(255,180,0,0.15)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[8px] font-mono tracking-[0.2em] uppercase"
              style={{ color: "rgba(180,140,0,0.6)" }}
            >
              TOTAL CHARGE LEVEL
            </span>
            <span
              className="text-sm font-mono font-black"
              style={{ color: "rgba(0,255,120,0.9)" }}
            >
              100%
            </span>
          </div>
          <div
            className="w-full h-4 rounded-full overflow-hidden"
            style={{
              background: "rgba(0,5,20,0.8)",
              border: "1px solid rgba(255,180,0,0.15)",
            }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "100%",
                background:
                  "linear-gradient(to right, rgba(0,200,80,0.7), rgba(0,255,120,0.9))",
                boxShadow: "0 0 12px rgba(0,255,80,0.4)",
              }}
            />
          </div>
          <p
            className="text-[6px] font-mono mt-1.5 text-center tracking-widest uppercase"
            style={{ color: "rgba(0,180,80,0.5)" }}
          >
            ENGINE 1 CHANNEL 2 KEEPS BATTERIES ALWAYS FULL — SELF-SUSTAINING
            LOOP
          </p>
        </div>
      </div>
    </div>
  );
}
