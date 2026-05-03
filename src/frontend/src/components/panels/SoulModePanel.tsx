import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function SoulModePanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [depth, setDepth] = useState(0);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setSoulMode(v, depth);
  };
  const setD = (v: number) => {
    setDepth(v);
    engine.setSoulMode(enabled, v);
  };

  return (
    <PanelShell
      title="SOUL MODE"
      subtitle="200–400Hz harmonic resonance"
      onClose={onClose}
      data-ocid="soulmode.dialog"
    >
      <div className="smd-meter text-center">
        MIDS RESONANCE · 300Hz PEAKING · SOUL
      </div>
      <AmpToggle
        label="Soul Mode"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="soulmode.toggle"
      />
      <AmpSlider
        label="SOUL DEPTH"
        value={depth}
        min={0}
        max={12}
        step={0.5}
        unit="dB"
        color="#c084fc"
        onChange={setD}
        data-ocid="soulmode.depth.input"
      />
      <div className="text-xs text-foreground/40 text-center font-mono">
        Preserves harmonics in mids · Always has soul even without bass
      </div>
    </PanelShell>
  );
}
