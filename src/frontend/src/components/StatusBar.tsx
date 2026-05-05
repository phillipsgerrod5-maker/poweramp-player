import type { EngineStatus } from "../types";

interface StatusBarProps {
  status: EngineStatus;
}

export function StatusBar({ status }: StatusBarProps) {
  const l = status.commanderLights;
  const activeCount = Object.values(l).filter(Boolean).length;

  return (
    <div className="status-bar" data-ocid="player.status_bar">
      <span className={`status-chip ${l.commander ? "chip-on" : "chip-off"}`}>
        COMMANDER {l.commander ? "LIVE" : "OFF"}
      </span>
      <span
        className={`status-chip ${status.audioContextState === "running" ? "chip-on" : "chip-off"}`}
      >
        CTX: {status.audioContextState.toUpperCase()}
      </span>
      <span className="status-chip chip-on">
        {status.thunderBatteryStable ? "\u26a1 120kW" : "UNSTABLE"}
      </span>
      <span className="status-chip chip-on">{activeCount}/8 LIGHTS</span>
    </div>
  );
}
