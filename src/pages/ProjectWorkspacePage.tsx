import { ArrowLeft, CircleAlert, FilePenLine, Heart, History, Info, Layers3, LayoutDashboard, ListChecks, LoaderCircle, PackageOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";

import { generateArtworkPalette, ProjectArtwork } from "../features/projects/ProjectArtwork";
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
  const [coverBackdrop, setCoverBackdrop] = useState<string | null>(null);
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

  const artworkSeed = project.id + ":" + project.displayName + ":" + project.daw;
  const artworkPalette = generateArtworkPalette(artworkSeed);

  return (
    <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <section className="project-ambient relative isolate -mx-5 -mt-5 overflow-hidden border-b border-white/[0.07] px-5 pb-5 pt-5 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8">
        {coverBackdrop ? (
          <img aria-hidden="true" src={coverBackdrop} className="project-ambient__art" />
        ) : null}
        <div
          aria-hidden="true"
          className="project-ambient__glow"
          style={{
            "--ambient-accent": artworkPalette.accent,
            "--ambient-mid": artworkPalette.mid,
          } as React.CSSProperties}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#171513]/55 via-[#171513]/70 to-[#171513]/95" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-transparent via-[#171513]/20 to-[#171513]" />

        <div className="relative">
          <Link to="/library" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs text-stone-300 hover:bg-white/[0.055] hover:text-stone-50">
            <ArrowLeft className="size-3.5" /> Volver a la biblioteca
          </Link>

          <header className="flex flex-wrap items-center gap-5 py-5 sm:py-7">
            <div className="w-32 shrink-0 overflow-hidden rounded-xl border border-white/[0.14] sm:w-40">
              <ProjectArtwork projectId={project.id} coverPath={project.coverPath} daw={project.daw} name={project.displayName} onCoverResolved={setCoverBackdrop} />
            </div>
            <div className="min-w-56 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-orange-400/25 bg-black/25 px-2 py-1 text-[0.68rem] font-semibold uppercase text-orange-100">{project.daw}</span>
                <span className="text-xs uppercase text-stone-300">{project.extension}</span>
              </div>
              <h1 className="mt-3 line-clamp-2 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-stone-50 sm:text-3xl">{project.displayName}</h1>
              <p className="mt-1 line-clamp-1 text-xs text-stone-300">{project.originalName}</p>
              <span className="mt-3 inline-flex items-center gap-2 text-xs text-stone-200">
                <span className="size-2 rounded-full ring-4 ring-black/20" style={{ backgroundColor: project.statusColor ?? "#78716c" }} />{project.statusLabel}
              </span>
            </div>
            <div className="ml-auto flex shrink-0 gap-2">
              <button type="button" onClick={() => void toggleFavorite()} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.14] bg-black/20 px-4 text-xs text-stone-100 hover:bg-white/[0.08] disabled:opacity-50">
                <Heart className={["size-4", project.isFavorite ? "fill-red-400 text-red-400" : ""].join(" ")} /> Favorito
              </button>
              <Link to={"/projects/" + project.id + "/edit"} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400">
                <FilePenLine className="size-4" /> Editar
              </Link>
            </div>
          </header>

          {project.sourceKind === "managed_pending" ? (
            <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-sky-400/15 bg-black/20 px-4 py-3 backdrop-blur-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-sky-300" />
              <p className="text-xs leading-5 text-sky-100/80">
                Workspace preparado. Guarda el primer archivo de {project.daw} dentro de <span className="font-medium text-sky-100">Project Files</span> y ejecuta un escaneo para vincularlo automáticamente.
              </p>
            </div>
          ) : null}

          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.09] bg-black/25 p-1 backdrop-blur-sm" aria-label="Secciones del proyecto">
            <WorkspaceTab to={"/projects/" + project.id} end icon={<LayoutDashboard className="size-4" />}>Resumen</WorkspaceTab>
            <WorkspaceTab to={"/projects/" + project.id + "/audio"} icon={<Layers3 className="size-4" />}>Audio y archivos</WorkspaceTab>
            <WorkspaceTab to={"/projects/" + project.id + "/finish"} icon={<ListChecks className="size-4" />}>Plan de cierre</WorkspaceTab>
            <WorkspaceTab to={"/projects/" + project.id + "/versions"} icon={<History className="size-4" />}>Versiones</WorkspaceTab>
            <WorkspaceTab to={"/projects/" + project.id + "/handoff"} icon={<PackageOpen className="size-4" />}>Handoff</WorkspaceTab>
          </nav>
        </div>
      </section>

      <Outlet context={{ project, setProject } satisfies ProjectWorkspaceContext} />
    </div>
  );
}

function WorkspaceTab({ to, end = false, icon, children }: { to: string; end?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return <NavLink to={to} end={end} className={({ isActive }) => ["inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400", isActive ? "bg-white/[0.07] text-stone-100 shadow-sm" : "text-stone-400 hover:bg-white/[0.035] hover:text-stone-200"].join(" ")}>{icon}{children}</NavLink>;
}

function WorkspaceError({ message }: { message: string }) {
  return <div className="mx-auto max-w-xl p-8"><div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><p className="mt-3 text-sm text-red-100/70">{message}</p><Link to="/library" className="mt-4 inline-block text-xs text-stone-400 underline">Volver a la biblioteca</Link></div></div>;
}
