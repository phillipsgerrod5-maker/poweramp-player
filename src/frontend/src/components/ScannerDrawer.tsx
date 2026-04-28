import type { useScanner } from "@/hooks/useScanner";
import { X } from "lucide-react";

type ScannerHook = ReturnType<typeof useScanner>;

interface ScannerDrawerProps {
  scanner: ScannerHook;
}

export function ScannerDrawer({ scanner }: ScannerDrawerProps) {
  const { state, close } = scanner;

  if (!state.isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={close}
        onKeyDown={(e) => e.key === "Escape" && close()}
        aria-hidden="true"
        role="presentation"
      />
      <div
        data-ocid="scanner.drawer"
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-80 animate-slide-in-right"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.14 0.08 262) 0%, oklch(0.11 0.07 255) 100%)",
          borderLeft: "2px solid rgba(0,213,255,0.45)",
          boxShadow:
            "-4px 0 40px rgba(0,213,255,0.2), -8px 0 80px rgba(0,100,255,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 px-4 py-3 flex items-center justify-between"
          style={{
            background: "rgba(0,30,80,0.8)",
            borderBottom: "1px solid rgba(0,213,255,0.3)",
          }}
        >
          <div>
            <p
              className="text-[10px] font-mono tracking-[0.3em] uppercase font-bold"
              style={{ color: "rgba(0,213,255,0.9)" }}
            >
              99.0 FIX SCANNER
            </p>
            <p
              className="text-[8px] font-mono tracking-widest"
              style={{ color: "rgba(0,150,255,0.5)" }}
            >
              3 TRILLION DATA POINTS
            </p>
          </div>
          <button
            type="button"
            data-ocid="scanner.close_button"
            onClick={close}
            className="w-7 h-7 flex items-center justify-center rounded-sm transition-smooth hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coming soon body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-glow"
            style={{
              background: "rgba(0,30,80,0.5)",
              border: "2px solid rgba(0,150,255,0.4)",
              boxShadow: "0 0 30px rgba(0,100,255,0.3)",
            }}
          >
            <span className="text-2xl">🔬</span>
          </div>
          <div>
            <p
              className="text-sm font-mono font-bold tracking-widest mb-1"
              style={{ color: "rgba(0,213,255,0.9)" }}
            >
              SCANNER ARMED
            </p>
            <p
              className="text-xs font-mono"
              style={{ color: "rgba(0,150,255,0.5)" }}
            >
              99.0 Fix Scanner deployment pending.
            </p>
            <p
              className="text-xs font-mono mt-1"
              style={{ color: "rgba(0,100,255,0.4)" }}
            >
              Knowledge base: 50B × 60
            </p>
          </div>
          <div
            className="w-full rounded-sm p-3"
            style={{
              background: "rgba(0,20,60,0.6)",
              border: "1px solid rgba(0,150,255,0.2)",
            }}
          >
            <p
              className="text-[9px] font-mono tracking-widest uppercase mb-2"
              style={{ color: "rgba(0,213,255,0.5)" }}
            >
              STATUS
            </p>
            {[
              "Audio Engine: Connected",
              "Signal Chain: Live",
              "Protection System: Armed",
              "Amps: Online",
            ].map((s) => (
              <div key={s} className="flex items-center gap-2 py-1">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: "rgba(0,255,120,0.9)",
                    boxShadow: "0 0 6px rgba(0,255,120,0.7)",
                  }}
                />
                <span
                  className="text-[9px] font-mono tracking-wide"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-4 py-3"
          style={{ borderTop: "1px solid rgba(0,213,255,0.15)" }}
        >
          <p
            className="text-[8px] font-mono tracking-widest text-center"
            style={{ color: "rgba(0,100,255,0.4)" }}
          >
            FULL DIAGNOSTIC SCANNER — COMING NEXT
          </p>
        </div>
      </div>
    </>
  );
}
