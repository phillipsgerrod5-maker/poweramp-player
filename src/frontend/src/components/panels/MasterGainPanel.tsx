import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function MasterGainPanel({ onClose }: Props) {
  const [gain, setGain] = useState(70);

  const setG = (v: number) => {
    setGain(v);
    engine.setMasterGain(v);
  };

  return (
    <PanelShell
      title="MASTER GAIN"
      subtitle="End of chain · Non-zero floor"
      onClose={onClose}
      data-ocid="mastergain.dialog"
    >
      <div className="smd-meter text-center">
        FINAL STAGE · BEFORE DESTINATION
      </div>
      <AmpSlider
        label="MASTER GAIN"
        value={gain}
        min={0}
        max={100}
        unit="%"
        color="#00d5ff"
        onChange={setG}
        data-ocid="mastergain.input"
      />
      <div className="slot-panel">
        <div className="flex justify-between">
          <span className="text-xs font-mono text-foreground/70">
            CHAIN POSITION
          </span>
          <span className="text-xs font-mono text-blue-400">
            systemBooster → masterGain → destination
          </span>
        </div>
      </div>
    </PanelShell>
  );
}
