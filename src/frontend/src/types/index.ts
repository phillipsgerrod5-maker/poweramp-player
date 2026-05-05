export interface EngineStatus {
  initialized: boolean;
  isPlaying: boolean;
  currentTrack: string | null;
  audioContextState: string;
  frontlineVolume: number;
  masterGain: number;
  bassLevel: number;
  midsLevel: number;
  highsLevel: number;
  eqValues: {
    bass: number;
    lowMid: number;
    vocals: number;
    mid: number;
    highMid: number;
    treble: number;
  };
  commanderLights: CommanderLights;
  thunderBatteryStable: boolean;
  cheaterBeaterActive: boolean;
  eQuakeActive: boolean;
  epicenterLevel: number;
  soulModeLevel: number;
}

export interface CommanderLights {
  audioCtx: boolean;
  powerChain: boolean;
  commander: boolean;
  vpc120kw: boolean;
  bassCh1: boolean;
  bassCh2: boolean;
  mids: boolean;
  highs: boolean;
}

export type DrawerKey =
  | "bass"
  | "eq"
  | "protection"
  | "bassamp"
  | "mids"
  | "highs"
  | "cheaterBeater"
  | "eQuake"
  | "epicenter"
  | "soulMode"
  | "srs"
  | "xmProcessor"
  | "ultraCrystal"
  | "atmosmasphere"
  | "soundBeaming"
  | "virtualMagnet"
  | "diyKit1"
  | "diyKit2"
  | "diyKit3"
  | "diyKit4"
  | "diyKit5"
  | "diyKit6"
  | "diyKit7"
  | "universalRestore"
  | null;

export interface EQValues {
  bass: number;
  lowMid: number;
  vocals: number;
  mid: number;
  highMid: number;
  treble: number;
}
