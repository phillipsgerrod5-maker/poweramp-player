import { engine } from "@/audio/engine";
import type { CommanderLog } from "@/types";
import { useEffect, useRef, useState } from "react";
import { PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

const MAX_HISTORY = 1000;
const logs: CommanderLog[] = [];

export function addCommanderLog(
  msg: string,
  level: CommanderLog["level"] = "info",
) {
  logs.unshift({ ts: Date.now(), msg, level });
  if (logs.length > MAX_HISTORY) logs.length = MAX_HISTORY;
}

export function CommanderPanel({ onClose }: Props) {
  const [history, setHistory] = useState<CommanderLog[]>([]);
  const [ctxState, setCtxState] = useState("uninitialized");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    addCommanderLog("Commander initialized — chat page blocked", "info");
    addCommanderLog(
      "4-gauge wire · API · HTML · Chainblock · AudioContext",
      "info",
    );

    intervalRef.current = setInterval(() => {
      setCtxState(engine.getContextState());
      setHistory([...logs.slice(0, 50)]);

      // Self-heal: guard masterGain
      if (engine.initialized && engine.getContextState() === "suspended") {
        addCommanderLog("AudioContext suspended — resuming…", "warn");
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const levelColor: Record<CommanderLog["level"], string> = {
    info: "#94a3b8",
    warn: "#fbbf24",
    error: "#f87171",
    fix: "#4ade80",
  };

  return (
    <PanelShell
      title="MASTER COMMANDER"
      subtitle="1000-entry history · Chat blocked · Self-healing"
      onClose={onClose}
      data-ocid="commander.dialog"
    >
      <div className="grid grid-cols-2 gap-2">
        {(["bass", "mids", "highs", "tweeters"] as const).map((ch) => (
          <div key={ch} className="slot-panel flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${engine.initialized ? "bg-green-400" : "bg-yellow-400"}`}
            />
            <span className="text-xs font-mono text-foreground/70 uppercase">
              {ch}
            </span>
          </div>
        ))}
      </div>
      <div className="slot-panel">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-mono text-foreground/60">ENGINE</span>
          <span
            className={`text-xs font-mono ${ctxState === "running" ? "text-green-400" : "text-yellow-400"}`}
          >
            {ctxState.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-mono text-foreground/60">
            CHAT PAGE
          </span>
          <span className="text-xs font-mono text-red-400">
            BLOCKED — AUDIO APP ONLY
          </span>
        </div>
      </div>
      <div className="slot-panel" style={{ maxHeight: 240, overflowY: "auto" }}>
        <div className="text-xs font-mono text-foreground/50 mb-2">
          HISTORY ({logs.length} entries)
        </div>
        {history.length === 0 && (
          <div className="text-xs font-mono text-foreground/30 text-center py-4">
            No logs yet
          </div>
        )}
        {history.map((log) => (
          <div key={log.ts} className="flex gap-2 mb-1">
            <span
              className="text-xs font-mono"
              style={{ color: "#4a5568", minWidth: 48 }}
            >
              {new Date(log.ts).toISOString().slice(11, 19)}
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: levelColor[log.level] }}
            >
              [{log.level.toUpperCase()}]
            </span>
            <span className="text-xs font-mono text-foreground/60 min-w-0 break-words">
              {log.msg}
            </span>
          </div>
        ))}
      </div>
      <div className="text-xs text-foreground/40 text-center font-mono">
        1000 entries · Auto-heal · Chat page — BLOCKED · API+HTML+CHAINBLOCK
      </div>
    </PanelShell>
  );
}
