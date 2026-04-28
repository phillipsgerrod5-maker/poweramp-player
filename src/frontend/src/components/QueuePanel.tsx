import { ScrollArea } from "@/components/ui/scroll-area";
import type { Track } from "@/types/player";
import { Music2, Plus, Trash2, X } from "lucide-react";

interface QueuePanelProps {
  queue: Track[];
  currentTrack: Track | null;
  onPlayTrack: (track: Track) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
  onAddFiles: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec === 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function QueuePanel({
  queue,
  currentTrack,
  onPlayTrack,
  onRemove,
  onClose,
  onAddFiles,
}: QueuePanelProps) {
  return (
    <div
      className="flex flex-col h-full"
      data-ocid="queue.panel"
      style={{
        background:
          "linear-gradient(180deg, rgba(0,6,22,0.99) 0%, rgba(0,10,32,0.98) 100%)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: "rgba(0,213,255,0.05)",
          borderBottom: "1px solid rgba(0,213,255,0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "rgba(0,213,255,0.9)",
              boxShadow: "0 0 8px rgba(0,213,255,0.6)",
            }}
          />
          <h2
            className="font-mono font-bold tracking-[0.2em] uppercase text-sm"
            style={{ color: "rgba(0,213,255,0.9)" }}
          >
            QUEUE
          </h2>
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color: "rgba(0,130,255,0.5)" }}
          >
            {queue.length} {queue.length === 1 ? "TRACK" : "TRACKS"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-ocid="queue.add_button"
            onClick={onAddFiles}
            className="w-7 h-7 rounded-sm flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "rgba(0,90,200,0.2)",
              border: "1px solid rgba(0,150,255,0.3)",
              color: "rgba(0,180,255,0.8)",
            }}
            aria-label="Add files"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-ocid="queue.close_button"
            onClick={onClose}
            className="w-7 h-7 rounded-sm flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "rgba(255,50,50,0.1)",
              border: "1px solid rgba(255,50,50,0.25)",
              color: "rgba(255,80,80,0.8)",
            }}
            aria-label="Close queue"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Queue list */}
      {queue.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center text-center px-6"
          data-ocid="queue.empty_state"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{
              background: "rgba(0,25,70,0.5)",
              border: "2px solid rgba(0,130,255,0.3)",
            }}
          >
            <Music2
              className="w-7 h-7"
              style={{ color: "rgba(0,150,255,0.5)" }}
            />
          </div>
          <p
            className="text-sm font-mono tracking-widest uppercase mb-1"
            style={{ color: "rgba(0,150,255,0.6)" }}
          >
            QUEUE EMPTY
          </p>
          <p
            className="text-[10px] mb-4"
            style={{ color: "rgba(0,100,200,0.4)" }}
          >
            Load audio files to begin
          </p>
          <button
            type="button"
            data-ocid="queue.add_files_button"
            onClick={onAddFiles}
            className="flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-xs tracking-widest uppercase transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: "rgba(0,70,200,0.18)",
              border: "1px solid rgba(0,160,255,0.45)",
              color: "rgba(0,200,255,0.9)",
            }}
          >
            <Plus className="w-3 h-3" />
            ADD FILES
          </button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <ul className="p-2 space-y-0.5">
            {queue.map((track, i) => {
              const isActive = track.id === currentTrack?.id;
              return (
                <li key={track.id}>
                  <button
                    type="button"
                    data-ocid={`queue.item.${i + 1}`}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer group text-left transition-all duration-150"
                    style={{
                      background: isActive
                        ? "rgba(0,213,255,0.1)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(0,213,255,0.3)"
                        : "1px solid transparent",
                      boxShadow: isActive
                        ? "0 0 12px rgba(0,213,255,0.12)"
                        : "none",
                    }}
                    onClick={() => onPlayTrack(track)}
                    aria-label={`Play ${track.name}`}
                    aria-current={isActive ? "true" : undefined}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(0,80,180,0.12)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgba(0,100,255,0.18)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "transparent";
                      }
                    }}
                  >
                    {/* Index / active indicator */}
                    <div className="w-6 text-center shrink-0">
                      {isActive ? (
                        <span
                          className="text-xs"
                          style={{ color: "rgba(0,213,255,0.9)" }}
                        >
                          ▶
                        </span>
                      ) : (
                        <span
                          className="text-xs font-mono tabular-nums"
                          style={{ color: "rgba(0,100,200,0.4)" }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-mono font-bold truncate"
                        style={{
                          color: isActive
                            ? "rgba(0,213,255,0.95)"
                            : "rgba(180,200,255,0.75)",
                        }}
                        title={track.name}
                      >
                        {track.name}
                      </p>
                      <p
                        className="text-[9px] font-mono truncate mt-0.5"
                        style={{ color: "rgba(0,100,200,0.5)" }}
                      >
                        {track.artist}
                      </p>
                    </div>

                    {/* Duration + remove */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-[9px] font-mono tabular-nums"
                        style={{ color: "rgba(0,100,200,0.45)" }}
                      >
                        {formatTime(track.duration)}
                      </span>
                      <button
                        type="button"
                        data-ocid={`queue.delete_button.${i + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(track.id);
                        }}
                        className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150"
                        style={{ color: "rgba(255,80,80,0.7)" }}
                        aria-label={`Remove ${track.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
