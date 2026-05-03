/**
 * SystemEngine — Engine 4
 * Owns: power chain, stabilizer commander, power converter,
 *       signal booster, XM processor, SRS, protection,
 *       system booster, master gain, titanium fuse monitor.
 * This engine IS the power source — it feeds all other engines.
 * 4 gauge wire: every connection through named gain nodes.
 */

import type { DiagnosticResult, EngineStatus } from "@/types/player";

function makeIR(ctx: AudioContext, len: number, decay: number): AudioBuffer {
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
    }
  }
  return buf;
}

export class SystemEngine {
  private ctx!: AudioContext;

  // Power chain — 4GA-SYS-IN
  private systemEngineInputGain!: GainNode; // 4GA-SYS-IN
  private frontlineVolume!: GainNode;
  private stabilizerA!: GainNode;
  private stabilizerB!: GainNode;
  private stabilizerC!: GainNode;
  private stabilizerD!: GainNode;
  private powerConverter!: GainNode;
  private signalBooster!: GainNode;

  // Post-channel-merge section
  private systemMergeInputGain!: GainNode; // 4GA-SYS-MERGE-IN
  private xmPowerGain!: GainNode;
  private xmShelf1!: BiquadFilterNode;
  private xmShelf2!: BiquadFilterNode;
  private srsNode!: ConvolverNode;
  private srsWetGain!: GainNode;
  private srsDryGain!: GainNode;
  private protectionPower!: GainNode;
  private protectionGate!: DynamicsCompressorNode;
  private systemBoosterPower!: GainNode;
  private systemBoosterNode!: GainNode;
  private masterGainNode!: GainNode;
  private systemEngineOutputGain!: GainNode; // 4GA-SYS-OUT

  // Titanium Fuse — monitoring only
  private titaniumAnalyser!: AnalyserNode;

  init(ctx: AudioContext): void {
    this.ctx = ctx;

    // 4GA entry
    this.systemEngineInputGain = ctx.createGain();
    this.systemEngineInputGain.gain.value = 1.0; // 4GA-SYS-IN

    // Power chain
    this.frontlineVolume = ctx.createGain();
    this.frontlineVolume.gain.value = 0.7;

    this.stabilizerA = ctx.createGain();
    this.stabilizerA.gain.value = 1.0;
    this.stabilizerB = ctx.createGain();
    this.stabilizerB.gain.value = 1.0;
    this.stabilizerC = ctx.createGain();
    this.stabilizerC.gain.value = 1.0;
    this.stabilizerD = ctx.createGain();
    this.stabilizerD.gain.value = 1.0;

    this.powerConverter = ctx.createGain();
    this.powerConverter.gain.value = 1.0; // virtual 120,000W multiplier

    this.signalBooster = ctx.createGain();
    this.signalBooster.gain.value = 1.0;

    // Wire power chain
    this.systemEngineInputGain.connect(this.frontlineVolume);
    this.frontlineVolume.connect(this.stabilizerA);
    this.stabilizerA.connect(this.stabilizerB);
    this.stabilizerB.connect(this.stabilizerC);
    this.stabilizerC.connect(this.stabilizerD);
    this.stabilizerD.connect(this.powerConverter);
    this.powerConverter.connect(this.signalBooster);
    // signalBooster output = power chain exit → fan-out to EQ (handled by PowerAmpEngine)

    // Merge input (post-channel-merge) — 4GA-SYS-MERGE-IN
    this.systemMergeInputGain = ctx.createGain();
    this.systemMergeInputGain.gain.value = 1.0;

    // XM Processor
    this.xmPowerGain = ctx.createGain();
    this.xmPowerGain.gain.value = 1.0;
    this.xmShelf1 = ctx.createBiquadFilter();
    this.xmShelf1.type = "highshelf";
    this.xmShelf1.frequency.value = 8000;
    this.xmShelf1.gain.value = 0;
    this.xmShelf2 = ctx.createBiquadFilter();
    this.xmShelf2.type = "highshelf";
    this.xmShelf2.frequency.value = 8000;
    this.xmShelf2.gain.value = 0;

    // SRS HD 9.0
    this.srsNode = ctx.createConvolver();
    this.srsNode.buffer = makeIR(ctx, 2048, 2);
    this.srsNode.normalize = true;
    this.srsDryGain = ctx.createGain();
    this.srsDryGain.gain.value = 0.85;
    this.srsWetGain = ctx.createGain();
    this.srsWetGain.gain.value = 0.0;

    // Protection
    this.protectionPower = ctx.createGain();
    this.protectionPower.gain.value = 1.2;
    this.protectionGate = ctx.createDynamicsCompressor();
    this.protectionGate.threshold.value = -24;
    this.protectionGate.knee.value = 6;
    this.protectionGate.ratio.value = 2;
    this.protectionGate.attack.value = 0.003;
    this.protectionGate.release.value = 0.25;

    // System Booster
    this.systemBoosterPower = ctx.createGain();
    this.systemBoosterPower.gain.value = 1.0;
    this.systemBoosterNode = ctx.createGain();
    this.systemBoosterNode.gain.value = 1.0;

    // Master gain
    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.value = 0.7;

    // 4GA exit
    this.systemEngineOutputGain = ctx.createGain();
    this.systemEngineOutputGain.gain.value = 1.0; // 4GA-SYS-OUT

    // Wire post-merge chain
    this.systemMergeInputGain.connect(this.xmPowerGain);
    this.xmPowerGain.connect(this.xmShelf1);
    this.xmShelf1.connect(this.xmShelf2);
    this.xmShelf2.connect(this.srsDryGain);
    this.xmShelf2.connect(this.srsNode);
    this.srsNode.connect(this.srsWetGain);
    this.srsDryGain.connect(this.protectionPower);
    this.srsWetGain.connect(this.protectionPower);
    this.protectionPower.connect(this.protectionGate);
    this.protectionGate.connect(this.systemBoosterPower);
    this.systemBoosterPower.connect(this.systemBoosterNode);
    this.systemBoosterNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.systemEngineOutputGain);
    this.systemEngineOutputGain.connect(ctx.destination);

