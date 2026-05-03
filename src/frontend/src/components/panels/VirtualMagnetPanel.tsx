import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function VirtualMagnetPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [depth, setDepth] = useState(0);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setVirtualMagnet(v, depth);
  };
  const setD = (v: number) => {
    setDepth(v);
    engine.setVirtualMagnet(enabled, v);
  };

  return (
    <PanelShell
      title="VIRTUAL MAGNET"
      subtitle="LFO modulation · Bass only · 50Hz crossover wall"
      onClose={onClose}
      data-ocid="virtualmagnet.dialog"
    >
      <div className="smd-meter text-center">
        0.5Hz LFO · BASS ONLY · NO DESTINATION
      </div>
      <AmpToggle
        label="Virtual Magnet"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="virtualmagnet.toggle"
      />
      <AmpSlider
        label="MAGNET DEPTH"
        value={depth}
        min={0}
        max={100}
        unit="%"
        color="#f59e0b"
        onChange={setD}
        data-ocid="virtualmagnet.depth.input"
      />
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          OscillatorNode → depthGain → bassGain.gain (AudioParam modulation)
          <br />
          Never connects to destination · Bass only, never highs/mids
        </div>
      </div>
    </PanelShell>
  );
}
