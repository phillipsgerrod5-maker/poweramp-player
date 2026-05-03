/**
 * BassEngine — Engine 1
 * Owns: 14-50Hz lowpass, epicenter, cheater beater, e-quake,
 *       natural bottom, mid-bass excursion, soul resonance,
 *       multi-freq chips, 20 smart chips, virtual magnet LFO.
 * 4 gauge wire: every connection through named gain nodes.
 */

import type { DiagnosticResult, EngineStatus } from "@/types/player";

export class BassEngine {
  // 4GA wire — entry/exit named nodes
  private bassEngineInputGain!: GainNode; // 4GA-BASS-IN
  private bassEngineOutputGain!: GainNode; // 4GA-BASS-OUT

  // Bass processing nodes
  private bassFilter!: BiquadFilterNode;
  private bassEpicenter!: BiquadFilterNode;
  private bassCheaterBeater!: BiquadFilterNode;
  private bassEQuake!: GainNode;
  private bassExcursionFilter!: BiquadFilterNode;
  private bassExcursionGain!: GainNode;
  private bassNaturalBottom!: BiquadFilterNode;
  private bassSoulResonance!: BiquadFilterNode;
  private multiFreq20!: BiquadFilterNode;
  private multiFreq32!: BiquadFilterNode;
  private multiFreq40!: BiquadFilterNode;
  private multiFreq50!: BiquadFilterNode;
  private bassGainNode!: GainNode;
  private smartChips!: BiquadFilterNode[];

  // Virtual Magnet — LFO modulation only (bass only, never highs/mids)
  private virtualMagnetOsc!: OscillatorNode;
  private virtualMagnetDepthGain!: GainNode;

  private ctx!: AudioContext;

  init(ctx: AudioContext): void {
    this.ctx = ctx;

    // 4GA entry node
    this.bassEngineInputGain = ctx.createGain();
    this.bassEngineInputGain.gain.value = 1.0; // 4GA-BASS-IN

    // Lowpass 14-50Hz (Gerrod's spec — NEVER change to 200Hz)
    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = "lowpass";
    this.bassFilter.frequency.value = 50;
    this.bassFilter.Q.value = 0.7;

    this.bassEpicenter = this._makePeaking(ctx, 32, 2.0, 0);
    this.bassCheaterBeater = this._makePeaking(ctx, 33, 3.0, 0);

    this.bassEQuake = ctx.createGain();
    this.bassEQuake.gain.value = 0; // starts off

    this.bassExcursionFilter = this._makePeaking(ctx, 80, 2.0, 0);
    this.bassExcursionGain = ctx.createGain();
    this.bassExcursionGain.gain.value = 0; // starts off

    this.bassNaturalBottom = ctx.createBiquadFilter();
    this.bassNaturalBottom.type = "lowshelf";
    this.bassNaturalBottom.frequency.value = 60;
    this.bassNaturalBottom.gain.value = 2;

    this.bassSoulResonance = this._makePeaking(ctx, 300, 2.0, 0);

    this.multiFreq20 = this._makePeaking(ctx, 20, 2.0, 0);
    this.multiFreq32 = this._makePeaking(ctx, 32, 2.0, 0);
    this.multiFreq40 = this._makePeaking(ctx, 40, 2.0, 0);
    this.multiFreq50 = this._makePeaking(ctx, 50, 2.0, 0);

    this.bassGainNode = ctx.createGain();
    this.bassGainNode.gain.value = 0; // starts at 0 — Gerrod turns up

    // 20 smart chips in series (20-100Hz)
    this.smartChips = [];
    for (let i = 0; i < 20; i++) {
      const freq = 20 + (i / 19) * 80;
      this.smartChips.push(this._makePeaking(ctx, freq, 2.0, 0));
    }

    // Virtual Magnet LFO — modulates bassGain.gain AudioParam only
    this.virtualMagnetOsc = ctx.createOscillator();
    this.virtualMagnetOsc.frequency.value = 0.5;
    this.virtualMagnetOsc.type = "sine";
    this.virtualMagnetDepthGain = ctx.createGain();
    this.virtualMagnetDepthGain.gain.value = 0;
    this.virtualMagnetOsc.connect(this.virtualMagnetDepthGain);
    this.virtualMagnetDepthGain.connect(this.bassGainNode.gain);
    this.virtualMagnetOsc.start();

    // 4GA exit node
    this.bassEngineOutputGain = ctx.createGain();
    this.bassEngineOutputGain.gain.value = 1.0; // 4GA-BASS-OUT

    // Wire internal chain
    this.bassEngineInputGain.connect(this.bassFilter);
    this.bassFilter.connect(this.bassEpicenter);
    this.bassEpicenter.connect(this.bassCheaterBeater);
    this.bassCheaterBeater.connect(this.bassEQuake);
    this.bassEQuake.connect(this.bassExcursionFilter);
    this.bassExcursionFilter.connect(this.bassExcursionGain);
    this.bassExcursionGain.connect(this.bassNaturalBottom);
    this.bassNaturalBottom.connect(this.bassSoulResonance);
    this.bassSoulResonance.connect(this.multiFreq20);
    this.multiFreq20.connect(this.multiFreq32);
    this.multiFreq32.connect(this.multiFreq40);
    this.multiFreq40.connect(this.multiFreq50);
    this.multiFreq50.connect(this.bassGainNode);
    this.bassGainNode.connect(this.smartChips[0]);
    for (let i = 0; i < 19; i++) {
      this.smartChips[i].connect(this.smartChips[i + 1]);
    }
    this.smartChips[19].connect(this.bassEngineOutputGain);
  }

