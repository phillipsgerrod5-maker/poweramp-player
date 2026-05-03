import { engine } from "@/audio/engine";
import type { PanelId } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { AtmosmasherePanel } from "./panels/AtmosmasherePanel";
import { AudioBufferPanel } from "./panels/AudioBufferPanel";
import { BassSwitchPanel } from "./panels/BassSwitchPanel";
import { CachePanel } from "./panels/CachePanel";
import { ChannelPanel } from "./panels/ChannelPanel";
import { ChatBlockPanel } from "./panels/ChatBlockPanel";
import { CheaterBeaterPanel } from "./panels/CheaterBeaterPanel";
import { ClassicalTrackPanel } from "./panels/ClassicalTrackPanel";
import { CommanderPanel } from "./panels/CommanderPanel";
import { EQPanel } from "./panels/EQPanel";
import { EQuakePanel } from "./panels/EQuakePanel";
import { EpicenterAutoPanel } from "./panels/EpicenterAutoPanel";
import { EpicenterPanel } from "./panels/EpicenterPanel";
import { FreqMatchPanel } from "./panels/FreqMatchPanel";
import { MasterGainPanel } from "./panels/MasterGainPanel";
import { NaturalBottomPanel } from "./panels/NaturalBottomPanel";
import { ProtectionPanel } from "./panels/ProtectionPanel";
import { SRSPanel } from "./panels/SRSPanel";
import { Scanner99Panel } from "./panels/Scanner99Panel";
import { SoulModePanel } from "./panels/SoulModePanel";
import { SoundBeamingPanel } from "./panels/SoundBeamingPanel";
import { SystemBoosterPanel } from "./panels/SystemBoosterPanel";
import { TitaniumFusePanel } from "./panels/TitaniumFusePanel";
import { TrackTesterPanel } from "./panels/TrackTesterPanel";
import { UltraCrystalPanel } from "./panels/UltraCrystalPanel";
import { VirtualMagnetPanel } from "./panels/VirtualMagnetPanel";
import { XMProcessorPanel } from "./panels/XMProcessorPanel";

// ── HEAD UNIT TILE CONFIG ──────────────────────────────────────────────────
type TileConfig = {
  id: PanelId;
  label: string;
  sub: string;
  icon: string;
  color: string;
  glow: string;
  group: "channel" | "eq" | "bass" | "spatial" | "system" | "story" | "diykit";
  locked?: boolean;
};

