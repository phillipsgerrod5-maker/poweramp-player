// PowerAmpEngine — singleton audio engine
// Every node is a permanent class property — no garbage collection
// AudioContext created ONCE, NEVER recreated
// createMediaElementSource created ONCE, NEVER recreated

import type { EngineStatus } from "../types";
import { MemoryCommanderChip } from "./MemoryCommanderChip";

export class PowerAmpEngine {
  private static _instance: PowerAmpEngine | null = null;

  static getInstance(): PowerAmpEngine {
    if (!PowerAmpEngine._instance) {
      PowerAmpEngine._instance = new PowerAmpEngine();
    }
    return PowerAmpEngine._instance;
  }

  // Core — permanent, never recreated
  ctx: AudioContext | null = null;
  mediaSource: MediaElementAudioSourceNode | null = null;
  audioElement: HTMLAudioElement | null = null;

  // Power chain nodes
  thunderBatteryGain!: GainNode;
  masterGain!: GainNode;
  frontlineGain!: GainNode;

  // BassAmp nodes
  bassLowpass!: BiquadFilterNode;
  bassVirtualGain!: GainNode;
  bassDigitalGain!: GainNode;
  bassAnalogGain!: GainNode;
  bassTubeGain!: GainNode;
  bassOutputGain!: GainNode;
  bass8ohmLoad!: GainNode;
  bassCh1Gain!: GainNode;
  bassCh2Gain!: GainNode;

  // Mids/Highs browser layer
  midsBassBlocker!: BiquadFilterNode;
  highsBassBlocker!: BiquadFilterNode;
  midsGain!: GainNode;
  highsGain!: GainNode;

  // EQ — 6 independent BiquadFilterNodes
  eqBass!: BiquadFilterNode;
  eqLowMid!: BiquadFilterNode;
  eqVocals!: BiquadFilterNode;
  eqMid!: BiquadFilterNode;
  eqHighMid!: BiquadFilterNode;
  eqTreble!: BiquadFilterNode;

  // Bass system nodes
  cheaterBeaterFilter!: BiquadFilterNode;
  cheaterBeaterGain!: GainNode;
  eQuakeGain!: GainNode;
  eQuakeLFO!: OscillatorNode;
  eQuakeLFOGain!: GainNode;
  epicenterGain!: GainNode;
  soulModeGain!: GainNode;
  naturalBottomGain!: GainNode;

  // Protection — watches gain nodes ONLY, never bass notes
  protectionCompressor!: DynamicsCompressorNode;
  distortionCleanGain!: GainNode;
  clippingControlGain!: GainNode;
  particleBreakdownGain!: GainNode;

  // Analyser
  analyser!: AnalyserNode;

  // State
  private _initialized = false;
  private _isPlaying = false;
  private _currentTrack: string | null = null;
  private _frontlineVolume = 490; // 70% of 700
  private _lfoStarted = false;

  commander: MemoryCommanderChip;

  private constructor() {
    this.commander = MemoryCommanderChip.getInstance();
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  // Ramp helper — ALL AudioParam changes use this, never direct .value assignment
  private ramp(param: AudioParam, value: number, time = 0.01): void {
    const now = this.ctx!.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + time);
  }

  async initialize(): Promise<void> {
    // STEP 1 — Create AudioContext once, never recreate
    if (!this.ctx) {
      this.ctx = new AudioContext({
        latencyHint: "interactive",
        sampleRate: 48000,
      });
    }

    // STEP 2 — Resume if suspended
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }

    if (this._initialized) {
      // Just re-apply commander values if already initialized
      this.commander.applyToEngine(this);
      this.commander.setLight("audioCtx", this.ctx.state === "running");
      return;
    }

    const ctx = this.ctx;

    // STEP 3 — Create ALL nodes as permanent class properties

    // Power chain
    this.thunderBatteryGain = ctx.createGain();
    this.thunderBatteryGain.gain.value = 1.0;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0; // Unity — NO hidden cuts

    this.frontlineGain = ctx.createGain();
    this.frontlineGain.gain.value = 0.7; // Bass starts at 70%

