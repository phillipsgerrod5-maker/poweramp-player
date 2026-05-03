import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function CheaterBeaterPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [depth, setDepth] = useState(0);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setCheaterBeater(v, depth);
  };
  const setD = (v: number) => {
    setDepth(v);
    engine.setCheaterBeater(enabled, v);
  };

  return (
    <PanelShell
      title="CHEATER BEATER"
      subtitle="33Hz · Mutually exclusive with 14-50Hz"
      onClose={onClose}
      data-ocid="cheaterbeater.dialog"
    >
      <div className="smd-meter text-center">
        {enabled ? "33Hz SUB FOUNDATION — ACTIVE" : "14–50Hz STANDARD — ACTIVE"}
      </div>
      <AmpToggle
        label="Cheater Beater"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="cheaterbeater.toggle"
      />
      <AmpSlider
        label="SUB DEPTH"
        value={depth}
        min={0}
        max={12}
        step={0.5}
        unit="dB"
        color="#f97316"
        onChange={setD}
        data-ocid="cheaterbeater.depth.input"
      />
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          🔗 Reference: Headphone Activist — Cloud City [Bass Boosted]
          <br />
          33Hz sub foundation · When ON, bass filter moves to 33Hz · Mutually
          exclusive
        </div>
      </div>
    </PanelShell>
  );
}
