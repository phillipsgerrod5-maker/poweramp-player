import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function SoundBeamingPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [intensity, setIntensity] = useState(50);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setSoundBeaming(v, intensity);
  };
  const setI = (v: number) => {
    setIntensity(v);
    engine.setSoundBeaming(enabled, v);
  };

  return (
    <PanelShell
      title="SOUND BEAMING"
      subtitle="4 PannerNodes · HRTF · Additive tap"
      onClose={onClose}
      data-ocid="soundbeaming.dialog"
    >
      <div className="smd-meter text-center">
        L / R / FRONT / REAR · HRTF BEAM · ADDITIVE
      </div>
      <AmpToggle
        label="Sound Beaming"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="soundbeaming.toggle"
      />
      <AmpSlider
        label="BEAM INTENSITY"
        value={intensity}
        min={0}
        max={100}
        unit="%"
        color="#38bdf8"
        onChange={setI}
        data-ocid="soundbeaming.intensity.input"
      />
      <div className="slot-panel">
        <div className="text-xs font-mono text-foreground/60">
          ⚡ ADDITIVE TAP: channelMerger → 4 PannerNodes → beamMergeGain →
          destination
          <br />
          Never intercepts main signal path · beamMergeGain is permanent class
          property
        </div>
      </div>
    </PanelShell>
  );
}
