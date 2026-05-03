import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

interface Props {
  onClose: () => void;
}

export function EQPanel({ onClose }: Props) {
  const [bass, setBass] = useState(0);
  const [lowmid, setLowmid] = useState(0);
  const [vocals, setVocals] = useState(0);
  const [mid, setMid] = useState(0);
  const [highmid, setHighmid] = useState(0);
  const [treble, setTreble] = useState(0);

  const setB = (v: number) => {
    setBass(v);
    engine.setEQ("bass", v);
  };
  const setLM = (v: number) => {
    setLowmid(v);
    engine.setEQ("lowmid", v);
  };
  const setV = (v: number) => {
    setVocals(v);
    engine.setEQ("vocals", v);
  };
  const setM = (v: number) => {
    setMid(v);
    engine.setEQ("mid", v);
  };
  const setHM = (v: number) => {
    setHighmid(v);
    engine.setEQ("highmid", v);
  };
  const setT = (v: number) => {
    setTreble(v);
    engine.setEQ("treble", v);
  };

  return (
    <PanelShell
      title="EQ — 6 BAND"
      subtitle="API · HTML · CHAINBLOCK · 4GA WIRE"
      onClose={onClose}
      data-ocid="eq.dialog"
    >
      <div className="smd-meter text-center">6 BANDS · ±12dB · INDEPENDENT</div>
      <AmpSlider
        label="BASS 40Hz"
        value={bass}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        onChange={setB}
        data-ocid="eq.bass.input"
      />
      <AmpSlider
        label="LOW MID 250Hz"
        value={lowmid}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        color="#6a9eff"
        onChange={setLM}
        data-ocid="eq.lowmid.input"
      />
      <AmpSlider
        label="VOCALS 1kHz"
        value={vocals}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        color="#c084fc"
        onChange={setV}
        data-ocid="eq.vocals.input"
      />
      <AmpSlider
        label="MID 2kHz"
        value={mid}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        color="#6a9eff"
        onChange={setM}
        data-ocid="eq.mid.input"
      />
      <AmpSlider
        label="HIGH MID 5kHz"
        value={highmid}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        color="#4fd1c5"
        onChange={setHM}
        data-ocid="eq.highmid.input"
      />
      <AmpSlider
        label="TREBLE 10kHz"
        value={treble}
        min={-12}
        max={12}
        step={0.5}
        unit="dB"
        color="#f9a8d4"
        onChange={setT}
        data-ocid="eq.treble.input"
      />
      <div className="text-xs text-foreground/40 text-center font-mono">
        Each band independent · 50ms ramp · zero bleed
      </div>
    </PanelShell>
  );
}
