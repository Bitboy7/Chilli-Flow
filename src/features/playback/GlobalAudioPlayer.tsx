import {
  ChevronDown, ChevronLeft, ChevronRight, ListMusic, Music2, Pause, Play,
  Repeat2, Shuffle, Trash2, Volume2, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getPlaybackSession, savePlaybackSession } from "../../services/playback-service";
import { projectAudioUrl } from "../../services/project-service";
import { playbackSessionInput, usePlaybackStore } from "../../stores/playback-store";
import { useToastStore } from "../../stores/toast-store";
import { errorMessage } from "../../utils/errors";

export function GlobalAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const pushToast = useToastStore((state) => state.push);
  const state = usePlaybackStore();
  const currentTrack = state.currentIndex === null ? null : state.queue[state.currentIndex] ?? null;

  useEffect(() => {
    let active = true;
    void getPlaybackSession()
      .then((session) => { if (active) state.restore(session); })
      .catch(() => { if (active) state.markRestored(); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    audioRef.current?.pause();
    setAudioUrl(null);
    if (!currentTrack || currentTrack.isMissing) return;
    void projectAudioUrl(currentTrack.projectId, currentTrack.fileId)
      .then((url) => { if (active) setAudioUrl(url); })
      .catch((cause) => {
        if (active) {
          state.setPlaying(false);
          pushToast({ kind: "error", title: "No se pudo cargar el audio", description: errorMessage(cause) });
        }
      });
    return () => { active = false; };
  }, [currentTrack?.fileId, currentTrack?.projectId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (state.isPlaying) {
      void audio.play().catch((cause) => {
        state.setPlaying(false);
        pushToast({ kind: "error", title: "No se pudo reproducir", description: errorMessage(cause) });
      });
    } else {
      audio.pause();
    }
  }, [audioUrl, state.isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = state.volume;
  }, [state.volume]);

  useEffect(() => {
    if (!state.isRestored) return;
    const timer = window.setTimeout(() => {
      void savePlaybackSession(playbackSessionInput()).catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state.currentIndex, state.isRestored, state.queue, state.repeatMode, state.shuffle, state.volume]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (usePlaybackStore.getState().isRestored) {
        void savePlaybackSession(playbackSessionInput()).catch(() => undefined);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  if (!currentTrack) return null;

  const seek = (seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
    state.setCurrentTime(seconds);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        preload="metadata"
        onPlay={() => state.setPlaying(true)}
        onPause={() => state.setPlaying(false)}
        onTimeUpdate={(event) => state.setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
          state.setDuration(duration);
          event.currentTarget.currentTime = Math.min(state.currentTime, duration || 0);
        }}
        onEnded={() => {
          if (state.repeatMode === "one") {
            seek(0);
            void audioRef.current?.play();
          } else {
            state.next();
          }
        }}
      />

      {state.isQueueOpen ? (
        <aside className="fixed bottom-[4.75rem] right-3 z-40 flex max-h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#1b1917] shadow-[0_8px_20px_rgba(0,0,0,0.45)]" aria-label="Cola de reproducción">
          <header className="flex h-12 items-center justify-between border-b border-white/[0.07] px-4">
            <div><p className="text-sm font-medium text-stone-200">Cola</p><p className="text-[0.62rem] text-stone-500">{state.queue.length} archivos</p></div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={state.clearQueue} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-red-400/10 hover:text-red-300" aria-label="Vaciar cola"><Trash2 className="size-3.5" /></button>
              <button type="button" onClick={state.toggleQueue} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-white/5 hover:text-stone-200" aria-label="Cerrar cola"><X className="size-4" /></button>
            </div>
          </header>
          <div className="min-h-0 overflow-y-auto p-2">
            {state.queue.map((track, index) => (
              <div key={track.projectId + ":" + track.fileId} className={["group flex items-center gap-2 rounded-lg px-2 py-2", index === state.currentIndex ? "bg-orange-400/[0.08]" : "hover:bg-white/[0.035]"].join(" ")}>
                <button type="button" onClick={() => state.playTrack(track, state.queue)} className="min-w-0 flex-1 text-left">
                  <p className={["truncate text-xs", index === state.currentIndex ? "text-orange-200" : "text-stone-300"].join(" ")}>{track.fileName}</p>
                  <p className="mt-0.5 truncate text-[0.6rem] text-stone-600">{track.projectName} · {track.category}</p>
                </button>
                <div className="flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <button type="button" disabled={index === 0} onClick={() => state.moveInQueue(index, index - 1)} className="grid size-7 place-items-center text-stone-500 disabled:opacity-20" aria-label="Subir en la cola"><ChevronDown className="size-3.5 rotate-180" /></button>
                  <button type="button" disabled={index === state.queue.length - 1} onClick={() => state.moveInQueue(index, index + 1)} className="grid size-7 place-items-center text-stone-500 disabled:opacity-20" aria-label="Bajar en la cola"><ChevronDown className="size-3.5" /></button>
                  <button type="button" onClick={() => state.removeAt(index)} className="grid size-7 place-items-center text-stone-500 hover:text-red-300" aria-label={"Quitar " + track.fileName}><X className="size-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      ) : null}

      <footer className="relative z-30 grid h-[4.25rem] shrink-0 grid-cols-[minmax(0,1fr)_minmax(18rem,2fr)_minmax(0,1fr)] items-center gap-4 border-t border-white/[0.08] bg-[#12110f] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-300"><Music2 className="size-4" /></span>
          <div className="min-w-0"><p className="truncate text-xs font-medium text-stone-200">{currentTrack.fileName}</p><p className="mt-0.5 truncate text-[0.62rem] text-stone-500">{currentTrack.projectName}</p></div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-center gap-2">
            <PlayerButton active={state.shuffle} label="Aleatorio" onClick={state.toggleShuffle}><Shuffle className="size-3.5" /></PlayerButton>
            <PlayerButton label="Anterior" onClick={() => state.currentTime > 3 ? seek(0) : state.previous()}><ChevronLeft className="size-4" /></PlayerButton>
            <button type="button" disabled={!audioUrl} onClick={() => state.setPlaying(!state.isPlaying)} className="grid size-9 place-items-center rounded-full bg-orange-500 text-stone-950 hover:bg-orange-400 disabled:opacity-35" aria-label={state.isPlaying ? "Pausar" : "Reproducir"}>
              {state.isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
            </button>
            <PlayerButton label="Siguiente" onClick={state.next}><ChevronRight className="size-4" /></PlayerButton>
            <PlayerButton active={state.repeatMode !== "off"} label={"Repetición: " + state.repeatMode} onClick={state.cycleRepeat}><Repeat2 className="size-3.5" />{state.repeatMode === "one" ? <span className="absolute text-[0.5rem] font-bold">1</span> : null}</PlayerButton>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="w-9 text-right text-[0.58rem] text-stone-600">{formatTime(state.currentTime)}</span>
            <input type="range" min={0} max={state.duration || 0} step="0.01" value={Math.min(state.currentTime, state.duration || 0)} disabled={!audioUrl} onChange={(event) => seek(Number(event.currentTarget.value))} className="h-1 min-w-0 flex-1 accent-orange-500" aria-label="Progreso" />
            <span className="w-9 text-[0.58rem] text-stone-600">{formatTime(state.duration)}</span>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <button type="button" onClick={state.toggleQueue} className={["inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs", state.isQueueOpen ? "bg-orange-500/10 text-orange-200" : "text-stone-500 hover:bg-white/5 hover:text-stone-200"].join(" ")} aria-expanded={state.isQueueOpen}><ListMusic className="size-3.5" /> Cola</button>
          <Volume2 className="size-3.5 shrink-0 text-stone-600" />
          <input type="range" min={0} max={1} step="0.01" value={state.volume} onChange={(event) => state.setVolume(Number(event.currentTarget.value))} className="h-1 w-20 accent-orange-500" aria-label="Volumen" />
        </div>
      </footer>
    </>
  );
}

function PlayerButton({ active = false, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={["relative grid size-8 place-items-center rounded-lg", active ? "text-orange-300" : "text-stone-500 hover:text-stone-200"].join(" ")} aria-label={label} title={label}>{children}</button>;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return Math.floor(seconds / 60) + ":" + Math.floor(seconds % 60).toString().padStart(2, "0");
}
