/**
 * TrackTesterPanel — Smart Track Tester + Bidirectional Pipeline Scan
 * API · HTML · Chainblock · 4GA Wire
 * Auto-runs on startup, manual re-run available.
 */

import { engine } from "@/audio/engine";
import type { DiagnosticResult, TrackTestResult } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";
import { PanelShell } from "./PanelShell";

type ScanPhase = "idle" | "scanning" | "done";

interface EngineStatusRow {
  name: string;
  engine: string;
  status: "green" | "yellow" | "red";
  detail: string;
  powerWatts: number;
}

const STATUS_DOT: Record<string, string> = {
  green: "#4ade80",
  yellow: "#fbbf24",
  red: "#ef4444",
};

const RESULT_DOT: Record<string, string> = {
  pass: "#4ade80",
  warn: "#fbbf24",
  fail: "#ef4444",
};

function EngineBadge({ row }: { row: EngineStatusRow }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: "rgba(0,30,80,0.5)",
        border: `1px solid ${STATUS_DOT[row.status]}44`,
      }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          background: STATUS_DOT[row.status],
          boxShadow: `0 0 6px ${STATUS_DOT[row.status]}`,
        }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-mono font-bold"
          style={{ color: STATUS_DOT[row.status] }}
        >
          {row.name.toUpperCase()}
        </div>
        <div className="text-xs font-mono text-foreground/50 truncate">
          {row.detail}
        </div>
      </div>
      {row.powerWatts > 0 && (
        <span
          className="text-xs font-mono flex-shrink-0"
          style={{ color: "rgba(0,213,255,0.6)" }}
        >
          {(row.powerWatts / 1000).toFixed(0)}kW
        </span>
      )}
    </div>
  );
}

