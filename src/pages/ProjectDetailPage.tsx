import { CircleAlert, ExternalLink, FolderOpen, LocateFixed, Star, Tags } from "lucide-react";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";

import {
  openProject, openProjectAssetFolder, openProjectFolder, revealProject,
} from "../services/project-service";
import { useToastStore } from "../stores/toast-store";
import { formatDate } from "../utils/dates";
import { errorMessage } from "../utils/errors";
import type { ProjectWorkspaceContext } from "./ProjectWorkspacePage";

export function ProjectDetailPage() {
  const { project } = useOutletContext<ProjectWorkspaceContext>();
  const [busy, setBusy] = useState<string | null>(null);
  const pushToast = useToastStore((state) => state.push);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setBusy(name);
    try { await action(); }
    catch (cause) {
      pushToast({ kind: "error", title: "No se pudo completar la acción", description: errorMessage(cause) });
    } finally { setBusy(null); }
  };

  return (
    <main className="min-w-0 pt-5">
      {project.isMissing ? (
        <div className="mb-5 flex gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200">
          <CircleAlert className="size-4 shrink-0" />El archivo físico no fue encontrado. Las acciones del sistema están deshabilitadas.
        </div>
      ) : null}

      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.018] sm:grid-cols-4">
        <Metric label="BPM" value={project.bpm?.toString() ?? "—"} />
        <Metric label="Tonalidad" value={project.musicalKey ?? "—"} />
        <Metric label="Género" value={project.genre ?? "—"} />
        <Metric label="Calificación" value={project.rating === null ? "—" : project.rating + " / 5"} icon={<Star className="size-3.5 text-amber-300" />} />
      </dl>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <h2 className="text-sm font-medium text-stone-300">Notas</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-500">{project.notes || "No hay notas para este proyecto."}</p>
        </section>
        <section className="rounded-2xl border border-white/[0.07] p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-300"><Tags className="size-4 text-orange-300" /> Etiquetas</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.tags.length ? project.tags.map((tag) => <span key={tag} className="rounded-lg bg-white/[0.045] px-2 py-1 text-xs text-stone-400">#{tag}</span>) : <span className="text-sm text-stone-600">Sin etiquetas.</span>}
          </div>
        </section>
      </div>

      <section className="mt-4 grid gap-2 sm:grid-cols-3">
        <SystemButton icon={<ExternalLink className="size-4" />} label="Abrir proyecto" disabled={project.isMissing || busy !== null} onClick={() => void runAction("open", () => openProject(project.id))} />
        <SystemButton icon={<LocateFixed className="size-4" />} label="Mostrar archivo" disabled={project.isMissing || busy !== null} onClick={() => void runAction("reveal", () => revealProject(project.id))} />
        <SystemButton icon={<FolderOpen className="size-4" />} label="Abrir carpeta" disabled={project.isMissing || busy !== null} onClick={() => void runAction("folder", () => openProjectFolder(project.id))} />
      </section>
      {project.folders.stems ? (
        <button type="button" disabled={busy !== null} onClick={() => void runAction("stems", () => openProjectAssetFolder(project.id, "stems"))} className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-400/15 bg-sky-400/[0.035] text-xs text-sky-200/70 hover:bg-sky-400/[0.07]">
          <FolderOpen className="size-4" /> Abrir carpeta de stems
        </button>
      ) : null}

      <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-white/[0.06] pt-5 text-xs sm:grid-cols-2">
        <Info label="Ruta" value={project.filePath} />
        <Info label="Modificado" value={formatDate(project.fileModifiedAt)} />
        <Info label="Indexado" value={formatDate(project.indexedAt)} />
        <Info label="Tamaño" value={formatBytes(project.fileSize)} />
      </dl>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="min-w-0 border-r border-white/[0.07] p-4 last:border-r-0"><dt className="text-[0.68rem] font-medium uppercase tracking-wider text-stone-500">{label}</dt><dd className="mt-2 flex items-center gap-2 truncate text-sm font-medium text-stone-200">{icon}{value}</dd></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><dt className="text-stone-600">{label}</dt><dd className="mt-1 break-all text-stone-400">{value}</dd></div>; }
function SystemButton({ icon, label, disabled, onClick }: { icon: React.ReactNode; label: string; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-stone-400 hover:bg-white/[0.04] hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-35">{icon}{label}</button>; }
function formatBytes(bytes: number) { if (bytes < 1024) return bytes + " B"; const units = ["KB", "MB", "GB"]; let value = bytes / 1024; let index = 0; while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; } return value.toFixed(value >= 10 ? 1 : 2) + " " + units[index]; }
