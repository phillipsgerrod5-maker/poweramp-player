import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function AtmosmasherePanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [wet, setWet] = useState(40);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setAtmos(v, wet);
  };
  const setW = (v: number) => {
    setWet(v);
    engine.setAtmos(enabled, v);
  };

  return (
    <PanelShell
      title="ATMOSMASHERE"
      subtitle="3D Spatial · Additive tap · No cyclic loop"
      onClose={onClose}
      data-ocid="atmosmashere.dialog"
    >
      <div className="smd-meter text-center">
        SPATIAL 3D · CONVOLVER · ADDITIVE TAP
      </div>
      <AmpToggle
        label="Atmosmashere"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="atmosmashere.toggle"
      />
      <AmpSlider
        label="WET MIX"
        value={wet}
        min={0}
        max={60}
        unit="%"
        color="#818cf8"
        onChange={setW}
        data-ocid="atmosmashere.wet.input"
      />
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          ⚡ ADDITIVE TAP: channelMerger → ConvolverNode → atmosWetGain →
          destination
          <br />
          Dry signal flows through main chain uninterrupted · Zero cyclic loop
          risk
        </div>
      </div>
    </PanelShell>
  );
}