    // BassAmp — all 4 amp types in one unified unit
    this.bassLowpass = ctx.createBiquadFilter();
    this.bassLowpass.type = "lowpass";
    this.bassLowpass.frequency.value = 80; // 80Hz — full 14-80Hz passes through
    this.bassLowpass.Q.value = 0.7;

    this.bassVirtualGain = ctx.createGain();
    this.bassVirtualGain.gain.value = 1.0;

    this.bassDigitalGain = ctx.createGain();
    this.bassDigitalGain.gain.value = 1.0;

    this.bassAnalogGain = ctx.createGain();
    this.bassAnalogGain.gain.value = 1.0;

    this.bassTubeGain = ctx.createGain();
    this.bassTubeGain.gain.value = 1.0;

    this.bassOutputGain = ctx.createGain();
    this.bassOutputGain.gain.value = 1.0;

    this.bass8ohmLoad = ctx.createGain();
    this.bass8ohmLoad.gain.value = 1.0;

    this.bassCh1Gain = ctx.createGain();
    this.bassCh1Gain.gain.value = 0.7;

    this.bassCh2Gain = ctx.createGain();
    this.bassCh2Gain.gain.value = 0.7;

    // Mids/Highs browser layer — bass blockers (50W fuse simulation)
    this.midsBassBlocker = ctx.createBiquadFilter();
    this.midsBassBlocker.type = "highpass";
    this.midsBassBlocker.frequency.value = 80; // blocks bass below 80Hz from mids
    this.midsBassBlocker.Q.value = 0.7;

    this.highsBassBlocker = ctx.createBiquadFilter();
    this.highsBassBlocker.type = "highpass";
    this.highsBassBlocker.frequency.value = 3000; // highs above 3kHz
    this.highsBassBlocker.Q.value = 0.7;

    this.midsGain = ctx.createGain();
    this.midsGain.gain.value = 1.0;

    this.highsGain = ctx.createGain();
    this.highsGain.gain.value = 1.0;

    // EQ — 6 independent bands
    this.eqBass = ctx.createBiquadFilter();
    this.eqBass.type = "peaking";
    this.eqBass.frequency.value = 32;
    this.eqBass.Q.value = 0.7;
    this.eqBass.gain.value = 0;

    this.eqLowMid = ctx.createBiquadFilter();
    this.eqLowMid.type = "peaking";
    this.eqLowMid.frequency.value = 250;
    this.eqLowMid.Q.value = 0.7;
    this.eqLowMid.gain.value = 0;

    this.eqVocals = ctx.createBiquadFilter();
    this.eqVocals.type = "peaking";
    this.eqVocals.frequency.value = 1000;
    this.eqVocals.Q.value = 0.7;
    this.eqVocals.gain.value = 0;

    this.eqMid = ctx.createBiquadFilter();
    this.eqMid.type = "peaking";
    this.eqMid.frequency.value = 2500;
    this.eqMid.Q.value = 0.7;
    this.eqMid.gain.value = 0;

    this.eqHighMid = ctx.createBiquadFilter();
    this.eqHighMid.type = "peaking";
    this.eqHighMid.frequency.value = 5000;
    this.eqHighMid.Q.value = 0.7;
    this.eqHighMid.gain.value = 0;

    this.eqTreble = ctx.createBiquadFilter();
    this.eqTreble.type = "highshelf";
    this.eqTreble.frequency.value = 10000;
    this.eqTreble.gain.value = 0;

    // Bass system — all start at 0, natural bottom at 0.15
    this.cheaterBeaterFilter = ctx.createBiquadFilter();
    this.cheaterBeaterFilter.type = "bandpass";
    this.cheaterBeaterFilter.frequency.value = 33;
    this.cheaterBeaterFilter.Q.value = 2.0;

    this.cheaterBeaterGain = ctx.createGain();
    this.cheaterBeaterGain.gain.value = 0;

    this.eQuakeGain = ctx.createGain();
    this.eQuakeGain.gain.value = 0;

    this.eQuakeLFO = ctx.createOscillator();
    this.eQuakeLFO.type = "sine";
    this.eQuakeLFO.frequency.value = 8;

