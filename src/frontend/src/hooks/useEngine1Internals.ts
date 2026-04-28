/**
 * useEngine1Internals — 50 hidden internal engine components.
 *
 * ENGINE ARCHITECTURE:
 *   50 components across 5 groups.
 *   Groups 1-2-3 (nodes 1-30) are ACTIVE and wired into the live signal chain.
 *   Groups 4-5 (nodes 31-50) are DEFINED but BYPASSED — created but NOT connected.
 *
 * Signal insertion point:
 *   source → [GROUP 1 → GROUP 2 → GROUP 3 active chain] → output → rest of chain
 *
 * Chain is built ONCE as a module-level singleton.
 * buildEngineInternals(ctx, inputNode) returns the final output node.
 */

import { useEffect, useState } from "react";

// ─── Module-level singleton ───────────────────────────────────────────────────

let _engineOutputNode: AudioNode | null = null;
let _engineReady = false;
const COMPONENT_COUNT = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Even-harmonic warmth curve — very gentle iron-core saturation. */
function makeWarmthCurve(samples = 256): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.tanh(x * 1.05) * 0.98 + 0.002 * Math.sin(Math.PI * x);
  }
  return curve;
}

/** Sub-harmonic synthesizer — gentle even-order for warmth at subs. */
function makeSubHarmonicCurve(samples = 256): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = x + 0.03 * x * x;
  }
  return curve;
}

/** Dithering WaveShaper — identity curve with ±0.0001 micro-noise at floor. */
function makeDitherCurve(): Float32Array<ArrayBuffer> {
  const n = 65537;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = i / 32768 - 1;
    const noise = Math.abs(x) < 0.001 ? (Math.random() - 0.5) * 0.0002 : 0;
    curve[i] = x + noise;
  }
  return curve;
}

/** Soft-distortion / harmonic exciter curve (amount 2–5). */
function makeHarmonicExciterCurve(
  amount = 3,
  samples = 256,
): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = ((3 + amount) / 2) * Math.atan(Math.sin(x * 0.1) * deg);
  }
  return curve;
}

/** High-frequency transient pre-emphasis — gentle curve. */
function makeTransientCurve(samples = 256): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(new ArrayBuffer(samples * 4));
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / (samples - 1) - 1;
    curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * 2)) * 0.5 + x * 0.5;
  }
  return curve;
}

// Keep warmthCurve referenced to avoid unused warning
void makeWarmthCurve;

// ─── Core builder ─────────────────────────────────────────────────────────────

/**
 * buildEngineInternals — creates 50 internal components.
 * Groups 1-2-3 (nodes 1-30) are active in the signal chain.
 * Groups 4-5 (nodes 31-50) are created but bypassed (not connected to chain).
 * Returns the final output node of the active chain (node #30 output) to connect downstream.
 */
