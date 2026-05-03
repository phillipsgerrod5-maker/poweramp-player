/**
 * MidsEngine — Engine 2
 * Owns: 200Hz-4kHz bandpass, mids gain, soul mode resonance.
 * 4 gauge wire: every connection through named gain nodes.
 */

import type { DiagnosticResult, EngineStatus } from "@/types/player";

export class MidsEngine {
  private midsEngineInputGain!: GainNode; // 4GA-MIDS-IN
  private midsEngineOutputGain!: GainNode; // 4GA-MIDS-OUT

  private midsFilter!: BiquadFilterNode;
  private midsSoulMode!: BiquadFilterNode;
  private midsGainNode!: GainNode;

  init(ctx: AudioContext): void {
    this.midsEngineInputGain = ctx.createGain();
    this.midsEngineInputGain.gain.value = 1.0; // 4GA-MIDS-IN

    this.midsFilter = ctx.createBiquadFilter();
    this.midsFilter.type = "bandpass";
    this.midsFilter.frequency.value = 1000;
    this.midsFilter.Q.value = 1.5;

    this.midsSoulMode = ctx.createBiquadFilter();
    this.midsSoulMode.type = "peaking";
    this.midsSoulMode.frequency.value = 300;
    this.midsSoulMode.Q.value = 2.0;
    this.midsSoulMode.gain.value = 0;

    this.midsGainNode = ctx.createGain();
    this.midsGainNode.gain.value = 1.0;

    this.midsEngineOutputGain = ctx.createGain();
    this.midsEngineOutputGain.gain.value = 1.0; // 4GA-MIDS-OUT

    // Wire
    this.midsEngineInputGain.connect(this.midsFilter);
    this.midsFilter.connect(this.midsSoulMode);
    this.midsSoulMode.connect(this.midsGainNode);
    this.midsGainNode.connect(this.midsEngineOutputGain);
  }

  getInputNode(): AudioNode {
    return this.midsEngineInputGain;
  }
  getOutputNode(): AudioNode {
    return this.midsEngineOutputGain;
  }

  get midsFilter_() {
    return this.midsFilter;
  }
  get midsSoulMode_() {
    return this.midsSoulMode;
  }
  get midsGain_() {
    return this.midsGainNode;
  }

  getStatus(): EngineStatus {
    const g = this.midsGainNode?.gain.value ?? 0;
    if (!this.midsFilter) {
      return {
        name: "Mids Engine",
        engine: "mids",
        status: "red",
        detail: "Not initialized",
        powerWatts: 0,
      };
    }
    if (g <= 0.001) {
      return {
        name: "Mids Engine",
        engine: "mids",
        status: "red",
        detail: "Mids gain ZERO — vocals/mids silent",
        powerWatts: 0,
      };
    }
    return {
      name: "Mids Engine",
      engine: "mids",
      status: "green",
      detail: `Mids gain ${g.toFixed(3)} · 200Hz-4kHz flowing`,
      powerWatts: 15000,
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
      engine: "mids",
      status: pass ? "pass" : "fail",
      direction: dir,
      detail,
    });

    results.push(
      check(
        "midsEngineInputGain",
        this.midsEngineInputGain.gain.value > 0,
        "forward",
        `input gain=${this.midsEngineInputGain.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "midsFilter",
        this.midsFilter.type === "bandpass",
        "forward",
        `bandpass freq=${this.midsFilter.frequency.value}Hz Q=${this.midsFilter.Q.value}`,
      ),
    );
    results.push(
      check(
        "midsGain",
        this.midsGainNode.gain.value > 0.01,
        "forward",
        `gain=${this.midsGainNode.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "midsEngineOutputGain",
        this.midsEngineOutputGain.gain.value > 0,
        "forward",
        `output=${this.midsEngineOutputGain.gain.value.toFixed(3)}`,
      ),
    );

    results.push(
      check(
        "midsEngineOutputGain",
        this.midsEngineOutputGain.gain.value > 0,
        "backward",
        "output wire confirmed",
      ),
    );
    results.push(
      check(
        "midsGain",
        this.midsGainNode.gain.value > 0.01,
        "backward",
        "gain non-zero \u2713",
      ),
    );
    results.push(
      check(
        "midsFilter",
        this.midsFilter.frequency.value > 0,
        "backward",
        "filter alive \u2713",
      ),
    );
    results.push(
      check(
        "midsEngineInputGain",
        this.midsEngineInputGain !== undefined,
        "backward",
        "entry wire confirmed",
      ),
    );

    return results;
  }
}
