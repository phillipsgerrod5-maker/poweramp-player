// ─── Core Track & Playback ────────────────────────────────────────────────────

export interface Track {
  id: string;
  /** Display title (primary label) */
  title: string;
  /** File name fallback — kept for backward compat */
  name: string;
  artist: string;
  album?: string;
  duration: number; // seconds
  /** Object URL or static path */
  src: string;
  /** Legacy alias for src */
  url: string;
  file: File | null;
  albumArt?: string;
}

export type RepeatMode = "none" | "one" | "all";

export interface PlayerState {
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** Display scale 1–700 (tablet volume engine) */
  volume: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  albumArt?: string;
}

// ─── Bass Types ───────────────────────────────────────────────────────────────

export type BassType =
  | "deep"
  | "tight"
  | "punchy"
  | "warm"
  | "sub"
  | "natural"
  | "crisp";

// ─── EQ State ─────────────────────────────────────────────────────────────────
// 6 fully independent bands — every slider is its own node, no shared state.

export interface EQState {
  /** BASS — 14-50Hz, lowshelf, Commander pre-bias +1.5dB */
  bass: number; // -18 to +18 dB
  /** LOW MID — 300-800Hz, peaking 400Hz Q=1.5 */
  lowMid: number;
  /** VOCALS — Dark Nice Crystal 3Ω, peaking 1800Hz Q=2.0, Commander protected */
  vocals: number;
  /** MID — 800Hz-2.5kHz, peaking 1200Hz Q=1.0 */
  mid: number;
  /** HIGH MID — 2.5-8kHz, highshelf 4000Hz */
  highMid: number;
  /** TREBLE — 8-20kHz, highshelf 10kHz, smooth tweeters */
  treble: number;
}

// ─── Protection State ─────────────────────────────────────────────────────────

export interface ProtectionState {
  stabilizerStrength: string;
  commanderActive: boolean;
  commanderStrength: string;
  commanderReachesEQ: boolean;
  distortionLevel: number;
  clippingRate: number;
  isActing: boolean;
  bassDistortion: number;
  midsDistortion: number;
  highsDistortion: number;
  commanderPowerDraw: number;
  commanderActive2: boolean;
}

// ─── New Protection State — All 3 sliders ─────────────────────────────────────

export interface NewProtectionState {
  /** Slider 1: distortion/clipping/output cleaner — range 1-10, never touches volume */
  slider1: number;
  /** Slider 2: noise reduction for clipping ONLY — range 1-10, never touches volume */
  slider2: number;
  /** Slider 3: TBD System Reserved — always locked */
  slider3_placeholder: true;
  /** Overall loudness limit — range 1-10 */
  loudnessLimit: number;
  isActive: boolean;
}

// ─── Vocal State ──────────────────────────────────────────────────────────────

export interface VocalState {
  vocalGain: number;
  vocalCommanderActive: boolean;
}

// ─── Natural Bottom State ─────────────────────────────────────────────────────

export interface NaturalBottomState {
  active: boolean;
  targetHz: number;
  gainLevel: number;
  voiceDetected: boolean;
}

// ─── SRS HD 9.0 State ─────────────────────────────────────────────────────────

export interface SrsHD9State {
  hd9Active: boolean;
  pumpingExcursionActive: boolean;
  excursionStrength: number;
  naturalBottom: boolean;
  naturalBottomHz: number;
  instrumentClarityScore: number;
  smoothTweeters: boolean;
  monitorSensorsActive: boolean;
}

// ─── Automasphers State ───────────────────────────────────────────────────────

export interface AutomasphersState {
  dynamicActive: boolean;
  cleanActive: boolean;
  modifiedActive: boolean;
  breathingLevel: number;
  bassTriggered: boolean;
}

// ─── SRS State ────────────────────────────────────────────────────────────────

export type SrsClarityGrade = "A+" | "B+" | "C+" | "D+";

