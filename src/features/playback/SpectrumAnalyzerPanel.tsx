import { Activity, Pause } from "lucide-react";
import { useEffect, useRef } from "react";

type SpectrumAnalyzerPanelProps = {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  trackName: string;
  sourceLabel: string;
};

const frequencyLabels = [
  { hz: 20, label: "20" },
  { hz: 50, label: "50" },
  { hz: 100, label: "100" },
  { hz: 200, label: "200" },
  { hz: 500, label: "500" },
  { hz: 1_000, label: "1k" },
  { hz: 2_000, label: "2k" },
  { hz: 5_000, label: "5k" },
  { hz: 10_000, label: "10k" },
  { hz: 20_000, label: "20k" },
];

export function SpectrumAnalyzerPanel({
  analyser,
  isPlaying,
  trackName,
  sourceLabel,
}: SpectrumAnalyzerPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const values = new Float32Array(analyser.frequencyBinCount);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let reducedMotionTimer = 0;
    let stopped = false;

    const draw = () => {
      if (stopped) return;
      drawSpectrum(canvas, context, analyser, values);

      if (!isPlaying) return;
      if (reducedMotion) {
        reducedMotionTimer = window.setTimeout(() => {
          animationFrame = window.requestAnimationFrame(draw);
        }, 160);
      } else {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(reducedMotionTimer);
    };
  }, [analyser, isPlaying]);

  return (
    <section id="global-spectrum" className="relative z-30 h-56 shrink-0 border-t border-white/[0.08] bg-[#12110f]" aria-labelledby="spectrum-title">
      <header className="flex h-12 items-center justify-between gap-4 border-b border-white/[0.06] px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-orange-400/10 text-orange-300">
            <Activity className={isPlaying ? "size-4 animate-pulse" : "size-4"} />
          </span>
          <div className="min-w-0">
            <h2 id="spectrum-title" className="text-xs font-medium text-stone-200">Espectro en tiempo real</h2>
            <p className="truncate text-[0.62rem] text-stone-500">{trackName} · {sourceLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[0.62rem] text-stone-500">
          {!isPlaying ? <Pause className="size-3" /> : <span className="size-1.5 rounded-full bg-orange-400" />}
          {isPlaying ? "Analizando reproducción" : "Pausado"}
          <span className="hidden text-stone-600 sm:inline">· No modifica el audio</span>
        </div>
      </header>
      <div className="h-[calc(100%_-_3rem)] px-3 pb-2 pt-1">
        <canvas ref={canvasRef} className="size-full" role="img" aria-label={"Analizador de espectro de frecuencias para " + trackName} />
      </div>
    </section>
  );
}

function drawSpectrum(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  values: Float32Array<ArrayBuffer>,
) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(bounds.width * pixelRatio));
  const height = Math.max(1, Math.round(bounds.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const viewWidth = bounds.width;
  const viewHeight = bounds.height;
  context.clearRect(0, 0, viewWidth, viewHeight);

  const plot = { left: 38, top: 10, right: viewWidth - 12, bottom: viewHeight - 22 };
  if (plot.right <= plot.left || plot.bottom <= plot.top) return;

  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--color-orange-400").trim() || "#fb6a00";
  const grid = "rgba(255,255,255,0.065)";
  const label = "rgba(168,162,158,0.58)";

  context.font = "9px system-ui, sans-serif";
  context.textBaseline = "middle";
  context.lineWidth = 1;

  for (const decibels of [-20, -40, -60, -80]) {
    const y = decibelY(decibels, analyser, plot.top, plot.bottom);
    context.strokeStyle = grid;
    context.beginPath();
    context.moveTo(plot.left, y);
    context.lineTo(plot.right, y);
    context.stroke();
    context.fillStyle = label;
    context.textAlign = "right";
    context.fillText(decibels + " dBFS", plot.left - 7, y);
  }

  for (const marker of frequencyLabels) {
    const x = frequencyX(marker.hz, plot.left, plot.right);
    context.strokeStyle = grid;
    context.beginPath();
    context.moveTo(x, plot.top);
    context.lineTo(x, plot.bottom);
    context.stroke();
    context.fillStyle = label;
    context.textAlign = marker.hz === 20 ? "left" : marker.hz === 20_000 ? "right" : "center";
    context.fillText(marker.label, x, plot.bottom + 13);
  }

  analyser.getFloatFrequencyData(values);
  const nyquist = analyser.context.sampleRate / 2;
  const sampleCount = Math.max(80, Math.min(480, Math.round(plot.right - plot.left)));
  const points: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = index / Math.max(1, sampleCount - 1);
    const frequency = 20 * Math.pow(1_000, ratio);
    const bin = Math.min(values.length - 1, Math.max(0, Math.round((frequency / nyquist) * values.length)));
    points.push({
      x: plot.left + ratio * (plot.right - plot.left),
      y: decibelY(values[bin] ?? analyser.minDecibels, analyser, plot.top, plot.bottom),
    });
  }

  const fill = context.createLinearGradient(0, plot.top, 0, plot.bottom);
  fill.addColorStop(0, accent);
  fill.addColorStop(1, "rgba(0,0,0,0)");

  context.beginPath();
  context.moveTo(points[0]?.x ?? plot.left, plot.bottom);
  for (const point of points) context.lineTo(point.x, point.y);
  context.lineTo(points[points.length - 1]?.x ?? plot.right, plot.bottom);
  context.closePath();
  context.globalAlpha = 0.22;
  context.fillStyle = fill;
  context.fill();
  context.globalAlpha = 1;

  context.beginPath();
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  }
  context.strokeStyle = accent;
  context.lineWidth = 1.5;
  context.shadowColor = accent;
  context.shadowBlur = 6;
  context.stroke();
  context.shadowBlur = 0;
}

function frequencyX(frequency: number, left: number, right: number) {
  const ratio = Math.log10(frequency / 20) / Math.log10(1_000);
  return left + Math.min(1, Math.max(0, ratio)) * (right - left);
}

function decibelY(decibels: number, analyser: AnalyserNode, top: number, bottom: number) {
  const ratio = (decibels - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels);
  return bottom - Math.min(1, Math.max(0, ratio)) * (bottom - top);
}
