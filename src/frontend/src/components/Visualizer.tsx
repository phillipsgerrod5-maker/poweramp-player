import { useEffect, useRef } from "react";

interface VisualizerProps {
  getAnalyserData: () => Uint8Array;
  isPlaying: boolean;
}

export function Visualizer({ getAnalyserData, isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const data = getAnalyserData();
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      const barCount = 12;
      const barW = Math.floor(W / barCount) - 1;

      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * data.length);
        const val = isPlaying ? data[idx] / 255 : Math.random() * 0.1 + 0.02;
        const barH = Math.max(2, val * H);

        const grad = ctx.createLinearGradient(0, H - barH, 0, H);
        grad.addColorStop(0, "#00c8ff");
        grad.addColorStop(1, "#0050c8");

        ctx.fillStyle = grad;
        ctx.fillRect(i * (barW + 1), H - barH, barW, barH);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getAnalyserData, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={80}
      className="visualizer-canvas"
      aria-label="Audio visualizer"
    />
  );
}
