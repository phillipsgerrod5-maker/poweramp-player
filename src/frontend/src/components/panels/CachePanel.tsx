/**
 * CachePanel — Clean Cache
 * Clears all saved settings and resets the app to default values.
 */
import { useCallback, useState } from "react";
import { PanelShell } from "./PanelShell";

export function CachePanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "cleared">("idle");

  const handleClear = useCallback(() => {
    localStorage.clear();
    setStatus("cleared");
    setTimeout(() => {
      setStatus("idle");
      onClose();
    }, 2000);
  }, [onClose]);

  const handleClearReload = useCallback(() => {
    localStorage.clear();
    window.location.reload();
  }, []);

  return (
    <PanelShell
      title="🗑️ CLEAN CACHE"
      subtitle="Settings & saved state management"
      onClose={onClose}
      data-ocid="cache.panel"
    >
      {/* Description */}
      <div
        className="px-3 py-3 rounded-lg text-xs font-mono leading-relaxed"
        style={{
          background: "rgba(0,20,60,0.5)",
          border: "1px solid rgba(0,100,255,0.2)",
          color: "rgba(255,255,255,0.65)",
        }}
      >
        Clears all saved settings and resets the app to default values. Every
        slider, toggle, and control will return to its factory position on the
        next load. Your audio chain is not affected — only saved preferences are
        cleared.
      </div>

      {/* Status feedback */}
      {status === "cleared" && (
        <div
          className="px-3 py-2 rounded-lg text-xs font-mono text-center"
          style={{
            background: "rgba(0,200,100,0.1)",
            border: "1px solid rgba(0,200,100,0.35)",
            color: "#4ade80",
          }}
          data-ocid="cache.success_state"
        >
          ✓ Cache cleared. Reload to apply defaults.
        </div>
      )}

      {/* Clear Cache button */}
      <button
        type="button"
        data-ocid="cache.clear_button"
        onClick={handleClear}
        disabled={status === "cleared"}
        className="w-full py-3 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all"
        style={{
          background:
            status === "cleared"
              ? "rgba(0,80,40,0.3)"
              : "linear-gradient(135deg, rgba(200,30,30,0.25), rgba(255,60,60,0.15))",
          border: `1px solid ${
            status === "cleared" ? "rgba(0,200,100,0.3)" : "rgba(255,60,60,0.5)"
          }`,
          color: status === "cleared" ? "#4ade80" : "#f87171",
          cursor: status === "cleared" ? "not-allowed" : "pointer",
        }}
      >
        {status === "cleared" ? "✓ CLEARED" : "CLEAR CACHE"}
      </button>

      {/* Divider */}
      <div className="gauge-wire" style={{ opacity: 0.3 }} />

      {/* Clear & Reload button */}
      <button
        type="button"
        data-ocid="cache.clear_reload_button"
        onClick={handleClearReload}
        className="w-full py-3 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all"
        style={{
          background:
            "linear-gradient(135deg, rgba(150,0,200,0.2), rgba(200,0,150,0.1))",
          border: "1px solid rgba(200,0,200,0.4)",
          color: "#c084fc",
        }}
      >
        CLEAR &amp; RELOAD
      </button>

      <p
        className="text-center text-xs font-mono"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        CLEAR &amp; RELOAD will immediately refresh the page
      </p>
    </PanelShell>
  );
}
