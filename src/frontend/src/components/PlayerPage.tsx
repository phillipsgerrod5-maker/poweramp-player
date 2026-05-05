import {
  Activity,
  Antenna,
  Cpu,
  Film,
  Globe,
  Music,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Shield,
  Sliders,
  Square,
  Star,
  Upload,
  Waves,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAudioEngine } from "../hooks/useAudioEngine";
import type { DrawerKey } from "../types";
import { Drawer } from "./Drawer";
import { Visualizer } from "./Visualizer";

export function PlayerPage() {
  const audio = useAudioEngine();
  const [activeDrawer, setActiveDrawer] = useState<DrawerKey>(null);
  const [clock, setClock] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Digital clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await audio.loadTrack(file);
  };

  const handlePlayPause = async () => {
    if (!audio.initialized) await audio.initEngine();
    if (audio.status.isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const openDrawer = async (key: DrawerKey) => {
    if (!audio.initialized) await audio.initEngine();
    setActiveDrawer(key);
  };

  const lights = audio.status.commanderLights;
  const isLive = audio.initialized;

  const tiles = [
    {
      key: "bass" as DrawerKey,
      label: "BASS SYSTEM",
      icon: <Waves size={32} />,
      wired: true,
    },
    {
      key: "eq" as DrawerKey,
      label: "EQ",
      icon: <Sliders size={32} />,
      wired: true,
    },
    {
      key: "protection" as DrawerKey,
      label: "PROTECTION",
      icon: <Shield size={32} />,
      wired: true,
    },
    {
      key: "bassamp" as DrawerKey,
      label: "BASSAMP",
      icon: <Zap size={32} />,
      wired: true,
    },
    {
      key: "mids" as DrawerKey,
      label: "MIDS",
      icon: <Activity size={32} />,
      wired: true,
    },
    {
      key: "highs" as DrawerKey,
      label: "HIGHS",
      icon: <Music size={32} />,
      wired: true,
    },
    {
      key: "srs" as DrawerKey,
      label: "SRS 2022",
      icon: <Star size={32} />,
      wired: true,
    },
    {
      key: "xmProcessor" as DrawerKey,
      label: "XM PROCESSOR",
      icon: <Cpu size={32} />,
      wired: true,
    },
    {
      key: "ultraCrystal" as DrawerKey,
      label: "ULTRA CRYSTAL",
      icon: <Star size={32} />,
      wired: false,
    },
    {
      key: "atmosmasphere" as DrawerKey,
      label: "ATMOSMASPHERE",
      icon: <Globe size={32} />,
      wired: false,
    },
    {
      key: "soundBeaming" as DrawerKey,
      label: "SOUND BEAMING",
      icon: <Radio size={32} />,
      wired: false,
    },
    {
      key: "virtualMagnet" as DrawerKey,
      label: "VIRTUAL MAGNET",
      icon: <Antenna size={32} />,
      wired: false,
    },
    {
      key: "diyKit1" as DrawerKey,
      label: "DIY KIT 1",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "diyKit2" as DrawerKey,
      label: "DIY KIT 2",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "diyKit3" as DrawerKey,
      label: "DIY KIT 3",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "diyKit4" as DrawerKey,
      label: "DIY KIT 4",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "diyKit5" as DrawerKey,
      label: "DIY KIT 5",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "diyKit6" as DrawerKey,
      label: "DIY KIT 6",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "diyKit7" as DrawerKey,
      label: "DIY KIT 7",
      icon: <Wrench size={32} />,
      wired: false,
    },
    {
      key: "universalRestore" as DrawerKey,
      label: "UNIVERSAL RESTORE",
      icon: <RotateCcw size={32} />,
      wired: true,
    },
    {
      key: "epicenter" as DrawerKey,
      label: "EPICENTER",
      icon: <Zap size={32} />,
      wired: true,
    },
  ];

  return (
    <div className="player-page">
      {/* Header */}
      <header className="player-header">
        <div className="header-top">
          <div className="brand">
            <Zap size={20} className="brand-icon" />
            <span className="brand-name">POWERAMP PLAYER</span>
          </div>
          <div className="digital-clock">{clock}</div>
          <button
            type="button"
            className="load-btn"
            onClick={() => fileInputRef.current?.click()}
            data-ocid="player.load_track_button"
          >
            <Upload size={16} />
            LOAD TRACK
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={handleFileLoad}
            data-ocid="player.file_input"
          />
        </div>

        {/* Frontline Volume — full width, at the top */}
        <div className="frontline-section">
          <div className="frontline-label">
            <span>FRONTLINE VOLUME</span>
            <span className="frontline-value">
              {audio.status.frontlineVolume}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={700}
            step={1}
            value={audio.status.frontlineVolume}
            className="frontline-slider"
            onChange={(e) => audio.setFrontlineVolume(Number(e.target.value))}
            data-ocid="player.frontline_volume.input"
          />
        </div>

        {/* Track info + controls */}
        <div className="track-bar">
          <div className="track-info" data-ocid="player.track_info">
            <Music size={16} />
            <span className="track-name">
              {audio.status.currentTrack ?? "No track loaded — tap LOAD TRACK"}
            </span>
          </div>
          <div className="transport" data-ocid="player.transport">
            <button
              type="button"
              className="transport-btn play-btn"
              onClick={handlePlayPause}
              data-ocid="player.play_pause.button"
            >
              {audio.status.isPlaying ? (
                <Pause size={20} />
              ) : (
                <Play size={20} />
              )}
            </button>
            <button
              type="button"
              className="transport-btn"
              onClick={() => audio.stop()}
              data-ocid="player.stop.button"
            >
              <Square size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content: left control strip + tile grid */}
      <div className="player-body">
        {/* Left Control Strip */}
        <aside className="control-strip">
          <div
            className={`power-indicator ${isLive ? "power-live" : ""}`}
            data-ocid="player.power_indicator"
          >
            <Zap size={24} />
          </div>
          <Visualizer
            getAnalyserData={audio.getAnalyserData}
            isPlaying={audio.status.isPlaying}
          />
          <div className="channel-lights">
            <div
              className={`ch-light ${lights.bassCh1 ? "light-on" : "light-off"}`}
            >
              <span>B1</span>
            </div>
            <div
              className={`ch-light ${lights.bassCh2 ? "light-on" : "light-off"}`}
            >
              <span>B2</span>
            </div>
            <div
              className={`ch-light ${lights.mids ? "light-on" : "light-off"}`}
            >
              <span>M</span>
            </div>
            <div
              className={`ch-light ${lights.highs ? "light-on" : "light-off"}`}
            >
              <span>H</span>
            </div>
          </div>
        </aside>

        {/* Tile Grid */}
        <main className="tile-grid" data-ocid="player.tile_grid">
          {tiles.map((tile, i) => (
            <button
              key={tile.key ?? i}
              type="button"
              className="feature-tile"
              onClick={() => openDrawer(tile.key)}
              data-ocid={`player.tile.${i + 1}`}
            >
              <div className="tile-icon">{tile.icon}</div>
              <div className="tile-label">{tile.label}</div>
              <div
                className={`tile-status ${tile.wired ? "status-wired" : "status-locked"}`}
              >
                {tile.wired ? "\u25cf WIRED" : "\u25cb LOCKED"}
              </div>
            </button>
          ))}
        </main>
      </div>

      {/* Status Bar */}
      <div className="status-bar" data-ocid="player.status_bar">
        <span
          className={`status-chip ${lights.commander ? "chip-on" : "chip-off"}`}
        >
          COMMANDER {lights.commander ? "LIVE" : "OFF"}
        </span>
        <span
          className={`status-chip ${audio.status.audioContextState === "running" ? "chip-on" : "chip-off"}`}
        >
          AUDIO CTX {audio.status.audioContextState.toUpperCase()}
        </span>
        <span className="status-chip chip-on">
          THUNDER{" "}
          {audio.status.thunderBatteryStable ? "120kW STABLE" : "UNSTABLE"}
        </span>
        <span className="status-chip chip-on">
          MASTER GAIN {audio.status.masterGain.toFixed(2)}
        </span>
      </div>

      {/* Drawers */}
      <Drawer
        drawerKey={activeDrawer}
        onClose={() => setActiveDrawer(null)}
        audio={audio}
      />
    </div>
  );
}
