import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AudioPreviewPlayer({ source, title }: { source: string | null; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    setPlaying(false); setCurrent(0); setDuration(0);
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.load(); }
  }, [source]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (audio.paused) await audio.play(); else audio.pause();
  };

  return (
    <div className="rounded-2xl border border-orange-400/15 bg-orange-400/[0.035] p-4">
      <audio ref={audioRef} src={source ?? undefined} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)} onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void toggle()} disabled={!source} className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-500 text-stone-950 disabled:cursor-not-allowed disabled:opacity-35" aria-label={playing ? "Pausar" : "Reproducir"}>{playing ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}</button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-stone-300">{source ? title : "Selecciona un preview"}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-9 text-[0.62rem] text-stone-600">{formatTime(current)}</span>
            <input type="range" min={0} max={duration || 0} step="0.01" value={Math.min(current, duration || 0)} disabled={!source}
              onChange={(e) => { const value = Number(e.currentTarget.value); if (audioRef.current) audioRef.current.currentTime = value; setCurrent(value); }} className="h-1 min-w-0 flex-1 accent-orange-400" aria-label="Progreso" />
            <span className="w-9 text-right text-[0.62rem] text-stone-600">{formatTime(duration)}</span>
          </div>
        </div>
        <Volume2 className="size-4 text-stone-600" />
        <input type="range" min={0} max={1} step="0.01" value={volume} onChange={(e) => { const value = Number(e.currentTarget.value); setVolume(value); if (audioRef.current) audioRef.current.volume = value; }} className="h-1 w-20 accent-orange-400" aria-label="Volumen" />
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return minutes + ":" + Math.floor(seconds % 60).toString().padStart(2, "0");
}
