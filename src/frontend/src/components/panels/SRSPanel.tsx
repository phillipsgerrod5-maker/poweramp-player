import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function SRSPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [wet, setWet] = useState(30);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setSRS(v, wet);
  };
  const setW = (v: number) => {
    setWet(v);
    engine.setSRS(enabled, v);
  };

  return (
    <PanelShell
      title="SRS HD 9.0"
      subtitle="Room convolver · Smooth tweeters · VR depth"
      onClose={onClose}
      data-ocid="srs.dialog"
    >
      <div className="smd-meter text-center">
        SRS HD 9.0 · CONVOLVER · ROOM IR
      </div>
      <AmpToggle
        label="SRS HD 9.0"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="srs.toggle"
      />
      <AmpSlider
        label="WET MIX"
        value={wet}
        min={0}
        max={50}
        unit="%"
        color="#4fd1c5"
        onChange={setW}
        data-ocid="srs.wet.input"
      />
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          SNR &gt;110dB · THD &lt;0.01% · Smooth tweeters · Sound projects
          outside speaker
        </div>
      </div>
    </PanelShell>
  );
}
