import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function EpicenterPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [depth, setDepth] = useState(0);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setEpicenter(v, depth);
  };
  const setD = (v: number) => {
    setDepth(v);
    engine.setEpicenter(enabled, v);
  };

  return (
    <PanelShell
      title="EPICENTER"
      subtitle="32Hz · Foundation bass hold"
      onClose={onClose}
      data-ocid="epicenter.dialog"
    >
      <div className="smd-meter text-center">
        BASS EPICENTER · 32Hz PEAKING · AUTO
      </div>
      <AmpToggle
        label="Epicenter"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="epicenter.toggle"
      />
      <AmpSlider
        label="DEPTH"
        value={depth}
        min={0}
        max={12}
        step={0.5}
        unit="dB"
        color="#f97316"
        onChange={setD}
        data-ocid="epicenter.depth.input"
      />
      <div className="text-xs text-foreground/40 text-center font-mono">
        Holds bass foundation on every note
      </div>
    </PanelShell>
  );
}
