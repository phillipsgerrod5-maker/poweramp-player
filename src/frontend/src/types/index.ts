// PowerAmp Player — shared TypeScript types

export type PanelId =
  | "bass"
  | "mids"
  | "highs"
  | "tweeters"
  | "eq"
  | "protection"
  | "epicenter"
  | "cheaterbeater"
  | "equake"
  | "naturalbottom"
  | "soulmode"
  | "atmosmashere"
  | "srs"
  | "xmprocessor"
  | "soundbeaming"
  | "virtualmagnet"
  | "systembooster"
  | "titaniumfuse"
  | "commander"
  | "scanner99"
  | "mastergain"
  | "trackTester"
  | "classicalTrack"
  | "bassSwitch"
  | "epicenterAuto"
  | "freqMatch"
  | "ultraCrystal"
  | "audioBuffer"
  | "chatBlock"
  | "cache"
  | null;

export interface ScanResult {
  id: string;
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
}

export interface CommanderLog {
  ts: number;
  msg: string;
  level: "info" | "warn" | "error" | "fix";
}

export interface EngineState {
  initialized: boolean;
  playing: boolean;
  trackName: string;
  frontlineVol: number;
  masterGainVal: number;
  eqBass: number;
  eqLowMid: number;
  eqVocals: number;
  eqMid: number;
  eqHighMid: number;
  eqTreble: number;
  bassEnabled: boolean;
  midsEnabled: boolean;
  highsEnabled: boolean;
  tweetersEnabled: boolean;
  epicenterEnabled: boolean;
  epicenterDepth: number;
  cheaterBeaterEnabled: boolean;
  cheaterBeaterDepth: number;
  equakeDepth: number;
  midBassEnabled: boolean;
  midBassDepth: number;
  soulModeEnabled: boolean;
  soulModeDepth: number;
  atmosEnabled: boolean;
  atmosWet: number;
  srsEnabled: boolean;
  srsWet: number;
  xmEnabled: boolean;
  xmGain: number;
  soundBeamEnabled: boolean;
  beamIntensity: number;
  virtualMagnetEnabled: boolean;
  virtualMagnetDepth: number;
  systemBoosterEnabled: boolean;
  protectionEnabled: boolean;
  distortionClean: number;
  clippingControl: number;
  particleBreakdown: number;
}
