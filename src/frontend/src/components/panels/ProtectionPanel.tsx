import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function ProtectionPanel({ onClose }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [distortion, setDistortion] = useState(50);
  const [clipping, setClipping] = useState(50);
  const [particle, setParticle] = useState(50);

  const toggle = (v: boolean) => {
    setEnabled(v);
    engine.setProtectionEnabled(v);
  };
  const setD = (v: number) => {
    setDistortion(v);
    engine.setDistortionClean(v);
  };
  const setC = (v: number) => {
    setClipping(v);
    engine.setClippingControl(v);
  };
  const setP = (v: number) => {
    setParticle(v);
    engine.setParticleBreakdown(v);
  };

  return (
    <PanelShell
      title="PROTECTION SYSTEM"
      subtitle="New Protection · Particle-level cleaning"
      onClose={onClose}
      data-ocid="protection.dialog"
    >
      <div className="smd-meter text-center">
        {enabled ? "✅ ACTIVE — SIGNAL PROTECTED" : "⚠️ BYPASSED — RAW SIGNAL"}
      </div>
      <AmpToggle
        label="Protection"
        enabled={enabled}
        onToggle={toggle}
        data-ocid="protection.toggle"
      />
      <AmpSlider
        label="DISTORTION CLEAN"
        value={distortion}
        min={0}
        max={100}
        onChange={setD}
        data-ocid="protection.distortion.input"
      />
      <AmpSlider
        label="CLIPPING CONTROL"
        value={clipping}
        min={0}
        max={100}
        color="#f87171"
        onChange={setC}
        data-ocid="protection.clipping.input"
      />
      <AmpSlider
        label="PARTICLE BREAKDOWN"
        value={particle}
        min={0}
        max={100}
        color="#a78bfa"
        onChange={setP}
        data-ocid="protection.particle.input"
      />
      <div className="text-xs text-foreground/40 text-center font-mono">
        Tough by default · Never chokes volume · No hard limiter
      </div>
    </PanelShell>
  );
}
