import { engine } from "@/audio/engine";
import type { ScanResult } from "@/types";
import { useState } from "react";
import { PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function Scanner99Panel({ onClose }: Props) {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);

  const runScan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 400));
    const r = engine.scan();
    setResults(r);
    setScanning(false);
  };

  const runSilenceDiag = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 400));
    const r = engine.scan().filter((s) => s.status !== "ok");
    setResults(
      r.length > 0
        ? r
        : [
            {
              id: "all_ok",
              label: "Silence Diagnosis",
              status: "ok",
              detail:
                "No silence causes found. Chain is clean. Try tapping Start and loading a track.",
            },
          ],
    );
    setScanning(false);
  };

  const allGreen =
    results.length > 0 && results.every((r) => r.status === "ok");
  const errCount = results.filter((r) => r.status === "error").length;
  const warnCount = results.filter((r) => r.status === "warn").length;

  const statusColor = (s: ScanResult["status"]) =>
    s === "ok" ? "#4ade80" : s === "warn" ? "#fbbf24" : "#f87171";

  return (
    <PanelShell
      title="99.0 SCANNER"
      subtitle="20-point chain diagnostic · Auto-fix"
      onClose={onClose}
      data-ocid="scanner99.dialog"
    >
      <div className="flex gap-2">
        <button
          type="button"
          data-ocid="scanner99.run_button"
          onClick={runScan}
          disabled={scanning}
          className="flex-1 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border transition-all"
          style={{
            background: "rgba(0,213,255,0.1)",
            borderColor: "rgba(0,213,255,0.5)",
            color: "#00d5ff",
            opacity: scanning ? 0.5 : 1,
          }}
        >
          {scanning ? "SCANNING…" : "RUN FULL SCAN"}
        </button>
        <button
          type="button"
          data-ocid="scanner99.silence_button"
          onClick={runSilenceDiag}
          disabled={scanning}
          className="flex-1 py-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border transition-all"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.5)",
            color: "#f87171",
            opacity: scanning ? 0.5 : 1,
          }}
        >
          WHY SILENT?
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="smd-meter text-center">
            {allGreen
              ? "✅ ALL GREEN — CHAIN CLEAN"
              : `⚠️ ${errCount} ERROR${errCount !== 1 ? "S" : ""} · ${warnCount} WARNING${warnCount !== 1 ? "S" : ""}`}
          </div>
          <div
            className="flex flex-col gap-1"
            style={{ maxHeight: 320, overflowY: "auto" }}
          >
            {results.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                  style={{ background: statusColor(r.status) }}
                />
                <div className="min-w-0">
                  <div
                    className="text-xs font-mono font-bold"
                    style={{ color: statusColor(r.status) }}
                  >
                    {r.label}
                  </div>
                  <div className="text-xs font-mono text-foreground/50 break-words">
                    {r.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="text-xs text-foreground/40 text-center font-mono">
        Runs 20 checks against live audio nodes · Database memory · Auto-fix
      </div>
    </PanelShell>
  );
}
