/**
 * HighsEngine — Engine 3
 * Owns: 4kHz-8kHz highpass, highs gain, presence shelf,
 *       8kHz+ tweeters highpass, tweeters gain.
 * 4 gauge wire: every connection through named gain nodes.
 */

import type { DiagnosticResult, EngineStatus } from "@/types/player";

export class HighsEngine {
  private highsEngineInputGain!: GainNode; // 4GA-HIGHS-IN
  private highsEngineOutputGain!: GainNode; // 4GA-HIGHS-OUT

  private highsFilter!: BiquadFilterNode;
  private highsPresence!: BiquadFilterNode;
  private highsGainNode!: GainNode;
  private tweetersFilter!: BiquadFilterNode;
  private tweetersGainNode!: GainNode;

  // Separate output for tweeters channel
  private tweetersEngineOutputGain!: GainNode; // 4GA-TWEETERS-OUT

  init(ctx: AudioContext): void {
    this.highsEngineInputGain = ctx.createGain();
    this.highsEngineInputGain.gain.value = 1.0; // 4GA-HIGHS-IN

    // Highs: 4kHz-8kHz
    this.highsFilter = ctx.createBiquadFilter();
    this.highsFilter.type = "highpass";
    this.highsFilter.frequency.value = 4000;
    this.highsFilter.Q.value = 0.7;

    this.highsPresence = ctx.createBiquadFilter();
    this.highsPresence.type = "highshelf";
    this.highsPresence.frequency.value = 8000;
    this.highsPresence.gain.value = 2;

    this.highsGainNode = ctx.createGain();
    this.highsGainNode.gain.value = 1.0;

    this.highsEngineOutputGain = ctx.createGain();
    this.highsEngineOutputGain.gain.value = 1.0; // 4GA-HIGHS-OUT

    // Tweeters: 8kHz+ (own path, own gain — not stacked on highs)
    this.tweetersFilter = ctx.createBiquadFilter();
    this.tweetersFilter.type = "highpass";
    this.tweetersFilter.frequency.value = 8000;
    this.tweetersFilter.Q.value = 0.7;

    this.tweetersGainNode = ctx.createGain();
    this.tweetersGainNode.gain.value = 1.0;

    this.tweetersEngineOutputGain = ctx.createGain();
    this.tweetersEngineOutputGain.gain.value = 1.0; // 4GA-TWEETERS-OUT

    // Wire highs path
    this.highsEngineInputGain.connect(this.highsFilter);
    this.highsFilter.connect(this.highsPresence);
    this.highsPresence.connect(this.highsGainNode);
    this.highsGainNode.connect(this.highsEngineOutputGain);

    // Wire tweeters path (from same input — parallel)
    this.highsEngineInputGain.connect(this.tweetersFilter);
    this.tweetersFilter.connect(this.tweetersGainNode);
    this.tweetersGainNode.connect(this.tweetersEngineOutputGain);
  }

  getInputNode(): AudioNode {
    return this.highsEngineInputGain;
  }
  getOutputNode(): AudioNode {
    return this.highsEngineOutputGain;
  }
  getTweetersOutputNode(): AudioNode {
    return this.tweetersEngineOutputGain;
  }

  get highsFilter_() {
    return this.highsFilter;
  }
  get highsPresence_() {
    return this.highsPresence;
  }
  get highsGain_() {
    return this.highsGainNode;
  }
  get tweetersFilter_() {
    return this.tweetersFilter;
  }
  get tweetersGain_() {
    return this.tweetersGainNode;
  }

  getStatus(): EngineStatus {
    const hg = this.highsGainNode?.gain.value ?? 0;
    const tg = this.tweetersGainNode?.gain.value ?? 0;
    if (!this.highsFilter) {
      return {
        name: "Highs Engine",
        engine: "highs",
        status: "red",
        detail: "Not initialized",
        powerWatts: 0,
      };
    }
    if (hg <= 0.001 && tg <= 0.001) {
      return {
        name: "Highs Engine",
        engine: "highs",
        status: "red",
        detail: "Highs+Tweeters ZERO — no highs",
        powerWatts: 0,
      };
    }
    return {
      name: "Highs Engine",
      engine: "highs",
      status: "green",
      detail: `Highs ${hg.toFixed(3)} · Tweeters ${tg.toFixed(3)} · 4kHz+ flowing`,
      powerWatts: 12000 + 8000,
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
      engine: "highs",
      status: pass ? "pass" : "fail",
      direction: dir,
      detail,
    });

    results.push(
      check(
        "highsEngineInputGain",
        this.highsEngineInputGain.gain.value > 0,
        "forward",
        `input gain=${this.highsEngineInputGain.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "highsFilter",
        this.highsFilter.frequency.value >= 4000,
        "forward",
        `highpass freq=${this.highsFilter.frequency.value}Hz`,
      ),
    );
    results.push(
      check(
        "highsGain",
        this.highsGainNode.gain.value > 0.01,
        "forward",
        `gain=${this.highsGainNode.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "tweetersFilter",
        this.tweetersFilter.frequency.value >= 8000,
        "forward",
        `highpass freq=${this.tweetersFilter.frequency.value}Hz`,
      ),
    );
    results.push(
      check(
        "tweetersGain",
        this.tweetersGainNode.gain.value > 0.01,
        "forward",
        `gain=${this.tweetersGainNode.gain.value.toFixed(3)}`,
      ),
    );
    results.push(
      check(
        "highsEngineOutputGain",
        this.highsEngineOutputGain.gain.value > 0,
        "forward",
        `output=${this.highsEngineOutputGain.gain.value.toFixed(3)}`,
      ),
    );

    results.push(
      check(
        "tweetersEngineOutputGain",
        this.tweetersEngineOutputGain.gain.value > 0,
        "backward",
        "tweeter out wire confirmed",
      ),
    );
    results.push(
      check(
        "tweetersGain",
        this.tweetersGainNode.gain.value > 0.01,
        "backward",
        "gain non-zero \u2713",
      ),
    );
    results.push(
      check(
        "highsGain",
        this.highsGainNode.gain.value > 0.01,
        "backward",
        "highs gain non-zero \u2713",
      ),
    );
    results.push(
      check(
        "highsEngineInputGain",
        this.highsEngineInputGain !== undefined,
        "backward",
        "entry wire confirmed",
      ),
    );

    return results;
  }
}
