import {
  ArrowLeft, CircleAlert, ExternalLink, FilePenLine, FolderOpen,
  Heart, Layers3, LoaderCircle, LocateFixed, Star, Tags,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ProjectArtwork } from "../features/projects/ProjectArtwork";
import {
  getProject, openProject, openProjectAssetFolder, openProjectFolder, revealProject, setProjectFavorite,
} from "../services/project-service";
import { useToastStore } from "../stores/toast-store";
import type { ProjectDetail } from "../types/projects";
import { formatDate } from "../utils/dates";
import { errorMessage } from "../utils/errors";

export function ProjectDetailPage() {
  const projectId = Number(useParams().projectId);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pushToast = useToastStore((state) => state.push);

  const load = useCallback(async () => {
    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      setError("Identificador de proyecto no válido.");
      return;
    }
    try {
      setProject(await getProject(projectId));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    try { await action(); }
    catch (cause) {
      pushToast({ kind: "error", title: "No se pudo completar la acción", description: errorMessage(cause) });
    } finally { setBusy(null); }
  };

  if (error) return <ErrorState message={error} />;
  if (!project) return <LoadingState />;

  const toggleFavorite = () => runAction("favorite", async () => {
    const favorite = !project.isFavorite;
    await setProjectFavorite(project.id, favorite);
    setProject({ ...project, isFavorite: favorite });
    window.dispatchEvent(new Event("chilli:library-changed"));
  });

  return (
    <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <Link to="/library" className="inline-flex items-center gap-2 text-xs text-stone-500 hover:text-stone-200">
        <ArrowLeft className="size-3.5" /> Volver a la biblioteca
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside>
          <div className="overflow-hidden rounded-3xl border border-white/[0.08]">
            <ProjectArtwork projectId={project.id} coverPath={project.coverPath} daw={project.daw} name={project.displayName} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void toggleFavorite()} disabled={busy !== null}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-stone-300 hover:bg-white/[0.04] disabled:opacity-50">
              <Heart className={["size-4", project.isFavorite ? "fill-red-400 text-red-400" : ""].join(" ")} />
              {project.isFavorite ? "Favorito" : "Marcar favorito"}
            </button>
            <Link to={"/projects/" + project.id + "/edit"} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-orange-500 text-xs font-semibold text-stone-950 hover:bg-orange-400">
              <FilePenLine className="size-4" /> Editar
            </Link>
          </div>
          <Link to={"/projects/" + project.id + "/files"} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-stone-300 hover:bg-white/[0.04]"><Layers3 className="size-4" /> Archivos asociados</Link>
        </aside>

        <main className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-orange-400/15 bg-orange-400/[0.06] px-2 py-1 text-[0.65rem] font-semibold uppercase text-orange-300">{project.daw}</span>
                <span className="text-xs uppercase text-stone-600">{project.extension}</span>
              </div>
              <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-stone-100">{project.displayName}</h1>
              <p className="mt-2 text-sm text-stone-600">{project.originalName}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-stone-300">
              <span className="size-2 rounded-full" style={{ backgroundColor: project.statusColor ?? "#78716c" }} />{project.statusLabel}
            </span>
          </div>

          {project.isMissing ? <div className="mt-5 flex gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200"><CircleAlert className="size-4 shrink-0" />El archivo físico no fue encontrado. Las acciones del sistema están deshabilitadas.</div> : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="BPM" value={project.bpm?.toString() ?? "—"} />
            <Metric label="Tonalidad" value={project.musicalKey ?? "—"} />
            <Metric label="Género" value={project.genre ?? "—"} />
            <Metric label="Calificación" value={project.rating === null ? "—" : project.rating + " / 5"} icon={<Star className="size-3.5 text-amber-300" />} />
          </div>

          <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h2 className="text-sm font-medium text-stone-300">Notas</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-500">{project.notes || "No hay notas para este proyecto."}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-white/[0.07] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-300"><Tags className="size-4 text-orange-300" /> Etiquetas</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.length ? project.tags.map((tag) => <span key={tag} className="rounded-lg bg-white/[0.045] px-2 py-1 text-xs text-stone-400">#{tag}</span>) : <span className="text-sm text-stone-600">Sin etiquetas.</span>}
            </div>
          </section>

          <section className="mt-4 grid gap-2 sm:grid-cols-3">
            <SystemButton icon={<ExternalLink className="size-4" />} label="Abrir proyecto" disabled={project.isMissing || busy !== null} onClick={() => void runAction("open", () => openProject(project.id))} />
            <SystemButton icon={<LocateFixed className="size-4" />} label="Mostrar archivo" disabled={project.isMissing || busy !== null} onClick={() => void runAction("reveal", () => revealProject(project.id))} />
            <SystemButton icon={<FolderOpen className="size-4" />} label="Abrir carpeta" disabled={project.isMissing || busy !== null} onClick={() => void runAction("folder", () => openProjectFolder(project.id))} />
          </section>
          {project.folders.stems ? <button type="button" disabled={busy !== null} onClick={() => void runAction("stems", () => openProjectAssetFolder(project.id, "stems"))} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[0.035] text-xs text-sky-200/70 hover:bg-sky-400/[0.07]"><FolderOpen className="size-4" /> Abrir carpeta de stems</button> : null}

          <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-white/[0.06] pt-5 text-xs sm:grid-cols-2">
            <Info label="Ruta" value={project.filePath} />
            <Info label="Modificado" value={formatDate(project.fileModifiedAt)} />
            <Info label="Indexado" value={formatDate(project.indexedAt)} />
            <Info label="Tamaño" value={formatBytes(project.fileSize)} />
          </dl>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"><p className="text-[0.65rem] uppercase tracking-wider text-stone-600">{label}</p><p className="mt-2 flex items-center gap-2 text-sm font-medium text-stone-200">{icon}{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-stone-600">{label}</dt><dd className="mt-1 break-all text-stone-400">{value}</dd></div>; }
function SystemButton({ icon, label, disabled, onClick }: { icon: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-stone-400 hover:bg-white/[0.04] hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-35">{icon}{label}</button>; }
function LoadingState() { return <div className="grid min-h-96 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-300" /></div>; }
function ErrorState({ message }: { message: string }) { return <div className="mx-auto max-w-xl p-8"><div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><p className="mt-3 text-sm text-red-100/70">{message}</p><Link to="/library" className="mt-4 inline-block text-xs text-stone-400 underline">Volver a la biblioteca</Link></div></div>; }
function formatBytes(bytes: number) { if (bytes < 1024) return bytes + " B"; const units = ["KB", "MB", "GB"]; let value = bytes / 1024; let index = 0; while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; } return value.toFixed(value >= 10 ? 1 : 2) + " " + units[index]; }