export interface SrsState {
  active: boolean;
  isActive: boolean;
  hd90Active: boolean;
  hdMonitorActive: boolean;
  expansionFactor: number;
  surroundActive: boolean;
  clarityGrade: SrsClarityGrade;
  clarity: SrsClarityGrade;
  noiseFloor: number;
  thdLevel: number;
  autosphereActive: boolean;
  smartChipActive: boolean;
  leftLevel: number;
  rightLevel: number;
  clarityScore: number;
  automaspherLevel: number;
  sensorReading: {
    bass: number;
    mids: number;
    highs: number;
    tweeters: number;
  };
  soundProjectsOutside: boolean;
  hd9: SrsHD9State;
  automasphers: AutomasphersState;
  naturalBottom: NaturalBottomState;
}

// ─── SRS Config ───────────────────────────────────────────────────────────────

export interface SrsConfig {
  hdEnabled: boolean;
  automasphersEnabled: boolean;
  smoothTweeters: boolean;
  naturalBottom: boolean;
  expansionFactor: number;
}

// ─── SRS Ohms Filter ──────────────────────────────────────────────────────────

export type OhmCharacter = "2ohm" | "4ohm" | "blend";

export interface SrsOhmsState {
  active: boolean;
  punchStrength: number;
  presenceStrength: number;
  responseSpeed: number;
  ohmCharacter: OhmCharacter;
}

// ─── XM State ─────────────────────────────────────────────────────────────────
// XM Processor deleted — XmState kept as minimal stub for backward-compat imports.

export interface XmState {
  staticLevel: number;
  enabled: boolean;
  slopeDB: 24;
  snrDB: number;
  thdPct: number;
}

// ─── Virtual Amp ──────────────────────────────────────────────────────────────

export type AmpScreenId =
  | "signal-chain"
  | "power-bank"
  | "volume-eq"
  | "commander"
  | "xm-connections"
  | "bass-analyzer";

export interface AmpScreen {
  id: AmpScreenId;
  label: string;
  icon: string;
}

export interface AmpChannels {
  bass: number;
  mids: number;
  highs: number;
  tweeters: number;
}

export interface VirtualAmpState {
  currentScreen: AmpScreenId;
  isOpen: boolean;
  volume: number;
  eqBass: number;
  eqMids: number;
  eqHighs: number;
  eqTweeters: number;
  bassPreset: number;
  earthquakeMode: boolean;
  srsActive: boolean;
  srsExpansion: number;
  channels: AmpChannels;
}

// ─── Virtual Amp Power Supply ─────────────────────────────────────────────────

export interface VirtualAmpPowerOutput {
  display: string;
  real: number;
}

export interface VirtualAmpPowerSupplyState {
  sourceChannelOutput: number;
  tweeters: VirtualAmpPowerOutput;
  mids: VirtualAmpPowerOutput;
  highs: VirtualAmpPowerOutput;
  bass: VirtualAmpPowerOutput;
  totalPowerSupply: number;
}

// ─── Engine 1 State ───────────────────────────────────────────────────────────

export interface Engine1State {
  channels: Array<{
    id: number;
    assignment: string;
    output: number;
    active: boolean;
  }>;
  safetySwitch: boolean;
  fuseCount: number;
  batteryLevel: number;
  signalBoosterActive: boolean;
  stabilizerActive: boolean;
  commanderStrength: number;
}

// ─── Master Power State ───────────────────────────────────────────────────────

export interface MasterPowerState {
  masterPower: number;
  powerLevel: number;
  isActive: boolean;
  strengthLabel: string;
  gainMultiplier: number;
  virtualPower: number;
  realPower: number;
  chargerActive: boolean;
  batteriesCharged: boolean;
  chargeLevel: number;
  chargerStrength: string;
}

// ─── Cheater Beater ───────────────────────────────────────────────────────────

export interface CheaterBeaterState {
  enabled: boolean;
  hz33Level: number;
  mutuallyExclusiveWith14_60: boolean;
}

// ─── Atmosmasphere State ──────────────────────────────────────────────────────

export interface AtmosChipStatus {
  id: number;
  name: string;
  shortName: string;
  active: boolean;
}

export interface AtmosSensorData {
  leftEnergy: number;
  rightEnergy: number;
  forwardEnergy: number;
  spatialEnergy: number;
  bassGrounded: boolean;
}

export interface AtmosState {
  active: boolean;
  chips: AtmosChipStatus[];
  sensorData: AtmosSensorData;
  strengthNumber: string;
  commanderEmbedded: boolean;
  powerSource: string;
}

