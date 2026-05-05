// Thunder Battery — 10-foot thunder-shaped virtual power source
// 120,000W (1,000 × 120) virtual output
// Holds steady under load — NEVER drops

export class ThunderBattery {
  private static _instance: ThunderBattery | null = null;

  private _outputWatts = 120000;
  private _powerLevel = 100;
  private readonly _isStable = true;
  private _channels: {
    bass: number;
    mids: number;
    highs: number;
    commander: number;
    reserve: number;
  };

  private constructor() {
    this._channels = {
      bass: 12000,
      mids: 2000,
      highs: 2000,
      commander: 4000,
      reserve: 100000,
    };
  }

  static getInstance(): ThunderBattery {
    if (!ThunderBattery._instance) {
      ThunderBattery._instance = new ThunderBattery();
    }
    return ThunderBattery._instance;
  }

  getOutputWatts(): number {
    return this._outputWatts;
  }
  isStable(): boolean {
    return this._isStable;
  }

  getChannelPower(channel: string): number {
    return this._channels[channel as keyof typeof this._channels] ?? 0;
  }

  getAllChannels(): typeof this._channels {
    return { ...this._channels };
  }

  setPowerLevel(level: number): void {
    this._powerLevel = Math.max(1, Math.min(100, level));
  }

  getPowerLevel(): number {
    return this._powerLevel;
  }
}
