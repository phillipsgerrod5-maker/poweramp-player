import { getSharedAnalyser } from "@/hooks/usePlayer";
import { useEffect, useRef } from "react";

interface VisualizerBarsProps {
  isPlaying: boolean;
}

const BAR_COUNT = 32;
const BAR_IDS = Array.from(
  { length: BAR_COUNT },
  (_, i) => `vbar-${i.toString().padStart(2, "0")}`,
);

/** Electric blue (bottom) → cyan → purple (top) per position */
function barColorStr(i: number): string {
  const t = i / (BAR_COUNT - 1);
  const r = Math.round(t < 0.5 ? 0 : (t - 0.5) * 2 * 140);
  const g = Math.round(t < 0.5 ? 213 * (1 - t * 1.4) : 0);
  const b = Math.round(t < 0.5 ? 255 : 255 - (t - 0.5) * 2 * 60);
  return `rgb(${r},${g},${b})`;
}

function barGlowStr(i: number): string {
  const t = i / (BAR_COUNT - 1);
  if (t < 0.45) return "rgba(0,217,255,0.55)";
  if (t < 0.7) return "rgba(60,100,255,0.50)";
  return "rgba(153,69,255,0.55)";
}

export function VisualizerBars({ isPlaying }: VisualizerBarsProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      // Ambient gentle pulse when stopped
      let ambientFrame = 0;
      const ambientLoop = () => {
        ambientFrame++;
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const wave = Math.sin(ambientFrame * 0.04 + i * 0.5) * 0.5 + 0.5;
          const h = Math.round(wave * 5 + 3);
          bar.style.height = `${h}px`;
          bar.style.opacity = `${0.15 + wave * 0.1}`;
          bar.style.boxShadow = "none";
        });
        rafRef.current = requestAnimationFrame(ambientLoop);
      };
      rafRef.current = requestAnimationFrame(ambientLoop);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    const animate = () => {
      frameRef.current++;
      const analyser = getSharedAnalyser();

      if (analyser) {
        const binCount = analyser.frequencyBinCount;
        if (!dataRef.current || dataRef.current.length !== binCount) {
          dataRef.current = new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
        }
        analyser.getByteFrequencyData(dataRef.current);

        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          // Log-scale spread — lower frequencies take more visual space
          const binIdx = Math.floor((i / BAR_COUNT) ** 1.6 * (binCount - 1));
          const amplitude = dataRef.current![binIdx] ?? 0;
          const height = Math.round((amplitude / 255) * 58 + 4);
          const glow = amplitude / 255;
          bar.style.height = `${height}px`;
          bar.style.opacity = `${0.65 + glow * 0.35}`;
          bar.style.boxShadow =
            glow > 0.55
              ? `0 0 ${Math.round(glow * 12)}px ${barGlowStr(i)}, 0 -${Math.round(glow * 5)}px ${Math.round(glow * 8)}px ${barGlowStr(i)}`
              : `0 0 ${Math.round(glow * 6)}px ${barGlowStr(i)}`;
        });
      } else {
        // Sine fallback until analyser ready
        const f = frameRef.current;
        barsRef.current.forEach((bar, i) => {
          if (!bar) return;
          const wave = Math.sin(f * 0.07 + i * 0.45) * 0.5 + 0.5;
          const wave2 = Math.sin(f * 0.13 + i * 0.9 + 1.5) * 0.3 + 0.3;
          const noise = Math.random() * 0.18;
          const height = Math.round(
            (wave * 0.5 + wave2 * 0.3 + noise) * 50 + 5,
          );
          const glow = Math.min(height / 55, 1);
          bar.style.height = `${height}px`;
          bar.style.opacity = `${0.6 + glow * 0.3}`;
          bar.style.boxShadow = `0 0 ${Math.round(glow * 8)}px ${barGlowStr(i)}`;
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  return (
    <div
      className="flex items-end gap-[2px] h-16 w-full max-w-[320px] justify-center"
      aria-hidden="true"
      data-ocid="player.visualizer"
    >
      {BAR_IDS.map((id, i) => (
        <div
          key={id}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="flex-shrink-0 rounded-full transition-none"
          style={{
            width: "6px",
            height: "4px",
            background: barColorStr(i),
            opacity: 0.15,
            willChange: "height, opacity, box-shadow",
          }}
        />
      ))}
    </div>
  );
}