    this.eQuakeLFOGain = ctx.createGain();
    this.eQuakeLFOGain.gain.value = 0;

    this.epicenterGain = ctx.createGain();
    this.epicenterGain.gain.value = 1.0;

    this.soulModeGain = ctx.createGain();
    this.soulModeGain.gain.value = 0;

    this.naturalBottomGain = ctx.createGain();
    this.naturalBottomGain.gain.value = 0.15;

    // Protection — 4:1 ratio, gain nodes ONLY
    this.protectionCompressor = ctx.createDynamicsCompressor();
    this.protectionCompressor.threshold.value = -30;
    this.protectionCompressor.knee.value = 6;
    this.protectionCompressor.ratio.value = 4;
    this.protectionCompressor.attack.value = 0.003;
    this.protectionCompressor.release.value = 0.25;

    this.distortionCleanGain = ctx.createGain();
    this.distortionCleanGain.gain.value = 1.0;

    this.clippingControlGain = ctx.createGain();
    this.clippingControlGain.gain.value = 1.0;

    this.particleBreakdownGain = ctx.createGain();
    this.particleBreakdownGain.gain.value = 1.0;

    // Analyser
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // STEP 4 — Wire the signal chain
    // Power chain trunk: thunderBatteryGain -> masterGain -> protection -> frontlineGain
    this.thunderBatteryGain.connect(this.masterGain);
    this.masterGain.connect(this.distortionCleanGain);
    this.distortionCleanGain.connect(this.clippingControlGain);
    this.clippingControlGain.connect(this.particleBreakdownGain);
    this.particleBreakdownGain.connect(this.protectionCompressor);
    this.protectionCompressor.connect(this.frontlineGain);

    // BASS PATH
    this.frontlineGain.connect(this.eqBass);
    this.eqBass.connect(this.eqLowMid);

    // Cheater Beater branch (gain = 0 by default)
    this.eqLowMid.connect(this.cheaterBeaterFilter);
    this.cheaterBeaterFilter.connect(this.cheaterBeaterGain);
    this.cheaterBeaterGain.connect(this.epicenterGain);

    // Natural bottom branch (always present at 0.15)
    this.eqLowMid.connect(this.naturalBottomGain);
    this.naturalBottomGain.connect(this.epicenterGain);

    // Main bass through
    this.eqLowMid.connect(this.epicenterGain);

    // E-Quake LFO
    this.eQuakeLFO.connect(this.eQuakeLFOGain);
    this.eQuakeLFOGain.connect(this.epicenterGain.gain);

    // Bass amp chain
    this.epicenterGain.connect(this.bassLowpass);
    this.bassLowpass.connect(this.bassVirtualGain);
    this.bassVirtualGain.connect(this.bassDigitalGain);
    this.bassDigitalGain.connect(this.bassAnalogGain);
    this.bassAnalogGain.connect(this.bassTubeGain);
    this.bassTubeGain.connect(this.bassOutputGain);
    this.bassOutputGain.connect(this.bass8ohmLoad);
    this.bass8ohmLoad.connect(this.bassCh1Gain);
    this.bass8ohmLoad.connect(this.bassCh2Gain);
    this.bassCh1Gain.connect(ctx.destination);
    this.bassCh2Gain.connect(ctx.destination);

    // MIDS PATH
    this.frontlineGain.connect(this.midsBassBlocker);
    this.midsBassBlocker.connect(this.eqVocals);
    this.eqVocals.connect(this.eqMid);
    this.eqMid.connect(this.soulModeGain);
    this.soulModeGain.connect(this.midsGain);
    this.midsGain.connect(ctx.destination);

    // HIGHS PATH
    this.frontlineGain.connect(this.highsBassBlocker);
    this.highsBassBlocker.connect(this.eqHighMid);
    this.eqHighMid.connect(this.eqTreble);
    this.eqTreble.connect(this.highsGain);
    this.highsGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // STEP 5 — Start E-Quake LFO (starts silent, gain = 0)
    if (!this._lfoStarted) {
      this.eQuakeLFO.start();
      this._lfoStarted = true;
    }

    // STEP 6 — Load Commander chip saved values
    this.commander.applyToEngine(this);