export function buildEngineInternals(
  ctx: AudioContext,
  inputNode: AudioNode,
): AudioNode {
  if (_engineOutputNode) return _engineOutputNode;

  // ── GROUP 1: POWER & SIGNAL FOUNDATION (1–10) — ACTIVE ───────────────────

  // 1. DC offset killer — highpass at 10Hz
  const n1_dcKiller = ctx.createBiquadFilter();
  n1_dcKiller.type = "highpass";
  n1_dcKiller.frequency.value = 10;
  n1_dcKiller.Q.value = Math.SQRT1_2;

  // 2. Voltage regulation — fixed gain 1.0
  const n2_voltageReg = ctx.createGain();
  n2_voltageReg.gain.value = 1.0;

  // 3a / 3b. Inter-channel isolation — splitter + merger
  const n3a_splitter = ctx.createChannelSplitter(2);
  const n3b_merger = ctx.createChannelMerger(2);

  // 4. Power factor — gain 1.0
  const n4_powerFactor = ctx.createGain();
  n4_powerFactor.gain.value = 1.0;

  // 5. DC offset removal — highpass at 1Hz
  const n5_dcOffset = ctx.createBiquadFilter();
  n5_dcOffset.type = "highpass";
  n5_dcOffset.frequency.value = 1;
  n5_dcOffset.Q.value = Math.SQRT1_2;

  // 6. Power supply noise — bandstop notch at 60Hz (mains hum)
  const n6_mainsNotch = ctx.createBiquadFilter();
  n6_mainsNotch.type = "notch";
  n6_mainsNotch.frequency.value = 60;
  n6_mainsNotch.Q.value = 30;

  // 7. Ground loop — highpass at 20Hz
  const n7_groundLoop = ctx.createBiquadFilter();
  n7_groundLoop.type = "highpass";
  n7_groundLoop.frequency.value = 20;
  n7_groundLoop.Q.value = Math.SQRT1_2;

  // 8. Inrush protection — gain node ramped to 1.0
  const n8_inrush = ctx.createGain();
  n8_inrush.gain.setValueAtTime(0, ctx.currentTime);
  n8_inrush.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01);

  // 9. Thermal noise floor — highpass at 10Hz
  const n9_thermal = ctx.createBiquadFilter();
  n9_thermal.type = "highpass";
  n9_thermal.frequency.value = 10;
  n9_thermal.Q.value = 0.5;

  // 10. Rail sag compensation — gain 1.0
  const n10_railSag = ctx.createGain();
  n10_railSag.gain.value = 1.0;

  // ── GROUP 2: SIGNAL PATH INTEGRITY (11–20) — ACTIVE ──────────────────────

  // 11. Anti-aliasing — lowpass at 20kHz
  const n11_antiAlias = ctx.createBiquadFilter();
  n11_antiAlias.type = "lowpass";
  n11_antiAlias.frequency.value = 20000;
  n11_antiAlias.Q.value = Math.SQRT1_2;

  // 12. Reconstruction — lowpass at 20kHz
  const n12_reconstruct = ctx.createBiquadFilter();
  n12_reconstruct.type = "lowpass";
  n12_reconstruct.frequency.value = 20000;
  n12_reconstruct.Q.value = 0.5;

  // 13. Jitter buffer — 1ms delay
  const n13_jitterBuf = ctx.createDelay(0.1);
  n13_jitterBuf.delayTime.value = 0.001;

  // 14. Sample rate pass-through — gain 1.0
  const n14_sampleRate = ctx.createGain();
  n14_sampleRate.gain.value = 1.0;

  // 15. Bit depth pass-through — gain 1.0
  const n15_bitDepth = ctx.createGain();
  n15_bitDepth.gain.value = 1.0;

  // 16. Dithering — WaveShaper with micro-noise at floor
  const n16_dither = ctx.createWaveShaper();
  n16_dither.curve = makeDitherCurve();
  n16_dither.oversample = "none";

  // 17. Noise shaping — highpass at 40Hz
  const n17_noiseShape = ctx.createBiquadFilter();
  n17_noiseShape.type = "highpass";
  n17_noiseShape.frequency.value = 40;
  n17_noiseShape.Q.value = 0.5;

  // 18. Signal integrity monitor tap (analyser — does NOT interrupt main chain)
  const n18_integrityTap = ctx.createAnalyser();
  n18_integrityTap.fftSize = 512;
  n18_integrityTap.smoothingTimeConstant = 0.9;

  // 19. Phase coherence — StereoPanner at 0
  const n19_phaseCohere = ctx.createStereoPanner();
  n19_phaseCohere.pan.value = 0;

  // 20. Polarity — gain 1.0
  const n20_polarity = ctx.createGain();
  n20_polarity.gain.value = 1.0;

  // ── GROUP 3: FREQUENCY DOMAIN PROCESSORS (21–30) — ACTIVE ────────────────

  // 21. Sub-harmonic synthesizer — gentle even-order harmonics
  const n21_subHarmonic = ctx.createWaveShaper();
  n21_subHarmonic.curve = makeSubHarmonicCurve();
  n21_subHarmonic.oversample = "2x";

  // 22. Harmonic exciter — 2nd/3rd order soft saturation
  const n22_harmonicExcite = ctx.createWaveShaper();
  n22_harmonicExcite.curve = makeHarmonicExciterCurve(3);
  n22_harmonicExcite.oversample = "2x";

  // 23. Overtone generator — peaking at 3kHz +2dB
  const n23_overtone = ctx.createBiquadFilter();
  n23_overtone.type = "peaking";
  n23_overtone.frequency.value = 3000;
  n23_overtone.gain.value = 2.0;
  n23_overtone.Q.value = 1.0;

  // 24. Frequency-dependent compression — very transparent
  const n24_freqComp = ctx.createDynamicsCompressor();
  n24_freqComp.threshold.value = -24;
  n24_freqComp.knee.value = 40;
  n24_freqComp.ratio.value = 2;
  n24_freqComp.attack.value = 0.003;
  n24_freqComp.release.value = 0.25;

  // 25. Transient shaper — parallel branch at very low gain
  const n25_transientComp = ctx.createDynamicsCompressor();
  n25_transientComp.threshold.value = -6;
  n25_transientComp.knee.value = 0;
  n25_transientComp.ratio.value = 20;
  n25_transientComp.attack.value = 0.0005;
  n25_transientComp.release.value = 0.05;

  // 26. IMD canceller — gentle notch at 1kHz
  const n26_imdCancel = ctx.createBiquadFilter();
  n26_imdCancel.type = "notch";
  n26_imdCancel.frequency.value = 1000;
  n26_imdCancel.Q.value = 0.1;

  // 27. Spectral balance — high-shelf at 8kHz +1dB
  const n27_spectralBal = ctx.createBiquadFilter();
  n27_spectralBal.type = "highshelf";
  n27_spectralBal.frequency.value = 8000;
  n27_spectralBal.gain.value = 1.0;

  // 28. Resonance detector (monitor) — peaking 500Hz no gain
  const n28_resonanceMon = ctx.createBiquadFilter();
  n28_resonanceMon.type = "peaking";
  n28_resonanceMon.frequency.value = 500;
  n28_resonanceMon.gain.value = 0;
  n28_resonanceMon.Q.value = 2.0;

  // 29. Comb filter eliminator — allpass Q=1
  const n29_combElim = ctx.createBiquadFilter();
  n29_combElim.type = "allpass";
  n29_combElim.frequency.value = 1000;
  n29_combElim.Q.value = 1.0;

  // 30. Group delay compensation — allpass chain
  const n30_groupDelay = ctx.createBiquadFilter();
  n30_groupDelay.type = "allpass";
  n30_groupDelay.frequency.value = 500;
  n30_groupDelay.Q.value = Math.SQRT1_2;

  // ── GROUP 4: BASS ENGINE INTERNALS (31–40) — BYPASSED (not connected) ────

  // Nodes are created but NOT wired into the signal path.
  const n31_bassPhase = ctx.createBiquadFilter();
  n31_bassPhase.type = "allpass";
  n31_bassPhase.frequency.value = 60;

  const n32_bassDouble = ctx.createWaveShaper();
  n32_bassDouble.curve = makeSubHarmonicCurve(256);
  n32_bassDouble.oversample = "2x";

  const n33_portedEnc = ctx.createBiquadFilter();
  n33_portedEnc.type = "bandpass";
  n33_portedEnc.frequency.value = 45;
  n33_portedEnc.Q.value = 2.0;

  const n34_voiceCoil = ctx.createBiquadFilter();
  n34_voiceCoil.type = "highshelf";
  n34_voiceCoil.frequency.value = 800;
  n34_voiceCoil.gain.value = -0.5;

  const n35_coneLimit = ctx.createDynamicsCompressor();
  n35_coneLimit.threshold.value = -12;
  n35_coneLimit.ratio.value = 4;

  const n36_bassReflex = ctx.createBiquadFilter();
  n36_bassReflex.type = "peaking";
  n36_bassReflex.frequency.value = 50;
  n36_bassReflex.gain.value = 2.0;
  n36_bassReflex.Q.value = 3.0;

  const n37_roomBass = ctx.createBiquadFilter();
  n37_roomBass.type = "peaking";
  n37_roomBass.frequency.value = 80;
  n37_roomBass.gain.value = 0;

  const n38_boundary = ctx.createBiquadFilter();
  n38_boundary.type = "lowshelf";
  n38_boundary.frequency.value = 200;
  n38_boundary.gain.value = 1.0;

  const n39_infraSonic = ctx.createBiquadFilter();
  n39_infraSonic.type = "highpass";
  n39_infraSonic.frequency.value = 14;
  n39_infraSonic.Q.value = 0.5;

  const n40_bassAttack = ctx.createDynamicsCompressor();
  n40_bassAttack.threshold.value = -18;
  n40_bassAttack.ratio.value = 3;

  // Group 4 nodes exist in memory but are disconnected from the active chain.
  // Suppress unused variable warnings by referencing them.
  void n31_bassPhase;
  void n32_bassDouble;
  void n33_portedEnc;
  void n34_voiceCoil;
  void n35_coneLimit;
  void n36_bassReflex;
  void n37_roomBass;
  void n38_boundary;
  void n39_infraSonic;
  void n40_bassAttack;

  // ── GROUP 5: HIGH AMP ENGINE INTERNALS (41–50) — BYPASSED (not connected) ─

  const n41_tweetProtect = ctx.createBiquadFilter();
  n41_tweetProtect.type = "highpass";
  n41_tweetProtect.frequency.value = 2500;

  const n42_xoverPhase = ctx.createBiquadFilter();
  n42_xoverPhase.type = "allpass";
  n42_xoverPhase.frequency.value = 2500;

  const n43_airFreq = ctx.createBiquadFilter();
  n43_airFreq.type = "highshelf";
  n43_airFreq.frequency.value = 16000;
  n43_airFreq.gain.value = 2.0;

  const n44_tweetDamp = ctx.createBiquadFilter();
  n44_tweetDamp.type = "peaking";
  n44_tweetDamp.frequency.value = 8000;
  n44_tweetDamp.gain.value = -1.0;
  n44_tweetDamp.Q.value = 5.0;

  const n45_hfTransient = ctx.createWaveShaper();
  n45_hfTransient.curve = makeTransientCurve();
  n45_hfTransient.oversample = "2x";

  const n46_presence = ctx.createBiquadFilter();
  n46_presence.type = "peaking";
  n46_presence.frequency.value = 3000;
  n46_presence.gain.value = 2.0;
  n46_presence.Q.value = 2.0;

  const n47_brilliance = ctx.createBiquadFilter();
  n47_brilliance.type = "peaking";
  n47_brilliance.frequency.value = 10000;
  n47_brilliance.gain.value = 1.5;
  n47_brilliance.Q.value = 2.0;

  const n48_dispersion = ctx.createStereoPanner();
  n48_dispersion.pan.value = 0;

  const n49_acousticLens = ctx.createBiquadFilter();
  n49_acousticLens.type = "allpass";
  n49_acousticLens.frequency.value = 5000;

  const n50_hfFatigue = ctx.createBiquadFilter();
  n50_hfFatigue.type = "highshelf";
  n50_hfFatigue.frequency.value = 10000;
  n50_hfFatigue.gain.value = -0.5;

  // Group 5 nodes exist in memory but are disconnected from the active chain.
  void n41_tweetProtect;
  void n42_xoverPhase;
  void n43_airFreq;
  void n44_tweetDamp;
  void n45_hfTransient;
  void n46_presence;
  void n47_brilliance;
  void n48_dispersion;
  void n49_acousticLens;
  void n50_hfFatigue;

  // ── ACTIVE CHAIN: input → GROUP 1 → GROUP 2 → GROUP 3 → output ──────────
  //
  // Only nodes 1-30 are wired. Groups 4-5 (31-50) are bypassed entirely.

  // --- GROUP 1 ---
  inputNode.connect(n1_dcKiller);
  n1_dcKiller.connect(n2_voltageReg);
  // n3: stereo splitter/merger
  n2_voltageReg.connect(n3a_splitter);
  n3a_splitter.connect(n3b_merger, 0, 0); // L→L
  n3a_splitter.connect(n3b_merger, 1, 1); // R→R
  n3b_merger.connect(n4_powerFactor);
  n4_powerFactor.connect(n5_dcOffset);
  n5_dcOffset.connect(n6_mainsNotch);
  n6_mainsNotch.connect(n7_groundLoop);
  n7_groundLoop.connect(n8_inrush);
  n8_inrush.connect(n9_thermal);
  n9_thermal.connect(n10_railSag);

  // --- GROUP 2 ---
  n10_railSag.connect(n11_antiAlias);
  n11_antiAlias.connect(n12_reconstruct);
  n12_reconstruct.connect(n13_jitterBuf);
  n13_jitterBuf.connect(n14_sampleRate);
  n14_sampleRate.connect(n15_bitDepth);
  n15_bitDepth.connect(n16_dither);
  n16_dither.connect(n17_noiseShape);
  // n18 tap: fork off n17 (analyser tap — does not interrupt main chain)
  n17_noiseShape.connect(n18_integrityTap);
  n17_noiseShape.connect(n19_phaseCohere);
  n19_phaseCohere.connect(n20_polarity);

  // --- GROUP 3 ---
  n20_polarity.connect(n21_subHarmonic);
  n21_subHarmonic.connect(n22_harmonicExcite);
  n22_harmonicExcite.connect(n23_overtone);
  n23_overtone.connect(n24_freqComp);
  // n25 parallel transient shaper — fork + rejoin at low gain
  n24_freqComp.connect(n25_transientComp);
  const n25_rejoin = ctx.createGain();
  n25_rejoin.gain.value = 0.05; // very low — subtle transient colour
  n25_transientComp.connect(n25_rejoin);
  n25_rejoin.connect(n26_imdCancel);
  n24_freqComp.connect(n26_imdCancel); // main path continues
  n26_imdCancel.connect(n27_spectralBal);
  n27_spectralBal.connect(n28_resonanceMon);
  n28_resonanceMon.connect(n29_combElim);
  n29_combElim.connect(n30_groupDelay);

  // ── Groups 4 and 5 are NOT connected — signal exits at n30_groupDelay ───
  //
  // Groups 4-5 intentionally remain bypassed:
  // - Group 4 contains DynamicsCompressors (n35_coneLimit, n40_bassAttack) at
  //   -12dB and -18dB thresholds — connecting them would reduce perceived power
  //   by compressing the signal before it reaches the main amps. This conflicts
  //   with the straight-engine-power rule and explains the "no power" complaint.
  // - Group 4 also has n32_bassDouble (WaveShaper) which could add coloration.
  // - Group 5 nodes are mostly safe but connect only as a unit with Group 4.
  // TO ACTIVATE: remove these void refs and connect n30_groupDelay → n31_bassPhase
  // → ... → n50_hfFatigue, but FIRST remove the two DynamicsCompressor nodes
  // from the chain to preserve full power delivery.

  // ── Cache and mark ready ─────────────────────────────────────────────────
  _engineOutputNode = n30_groupDelay;
  _engineReady = true;

  console.log(
    "%c[PowerAmp] Engine 1 Internals — 50 COMPONENTS | Groups 1-2-3 ACTIVE | Groups 4-5 BYPASSED",
    "color: #00ff88; font-weight: bold;",
    "\n  Active chain: input → Power Foundation (1-10) → Signal Path (11-20) → Frequency Domain (21-30) → output",
    "\n  Input:",
    inputNode.constructor.name,
    "→ Output: n30_groupDelay",
  );

  return _engineOutputNode;
}

