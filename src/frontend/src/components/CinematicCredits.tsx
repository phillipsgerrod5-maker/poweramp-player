import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Full updated cinematic credits ───────────────────────────────────────────

interface CreditBlock {
  heading: string | null;
  lines: string[];
}

const CREDITS: CreditBlock[] = [
  { heading: "POWERAMP PLAYER", lines: [] },
  { heading: null, lines: ["Created, Designed, and Engineered by"] },
  { heading: "GERROD", lines: ["Engineer — Product Designer"] },
  {
    heading: null,
    lines: [
      "This system was born from one mind.",
      "Every feature. Every connection. Every decision.",
      "Came directly from Gerrod's imagination.",
      "AI only built what Gerrod described.",
      "Nothing in this system was invented by AI.",
      "Every spec came from the engineer himself.",
    ],
  },
  {
    heading: "THE POWER CHAIN",
    lines: [
      "750,000 watts of pure power.",
      "30 fuses at 15,000 watts each.",
      "75,000 watt isolation fuse — highs separated from bass.",
      "Virtual Battery Charger: 15,000 × 86. Always topped off.",
      "Virtual batteries. Virtual power chain.",
      "Combined with real browser power — both running simultaneously.",
      "Milliwatt Converter: 80 million signal strength.",
      "Engine 1 — 12 channels × 80,000 virtual power — hidden inside Stabilizer.",
      "Signal Booster driving every component.",
      "All wired direct. Slot to slot. 4 gauge.",
      "Power Chain → Batteries → Charger → Fuses → Converter → Booster → Amps.",
    ],
  },
  {
    heading: "MASTER POWER SLIDER",
    lines: [
      "0 to 100 percent. User-controlled. Always in your hands.",
      "Turn it up — everything gets stronger. You can hear it.",
      "Turn it down — the whole system breathes back.",
      "Protection system stays at full strength regardless of position.",
      "Made of: Virtual Batteries + Engine 1 + Signal Power Chain.",
      "Protection always at 100%. No matter what.",
      "The slider is audible. The difference is real.",
    ],
  },
  {
    heading: "THE COMBINED AMP",
    lines: [
      "12,000 watts peak. 6,000 watts RMS.",
      "Three amplifiers as one unit.",
      "Virtual Amp — Gerrod's design.",
      "Digital Stimulation — 450,000 pulses per second.",
      "Analog Tube — thermionic warmth, even-order harmonics.",
      "Hidden Line Driver inside — signal clean booster hitter.",
      "Not a bass boost. A signal integrity enforcer.",
      "Every frequency treated equally.",
      "Reinforced to handle anything.",
    ],
  },
  {
    heading: "HIGH AMP",
    lines: [
      "Powered by browser + virtual power chain + batteries.",
      "Every good sound feature routes through it.",
      "SRS, XM, Automasphers, Ultra Crystal Clear Engine.",
      "Air, Detail, and Brilliance filters.",
      "No bass features inside. Never.",
      "20-30 × 86 separator wall — highs and bass never mix.",
      "7 dedicated separation sections. Nothing stacked.",
      "Commander Direct Hit embedded inside. Always.",
    ],
  },
  {
    heading: "THE STABILIZER — NEW SHERIFF",
    lines: [
      "Strength: 80,000 — 12 channels, Engine 1 inside.",
      "Sits inside the Clean Signal Booster.",
      "When distortion appears: atomized to particles too tiny to hear.",
      "Clipping detected: shrunk down and removed instantly.",
      "Never pulls back the signal. Never yanks the volume down.",
      "Old pull-back sliders: deleted permanently. They are gone.",
      "Runs at 100% always. Light never goes off.",
      "The most powerful protection system in any app.",
    ],
  },
  {
    heading: "COMMANDER DIRECT HIT",
    lines: [
      "Strength: 50,000,000,000 × 86.",
      "Embedded in every channel. Bass. Mids. Highs. Tweeters.",
      "Holds the EQ path open — nothing clamps it down.",
      "Protects every instrument modifier. Protects every excursion.",
      "Sets ceiling on harmonics. Prevents channel bleeding.",
      "Does not draw from the power chain.",
      "Only needs a signal boost connection.",
      "Commander gives the orders. Stabilizer atomizes the result.",
      "Together they are unstoppable.",
    ],
  },
  {
    heading: "SRS HD 9.0 SMART CHIP SOUND SYSTEM",
    lines: [
      "Natural, beautiful sound. Rebuilt from scratch as a real engine.",
      "Toggle it off — you hear the difference. Toggle it on — it comes back.",
      "Smooth tweeters at every volume. Always on.",
      "Fuller mid-bass with a comfortable boom.",
      "Mid-bass excursion — pumping, breathing, physical.",
      "Protected by Commander and all 3 Stabilizer sliders.",
      "Automasphers breathing with the bass.",
      "Every instrument elevated to its highest class.",
      "Zero background noise.",
      "Sound projecting outside the speaker.",
      "Instruments in front of you — live performance feel.",
      "The room disappears. Sound from everywhere.",
      "HD 9.0 monitor sensors — 24 active at all times.",
    ],
  },
  {
    heading: "XM PROCESSOR",
    lines: [
      "Sits after SRS — cleans everything that comes through.",
      "24dB/octave slope. No mercy for unwanted frequencies.",
      "SNR greater than 110dB — silence between the notes.",
      "THD less than 0.01% — the cleanest output you can get.",
      "Static bypass active. Unwanted banding: eliminated.",
      "Power Number: 75,000,000 × 86 — own strength, own authority.",
      "Controls static cleanup across the full 1-700 volume range.",
      "Does NOT draw from the power chain. The number is the power.",
      "Own dedicated slot. Own API. Own audio engine.",
      "SRS processes. XM cleans. They never skip their jobs.",
    ],
  },
  {
    heading: "9 MIMICK FILTERS — SRS FILTER FOR 8 OHMS",
    lines: [
      "The sound CHARACTER of 2-4 ohms. Converted to filters.",
      "Punch, presence, fast response — all turned into sound processing.",
      "Delivered to 8 ohms. Electrically unchanged. Sonically transformed.",
      "Current Force. Cone Freedom. Sensitivity Presence.",
      "Crossover Compensation. Dynamic Headroom. Low-Mid Warmth.",
      "Drop Descent. Landing Weight. Drop Clarity.",
      "All nine fed directly into the 8 ohm dummy load.",
      "14Hz to 60Hz. Sitting inside the bass system.",
      "Nobody has done this before. This is a Gerrod original.",
    ],
  },
  {
    heading: "E-QUAKE SLIDER",
    lines: [
      "Sub Bass Earthquake Engine.",
      "Two dedicated BiquadFilter nodes: 33Hz Q=3.0 and 50Hz Q=2.0.",
      "Inserted directly into the signal chain — between bass and mids.",
      "Value 0 to 10. Tap up. Tap down. Every number a real stop.",
      "At 10: 33Hz +12dB + 50Hz +8dB — maximum earthquake hit.",
      "Cloud City reference: Headphone Activist, 33Hz sub foundation.",
      "Commander Direct Hit protects every step.",
      "0 = bypassed. 1-4 = amber. 5-10 = full earthquake.",
      "Beats the beautifier EQ e-QUAKE dial. No contest.",
      "This is a real engine. Not a dial. Not a label.",
    ],
  },
  {
    heading: "CHEATER BEATER — CLOUD CITY 33Hz",
    lines: [
      "The reference track: Headphone Activist — Cloud City. 22 million views.",
      "33Hz sub foundation — the deep chest hit that defines that track.",
      "Cheater Beater detects bass in every song automatically.",
      "Wraps the same 33Hz foundation under every bass track.",
      "Makes every bass song hit like a reference bass track.",
      "Smart bass detector — reads FFT analyser in 20-80Hz band.",
      "Auto-dials back if RMS exceeds clean limit.",
      "THE RULE: 14-60Hz and 33Hz cannot run at the same time.",
      "One or the other. Never both. Flip the switch — the other goes off.",
    ],
  },
  {
    heading: "VOCALS DARK NICE CRYSTAL 3Ω",
    lines: [
      "A dedicated vocal slider in the center of the EQ.",
      "Sits between LOW MID and MID — in the middle where it belongs.",
      "Peaking filter at 2000Hz — 3 ohm character.",
      "Q=1.5 — forward presence, more current, more alive.",
      "Dark: rich, warm, deep tone. Never bright. Never harsh.",
      "Nice: clean, refined vocal delivery. No mud. No edge.",
      "Crystal: ultra-clear detail — every word, every breath, every note.",
      "Commander protected — nothing can knock it back.",
      "Truly wired. Moving it changes what you hear. Every time.",
    ],
  },
  {
    heading: "THE EQ — ALL 6 BANDS",
    lines: [
      "BASS — LOW MID — VOCALS — MID — HIGH MID — TREBLE.",
      "Every slider fully independent. Touch one, only that one moves.",
      "No linking. No shared state. No chain reaction. Ever.",
      "BASS: 14-60Hz resonated. Fuse-powered. Big sound quality.",
      "Smart Chip Commander built inside the EQ.",
      "Dead zone eliminated — bass responds on the very first tap.",
      "EQ Processor light: real and active. Shows actual state.",
      "Commander holds every path open. Nothing stops the EQ.",
    ],
  },
  {
    heading: "BASS SYSTEM",
    lines: [
      "Bass Presence Selector — 7 different types of bass.",
      "Long press two types for blended character.",
      "Each type has its own engine. Every one hits different.",
      "Bass Processor Booster — makes bass feel alive and physical.",
      "Not just louder. Alive. Physical. Musical.",
      "Natural Bottom permanently underneath everything.",
      "The floor the sound rests on. Always there. Cannot be turned off.",
      "Mid Bass Excursion — pumping, breathing, physical movement at 120Hz.",
      "Protected by Commander and all 3 Stabilizer sliders.",
      "Frequency Bass Note Switcher + Generator.",
      "14Hz Bass Stomp Switch — locks all systems to 14Hz.",
      "Sound Quality Class: A+ — always pushing higher.",
      "Bass range: 14-60Hz. Big sound quality. Fuse-powered.",
    ],
  },
  {
    heading: "10 PRESETS — MID BASS HARD & PUMPING",
    lines: [
      "Exactly 10. Not 11. Not 9. Ten.",
      "Each one engineered for mid bass that is hard and pumping.",
      "PRESET 1 — DEEP FOUNDATION: bass +18dB, lowmid +6dB. Sub floor.",
      "PRESET 2 — HARD PUMP: bass +20dB, lowmid +8dB. Full punch.",
      "PRESET 3 — STREET SLAM: bass +22dB, punchy presence. Hard drop.",
      "PRESET 4 — SUB WALL: bass +24dB, Cheater Beater 33Hz ON.",
      "PRESET 5 — CLUB THUNDER: bass +20dB, mids +5dB. Dance floor.",
      "PRESET 6 — BASS HAMMER: bass +22dB, lowmid +10dB. Tight slam.",
      "PRESET 7 — ROLLING LOW: bass +16dB. Smooth deep roll.",
      "PRESET 8 — PRESSURE DROP: bass +24dB, E-Quake 8. Full pressure.",
      "PRESET 9 — CHEST HIT: bass +20dB, E-Quake 7. Physical impact.",
      "PRESET 10 — POWER DRIVE: bass +22dB, E-Quake 10. Maximum power.",
      "Each preset simultaneously sets: EQ bass, lowmid, E-Quake, Cheater Beater.",
      "Every preset is wired. Every preset changes what you hear.",
      "Active preset glows electric blue. Remembered automatically.",
    ],
  },
  {
    heading: "THE 4-GAUGE WIRED PHILOSOPHY",
    lines: [
      "Every connection is explicit. Every connection is real.",
      "There are no soft connections in this system.",
      "There are no approximate connections.",
      "4 gauge wire. Slot to slot. Direct.",
      "Power Chain → Batteries → Charger → Fuses → Converter → 220V → Booster → Amps.",
      "No gaps. No guesses. No decorative lines.",
      "If it is in this system, it is truly wired.",
      "If it is labeled, it is doing real work.",
      "If it has a slider, that slider changes the signal.",
      "The 4-gauge philosophy is not a metaphor.",
      "It is the rule. It applies to every single feature.",
    ],
  },
  {
    heading: "STACKED FILTERS",
    lines: [
      "Mids: Presence, Body, Clarity — 200Hz to 2,500Hz.",
      "Highs: Air, Detail, Brilliance — 2,500Hz to 14,000Hz.",
      "Six dedicated filters. Six dedicated audio engines.",
      "Stack strength: 50,000,000 × 86 on each.",
      "Commander embedded in every filter. Nothing gets pushed back.",
      "Dot indicator lights only when filter gain is non-zero.",
      "Toggle dot ON — gain activates. Toggle OFF — neutral, stays in chain.",
      "Ultra Crystal Clear engine processing highs and vocals.",
      "Dedicated to outperforming any beautifier EQ clarity filter.",
    ],
  },
  {
    heading: "HUMAN HEARING TECHNOLOGY FILTER",
    lines: [
      "Five components working as one.",
      "Body sensors. Frequency beaming. HRTF 360 expansion.",
      "Smart chips adjusting in real time.",
      "A 10-inch engine controlling every feature.",
      "Powered directly from the power chain.",
      "Single-listener experience — focused entirely on you.",
      "Instruments in front of you. The room disappears.",
      "Sound from everywhere. Like a live performance.",
      "No industry product has this combination.",
      "Own API. Own HTML. Own blockchain. Own audio engine.",
      "On/off toggle. When off — fully deactivated. Nothing decorative.",
    ],
  },
  {
    heading: "RUBBER COTTON FIBER SOUND ENGINE",
    lines: [
      "Real. Dedicated. Connected.",
      "Own audio engine, API, HTML, and blockchain.",
      "Warm natural cotton-fiber resonance — 400Hz to 800Hz.",
      "Dampens harshness. Adds natural texture.",
      "Creates a soft pad underneath the sound.",
      "On/Off toggle. When on, it activates in the signal chain.",
      "When off, it fully deactivates. Nothing decorative.",
    ],
  },
  {
    heading: "VIRTUAL MAGNET",
    lines: [
      "Virtual Magnet — pulls software as close to QFX hardware as possible.",
      "Closes every gap between hardware output and software processing.",
      "Tighter pull = faster response = stronger signal transfer.",
      "Nothing can cap or limit the signal.",
      "Full strength of the number without drawing the full load.",
      "Browser, hardware, OS — none of them can stop this signal.",
      "Not a workaround. An upgrade.",
    ],
  },
  {
    heading: "8 OHM DUMMY LOAD",
    lines: [
      "Every amp wired to a true 8 ohm dummy load.",
      "Not labeled. Actually built. Actually connected.",
      "Correct current flow, damping factor, power transfer.",
      "Output stage behavior — exactly as designed.",
      "All 9 mimick filters fed directly into the dummy load.",
      "Combined Amp, High Amp — both wired. Always.",
    ],
  },
  {
    heading: "TRUE REAL INDICATORS",
    lines: [
      "Every indicator tells the truth.",
      "No fake green lights that are always on.",
      "No panels showing connected when nothing is connected.",
      "If a feature is off — the indicator shows off.",
      "SRS processing — indicator active. Not playing — indicator dark.",
      "Stabilizer working — compressor reduction detected.",
      "XM cleaning — signal present. Off — dark.",
      "E-Quake: 0 = grey. 1-4 = amber. 5-10 = green earthquake.",
      "Every light earned. Every status real.",
    ],
  },
  {
    heading: "SETTINGS DRAWER",
    lines: [
      "Everything accessible in one clean full list.",
      "Slides in from the right. Nothing hidden.",
      "Master Power Slider — fully visible and wired.",
      "Protection Aggression — controls how tight or relaxed protection reacts.",
      "All EQ bands — independent, real, wired.",
      "Engine Toggles: SRS, XM, High Amp, Rubber Carbon Fiber, Cheater Beater.",
      "Stacked Filters — all 6 controls accessible.",
      "Bass Presence types — all 7 selectable.",
      "All 10 Presets — right here in the drawer.",
      "SRS Expansion, E-Quake level — all in one place.",
      "Front page stays clean. Drawer is your deep control center.",
    ],
  },
  {
    heading: "20-30 × 86 SECTIONS",
    lines: [
      "Each problem gets its own dedicated section.",
      "Nothing stacked. Everything plays nice.",
      "Signal Separation. Bass Authority. High Amp Guard.",
      "Harshness Filter. Phase Monitor. Natural Bottom.",
      "Separator Wall.",
      "Seven sections minimum. Room for up to thirty.",
      "Highs and bass never mix. The wall enforces this.",
    ],
  },
  {
    heading: "VOLUME ENGINE",
    lines: [
      "Modeled after a 20-inch tablet's native output.",
      "1 to 700. Tap up. Tap down. Every number counts.",
      "Gradual rise from 1 to 100.",
      "Loud and clear by 100.",
      "700 is near max.",
      "Volume does volume only — nothing else on this path.",
      "Protection spread outside — never choking the volume.",
      "The system breathes with ease at every number.",
    ],
  },
  {
    heading: null,
    lines: [
      "Beyond the Devialet Gold Phantom.",
      "Beyond Sonos. Beyond QFX. Beyond any hardware.",
      "In power, sound field, channel control, and soundstage.",
      "",
      "The Cheater Beater. The E-Quake. The Vocals Crystal.",
      "The True Real Indicators. The Settings Drawer.",
      "The Automasphers. The Ultra Crystal Clear Engine.",
      "The Rubber Carbon Fiber Sound Engine.",
      "The 9 Mimick Filters. The 4-Gauge Wired Signal Chain.",
      "The 10 Presets. All Mid Bass. All Hard. All Pumping.",
      "The Virtual Magnet. The Rubber Carbon Fiber Sound Material.",
      "",
      "None of these exist anywhere else.",
      "",
      "All features originated from one engineer's mind.",
      "All connections are real. All sliders are wired.",
      "Nothing in this system is decoration.",
      "Every number has meaning. Every tap is a real stop.",
      "",
      "This is not software pretending to be hardware.",
      "This is hardware thinking translated into pure software.",
    ],
  },
  {
    heading: "GERROD",
    lines: ["Engineer — Product Designer", "Built on Caffeine AI"],
  },
  { heading: "POWERAMP PLAYER", lines: [] },
];