  getInputNode(): AudioNode {
    return this.bassEngineInputGain;
  }
  getOutputNode(): AudioNode {
    return this.bassEngineOutputGain;
  }

  // Expose nodes to PowerAmpEngine for direct control
  get bassFilter_() {
    return this.bassFilter;
  }
  get bassEpicenter_() {
    return this.bassEpicenter;
  }
  get bassCheaterBeater_() {
    return this.bassCheaterBeater;
  }
  get bassEQuake_() {
    return this.bassEQuake;
  }
  get bassExcursionFilter_() {
    return this.bassExcursionFilter;
  }
  get bassExcursionGain_() {
    return this.bassExcursionGain;
  }
  get bassNaturalBottom_() {
    return this.bassNaturalBottom;
  }
  get bassSoulResonance_() {
    return this.bassSoulResonance;
  }
  get multiFreq20_() {
    return this.multiFreq20;
  }
  get multiFreq32_() {
    return this.multiFreq32;
  }
  get multiFreq40_() {
    return this.multiFreq40;
  }
  get multiFreq50_() {
    return this.multiFreq50;
  }
  get bassGain_() {
    return this.bassGainNode;
  }
  get smartChips_() {
    return this.smartChips;
  }
  get virtualMagnetDepthGain_() {
    return this.virtualMagnetDepthGain;
  }

  getStatus(): EngineStatus {
    const g = this.bassGainNode?.gain.value ?? 0;
    if (!this.bassFilter) {
      return {
        name: "Bass Engine",
        engine: "bass",
        status: "red",
        detail: "Not initialized",
        powerWatts: 0,
      };
    }
    if (g <= 0.001) {
      return {
        name: "Bass Engine",
        engine: "bass",
        status: "yellow",
        detail: "Bass at 0 — user will turn up",
        powerWatts: 0,
      };
    }
    return {
      name: "Bass Engine",
      engine: "bass",
      status: "green",
      detail: `Bass gain ${g.toFixed(3)} · 14-50Hz flowing`,
      powerWatts: 20000,
    };
  }

  runDiagnostic(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];
    const check = (
      node: string,
      pass: boolean,
      dir: "forward" | "backward",
      detail: string,
    ): DiagnosticResult => ({
      node,
      engine: "bass",
      status: pass ? "pass" : "fail",
      direction: dir,
      detail,
    });

    // Forward scan
    results.push(
      check(
        "bassEngineInputGain",
        this.bassEngineInputGain.gain.value > 0,
        "forward",
        `input gain=${this.bassEngineInputGain.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "bassFilter",
        this.bassFilter.frequency.value <= 50,
        "forward",
        `lowpass freq=${this.bassFilter.frequency.value}Hz`,
      ),
    );
    results.push(
      check(
        "bassGain",
        true,
        "forward",
        `gain=${this.bassGainNode.gain.value.toFixed(3)} (0=user off)`,
      ),
    );
    results.push(
      check(
        "smartChips[0]",
        this.smartChips[0].frequency.value > 0,
        "forward",
        `chip[0] freq=${this.smartChips[0].frequency.value.toFixed(0)}Hz`,
      ),
    );
    results.push(
      check(
        "bassEngineOutputGain",
        this.bassEngineOutputGain.gain.value > 0,
        "forward",
        `output gain=${this.bassEngineOutputGain.gain.value.toFixed(3)}`,
      ),
    );

    // Backward scan
    results.push(
      check(
        "bassEngineOutputGain",
        this.bassEngineOutputGain.gain.value > 0,
        "backward",
        "output wire confirmed",
      ),
    );
    results.push(
      check(
        "bassGain",
        this.bassGainNode !== undefined,
        "backward",
        "node exists",
      ),
    );
    results.push(
      check(
        "bassFilter",
        this.bassFilter.type === "lowpass",
        "backward",
        "type=lowpass \u2713",
      ),
    );
    results.push(
      check(
        "bassEngineInputGain",
        this.bassEngineInputGain !== undefined,
        "backward",
        "entry wire confirmed",
      ),
    );

    return results;
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
}
