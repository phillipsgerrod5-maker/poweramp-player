import { useCallback, useEffect, useRef, useState } from "react";
import { PowerAmpEngine } from "../audio/engine";
import type { EngineStatus } from "../types";

const DEFAULT_STATUS: EngineStatus = {
  initialized: false,
  isPlaying: false,
  currentTrack: null,
  audioContextState: "suspended",
  frontlineVolume: 490,
  masterGain: 1.0,
  bassLevel: 0.7,
  midsLevel: 1.0,
  highsLevel: 1.0,
  eqValues: { bass: 0, lowMid: 0, vocals: 0, mid: 0, highMid: 0, treble: 0 },
  commanderLights: {
    audioCtx: false,
    powerChain: false,
    commander: false,
    vpc120kw: false,
    bassCh1: false,
    bassCh2: false,
    mids: false,
    highs: false,
  },
  thunderBatteryStable: true,
  cheaterBeaterActive: false,
  eQuakeActive: false,
  epicenterLevel: 0,
  soulModeLevel: 0,
};

export function useAudioEngine() {
  const engine = PowerAmpEngine.getInstance();
  const [status, setStatus] = useState<EngineStatus>(DEFAULT_STATUS);
  const [initialized, setInitialized] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initEngine = useCallback(async () => {
    try {
      await engine.initialize();
      setInitialized(true);
      setStatus(engine.getStatus());
    } catch (err) {
      console.error("Engine init failed:", err);
    }
  }, [engine]);

  useEffect(() => {
    if (!initialized) return;
    pollRef.current = setInterval(() => {
      setStatus(engine.getStatus());
    }, 500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [initialized, engine]);

  const loadTrack = useCallback(
    async (file: File) => {
      if (!initialized) await initEngine();
      await engine.loadTrack(file);
      setStatus(engine.getStatus());
    },
    [engine, initialized, initEngine],
  );

  const play = useCallback(() => {
    engine.play();
  }, [engine]);
  const pause = useCallback(() => {
    engine.pause();
  }, [engine]);
  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const setFrontlineVolume = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setFrontlineVolume(v);
    },
    [engine, initialized],
  );

  const setMasterGain = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setMasterGain(v);
    },
    [engine, initialized],
  );

  const setBassEQ = useCallback(
    (db: number) => {
      if (!initialized) return;
      engine.setBassEQ(db);
    },
    [engine, initialized],
  );

  const setLowMidEQ = useCallback(
    (db: number) => {
      if (!initialized) return;
      engine.setLowMidEQ(db);
    },
    [engine, initialized],
  );

  const setVocalsEQ = useCallback(
    (db: number) => {
      if (!initialized) return;
      engine.setVocalsEQ(db);
    },
    [engine, initialized],
  );

  const setMidEQ = useCallback(
    (db: number) => {
      if (!initialized) return;
      engine.setMidEQ(db);
    },
    [engine, initialized],
  );

  const setHighMidEQ = useCallback(
    (db: number) => {
      if (!initialized) return;
      engine.setHighMidEQ(db);
    },
    [engine, initialized],
  );

  const setTrebleEQ = useCallback(
    (db: number) => {
      if (!initialized) return;
      engine.setTrebleEQ(db);
    },
    [engine, initialized],
  );

  const setCheaterBeater = useCallback(
    (active: boolean, value: number) => {
      if (!initialized) return;
      engine.setCheaterBeater(active, value);
    },
    [engine, initialized],
  );

  const setEQuake = useCallback(
    (active: boolean, depth: number) => {
      if (!initialized) return;
      engine.setEQuake(active, depth);
    },
    [engine, initialized],
  );

  const setEpicenter = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setEpicenter(v);
    },
    [engine, initialized],
  );

  const setSoulMode = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setSoulMode(v);
    },
    [engine, initialized],
  );

  const setNaturalBottom = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setNaturalBottom(v);
    },
    [engine, initialized],
  );

  const setDistortionClean = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setDistortionClean(v);
    },
    [engine, initialized],
  );

  const setClippingControl = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setClippingControl(v);
    },
    [engine, initialized],
  );

  const setParticleBreakdown = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setParticleBreakdown(v);
    },
    [engine, initialized],
  );

  const setMidsLevel = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setMidsLevel(v);
    },
    [engine, initialized],
  );

  const setHighsLevel = useCallback(
    (v: number) => {
      if (!initialized) return;
      engine.setHighsLevel(v);
    },
    [engine, initialized],
  );

  const getAnalyserData = useCallback(() => engine.getAnalyserData(), [engine]);

  return {
    engine,
    status,
    initialized,
    initEngine,
    loadTrack,
    play,
    pause,
    stop,
    setFrontlineVolume,
    setMasterGain,
    setBassEQ,
    setLowMidEQ,
    setVocalsEQ,
    setMidEQ,
    setHighMidEQ,
    setTrebleEQ,
    setCheaterBeater,
    setEQuake,
    setEpicenter,
    setSoulMode,
    setNaturalBottom,
    setDistortionClean,
    setClippingControl,
    setParticleBreakdown,
    setMidsLevel,
    setHighsLevel,
    getAnalyserData,
  };
}