    // STEP 7 — Update Commander lights
    this.commander.setLight("audioCtx", this.ctx.state === "running");
    this.commander.setLight("powerChain", true);
    this.commander.setLight("commander", true);
    this.commander.setLight("vpc120kw", true);
    this.commander.setLight("bassCh1", true);
    this.commander.setLight("bassCh2", true);
    this.commander.setLight("mids", true);
    this.commander.setLight("highs", true);

    this._initialized = true;
    this.commander.logActivity(
      "Engine initialized — all nodes connected via AudioContext + API + 4 gauge",
    );
  }

  async loadTrack(file: File): Promise<void> {
    if (!this.ctx) await this.initialize();
    const ctx = this.ctx!;

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = "anonymous";
    }

    this.audioElement.src = URL.createObjectURL(file);
    this._currentTrack = file.name;

    // CRITICAL: createMediaElementSource ONCE EVER — never recreate
    if (!this.mediaSource) {
      this.mediaSource = ctx.createMediaElementSource(this.audioElement);
      this.mediaSource.connect(this.thunderBatteryGain);
      this.commander.logActivity(
        "MT Converter created once — wired to Thunder Battery",
      );
    }

    this.commander.logActivity(`Track loaded: ${file.name}`);
    this.commander.save("currentTrack", Date.now());
  }

  play(): void {
    if (!this.audioElement || !this.ctx) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().then(() => {
        this.audioElement!.play();
      });
    } else {
      this.audioElement.play();
    }
    this._isPlaying = true;
    this.commander.setLight("audioCtx", true);
    this.commander.logActivity("Playback started");
  }

  pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this._isPlaying = false;
    this.commander.logActivity("Playback paused");
  }

  stop(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.audioElement.currentTime = 0;
    this._isPlaying = false;
    this.commander.logActivity("Playback stopped");
  }

  setFrontlineVolume(value: number): void {
    if (!this.ctx) return;
    const gainValue = Math.max(0, Math.min(1, value / 700));
    this.ramp(this.frontlineGain.gain, gainValue);
    this._frontlineVolume = value;
    this.commander.save("FRONTLINEV", value);
  }

  setMasterGain(value: number): void {
    if (!this.ctx) return;
    this.ramp(this.masterGain.gain, Math.max(0, Math.min(1, value)));
    this.commander.save("MASTERGAIN", value);
  }

  setBassEQ(db: number): void {
    if (!this.ctx) return;
    this.ramp(this.eqBass.gain, Math.max(-12, Math.min(12, db)));
    this.commander.save("EQ_BASS", db);
  }

  setLowMidEQ(db: number): void {
    if (!this.ctx) return;
    this.ramp(this.eqLowMid.gain, Math.max(-12, Math.min(12, db)));
    this.commander.save("EQ_LOWMID", db);
  }

  setVocalsEQ(db: number): void {
    if (!this.ctx) return;
    this.ramp(this.eqVocals.gain, Math.max(-12, Math.min(12, db)));
    this.commander.save("EQ_VOCALS", db);
  }

  setMidEQ(db: number): void {
    if (!this.ctx) return;
    this.ramp(this.eqMid.gain, Math.max(-12, Math.min(12, db)));
    this.commander.save("EQ_MID", db);
  }

  setHighMidEQ(db: number): void {
    if (!this.ctx) return;
    this.ramp(this.eqHighMid.gain, Math.max(-12, Math.min(12, db)));
    this.commander.save("EQ_HIGHMID", db);
  }

  setTrebleEQ(db: number): void {
    if (!this.ctx) return;
    this.ramp(this.eqTreble.gain, Math.max(-12, Math.min(12, db)));
    this.commander.save("EQ_TREBLE", db);
  }

  setCheaterBeater(active: boolean, value: number): void {
    if (!this.ctx) return;
    const gainVal = active ? Math.max(0, Math.min(1, value / 100)) : 0;
    this.ramp(this.cheaterBeaterGain.gain, gainVal);
    this.commander.save("CHEATERBEATER", active ? value : 0);
    this.commander.logActivity(
      `Cheater Beater ${active ? "ON" : "OFF"} — 33Hz`,
    );
  }

  setEQuake(active: boolean, depth: number): void {
    if (!this.ctx) return;
    const depthVal = active
      ? Math.max(0, Math.min(0.3, (depth / 100) * 0.3))
      : 0;
    this.ramp(this.eQuakeLFOGain.gain, depthVal);
    this.ramp(this.eQuakeGain.gain, active ? 1 : 0);
    this.commander.save("EQUAKE", active ? depth : 0);
    this.commander.logActivity(
      `E-Quake ${active ? `ON depth=${depth}` : "OFF"}`,
    );
  }

  setEpicenter(value: number): void {
    if (!this.ctx) return;
    const boost = Math.max(0.1, Math.min(2, (value / 100) * 2));
    this.ramp(this.epicenterGain.gain, boost);
    this.commander.save("EPICENTER", value);
  }

  setSoulMode(value: number): void {
    if (!this.ctx) return;
    const level = Math.max(0, Math.min(1, value / 100));
    this.ramp(this.soulModeGain.gain, level);
    this.commander.save("SOULMODE", value);
  }

  setNaturalBottom(value: number): void {
    if (!this.ctx) return;
    const level = Math.max(0.05, Math.min(1, value / 100));
    this.ramp(this.naturalBottomGain.gain, level);
    this.commander.save("NATURALBOTTOM", value);
  }

  setDistortionClean(value: number): void {
    if (!this.ctx) return;
    const threshold = -30 + (value / 100) * 10;
    this.ramp(this.protectionCompressor.threshold, threshold);
    this.commander.save("DISTORTIONCLEAN", value);
  }

  setClippingControl(value: number): void {
    if (!this.ctx) return;
    const ratio = 4 + (value / 100) * 8;
    this.ramp(this.protectionCompressor.ratio, ratio);
    this.commander.save("CLIPPINGCONTROL", value);
  }

  setParticleBreakdown(value: number): void {
    if (!this.ctx) return;
    const knee = 6 - (value / 100) * 5;
    this.ramp(this.protectionCompressor.knee, knee);
    this.commander.save("PARTICLEBREAKDOWN", value);
  }

  setMidsLevel(value: number): void {
    if (!this.ctx) return;
    this.ramp(this.midsGain.gain, Math.max(0, Math.min(2, (value / 100) * 2)));
    this.commander.save("MIDS", value);
  }

  setHighsLevel(value: number): void {
    if (!this.ctx) return;
    this.ramp(this.highsGain.gain, Math.max(0, Math.min(2, (value / 100) * 2)));
    this.commander.save("HIGHS", value);
  }

  getAnalyserData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getStatus(): EngineStatus {
    const lights = this.commander.getAllLights();
    return {
      initialized: this._initialized,
      isPlaying: this._isPlaying,
      currentTrack: this._currentTrack,
      audioContextState: this.ctx?.state ?? "closed",
      frontlineVolume: this._frontlineVolume,
      masterGain: this.masterGain?.gain.value ?? 1.0,
      bassLevel: this.bassCh1Gain?.gain.value ?? 0.7,
      midsLevel: this.midsGain?.gain.value ?? 1.0,
      highsLevel: this.highsGain?.gain.value ?? 1.0,
      eqValues: {
        bass: this.eqBass?.gain.value ?? 0,
        lowMid: this.eqLowMid?.gain.value ?? 0,
        vocals: this.eqVocals?.gain.value ?? 0,
        mid: this.eqMid?.gain.value ?? 0,
        highMid: this.eqHighMid?.gain.value ?? 0,
        treble: this.eqTreble?.gain.value ?? 0,
      },
      commanderLights: lights,
      thunderBatteryStable: true,
      cheaterBeaterActive: (this.cheaterBeaterGain?.gain.value ?? 0) > 0,
      eQuakeActive: (this.eQuakeLFOGain?.gain.value ?? 0) > 0,
      epicenterLevel: (this.epicenterGain?.gain.value ?? 1.0) * 50,
      soulModeLevel: (this.soulModeGain?.gain.value ?? 0) * 100,
    };
  }
}