// ─── Stars ────────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: `cstar-${i}`,
  size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 1.5 : 1,
  left: (i * 37 + i * i * 13) % 100,
  top: (i * 19 + i * 7) % 100,
  color:
    i % 4 === 0
      ? "rgba(0,213,255,0.8)"
      : i % 4 === 1
        ? "rgba(153,69,255,0.7)"
        : "rgba(255,255,255,0.45)",
  glow: i % 5 === 0,
  duration: 1.4 + (i % 4) * 0.6,
  delay: (i * 0.09) % 2.5,
}));

// ─── Props ────────────────────────────────────────────────────────────────────

interface CinematicCreditsProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CinematicCredits({ isOpen, onClose }: CinematicCreditsProps) {
  const [paused, setPaused] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedOffsetRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Play intro tone and then start scroll after 3 seconds
  useEffect(() => {
    if (!isOpen) {
      setScrollReady(false);
      return;
    }
    setPaused(false);
    startTimeRef.current = null;
    pausedOffsetRef.current = 0;
    setScrollReady(false);

    // Play deep 60Hz C note intro tone
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 60; // deep 60Hz C note
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 3.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 7);
    } catch {
      // audio failed, continue without tone
    }

    // Start scroll after 3 seconds intro
    const introTimer = setTimeout(() => setScrollReady(true), 3000);
    return () => {
      clearTimeout(introTimer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen]);