const ALL_TILES: TileConfig[] = [
  // Channels — top row, prominent
  {
    id: "bass",
    label: "BASS",
    sub: "14–50Hz",
    icon: "🔊",
    color: "#f97316",
    glow: "rgba(249,115,22,0.6)",
    group: "channel",
  },
  {
    id: "mids",
    label: "MIDS",
    sub: "200Hz–4kHz",
    icon: "🎚",
    color: "#6a9eff",
    glow: "rgba(106,158,255,0.6)",
    group: "channel",
  },
  {
    id: "highs",
    label: "HIGHS",
    sub: "4kHz–8kHz",
    icon: "🎵",
    color: "#c084fc",
    glow: "rgba(192,132,252,0.6)",
    group: "channel",
  },
  {
    id: "tweeters",
    label: "TWEETERS",
    sub: "8kHz+",
    icon: "📡",
    color: "#4fd1c5",
    glow: "rgba(79,209,197,0.6)",
    group: "channel",
  },
  // EQ & Processing
  {
    id: "eq",
    label: "EQ",
    sub: "6 Band ±12dB",
    icon: "🎛",
    color: "#00d5ff",
    glow: "rgba(0,213,255,0.6)",
    group: "eq",
  },
  {
    id: "protection",
    label: "PROTECT",
    sub: "Particle",
    icon: "🛡",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.6)",
    group: "eq",
  },
  {
    id: "mastergain",
    label: "GAIN",
    sub: "Master",
    icon: "⚡",
    color: "#00d5ff",
    glow: "rgba(0,213,255,0.6)",
    group: "eq",
  },
  {
    id: "xmprocessor",
    label: "XM PROC",
    sub: "24dB/oct",
    icon: "📻",
    color: "#34d399",
    glow: "rgba(52,211,153,0.6)",
    group: "eq",
  },
  // Bass Features
  {
    id: "epicenter",
    label: "EPICNTR",
    sub: "32Hz Auto",
    icon: "💥",
    color: "#f97316",
    glow: "rgba(249,115,22,0.6)",
    group: "bass",
  },
  {
    id: "cheaterbeater",
    label: "CHEATER",
    sub: "33Hz",
    icon: "🏆",
    color: "#fb923c",
    glow: "rgba(251,146,60,0.6)",
    group: "bass",
  },
  {
    id: "equake",
    label: "E-QUAKE",
    sub: "20Hz Sub",
    icon: "🌊",
    color: "#dc2626",
    glow: "rgba(220,38,38,0.6)",
    group: "bass",
  },
  {
    id: "naturalbottom",
    label: "NAT BTM",
    sub: "60Hz Always",
    icon: "🎸",
    color: "#ea580c",
    glow: "rgba(234,88,12,0.6)",
    group: "bass",
  },
  // Spatial & Effects
  {
    id: "soulmode",
    label: "SOUL MODE",
    sub: "300Hz Mids",
    icon: "🎙",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.6)",
    group: "spatial",
  },
  {
    id: "atmosmashere",
    label: "ATMOSM",
    sub: "3D Spatial",
    icon: "🌐",
    color: "#818cf8",
    glow: "rgba(129,140,248,0.6)",
    group: "spatial",
  },
  {
    id: "srs",
    label: "SRS HD 9.0",
    sub: "Convolver",
    icon: "🔮",
    color: "#4fd1c5",
    glow: "rgba(79,209,197,0.6)",
    group: "spatial",
  },
  {
    id: "soundbeaming",
    label: "BEAM",
    sub: "HRTF",
    icon: "📶",
    color: "#38bdf8",
    glow: "rgba(56,189,248,0.6)",
    group: "spatial",
  },
  // System
  {
    id: "virtualmagnet",
    label: "V-MAGNET",
    sub: "0.5Hz LFO",
    icon: "🧲",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.6)",
    group: "system",
  },
  {
    id: "systembooster",
    label: "SYS BOOST",
    sub: "×1.380 ISO",
    icon: "🚀",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.6)",
    group: "system",
  },
  {
    id: "titaniumfuse",
    label: "TI FUSE",
    sub: "50W Monitor",
    icon: "🔌",
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.6)",
    group: "system",
  },
  {
    id: "commander",
    label: "COMMANDER",
    sub: "1000 Hist",
    icon: "🖥",
    color: "#7c3aed",
    glow: "rgba(124,58,237,0.6)",
    group: "system",
  },
  {
    id: "scanner99",
    label: "SCANNER",
    sub: "20-pt Diag",
    icon: "🔬",
    color: "#0ea5e9",
    glow: "rgba(14,165,233,0.6)",
    group: "system",
  },
  {
    id: "trackTester",
    label: "RESTORE",
    sub: "Universal",
    icon: "✅",
    color: "#00ff88",
    glow: "rgba(0,255,136,0.6)",
    group: "system",
  },
  // Story / Credits
  {
    id: null,
    label: "STORY",
    sub: "Credits",
    icon: "★",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.6)",
    group: "story",
  },
  // System — Cache tile
  {
    id: "cache",
    label: "CACHE",
    sub: "Clear Data",
    icon: "🗑️",
    color: "#94a3b8",
    glow: "rgba(148,163,184,0.5)",
    group: "system",
  },
  // DIY KIT — Locked Features (7 items)
  {
    id: "classicalTrack",
    label: "CLASSICAL",
    sub: "Auto-Test",
    icon: "🎵",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.5)",
    group: "diykit" as const,
    locked: true,
  },
  {
    id: "bassSwitch",
    label: "BASS SWTCH",
    sub: "Note Detect",
    icon: "🎚️",
    color: "#f97316",
    glow: "rgba(249,115,22,0.5)",
    group: "diykit" as const,
    locked: true,
  },
  {
    id: "epicenterAuto",
    label: "EPICNTR AUTO",
    sub: "14-20Hz Chips",
    icon: "🌊",
    color: "#60a5fa",
    glow: "rgba(96,165,250,0.5)",
    group: "diykit" as const,
    locked: true,
  },
  {
    id: "freqMatch",
    label: "FREQ MATCH",
    sub: "10+10 Profiles",
    icon: "🔄",
    color: "#34d399",
    glow: "rgba(52,211,153,0.5)",
    group: "diykit" as const,
    locked: true,
  },
  {
    id: "ultraCrystal",
    label: "ULTRA XTAL",
    sub: "Clarity Proc",
    icon: "💎",
    color: "#c084fc",
    glow: "rgba(192,132,252,0.5)",
    group: "diykit" as const,
    locked: true,
  },
  {
    id: "audioBuffer",
    label: "AUDIO BUF",
    sub: "Spike Guard",
    icon: "⚡",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.5)",
    group: "diykit" as const,
    locked: true,
  },
  {
    id: "chatBlock",
    label: "CHAT BLOCK",
    sub: "Page Lock",
    icon: "🔐",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.5)",
    group: "diykit" as const,
    locked: true,
  },
];

