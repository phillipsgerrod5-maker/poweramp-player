import {
  useHighAmpCtx,
  useMasterPowerCtx,
  useSeparationSectionsCtx,
} from "@/App";
import { AmpTile } from "@/components/AmpTile";
import { AtmosmasherePanel } from "@/components/AtmosmasherePanel";
import { BassBoosterPanel } from "@/components/BassBoosterPanel";
import { BassPresencePanel } from "@/components/BassPresencePanel";
import { BatteryBankPanel } from "@/components/BatteryBankPanel";
import { CombinedAmpsPanel } from "@/components/CombinedAmpsPanel";
import { EQuakePanel } from "@/components/EQuakePanel";
import { Engine1Panel } from "@/components/Engine1Panel";
import { EqPanel } from "@/components/EqPanel";
import { FreqBassPanel } from "@/components/FreqBassPanel";
import { FreqSystemDrawer } from "@/components/FreqSystemDrawer";
import { HighAmpPanel } from "@/components/HighAmpPanel";
import { Layout } from "@/components/Layout";
import { MasterPowerPanel } from "@/components/MasterPowerPanel";
import { PlayerControls } from "@/components/PlayerControls";
import { PowerChainBar } from "@/components/PowerChainBar";
import { PresetStrengthPanel } from "@/components/PresetStrengthPanel";
import { PresetsPanel } from "@/components/PresetsPanel";
import { ProtectionPanel } from "@/components/ProtectionPanel";
import { QueuePanel } from "@/components/QueuePanel";

import { ScannerDrawer } from "@/components/ScannerDrawer";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SmartChipsDrawer } from "@/components/SmartChipsDrawer";
import { SmdMeter } from "@/components/SmdMeter";
import { SoulModePanel } from "@/components/SoulModePanel";
import { SoundBeamingDrawer } from "@/components/SoundBeamingDrawer";
import { SrsXmPanel } from "@/components/SrsXmPanel";
import { TileGrid } from "@/components/TileGrid";
import { VirtualAmpDrawer } from "@/components/VirtualAmpDrawer";
import { VisualizerBars } from "@/components/VisualizerBars";
import { Button } from "@/components/ui/button";
import { useAtmosmasphere } from "@/hooks/useAtmosmasphere";
import { useCombinedAmps } from "@/hooks/useCombinedAmps";
import { useEQuake } from "@/hooks/useEQuake";
import { useFrequencyOutput } from "@/hooks/useFrequencyOutput";
import {
  getSharedAnalyser,
  getSharedBassFilter,
  getSharedCtx,
  usePlayer,
} from "@/hooks/usePlayer";

import { useScanner } from "@/hooks/useScanner";
import { useSrsFilterOhms } from "@/hooks/useSrsFilterOhms";
import { useSrsProcessor } from "@/hooks/useSrsProcessor";
import { useStackedFilters } from "@/hooks/useStackedFilters";
import { useVirtualAmp } from "@/hooks/useVirtualAmp";

import type { BassType } from "@/types/player";
import {
  Activity,
  Battery,
  Cpu,
  ListMusic,
  Radio,
  Shield,
  Sliders,
  Upload,
  Volume2,
  Waves,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Volume tap-up/down with long-press ──────────────────────────────────────

function useVolumeControls(volume: number, setVolume: (v: number) => void) {
  const longPressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLongPress = useCallback(
    (dir: 1 | -1) => {
      longPressRef.current = setInterval(() => {
        setVolume(Math.max(0, Math.min(700, volume + dir * 5)));
      }, 150);
    },
    [volume, setVolume],
  );

  const stopLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearInterval(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const tapUp = useCallback(() => {
    setVolume(Math.min(700, volume + 1));
  }, [volume, setVolume]);

  const tapDown = useCallback(() => {
    setVolume(Math.max(0, volume - 1));
  }, [volume, setVolume]);

  useEffect(() => () => stopLongPress(), [stopLongPress]);

  return { tapUp, tapDown, startLongPress, stopLongPress };
}

// ─── 14Hz stomp timer ─────────────────────────────────────────────────────────

function useStomp14Hz(isOn: boolean) {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isOn) {
      setActiveSeconds(0);
      return;
    }
    timerRef.current = setInterval(() => setActiveSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOn]);

  return { activeSeconds };
}

// ─── Signal formatter ─────────────────────────────────────────────────────────

function formatSignal(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(1);
}

// ─── Live signal hook ─────────────────────────────────────────────────────────

