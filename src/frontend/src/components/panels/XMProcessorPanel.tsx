import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function XMProcessorPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [gain, setGain] = useState(0);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setXM(v, gain);
  };
  const setG = (v: number) => {
    setGain(v);
    engine.setXM(enabled, v);
  };

  return (
    <PanelShell
      title="XM PROCESSOR"
      subtitle="8kHz highshelf · Own power number"
      onClose={onClose}
      data-ocid="xmprocessor.dialog"
    >
      <div className="smd-meter text-center">
        XM PROCESSOR · 24dB/OCT · OWN POWER
      </div>
      <AmpToggle
        label="XM Processor"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="xmprocessor.toggle"
      />
      <AmpSlider
        label="GAIN"
        value={gain}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        color="#34d399"
        onChange={setG}
        data-ocid="xmprocessor.gain.input"
      />
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          Own dedicated power · Does not draw from main chain
          <br />
          Controls static 1–700 · 24dB/oct slope (2× highshelf)
        </div>
      </div>
    </PanelShell>
  );
}
