import { ArrowLeft, CircleAlert, FilePenLine, Heart, Layers3, LayoutDashboard, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";

import { ProjectArtwork } from "../features/projects/ProjectArtwork";
import { getProject, setProjectFavorite } from "../services/project-service";
import { useToastStore } from "../stores/toast-store";
import type { ProjectDetail } from "../types/projects";
import { errorMessage } from "../utils/errors";

export type ProjectWorkspaceContext = {
  project: ProjectDetail;
  setProject: React.Dispatch<React.SetStateAction<ProjectDetail | null>>;
};

export function ProjectWorkspacePage() {
  const projectId = Number(useParams().projectId);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  const toggleFavorite = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const isFavorite = !project.isFavorite;
      await setProjectFavorite(project.id, isFavorite);
      setProject({ ...project, isFavorite });
      window.dispatchEvent(new Event("chilli:library-changed"));
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo actualizar el favorito", description: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <WorkspaceError message={error} />;
  if (!project) return <div className="grid min-h-96 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-300" /></div>;

  return (
    <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <Link to="/library" className="inline-flex items-center gap-2 text-xs text-stone-500 hover:text-stone-200">
        <ArrowLeft className="size-3.5" /> Volver a la biblioteca
      </Link>

      <header className="mt-5 flex flex-col gap-5 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center">
        <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] sm:w-36">
          <ProjectArtwork projectId={project.id} coverPath={project.coverPath} daw={project.daw} name={project.displayName} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-orange-400/15 bg-orange-400/[0.06] px-2 py-1 text-[0.62rem] font-semibold uppercase text-orange-300">{project.daw}</span>
            <span className="text-[0.65rem] uppercase text-stone-600">{project.extension}</span>
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-stone-100">{project.displayName}</h1>
          <p className="mt-1 truncate text-xs text-stone-600">{project.originalName}</p>
          <span className="mt-3 inline-flex items-center gap-2 text-xs text-stone-400">
            <span className="size-2 rounded-full" style={{ backgroundColor: project.statusColor ?? "#78716c" }} />{project.statusLabel}
          </span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => void toggleFavorite()} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs text-stone-300 hover:bg-white/[0.04] disabled:opacity-50">
            <Heart className={["size-4", project.isFavorite ? "fill-red-400 text-red-400" : ""].join(" ")} /> Favorito
          </button>
          <Link to={"/projects/" + project.id + "/edit"} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400">
            <FilePenLine className="size-4" /> Editar
          </Link>
        </div>
      </header>

      <nav className="mt-4 flex gap-1 rounded-xl border border-white/[0.07] bg-black/10 p-1" aria-label="Secciones del proyecto">
        <WorkspaceTab to={"/projects/" + project.id} end icon={<LayoutDashboard className="size-4" />}>Resumen</WorkspaceTab>
        <WorkspaceTab to={"/projects/" + project.id + "/audio"} icon={<Layers3 className="size-4" />}>Audio y archivos</WorkspaceTab>
      </nav>

      <Outlet context={{ project, setProject } satisfies ProjectWorkspaceContext} />
    </div>
  );
}

function WorkspaceTab({ to, end = false, icon, children }: { to: string; end?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return <NavLink to={to} end={end} className={({ isActive }) => ["inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium transition", isActive ? "bg-white/[0.07] text-stone-100 shadow-sm" : "text-stone-500 hover:bg-white/[0.035] hover:text-stone-300"].join(" ")}>{icon}{children}</NavLink>;
}

function WorkspaceError({ message }: { message: string }) {
  return <div className="mx-auto max-w-xl p-8"><div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><p className="mt-3 text-sm text-red-100/70">{message}</p><Link to="/library" className="mt-4 inline-block text-xs text-stone-400 underline">Volver a la biblioteca</Link></div></div>;
}
