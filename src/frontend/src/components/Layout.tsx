import { Activity, Layers, Settings, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";

interface LayoutProps {
  children: ReactNode;
  onFabClick?: () => void;
  onAmpClick?: () => void;
  onSettingsOpen?: () => void;
  onSystemDrawerOpen?: () => void;
  drawerSlot?: ReactNode;
}

export function Layout({
  children,
  onFabClick,
  onAmpClick,
  onSettingsOpen,
  onSystemDrawerOpen,
  drawerSlot,
}: LayoutProps) {
  const handleFab = useCallback(() => onFabClick?.(), [onFabClick]);
  const handleAmp = useCallback(() => onAmpClick?.(), [onAmpClick]);
  const handleSettings = useCallback(
    () => onSettingsOpen?.(),
    [onSettingsOpen],
  );
  const handleSystemDrawer = useCallback(
    () => onSystemDrawerOpen?.(),
    [onSystemDrawerOpen],
  );

  return (
    <div className="relative w-full h-dvh overflow-hidden flex flex-col select-none">
      {/* ── FIXED HEADER 56px — branding + status + settings ─────── */}
      <header
        className="shrink-0 h-14 flex items-center justify-between px-3 z-10"
        style={{
          height: 56,
          background:
            "linear-gradient(to right, rgba(0,8,28,0.98), rgba(0,12,42,0.97), rgba(0,8,28,0.98))",
          borderBottom: "1px solid rgba(0,140,255,0.32)",
          boxShadow:
            "0 2px 24px rgba(0,60,200,0.22), 0 1px 0 rgba(0,180,255,0.08) inset",
        }}
      >
        {/* Left: power status dot */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse-glow"
            style={{
              background: "rgba(0,213,255,0.95)",
              boxShadow:
                "0 0 10px rgba(0,213,255,0.8), 0 0 20px rgba(0,150,255,0.4)",
            }}
            aria-hidden="true"
          />
          <span
            className="text-[8px] font-mono tracking-[0.28em] uppercase hidden sm:block"
            style={{
              color: "rgba(0,180,255,0.65)",
              textShadow: "0 0 8px rgba(0,150,255,0.3)",
            }}
            data-ocid="layout.status_text"
          >
            POWERAMP ONLINE
          </span>
        </div>

        {/* Center: branding */}
        <div className="flex-1 text-center mx-2">
          <p
            className="font-mono font-black tracking-[0.32em] uppercase leading-none"
            style={{
              fontSize: "clamp(7px, 1.6vw, 11px)",
              background:
                "linear-gradient(90deg, rgba(0,180,255,0.9) 0%, rgba(0,213,255,1) 40%, rgba(153,100,255,0.9) 80%, rgba(0,200,255,0.8) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 8px rgba(0,180,255,0.5))",
            }}
            data-ocid="layout.branding"
          >
            gerrod&nbsp;/&nbsp;engeeier&nbsp;/&nbsp;product&nbsp;/&nbsp;desiger
          </p>
        </div>

        {/* Right: system drawer + story/credits */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-ocid="layout.system_drawer_button"
            onClick={handleSystemDrawer}
            aria-label="Open system settings"
            className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 transition-smooth hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            style={{
              color: "rgba(153,100,255,0.85)",
              background: "rgba(100,60,200,0.10)",
              border: "1px solid rgba(130,80,220,0.30)",
              boxShadow: "0 0 12px rgba(100,60,200,0.15)",
            }}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            data-ocid="layout.settings_button"
            onClick={handleSettings}
            aria-label="Open settings and story"
            className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0 transition-smooth hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            style={{
              color: "rgba(0,180,255,0.8)",
              background: "rgba(0,100,255,0.10)",
              border: "1px solid rgba(0,160,255,0.30)",
              boxShadow: "0 0 12px rgba(0,150,255,0.15)",
            }}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 overflow-hidden relative pb-20 sm:pb-0">
        {children}
      </main>

      {/* Amp FAB — bottom-left */}
      <button
        type="button"
        data-ocid="amp.open_button"
        onClick={handleAmp}
        aria-label="Open Virtual Amp"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-smooth hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,20,60,0.95), rgba(0,35,90,0.90))",
          border: "2px solid rgba(0,190,255,0.65)",
          boxShadow:
            "0 0 22px rgba(0,160,255,0.55), 0 0 44px rgba(0,80,220,0.30)",
        }}
      >
        <div
          className="absolute inset-[3px] rounded-full"
          style={{ border: "1px solid rgba(0,180,255,0.18)" }}
        />
        <Zap
          className="w-5 h-5"
          style={{ color: "rgba(0,213,255,0.98)" }}
          strokeWidth={2.5}
        />
      </button>

      {/* Scanner FAB — bottom-right */}
      <button
        type="button"
        data-ocid="scanner.fab_button"
        onClick={handleFab}
        aria-label="Open diagnostic scanner"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center animate-pulse-glow transition-smooth hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,110,255,0.75), rgba(90,0,210,0.65))",
          border: "2px solid rgba(0,213,255,0.55)",
          boxShadow:
            "0 0 26px rgba(0,160,255,0.65), 0 0 52px rgba(90,0,210,0.35)",
        }}
      >
        <Activity
          className="w-6 h-6"
          strokeWidth={2}
          style={{ color: "rgba(0,213,255,0.98)" }}
        />
      </button>

      {drawerSlot}
    </div>
  );
}
