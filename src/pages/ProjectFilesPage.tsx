import {
  Activity, Check, Circle, CircleCheck, ExternalLink, EyeOff, FileAudio, FilePlus2, Files, FolderSearch, FolderTree,
  ListPlus, LoaderCircle, Play, RefreshCw, Trash2, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  analyzeProjectAudio, applyProjectFolderSetup, openProjectFile, playableTrack,
  previewProjectFolderSetup, removeProjectFile, selectProjectFiles, setProjectFileCategory,
  setProjectPreview, syncProjectFiles,
} from "../services/project-service";
import { usePlaybackStore } from "../stores/playback-store";
import { useToastStore } from "../stores/toast-store";
import type { AudioAnalysis, FolderSetupPlan, ProjectFile, ProjectFileCategory } from "../types/projects";
import { errorMessage } from "../utils/errors";
import type { ProjectWorkspaceContext } from "./ProjectWorkspacePage";

const categories: { value: ProjectFileCategory; label: string }[] = [
  { value: "stem", label: "Stem" }, { value: "mix", label: "Mix" },
  { value: "master", label: "Master" },
  { value: "reference", label: "Reference" }, { value: "artwork", label: "Artwork" },
  { value: "midi", label: "MIDI" }, { value: "preset", label: "Preset" },
  { value: "sample", label: "Audio del proyecto" }, { value: "other", label: "Otro" },
];
const audioTypes = new Set(["wav", "mp3", "flac", "ogg"]);

type FileGroup = { label: string; discovered: boolean; files: ProjectFile[] };

