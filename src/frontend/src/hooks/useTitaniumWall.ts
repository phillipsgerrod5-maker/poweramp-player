/**
 * useTitaniumWall — Titanium Wall Smart Chip
 *
 * 10 inches wide, 1,000 power rating.
 * Always active when engine is running.
 * Silent — you never hear the wall.
 *
 * Bass side: bang + boom + bottom + sub foundation (bass channel only)
 * Mids side: instrument focus + isolation of unwanted sounds
 *
 * Holds all 6 protection sliders (3 Old + 3 New Protection System).
 * Powered directly from Engine 1 channel.
 */

import type { TitaniumWallState } from "@/types/player";
import { useEffect, useState } from "react";
import { getSharedCtx } from "./usePlayer";

const STORAGE_KEY = "poweramp_titanium_wall";

function loadState(): TitaniumWallState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TitaniumWallState;
  } catch {
    /* ignore */
  }
  return {
    active: true,
    powerRating: 1000,
    widthInches: 10,
    bassSide: {
      bang: true,
      boom: true,
      bottom: true,
      subFoundation: true,
    },
    midsSide: {
      instrumentFocus: true,
      isolationActive: true,
    },
    protectionSlots: 6,
    channelPowered: true,
  };
}

function saveState(s: TitaniumWallState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface UseTitaniumWallReturn {
  state: TitaniumWallState;
}

export function useTitaniumWall(isPlaying: boolean): UseTitaniumWallReturn {
  const [state, setState] = useState<TitaniumWallState>(loadState);

  useEffect(() => {
    const interval = setInterval(() => {
      const ctx = getSharedCtx();
      const engineRunning = !!(ctx && ctx.state === "running");

      setState((prev) => {
        // channelPowered reflects whether Engine 1 is actually running
        if (
          prev.channelPowered === engineRunning &&
          prev.active === isPlaying
        ) {
          return prev;
        }
        const next: TitaniumWallState = {
          ...prev,
          active: isPlaying,
          channelPowered: engineRunning,
          // Bass side and mids side are ALWAYS on — even at idle
          // They protect the signal at all times
          bassSide: {
            bang: true,
            boom: true,
            bottom: true,
            subFoundation: true,
          },
          midsSide: { instrumentFocus: true, isolationActive: true },
        };
        saveState(next);
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return { state };
}
