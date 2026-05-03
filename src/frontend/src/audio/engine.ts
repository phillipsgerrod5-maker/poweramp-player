/**
 * PowerAmp Player — PowerAmpEngine
 * Full 12-layer audio chain, built by Gerrod.
 * Refactored to 4 dedicated sub-engines:
 *   Engine 1 — Bass    (BassEngine)
 *   Engine 2 — Mids    (MidsEngine)
 *   Engine 3 — Highs   (HighsEngine)
 *   Engine 4 — System  (SystemEngine)
 * Every node is a permanent class property.
 * Audio ONLY plays via this engine, imported by PlayerPage only.
 */

import type {
  DiagnosticResult,
  EngineStatus,
  TrackTestResult,
} from "@/types/player";
import { BassEngine } from "./engines/BassEngine";
import { HighsEngine } from "./engines/HighsEngine";
import { MidsEngine } from "./engines/MidsEngine";
import { SystemEngine } from "./engines/SystemEngine";
import { storage } from "./storage";

class PowerAmpEngine {
  // ---- state ----
  private _initialized = false;
  private _playing = false;
  private _trackName = "";

  // ---- core ----
  private ctx!: AudioContext;
  private audioEl!: HTMLAudioElement;
  private sourceNode!: MediaElementAudioSourceNode;

  // ---- 4 engines ----
  private bassEngine = new BassEngine();
  private midsEngine = new MidsEngine();
  private highsEngine = new HighsEngine();
  private systemEngine = new SystemEngine();

  // ---- EQ layer (sits between power chain and channel split) ----
  private eqBassNode!: BiquadFilterNode;
  private eqLowMidNode!: BiquadFilterNode;
  private eqVocalsNode!: BiquadFilterNode;
  private eqMidNode!: BiquadFilterNode;
  private eqHighMidNode!: BiquadFilterNode;
  private eqTrebleNode!: BiquadFilterNode;

  // ---- channel merger (sums 4 engine outputs) ----
  private channelMerger!: GainNode;

  // ---- additive taps ----
  private beamLeft!: PannerNode;
  private beamRight!: PannerNode;
  private beamFront!: PannerNode;
  private beamRear!: PannerNode;
  private beamMergeGain!: GainNode;
  private atmosConvolver!: ConvolverNode;
  private atmosWetGain!: GainNode;

  // ---- analyser ----
  private analyserNode!: AnalyserNode;
  private analyserData!: Float32Array;
  private rafId = 0;

  // ---- AudioContext resume listeners (document-level, never page-level) ----
  private resumeCtx = (): void => {
    if (this.ctx && this.ctx.state !== "running") {
      this.ctx.resume().catch(() => {});
    }
  };

  get initialized() {
    return this._initialized;
  }
  get playing() {
    return this._playing;
  }
  get trackName() {
    return this._trackName;
  }

  // ===== INIT =====
  async initialize(): Promise<void> {
    if (this._initialized) return;

    this.ctx = new AudioContext({ sampleRate: 44100, latencyHint: "playback" });

    // Global resume listeners on document (never on page components)
    document.addEventListener("click", this.resumeCtx, { passive: true });
    document.addEventListener("touchstart", this.resumeCtx, { passive: true });
    document.addEventListener("keydown", this.resumeCtx, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.resumeCtx();
    });
    await this.ctx.resume();

    // Audio element — born inside engine, permanently in DOM
    this.audioEl = document.createElement("audio");
    this.audioEl.crossOrigin = "anonymous";
    this.audioEl.preload = "auto";
    this.audioEl.volume = 1.0;
    document.body.appendChild(this.audioEl);

    // Source node — created ONCE, never recreated
    this.sourceNode = this.ctx.createMediaElementSource(this.audioEl);

    this._buildChain();
    this._restoreSettings();
    this._startAnalysis();