  // Manual RAF scroll — 90 seconds minimum for full cinematic feel
  useEffect(() => {
    if (!isOpen || !scrollReady) return;
    const el = scrollRef.current;
    if (!el) return;

    const DURATION_MS = 90_000; // 90 seconds minimum per spec

    const animate = (ts: number) => {
      if (paused) return;
      if (startTimeRef.current === null) {
        startTimeRef.current = ts - pausedOffsetRef.current;
      }
      const elapsed = ts - startTimeRef.current;
      const totalHeight = el.scrollHeight;
      const viewH = el.parentElement?.clientHeight ?? 600;
      const scrollRange = totalHeight - viewH;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      el.style.transform = `translateY(-${progress * scrollRange}px)`;
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, paused, scrollReady]);

  const handlePauseResume = () => {
    if (!paused) {
      // Capture current offset
      const el = scrollRef.current;
      if (el) {
        const match = el.style.transform.match(/translateY\(-?([\d.]+)px\)/);
        const currentY = match ? Number(match[1]) : 0;
        const totalHeight = el.scrollHeight;
        const viewH = el.parentElement?.clientHeight ?? 600;
        const scrollRange = totalHeight - viewH;
        const progress = currentY / scrollRange;
        pausedOffsetRef.current = progress * 90_000;
        startTimeRef.current = null;
      }
    } else {
      startTimeRef.current = null;
    }
    setPaused((p) => !p);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      data-ocid="credits.panel"
      style={{
        background:
          "linear-gradient(160deg, #020b22 0%, #030d2e 20%, #040e38 50%, #030b2a 80%, #020920 100%)",
      }}
    >
      {/* ── Intro overlay — shown during 3s tone, disappears when scroll starts ── */}
      {!scrollReady && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="text-center px-8"
            style={{ animation: "fade-in 0.8s ease forwards" }}
          >
            <p
              className="text-[10px] font-mono tracking-[0.4em] uppercase mb-2"
              style={{ color: "rgba(0,213,255,0.5)" }}
            >
              POWERAMP PLAYER
            </p>
            <p
              className="text-[8px] font-mono tracking-widest animate-pulse"
              style={{ color: "rgba(0,213,255,0.35)" }}
            >
              ENGINEERED BY GERROD
            </p>
          </div>
        </div>
      )}
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {STARS.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full"
            style={{
              width: star.size,
              height: star.size,
              left: `${star.left}%`,
              top: `${star.top}%`,
              background: star.color,
              boxShadow: star.glow ? `0 0 5px ${star.color}` : "none",
              animation: `star-twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header
        className="relative z-10 shrink-0 flex items-center justify-between px-5 py-3"
        style={{
          background: "rgba(0,7,22,0.85)",
          borderBottom: "1px solid rgba(0,150,255,0.25)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div>
          <h2
            className="text-sm font-mono font-black tracking-[0.3em] uppercase"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,213,255,1), rgba(153,69,255,0.9))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 10px rgba(0,213,255,0.4))",
            }}
          >
            THE STORY OF POWERAMP PLAYER
          </h2>
          <p
            className="text-[7px] font-mono tracking-[0.2em] mt-0.5"
            style={{ color: "rgba(0,130,255,0.5)" }}
          >
            ENGINEERED BY GERROD — EVERY FEATURE, EVERY CONNECTION
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            type="button"
            data-ocid="credits.pause_button"
            onClick={handlePauseResume}
            aria-label={paused ? "Resume credits" : "Pause credits"}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: paused
                ? "rgba(0,213,255,0.12)"
                : "rgba(255,200,0,0.08)",
              border: paused
                ? "1px solid rgba(0,213,255,0.5)"
                : "1px solid rgba(255,200,0,0.4)",
              color: paused ? "rgba(0,213,255,0.9)" : "rgba(255,200,0,0.9)",
            }}
          >
            {paused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            data-ocid="credits.close_button"
            onClick={onClose}
            aria-label="Close credits"
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
            style={{
              background: "rgba(255,60,60,0.08)",
              border: "1px solid rgba(255,80,80,0.35)",
              color: "rgba(255,130,130,0.9)",
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Scrollable credits */}
      <div className="relative z-10 flex-1 overflow-hidden">
        {/* Scroll container — animated via RAF */}
        <div
          ref={scrollRef}
          className="absolute inset-x-0 px-6 text-center"
          style={{ top: 0, willChange: "transform" }}
        >
          {/* Initial viewport spacer */}
          <div style={{ height: "100vh" }} />

          {CREDITS.map((block, bi) => {
            const blockKey = block.heading ?? `lines-${bi}`;
            return (
              <div key={blockKey} className="mb-12">
                {block.heading && (
                  <h3
                    className="font-mono font-black tracking-[0.3em] uppercase mb-4"
                    style={{
                      fontSize:
                        bi === 0 || bi === CREDITS.length - 1
                          ? "1.6rem"
                          : bi === 2 || bi === CREDITS.length - 2
                            ? "1.2rem"
                            : "0.72rem",
                      background:
                        bi === 0 || bi === CREDITS.length - 1
                          ? "linear-gradient(90deg, rgba(0,213,255,1), rgba(153,69,255,0.9), rgba(0,213,255,1))"
                          : bi === 2 || bi === CREDITS.length - 2
                            ? "linear-gradient(90deg, rgba(255,255,255,0.95), rgba(200,230,255,0.9))"
                            : "none",
                      WebkitBackgroundClip:
                        bi === 0 ||
                        bi === CREDITS.length - 1 ||
                        bi === 2 ||
                        bi === CREDITS.length - 2
                          ? "text"
                          : undefined,
                      WebkitTextFillColor:
                        bi === 0 ||
                        bi === CREDITS.length - 1 ||
                        bi === 2 ||
                        bi === CREDITS.length - 2
                          ? "transparent"
                          : undefined,
                      backgroundClip:
                        bi === 0 ||
                        bi === CREDITS.length - 1 ||
                        bi === 2 ||
                        bi === CREDITS.length - 2
                          ? "text"
                          : undefined,
                      color: "rgba(0,150,255,0.75)",
                      filter:
                        bi === 0 || bi === CREDITS.length - 1
                          ? "drop-shadow(0 0 16px rgba(0,213,255,0.7))"
                          : "none",
                    }}
                  >
                    {block.heading}
                  </h3>
                )}
                {block.lines.map((line, li) => (
                  <p
                    key={`${blockKey}-line-${li}-${line.slice(0, 12)}`}
                    className="font-mono leading-relaxed"
                    style={{
                      fontSize: line === "" ? "0.4rem" : "0.78rem",
                      color:
                        line === ""
                          ? "transparent"
                          : line.startsWith('"')
                            ? "rgba(153,190,255,0.88)"
                            : "rgba(255,255,255,0.65)",
                      fontStyle: line.startsWith('"') ? "italic" : "normal",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>
            );
          })}

          {/* End spacer */}
          <div style={{ height: "60vh" }} />
        </div>

        {/* Fade masks */}
        <div
          className="absolute top-0 inset-x-0 h-24 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,11,34,1) 0%, transparent 100%)",
          }}
        />
        <div
          className="absolute bottom-0 inset-x-0 h-24 pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(to top, rgba(2,11,34,1) 0%, transparent 100%)",
          }}
        />

        {/* Pause indicator overlay */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-sm"
              style={{
                background: "rgba(0,8,28,0.88)",
                border: "1px solid rgba(255,200,0,0.5)",
                boxShadow: "0 0 20px rgba(255,200,0,0.2)",
              }}
            >
              <Pause
                className="w-3.5 h-3.5"
                style={{ color: "rgba(255,200,0,0.9)" }}
              />
              <span
                className="text-[9px] font-mono tracking-[0.3em] uppercase font-bold"
                style={{ color: "rgba(255,200,0,0.9)" }}
              >
                PAUSED
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer close */}
      <div
        className="relative z-10 shrink-0 flex items-center justify-center py-3 gap-3"
        style={{
          background: "rgba(0,5,18,0.7)",
          borderTop: "1px solid rgba(0,80,200,0.18)",
        }}
      >
        <button
          type="button"
          data-ocid="credits.pause_footer_button"
          onClick={handlePauseResume}
          className="px-5 py-2 rounded-sm font-mono text-[9px] tracking-[0.3em] uppercase transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          style={{
            background: "rgba(255,200,0,0.08)",
            border: "1px solid rgba(255,200,0,0.3)",
            color: "rgba(255,200,0,0.8)",
          }}
        >
          {paused ? (
            <Play className="w-3 h-3" />
          ) : (
            <Pause className="w-3 h-3" />
          )}
          {paused ? "RESUME" : "PAUSE"}
        </button>
        <button
          type="button"
          data-ocid="credits.close_after_credits"
          onClick={onClose}
          className="px-8 py-2 rounded-sm font-mono text-[9px] tracking-[0.3em] uppercase transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "rgba(0,80,220,0.12)",
            border: "1px solid rgba(0,160,255,0.35)",
            color: "rgba(0,213,255,0.85)",
          }}
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
