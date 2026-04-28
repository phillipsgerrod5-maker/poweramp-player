import type { LucideIcon } from "lucide-react";

type StatusColor = "green" | "amber" | "red" | "gray";

interface AmpTileProps {
  icon: LucideIcon;
  title: string;
  statusColor: StatusColor;
  statusLabel: string;
  powerLabel: string;
  onClick: () => void;
  isActive?: boolean;
  "data-ocid"?: string;
}

const STATUS_COLORS: Record<StatusColor, string> = {
  green: "rgba(0,255,120,0.9)",
  amber: "rgba(255,180,0,0.9)",
  red: "rgba(255,60,60,0.9)",
  gray: "rgba(120,130,160,0.5)",
};

const STATUS_GLOWS: Record<StatusColor, string> = {
  green: "0 0 8px rgba(0,255,120,0.7)",
  amber: "0 0 8px rgba(255,180,0,0.7)",
  red: "0 0 8px rgba(255,60,60,0.7)",
  gray: "none",
};

// Tile gradient per status — adds warmth to the tile face
const TILE_GRADIENTS: Record<StatusColor, string> = {
  green:
    "linear-gradient(135deg, rgba(0,20,60,0.9) 0%, rgba(0,40,100,0.7) 50%, rgba(0,20,60,0.85) 100%)",
  amber:
    "linear-gradient(135deg, rgba(30,15,0,0.9) 0%, rgba(50,30,0,0.7) 50%, rgba(25,12,0,0.85) 100%)",
  red: "linear-gradient(135deg, rgba(40,0,0,0.9) 0%, rgba(60,10,10,0.7) 50%, rgba(35,0,0,0.85) 100%)",
  gray: "linear-gradient(135deg, rgba(10,12,24,0.9) 0%, rgba(16,18,35,0.7) 50%, rgba(10,12,24,0.85) 100%)",
};

export function AmpTile({
  icon: Icon,
  title,
  statusColor,
  statusLabel,
  powerLabel,
  onClick,
  isActive = false,
  "data-ocid": ocid,
}: AmpTileProps) {
  const statusRgba = STATUS_COLORS[statusColor];
  const statusGlow = STATUS_GLOWS[statusColor];

  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className="relative flex flex-col items-start gap-2 p-3 rounded-2xl text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 min-h-[96px]"
      style={{
        background: isActive
          ? "linear-gradient(135deg, rgba(0,40,120,0.95) 0%, rgba(0,80,200,0.7) 50%, rgba(0,40,120,0.9) 100%)"
          : TILE_GRADIENTS[statusColor],
        // NO border — pure gradient + inner glow
        boxShadow: isActive
          ? "inset 0 0 18px rgba(0,120,255,0.25), 0 0 24px rgba(0,80,255,0.3), 0 4px 16px rgba(0,0,0,0.5)"
          : "inset 0 0 10px rgba(0,60,160,0.12), 0 2px 12px rgba(0,0,0,0.4)",
      }}
      aria-label={`Open ${title}`}
    >
      {/* Subtle inner glow rim — replaces border */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          boxShadow: isActive
            ? "inset 0 0 0 1.5px rgba(0,160,255,0.45)"
            : "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      />

      {/* Icon row */}
      <div className="flex items-center justify-between w-full">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{
            background: isActive
              ? "rgba(0,100,255,0.3)"
              : "rgba(255,255,255,0.07)",
            boxShadow: isActive ? "0 0 12px rgba(0,150,255,0.4)" : "none",
          }}
        >
          <Icon
            className="w-4 h-4"
            style={{
              color: isActive ? "rgba(0,220,255,0.95)" : "rgba(0,160,255,0.75)",
            }}
          />
        </div>
        {/* Status dot with glow */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            background: statusRgba,
            boxShadow: statusGlow,
          }}
        />
      </div>

      {/* Title */}
      <span
        className="text-[9px] font-mono font-bold tracking-[0.18em] uppercase leading-tight"
        style={{
          color: isActive ? "rgba(220,240,255,0.98)" : "rgba(170,190,230,0.85)",
          textShadow: isActive ? "0 0 8px rgba(0,180,255,0.4)" : "none",
        }}
      >
        {title}
      </span>

      {/* Power label + status label */}
      <div className="flex flex-col gap-0.5 mt-auto w-full">
        <span
          className="text-[7.5px] font-mono tracking-wide truncate"
          style={{ color: "rgba(0,180,255,0.6)" }}
        >
          {powerLabel}
        </span>
        <span
          className="text-[7px] font-mono tracking-widest uppercase truncate font-bold"
          style={{
            color: statusRgba,
            textShadow:
              statusColor !== "gray" ? `0 0 6px ${statusRgba}` : "none",
          }}
        >
          {statusLabel}
        </span>
      </div>
    </button>
  );
}