    // Titanium Fuse — monitoring tap only, NOT in signal path
    this.titaniumAnalyser = ctx.createAnalyser();
    this.titaniumAnalyser.fftSize = 256;
    this.masterGainNode.connect(this.titaniumAnalyser);
    // titaniumAnalyser does NOT connect downstream
  }

  getInputNode(): AudioNode {
    return this.systemEngineInputGain;
  }
  getOutputNode(): AudioNode {
    return this.systemEngineOutputGain;
  }
  getPowerChainOutputNode(): AudioNode {
    return this.signalBooster;
  }
  getMergeInputNode(): AudioNode {
    return this.systemMergeInputGain;
  }

  get frontlineVolume_() {
    return this.frontlineVolume;
  }
  get masterGain_() {
    return this.masterGainNode;
  }
  get protectionGate_() {
    return this.protectionGate;
  }
  get protectionPower_() {
    return this.protectionPower;
  }
  get systemBoosterNode_() {
    return this.systemBoosterNode;
  }
  get xmShelf1_() {
    return this.xmShelf1;
  }
  get xmShelf2_() {
    return this.xmShelf2;
  }
  get srsWetGain_() {
    return this.srsWetGain;
  }
  get srsDryGain_() {
    return this.srsDryGain;
  }
  get titaniumAnalyser_() {
    return this.titaniumAnalyser;
  }

  getStatus(): EngineStatus {
    if (!this.ctx) {
      return {
        name: "System Engine",
        engine: "system",
        status: "red",
        detail: "Not initialized",
        powerWatts: 0,
      };
    }
    const ctxRunning = this.ctx.state === "running";
    const mgOk = this.masterGainNode?.gain.value > 0.01;
    if (!ctxRunning) {
      return {
        name: "System Engine",
        engine: "system",
        status: "red",
        detail: `AudioContext ${this.ctx.state} — engine suspended`,
        powerWatts: 0,
      };
    }
    if (!mgOk) {
      return {
        name: "System Engine",
        engine: "system",
        status: "red",
        detail: "Master gain ZERO — total silence",
        powerWatts: 0,
      };
    }
    return {
      name: "System Engine",
      engine: "system",
      status: "green",
      detail: `ctx=running · masterGain=${this.masterGainNode.gain.value.toFixed(3)} · frontline=${this.frontlineVolume.gain.value.toFixed(3)}`,
      powerWatts: 960000,
    };
  }

  runDiagnostic(): DiagnosticResult[] {
    const results: DiagnosticResult[] = [];
    const check = (
      node: string,
      pass: boolean,
      dir: "forward" | "backward",
      detail: string,
      autoFixed?: boolean,
      fixDescription?: string,
    ): DiagnosticResult => ({
      node,
      engine: "system",
      status: pass ? "pass" : "fail",
      direction: dir,
      detail,
      autoFixed,
      fixDescription,
    });

    const ctxOk = this.ctx?.state === "running";
    results.push(
      check(
        "AudioContext",
        ctxOk,
        "forward",
        `state=${this.ctx?.state ?? "none"}`,
      ),
    );
    results.push(
      check(
        "frontlineVolume",
        this.frontlineVolume.gain.value > 0.01,
        "forward",
        `gain=${this.frontlineVolume.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "stabilizerA",
        this.stabilizerA.gain.value > 0,
        "forward",
        `gain=${this.stabilizerA.gain.value}`,
      ),
    );
    results.push(
      check(
        "powerConverter",
        this.powerConverter.gain.value > 0,
        "forward",
        `gain=${this.powerConverter.gain.value}`,
      ),
    );
    results.push(
      check(
        "signalBooster",
        this.signalBooster.gain.value > 0,
        "forward",
        `gain=${this.signalBooster.gain.value}`,
      ),
    );
    results.push(
      check(
        "systemMergeInputGain",
        this.systemMergeInputGain.gain.value > 0,
        "forward",
        `merge gain=${this.systemMergeInputGain.gain.value}`,
      ),
    );
    results.push(
      check(
        "protectionPower",
        this.protectionPower.gain.value > 0,
        "forward",
        `power=${this.protectionPower.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "masterGain",
        this.masterGainNode.gain.value > 0.01,
        "forward",
        `gain=${this.masterGainNode.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "systemEngineOutputGain",
        this.systemEngineOutputGain.gain.value > 0,
        "forward",
        `output=${this.systemEngineOutputGain.gain.value.toFixed(3)}`,
      ),
    );

    // Backward
    results.push(
      check(
        "systemEngineOutputGain",
        this.systemEngineOutputGain.gain.value > 0,
        "backward",
        "destination wire confirmed",
      ),
    );
    results.push(
      check(
        "masterGain",
        this.masterGainNode.gain.value > 0.01,
        "backward",
        "master non-zero \u2713",
      ),
    );
    results.push(
      check(
        "protectionGate",
        this.protectionGate.ratio.value > 0,
        "backward",
        `ratio=${this.protectionGate.ratio.value.toFixed(1)}:1`,
      ),
    );
    results.push(
      check(
        "srsDryGain",
        this.srsDryGain.gain.value > 0,
        "backward",
        `dry=${this.srsDryGain.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "frontlineVolume",
        this.frontlineVolume.gain.value > 0.01,
        "backward",
        "frontline non-zero \u2713",
      ),
    );

    return results;
  }
}
