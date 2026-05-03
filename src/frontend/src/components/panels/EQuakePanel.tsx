import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function EQuakePanel({ onClose }: Props) {
  const [depth, setDepth] = useState(0);

  const setD = (v: number) => {
    setDepth(v);
    engine.setEQuake(v);
  };

  return (
    <PanelShell
      title="E-QUAKE"
      subtitle="Sub-bass earthquake effect · 20Hz"
      onClose={onClose}
      data-ocid="equake.dialog"
    >
      <div className="smd-meter text-center">
        EARTHQUAKE BASS · 20Hz · WIRED
      </div>
      <AmpSlider
        label="EARTHQUAKE DEPTH"
        value={depth}
        min={0}
        max={100}
        color="#ef4444"
        onChange={setD}
        data-ocid="equake.depth.input"
      />
      <div className="text-xs text-foreground/40 text-center font-mono">
        0 = off · 100 = full sub-quake · Real GainNode on bass channel
      </div>
    </PanelShell>
  );
}