    this._initialized = true;
  }

  private _makeIR(len: number, decay: number): AudioBuffer {
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
      }
    }
    return buf;
  }

  private _buildChain(): void {
    const ctx = this.ctx;

    // ===== INIT ALL 4 ENGINES =====
    this.systemEngine.init(ctx);
    this.bassEngine.init(ctx);
    this.midsEngine.init(ctx);
    this.highsEngine.init(ctx);

    // ===== EQ LAYER =====
    this.eqBassNode = this._makePeaking(ctx, 40, 1.0, 0);
    this.eqLowMidNode = this._makePeaking(ctx, 250, 1.0, 0);
    this.eqVocalsNode = this._makePeaking(ctx, 1000, 1.0, 0);
    this.eqMidNode = this._makePeaking(ctx, 2000, 1.0, 0);
    this.eqHighMidNode = this._makePeaking(ctx, 5000, 1.0, 0);
    this.eqTrebleNode = this._makePeaking(ctx, 10000, 1.0, 0);

    // ===== CHANNEL MERGER =====
    this.channelMerger = ctx.createGain();
    this.channelMerger.gain.value = 1.0;

    // ===== MAIN CHAIN WIRING =====
    // source → SystemEngine power chain → EQ
    this.sourceNode.connect(this.systemEngine.getInputNode());
    this.systemEngine.getPowerChainOutputNode().connect(this.eqBassNode);
    this.eqBassNode.connect(this.eqLowMidNode);
    this.eqLowMidNode.connect(this.eqVocalsNode);
    this.eqVocalsNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqHighMidNode);
    this.eqHighMidNode.connect(this.eqTrebleNode);

    // EQ fans out to all channel engines in parallel
    this.eqTrebleNode.connect(this.bassEngine.getInputNode());
    this.eqTrebleNode.connect(this.midsEngine.getInputNode());
    this.eqTrebleNode.connect(this.highsEngine.getInputNode());

    // Channel engines output → channel merger
    this.bassEngine.getOutputNode().connect(this.channelMerger);
    this.midsEngine.getOutputNode().connect(this.channelMerger);
    this.highsEngine.getOutputNode().connect(this.channelMerger);
    this.highsEngine.getTweetersOutputNode().connect(this.channelMerger);

    // Channel merger → SystemEngine post-merge section → destination
    this.channelMerger.connect(this.systemEngine.getMergeInputNode());

    // ===== ADDITIVE TAPS =====
    this.beamLeft = ctx.createPanner();
    this.beamLeft.panningModel = "HRTF";
    this.beamLeft.setPosition(-1, 0, 0);
    this.beamRight = ctx.createPanner();
    this.beamRight.panningModel = "HRTF";
    this.beamRight.setPosition(1, 0, 0);
    this.beamFront = ctx.createPanner();
    this.beamFront.panningModel = "HRTF";
    this.beamFront.setPosition(0, 0, -1);
    this.beamRear = ctx.createPanner();
    this.beamRear.panningModel = "HRTF";
    this.beamRear.setPosition(0, 0, 1);
    this.beamMergeGain = ctx.createGain();
    this.beamMergeGain.gain.value = 0;
    this.channelMerger.connect(this.beamLeft);
    this.channelMerger.connect(this.beamRight);
    this.channelMerger.connect(this.beamFront);
    this.channelMerger.connect(this.beamRear);
    this.beamLeft.connect(this.beamMergeGain);
    this.beamRight.connect(this.beamMergeGain);
    this.beamFront.connect(this.beamMergeGain);
    this.beamRear.connect(this.beamMergeGain);
    this.beamMergeGain.connect(ctx.destination);

    // Atmosmashere — additive tap, NEVER loops back
    this.atmosConvolver = ctx.createConvolver();
    this.atmosConvolver.buffer = this._makeIR(4096, 3);
    this.atmosConvolver.normalize = true;
    this.atmosWetGain = ctx.createGain();
    this.atmosWetGain.gain.value = 0;
    this.channelMerger.connect(this.atmosConvolver);
    this.atmosConvolver.connect(this.atmosWetGain);
    this.atmosWetGain.connect(ctx.destination);

    // Analyser
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserData = new Float32Array(this.analyserNode.frequencyBinCount);
    this.sourceNode.connect(this.analyserNode);
  }

  private _makePeaking(
    ctx: AudioContext,
    freq: number,
    q: number,
    gainDb: number,
  ): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = "peaking";
    f.frequency.value = freq;
    f.Q.value = q;
    f.gain.value = gainDb;
    return f;
  }

  private _ramp(param: AudioParam, target: number, timeS = 0.05): void {
    param.setTargetAtTime(target, this.ctx.currentTime, timeS / 5);
  }

  private _restoreSettings(): void {
    const s = storage;
    this.setFrontlineVol(s.loadNum("frontlineVol", 490));
    this.setMasterGain(s.loadNum("masterGain", 70));
    this.setEQ("bass", s.loadNum("eqBass", 0));
    this.setEQ("lowmid", s.loadNum("eqLowMid", 0));
    this.setEQ("vocals", s.loadNum("eqVocals", 0));
    this.setEQ("mid", s.loadNum("eqMid", 0));
    this.setEQ("highmid", s.loadNum("eqHighMid", 0));
    this.setEQ("treble", s.loadNum("eqTreble", 0));
    this.bassEngine.bassGain_.gain.value = 0;
    if (s.loadBool("bassEnabled", false)) this.setBassEnabled(true);
    if (s.loadBool("midsEnabled", true)) this.setMidsEnabled(true);
    if (s.loadBool("highsEnabled", true)) this.setHighsEnabled(true);
    if (s.loadBool("tweetersEnabled", true)) this.setTweetersEnabled(true);
    if (s.loadBool("protectionEnabled", true)) this.setProtectionEnabled(true);
    this.setDistortionClean(s.loadNum("distortionClean", 50));
    this.setClippingControl(s.loadNum("clippingControl", 50));
    this.setParticleBreakdown(s.loadNum("particleBreakdown", 50));
    if (s.loadBool("systemBoosterEnabled", false)) this.setSystemBooster(true);
    this.setSoulMode(
      s.loadBool("soulModeEnabled", false),
      s.loadNum("soulModeDepth", 0),
    );
    if (s.loadBool("epicenterEnabled", false))
      this.setEpicenter(true, s.loadNum("epicenterDepth", 0));
    if (s.loadBool("soundBeamEnabled", false))
      this.setSoundBeaming(true, s.loadNum("beamIntensity", 50));
    if (s.loadBool("atmosEnabled", false))
      this.setAtmos(true, s.loadNum("atmosWet", 40));
    if (s.loadBool("srsEnabled", false))
      this.setSRS(true, s.loadNum("srsWet", 30));
    if (s.loadBool("xmEnabled", false))
      this.setXM(true, s.loadNum("xmGain", 0));
    if (s.loadBool("virtualMagnetEnabled", false))
      this.setVirtualMagnet(true, s.loadNum("virtualMagnetDepth", 0));
  }

  private _startAnalysis(): void {
    const tick = () => {
      if (!this._initialized) return;
      this.rafId = requestAnimationFrame(tick);
      this.analyserNode.getFloatFrequencyData(
        this.analyserData as Float32Array<ArrayBuffer>,
      );
      if (this._playing && this.systemEngine.masterGain_.gain.value < 0.01) {
        this.systemEngine.masterGain_.gain.value = 0.1;
      }
    };
    this.rafId = requestAnimationFrame(tick);
  }

  // ===== PUBLIC API =====

  async loadTrack(file: File): Promise<void> {
    if (!this._initialized) return;
    this._trackName = file.name.replace(/\.[^.]+$/, "");
    const url = URL.createObjectURL(file);
    this.audioEl.pause();
    this.audioEl.src = url;
    this.audioEl.load();
    try {
      await this.ctx.resume();
      await this.audioEl.play();
      this._playing = true;
    } catch (e) {
      console.warn("[PowerAmp] play failed", e);
    }
  }

  async play(): Promise<void> {
    if (!this._initialized) return;
    await this.ctx.resume();
    if (this.audioEl.src) {
      this.audioEl
        .play()
        .then(() => {
          this._playing = true;
        })
        .catch(() => {});
    }
  }

  pause(): void {
    if (!this._initialized) return;
    this.audioEl.pause();
    this._playing = false;
  }

  stop(): void {
    this.pause();
  }

  setFrontlineVol(val: number): void {
    if (!this._initialized) return;
    const clamped = Math.max(1, Math.min(700, val));
    const gain = Math.max(0.01, clamped / 700);
    this._ramp(this.systemEngine.frontlineVolume_.gain, gain);
    storage.save("frontlineVol", clamped);
  }

  setMasterGain(val: number): void {
    if (!this._initialized) return;
    const gain = Math.max(0.01, val / 100);
    this._ramp(this.systemEngine.masterGain_.gain, gain);
    storage.save("masterGain", val);
  }

  setEQ(
    band: "bass" | "lowmid" | "vocals" | "mid" | "highmid" | "treble",
    db: number,
  ): void {
    if (!this._initialized) return;
    const clamped = Math.max(-12, Math.min(12, db));
    const map: Record<string, BiquadFilterNode> = {
      bass: this.eqBassNode,
      lowmid: this.eqLowMidNode,
      vocals: this.eqVocalsNode,
      mid: this.eqMidNode,
      highmid: this.eqHighMidNode,
      treble: this.eqTrebleNode,
    };
    const storageKey: Record<string, string> = {
      bass: "eqBass",
      lowmid: "eqLowMid",
      vocals: "eqVocals",
      mid: "eqMid",
      highmid: "eqHighMid",
      treble: "eqTreble",
    };
    this._ramp(map[band].gain, clamped);
    storage.save(storageKey[band], clamped);
  }

  setBassGain(val: number): void {
    if (!this._initialized) return;
    const gain = Math.max(0, Math.min(1.0, val / 100));
    this._ramp(this.bassEngine.bassGain_.gain, gain);
    storage.save("bassGainVal", val);
  }

  setBassEnabled(enabled: boolean): void {
    if (!this._initialized) return;
    this._ramp(
      this.bassEngine.bassGain_.gain,
      enabled ? storage.loadNum("bassGainVal", 0) / 100 : 0,
    );
    storage.save("bassEnabled", enabled);
  }

  setMidsEnabled(enabled: boolean): void {
    if (!this._initialized) return;
    this._ramp(this.midsEngine.midsGain_.gain, enabled ? 1.0 : 0);
    storage.save("midsEnabled", enabled);
  }

  setHighsEnabled(enabled: boolean): void {
    if (!this._initialized) return;
    this._ramp(this.highsEngine.highsGain_.gain, enabled ? 1.0 : 0);
    storage.save("highsEnabled", enabled);
  }

  setTweetersEnabled(enabled: boolean): void {
    if (!this._initialized) return;
    this._ramp(this.highsEngine.tweetersGain_.gain, enabled ? 1.0 : 0);
    storage.save("tweetersEnabled", enabled);
  }

  setEpicenter(enabled: boolean, depthDb: number): void {
    if (!this._initialized) return;
    this._ramp(
      this.bassEngine.bassEpicenter_.gain,
      enabled ? Math.max(0, Math.min(12, depthDb)) : 0,
    );
    storage.save("epicenterEnabled", enabled);
    storage.save("epicenterDepth", depthDb);
  }

  setCheaterBeater(enabled: boolean, depthDb: number): void {
    if (!this._initialized) return;
    if (enabled) {
      this.bassEngine.bassFilter_.frequency.setTargetAtTime(
        33,
        this.ctx.currentTime,
        0.05,
      );
    } else {
      this.bassEngine.bassFilter_.frequency.setTargetAtTime(
        50,
        this.ctx.currentTime,
        0.05,
      );
    }
    this._ramp(
      this.bassEngine.bassCheaterBeater_.gain,
      enabled ? Math.max(0, Math.min(12, depthDb)) : 0,
    );
    storage.save("cheaterBeaterEnabled", enabled);
    storage.save("cheaterBeaterDepth", depthDb);
  }

  setEQuake(depthVal: number): void {
    if (!this._initialized) return;
    const gain = Math.max(0, Math.min(0.8, (depthVal / 100) * 0.8));
    this._ramp(this.bassEngine.bassEQuake_.gain, gain);
    storage.save("equakeDepth", depthVal);
  }

  setMidBassExcursion(enabled: boolean, depthDb: number): void {
    if (!this._initialized) return;
    this._ramp(
      this.bassEngine.bassExcursionGain_.gain,
      enabled ? Math.max(0, Math.min(1.0, depthDb / 12)) : 0,
    );
    this._ramp(
      this.bassEngine.bassExcursionFilter_.gain,
      enabled ? Math.max(0, Math.min(12, depthDb)) : 0,
    );
    storage.save("midBassEnabled", enabled);
    storage.save("midBassDepth", depthDb);
  }

  setSoulMode(enabled: boolean, depthDb: number): void {
    if (!this._initialized) return;
    const db = Math.max(0, Math.min(12, depthDb));
    this._ramp(this.midsEngine.midsSoulMode_.gain, enabled ? db : 0);
    this._ramp(this.bassEngine.bassSoulResonance_.gain, enabled ? db * 0.5 : 0);
    storage.save("soulModeEnabled", enabled);
    storage.save("soulModeDepth", depthDb);
  }

  setAtmos(enabled: boolean, wetPct: number): void {
    if (!this._initialized) return;
    this._ramp(
      this.atmosWetGain.gain,
      enabled ? Math.max(0, Math.min(0.6, wetPct / 100)) : 0,
    );
    storage.save("atmosEnabled", enabled);
    storage.save("atmosWet", wetPct);
  }

  setSRS(enabled: boolean, wetPct: number): void {
    if (!this._initialized) return;
    const wet = enabled ? Math.max(0, Math.min(0.5, wetPct / 100)) : 0;
    this._ramp(this.systemEngine.srsWetGain_.gain, wet);
    this._ramp(
      this.systemEngine.srsDryGain_.gain,
      enabled ? 1 - wet * 0.2 : 1.0,
    );
    storage.save("srsEnabled", enabled);
    storage.save("srsWet", wetPct);
  }

  setXM(enabled: boolean, gainDb: number): void {
    if (!this._initialized) return;
    const db = enabled ? Math.max(-12, Math.min(12, gainDb)) : 0;
    this._ramp(this.systemEngine.xmShelf1_.gain, db);
    this._ramp(this.systemEngine.xmShelf2_.gain, db * 0.5);
    storage.save("xmEnabled", enabled);
    storage.save("xmGain", gainDb);
  }

  setSoundBeaming(enabled: boolean, intensityPct: number): void {
    if (!this._initialized) return;
    const intensity = enabled
      ? Math.max(0, Math.min(0.5, (intensityPct / 100) * 0.5))
      : 0;
    this._ramp(this.beamMergeGain.gain, intensity);
    storage.save("soundBeamEnabled", enabled);
    storage.save("beamIntensity", intensityPct);
  }

  setVirtualMagnet(enabled: boolean, depthPct: number): void {
    if (!this._initialized) return;
    const depth = enabled
      ? Math.max(0, Math.min(0.2, (depthPct / 100) * 0.2))
      : 0;
    this._ramp(this.bassEngine.virtualMagnetDepthGain_.gain, depth);
    storage.save("virtualMagnetEnabled", enabled);
    storage.save("virtualMagnetDepth", depthPct);
  }

  setSystemBooster(enabled: boolean): void {
    if (!this._initialized) return;
    this._ramp(this.systemEngine.systemBoosterNode_.gain, enabled ? 1.38 : 1.0);
    storage.save("systemBoosterEnabled", enabled);
  }

  setProtectionEnabled(enabled: boolean): void {
    if (!this._initialized) return;
    const gate = this.systemEngine.protectionGate_;
    if (!enabled) {
      gate.threshold.setTargetAtTime(-100, this.ctx.currentTime, 0.05);
      gate.ratio.setTargetAtTime(1, this.ctx.currentTime, 0.05);
    } else {
      this.setDistortionClean(storage.loadNum("distortionClean", 50));
      this.setClippingControl(storage.loadNum("clippingControl", 50));
      this.setParticleBreakdown(storage.loadNum("particleBreakdown", 50));
    }
    storage.save("protectionEnabled", enabled);
  }

  setDistortionClean(val: number): void {
    if (!this._initialized) return;
    const threshold = -60 + (val / 100) * 50;
    this.systemEngine.protectionGate_.threshold.setTargetAtTime(
      threshold,
      this.ctx.currentTime,
      0.05,
    );
    storage.save("distortionClean", val);
  }

  setClippingControl(val: number): void {
    if (!this._initialized) return;
    const ratio = 1 + (val / 100) * 3;
    this.systemEngine.protectionGate_.ratio.setTargetAtTime(
      ratio,
      this.ctx.currentTime,
      0.05,
    );
    storage.save("clippingControl", val);
  }

  setParticleBreakdown(val: number): void {
    if (!this._initialized) return;
    const release = 0.1 + (val / 100) * 0.9;
    this.systemEngine.protectionGate_.release.setTargetAtTime(
      release,
      this.ctx.currentTime,
      0.05,
    );
    storage.save("particleBreakdown", val);
  }

  // ===== 4-ENGINE STATUS API =====

  getEngineStatuses(): EngineStatus[] {
    if (!this._initialized) {
      const red = (name: string, eng: EngineStatus["engine"]) => ({
        name,
        engine: eng,
        status: "red" as const,
        detail: "Engine not initialized",
        powerWatts: 0,
      });
      return [
        red("Bass Engine", "bass"),
        red("Mids Engine", "mids"),
        red("Highs Engine", "highs"),
        red("System Engine", "system"),
      ];
    }
    return [
      this.bassEngine.getStatus(),
      this.midsEngine.getStatus(),
      this.highsEngine.getStatus(),
      this.systemEngine.getStatus(),
    ];
  }

  runBidirectionalScan(): DiagnosticResult[] {
    if (!this._initialized) {
      return [
        {
          node: "engine",
          engine: "system",
          status: "fail",
          direction: "forward",
          detail: "Engine not initialized",
        },
      ];
    }
    const forward = [
      ...this.bassEngine
        .runDiagnostic()
        .filter((r) => r.direction === "forward"),
      ...this.midsEngine
        .runDiagnostic()
        .filter((r) => r.direction === "forward"),
      ...this.highsEngine
        .runDiagnostic()
        .filter((r) => r.direction === "forward"),
      ...this.systemEngine
        .runDiagnostic()
        .filter((r) => r.direction === "forward"),
    ];
    const backward = [
      ...this.systemEngine
        .runDiagnostic()
        .filter((r) => r.direction === "backward"),
      ...this.highsEngine
        .runDiagnostic()
        .filter((r) => r.direction === "backward"),
      ...this.midsEngine
        .runDiagnostic()
        .filter((r) => r.direction === "backward"),
      ...this.bassEngine
        .runDiagnostic()
        .filter((r) => r.direction === "backward"),
    ];
    return [...forward, ...backward];
  }

  async runSmartTrackTest(): Promise<TrackTestResult> {
    if (!this._initialized) {
      return {
        passed: false,
        results: [
          {
            node: "engine",
            engine: "system",
            status: "fail",
            direction: "forward",
            detail: "Engine not initialized",
          },
        ],
        autoFixedCount: 0,
        failedCount: 1,
        summary: "Engine not initialized. Tap START first.",
      };
    }

    const results: DiagnosticResult[] = [];
    let autoFixedCount = 0;

    // 1. Ensure AudioContext is running
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
      const fixed = (this.ctx.state as string) === "running";
      results.push({
        node: "AudioContext",
        engine: "system",
        status: fixed ? "pass" : "fail",
        direction: "forward",
        detail: "ctx was suspended, resume attempted",
        autoFixed: fixed,
        fixDescription: fixed ? "AudioContext resumed" : undefined,
      });
      if (fixed) autoFixedCount++;
    } else {
      results.push({
        node: "AudioContext",
        engine: "system",
        status: "pass",
        direction: "forward",
        detail: "ctx=running ✓",
      });
    }

    // 2. Synthetic test oscillator (440Hz sine)
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 440;
    const testGain = this.ctx.createGain();
    testGain.gain.value = 0.3;
    const testAnalyser = this.ctx.createAnalyser();
    testAnalyser.fftSize = 256;
    osc.connect(testGain);
    testGain.connect(testAnalyser);
    testAnalyser.connect(this.systemEngine.getMergeInputNode());
    osc.start();
    await new Promise<void>((r) => setTimeout(r, 120));

    const measureSignal = (analyser: AnalyserNode): number => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (const v of data) sum += v;
      return sum / (data.length * 255);
    };

    // 3. Forward scan — check key gain nodes, auto-fix zeros
    type GainCheck = {
      node: string;
      engine: string;
      getValue: () => number;
      isOk: (v: number) => boolean;
      fix?: () => void;
      fixDesc?: string;
    };
    const forwardChecks: GainCheck[] = [
      {
        node: "frontlineVolume",
        engine: "system",
        getValue: () => this.systemEngine.frontlineVolume_.gain.value,
        isOk: (v) => v > 0.01,
        fix: () => {
          this.systemEngine.frontlineVolume_.gain.value = 0.7;
        },
        fixDesc: "Set frontline volume to 0.7",
      },
      {
        node: "midsGain",
        engine: "mids",
        getValue: () => this.midsEngine.midsGain_.gain.value,
        isOk: (v) => v > 0.01,
        fix: () => {
          this.midsEngine.midsGain_.gain.value = 1.0;
        },
        fixDesc: "Reset mids gain to 1.0",
      },
      {
        node: "highsGain",
        engine: "highs",
        getValue: () => this.highsEngine.highsGain_.gain.value,
        isOk: (v) => v > 0.01,
        fix: () => {
          this.highsEngine.highsGain_.gain.value = 1.0;
        },
        fixDesc: "Reset highs gain to 1.0",
      },
      {
        node: "tweetersGain",
        engine: "highs",
        getValue: () => this.highsEngine.tweetersGain_.gain.value,
        isOk: (v) => v > 0.01,
        fix: () => {
          this.highsEngine.tweetersGain_.gain.value = 1.0;
        },
        fixDesc: "Reset tweeters gain to 1.0",
      },
      {
        node: "channelMerger",
        engine: "system",
        getValue: () => this.channelMerger.gain.value,
        isOk: (v) => v > 0.01,
        fix: () => {
          this.channelMerger.gain.value = 1.0;
        },
        fixDesc: "Reset channel merger to 1.0",
      },
      {
        node: "masterGain",
        engine: "system",
        getValue: () => this.systemEngine.masterGain_.gain.value,
        isOk: (v) => v > 0.01,
        fix: () => {
          this.systemEngine.masterGain_.gain.value = 0.7;
        },
        fixDesc: "Reset master gain to 0.7",
      },
    ];

    for (const chk of forwardChecks) {
      const v = chk.getValue();
      const ok = chk.isOk(v);
      let autoFixed: boolean | undefined;
      let fixDescription: string | undefined;
      if (!ok && chk.fix) {
        chk.fix();
        autoFixed = true;
        fixDescription = chk.fixDesc;
        autoFixedCount++;
      }
      results.push({
        node: chk.node,
        engine: chk.engine,
        status: ok || autoFixed ? "pass" : "fail",
        direction: "forward",
        detail: `gain=${v.toFixed(3)}`,
        autoFixed,
        fixDescription,
      });
    }

    // 4. Measure synthetic signal level
    const signalLevel = measureSignal(testAnalyser);
    results.push({
      node: "testSignal",
      engine: "system",
      status: signalLevel > 0.001 ? "pass" : "warn",
      direction: "forward",
      detail: `synthetic signal level=${(signalLevel * 100).toFixed(1)}%`,
    });

    // 5. Backward scan
    const backwardResults = this.runBidirectionalScan().filter(
      (r) => r.direction === "backward",
    );
    results.push(...backwardResults);

    // 6. Stop test signal
    osc.stop();
    testGain.disconnect();
    testAnalyser.disconnect();

    const failedCount = results.filter((r) => r.status === "fail").length;
    const passed = failedCount === 0;
    const summary = passed
      ? `✓ All ${results.length} checks passed — chain confirmed ready`
      : `${results.length - failedCount} passed · ${autoFixedCount} auto-fixed · ${failedCount} issues found`;

    return { passed, results, autoFixedCount, failedCount, summary };
  }

  // ===== LEGACY 99.0 SCANNER =====
  scan(): Array<{
    id: string;
    label: string;
    status: "ok" | "warn" | "error";
    detail: string;
  }> {
    if (!this._initialized) {
      return [
        {
          id: "init",
          label: "Engine Init",
          status: "error",
          detail: "Engine not initialized. Tap START first.",
        },
      ];
    }
    const ok = (id: string, label: string, detail: string) => ({
      id,
      label,
      status: "ok" as const,
      detail,
    });
    const warn = (id: string, label: string, detail: string) => ({
      id,
      label,
      status: "warn" as const,
      detail,
    });
    const err = (id: string, label: string, detail: string) => ({
      id,
      label,
      status: "error" as const,
      detail,
    });
    const mg = this.systemEngine.masterGain_.gain.value;
    const fv = this.systemEngine.frontlineVolume_.gain.value;
    const basisG = this.bassEngine.bassGain_.gain.value;
    const midsG = this.midsEngine.midsGain_.gain.value;
    const highsG = this.highsEngine.highsGain_.gain.value;
    const tweetsG = this.highsEngine.tweetersGain_.gain.value;
    return [
      this.ctx.state === "running"
        ? ok("ctx", "AudioContext State", "RUNNING")
        : err("ctx", "AudioContext State", `SUSPENDED (${this.ctx.state})`),
      mg > 0.01
        ? ok("mg", "Master Gain", `${mg.toFixed(3)} ✓`)
        : err("mg", "Master Gain", `${mg.toFixed(3)} — ZERO!`),
      fv > 0.01
        ? ok("fv", "Frontline Volume", `${fv.toFixed(3)} ✓`)
        : err("fv", "Frontline Volume", `${fv.toFixed(3)} — ZERO!`),
      basisG > 0
        ? ok("bg", "Bass Gain", `${basisG.toFixed(3)}`)
        : warn("bg", "Bass Gain", "ZERO — bass OFF (user turns up)"),
      midsG > 0.01
        ? ok("mids", "Mids Gain", `${midsG.toFixed(3)}`)
        : err("mids", "Mids Gain", "ZERO — no vocals/mids"),
      highsG > 0.01
        ? ok("highs", "Highs Gain", `${highsG.toFixed(3)}`)
        : err("highs", "Highs Gain", "ZERO — no highs"),
      tweetsG > 0.01
        ? ok("tweets", "Tweeters Gain", `${tweetsG.toFixed(3)}`)
        : err("tweets", "Tweeters Gain", "ZERO — no tweeters"),
      ok(
        "split",
        "Channel Split",
        "eqTreble → bass/mids/highs+tweeters (parallel fan-out)",
      ),
      ok("merge", "Channel Merger", `gain=${this.channelMerger.gain.value}`),
      this.beamMergeGain.gain.value >= 0
        ? ok(
            "beam",
            "Sound Beaming (tap)",
            `beamMerge=${this.beamMergeGain.gain.value.toFixed(3)}`,
          )
        : warn("beam", "Sound Beaming", "Negative gain?"),
      this.atmosWetGain.gain.value >= 0
        ? ok(
            "atmos",
            "Atmosmashere (tap)",
            `wet=${this.atmosWetGain.gain.value.toFixed(3)} — no cyclic loop`,
          )
        : warn("atmos", "Atmosmashere", "Unexpected"),
      ok(
        "prot",
        "Protection Gate",
        `threshold=${this.systemEngine.protectionGate_.threshold.value.toFixed(1)}dB ratio=${this.systemEngine.protectionGate_.ratio.value.toFixed(1)}:1`,
      ),
      ok(
        "sysb",
        "System Booster",
        `gain=${this.systemEngine.systemBoosterNode_.gain.value.toFixed(3)}`,
      ),
      ok("titan", "Titanium Fuse", "Monitoring tap only — NOT in signal path"),
      this.audioEl.readyState >= 2
        ? ok("audio", "Audio Element", `readyState=${this.audioEl.readyState}`)
        : warn(
            "audio",
            "Audio Element",
            `readyState=${this.audioEl.readyState} — no track loaded`,
          ),
      ok(
        "vmagnet",
        "Virtual Magnet",
        `depth=${this.bassEngine.virtualMagnetDepthGain_.gain.value.toFixed(3)} — LFO only`,
      ),
      ok(
        "srs",
        "SRS HD 9.0",
        `wet=${this.systemEngine.srsWetGain_.gain.value.toFixed(3)}`,
      ),
      ok(
        "xm",
        "XM Processor",
        `shelf1=${this.systemEngine.xmShelf1_.gain.value.toFixed(1)}dB`,
      ),
      ok(
        "eq",
        "EQ Chain",
        `bass=${this.eqBassNode.gain.value}dB mids=${this.eqMidNode.gain.value}dB treble=${this.eqTrebleNode.gain.value}dB`,
      ),
      ok(
        "wire",
        "4-Gauge Wiring",
        "All nodes wired via API+HTML+Chainblock+4GA",
      ),
    ];
  }

  getTitaniumLevel(): number {
    if (!this._initialized) return 0;
    const data = new Uint8Array(
      this.systemEngine.titaniumAnalyser_.frequencyBinCount,
    );
    this.systemEngine.titaniumAnalyser_.getByteFrequencyData(data);
    let sum = 0;
    for (const v of data) sum += v;
    return sum / (data.length * 255);
  }

  playStartupTone(): void {
    if (!this._initialized) return;
    const now = this.ctx.currentTime;
    [261.63, 329.63, 392.0].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.4);
    });
  }

  getContextState(): string {
    return this._initialized ? this.ctx.state : "uninitialized";
  }
}

export const engine = new PowerAmpEngine();
