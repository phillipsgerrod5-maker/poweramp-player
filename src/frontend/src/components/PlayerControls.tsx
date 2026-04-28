import type { RepeatMode } from "@/types/player";
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useCallback } from "react";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Display scale 1–700 (tablet volume engine) */
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  play: () => Promise<void>;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (t: number) => void;
  /** Display scale 1–700. STRICT tap-up / tap-down only — one step per click, no hold-repeat */
  setVolume: (display: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  play,
  pause,
  next,
  prev,
  seekTo,
  setVolume,
  toggleShuffle,
  toggleRepeat,
}: PlayerControlsProps) {
  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;

  // STRICT tap up / tap down — one click = one number, NO hold-repeat, NO auto-increment
  const handleVolUp = useCallback(() => {
    setVolume(Math.min(700, volume + 1));
  }, [setVolume, volume]);

  const handleVolDown = useCallback(() => {
    setVolume(Math.max(0, volume - 1));
  }, [setVolume, volume]);

  // Volume color: green → cyan → blue based on level (0-700 scale)
  const volPct = volume / 700;
  const volColor =
    volume <= 100
      ? "rgba(0,255,120,0.95)"
      : volume <= 400
        ? "rgba(0,213,255,0.95)"
        : "rgba(153,69,255,0.95)";

  return (
    <div className="flex flex-col gap-3 select-none">
      {/* ─ Seek bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2"
        data-ocid="player.progress_section"
      >
        <span
          className="text-[10px] font-mono w-8 text-right tabular-nums shrink-0"
          style={{ color: "rgba(0,150,255,0.6)" }}
        >
          {formatTime(currentTime)}
        </span>

        <div className="flex-1 relative h-5 flex items-center">
          <div
            className="absolute inset-x-0 h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(0,60,160,0.35)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width:
                  duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                background:
                  "linear-gradient(to right, rgba(0,213,255,0.9), rgba(153,69,255,0.8))",
                boxShadow: "0 0 6px rgba(0,213,255,0.4)",
                transition: "width 0.15s linear",
              }}
            />
          </div>
          <input
            type="range"
            data-ocid="player.seek_slider"
            min={0}
            max={duration || 1}
            step={0.5}
            value={currentTime}
            onChange={(e) => seekTo(Number.parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        <span
          className="text-[10px] font-mono w-8 tabular-nums shrink-0"
          style={{ color: "rgba(0,100,255,0.5)" }}
        >
          -{formatTime(Math.max(0, duration - currentTime))}
        </span>
      </div>

      {/* ─ Transport controls ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {/* Shuffle */}
        <button
          type="button"
          data-ocid="player.shuffle_toggle"
          onClick={toggleShuffle}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            color: isShuffle ? "rgba(0,213,255,0.95)" : "rgba(0,100,200,0.45)",
            background: isShuffle ? "rgba(0,213,255,0.1)" : "transparent",
            boxShadow: isShuffle ? "0 0 12px rgba(0,213,255,0.35)" : "none",
            border: isShuffle
              ? "1px solid rgba(0,213,255,0.35)"
              : "1px solid transparent",
          }}
          aria-label="Toggle shuffle"
          aria-pressed={isShuffle}
        >
          <Shuffle className="w-4 h-4" />
        </button>

        {/* Prev */}
        <button
          type="button"
          data-ocid="player.prev_button"
          onClick={prev}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ color: "rgba(0,180,255,0.85)" }}
          aria-label="Previous track"
        >
          <SkipBack className="w-5 h-5 fill-current" />
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          data-ocid="player.play_pause_button"
          onClick={isPlaying ? pause : play}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none"
          style={{
            background: isPlaying
              ? "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,80,220,0.85))"
              : "linear-gradient(135deg, rgba(0,180,255,0.85), rgba(80,0,200,0.75))",
            border: "2px solid rgba(0,213,255,0.7)",
            boxShadow: isPlaying
              ? "0 0 24px rgba(0,213,255,0.6), 0 0 48px rgba(0,100,255,0.3)"
              : "0 0 18px rgba(0,213,255,0.4)",
            color: "rgba(255,255,255,0.98)",
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current ml-0.5" />
          )}
        </button>

        {/* Next */}
        <button
          type="button"
          data-ocid="player.next_button"
          onClick={next}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ color: "rgba(0,180,255,0.85)" }}
          aria-label="Next track"
        >
          <SkipForward className="w-5 h-5 fill-current" />
        </button>

        {/* Repeat */}
        <button
          type="button"
          data-ocid="player.repeat_toggle"
          onClick={toggleRepeat}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
          style={{
            color:
              repeatMode !== "none"
                ? "rgba(153,69,255,0.95)"
                : "rgba(0,100,200,0.45)",
            background:
              repeatMode !== "none" ? "rgba(153,69,255,0.1)" : "transparent",
            boxShadow:
              repeatMode !== "none" ? "0 0 12px rgba(153,69,255,0.35)" : "none",
            border:
              repeatMode !== "none"
                ? "1px solid rgba(153,69,255,0.35)"
                : "1px solid transparent",
          }}
          aria-label="Toggle repeat"
          aria-pressed={repeatMode !== "none"}
        >
          <RepeatIcon className="w-4 h-4" />
        </button>
      </div>

      {/* ─ Volume — STRICT TAP UP / TAP DOWN ONLY ────────────────── */}
      {/* No hold-repeat. One click = one number. Range 1-700. */}
      <div
        className="flex items-center gap-2 mt-1"
        data-ocid="player.volume_section"
      >
        {/* Down button — onClick only, no pointer events for hold */}
        <button
          type="button"
          data-ocid="player.volume_down_button"
          onClick={handleVolDown}
          className="w-9 h-9 rounded-sm flex items-center justify-center transition-all duration-150 active:scale-90 shrink-0"
          style={{
            background: "rgba(0,40,120,0.4)",
            border: "1px solid rgba(0,120,255,0.35)",
            color: "rgba(0,180,255,0.8)",
            boxShadow: "0 0 8px rgba(0,100,255,0.15)",
          }}
          aria-label="Volume down"
        >
          <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {/* Volume bar — fill track + moving thumb handle */}
        <div className="flex-1 h-7 relative flex items-center">
          {/* Track background */}
          <div
            className="absolute inset-x-0 h-1.5 rounded-full overflow-visible"
            style={{ background: "rgba(0,40,120,0.35)" }}
          >
            {/* Fill — updates every tap */}
            <div
              className="h-full rounded-full"
              style={{
                width: `${volPct * 100}%`,
                background: `linear-gradient(to right, rgba(0,255,120,0.8), ${volColor})`,
                boxShadow: `0 0 8px ${volColor.replace("0.95", "0.4")}`,
                transition: "width 0.08s ease-out",
              }}
            />
          </div>
          {/* Thumb handle — moves with volPct, every tap snaps it exactly */}
          <div
            className="absolute pointer-events-none w-3.5 h-3.5 rounded-full"
            style={{
              left: `calc(${volPct * 100}% - 7px)`,
              top: "50%",
              transform: "translateY(-50%)",
              background: volColor,
              border: "2px solid rgba(255,255,255,0.85)",
              boxShadow: `0 0 10px ${volColor.replace("0.95", "0.7")}, 0 0 4px rgba(0,0,0,0.6)`,
              transition: "left 0.08s ease-out",
            }}
          />
          {/* Volume number centered */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            data-ocid="player.volume_readout"
            aria-label={`Volume ${volume}`}
          >
            <span
              className="font-mono font-black tabular-nums leading-none"
              style={{
                fontSize: "11px",
                color: volume === 0 ? "rgba(255,80,80,0.8)" : volColor,
                textShadow:
                  volume === 0
                    ? "0 0 10px rgba(255,80,80,0.4)"
                    : `0 0 10px ${volColor.replace("0.95", "0.5")}`,
                letterSpacing: "0.06em",
              }}
            >
              {volume === 0 ? "MUTE" : `VOL ${volume.toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* Up button — onClick only, no pointer events for hold */}
        <button
          type="button"
          data-ocid="player.volume_up_button"
          onClick={handleVolUp}
          className="w-9 h-9 rounded-sm flex items-center justify-center transition-all duration-150 active:scale-90 shrink-0"
          style={{
            background: "rgba(0,60,160,0.5)",
            border: "1px solid rgba(0,180,255,0.5)",
            color: "rgba(0,213,255,0.9)",
            boxShadow: "0 0 10px rgba(0,150,255,0.2)",
          }}
          aria-label="Volume up"
        >
          <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