export interface AtmosphereConfig {
  enabled: boolean;
  chipCount: 30;
  sensorCount: 30;
  mode: "auto" | "vr";
  vrEnabled: boolean;
}

// ─── Sound Beaming + VR Bubble ────────────────────────────────────────────────

export interface SoundBeamingState {
  enabled: boolean;
  groupMode: boolean;
  wallMapping: boolean;
  vrMode: boolean;
  roomWidth: number;
  roomHeight: number;
  beamStrength: number;
  vrDepth: number;
  listenerCount: number;
  bubblesActive: boolean;
}

// ─── Startup Sequence ─────────────────────────────────────────────────────────

export type StartupStageId =
  | "batteries"
  | "fuses"
  | "amp"
  | "features"
  | "settings";

export interface StartupPhase {
  id: StartupStageId;
  label: string;
  icon: string;
  duration: number;
}

export interface StartupState {
  phase: StartupStageId | "complete";
  completed: StartupStageId[];
  active: boolean;
}

// ─── Analyzer Profile ─────────────────────────────────────────────────────────

export interface AnalyzerProfile {
  speakerName: string;
  ohms: number;
  watts: number;
  fallbackOhms: number;
  fallbackWatts: number;
  frequencyRange: { min: number; max: number };
  assignedAt: number;
  unit?: number;
  primaryOhms?: number;
  primaryWatts?: number;
  freqMin?: number;
  freqMax?: number;
  locked?: boolean;
  brand?: string;
  usingFallback?: boolean;
}

export interface AnalyzerTableEntry {
  unit: number;
  primaryOhms: number;
  primaryWatts: number;
  fallbackOhms: number;
  fallbackWatts: number;
}

export const ANALYZER_TABLE: AnalyzerProfile[] = [];

// ─── 99.0 Fix Scanner ─────────────────────────────────────────────────────────

export type ScanStage =
  | "idle"
  | "initializing"
  | "system-check"
  | "network-scan"
  | "audio-engine"
  | "deep-analysis"
  | "help-prompted"
  | "diagnostics"
  | "compiling"
  | "complete"
  | "fix-panel";

export interface ScanFix {
  id: string;
  label: string;
  description: string;
  selected: boolean;
}

export interface LogMessage {
  id: string;
  text: string;
}

export interface ScannerState {
  isOpen: boolean;
  isScanning: boolean;
  stage: ScanStage;
  progress: number;
  messages: LogMessage[];
  showHelpPrompt: boolean;
  showFixPanel: boolean;
  selectedFixes: string[];
  fixes: ScanFix[];
}

// ─── Separation Sections ──────────────────────────────────────────────────────

export interface SeparationSection {
  id: number;
  name: string;
  strength: string;
  active: boolean;
  status: "ok" | "monitoring" | "correcting";
}

export interface HighAmpState {
  active: boolean;
  power: number;
  channelStrength: number;
  commanderActive: boolean;
  separatorActive: boolean;
  sections: SeparationSection[];
  routedFeatures: string[];
}

// ─── Stacked Filters ──────────────────────────────────────────────────────────

export interface StackedMidFilters {
  presence: number;
  body: number;
  clarity: number;
}

export interface StackedHighFilters {
  air: number;
  detail: number;
  brilliance: number;
}

export interface StackedFiltersState {
  midFilters: StackedMidFilters;
  highFilters: StackedHighFilters;
  stackStrength: string;
  commanderActive: boolean;
}

// ─── Rubber Cotton Engine ─────────────────────────────────────────────────────
// RubberCottonState deleted — carbon fiber WaveShaper caused crash.

export interface SeparationSectionsState {
  sections: SeparationSection[];
  totalSections: number;
}

// ─── Soul Mode ────────────────────────────────────────────────────────────────

export interface SoulModeState {
  enabled: boolean;
  /** 0-100% harmonic preservation strength */
  harmonicPreservation: number;
  bassChannelActive: boolean;
  harmonicsPlayingThroughMids: boolean;
}

// ─── Epicenter ────────────────────────────────────────────────────────────────

export interface EpicenterState {
  active: boolean;
  /** 2-4 active smart chips */
  chipsActive: number;
  rangeHz: string;
  detecting: boolean;
  foundationHeld: boolean;
  /** 0-9 index into bass profiles */
  profileLocked: number;
}

