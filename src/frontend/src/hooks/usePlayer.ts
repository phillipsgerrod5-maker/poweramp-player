/**
 * usePlayer — PowerAmp Player audio core.
 * Volume range: 1–700 (tablet volume engine).
 * Signal path: HTMLAudioElement → MediaElementSource → MasterGain →
 *   Compressor → BassFilter → Bass2Filter → LowMidFilter → MidsFilter →
 *   VocalFilter → HighsFilter → TweetersFilter → NotchFilter → Panner →
 *   Analyser → destination
 *
 * RULES (non-negotiable):
 *   - ONE master GainNode. Fixed after chain build.
 *   - Volume is controlled via audio.volume (HTMLMediaElement), not GainNode.
 *   - Compressor NEVER touched by protection or volume logic. FIXED params.
 *   - No WaveShaper, no LPF controls.
 *   - Silence at volume 0: audio.volume = 0 → complete silence.
 *   - Volume slider handle ALWAYS matches displayed value (input value = raw 1-700).
 */

import { buildEngineInternals } from "@/hooks/useEngine1Internals";
import type { RepeatMode, Track } from "@/types/player";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Volume mapping table ─────────────────────────────────────────────────────
// LINEAR interpolation between these anchor points.
// display: 0 = 0.000 (absolute silence)
// display: 1 = 0.001 (just detectable)
// display: 100 = 0.14
// display: 200 = 0.28
// display: 300 = 0.42
// display: 400 = 0.56
// display: 500 = 0.70
// display: 600 = 0.85
// display: 700 = 1.00

const VOL_ANCHORS: [number, number][] = [
  [0, 0.0],
  [1, 0.001],
  [100, 0.14],
  [200, 0.28],
  [300, 0.42],
  [400, 0.56],
  [500, 0.7],
  [600, 0.85],
  [700, 1.0],
];

/**
 * volumeToAudio — maps display volume (0–700) to HTMLMediaElement.volume (0.0–1.0).
 * Uses piecewise linear interpolation between anchor points.
 * At display 0 → 0.000 (absolute silence, music completely stops).
 * At display 1 → 0.001 (barely present).
 * By display 350 → ~0.49 (strong).
 * At display 700 → 1.0 (maximum).
 */