function useLiveSignal(isPlaying: boolean, signalLevel: number) {
  const [liveSignal, setLiveSignal] = useState(0);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    const loop = () => {
      const analyser = getSharedAnalyser();
      if (analyser && isPlaying) {
        const bin = analyser.frequencyBinCount;
        if (!dataRef.current || dataRef.current.length !== bin)
          dataRef.current = new Uint8Array(bin) as Uint8Array<ArrayBuffer>;
        analyser.getByteFrequencyData(dataRef.current);
        let sum = 0;
        for (let i = 0; i < bin; i++) sum += dataRef.current[i] ?? 0;
        const avg = sum / bin / 255;
        setLiveSignal(signalLevel * 80_000_000 * (0.6 + avg * 0.4));
      } else {
        setLiveSignal(80_000_000);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, signalLevel]);

  return liveSignal;
}

// ─── Tile drawer keys ─────────────────────────────────────────────────────────

type TileKey =
  | "main-amp"
  | "high-amp"
  | "engine1"
  | "batteries"
  | "eq"
  | "bass"
  | "srs"
  | "protection"
  | "atmosmasphere"
  | "freq-system"
  | "smart-chips"
  | "settings";

// ─── Inline drawer wrapper ────────────────────────────────────────────────────

interface InlineDrawerProps {
  title: string;
  accentColor?: string;
  onClose: () => void;
  children: React.ReactNode;
  ocid: string;
}

function InlineDrawer({
  title,
  accentColor = "rgba(0,213,255,0.95)",
  onClose,
  children,
  ocid,
}: InlineDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col animate-fade-in"
      style={{ background: "rgba(0,4,16,0.97)" }}
      data-ocid={ocid}
    >
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{
          background: "rgba(0,8,30,0.98)",
          borderBottom: `1px solid ${accentColor.replace("0.95)", "0.25)")}`,
        }}
      >
        <div>
          <p
            className="text-[8px] font-mono tracking-[0.3em] uppercase"
            style={{ color: accentColor.replace("0.95)", "0.4)") }}
          >
            POWERAMP PLAYER
          </p>
          <h2
            className="text-sm font-display font-bold tracking-[0.15em] uppercase"
            style={{ color: accentColor }}
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          data-ocid={`${ocid.split(".")[0]}.close_button`}
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-90"
          style={{
            border: `1px solid ${accentColor.replace("0.95)", "0.3)")}`,
            color: accentColor.replace("0.95)", "0.7)"),
          }}
          aria-label={`Close ${title}`}
        >
          ✕
        </button>
      </div>
      <div
        className="flex-1 overflow-y-auto"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,100,255,0.25) transparent",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlayerPageProps {
  startupDone: boolean;
  onPlayingChange?: (isPlaying: boolean) => void;
}

// ─── PlayerPage ───────────────────────────────────────────────────────────────

