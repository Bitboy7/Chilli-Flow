import {
  Activity, ExternalLink, FileAudio, FilePlus2, Files, ListPlus, LoaderCircle, Play, Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  analyzeProjectAudio, listProjectFiles, openProjectFile, playableTrack,
  removeProjectFile, selectProjectFiles, setProjectPreview,
  setProjectFileCategory,
} from "../services/project-service";
import { usePlaybackStore } from "../stores/playback-store";
import { useToastStore } from "../stores/toast-store";
import type { AudioAnalysis, ProjectFile, ProjectFileCategory } from "../types/projects";
import { errorMessage } from "../utils/errors";
import type { ProjectWorkspaceContext } from "./ProjectWorkspacePage";

const categories: { value: ProjectFileCategory; label: string }[] = [
  { value: "stem", label: "Stem" }, { value: "mix", label: "Mix" },
  { value: "master", label: "Master" }, { value: "preview", label: "Preview" },
  { value: "reference", label: "Reference" }, { value: "artwork", label: "Artwork" },
  { value: "midi", label: "MIDI" }, { value: "preset", label: "Preset" },
  { value: "sample", label: "Sample" }, { value: "other", label: "Other" },
];
const audioTypes = new Set(["wav", "mp3", "flac", "ogg"]);

export function ProjectFilesPage() {
  const { project } = useOutletContext<ProjectWorkspaceContext>();
  const projectId = project.id;
  const pushToast = useToastStore((state) => state.push);
  const playTrack = usePlaybackStore((state) => state.playTrack);
  const addToQueue = usePlaybackStore((state) => state.addToQueue);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [category, setCategory] = useState<ProjectFileCategory>("stem");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Record<number, AudioAnalysis>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const associated = await listProjectFiles(projectId);
      setFiles(associated);
      setPreviewId(associated.find((file) => file.filePath === project.previewPath)?.id ?? null);
      setError(null);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setIsLoading(false); }
  }, [project.previewPath, projectId]);

  useEffect(() => { void load(); }, [load]);

  const audioFiles = useMemo(() => files.filter((file) => audioTypes.has(file.fileType.toLowerCase()) && !file.isMissing), [files]);
  const selectedPreview = files.find((file) => file.id === previewId) ?? null;
  const playbackContext = useMemo(
    () => audioFiles.map((file) => playableTrack(project, file)),
    [audioFiles, project],
  );

  const addFiles = async () => {
    setBusy(true);
    try { setFiles(await selectProjectFiles(projectId, category)); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudieron asociar los archivos", description: errorMessage(cause) }); }
    finally { setBusy(false); }
  };

  const remove = async (file: ProjectFile) => {
    if (!window.confirm("¿Quitar \"" + file.fileName + "\" del proyecto? El archivo físico no se eliminará.")) return;
    setBusy(true);
    try {
      await removeProjectFile(projectId, file.id);
      if (previewId === file.id) setPreviewId(null);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      pushToast({ kind: "success", title: "Asociación eliminada", description: "El archivo físico permanece intacto." });
    } catch (cause) { pushToast({ kind: "error", title: "No se pudo quitar el archivo", description: errorMessage(cause) }); }
    finally { setBusy(false); }
  };

  const choosePreview = async (value: string) => {
    const fileId = value ? Number(value) : null;
    setBusy(true);
    try {
      await setProjectPreview(projectId, fileId);
      setPreviewId(fileId);
      pushToast({ kind: "success", title: fileId ? "Preview seleccionado" : "Preview desactivado" });
    } catch (cause) { pushToast({ kind: "error", title: "No se pudo cambiar el preview", description: errorMessage(cause) }); }
    finally { setBusy(false); }
  };

  const open = async (file: ProjectFile) => {
    try { await openProjectFile(projectId, file.id); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo abrir el archivo", description: errorMessage(cause) }); }
  };

  const reclassify = async (file: ProjectFile, nextCategory: ProjectFileCategory) => {
    setBusy(true);
    try { setFiles(await setProjectFileCategory(projectId, file.id, nextCategory)); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo reclasificar", description: errorMessage(cause) }); }
    finally { setBusy(false); }
  };

  const analyze = async (file: ProjectFile) => {
    setAnalyzingId(file.id);
    try {
      const result = await analyzeProjectAudio(projectId, file.id);
      setAnalyses((current) => ({ ...current, [file.id]: result }));
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo analizar el audio", description: errorMessage(cause) });
    } finally {
      setAnalyzingId(null);
    }
  };

  if (isLoading) return <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-300" /></div>;
  if (error) return <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-100/70">{error}</div>;

  return (
    <div className="pt-5">
      <header><p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-400/70">Organización sin mover archivos</p><h2 className="mt-2 text-xl font-semibold text-stone-100">Audio y archivos</h2><p className="mt-2 text-sm text-stone-500">Las rutas se guardan en SQLite; Chilli Beat no copia, mueve ni elimina los originales.</p></header>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-medium text-stone-300">Preview de audio</h2><select value={previewId ?? ""} disabled={busy} onChange={(e) => void choosePreview(e.currentTarget.value)} className="h-9 max-w-64 rounded-xl border border-white/[0.08] bg-[#1b1917] px-3 text-xs text-stone-300 outline-none"><option value="">Sin preview</option>{audioFiles.map((file) => <option key={file.id} value={file.id}>{file.fileName}</option>)}</select></div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.018] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-stone-300">{selectedPreview?.fileName ?? "No hay preview seleccionado"}</p>
            <p className="mt-1 text-[0.65rem] text-stone-600">La reproducción continúa mientras navegas por Chilli Beat.</p>
          </div>
          <button
            type="button"
            disabled={!selectedPreview || busy}
            onClick={() => selectedPreview && playTrack(playableTrack(project, selectedPreview), playbackContext)}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3.5 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-35"
          >
            <Play className="size-3.5 fill-current" /> Reproducir
          </button>
        </div>
        <p className="mt-2 text-[0.65rem] text-stone-600">WAV, MP3, FLAC y OGG. Se reproduce el archivo original sin conversión.</p>
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-sm font-medium text-stone-300"><Files className="size-4 text-orange-300" /> Archivos asociados</h2><p className="mt-1 text-xs text-stone-600">{files.length} {files.length === 1 ? "archivo" : "archivos"}</p></div>
          <div className="flex gap-2"><select value={category} onChange={(e) => setCategory(e.currentTarget.value as ProjectFileCategory)} disabled={busy} className="h-10 rounded-xl border border-white/[0.08] bg-[#1b1917] px-3 text-xs text-stone-300 outline-none">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button type="button" disabled={busy} onClick={() => void addFiles()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-40">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />} Agregar archivos</button></div>
        </div>

        {files.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
            <Files className="mx-auto size-7 text-stone-700" />
            <p className="mt-3 text-sm text-stone-500">Todavía no hay archivos asociados.</p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="divide-y divide-white/[0.055]">
              {files.map((file) => {
                const canPlay = audioTypes.has(file.fileType.toLowerCase()) && !file.isMissing;
                const track = canPlay ? playableTrack(project, file) : null;
                return (
                  <article key={file.id} className="flex flex-wrap items-center gap-3 bg-white/[0.015] px-4 py-3 hover:bg-white/[0.03]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.04]"><FileAudio className="size-4 text-stone-500" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm text-stone-300">{file.fileName}</p>
                        {file.isMissing ? <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-[0.6rem] text-red-300">No encontrado</span> : null}
                      </div>
                      <p className="mt-1 truncate text-[0.62rem] text-stone-600">{file.fileType || "sin extensión"} · {formatBytes(file.fileSize)}</p>
                    </div>
                    {canPlay && track ? (
                      <>
                        <button type="button" onClick={() => playTrack(track, playbackContext)} title="Reproducir" className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-orange-400/10 hover:text-orange-300"><Play className="size-3.5 fill-current" /></button>
                        <button type="button" onClick={() => addToQueue(track)} title="Añadir a la cola" className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-white/5 hover:text-stone-200"><ListPlus className="size-4" /></button>
                        <button type="button" disabled={analyzingId !== null} onClick={() => void analyze(file)} title="Analizar audio" className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-white/5 hover:text-stone-200 disabled:opacity-35">
                          {analyzingId === file.id ? <LoaderCircle className="size-4 animate-spin text-orange-300" /> : <Activity className="size-4" />}
                        </button>
                      </>
                    ) : null}
                    <select value={file.category} disabled={busy} onChange={(event) => void reclassify(file, event.currentTarget.value as ProjectFileCategory)} aria-label={"Categoría de " + file.fileName} className="h-8 rounded-lg border border-white/[0.07] bg-[#1b1917] px-2 text-[0.65rem] text-stone-400 outline-none">
                      {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <button type="button" disabled={file.isMissing || busy} onClick={() => void open(file)} title="Abrir archivo" className="grid size-8 place-items-center rounded-lg text-stone-600 hover:bg-white/5 hover:text-stone-300 disabled:opacity-30"><ExternalLink className="size-4" /></button>
                    <button type="button" disabled={busy} onClick={() => void remove(file)} title="Quitar asociación" className="grid size-8 place-items-center rounded-lg text-stone-600 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-30"><Trash2 className="size-4" /></button>
                    {analyses[file.id] ? <AudioMetrics analysis={analyses[file.id]} /> : null}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatBytes(bytes: number) { if (bytes < 1024) return bytes + " B"; if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB"; if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + " MB"; return (bytes / 1024 ** 3).toFixed(2) + " GB"; }

function AudioMetrics({ analysis }: { analysis: AudioAnalysis }) {
  const metrics = [
    ["LUFS-I", formatMetric(analysis.integratedLufs, " LUFS")],
    ["LRA", formatMetric(analysis.loudnessRangeLu, " LU")],
    ["True peak", formatMetric(analysis.truePeakDbfs, " dBTP")],
    ["Formato", analysis.sampleRate / 1000 + " kHz · " + (analysis.bitDepth ?? "—") + " bit"],
    ["Canales", analysis.channels === 1 ? "Mono" : analysis.channels === 2 ? "Estéreo" : String(analysis.channels)],
    ["Duración", formatDuration(analysis.durationSeconds)],
  ];
  return (
    <div className="ml-12 grid basis-full gap-3 border-t border-white/[0.055] pt-3 sm:grid-cols-[minmax(12rem,1fr)_2fr]">
      <div className="flex h-10 items-end gap-px overflow-hidden rounded-lg bg-black/15 px-2 py-1.5" aria-label="Forma de onda resumida">
        {analysis.waveform.map((peak, index) => <span key={index} className="min-w-px flex-1 rounded-sm bg-orange-300/45" style={{ height: Math.max(8, peak * 100) + "%" }} />)}
      </div>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
        {metrics.map(([label, value]) => <div key={label}><dt className="text-[0.55rem] uppercase tracking-wide text-stone-600">{label}</dt><dd className="mt-0.5 text-[0.68rem] text-stone-300">{value}</dd></div>)}
      </dl>
    </div>
  );
}

function formatMetric(value: number | null, suffix: string) { return value === null ? "—" : value.toFixed(1) + suffix; }
function formatDuration(seconds: number) { return Math.floor(seconds / 60) + ":" + Math.floor(seconds % 60).toString().padStart(2, "0"); }