function ResultRow({ r, idx }: { r: DiagnosticResult; idx: number }) {
  const dir = r.direction === "forward" ? "→" : "←";
  return (
    <div
      key={idx}
      data-ocid={`track_tester.result.${idx + 1}`}
      className="flex items-start gap-2 px-2 py-1.5 rounded"
      style={{
        background: idx % 2 === 0 ? "rgba(0,20,60,0.4)" : "rgba(0,10,40,0.3)",
      }}
    >
      <span
        className="text-xs font-mono flex-shrink-0 mt-0.5"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {dir}
      </span>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
        style={{
          background: RESULT_DOT[r.status],
          boxShadow: `0 0 4px ${RESULT_DOT[r.status]}`,
        }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-mono"
          style={{
            color:
              r.status === "fail"
                ? "#ef4444"
                : r.status === "warn"
                  ? "#fbbf24"
                  : "rgba(255,255,255,0.75)",
          }}
        >
          <span style={{ color: "rgba(0,213,255,0.7)" }}>[{r.engine}]</span>{" "}
          {r.node}
          <span className="ml-2 text-foreground/40">{r.detail}</span>
        </div>
        {r.autoFixed && r.fixDescription && (
          <div
            className="text-xs font-mono mt-0.5"
            style={{ color: "#60a5fa" }}
          >
            ● AUTO-FIXED: {r.fixDescription}
          </div>
        )}
      </div>
    </div>
  );
}

export interface TrackTesterPanelProps {
  onClose: () => void;
  autoRun?: boolean;
}

export function TrackTesterPanel({
  onClose,
  autoRun = false,
}: TrackTesterPanelProps) {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TrackTestResult | null>(null);
  const [engineRows, setEngineRows] = useState<EngineStatusRow[]>([]);
  const [filter, setFilter] = useState<"all" | "forward" | "backward">("all");
  const scanRef = useRef(false);

  const refreshEngineStatuses = useCallback(() => {
    const statuses = engine.getEngineStatuses();
    setEngineRows(statuses);
  }, []);

  const runScan = useCallback(async () => {
    if (scanRef.current) return;
    scanRef.current = true;
    setPhase("scanning");
    setProgress(0);
    setResult(null);

    // Animate progress while scan runs
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + 4, 90);
      setProgress(p);
    }, 80);

    try {
      const res = await engine.runSmartTrackTest();
      clearInterval(interval);
      setProgress(100);
      setResult(res);
      refreshEngineStatuses();
      setPhase("done");
    } catch {
      clearInterval(interval);
      setPhase("done");
    } finally {
      scanRef.current = false;
    }
  }, [refreshEngineStatuses]);

  // Load engine statuses on mount
  useEffect(() => {
    refreshEngineStatuses();
    if (autoRun) {
      runScan();
    }
  }, [autoRun, refreshEngineStatuses, runScan]);

  const filteredResults =
    result?.results.filter((r) => {
      if (filter === "forward") return r.direction === "forward";
      if (filter === "backward") return r.direction === "backward";
      return true;
    }) ?? [];

  const passed = result ? result.failedCount === 0 : null;
  const passDot = passed === null ? "#94a3b8" : passed ? "#4ade80" : "#ef4444";

  return (
    <PanelShell
      title="SMART TRACK TESTER"
      onClose={onClose}
      data-ocid="track_tester.panel"
    >
      {/* Header status */}
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-lg mb-3"
        style={{
          background: "rgba(0,40,100,0.4)",
          border: "1px solid rgba(0,150,255,0.2)",
        }}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: passDot, boxShadow: `0 0 8px ${passDot}` }}
        />
        <span
          className="text-xs font-mono font-bold tracking-widest"
          style={{ color: passDot }}
        >
          {phase === "idle" && "READY TO SCAN"}
          {phase === "scanning" && "SCANNING PIPELINE..."}
          {phase === "done" &&
            (passed
              ? "ALL GREEN — CHAIN CONFIRMED"
              : `${result?.failedCount} ISSUES FOUND`)}
        </span>
        <span className="ml-auto text-xs font-mono text-foreground/30">
          API · HTML · CHAINBLOCK · 4GA
        </span>
      </div>

      {/* Progress bar */}
      {phase === "scanning" && (
        <div
          className="w-full h-1.5 rounded-full mb-3"
          style={{ background: "rgba(0,100,255,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #0064ff, #00d5ff)",
              boxShadow: "0 0 8px rgba(0,213,255,0.6)",
            }}
          />
        </div>
      )}

      {/* Summary line */}
      {result && (
        <div
          className="text-xs font-mono px-3 py-2 rounded mb-3"
          style={{
            background: "rgba(0,20,60,0.5)",
            color: passed ? "#4ade80" : "#fbbf24",
          }}
          data-ocid="track_tester.summary"
        >
          {result.summary}
          {result.autoFixedCount > 0 && (
            <span className="ml-2" style={{ color: "#60a5fa" }}>
              · {result.autoFixedCount} auto-fixed
            </span>
          )}
        </div>
      )}

      {/* Engine status grid */}
      <div className="mb-3">
        <div className="text-xs font-mono text-foreground/40 uppercase tracking-wider mb-1.5 px-1">
          Engine Status
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {engineRows.map((row) => (
            <EngineBadge key={row.engine} row={row} />
          ))}
        </div>
      </div>

      {/* Scan direction indicator */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <span className="text-xs font-mono text-foreground/40">DIRECTION:</span>
        <span className="text-xs font-mono" style={{ color: "#00d5ff" }}>
          FORWARD →
        </span>
        <span className="text-xs font-mono text-foreground/30">|</span>
        <span className="text-xs font-mono" style={{ color: "#a78bfa" }}>
          ← BACKWARD
        </span>
      </div>

      {/* Filter tabs */}
      {result && result.results.length > 0 && (
        <div className="flex gap-1.5 mb-2">
          {(["all", "forward", "backward"] as const).map((f) => (
            <button
              key={f}
              type="button"
              data-ocid={`track_tester.filter.${f}`}
              onClick={() => setFilter(f)}
              className="px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wider transition-all"
              style={{
                background:
                  filter === f ? "rgba(0,100,255,0.3)" : "rgba(0,30,80,0.3)",
                border: `1px solid ${filter === f ? "rgba(0,150,255,0.6)" : "rgba(0,100,255,0.2)"}`,
                color: filter === f ? "#00d5ff" : "rgba(255,255,255,0.4)",
              }}
            >
              {f === "all"
                ? `All (${result.results.length})`
                : f === "forward"
                  ? `→ Fwd (${result.results.filter((r) => r.direction === "forward").length})`
                  : `← Back (${result.results.filter((r) => r.direction === "backward").length})`}
            </button>
          ))}
        </div>
      )}

      {/* Results list */}
      {filteredResults.length > 0 && (
        <div
          className="rounded-lg overflow-hidden overflow-y-auto"
          style={{ maxHeight: 280, border: "1px solid rgba(0,100,255,0.15)" }}
          data-ocid="track_tester.results_list"
        >
          {filteredResults.map((r, i) => (
            <ResultRow
              key={`${r.engine}-${r.node}-${r.direction}-${i}`}
              r={r}
              idx={i}
            />
          ))}
        </div>
      )}

      {/* Empty idle state */}
      {phase === "idle" && filteredResults.length === 0 && (
        <div className="text-center py-6" data-ocid="track_tester.empty_state">
          <div className="text-2xl mb-2">&#x26A1;</div>
          <p className="text-xs font-mono text-foreground/40">
            Tap RUN SCAN to test the full pipeline
          </p>
          <p className="text-xs font-mono text-foreground/30 mt-1">
            Front → back AND back ← front bidirectional scan
          </p>
        </div>
      )}

      {/* RUN SCAN button */}
      <button
        type="button"
        data-ocid="track_tester.run_scan_button"
        onClick={runScan}
        disabled={phase === "scanning"}
        className="w-full mt-3 py-3 rounded-xl font-mono font-bold text-sm uppercase tracking-widest transition-all"
        style={{
          background:
            phase === "scanning"
              ? "rgba(0,50,100,0.3)"
              : "linear-gradient(135deg, rgba(0,100,255,0.25), rgba(0,213,255,0.15))",
          border: `1px solid ${phase === "scanning" ? "rgba(0,100,255,0.2)" : "rgba(0,213,255,0.5)"}`,
          color: phase === "scanning" ? "rgba(0,213,255,0.4)" : "#00d5ff",
          textShadow:
            phase === "scanning" ? "none" : "0 0 8px rgba(0,213,255,0.6)",
          cursor: phase === "scanning" ? "not-allowed" : "pointer",
        }}
      >
        {phase === "scanning" ? "SCANNING…" : "RUN SCAN"}
      </button>
    </PanelShell>
  );
}
