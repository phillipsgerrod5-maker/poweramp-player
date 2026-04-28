import { StartupSequence } from "@/components/StartupSequence";
import { Toaster } from "@/components/ui/sonner";
import { useHighAmp } from "@/hooks/useHighAmp";
import type { UseHighAmpReturn } from "@/hooks/useHighAmp";
import { useMasterPower } from "@/hooks/useMasterPower";
import type { UseMasterPowerReturn } from "@/hooks/useMasterPower";
import { useSeparationSections } from "@/hooks/useSeparationSections";
import type { UseSeparationSectionsReturn } from "@/hooks/useSeparationSections";
import { PlayerPage } from "@/pages/PlayerPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useState } from "react";

// ─── Contexts ─────────────────────────────────────────────────────────────────

interface MasterPowerCtx extends UseMasterPowerReturn {}
interface HighAmpCtx extends UseHighAmpReturn {}
interface SeparationSectionsCtx extends UseSeparationSectionsReturn {}

const MasterPowerContext = createContext<MasterPowerCtx | null>(null);
const HighAmpContext = createContext<HighAmpCtx | null>(null);
const SeparationSectionsContext = createContext<SeparationSectionsCtx | null>(
  null,
);

export function useMasterPowerCtx(): MasterPowerCtx {
  const ctx = useContext(MasterPowerContext);
  if (!ctx) throw new Error("useMasterPowerCtx must be used within App");
  return ctx;
}

export function useHighAmpCtx(): HighAmpCtx {
  const ctx = useContext(HighAmpContext);
  if (!ctx) throw new Error("useHighAmpCtx must be used within App");
  return ctx;
}

export function useSeparationSectionsCtx(): SeparationSectionsCtx {
  const ctx = useContext(SeparationSectionsContext);
  if (!ctx) throw new Error("useSeparationSectionsCtx must be used within App");
  return ctx;
}

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

// ─── Inner app ────────────────────────────────────────────────────────────────

function InnerApp() {
  const [startupDone, setStartupDone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const masterPower = useMasterPower();
  const highAmp = useHighAmp(isPlaying, masterPower.state.masterPower);
  const separationSections = useSeparationSections(isPlaying);

  const handleStartupComplete = useCallback(() => {
    setStartupDone(true);
  }, []);

  return (
    <MasterPowerContext.Provider value={masterPower}>
      <HighAmpContext.Provider value={highAmp}>
        <SeparationSectionsContext.Provider value={separationSections}>
          {/* ── GLOBAL BRANDING BAR ─────────────────────────────────── */}
          <div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-[3px]"
            style={{
              background:
                "linear-gradient(to right, rgba(0,10,35,0.98), rgba(0,20,60,0.97), rgba(0,10,35,0.98))",
              borderBottom: "1px solid rgba(0,120,255,0.25)",
              boxShadow: "0 1px 12px rgba(0,80,200,0.15)",
            }}
          >
            <span
              className="text-[8px] font-mono tracking-[0.4em] uppercase select-none text-glow"
              style={{ color: "rgba(0,180,255,0.75)" }}
            >
              gerrod / engeeier / product / desiger
            </span>
          </div>

          {/* Offset content below branding bar */}
          <div className="pt-[18px] h-full flex flex-col">
            {!startupDone && (
              <StartupSequence onComplete={handleStartupComplete} />
            )}
            <div className={startupDone ? "block h-full" : "invisible h-full"}>
              <PlayerPage
                startupDone={startupDone}
                onPlayingChange={setIsPlaying}
              />
            </div>
          </div>

          <Toaster position="top-center" theme="dark" />
        </SeparationSectionsContext.Provider>
      </HighAmpContext.Provider>
    </MasterPowerContext.Provider>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InnerApp />
    </QueryClientProvider>
  );
}