const GROUP_LABELS: Record<string, string> = {
  channel: "CHANNELS",
  eq: "EQ & PROCESSING",
  bass: "BASS SYSTEM",
  spatial: "SPATIAL & EFFECTS",
  system: "SYSTEM",
  story: "STORY",
  diykit: "DIY KIT — LOCKED FEATURES",
};

// ── LED DOT ───────────────────────────────────────────────────────────────
function LED({ active, color }: { active: boolean; color: string }) {
  return (
    <span
      className="led-dot"
      style={{
        background: active ? color : "rgba(255,255,255,0.1)",
        boxShadow: active ? `0 0 5px ${color}, 0 0 10px ${color}` : "none",
      }}
    />
  );
}

// ── DIGITAL CLOCK ─────────────────────────────────────────────────────────
function DigitalClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);
  return <span className="hu-clock">{time}</span>;
}

// ── MARQUEE ───────────────────────────────────────────────────────────────
function Marquee({ text }: { text: string }) {
  return (
    <div className="overflow-hidden flex-1 min-w-0">
      <div
        className="whitespace-nowrap font-mono text-sm tracking-wider"
        style={{
          color: "#00e5ff",
          textShadow: "0 0 8px rgba(0,229,255,0.6)",
          animation:
            text.length > 22 ? "marquee-scroll 10s linear infinite" : undefined,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ── HEAD UNIT TILE ────────────────────────────────────────────────────────
function HUTile({
  tile,
  isActive,
  onClick,
  isChannel,
}: {
  tile: TileConfig;
  isActive: boolean;
  onClick: () => void;
  isChannel: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={tile.id ? `tile.${tile.id}` : "tile.story"}
      className={`hu-tile${isChannel ? " hu-tile-channel" : ""}${isActive ? " hu-tile-active" : ""}${tile.locked ? " hu-tile-locked" : ""}`}
      style={
        {
          "--tile-color": tile.color,
          "--tile-glow": tile.glow,
        } as React.CSSProperties
      }
      aria-label={`Open ${tile.label}`}
    >
      {tile.locked && <span className="hu-tile-lock-badge">🔒</span>}
      <div className="hu-tile-icon" style={{ color: tile.color }}>
        {tile.icon}
      </div>
      <div className="hu-tile-info">
        <div className="hu-tile-label">{tile.label}</div>
        <div className="hu-tile-sub">{tile.sub}</div>
        {isActive && <div className="hu-tile-active-bar" />}
      </div>
      <LED active={isActive} color={tile.color} />
    </button>
  );
}

// ── CINEMATIC CREDITS ─────────────────────────────────────────────────────
function CinematicCredits({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const lines = [
      "Welcome to PowerAmp Player.",
      "Engineered, produced, and designed by Gerrod.",
      "This system was built from the ground up — every wire, every channel, every feature.",
      "Four dedicated engines.",
      "The Master Commander Unit.",
      "Universal Restore App Testing.",
      "A system built to last.",
      "12-Layer Power Chain. 960,000 Watts total.",
      "Bass. Mids. Highs. Tweeters.",
      "Epicenter. Cheater Beater. E-Quake.",
      "Atmosmashere. S R S H D 9.0. X M Processor.",
      "Sound Beaming. Virtual Magnet. System Booster.",
      "Master Commander. 99.0 Scanner.",
      "4 Gauge Wire. A P I. H T M L. Chainblock.",
      "Audio plays on app page only.",
      "Every feature truly wired to the signal chain.",
    ];
    let index = 0;
    const speakNext = () => {
      if (index >= lines.length) return;
      const utterance = new SpeechSynthesisUtterance(lines[index]);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => {
        index++;
        speakNext();
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000008" }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-foreground/40 hover:text-foreground text-2xl z-10"
        aria-label="Close credits"
        data-ocid="credits.close_button"
      >
        ✕
      </button>
      <div className="flex-1 overflow-hidden relative flex items-center justify-center">
        <div className="animate-credits-scroll credits-scroll-container">
          <div className="text-6xl text-center">⚡</div>
          <h1
            className="text-2xl font-mono font-bold text-glow text-center"
            style={{ color: "#00d5ff" }}
          >
            POWERAMP PLAYER
          </h1>
          <p className="credits-line font-mono text-foreground/60">
            Engineered by Gerrod
          </p>
          <div className="gauge-wire active w-32 mx-auto" />
          <p className="credits-line font-mono text-foreground/80">
            12-Layer Power Chain · 960,000W Total
          </p>
          <p className="credits-line font-mono text-foreground/60">
            Bass · Mids · Highs · Tweeters
          </p>
          <p className="credits-line font-mono text-foreground/60">
            Epicenter · Cheater Beater · E-Quake
          </p>
          <p className="credits-line font-mono text-foreground/60">
            Atmosmashere · SRS HD 9.0 · XM Processor
          </p>
          <p className="credits-line font-mono text-foreground/60">
            Sound Beaming · Virtual Magnet · System Booster
          </p>
          <p className="credits-line font-mono text-foreground/60">
            Master Commander · 99.0 Scanner
          </p>
          <div className="gauge-wire active w-32 mx-auto" />
          <p className="credits-line font-mono text-foreground/40 text-xs">
            4 Gauge Wire · API · HTML · Chainblock
          </p>
          <p className="credits-line font-mono text-foreground/40 text-xs">
            Audio plays on app page only
          </p>
          <p className="credits-line font-mono text-foreground/40 text-xs">
            Every feature truly wired to the signal chain
          </p>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export function PlayerPage() {
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackName, setTrackName] = useState("NO TRACK LOADED");
  const [frontlineVol, setFrontlineVol] = useState(490);
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [activeTiles, setActiveTiles] = useState<Set<PanelId>>(new Set());
  const [muted, setMuted] = useState(false);
  const [testStatus, setTestStatus] = useState<
    "" | "running" | "passed" | "failed"
  >("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setPlaying(engine.playing);
      if (engine.trackName) setTrackName(engine.trackName);
    }, 300);
    return () => clearInterval(id);
  }, [started]);

  const handleStart = useCallback(async () => {
    if (started || starting) return;
    setStarting(true);
    await engine.initialize();
    try {
      engine.playStartupTone();
    } catch {
      /* ignore */
    }
    setStarted(true);
    setStarting(false);
    setTimeout(async () => {
      setTestStatus("running");
      try {
        const res = await engine.runSmartTrackTest();
        if (res.passed) {
          setTestStatus("passed");
          setTimeout(() => setTestStatus(""), 3000);
        } else {
          setTestStatus("failed");
          setActivePanel("trackTester");
          setActiveTiles((prev) => {
            const n = new Set(prev);
            n.add("trackTester");
            return n;
          });
        }
      } catch {
        setTestStatus("");
      }
    }, 500);
  }, [started, starting]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      engine.loadTrack(file).then(() => {
        setTrackName(file.name.replace(/\.[^.]+$/, ""));
        setPlaying(true);
      });
      e.target.value = "";
    },
    [],
  );

  const handlePlayPause = useCallback(() => {
    if (playing) {
      engine.pause();
      setPlaying(false);
    } else {
      engine.play();
      setPlaying(true);
    }
  }, [playing]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setFrontlineVol(v);
    engine.setFrontlineVol(v);
  }, []);

  const handleVolUp = useCallback(() => {
    const v = Math.min(700, frontlineVol + 20);
    setFrontlineVol(v);
    engine.setFrontlineVol(v);
  }, [frontlineVol]);

  const handleVolDown = useCallback(() => {
    const v = Math.max(1, frontlineVol - 20);
    setFrontlineVol(v);
    engine.setFrontlineVol(v);
  }, [frontlineVol]);

  const handleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    engine.setFrontlineVol(next ? 0 : frontlineVol);
  }, [muted, frontlineVol]);

  const openPanel = useCallback((id: PanelId) => {
    setActivePanel(id);
    setActiveTiles((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
  }, []);

  const closePanel = useCallback(() => setActivePanel(null), []);

  // ── TAP TO START ──
  if (!started) {
    return (
      <div
        className="h-dvh flex flex-col items-center justify-center gap-6 px-4"
        data-ocid="start.page"
      >
        <div className="start-logo">⚡</div>
        <div className="text-center">
          <h1
            className="text-xl font-mono font-bold tracking-widest uppercase text-glow"
            style={{ color: "#00d5ff" }}
          >
            POWERAMP PLAYER
          </h1>
          <p className="text-xs font-mono text-foreground/50 mt-1">
            Engineered by Gerrod · 4 Gauge Wire · API · HTML · Chainblock
          </p>
        </div>
        <button
          type="button"
          data-ocid="start.button"
          onClick={handleStart}
          disabled={starting}
          className="start-btn"
        >
          {starting ? "STARTING…" : "TAP TO START"}
        </button>
        <p className="text-xs font-mono text-foreground/30 text-center max-w-xs">
          Tap to unlock the audio engine · Audio plays on this page only
        </p>
      </div>
    );
  }

  // ── MAIN PLAYER — HEAD UNIT LAYOUT ──
  return (
    <div
      className="h-dvh flex overflow-hidden player-root"
      data-ocid="player.page"
    >
      {/* LEFT CONTROL STRIP */}
      <div className="hu-control-strip" data-ocid="player.control_strip">
        {/* Logo */}
        <div className="hu-strip-logo">⚡</div>

        <div className="hu-strip-divider" />

        {/* Volume Up */}
        <button
          type="button"
          className="hu-strip-btn"
          onClick={handleVolUp}
          aria-label="Volume Up"
          data-ocid="player.vol_up_button"
        >
          <span className="hu-strip-icon">+</span>
          <span className="hu-strip-label">VOL</span>
        </button>

        {/* Volume Down */}
        <button
          type="button"
          className="hu-strip-btn"
          onClick={handleVolDown}
          aria-label="Volume Down"
          data-ocid="player.vol_down_button"
        >
          <span className="hu-strip-icon">−</span>
          <span className="hu-strip-label">VOL</span>
        </button>

        {/* Mute */}
        <button
          type="button"
          className={`hu-strip-btn${muted ? " hu-strip-btn-active" : ""}`}
          onClick={handleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          data-ocid="player.mute_button"
        >
          <span className="hu-strip-icon">{muted ? "🔇" : "🔊"}</span>
          <span className="hu-strip-label">{muted ? "MUTE" : "SND"}</span>
        </button>

        <div className="hu-strip-divider" />

        {/* EQ / DSP */}
        <button
          type="button"
          className="hu-strip-btn"
          onClick={() => openPanel("eq")}
          aria-label="Open EQ"
          data-ocid="tile.eq.strip"
        >
          <span className="hu-strip-icon">🎛</span>
          <span className="hu-strip-label">EQ</span>
        </button>

        {/* Credits / Story */}
        <button
          type="button"
          className="hu-strip-btn"
          onClick={() => setShowCredits(true)}
          aria-label="Open Story"
          data-ocid="credits.open_modal_button"
        >
          <span className="hu-strip-icon">★</span>
          <span className="hu-strip-label">STORY</span>
        </button>

        <div className="hu-strip-spacer" />

        {/* Engine status dot */}
        <div
          className="hu-strip-status-dot"
          style={{
            background:
              engine.getContextState() === "running" ? "#4ade80" : "#fbbf24",
            boxShadow:
              engine.getContextState() === "running"
                ? "0 0 6px #4ade80"
                : "0 0 6px #fbbf24",
          }}
        />
      </div>

      {/* MAIN AREA */}
      <div className="hu-main">
        {/* TOP VOLUME BAR */}
        <div className="hu-vol-bar" data-ocid="player.vol_bar">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            data-ocid="player.file_input"
            onChange={handleFileChange}
            aria-label="Load audio track"
          />
          <button
            type="button"
            data-ocid="player.load_button"
            onClick={() => fileRef.current?.click()}
            className="hu-load-btn hu-load-btn-top"
          >
            📂 LOAD TRACK
          </button>
          <div className="hu-vol-bar-center">
            <span className="hu-vol-bar-label">FRONTLINE VOLUME</span>
            <input
              type="range"
              className="blue-slider hu-vol-bar-slider"
              min={1}
              max={700}
              step={1}
              value={frontlineVol}
              onChange={handleVolume}
              data-ocid="player.frontline_vol.input"
              aria-label="Frontline Volume"
            />
          </div>
          <span className="hu-vol-bar-val">{frontlineVol}</span>
        </div>

        {/* TOP BAR */}
        <div className="hu-topbar" data-ocid="player.transport_bar">
          {/* Settings / Source label */}
          <button
            type="button"
            className="hu-topbar-gear"
            onClick={() => openPanel("commander")}
            aria-label="Commander"
            data-ocid="tile.commander.top"
          >
            ⚙
          </button>
          {/* App name */}
          <div className="hu-topbar-title">
            <span className="hu-topbar-brand">POWERAMP</span>
            <span className="hu-topbar-sub">by Gerrod</span>
          </div>
          {/* Clock */}
          <DigitalClock />
        </div>

        {/* TEST STATUS BANNER */}
        {testStatus !== "" && (
          <div
            className="test-banner"
            data-ocid="track_tester.status_banner"
            style={{
              background:
                testStatus === "running"
                  ? "rgba(0,80,200,0.2)"
                  : testStatus === "passed"
                    ? "rgba(0,120,60,0.25)"
                    : "rgba(180,30,30,0.25)",
              borderBottomColor:
                testStatus === "running"
                  ? "rgba(0,150,255,0.3)"
                  : testStatus === "passed"
                    ? "rgba(0,200,100,0.4)"
                    : "rgba(255,80,80,0.4)",
            }}
          >
            <span
              className="text-xs font-mono"
              style={{
                color:
                  testStatus === "running"
                    ? "#60a5fa"
                    : testStatus === "passed"
                      ? "#4ade80"
                      : "#fca5a5",
              }}
            >
              {testStatus === "running" &&
                "⟳ Running track test through full pipeline…"}
              {testStatus === "passed" &&
                "✓ Chain confirmed — all engines ready"}
              {testStatus === "failed" &&
                "⚠ Issues found — opening Track Tester"}
            </span>
          </div>
        )}

        {/* TILE GRID — grouped sections */}
        <div className="hu-grid-scroll" data-ocid="player.tile_grid">
          {(
            [
              "channel",
              "eq",
              "bass",
              "spatial",
              "system",
              "story",
              "diykit",
            ] as const
          ).map((group) => {
            const tiles = ALL_TILES.filter((t) => t.group === group);
            if (!tiles.length) return null;
            return (
              <div key={group} className="hu-group">
                <div className="hu-group-header">
                  <span>{GROUP_LABELS[group]}</span>
                  <div className="hu-group-line" />
                </div>
                <div
                  className={`hu-tile-grid${group === "channel" ? " hu-tile-grid-channels" : ""}`}
                >
                  {tiles.map((tile) => (
                    <HUTile
                      key={String(tile.id)}
                      tile={tile}
                      isActive={tile.id !== null && activeTiles.has(tile.id)}
                      isChannel={group === "channel"}
                      onClick={() => {
                        if (tile.id === null) {
                          setShowCredits(true);
                        } else {
                          openPanel(tile.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM PLAYER BAR */}
        <div className="hu-player-bar" data-ocid="player.bottom_bar">
          {/* Play/Pause */}
          <button
            type="button"
            data-ocid="player.play_button"
            onClick={handlePlayPause}
            className={`hu-play-btn${playing ? " hu-play-btn-active" : ""}`}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "⏸" : "▶"}
          </button>

          {/* Track name */}
          <div className="hu-track-display">
            <span className="hu-track-label">TRACK</span>
            <Marquee text={trackName} />
          </div>

          {/* Engine status */}
          <div
            className="hu-engine-status"
            style={{
              color:
                engine.getContextState() === "running" ? "#4ade80" : "#fbbf24",
              textShadow:
                engine.getContextState() === "running"
                  ? "0 0 6px #4ade80"
                  : "0 0 6px #fbbf24",
            }}
          >
            ENGINE {engine.getContextState().toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── PANELS ── */}
      {activePanel === "bass" && (
        <ChannelPanel channel="bass" onClose={closePanel} />
      )}
      {activePanel === "mids" && (
        <ChannelPanel channel="mids" onClose={closePanel} />
      )}
      {activePanel === "highs" && (
        <ChannelPanel channel="highs" onClose={closePanel} />
      )}
      {activePanel === "tweeters" && (
        <ChannelPanel channel="tweeters" onClose={closePanel} />
      )}
      {activePanel === "eq" && <EQPanel onClose={closePanel} />}
      {activePanel === "protection" && <ProtectionPanel onClose={closePanel} />}
      {activePanel === "epicenter" && <EpicenterPanel onClose={closePanel} />}
      {activePanel === "cheaterbeater" && (
        <CheaterBeaterPanel onClose={closePanel} />
      )}
      {activePanel === "equake" && <EQuakePanel onClose={closePanel} />}
      {activePanel === "naturalbottom" && (
        <NaturalBottomPanel onClose={closePanel} />
      )}
      {activePanel === "soulmode" && <SoulModePanel onClose={closePanel} />}
      {activePanel === "atmosmashere" && (
        <AtmosmasherePanel onClose={closePanel} />
      )}
      {activePanel === "srs" && <SRSPanel onClose={closePanel} />}
      {activePanel === "xmprocessor" && (
        <XMProcessorPanel onClose={closePanel} />
      )}
      {activePanel === "soundbeaming" && (
        <SoundBeamingPanel onClose={closePanel} />
      )}
      {activePanel === "virtualmagnet" && (
        <VirtualMagnetPanel onClose={closePanel} />
      )}
      {activePanel === "systembooster" && (
        <SystemBoosterPanel onClose={closePanel} />
      )}
      {activePanel === "titaniumfuse" && (
        <TitaniumFusePanel onClose={closePanel} />
      )}
      {activePanel === "commander" && <CommanderPanel onClose={closePanel} />}
      {activePanel === "scanner99" && <Scanner99Panel onClose={closePanel} />}
      {activePanel === "mastergain" && <MasterGainPanel onClose={closePanel} />}
      {activePanel === "trackTester" && (
        <TrackTesterPanel onClose={closePanel} />
      )}
      {activePanel === "classicalTrack" && (
        <ClassicalTrackPanel onClose={closePanel} />
      )}
      {activePanel === "bassSwitch" && <BassSwitchPanel onClose={closePanel} />}
      {activePanel === "epicenterAuto" && (
        <EpicenterAutoPanel onClose={closePanel} />
      )}
      {activePanel === "freqMatch" && <FreqMatchPanel onClose={closePanel} />}
      {activePanel === "ultraCrystal" && (
        <UltraCrystalPanel onClose={closePanel} />
      )}
      {activePanel === "audioBuffer" && (
        <AudioBufferPanel onClose={closePanel} />
      )}
      {activePanel === "chatBlock" && <ChatBlockPanel onClose={closePanel} />}
      {activePanel === "cache" && <CachePanel onClose={closePanel} />}

      {showCredits && (
        <CinematicCredits onClose={() => setShowCredits(false)} />
      )}
    </div>
  );
}