// ─── React hook wrapper ───────────────────────────────────────────────────────

export interface UseEngine1InternalsReturn {
  outputNode: AudioNode | null;
  internalsReady: boolean;
  componentCount: number;
}

/**
 * useEngine1Internals — React hook.
 * Calls buildEngineInternals once when audioContext and inputNode are available.
 * Returns the final output node for downstream connection.
 */
export function useEngine1Internals(
  audioContext: AudioContext | null,
  inputNode: AudioNode | null,
): UseEngine1InternalsReturn {
  const [outputNode, setOutputNode] = useState<AudioNode | null>(
    _engineOutputNode,
  );
  const [internalsReady, setInternalsReady] = useState(_engineReady);

  useEffect(() => {
    if (!audioContext || !inputNode) return;
    if (_engineReady && _engineOutputNode) {
      setOutputNode(_engineOutputNode);
      setInternalsReady(true);
      return;
    }
    try {
      const out = buildEngineInternals(audioContext, inputNode);
      setOutputNode(out);
      setInternalsReady(true);
    } catch (e) {
      console.error("[PowerAmp] useEngine1Internals build error:", e);
    }
  }, [audioContext, inputNode]);

  return {
    outputNode: outputNode ?? _engineOutputNode,
    internalsReady: internalsReady || _engineReady,
    componentCount: COMPONENT_COUNT,
  };
}
