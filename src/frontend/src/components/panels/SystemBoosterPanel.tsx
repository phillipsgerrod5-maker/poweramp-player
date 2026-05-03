import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function SystemBoosterPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setSystemBooster(v);
  };

  return (
    <PanelShell
      title="SYSTEM BOOSTER"
      subtitle="×1.380 isolated · Own power · Boost 19/20"
      onClose={onClose}
      data-ocid="systembooster.dialog"
    >
      <div className="smd-meter text-center">
        {enabled ? "×1.380 BOOST — ACTIVE" : "×1.0 UNITY — BYPASSED"}
      </div>
      <AmpToggle
        label="System Booster"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="systembooster.toggle"
      />
      <div className="slot-panel flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">
            BOOST FACTOR
          </span>
          <span className="text-xs font-mono text-green-400">
            {enabled ? "×1.380" : "×1.0 (unity)"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">
            POWER SOURCE
          </span>
          <span className="text-xs font-mono text-blue-400">
            ISOLATED · OWN POWER
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">
            DRAWS FROM CHAIN
          </span>
          <span className="text-xs font-mono text-green-400">NEVER</span>
        </div>
      </div>
      <div className="text-xs text-foreground/40 text-center font-mono">
        Self-contained · Never draws from main power chain
      </div>
    </PanelShell>
  );
}
