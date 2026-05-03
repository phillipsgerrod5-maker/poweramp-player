import { engine } from "@/audio/engine";
import { useState } from "react";
import { AmpSlider, AmpToggle, PanelShell } from "./PanelShell";

type Channel = "bass" | "mids" | "highs" | "tweeters";

const CHANNEL_CONFIG = {
  bass: {
    label: "BASS CHANNEL",
    freq: "14–50Hz",
    watts: "20,000W",
    color: "#f97316",
  },
  mids: {
    label: "MIDS CHANNEL",
    freq: "200Hz–4kHz",
    watts: "15,000W",
    color: "#6a9eff",
  },
  highs: {
    label: "HIGHS CHANNEL",
    freq: "4kHz–8kHz",
    watts: "12,000W",
    color: "#c084fc",
  },
  tweeters: {
    label: "TWEETERS CHANNEL",
    freq: "8kHz+",
    watts: "8,000W",
    color: "#4fd1c5",
  },
};

interface Props {
  channel: Channel;
  onClose: () => void;
}

export function ChannelPanel({ channel, onClose }: Props) {
  const cfg = CHANNEL_CONFIG[channel];
  const [enabled, setEnabled] = useState(channel !== "bass");
  const [gain, setGain] = useState(channel === "bass" ? 0 : 70);

  const toggle = (v: boolean) => {
    setEnabled(v);
    if (channel === "bass") engine.setBassEnabled(v);
    else if (channel === "mids") engine.setMidsEnabled(v);
    else if (channel === "highs") engine.setHighsEnabled(v);
    else engine.setTweetersEnabled(v);
  };

  const setG = (v: number) => {
    setGain(v);
    if (channel === "bass") engine.setBassGain(v);
  };

  return (
    <PanelShell
      title={cfg.label}
      subtitle={`${cfg.freq} · ${cfg.watts} · 4GA WIRE`}
      onClose={onClose}
      data-ocid={`${channel}.dialog`}
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="slot-panel text-center">
          <div className="text-xs text-foreground/50 font-mono">FREQ</div>
          <div className="text-sm font-mono" style={{ color: cfg.color }}>
            {cfg.freq}
          </div>
        </div>
        <div className="slot-panel text-center">
          <div className="text-xs text-foreground/50 font-mono">POWER</div>
          <div className="text-sm font-mono" style={{ color: cfg.color }}>
            {cfg.watts}
          </div>
        </div>
        <div className="slot-panel text-center">
          <div className="text-xs text-foreground/50 font-mono">STATE</div>
          <div
            className="text-sm font-mono"
            style={{ color: enabled ? "#4ade80" : "#6b7280" }}
          >
            {enabled ? "LIVE" : "MUTED"}
          </div>
        </div>
      </div>
      <AmpToggle
        label="Channel"
        enabled={enabled}
        onToggle={toggle}
        data-ocid={`${channel}.toggle`}
      />
      {channel === "bass" && (
        <AmpSlider
          label="BASS GAIN (starts at 0)"
          value={gain}
          min={0}
          max={100}
          color={cfg.color}
          onChange={setG}
          data-ocid="bass.gain.input"
        />
      )}
      <div className="text-xs text-foreground/40 text-center font-mono">
        Dedicated channel · Own filter · Own gain · Zero shared nodes
      </div>
    </PanelShell>
  );
}