export function ProjectFilesPage() {
  const { project, setProject } = useOutletContext<ProjectWorkspaceContext>();
  const projectId = project.id;
  const pushToast = useToastStore((state) => state.push);
  const playTrack = usePlaybackStore((state) => state.playTrack);
  const addToQueue = usePlaybackStore((state) => state.addToQueue);
  const setComparisonTrack = usePlaybackStore((state) => state.setComparisonTrack);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [category, setCategory] = useState<ProjectFileCategory>("stem");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scannedFolders, setScannedFolders] = useState(0);
  const [lastDiscoveredCount, setLastDiscoveredCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Record<number, AudioAnalysis>>({});
  const [activeAnalysisId, setActiveAnalysisId] = useState<number | null>(null);
  const [analysisErrors, setAnalysisErrors] = useState<Record<number, string>>({});
  const [folderPlan, setFolderPlan] = useState<FolderSetupPlan | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncInFlight = useRef(false);

  const synchronize = useCallback(async (notify: boolean) => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setIsSyncing(true);
    try {
      const result = await syncProjectFiles(projectId);
      setFiles(result.files);
      setScannedFolders(result.scannedFolders);
      setLastDiscoveredCount(result.discoveredCount);
      setPreviewId((current) => {
        if (!notify) return result.files.find((file) => file.filePath === project.previewPath)?.id ?? null;
        return current !== null && result.files.some((file) => file.id === current) ? current : null;
      });
      setError(null);
      if (notify && result.discoveredCount > 0) {
        pushToast({
          kind: "success",
          title: result.discoveredCount === 1 ? "Nuevo audio encontrado" : "Nuevos audios encontrados",
          description: `${result.discoveredCount} ${result.discoveredCount === 1 ? "archivo fue añadido" : "archivos fueron añadidos"} desde las carpetas del proyecto.`,
        });
      }
    } catch (cause) {
      const message = errorMessage(cause);
      if (notify) {
        pushToast({ kind: "error", title: "No se pudieron actualizar los archivos", description: message });
      } else {
        setError(message);
      }
    } finally {
      syncInFlight.current = false;
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [project.previewPath, projectId, pushToast]);

  useEffect(() => { void synchronize(false); }, [synchronize]);
  useEffect(() => {
    const handleFocus = () => { void synchronize(true); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [synchronize]);

  const audioFiles = useMemo(
    () => files.filter((file) => audioTypes.has(file.fileType.toLowerCase()) && !file.isMissing),
    [files],
  );
  const fileGroups = useMemo<FileGroup[]>(() => {
    const groups = new Map<string, FileGroup>();
    for (const file of files) {
      const discovered = file.origin === "discovered";
      const label = discovered ? file.sourceLabel ?? "Detectados automáticamente" : "Añadidos manualmente";
      const group = groups.get(label) ?? { label, discovered, files: [] };
      group.files.push(file);
      groups.set(label, group);
    }
    return Array.from(groups.values()).sort((left, right) => {
      if (left.discovered !== right.discovered) return left.discovered ? -1 : 1;
      return left.label.localeCompare(right.label, "es");
    });
  }, [files]);
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
    const isDiscovered = file.origin === "discovered";
    const message = isDiscovered
      ? `¿Ocultar "${file.fileName}"? No se eliminará del disco ni volverá a añadirse automáticamente.`
      : `¿Quitar "${file.fileName}" del proyecto? El archivo físico no se eliminará.`;
    if (!window.confirm(message)) return;
    setBusy(true);
    try {
      await removeProjectFile(projectId, file.id);
      if (previewId === file.id) setPreviewId(null);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      pushToast({
        kind: "success",
        title: isDiscovered ? "Archivo ocultado" : "Asociación eliminada",
        description: isDiscovered ? "Chilli Beat respetará esta decisión en futuras actualizaciones." : "El archivo físico permanece intacto.",
      });
    } catch (cause) { pushToast({ kind: "error", title: "No se pudo quitar el archivo", description: errorMessage(cause) }); }
    finally { setBusy(false); }
  };

  const choosePreview = async (value: string) => {
    const fileId = value ? Number(value) : null;
    setBusy(true);
    try {
      await setProjectPreview(projectId, fileId);
      setPreviewId(fileId);
      const previewPath = files.find((file) => file.id === fileId)?.filePath ?? null;
      setProject((current) => current ? { ...current, previewPath } : current);
      pushToast({ kind: "success", title: fileId ? "Preview principal actualizado" : "Preview principal desactivado" });
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo cambiar el preview principal", description: errorMessage(cause) });
    }
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
    setActiveAnalysisId(file.id);
    setAnalyzingId(file.id);
    setAnalysisErrors((current) => {
      const next = { ...current };
      delete next[file.id];
      return next;
    });
    try {
      const result = await analyzeProjectAudio(projectId, file.id);
      setAnalyses((current) => ({ ...current, [file.id]: result }));
    } catch (cause) {
      const message = errorMessage(cause);
      setAnalysisErrors((current) => ({ ...current, [file.id]: message }));
      pushToast({ kind: "error", title: "No se pudo analizar el audio", description: message });
    } finally {
      setAnalyzingId(null);
    }
  };

  const previewFolders = async () => {
    setFolderBusy(true);
    try { setFolderPlan(await previewProjectFolderSetup(projectId)); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo preparar la estructura", description: errorMessage(cause) }); }
    finally { setFolderBusy(false); }
  };

  const applyFolders = async () => {
    if (!folderPlan) return;
    setFolderBusy(true);
    try {
      const updated = await applyProjectFolderSetup(projectId, folderPlan.token);
      setProject(updated);
      setFolderPlan(null);
      await synchronize(true);
      pushToast({ kind: "success", title: "Estructura preparada", description: "Solo se crearon carpetas; no se movió ningún archivo." });
    } catch (cause) { pushToast({ kind: "error", title: "No se pudo crear la estructura", description: errorMessage(cause) }); }
    finally { setFolderBusy(false); }
  };

  if (isLoading) return <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-300" /></div>;
  if (error) return <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-100/70">{error}</div>;

  return (
    <div className="pt-5">
      <header>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-orange-400/70">Organización sin mover archivos</p>
        <h2 className="mt-2 text-xl font-semibold text-stone-100">Audio y archivos</h2>
        <p className="mt-2 max-w-3xl text-sm text-stone-500">Chilli Beat busca audio dentro de las carpetas del proyecto y guarda únicamente sus rutas. Nunca copia, mueve ni elimina los originales.</p>
      </header>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-stone-300">Preview principal</h2>
          <select aria-label="Preview principal del proyecto" value={previewId ?? ""} disabled={busy} onChange={(event) => void choosePreview(event.currentTarget.value)} className="h-11 max-w-64 rounded-xl border border-white/[0.08] bg-[#1b1917] px-3 text-xs text-stone-300 outline-none focus-visible:border-orange-400/40 focus-visible:ring-2 focus-visible:ring-orange-400/20">
            <option value="">Sin preview principal</option>
            {audioFiles.map((file) => <option key={file.id} value={file.id}>{file.fileName}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.018] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-stone-300">{selectedPreview?.fileName ?? "No hay preview seleccionado"}</p>
            <p className="mt-1 text-xs text-stone-500">Solo puede haber uno. La reproducción continúa mientras navegas por Chilli Beat.</p>
          </div>
          <button type="button" disabled={!selectedPreview || busy} onClick={() => selectedPreview && playTrack(playableTrack(project, selectedPreview), playbackContext)} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-3.5 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-35">
            <Play className="size-3.5 fill-current" /> Reproducir
          </button>
        </div>
        <p className="mt-2 text-xs text-stone-500">WAV, MP3, FLAC y OGG pueden reproducirse y analizarse sin conversión.</p>
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-stone-300"><Files className="size-4 text-orange-300" /> Archivos del proyecto</h2>
            <p className="mt-1 text-xs text-stone-500">
              {files.length} {files.length === 1 ? "archivo" : "archivos"}
              {scannedFolders > 0 ? ` · ${scannedFolders} ${scannedFolders === 1 ? "carpeta revisada" : "carpetas revisadas"}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isSyncing || busy} onClick={() => void synchronize(true)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 text-xs text-stone-300 hover:bg-white/[0.04] disabled:opacity-40">
              <RefreshCw className={`size-4 ${isSyncing ? "animate-spin text-orange-300" : ""}`} /> Actualizar
            </button>
            <select value={category} onChange={(event) => setCategory(event.currentTarget.value as ProjectFileCategory)} disabled={busy} className="h-11 rounded-xl border border-white/[0.08] bg-[#1b1917] px-3 text-xs text-stone-300 outline-none">
              {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <button type="button" disabled={busy} onClick={() => void addFiles()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-40">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />} Agregar archivos
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-5" aria-live="polite">
          {isSyncing ? (
            <p className="flex items-center gap-2 text-xs text-stone-400" role="status"><RefreshCw className="size-3.5 animate-spin text-orange-300" /> Buscando audio nuevo en las carpetas del proyecto…</p>
          ) : lastDiscoveredCount > 0 ? (
            <p className="flex items-center gap-2 text-xs text-emerald-300"><Check className="size-3.5" /> {lastDiscoveredCount} {lastDiscoveredCount === 1 ? "archivo nuevo detectado" : "archivos nuevos detectados"}</p>
          ) : scannedFolders > 0 ? (
            <p className="text-xs text-stone-600">Se actualizará automáticamente cuando regreses desde {project.daw}.</p>
          ) : (
            <p className="text-xs text-amber-300/80">No se encontraron carpetas de audio reconocidas. Puedes crear la estructura propuesta o agregar archivos manualmente.</p>
          )}
        </div>

        {files.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center">
            <FolderSearch className="mx-auto size-7 text-stone-600" />
            <p className="mt-3 text-sm font-medium text-stone-300">No encontramos audio dentro del proyecto</p>
            <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-stone-500">Exporta en Renders, Audio, Samples o una carpeta configurada. Chilli Beat lo mostrará al volver desde el DAW.</p>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.07] divide-y divide-white/[0.07]">
            {fileGroups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <header className="flex items-center justify-between gap-3 bg-white/[0.025] px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {group.discovered ? <FolderSearch className="size-3.5 shrink-0 text-orange-300" /> : <Files className="size-3.5 shrink-0 text-stone-500" />}
                    <h3 className="truncate text-xs font-medium text-stone-300">{group.label}</h3>
                  </div>
                  <span className="text-xs tabular-nums text-stone-600">{group.files.length}</span>
                </header>
                <div className="divide-y divide-white/[0.055]">
                  {group.files.map((file) => {
                    const canPlay = audioTypes.has(file.fileType.toLowerCase()) && !file.isMissing;
                    const track = canPlay ? playableTrack(project, file) : null;
                    const isPrimaryPreview = previewId === file.id;
                    return (
                      <article key={file.id} className="flex flex-wrap items-center gap-3 bg-white/[0.012] px-4 py-3 hover:bg-white/[0.03]">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.04]"><FileAudio className="size-4 text-stone-500" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm text-stone-300">{file.fileName}</p>
                            {isPrimaryPreview ? <span className="shrink-0 rounded-md bg-orange-400/10 px-2 py-1 text-[0.68rem] font-medium text-orange-200">Preview principal</span> : null}
                            {file.isMissing ? <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-[0.7rem] text-red-300">No encontrado</span> : null}
                          </div>
                          <p className="mt-1 truncate text-xs text-stone-500">{file.fileType || "sin extensión"} · {formatBytes(file.fileSize)}{file.relativePath ? ` · ${file.relativePath}` : ""}</p>
                        </div>
                        {canPlay && track ? (
                          <>
                            <button type="button" onClick={() => playTrack(track, playbackContext)} title="Reproducir" className="grid size-11 place-items-center rounded-lg text-stone-500 hover:bg-orange-400/10 hover:text-orange-300"><Play className="size-3.5 fill-current" /></button>
                            <button type="button" onClick={() => addToQueue(track)} title="Añadir a la cola" className="grid size-11 place-items-center rounded-lg text-stone-500 hover:bg-white/5 hover:text-stone-200"><ListPlus className="size-4" /></button>
                            <button type="button" disabled={busy} onClick={() => void choosePreview(isPrimaryPreview ? "" : String(file.id))} title={isPrimaryPreview ? "Quitar preview principal" : "Usar como preview principal"} aria-label={(isPrimaryPreview ? "Quitar " : "Usar ") + file.fileName + " como preview principal"} aria-pressed={isPrimaryPreview} className={["grid size-11 place-items-center rounded-lg transition disabled:opacity-35", isPrimaryPreview ? "bg-orange-400/10 text-orange-300" : "text-stone-500 hover:bg-white/5 hover:text-stone-200"].join(" ") + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"}>
                              {isPrimaryPreview ? <CircleCheck className="size-4" /> : <Circle className="size-4" />}
                            </button>
                            <button type="button" disabled={analyzingId !== null} onClick={() => void analyze(file)} title="Analizar audio" aria-label={`Analizar ${file.fileName}`} aria-expanded={activeAnalysisId === file.id} aria-controls={`audio-analysis-${file.id}`} className={["grid size-11 place-items-center rounded-lg transition disabled:opacity-35", activeAnalysisId === file.id ? "bg-orange-400/10 text-orange-300" : "text-stone-500 hover:bg-white/5 hover:text-stone-200"].join(" ") + " focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400"}>
                              {analyzingId === file.id ? <LoaderCircle className="size-4 animate-spin text-orange-300" /> : <Activity className="size-4" />}
                            </button>
                            <div className="flex overflow-hidden rounded-lg border border-white/[0.07]" aria-label={`Asignar ${file.fileName} a comparación`}>
                              {(["a", "b"] as const).map((deck) => <button key={deck} type="button" onClick={() => setComparisonTrack(deck, track, analyses[file.id]?.integratedLufs ?? null)} title={`Usar como pista ${deck.toUpperCase()}`} className="grid h-11 w-9 place-items-center text-[0.7rem] font-semibold uppercase text-stone-500 hover:bg-orange-400/10 hover:text-orange-200">{deck}</button>)}
                            </div>
                          </>
                        ) : null}
                        <select value={file.category} disabled={busy} onChange={(event) => void reclassify(file, event.currentTarget.value as ProjectFileCategory)} aria-label={`Categoría de ${file.fileName}`} className="h-11 rounded-lg border border-white/[0.07] bg-[#1b1917] px-2 text-[0.7rem] text-stone-400 outline-none">
                          {file.category === "preview" ? <option value="preview">Sin clasificar (antes Preview)</option> : null}
                          {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <button type="button" disabled={file.isMissing || busy} onClick={() => void open(file)} title="Abrir archivo" className="grid size-11 place-items-center rounded-lg text-stone-600 hover:bg-white/5 hover:text-stone-300 disabled:opacity-30"><ExternalLink className="size-4" /></button>
                        <button type="button" disabled={busy} onClick={() => void remove(file)} title={file.origin === "discovered" ? "Ocultar archivo" : "Quitar asociación"} className="grid size-11 place-items-center rounded-lg text-stone-600 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-30">
                          {file.origin === "discovered" ? <EyeOff className="size-4" /> : <Trash2 className="size-4" />}
                        </button>
                        {activeAnalysisId === file.id ? (
                          analyzingId === file.id ? <AudioAnalysisLoading fileName={file.fileName} />
                            : analysisErrors[file.id] ? <AudioAnalysisError fileName={file.fileName} message={analysisErrors[file.id]} onRetry={() => void analyze(file)} onClose={() => setActiveAnalysisId(null)} />
                              : analyses[file.id] ? <AudioAnalysisPanel analysis={analyses[file.id]} file={file} onClose={() => setActiveAnalysisId(null)} /> : null
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7 rounded-2xl border border-white/[0.07] bg-white/[0.015] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-stone-300"><FolderTree className="size-4 text-orange-300" /> Estructura opcional del proyecto</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-stone-500">Prepara carpetas para stems, mezclas, masters y referencias respetando la organización habitual de {project.daw}. Nunca mueve archivos existentes.</p>
          </div>
          <button type="button" disabled={folderBusy} onClick={() => void previewFolders()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 text-xs text-stone-300 hover:bg-white/[0.04] disabled:opacity-40">
            {folderBusy && !folderPlan ? <LoaderCircle className="size-4 animate-spin" /> : <FolderTree className="size-4" />} Ver propuesta
          </button>
        </div>

        {folderPlan ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07] bg-black/10">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="text-[0.7rem] uppercase tracking-wider text-stone-600">Raíz</p>
              <p className="mt-1 break-all text-xs text-stone-400">{folderPlan.rootPath}</p>
            </div>
            <ul className="divide-y divide-white/[0.055]">
              {folderPlan.items.map((item) => (
                <li key={item.category} className="flex items-center gap-3 px-4 py-2.5">
                  {item.exists ? <Check className="size-3.5 text-emerald-400" /> : <span className="size-3.5 rounded border border-stone-600" />}
                  <span className="w-20 text-[0.7rem] font-medium uppercase text-stone-500">{folderLabel(item.category)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-stone-400">{item.path}</span>
                  <span className="text-[0.7rem] text-stone-600">{item.exists ? "Ya existe" : "Se creará"}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 border-t border-white/[0.06] p-3">
              <button type="button" disabled={folderBusy} onClick={() => setFolderPlan(null)} className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-xs text-stone-500 hover:bg-white/[0.04] hover:text-stone-300"><X className="size-3.5" /> Cancelar</button>
              <button type="button" disabled={folderBusy} onClick={() => void applyFolders()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-40">
                {folderBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Confirmar y crear
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
function formatBytes(bytes: number) { if (bytes < 1024) return bytes + " B"; if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB"; if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + " MB"; return (bytes / 1024 ** 3).toFixed(2) + " GB"; }

function AudioAnalysisLoading({ fileName }: { fileName: string }) {
  const bars = Array.from({ length: 56 }, (_, index) => 18 + ((index * 37) % 72));
  return (
    <section className="basis-full border-t border-white/[0.07] pb-2 pt-5" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold text-stone-100">
            <Activity className="size-4 animate-pulse text-orange-300" /> Analizando audio
          </p>
          <p className="mt-1 text-sm text-stone-400">{fileName}</p>
        </div>
        <span className="text-xs text-stone-500">Leyendo dinámica, nivel y forma de onda…</span>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.75fr)]">
        <div className="analysis-loading-plot relative flex h-64 items-center gap-1 overflow-hidden rounded-xl bg-black/20 px-4">
          <span className="analysis-loading-sweep" aria-hidden="true" />
          {bars.map((height, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="analysis-loading-bar min-w-px flex-1 rounded-full bg-orange-300/30"
              style={{ height: height + "%", animationDelay: (index % 12) * 55 + "ms" }}
            />
          ))}
        </div>
        <div className="space-y-3 rounded-xl bg-white/[0.025] p-4">
          <div className="h-4 w-32 animate-pulse rounded bg-white/[0.07]" />
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-10 animate-pulse rounded-lg bg-white/[0.035]" />)}
          <p className="pt-1 text-xs leading-5 text-stone-500">Puede tardar unos segundos según la duración y el formato del archivo.</p>
        </div>
      </div>
    </section>
  );
}

function AudioAnalysisError({
  fileName,
  message,
  onRetry,
  onClose,
}: {
  fileName: string;
  message: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <section className="basis-full border-t border-white/[0.07] pb-2 pt-5" role="alert">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl bg-red-400/[0.055] p-5">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-red-100">No se pudo analizar {fileName}</h3>
          <p className="mt-2 text-sm leading-6 text-red-100/75">{message}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-xs text-stone-300 hover:bg-white/[0.05]">Cerrar</button>
          <button type="button" onClick={onRetry} className="h-11 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400">Reintentar</button>
        </div>
      </div>
    </section>
  );
}

function AudioAnalysisPanel({
  analysis,
  file,
  onClose,
}: {
  analysis: AudioAnalysis;
  file: ProjectFile;
  onClose: () => void;
}) {
  const waveformPath = waveformAreaPath(analysis.waveform);
  const insights = analysisInsights(analysis);
  const technical = [
    ["Sample rate", formatSampleRate(analysis.sampleRate)],
    ["Profundidad", analysis.bitDepth === null ? "No disponible" : analysis.bitDepth + " bit"],
    ["Canales", analysis.channels === 1 ? "Mono" : analysis.channels === 2 ? "Estéreo" : analysis.channels + " canales"],
    ["Duración", formatDuration(analysis.durationSeconds)],
    ["Origen", analysis.fromCache ? "Resultado guardado" : "Analizado ahora"],
  ];

  return (
    <section id={"audio-analysis-" + file.id} className="basis-full border-t border-white/[0.07] pb-2 pt-5" aria-label={"Análisis de " + file.fileName}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-stone-100">Análisis de audio</h3>
            <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[0.7rem] font-medium text-emerald-300">Completado</span>
          </div>
          <p className="mt-1 text-sm text-stone-400">{file.fileName} · {formatDuration(analysis.durationSeconds)}</p>
        </div>
        <button type="button" onClick={onClose} title="Cerrar análisis" aria-label="Cerrar análisis" className="grid size-11 place-items-center rounded-xl text-stone-500 hover:bg-white/[0.05] hover:text-stone-200">
          <X className="size-4" />
        </button>
      </header>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(17rem,0.75fr)]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-stone-200">Forma de onda</h4>
            <span className="text-xs text-stone-500">Amplitud normalizada</span>
          </div>
          <div className="relative mt-3 h-64 overflow-hidden rounded-xl bg-black/20">
            <svg aria-label="Forma de onda completa de la pista" className="size-full text-orange-400" viewBox="0 0 1000 240" preserveAspectRatio="none" role="img">
              {[1, 2, 3, 4].map((line) => <line key={line} x1={line * 200} y1="0" x2={line * 200} y2="240" stroke="currentColor" strokeOpacity="0.08" />)}
              <line x1="0" y1="120" x2="1000" y2="120" stroke="currentColor" strokeOpacity="0.2" />
              <path d={waveformPath} fill="currentColor" fillOpacity="0.34" />
              <path d={waveformOutlinePath(analysis.waveform, false)} fill="none" stroke="currentColor" strokeOpacity="0.8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={waveformOutlinePath(analysis.waveform, true)} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="pointer-events-none absolute inset-x-3 bottom-2 flex justify-between text-[0.7rem] tabular-nums text-stone-500">
              <span>0:00</span><span>{formatDuration(analysis.durationSeconds / 2)}</span><span>{formatDuration(analysis.durationSeconds)}</span>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-3 divide-x divide-white/[0.07] rounded-xl bg-white/[0.025] py-3">
            <AnalysisMetric label="LUFS integrado" value={formatMetric(analysis.integratedLufs, " LUFS")} />
            <AnalysisMetric label="True peak" value={formatMetric(analysis.truePeakDbfs, " dBTP")} />
            <AnalysisMetric label="Rango dinámico" value={formatMetric(analysis.loudnessRangeLu, " LU")} />
          </dl>
        </div>

        <aside className="rounded-xl bg-white/[0.025] p-4" aria-label="Estadísticas del análisis">
          <h4 className="text-sm font-semibold text-stone-200">Lectura técnica</h4>
          <dl className="mt-3 divide-y divide-white/[0.06]">
            {technical.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="text-sm font-medium tabular-nums text-stone-300">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t border-white/[0.07] pt-4">
            <h4 className="text-sm font-semibold text-stone-200">Observaciones</h4>
            <div className="mt-3 space-y-3">
              {insights.map((insight) => (
                <div key={insight.title} className="flex gap-3">
                  <span className={["mt-1.5 size-2 shrink-0 rounded-full", insight.tone === "good" ? "bg-emerald-400" : insight.tone === "warning" ? "bg-amber-400" : "bg-sky-400"].join(" ")} />
                  <div>
                    <p className="text-xs font-medium text-stone-300">{insight.title}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">{insight.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 border-t border-white/[0.06] pt-3 text-[0.7rem] leading-5 text-stone-500">Lecturas orientativas: compáralas siempre con una referencia del mismo género.</p>
        </aside>
      </div>
    </section>
  );
}

function AnalysisMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4">
      <dt className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone-500">{label}</dt>
      <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-stone-100">{value}</dd>
    </div>
  );
}

type AnalysisInsight = { title: string; body: string; tone: "good" | "warning" | "info" };

function analysisInsights(analysis: AudioAnalysis): AnalysisInsight[] {
  const insights: AnalysisInsight[] = [];
  if (analysis.integratedLufs === null) {
    insights.push({ title: "Sonoridad no disponible", body: "El formato no permitió calcular LUFS integrado.", tone: "info" });
  } else if (analysis.integratedLufs > -8) {
    insights.push({ title: "Nivel muy alto", body: "La pista está muy densa; revisa limitación y pérdida de transientes.", tone: "warning" });
  } else if (analysis.integratedLufs >= -14) {
    insights.push({ title: "Nivel competitivo", body: "La sonoridad está en un rango habitual para mezclas y masters modernos.", tone: "good" });
  } else {
    insights.push({ title: "Margen disponible", body: "Hay espacio de nivel; valora el objetivo según mezcla, master o referencia.", tone: "info" });
  }

  if (analysis.truePeakDbfs === null) {
    insights.push({ title: "Pico no disponible", body: "No fue posible estimar el true peak de esta pista.", tone: "info" });
  } else if (analysis.truePeakDbfs > -1) {
    insights.push({ title: "Pico cercano al límite", body: "Puede haber riesgo de picos entre muestras al convertir o transmitir.", tone: "warning" });
  } else {
    insights.push({ title: "Headroom de pico", body: "El true peak conserva un margen práctico por debajo de −1 dBTP.", tone: "good" });
  }

  if (analysis.loudnessRangeLu !== null && analysis.loudnessRangeLu < 4) {
    insights.push({ title: "Dinámica controlada", body: "El rango es compacto; comprueba que el groove mantenga respiración.", tone: "info" });
  } else if (analysis.loudnessRangeLu !== null && analysis.loudnessRangeLu > 12) {
    insights.push({ title: "Dinámica amplia", body: "Hay contraste considerable entre secciones suaves y fuertes.", tone: "info" });
  } else {
    insights.push({ title: "Dinámica equilibrada", body: "El contraste de nivel se mantiene en un rango versátil.", tone: "good" });
  }
  return insights;
}

function waveformAreaPath(waveform: number[]) {
  if (waveform.length === 0) return "";
  const upper = waveform.map((peak, index) => waveformPoint(peak, index, waveform.length, false));
  const lower = waveform.map((peak, index) => waveformPoint(peak, index, waveform.length, true)).reverse();
  return "M " + upper.join(" L ") + " L " + lower.join(" L ") + " Z";
}

function waveformOutlinePath(waveform: number[], lower: boolean) {
  if (waveform.length === 0) return "";
  return "M " + waveform.map((peak, index) => waveformPoint(peak, index, waveform.length, lower)).join(" L ");
}

function waveformPoint(peak: number, index: number, count: number, lower: boolean) {
  const x = count === 1 ? 500 : index * 1000 / (count - 1);
  const amplitude = Math.min(1, Math.max(0, peak)) * 94;
  return x.toFixed(2) + " " + (120 + (lower ? amplitude : -amplitude)).toFixed(2);
}

function formatSampleRate(value: number) {
  const kiloHertz = value / 1000;
  return (Number.isInteger(kiloHertz) ? kiloHertz.toFixed(0) : kiloHertz.toFixed(1)) + " kHz";
}
function formatMetric(value: number | null, suffix: string) { return value === null ? "—" : value.toFixed(1) + suffix; }
function formatDuration(seconds: number) { return Math.floor(seconds / 60) + ":" + Math.floor(seconds % 60).toString().padStart(2, "0"); }
function folderLabel(category: string) { return ({ stems: "Stems", mixes: "Mezclas", masters: "Masters", references: "Referencias" } as Record<string, string>)[category] ?? category; }
