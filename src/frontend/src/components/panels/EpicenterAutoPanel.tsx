/**
 * EpicenterAutoPanel — DIY KIT LOCKED
 * Automatic Epicenter Bass Note Response placeholder.
 */
import { useState } from "react";
import { PanelShell } from "./PanelShell";

export function EpicenterAutoPanel({ onClose }: { onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <PanelShell
      title="🌊 EPICNTR AUTO"
      subtitle="DIY KIT — LOCKED FEATURE"
      onClose={onClose}
      data-ocid="epicenter_auto.panel"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: "rgba(255,180,0,0.08)",
          border: "1px solid rgba(255,180,0,0.3)",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>🔒</span>
        <span
          className="text-xs font-mono font-bold tracking-widest"
          style={{ color: "#fbbf24" }}
        >
          LOCKED — READY TO WIRE
        </span>
      </div>

      <div
        className="px-3 py-3 rounded-lg text-xs font-mono leading-relaxed"
        style={{
          background: "rgba(0,20,60,0.5)",
          border: "1px solid rgba(0,100,255,0.2)",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <div className="font-bold mb-2" style={{ color: "#00d5ff" }}>
          Automatic Epicenter Bass Note Response
        </div>
        2–4 smart chips auto-detect and enhance 14–20Hz bass notes per song with
        no manual trigger. Early response smart chip eliminates dead zone at low
        frequencies. Foundation held at 14–50Hz on every note — never drops,
        never misses a hit.
        <div className="mt-3 text-foreground/40">
          Wiring: API · HTML · Chainblock · 4GA Wire
        </div>
      </div>

      {!confirmed ? (
        <button
          type="button"
          data-ocid="epicenter_auto.activate_button"
          onClick={() => setConfirmed(true)}
          className="w-full py-3 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,100,255,0.2), rgba(255,180,0,0.1))",
            border: "1px solid rgba(255,180,0,0.4)",
            color: "#fbbf24",
          }}
        >
          TAP TO ACTIVATE
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className="px-3 py-2 rounded-lg text-xs font-mono"
            style={{
              background: "rgba(255,180,0,0.08)",
              border: "1px solid rgba(255,180,0,0.25)",
              color: "#fbbf24",
            }}
          >
            Activating this feature wires it into your chain. Press CONFIRM when
            ready — or CANCEL to keep it locked.
          </div>
          <button
            type="button"
            data-ocid="epicenter_auto.confirm_button"
            disabled
            className="w-full py-3 rounded-xl font-mono font-bold text-sm uppercase tracking-widest opacity-40 cursor-not-allowed"
            style={{
              background: "rgba(0,50,120,0.3)",
              border: "1px solid rgba(0,150,255,0.2)",
              color: "#94a3b8",
            }}
          >
            CONFIRM WIRE-IN (COMING SOON)
          </button>
          <button
            type="button"
            data-ocid="epicenter_auto.cancel_button"
            onClick={() => setConfirmed(false)}
            className="w-full py-2 rounded-lg font-mono text-xs uppercase tracking-widest transition-all"
            style={{
              background: "rgba(0,20,50,0.4)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            CANCEL
          </button>
        </div>
      )}
    </PanelShell>
  );
}