// ─── Frequency Profile ────────────────────────────────────────────────────────

export interface FrequencyProfile {
  id: number;
  name: string;
  range: string;
  character: string;
  active: boolean;
}

// ─── Frequency Matching ───────────────────────────────────────────────────────

export interface FrequencyMatchingState {
  bassProfileIndex: number;
  highProfileIndex: number;
  autoSelect: boolean;
  bassProfiles: FrequencyProfile[];
  highProfiles: FrequencyProfile[];
}

// ─── Multi-Frequency Hit System ───────────────────────────────────────────────

export interface MultiFreqHitState {
  /** 3-4 active dominant bass frequencies (Hz) */
  bassFreqs: number[];
  /** 3-4 active dominant mid frequencies (Hz) */
  midFreqs: number[];
  /** 3-4 active dominant high frequencies (Hz) */
  highFreqs: number[];
  switching: boolean;
}

// ─── Bass Note Switching ──────────────────────────────────────────────────────

export interface BassNoteSwitchingState {
  enabled: boolean;
  /** Current dominant bass note in Hz */
  currentBassNote: number;
  currentMidProfile: string;
  currentHighProfile: string;
  manualOverride: boolean;
  lockedProfile: number | null;
}

// ─── Titanium Wall ────────────────────────────────────────────────────────────

export interface TitaniumWallState {
  active: boolean;
  /** Always 1000 */
  powerRating: number;
  /** Always 10 */
  widthInches: number;
  bassSide: {
    bang: boolean;
    boom: boolean;
    bottom: boolean;
    subFoundation: boolean;
  };
  midsSide: {
    instrumentFocus: boolean;
    isolationActive: boolean;
  };
  /** Always 6 — covers all 6 protection sliders */
  protectionSlots: number;
  channelPowered: boolean;
}

// ─── Zero Restriction Gain ────────────────────────────────────────────────────

export interface ZeroRestrictionGainState {
  active: boolean;
  /** 0-100, default 80 — cleaning distortion strength, never adds distortion */
  gainForDistortion: number;
  /** 0-100, default 80 — cleaning clipping strength, never touches volume */
  gainForClipping: number;
  titaniumWallInside: boolean;
  commanderConnected: boolean;
  engineChannelPowered: boolean;
}

// ─── Virtual CPU ──────────────────────────────────────────────────────────────

export interface VirtualCPUState {
  /** 30-48 total smart chips managed */
  totalChips: number;
  /** 20-30 second window opened when bottleneck detected */
  processingWindowSecs: number;
  cleanSignal: boolean;
  bottleneckDetected: boolean;
  /** 0-100 current CPU load percent */
  loadPercent: number;
}

// ─── WaveShaping Controls ─────────────────────────────────────────────────────

export interface WaveShapingControlState {
  /** 0-2, hard cap 2 */
  waveShaperPercent: number;
  /** 0-2, hard cap 2 */
  limiterPercent: number;
  /** 0-2, hard cap 2 */
  gainNodePercent: number;
}

// ─── Battery Bank ─────────────────────────────────────────────────────────────

export interface BatteryUnit {
  id: number;
  /** Always 100 — engine keeps batteries full */
  chargeLevel: number;
  /** 80000 / batteryCount */
  wattsReceived: number;
  active: boolean;
}

export interface BatteryBankState {
  batteries: BatteryUnit[];
  /** Channel 2 from Engine 1 */
  channelSource: number;
  /** Always 80000 — all batteries wired together */
  combinedOutput: number;
  allWiredTogether: boolean;
}

// ─── Combined Amps (convenience re-exports) ───────────────────────────────────

export type {
  CombinedAmpState,
  CombinedAmpChannel,
  CombinedProtectionState,
  DigitalAmpState,
  TubeAmpState,
} from "@/hooks/useCombinedAmps";

// ─── Engine 1 (re-exports for shared access) ──────────────────────────────────

export type {
  Engine1State as Engine1HookState,
  Engine1Channel,
  Engine1FuseConfig,
  Engine1BatteryState,
  VirtualAmpPowerSupply,
  ChannelAssignment,
} from "@/hooks/useEngine1";