export function volumeToAudio(display: number): number {
  const d = Math.max(0, Math.min(700, display));
  if (d === 0) return 0; // absolute silence

  // Find the two anchors that bracket this value
  for (let i = 1; i < VOL_ANCHORS.length; i++) {
    const [x0, y0] = VOL_ANCHORS[i - 1]!;
    const [x1, y1] = VOL_ANCHORS[i]!;
    if (d <= x1) {
      // Linear interpolate
      const t = (d - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 1.0;
}

/** Legacy helper — kept for backward compat */
export function displayToVolume(display: number): number {
  return volumeToAudio(display);
}

/** Invert volumeToAudio for display purposes */
export function volumeToDisplay(v: number): number {
  if (v <= 0) return 0;
  const clamped = Math.max(0, Math.min(1.0, v));
  // Walk anchors in reverse to find bracket
  for (let i = VOL_ANCHORS.length - 1; i > 0; i--) {
    const [x0, y0] = VOL_ANCHORS[i - 1]!;
    const [x1, y1] = VOL_ANCHORS[i]!;
    if (clamped >= y0) {
      if (y1 === y0) return x0;
      const t = (clamped - y0) / (y1 - y0);
      return Math.round(x0 + t * (x1 - x0));
    }
  }
  return 1;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Master GainNode value — FIXED at 1.0 after chain build.
 * This is the ONLY GainNode in the signal path.
 * Volume is controlled via audio.volume (HTMLMediaElement), not via gain changes.
 * Master power (useMasterPower) adjusts this AFTER volume — it is a power slider.
 */
const BASE_MASTER_GAIN = 1.0;

/** Default display volume on load — 350 maps to ~0.49 audio level (comfortable normal listening) */
const DEFAULT_DISPLAY_VOL = 350;

// ─── Singleton audio nodes ────────────────────────────────────────────────────

let sharedCtx: AudioContext | null = null;
let sharedSource: MediaElementAudioSourceNode | null = null;
let sharedMasterGain: GainNode | null = null;
let sharedCompressor: DynamicsCompressorNode | null = null;
let sharedBassFilter: BiquadFilterNode | null = null;
let sharedBass2Filter: BiquadFilterNode | null = null;
let sharedLowMidFilter: BiquadFilterNode | null = null;
let sharedMidsFilter: BiquadFilterNode | null = null;
let sharedVocalFilter: BiquadFilterNode | null = null;
let sharedHighsFilter: BiquadFilterNode | null = null;
let sharedTweetersFilter: BiquadFilterNode | null = null;
let sharedNotchFilter: BiquadFilterNode | null = null;
let sharedPanner: StereoPannerNode | null = null;
let sharedAnalyser: AnalyserNode | null = null;

/**
 * buildAudioChain — builds the full signal chain once.
 * Calling again is a no-op (chain is singleton).
 *
 * Chain:
 *   audio → source → masterGain (FIXED 1.0) → compressor (FIXED, transparent)
 *         → bass (lowshelf 28Hz) → bass2 (peaking 20Hz)
 *         → lowmid (peaking 400Hz) → mids (peaking 1200Hz)
 *         → vocal (peaking 1800Hz, 3Ω crystal) → highs (highshelf 4000Hz)
 *         → tweeters (highshelf 10kHz) → notch (75Hz isolation)
 *         → panner → analyser → destination
 */
export function buildAudioChain(audio: HTMLAudioElement): void {
  if (sharedSource) return; // singleton — never rebuild

  try {
    if (!sharedCtx || sharedCtx.state === "closed") {
      sharedCtx = new AudioContext({ sampleRate: 48000 });
    }
    const ctx = sharedCtx;

    const source = ctx.createMediaElementSource(audio);

    // ── ENGINE 1 INTERNALS — 50 components, Groups 1-2-3 ACTIVE ─────────
    // Inserted between source and masterGain.
    // Groups 1-2-3 (nodes 1-30) are active in the signal chain.
    // Groups 4-5 (nodes 31-50) are bypassed. Falls back if internals fail.
    let engineOutput: AudioNode = source;
    try {
      engineOutput = buildEngineInternals(ctx, source);
    } catch (e) {
      console.error(
        "[PowerAmp] Engine internals failed, using direct source:",
        e,
      );
    }

    // ── ONE master GainNode — FIXED at 1.0, never changed by volume ─────────
    // Master Power (useMasterPower) adjusts this — it is a POWER slider.
    // Volume uses audio.volume (HTMLMediaElement) on the source element.
    const masterGain = ctx.createGain();
    masterGain.gain.value = BASE_MASTER_GAIN;

    // ── Compressor — FIXED, TRANSPARENT. NEVER modified by any other system ─
    // threshold: -6dB  — catches only genuine peaks
    // knee: 10         — gentle transition
    // ratio: 3         — mild limiting, not pumping
    // attack: 0.003s   — fast enough to catch transients
    // release: 0.1s    — clean release, no pumping
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.1;

    // ── BASS PRIMARY — lowshelf 28Hz, Q=0.7 ─────────────────────────────────
    // Covers full 14-60Hz foundation.
    // Commander pre-bias: +1.5dB so bass fires from first touch, zero dead zone.
    const bassF = ctx.createBiquadFilter();
    bassF.type = "lowshelf";
    bassF.frequency.value = 28; // reaches 14Hz territory
    bassF.gain.value = 1.5; // Smart Chip Commander pre-bias — always on
    bassF.Q.value = 0.7; // wide shelf covers full 14-60Hz

    // ── BASS SECONDARY — peaking 20Hz, Q=1.2 ────────────────────────────────
    // 14Hz deep extension — adds physical sub-bass that lowshelf alone misses.
    // Starts at 0dB — EQ bass slider adds depth on top.
    const bass2F = ctx.createBiquadFilter();
    bass2F.type = "peaking";
    bass2F.frequency.value = 20;
    bass2F.gain.value = 0;
    bass2F.Q.value = 1.2;

    // ── LOW MID — dedicated peaking 400Hz, Q=1.5 ────────────────────────────
    // 300-800Hz body and warmth. Fully independent of all other bands.
    const lowmidF = ctx.createBiquadFilter();
    lowmidF.type = "peaking";
    lowmidF.frequency.value = 400;
    lowmidF.gain.value = 0;
    lowmidF.Q.value = 1.5;

    // ── MID — dedicated peaking 1200Hz, Q=1.0 ───────────────────────────────
    // 800Hz-2.5kHz presence and detail. Fully independent.
    const midsF = ctx.createBiquadFilter();
    midsF.type = "peaking";
    midsF.frequency.value = 1200;
    midsF.gain.value = 0;
    midsF.Q.value = 1.0;

    // ── VOCAL — Dark Nice Crystal 3Ω ────────────────────────────────────────
    // Dedicated peaking 1800Hz, Q=2.0. Commander-protected vocal presence filter.
    const vocalF = ctx.createBiquadFilter();
    vocalF.type = "peaking";
    vocalF.frequency.value = 1800;
    vocalF.gain.value = 0;
    vocalF.Q.value = 2.0;

    // ── HIGH MID — highshelf 4000Hz, Q=0.8 ──────────────────────────────────
    // 2.5-8kHz. Never mixes with bass (20-30 x86 separator).
    const highsF = ctx.createBiquadFilter();
    highsF.type = "highshelf";
    highsF.frequency.value = 4000;
    highsF.gain.value = 0;
    highsF.Q.value = 0.8;

    // ── TREBLE / SMOOTH TWEETERS — highshelf 10kHz, Q=0.5 ───────────────────
    // 8-20kHz. Pre-bias +2dB for crystal clear tweeters at zero harshness.
    const tweetersF = ctx.createBiquadFilter();
    tweetersF.type = "highshelf";
    tweetersF.frequency.value = 10000;
    tweetersF.gain.value = 2; // smooth tweeter presence — crystal clear
    tweetersF.Q.value = 0.5;

    // ── ISOLATION FUSE — notch 75Hz, Q=10 ───────────────────────────────────
    // Prevents highs-to-bass signal bleed. Enforces separation wall.
    const notchF = ctx.createBiquadFilter();
    notchF.type = "notch";
    notchF.frequency.value = 75;
    notchF.Q.value = 10;

    // ── SRS spatializer panner ───────────────────────────────────────────────
    const panner = ctx.createStereoPanner();
    panner.pan.value = 0;

    // ── Analyser — FFT 2048, smoothing 0.8 ──────────────────────────────────
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    // ── Wire the chain ───────────────────────────────────────────────────────
    engineOutput
      .connect(masterGain)
      .connect(comp)
      .connect(bassF)
      .connect(bass2F)
      .connect(lowmidF)
      .connect(midsF)
      .connect(vocalF)
      .connect(highsF)
      .connect(tweetersF)
      .connect(notchF)
      .connect(panner)
      .connect(analyser)
      .connect(ctx.destination);

    // Store singletons
    sharedSource = source;
    sharedMasterGain = masterGain;
    sharedCompressor = comp;
    sharedBassFilter = bassF;
    sharedBass2Filter = bass2F;
    sharedLowMidFilter = lowmidF;
    sharedMidsFilter = midsF;
    sharedVocalFilter = vocalF;
    sharedHighsFilter = highsF;
    sharedTweetersFilter = tweetersF;
    sharedNotchFilter = notchF;
    sharedPanner = panner;
    sharedAnalyser = analyser;

    console.log(
      "%c[PowerAmp] Chain built — Direct 4-gauge wired",
      "color: #00d5ff; font-weight: bold;",
      "\n  masterGain:",
      masterGain.gain.value,
      "| compressor: thresh=-6dB knee=10 ratio=3 FIXED",
      "\n  bass: 28Hz lowshelf Q=0.7 bias=+1.5dB",
      "| bass2: 20Hz peaking Q=1.2",
      "\n  vocal: 1800Hz 3Ω crystal | tweeters: 10kHz +2dB smooth",
    );
  } catch (e) {
    console.error("[PowerAmp] buildAudioChain error:", e);
    sharedSource = null;
  }
}

// ─── Shared node accessors ────────────────────────────────────────────────────

export const getSharedCtx = (): AudioContext | null => sharedCtx;
export const getSharedAnalyser = (): AnalyserNode | null => sharedAnalyser;
export const getSharedMasterGain = (): GainNode | null => sharedMasterGain;
export const getSharedCompressor = (): DynamicsCompressorNode | null =>
  sharedCompressor;
export const getSharedBassFilter = (): BiquadFilterNode | null =>
  sharedBassFilter;
export const getSharedBass2Filter = (): BiquadFilterNode | null =>
  sharedBass2Filter;
export const getSharedLowMidFilter = (): BiquadFilterNode | null =>
  sharedLowMidFilter;
export const getSharedMidsFilter = (): BiquadFilterNode | null =>
  sharedMidsFilter;
export const getSharedVocalFilter = (): BiquadFilterNode | null =>
  sharedVocalFilter;
export const getSharedHighsFilter = (): BiquadFilterNode | null =>
  sharedHighsFilter;
export const getSharedTweetersFilter = (): BiquadFilterNode | null =>
  sharedTweetersFilter;
export const getSharedNotchFilter = (): BiquadFilterNode | null =>
  sharedNotchFilter;
export const getSharedPanner = (): StereoPannerNode | null => sharedPanner;

// ─── AudioContext resume helper ───────────────────────────────────────────────

async function resumeCtx(): Promise<void> {
  if (!sharedCtx || sharedCtx.state !== "suspended") return;
  try {
    await sharedCtx.resume();
  } catch (e) {
    console.error("[PowerAmp] resume error:", e);
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const VOL_STORAGE_KEY = "poweramp_volume";

function loadSavedVolume(): number {
  try {
    const raw = localStorage.getItem(VOL_STORAGE_KEY);
    if (raw !== null) {
      const v = Number.parseInt(raw, 10);
      if (Number.isFinite(v) && v >= 1 && v <= 700) return v;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_DISPLAY_VOL;
}

// ─── Track factory ────────────────────────────────────────────────────────────

let _trackIdSeed = 1;

function makeTrack(file: File): Track {
  const src = URL.createObjectURL(file);
  const rawName = file.name.replace(/\.[^.]+$/, "");
  return {
    id: `track-${_trackIdSeed++}`,
    title: rawName,
    name: rawName,
    artist: "Unknown Artist",
    duration: 0,
    src,
    url: src,
    file,
  };
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export type AudioStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error"
  | "blocked";

export interface UsePlayerReturn {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Display volume 1–700. THIS is the value fed directly to the slider input. */
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  audioStatus: AudioStatus;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  loadFiles: (files: FileList) => void;
  play: () => Promise<void>;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (t: number) => void;
  /**
   * setVolume — set display volume (1–700).
   * This is the ONLY way volume changes. No running, no skipping.
   * Every integer is a real stop. Saves to localStorage automatically.
   * Slider input: <input min="1" max="700" value={volume} onChange={...} />
   * The handle position matches the value exactly — no percentage mapping.
   */
  setVolume: (display: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  playTrack: (track: Track) => void;
  removeFromQueue: (id: string) => void;
}

// ─── usePlayer hook ───────────────────────────────────────────────────────────

export function usePlayer(): UsePlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chainBuilt = useRef(false);

  const savedVol = loadSavedVolume();
  // volumeRef tracks the HTMLMediaElement.volume value (0.0–1.0)
  const volumeRef = useRef<number>(volumeToAudio(savedVol));

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // volume state holds the RAW display value 1-700.
  // This exact value goes into <input min="1" max="700" value={volume} />.
  // The handle WILL match the position because the input range matches.
  const [volume, setVolumeState] = useState(savedVol);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("idle");

  // Stable refs for callbacks
  const queueRef = useRef<Track[]>(queue);
  const currentIndexRef = useRef(currentIndex);
  const isShuffleRef = useRef(isShuffle);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);

  queueRef.current = queue;
  currentIndexRef.current = currentIndex;
  isShuffleRef.current = isShuffle;
  repeatModeRef.current = repeatMode;

  // ─── Build audio element once ───────────────────────────────────────────

  useEffect(() => {
    const audio = new Audio();
    // Apply saved volume immediately — before any interaction
    audio.volume = volumeRef.current;
    audio.muted = false;
    audio.preload = "auto";
    audioRef.current = audio;

    // Resume AudioContext on ANY user gesture
    const resumeOnGesture = () => {
      void resumeCtx();
    };
    document.addEventListener("click", resumeOnGesture);
    document.addEventListener("touchstart", resumeOnGesture, { passive: true });
    document.addEventListener("keydown", resumeOnGesture);

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => {
      setIsPlaying(true);
      setAudioStatus("playing");
    };
    const onPause = () => {
      setIsPlaying(false);
      setAudioStatus("paused");
    };
    const onError = () => setAudioStatus("error");

    const onEnded = () => {
      const q = queueRef.current;
      const idx = currentIndexRef.current;
      const rep = repeatModeRef.current;
      const shuf = isShuffleRef.current;

      if (rep === "one") {
        audio.currentTime = 0;
        void resumeCtx().then(() => audio.play().catch(console.error));
        return;
      }
      if (q.length === 0) return;

      let nextIdx: number;
      if (shuf) {
        nextIdx = Math.floor(Math.random() * q.length);
      } else {
        nextIdx = idx + 1;
        if (nextIdx >= q.length) {
          if (rep === "all") nextIdx = 0;
          else return;
        }
      }
      const track = q[nextIdx];
      if (!track) return;
      audio.src = track.src;
      audio.load();
      setCurrentIndex(nextIdx);
      void resumeCtx().then(() => audio.play().catch(console.error));
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      document.removeEventListener("click", resumeOnGesture);
      document.removeEventListener("touchstart", resumeOnGesture);
      document.removeEventListener("keydown", resumeOnGesture);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Ensure audio chain is built ─────────────────────────────────────────

  const ensureChain = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || chainBuilt.current) return;
    buildAudioChain(audio);
    chainBuilt.current = !!sharedSource;
  }, []);

  // ─── Play a track by index ────────────────────────────────────────────────

  const playAtIndex = useCallback(
    async (idx: number) => {
      const audio = audioRef.current;
      const q = queueRef.current;
      if (!audio || idx < 0 || idx >= q.length) return;
      const track = q[idx];
      if (!track) return;
      audio.src = track.src;
      audio.load();
      setCurrentIndex(idx);
      setCurrentTime(0);
      ensureChain();
      setAudioStatus("loading");
      // Restore volume on every play — ensures no silent playback
      audio.volume = volumeRef.current;
      await resumeCtx();
      if (sharedCtx && sharedCtx.state !== "running") {
        setAudioStatus("blocked");
        return;
      }
      try {
        await audio.play();
        setAudioStatus("playing");
      } catch (err) {
        console.error("[PowerAmp] play error:", err);
        setAudioStatus("error");
      }
    },
    [ensureChain],
  );

  // ─── Public API ──────────────────────────────────────────────────────────

  const loadFiles = useCallback(
    (files: FileList) => {
      const tracks = Array.from(files).map(makeTrack);
      setQueue((prev) => {
        const next = [...prev, ...tracks];
        queueRef.current = next;
        if (prev.length === 0 && tracks.length > 0) {
          void playAtIndex(0);
        }
        return next;
      });
    },
    [playAtIndex],
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureChain();
    audio.volume = volumeRef.current;
    await resumeCtx();
    if (sharedCtx && sharedCtx.state !== "running") {
      setAudioStatus("blocked");
      return;
    }
    try {
      await audio.play();
      setAudioStatus("playing");
    } catch (err) {
      console.error("[PowerAmp] play error:", err);
      setAudioStatus("error");
    }
  }, [ensureChain]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const next = useCallback(() => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    const shuf = isShuffleRef.current;
    if (q.length === 0) return;
    const nextIdx = shuf
      ? Math.floor(Math.random() * q.length)
      : (idx + 1) % q.length;
    void playAtIndex(nextIdx);
  }, [playAtIndex]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    const idx = currentIndexRef.current;
    const q = queueRef.current;
    if (!audio || q.length === 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIdx = isShuffleRef.current
      ? Math.floor(Math.random() * q.length)
      : (idx - 1 + q.length) % q.length;
    void playAtIndex(prevIdx);
  }, [playAtIndex]);

  const seekTo = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  }, []);

  /**
   * setVolume — tablet volume engine. Display range: 1–700.
   *
   * SLIDER WIRING:
   *   <input type="range" min="1" max="700" value={volume} onChange={e => setVolume(Number(e.target.value))} />
   *   The input value IS the display volume. No percentage mapping. Handle always matches.
   *
   * SILENCE:
   *   When display = 0, audio.volume = 0 → complete silence.
   *   But valid range for tap up/down is 1–700.
   *
   * AUTO-SAVE: Every call saves to localStorage.
   */
  const setVolume = useCallback((display: number) => {
    // Clamp to 1–700 integer — every number is a real stop
    const clamped = Math.max(1, Math.min(700, Math.round(display)));
    const audioVol = volumeToAudio(clamped);
    volumeRef.current = audioVol;

    // Apply to the audio element immediately
    const audio = audioRef.current;
    if (audio) audio.volume = audioVol;

    // Update React state — this is what the slider input reads
    setVolumeState(clamped);

    // Auto-save every tap
    try {
      localStorage.setItem(VOL_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle((s) => !s), []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((r) => {
      const modes: RepeatMode[] = ["none", "all", "one"];
      return modes[(modes.indexOf(r) + 1) % modes.length];
    });
  }, []);

  const playTrack = useCallback(
    (track: Track) => {
      const q = queueRef.current;
      const idx = q.findIndex((t) => t.id === track.id);
      if (idx >= 0) {
        void playAtIndex(idx);
      } else {
        setQueue((prev) => {
          const next = [...prev, track];
          queueRef.current = next;
          void playAtIndex(next.length - 1);
          return next;
        });
      }
    },
    [playAtIndex],
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.filter((t) => t.id !== id);
      queueRef.current = next;
      const idx = currentIndexRef.current;
      if (prev[idx]?.id === id) {
        audioRef.current?.pause();
        setCurrentIndex(-1);
      } else if (idx >= next.length) {
        setCurrentIndex(next.length - 1);
      }
      return next;
    });
  }, []);

  return {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume, // RAW 1-700 — use directly as <input value={volume} />
    isShuffle,
    repeatMode,
    audioStatus,
    audioRef,
    loadFiles,
    play,
    pause,
    next,
    prev,
    seekTo,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    playTrack,
    removeFromQueue,
  };
}