export function PlayerPage({ startupDone, onPlayingChange }: PlayerPageProps) {
  const player = usePlayer();
  const scanner = useScanner();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawer state
  const [showQueue, setShowQueue] = useState(false);
  const [ampOpen, setAmpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemDrawerOpen, setSystemDrawerOpen] = useState(false);
  const [soundBeamingOpen, setSoundBeamingOpen] = useState(false);
  const [openTile, setOpenTile] = useState<TileKey | null>(null);

  // Bass state
  const [activeBassTypes, setActiveBassTypes] = useState<BassType[]>([]);
  const [stomp14HzOn, setStomp14HzOn] = useState(false);
  const [presetStrength, setPresetStrength] = useState(10);
  const { activeSeconds } = useStomp14Hz(stomp14HzOn);

  const {
    queue,
    currentIndex,
    isPlaying,
    volume,
    loadFiles,
    play,
    pause,
    next,
    prev,
    seekTo,
    setVolume: playerSetVolume,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    removeFromQueue,
    isShuffle,
    repeatMode,
    currentTime,
    duration,
  } = player;

  useEffect(() => {
    onPlayingChange?.(isPlaying);
  }, [isPlaying, onPlayingChange]);

  const currentTrack = queue[currentIndex] ?? null;

  const amp = useVirtualAmp(isPlaying, volume, playerSetVolume);
  const {
    state: combinedAmpsState,
    oldProtection,
    setOldProtSlider1,
    setOldProtSlider2,
    setOldProtSlider3,
    newProtection,
    setNewProtSlider1,
    setNewProtLoudnessLimit,
    indicators: protIndicators,
  } = useCombinedAmps(isPlaying, volume);

  const signalLevel = combinedAmpsState.combinedOutput;
  const liveSignal = useLiveSignal(isPlaying, signalLevel);

  const {
    state: srsState,
    isOn: srsIsOn,
    toggleSrs,
    setExpansionFactor,
  } = useSrsProcessor(isPlaying, signalLevel);
  const handleExpansionChange = useCallback(
    (v: number) => {
      setExpansionFactor(v);
      amp.setSrsExpansion(v);
    },
    [setExpansionFactor, amp],
  );

  const {
    state: freqOutputState,
    cheaterBeater,
    toggleCheaterBeater,
    toggle14to60,
  } = useFrequencyOutput(isPlaying, signalLevel, amp.ampState.eqBass);

  // Suppress unused var warning — toggle14to60 is passed to FreqBassPanel
  void toggle14to60;

  // Context hooks
  const { state: masterPowerState, setMasterPower } = useMasterPowerCtx();
  const { state: highAmpState, commanderStrength: highAmpCommanderStr } =
    useHighAmpCtx();
  // separationState consumed inside SettingsDrawer via context
  useSeparationSectionsCtx();

  // Shot 2 hooks
  // srsOhms available but not displayed in tile grid — kept for audio engine wiring
  void useSrsFilterOhms();
  const stackedFilters = useStackedFilters();

  // XM Processor deleted — stub state for props that still reference it
  const xmState = {
    bassLevel: 0,
    midsLevel: 0,
    highsLevel: 0,
    snr: 110.5,
    thd: 0.0095,
    phaseAligned: true,
    staticBypassed: false,
    slope24Active: false,
    active: false,
    isOn: false,
    bandingActive: false,
    slopeDb: 24 as const,
    activityPulse: 0,
    powerNumber: "DELETED",
    cleanupIntensity: 0,
    staticLevel: 0,
    notchHz: 60,
    // XmState compat fields
    enabled: false,
    slopeDB: 24 as const,
    snrDB: 110.5,
    thdPct: 0.0095,
  };
  const equake = useEQuake(isPlaying);
  const { atmosState, wiredToEngine1: atmosWired } =
    useAtmosmasphere(isPlaying);

  // volControls available for future tap-up/down integration outside PlayerControls
  void useVolumeControls(volume, playerSetVolume);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) loadFiles(files);
      e.target.value = "";
    },
    [loadFiles],
  );

  const handleDropZone = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files && files.length > 0) loadFiles(files);
    },
    [loadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handle14HzStomp = useCallback(
    (on: boolean) => {
      setStomp14HzOn(on);
      const ctx = getSharedCtx();
      const bass = getSharedBassFilter();
      if (!ctx || !bass) return;
      const now = ctx.currentTime;
      if (on) {
        bass.frequency.setTargetAtTime(14, now, 0.02);
        bass.gain.setTargetAtTime(12, now, 0.02);
        bass.Q.setTargetAtTime(1.5, now, 0.02);
      } else {
        bass.frequency.setTargetAtTime(200, now, 0.05);
        bass.gain.setTargetAtTime(amp.ampState.eqBass, now, 0.05);
        bass.Q.setTargetAtTime(Math.SQRT2 / 2, now, 0.05);
      }
    },
    [amp.ampState.eqBass],
  );

  const makeEqSetter = useCallback(
    (setter: (v: number) => void) => (raw: number) =>
      setter((raw * presetStrength) / 10),
    [presetStrength],
  );

  const openTileDrawer = useCallback((key: TileKey) => setOpenTile(key), []);
  const closeTileDrawer = useCallback(() => setOpenTile(null), []);

  const signalLabel = isPlaying ? `${formatSignal(liveSignal)} SIG` : "ARMED";

  // ─── Tile status helpers ───────────────────────────────────────────────────
  const eqAnyActive = [
    amp.ampState.eqBass,
    amp.ampState.eqMids,
    amp.ampState.eqHighs,
    amp.ampState.eqTweeters,
  ].some((v) => v !== 0);

  const anyProtActive =
    oldProtection.slider1 +
      oldProtection.slider2 +
      oldProtection.slider3 +
      newProtection.slider1 +
      newProtection.loudnessLimit >
    0;

  return (
    <Layout
      onFabClick={scanner.open}
      onAmpClick={() => setAmpOpen(true)}
      onSettingsOpen={() => setSettingsOpen(true)}
      onSystemDrawerOpen={() => setSystemDrawerOpen(true)}
    >
      <div
        className="relative flex flex-col h-full overflow-hidden"
        onDrop={handleDropZone}
        onDragOver={handleDragOver}
      >
        {/* ── HEADER: Player controls ──────────────────────────────── */}
        <div
          className="shrink-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,8,26,0.97), rgba(0,12,36,0.95))",
            borderBottom: "1px solid rgba(0,130,255,0.2)",
          }}
        >
          <div className="pt-2">
            <PowerChainBar
              isPlaying={isPlaying}
              startupDone={startupDone}
              liveSignal={liveSignal}
            />
          </div>

          {currentTrack ? (
            <div className="flex items-center gap-3 px-4 pb-2">
              {/* Album art */}
              <div className="relative shrink-0">
                <div
                  className="w-[64px] h-[64px] rounded-xl overflow-hidden"
                  style={{
                    border: "2px solid rgba(0,140,255,0.4)",
                    boxShadow: isPlaying
                      ? "0 0 16px rgba(0,140,255,0.4), 0 0 32px rgba(80,0,200,0.2)"
                      : "0 0 6px rgba(0,70,180,0.15)",
                  }}
                >
                  <img
                    src="/assets/generated/album-neon-waves.dim_400x400.jpg"
                    alt="Album art"
                    className="w-full h-full object-cover"
                    style={{
                      animation: isPlaying
                        ? "spin 20s linear infinite"
                        : "none",
                    }}
                  />
                </div>
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 py-px rounded-full text-[7px] font-mono tracking-widest whitespace-nowrap"
                  style={{
                    background: "rgba(0,6,22,0.95)",
                    border: "1px solid rgba(0,200,255,0.35)",
                    color: isPlaying
                      ? "rgba(0,213,255,0.9)"
                      : "rgba(0,90,200,0.45)",
                  }}
                >
                  {signalLabel}
                </div>
              </div>

              {/* Track info + visualizer */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h2
                  className="text-sm font-display font-bold truncate"
                  data-ocid="player.track_name"
                  title={currentTrack.name}
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  {currentTrack.name}
                </h2>
                <p
                  className="text-xs truncate"
                  data-ocid="player.track_artist"
                  style={{ color: "rgba(0,140,255,0.65)" }}
                >
                  {currentTrack.artist}
                </p>
                <VisualizerBars isPlaying={isPlaying} />
              </div>

              {/* Extra actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-ocid="player.queue_button"
                  onClick={() => setShowQueue((v) => !v)}
                  className="w-7 h-7"
                  style={{ color: "rgba(0,130,255,0.7)" }}
                  aria-label="Toggle queue"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-ocid="player.upload_button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7"
                  style={{ color: "rgba(0,130,255,0.7)" }}
                  aria-label="Open files"
                >
                  <Upload className="w-3.5 h-3.5" />
                </Button>
                <button
                  type="button"
                  data-ocid="player.beam_button"
                  onClick={() => setSoundBeamingOpen(true)}
                  className="w-7 h-7 rounded-sm flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(0,25,80,0.5)",
                    border: "1px solid rgba(0,160,255,0.35)",
                    color: "rgba(0,200,255,0.75)",
                  }}
                  aria-label="Open Sound Beaming"
                >
                  <span className="text-[6px] font-mono font-black tracking-[0.15em]">
                    BEAM
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center px-4 py-4 text-center"
              data-ocid="player.empty_state"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-2 animate-pulse-glow"
                style={{
                  background: "rgba(0,20,60,0.5)",
                  border: "2px solid rgba(0,140,255,0.35)",
                }}
              >
                <ListMusic
                  className="w-6 h-6"
                  style={{ color: "rgba(0,170,255,0.7)" }}
                />
              </div>
              <p
                className="text-xs font-mono tracking-widest uppercase mb-2"
                style={{ color: "rgba(0,180,255,0.7)" }}
              >
                LOAD YOUR MUSIC
              </p>
              <button
                type="button"
                data-ocid="player.load_files_button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[10px] tracking-widest uppercase transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: "rgba(0,80,220,0.18)",
                  border: "1px solid rgba(0,170,255,0.55)",
                  color: "rgba(0,213,255,0.95)",
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                OPEN FILES
              </button>
            </div>
          )}

          {currentTrack && (
            <div className="px-4 pb-3" data-ocid="player.controls_panel">
              <PlayerControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isShuffle={isShuffle}
                repeatMode={repeatMode}
                play={play}
                pause={pause}
                next={next}
                prev={prev}
                seekTo={seekTo}
                setVolume={playerSetVolume}
                toggleShuffle={toggleShuffle}
                toggleRepeat={toggleRepeat}
              />
            </div>
          )}
        </div>

        {/* ── SMD METER ─────────────────────────────────────────── */}
        <div
          className="shrink-0"
          style={{ borderBottom: "1px solid rgba(0,80,200,0.2)" }}
        >
          <SmdMeter isPlaying={isPlaying} volume={volume} ohmsProfile={8} />
        </div>

        {/* ── CARPLAY TILE GRID ────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto pb-6"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,100,255,0.25) transparent",
          }}
        >
          <div className="pt-3 pb-2 px-4">
            <p
              className="text-[7px] font-mono tracking-[0.3em] uppercase"
              style={{ color: "rgba(0,100,180,0.4)" }}
            >
              POWERAMP PLAYER — SYSTEM GRID
            </p>
          </div>

          <TileGrid>
            {/* Row 1 */}
            <AmpTile
              data-ocid="tile.main_amp"
              icon={Activity}
              title="MAIN AMP"
              statusColor={isPlaying ? "green" : "amber"}
              statusLabel={isPlaying ? "ACTIVE" : "STANDBY"}
              powerLabel="VIRTUAL+ANALOG+DIGITAL"
              onClick={() => openTileDrawer("main-amp")}
              isActive={openTile === "main-amp"}
            />
            <AmpTile
              data-ocid="tile.high_amp"
              icon={Waves}
              title="HIGH AMP"
              statusColor={isPlaying ? "green" : "amber"}
              statusLabel={isPlaying ? "ACTIVE" : "STANDBY"}
              powerLabel="CH3 — 80,000W"
              onClick={() => openTileDrawer("high-amp")}
              isActive={openTile === "high-amp"}
            />
            <AmpTile
              data-ocid="tile.engine1"
              icon={Zap}
              title="ENGINE 1"
              statusColor="green"
              statusLabel="RUNNING"
              powerLabel="12CH × 80,000W"
              onClick={() => openTileDrawer("engine1")}
              isActive={openTile === "engine1"}
            />

            {/* Row 2 */}
            <AmpTile
              data-ocid="tile.batteries"
              icon={Battery}
              title="BATTERIES"
              statusColor="green"
              statusLabel="100% FULL"
              powerLabel="20–30 CELLS"
              onClick={() => openTileDrawer("batteries")}
              isActive={openTile === "batteries"}
            />
            <AmpTile
              data-ocid="tile.eq"
              icon={Sliders}
              title="EQ"
              statusColor={eqAnyActive ? "amber" : "green"}
              statusLabel={eqAnyActive ? "ACTIVE" : "NEUTRAL"}
              powerLabel="6-BAND INDEPENDENT"
              onClick={() => openTileDrawer("eq")}
              isActive={openTile === "eq"}
            />
            <AmpTile
              data-ocid="tile.bass"
              icon={Waves}
              title="BASS"
              statusColor={amp.ampState.eqBass > 0 ? "green" : "amber"}
              statusLabel={amp.ampState.eqBass > 0 ? "ACTIVE" : "STANDBY"}
              powerLabel="14–50Hz EPICENTER"
              onClick={() => openTileDrawer("bass")}
              isActive={openTile === "bass"}
            />

            {/* Row 3 */}
            <AmpTile
              data-ocid="tile.srs"
              icon={Radio}
              title="SRS HD 9.0"
              statusColor={srsIsOn ? "green" : "amber"}
              statusLabel={srsIsOn ? "ENABLED" : "DISABLED"}
              powerLabel="SPATIAL ENGINE"
              onClick={() => openTileDrawer("srs")}
              isActive={openTile === "srs"}
            />
            <AmpTile
              data-ocid="tile.protection"
              icon={Shield}
              title="PROTECTION"
              statusColor={anyProtActive ? "green" : "red"}
              statusLabel={anyProtActive ? "ACTIVE" : "OFF"}
              powerLabel="DUAL SYSTEM"
              onClick={() => openTileDrawer("protection")}
              isActive={openTile === "protection"}
            />
            <AmpTile
              data-ocid="tile.atmosmasphere"
              icon={Activity}
              title="ATMOSMASPHERE"
              statusColor={atmosState.active ? "green" : "amber"}
              statusLabel={atmosState.active ? "ACTIVE" : "STANDBY"}
              powerLabel="30 CHIPS — 3D SPATIAL"
              onClick={() => openTileDrawer("atmosmasphere")}
              isActive={openTile === "atmosmasphere"}
            />

            {/* Row 4 */}
            <AmpTile
              data-ocid="tile.freq_system"
              icon={Radio}
              title="FREQ SYSTEM"
              statusColor={isPlaying ? "green" : "amber"}
              statusLabel={isPlaying ? "DETECTING" : "STANDBY"}
              powerLabel="EPICENTER + MATCHING"
              onClick={() => openTileDrawer("freq-system")}
              isActive={openTile === "freq-system"}
            />
            <AmpTile
              data-ocid="tile.smart_chips"
              icon={Cpu}
              title="SMART CHIPS"
              statusColor="green"
              statusLabel="HOLDING"
              powerLabel="TITANIUM WALL 1,000"
              onClick={() => openTileDrawer("smart-chips")}
              isActive={openTile === "smart-chips"}
            />
            <AmpTile
              data-ocid="tile.settings"
              icon={Volume2}
              title="SETTINGS"
              statusColor="gray"
              statusLabel="TAP TO OPEN"
              powerLabel="SRS · XM · PRESETS"
              onClick={() => openTileDrawer("settings")}
              isActive={openTile === "settings"}
            />
          </TileGrid>

          {/* Footer */}
          <footer className="px-4 pt-4 pb-2 flex items-center justify-center">
            <p
              className="text-[7px] font-mono tracking-widest uppercase select-none"
              style={{ color: "rgba(0,70,180,0.35)" }}
            >
              © {new Date().getFullYear()} · Built with love using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(0,130,255,0.45)" }}
              >
                caffeine.ai
              </a>
            </p>
          </footer>
        </div>

        {/* ── QUEUE OVERLAY ────────────────────────────────────── */}
        {showQueue && (
          <div
            className="absolute inset-0 z-30 backdrop-blur-sm animate-fade-in"
            style={{ background: "rgba(0,6,20,0.96)" }}
          >
            <QueuePanel
              queue={queue}
              currentTrack={currentTrack}
              onPlayTrack={playTrack}
              onRemove={removeFromQueue}
              onClose={() => setShowQueue(false)}
              onAddFiles={() => fileInputRef.current?.click()}
            />
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="sr-only"
          onChange={handleFileChange}
          tabIndex={-1}
        />
      </div>

      {/* ── TILE DRAWERS ────────────────────────────────────────── */}

      {/* MAIN AMP */}
      {openTile === "main-amp" && (
        <InlineDrawer
          title="MAIN VIRTUAL AMP"
          accentColor="rgba(153,69,255,0.95)"
          onClose={closeTileDrawer}
          ocid="main_amp.dialog"
        >
          <div className="px-4 py-4 pb-8">
            <div className="mb-3" data-ocid="main_amp.combined_slot">
              <CombinedAmpsPanel
                state={combinedAmpsState}
                isPlaying={isPlaying}
              />
            </div>
          </div>
        </InlineDrawer>
      )}

      {/* HIGH AMP */}
      {openTile === "high-amp" && (
        <InlineDrawer
          title="HIGH AMP"
          accentColor="rgba(0,200,180,0.95)"
          onClose={closeTileDrawer}
          ocid="high_amp.dialog"
        >
          <div className="px-4 py-4 pb-8">
            <MasterPowerPanel
              state={masterPowerState}
              onChange={setMasterPower}
            />
            <HighAmpPanel
              state={highAmpState}
              commanderStrength={highAmpCommanderStr}
              isPlaying={isPlaying}
            />
          </div>
        </InlineDrawer>
      )}

      {/* ENGINE 1 */}
      {openTile === "engine1" && (
        <InlineDrawer
          title="ENGINE 1"
          accentColor="rgba(0,255,120,0.95)"
          onClose={closeTileDrawer}
          ocid="engine1.dialog"
        >
          <div className="px-4 py-4 pb-8">
            <Engine1Panel />
          </div>
        </InlineDrawer>
      )}

      {/* EQ */}
      {openTile === "eq" && (
        <InlineDrawer
          title="EQ"
          accentColor="rgba(0,213,255,0.95)"
          onClose={closeTileDrawer}
          ocid="eq.dialog"
        >
          <div className="py-4 pb-8">
            <EqPanel
              bass={amp.ampState.eqBass}
              mids={amp.ampState.eqMids}
              highs={amp.ampState.eqHighs}
              tweeters={amp.ampState.eqTweeters}
              presetStrength={presetStrength}
              onBassChange={makeEqSetter(amp.setEqBass)}
              onMidsChange={makeEqSetter(amp.setEqMids)}
              onHighsChange={makeEqSetter(amp.setEqHighs)}
              onTweetersChange={makeEqSetter(amp.setEqTweeters)}
            />
            <div className="px-4">
              <PresetStrengthPanel
                value={presetStrength}
                onChange={setPresetStrength}
              />
              <div className="mt-3" data-ocid="eq.equake_section">
                <EQuakePanel equake={equake} />
              </div>
            </div>
          </div>
        </InlineDrawer>
      )}

      {/* BASS */}
      {openTile === "bass" && (
        <InlineDrawer
          title="BASS"
          accentColor="rgba(153,69,255,0.95)"
          onClose={closeTileDrawer}
          ocid="bass.dialog"
        >
          <div className="px-4 py-4 pb-8 flex flex-col gap-3">
            <BassPresencePanel
              activeTypes={activeBassTypes}
              onTypesChange={setActiveBassTypes}
            />
            <BassBoosterPanel
              isPlaying={isPlaying}
              bassGain={amp.ampState.eqBass}
              tubeHarmonic2={combinedAmpsState.tube.harmonics.second}
              activePresenceTypes={activeBassTypes}
              equakeValue={equake.value}
            />
            <FreqBassPanel
              isPlaying={isPlaying}
              cheaterBeater={cheaterBeater}
              toggleCheaterBeater={toggleCheaterBeater}
              toggle14to60={toggle14to60}
            />
            {/* 14Hz Stomp */}
            <button
              type="button"
              data-ocid="bass_stomp.toggle"
              onClick={() => handle14HzStomp(!stomp14HzOn)}
              className="w-full py-4 rounded-sm flex flex-col items-center gap-1.5 transition-all duration-300"
              style={{
                background: stomp14HzOn
                  ? "linear-gradient(135deg, rgba(30,15,0,0.96), rgba(40,20,0,0.95))"
                  : "linear-gradient(135deg, rgba(0,8,30,0.94), rgba(0,10,35,0.92))",
                border: stomp14HzOn
                  ? "2px solid rgba(255,160,0,0.8)"
                  : "2px solid rgba(153,69,255,0.35)",
                boxShadow: stomp14HzOn
                  ? "0 0 24px rgba(255,140,0,0.4)"
                  : "0 0 12px rgba(153,69,255,0.1)",
              }}
              aria-pressed={stomp14HzOn}
              aria-label="14Hz Bass Stomp"
            >
              <div
                className="text-xl font-mono font-black tracking-[0.2em]"
                style={{
                  color: stomp14HzOn
                    ? "rgba(255,160,0,0.98)"
                    : "rgba(153,69,255,0.8)",
                  textShadow: stomp14HzOn
                    ? "0 0 20px rgba(255,140,0,0.8)"
                    : "none",
                }}
              >
                14 Hz BASS STOMP
              </div>
              {stomp14HzOn ? (
                <div
                  className="text-[9px] font-mono tracking-widest"
                  style={{ color: "rgba(255,140,0,0.7)" }}
                >
                  LOCKED TO 14 Hz · {activeSeconds}s ACTIVE
                </div>
              ) : (
                <div
                  className="text-[9px] font-mono tracking-widest"
                  style={{ color: "rgba(153,69,255,0.5)" }}
                >
                  TAP TO ENGAGE — LOCKS ALL SYSTEMS TO 14 Hz
                </div>
              )}
            </button>
            {/* Soul mode inside bass drawer */}
            <div
              className="p-3 rounded-xl"
              style={{
                background: "rgba(0,8,28,0.7)",
                border: "1px solid rgba(153,69,255,0.2)",
              }}
            >
              <p
                className="text-[8px] font-mono tracking-[0.2em] uppercase mb-2 font-bold"
                style={{ color: "rgba(153,69,255,0.7)" }}
              >
                SOUL MODE
              </p>
              <SoulModePanel />
            </div>
          </div>
        </InlineDrawer>
      )}

      {/* SRS HD 9.0 */}
      {openTile === "srs" && (
        <InlineDrawer
          title="SRS HD 9.0"
          accentColor="rgba(180,100,255,0.95)"
          onClose={closeTileDrawer}
          ocid="srs.dialog"
        >
          <div className="px-4 py-4 pb-8">
            <SrsXmPanel
              srs={srsState}
              xm={xmState}
              isPlaying={isPlaying}
              srsIsOn={srsIsOn}
              onToggleSrs={toggleSrs}
              onExpansionChange={handleExpansionChange}
              freqOutput={freqOutputState}
            />
          </div>
        </InlineDrawer>
      )}

      {/* PROTECTION */}
      {openTile === "protection" && (
        <InlineDrawer
          title="PROTECTION SYSTEM"
          accentColor="rgba(255,80,80,0.95)"
          onClose={closeTileDrawer}
          ocid="protection.dialog"
        >
          <div className="pb-8">
            <ProtectionPanel
              isPlaying={isPlaying}
              oldProtection={oldProtection}
              setOldProtSlider1={setOldProtSlider1}
              setOldProtSlider2={setOldProtSlider2}
              setOldProtSlider3={setOldProtSlider3}
              newProtection={newProtection}
              setNewProtSlider1={setNewProtSlider1}
              setNewProtLoudnessLimit={setNewProtLoudnessLimit}
              indicators={protIndicators}
            />
          </div>
        </InlineDrawer>
      )}

      {/* ATMOSMASPHERE */}
      {openTile === "atmosmasphere" && (
        <InlineDrawer
          title="ATMOSMASPHERE"
          accentColor="rgba(0,200,180,0.95)"
          onClose={closeTileDrawer}
          ocid="atmosmasphere.dialog"
        >
          <div className="px-4 py-4 pb-8">
            <AtmosmasherePanel
              atmosState={atmosState}
              wiredToEngine1={atmosWired}
            />
          </div>
        </InlineDrawer>
      )}

      {/* SETTINGS tile */}
      {openTile === "settings" && (
        <InlineDrawer
          title="SETTINGS"
          accentColor="rgba(0,213,255,0.95)"
          onClose={closeTileDrawer}
          ocid="tile_settings.dialog"
        >
          <div className="pb-8">
            <PresetsPanel
              onBassChange={amp.setEqBass}
              onMidsChange={amp.setEqMids}
              onHighsChange={amp.setEqHighs}
              equake={equake}
              onCheaterBeater={toggleCheaterBeater}
            />
          </div>
        </InlineDrawer>
      )}

      {/* FREQ SYSTEM — fullscreen drawer */}
      <FreqSystemDrawer
        isOpen={openTile === "freq-system"}
        onClose={closeTileDrawer}
        isPlaying={isPlaying}
      />

      {/* SMART CHIPS — fullscreen drawer */}
      <SmartChipsDrawer
        isOpen={openTile === "smart-chips"}
        onClose={closeTileDrawer}
        isPlaying={isPlaying}
        engineRunning={true}
      />

      {/* BATTERIES — fullscreen panel */}
      <BatteryBankPanel
        isOpen={openTile === "batteries"}
        onClose={closeTileDrawer}
      />

      {/* Legacy drawers */}
      <ScannerDrawer scanner={scanner} />
      <VirtualAmpDrawer
        isOpen={ampOpen}
        onClose={() => setAmpOpen(false)}
        ampState={amp.ampState}
        protection={amp.protection}
        isPlaying={isPlaying}
        srsActive={amp.ampState.srsActive}
        srsState={srsState}
        xmState={xmState}
        freqOutputState={freqOutputState}
        onVolumeChange={amp.setVolume}
        onEqBassChange={amp.setEqBass}
        onEqMidsChange={amp.setEqMids}
        onEqHighsChange={amp.setEqHighs}
        onEqTweetersChange={amp.setEqTweeters}
        onBassPreset={amp.setBassPreset}
        onEarthquakeToggle={amp.setEarthquakeMode}
        onSrsToggle={amp.setSrsActive}
        onScreenChange={amp.setCurrentScreen}
        onExpansionChange={handleExpansionChange}
        combinedAmpsState={combinedAmpsState}
        srsExpansionFactor={amp.ampState.srsExpansion}
      />
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <SettingsDrawer
        isOpen={systemDrawerOpen}
        onClose={() => setSystemDrawerOpen(false)}
        masterPowerState={masterPowerState}
        onMasterPower={setMasterPower}
        protection={amp.protection}
        ampState={amp.ampState}
        presetStrength={presetStrength}
        onPresetStrengthChange={setPresetStrength}
        onEqBassChange={makeEqSetter(amp.setEqBass)}
        onEqMidsChange={makeEqSetter(amp.setEqMids)}
        onEqHighsChange={makeEqSetter(amp.setEqHighs)}
        onEqTweetersChange={makeEqSetter(amp.setEqTweeters)}
        activeBassTypes={activeBassTypes}
        equake={equake}
        srsState={srsState}
        srsExpansionFactor={amp.ampState.srsExpansion}
        onSrsExpansionChange={handleExpansionChange}
        stackedFiltersState={stackedFilters.state}
        onMidPresence={stackedFilters.setMidPresence}
        onMidBody={stackedFilters.setMidBody}
        onMidClarity={stackedFilters.setMidClarity}
        onHighAir={stackedFilters.setHighAir}
        onHighDetail={stackedFilters.setHighDetail}
        onHighBrilliance={stackedFilters.setHighBrilliance}
      />
      <SoundBeamingDrawer
        isOpen={soundBeamingOpen}
        onClose={() => setSoundBeamingOpen(false)}
      />
    </Layout>
  );
}
