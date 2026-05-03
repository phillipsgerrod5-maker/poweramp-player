import { engine } from "@/audio/engine";
import { useEffect, useState } from "react";
import { PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

const BAR_IDS = [
  "m0",
  "m1",
  "m2",
  "m3",
  "m4",
  "m5",
  "m6",
  "m7",
  "m8",
  "m9",
  "m10",
  "m11",
  "m12",
  "m13",
  "m14",
  "m15",
  "m16",
  "m17",
  "m18",
  "m19",
] as const;

export function TitaniumFusePanel({ onClose }: Props) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setLevel(engine.getTitaniumLevel());
    }, 100);
    return () => clearInterval(id);
  }, []);

  const bars = Math.round(level * 20);

  return (
    <PanelShell
      title="TITANIUM SYSTEM FUSE"
      subtitle="50W · Monitoring tap only · NOT in signal path"
      onClose={onClose}
      data-ocid="titaniumfuse.dialog"
    >
      <div className="smd-meter text-center">
        50W · 4GA WIRE · 5,000×20 · MONITOR ONLY
      </div>
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/70 mb-2">
          SIGNAL LEVEL MONITOR
        </div>
        <div className="flex gap-0.5 h-6">
          {BAR_IDS.map((id, barPos) => (
            <div
              key={id}
              className="flex-1 rounded-sm transition-all"
              style={{
                background:
                  barPos < bars
                    ? barPos > 16
                      ? "#ef4444"
                      : barPos > 12
                        ? "#f59e0b"
                        : "#4ade80"
                    : "rgba(255,255,255,0.05)",
              }}
            />
          ))}
        </div>
        <div className="text-xs font-mono text-foreground/50 mt-1 text-center">
          {(level * 100).toFixed(1)}%
        </div>
      </div>
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          masterGain → AnalyserNode (monitoring only)
          <br />
          titaniumAnalyser does NOT connect downstream
          <br />
          NOT in signal path · NOT on bass path
          <br />
          Holds up to 5,000 features of load
        </div>
      </div>
    </PanelShell>
  );
}
