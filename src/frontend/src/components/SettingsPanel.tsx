import { CinematicCredits } from "@/components/CinematicCredits";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Starfield ────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: `star-${i}`,
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

const WAVEFORM_BARS = Array.from({ length: 16 }, (_, i) => ({
  id: `wave-${i}`,
  height: 25 + (i % 5) * 14,
  opacity: 0.25 + (i % 4) * 0.18,
  duration: 0.55 + (i % 5) * 0.12,
  delay: i * 0.055,
}));

type Phase = "idle" | "music" | "narration_credits" | "done";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NARRATION_TEXT = `POWERAMP PLAYER.

Created, Designed, and Engineered by Gerrod. Engineer — Product Designer.

This system was born from one mind. Every feature, every connection, every decision came directly from Gerrod's imagination. AI only built what Gerrod described.

THE POWER CHAIN. Seven hundred fifty thousand watts of pure power. Thirty fuses at fifteen thousand watts each. Virtual Battery Charger: fifteen thousand times eighty-six. Virtual batteries, virtual power chain. Combined with real browser power simultaneously. The Milliwatt Converter multiplies incoming signal to eighty million signal strength. All wired direct. Slot to slot. Four gauge.

THE COMBINED AMP. Twelve thousand watts peak. Six thousand watts RMS. Three amplifiers combined as one unit. The Virtual Amp. The Digital Stimulation Amp. The Analog Tube Amp. Hidden Line Driver inside — signal clean booster hitter — treats every frequency equally.

MASTER POWER SLIDER. Zero to one hundred percent. One slider controls all system power. The slider is audible. The difference is real. Protection system stays at full strength regardless.

THE HIGH AMP. Every good sound feature routes through it. No bass features. Never. Twenty-thirty times eighty-six separator wall — highs and bass never mix. Commander Direct Hit inside always.

SRS HD 9.0 SMART CHIP SOUND SYSTEM. Natural, beautiful sound. Mid-bass excursion — pumping, breathing, physical. Protected by Commander and all three Stabilizer sliders. Every instrument elevated to its highest class.

SRS FILTER FOR 8 OHMS. The sound character of two-to-four ohms converted to sound filters. Punch, presence, fast response. Delivered to 8 ohms. Eight ohms stays eight ohms electrically. No extra power drawn. Nobody has done this before.

STACKED FILTERS. Mids: Presence, Body, Clarity. Highs: Air, Detail, Brilliance. Stack strength fifty million times eighty-six. Commander embedded. Nothing gets pushed back.

THE PROTECTION SYSTEM. Stabilizer at fifty million times eighty-six. Three real sliders. Zero distortion target. Commander Direct Hit: fifty billion times eighty-six. Embedded in every channel. Every engine. Every module.

THE MEMORY COMMANDER. Ninety thousand megabytes of system memory. Twenty-five sensors. Every volume step from one to seven thousand — monitored. Ninety-nine point zero fix rate.

RUBBER COTTON FIBER SOUND ENGINE. Real. Dedicated. Connected. Its own audio engine, API, HTML, and blockchain. Warm natural cotton-fiber resonance. On/Off toggle. Nothing decorative.

TWENTY-THIRTY TIMES EIGHTY-SIX SECTIONS. Each problem gets its own dedicated section. Nothing stacked. Everything plays nice.

NATURAL BOTTOM. Not a button. Always there. Under voices. Under bass. The floor the sound rests on.

This system is beyond the Devialet Gold Phantom in power, sound field, and features.

All features originated from one engineer's mind. All connections are real. All sliders are wired. Nothing in this system is decoration.

Gerrod — Engineer, Product Designer. Built on Caffeine AI.

POWERAMP PLAYER.`;

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [showCredits, setShowCredits] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscListRef = useRef<OscillatorNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const narrationStartedRef = useRef(false);

  const stopAudio = useCallback(() => {
    for (const o of oscListRef.current) {
      try {
        o.stop();
      } catch (_) {
        /* ignore */
      }
    }
    oscListRef.current = [];
    if (gainRef.current) {
      try {
        gainRef.current.disconnect();
      } catch (_) {
        /* ignore */
      }
      gainRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (_) {
        /* ignore */
      }
      audioCtxRef.current = null;
    }
  }, []);

  const stopNarration = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopAudio();
    stopNarration();
    clearTimers();
    setPhase("idle");
    setShowCredits(false);
    startedRef.current = false;
    narrationStartedRef.current = false;
    onClose();
  }, [stopAudio, stopNarration, clearTimers, onClose]);

  const playInstrumental = useCallback(() => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.0);
      masterGain.gain.setValueAtTime(0.06, ctx.currentTime + 3.0);
      masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4.5);
      masterGain.connect(ctx.destination);
      gainRef.current = masterGain;

      const freqs = [220, 277, 330, 440, 165];
      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        g.gain.value = freq === 220 || freq === 165 ? 1.2 : 0.8;
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        oscListRef.current.push(osc);
      }
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5.0;
      lfoGain.gain.value = 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(masterGain.gain);
      lfo.start();
      oscListRef.current.push(lfo);
    } catch (_) {
      /* ignore */
    }
  }, []);

  const startNarration = useCallback(() => {
    if (narrationStartedRef.current) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    narrationStartedRef.current = true;
    stopNarration();
    const utter = new SpeechSynthesisUtterance(NARRATION_TEXT);
    utter.rate = 0.84;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) => v.lang === "en-US" && v.name.toLowerCase().includes("female"),
      ) ||
      voices.find((v) => v.lang === "en-US") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;
    if (preferred) utter.voice = preferred;
    utter.onend = () => setPhase("done");
    window.speechSynthesis.speak(utter);
  }, [stopNarration]);

  useEffect(() => {
    if (!isOpen) {
      startedRef.current = false;
      narrationStartedRef.current = false;
      stopAudio();
      stopNarration();
      clearTimers();
      setPhase("idle");
      setShowCredits(false);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    setPhase("music");
    playInstrumental();

    phaseTimerRef.current = setTimeout(() => {
      stopAudio();
      setPhase("narration_credits");
      setShowCredits(true);
      setTimeout(() => startNarration(), 350);
    }, 5000);

    return () => {
      clearTimers();
    };
  }, [
    isOpen,
    playInstrumental,
    stopAudio,
    stopNarration,
    clearTimers,
    startNarration,
  ]);

  if (!isOpen) return null;

  // If credits overlay is showing, render that
  if (showCredits) {
    return <CinematicCredits isOpen={showCredits} onClose={handleClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      data-ocid="settings.panel"
      style={{
        background:
          "linear-gradient(160deg, #020b22 0%, #030d2e 20%, #040e38 50%, #030b2a 80%, #020920 100%)",
      }}
    >
      {/* Ambient shimmer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 85% 40% at 15% 10%, rgba(0,213,255,0.13) 0%, transparent 60%),
            radial-gradient(ellipse 65% 55% at 82% 88%, rgba(153,69,255,0.11) 0%, transparent 55%)
          `,
        }}
      />

      {/* Starfield */}
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
        className="relative z-10 shrink-0 flex items-center justify-between px-5 py-3.5"
        style={{
          background: "rgba(0,7,22,0.75)",
          borderBottom: "1px solid rgba(0,150,255,0.3)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div>
          <h2
            className="text-sm font-mono font-black tracking-[0.32em] uppercase"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,213,255,1), rgba(153,69,255,0.9))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 12px rgba(0,213,255,0.5))",
            }}
          >
            THE STORY OF POWERAMP PLAYER
          </h2>
          <p
            className="text-[8px] font-mono tracking-[0.22em] mt-0.5"
            style={{ color: "rgba(0,150,255,0.55)" }}
          >
            {phase === "music" && "♪ INSTRUMENTAL INTRO — SETTING THE MOOD…"}
            {phase === "narration_credits" &&
              "▶ NARRATING — GERROD'S FULL STORY"}
            {phase === "done" &&
              "✓ CREDITS COMPLETE — GERROD'S POWERAMP PLAYER"}
            {phase === "idle" && "INITIALIZING…"}
          </p>
        </div>
        <button
          type="button"
          data-ocid="settings.close_button"
          onClick={handleClose}
          aria-label="Close settings"
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
          style={{
            background: "rgba(255,60,60,0.10)",
            border: "1px solid rgba(255,80,80,0.40)",
            color: "rgba(255,130,130,0.9)",
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Instrumental phase */}
      {phase === "music" && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8">
          <div className="relative">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,25,70,0.55)",
                border: "2px solid rgba(0,180,255,0.5)",
                boxShadow:
                  "0 0 44px rgba(0,150,255,0.5), 0 0 88px rgba(80,0,200,0.3)",
                animation: "pulse 1.8s ease-in-out infinite",
              }}
            >
              <span
                style={{
                  fontSize: 42,
                  animation: "note-float 2s ease-in-out infinite",
                }}
              >
                ♪
              </span>
            </div>
          </div>
          <div className="text-center">
            <p
              className="text-lg font-mono font-black tracking-[0.45em] uppercase mb-2"
              style={{
                color: "rgba(0,213,255,0.85)",
                textShadow: "0 0 20px rgba(0,213,255,0.5)",
              }}
            >
              ♪ POWERAMP PLAYER
            </p>
            <p
              className="text-[10px] font-mono tracking-[0.3em] uppercase"
              style={{ color: "rgba(0,150,255,0.45)" }}
            >
              INSTRUMENTAL INTRO
            </p>
          </div>
          <div className="flex items-end gap-1 h-14">
            {WAVEFORM_BARS.map((bar) => (
              <div
                key={bar.id}
                className="w-2 rounded-t-sm"
                style={{
                  height: `${bar.height}%`,
                  background: `linear-gradient(to top, rgba(0,150,255,${bar.opacity}), rgba(153,69,255,${bar.opacity * 0.7}))`,
                  animation: `pulse ${bar.duration}s ease-in-out infinite`,
                  animationDelay: `${bar.delay}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
