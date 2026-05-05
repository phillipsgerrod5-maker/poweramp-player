import { Film } from "lucide-react";
import { useRef, useState } from "react";

const STORY_LINES = [
  "POWERAMP PLAYER",
  "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "Engineered by",
  "GERROD",
  "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "Engineer",
  "Producer",
  "Designer",
  "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "Features",
  "Memory Commander Chip",
  "3,000 Virtual Memory Slots",
  "Thunder Battery — 120,000W",
  "Unified BassAmp",
  "Virtual + Digital + Analog + Tube",
  "80Hz Lowpass — Full Sub-Bass Response",
  "6-Layer Bass System",
  "Cheater Beater — 33Hz",
  "E-Quake Engine",
  "Epicenter Auto-Detection",
  "Soul Mode — Bass Harmonics in Mids",
  "Natural Bottom — Always Present",
  "6-Band Independent EQ",
  "Protection System — Gain Nodes Only",
  "4:1 Limiter — Clean Signal",
  "Mids — Browser Layer",
  "50W Bass Blocker Fuse",
  "Highs — Browser Layer",
  "50W Bass Blocker Fuse",
  "SRS 2022 Line Driver",
  "XM Processor",
  "Ultra Crystal Engine",
  "Atmosmasphere 3D Spatial",
  "Sound Beaming + VR Bubble",
  "Virtual Magnet Layer",
  "Universal Restore Testing",
  "7 DIY Kit Slots",
  "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "Audio flows through",
  "every node",
  "every amp",
  "every channel",
  "every feature",
  "Nothing bypassed.",
  "Nothing visual-only.",
  "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u00a9 2026 GERROD",
  "Built with Caffeine AI",
  "POWERAMP PLAYER",
];

export function StoryPage() {
  const [playing, setPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(-1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const narrateLines = () => {
    const text = [
      "PowerAmp Player. Engineered by Gerrod. Engineer, Producer, and Designer.",
      "Features: Memory Commander Chip, Three thousand virtual memory slots, Thunder Battery, One hundred and twenty thousand watts.",
      "Unified Bass Amplifier with Virtual, Digital, Analog, and Tube stages.",
      "Cheater Beater, E-Quake, Epicenter Auto-Detection, Soul Mode.",
      "Six-band independent equalizer. Protection system on gain nodes only.",
      "Mids and Highs on the browser layer with fifty-watt bass blocker fuses.",
      "Universal Restore testing on every channel.",
      "Nothing is visual only. Everything is wired.",
      "Copyright 2026. Gerrod. Built with Caffeine AI.",
    ].join(" ");

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const playStory = () => {
    if (playing) {
      speechSynthesis.cancel();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPlaying(false);
      setCurrentLine(-1);
      return;
    }

    setPlaying(true);
    narrateLines();

    // Scroll through lines
    let idx = 0;
    const advance = () => {
      if (idx >= STORY_LINES.length) {
        setPlaying(false);
        setCurrentLine(-1);
        return;
      }
      setCurrentLine(idx);
      idx++;
      timeoutRef.current = setTimeout(advance, 600);
    };
    advance();
  };

  return (
    <div className="story-page" data-ocid="story.page">
      <div className="story-stage">
        <div className="story-header">
          <Film size={28} className="story-icon" />
          <h1 className="story-title">POWERAMP PLAYER</h1>
          <p className="story-sub">Cinematic Credits</p>
        </div>

        {/* Text rises from center */}
        <div className="story-scroll" data-ocid="story.scroll">
          {STORY_LINES.map((line, i) => (
            <div
              key={`story-${i}-${line.slice(0, 8)}`}
              className={`story-line ${
                i === currentLine
                  ? "story-line-active"
                  : i < currentLine
                    ? "story-line-past"
                    : "story-line-future"
              }`}
              data-ocid={`story.line.${i + 1}`}
            >
              {line}
            </div>
          ))}
        </div>

        <button
          type="button"
          className={`story-play-btn ${playing ? "story-playing" : ""}`}
          onClick={playStory}
          data-ocid="story.play_button"
        >
          {playing ? "STOP STORY" : "PLAY STORY"}
        </button>
      </div>
    </div>
  );
}
