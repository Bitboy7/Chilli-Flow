import {
  CircleAlert,
  FolderOpen,
  Heart,
  ExternalLink,
  FilePenLine,
  LocateFixed,
  Music2,
} from "lucide-react";
import { memo, useState } from "react";
import { Link } from "react-router-dom";

import { openProject, openProjectAssetFolder, openProjectFolder, revealProject, setProjectFavorite } from "../../services/project-service";
import { useToastStore } from "../../stores/toast-store";
import type { ProjectListItem } from "../../types/projects";
import { errorMessage } from "../../utils/errors";
import { formatDate } from "../../utils/dates";
import { ProjectArtwork } from "./ProjectArtwork";

export const ProjectCard = memo(function ProjectCard({
  project,
}: {
  project: ProjectListItem;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const pushToast = useToastStore((state) => state.push);
  const run = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try { await action(); }
    catch (cause) {
      const description = errorMessage(cause);
      const wasRemoved = description.includes("se retiró de la biblioteca");
      pushToast({
        kind: wasRemoved ? "info" : "error",
        title: wasRemoved ? "Proyecto retirado" : "No se pudo completar la acción",
        description,
      });
      window.dispatchEvent(new Event("chilli:library-changed"));
    }
    finally { setIsBusy(false); }
  };
  const toggleFavorite = () => run(async () => {
    await setProjectFavorite(project.id, !project.isFavorite);
    window.dispatchEvent(new Event("chilli:library-changed"));
  });

  return (
    <article
      className={[
        "group overflow-hidden rounded-2xl border bg-white/[0.025] transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.04]",
        project.isMissing
          ? "border-red-400/20"
          : "border-white/[0.07]",
      ].join(" ")}
    >
      <div className="relative">
        <ProjectArtwork projectId={project.id} coverPath={project.coverPath} daw={project.daw} name={project.displayName} />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-lg border border-white/10 bg-black/45 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-stone-200 backdrop-blur-md">
            {project.extension}
          </span>
          {project.isMissing ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 bg-red-950/70 px-2 py-1 text-[0.62rem] font-medium text-red-200 backdrop-blur-md">
              <CircleAlert className="size-3" />
              No encontrado
            </span>
          ) : null}
        </div>
        <button type="button" disabled={isBusy} onClick={() => void toggleFavorite()} aria-label={project.isFavorite ? "Quitar de favoritos" : "Marcar como favorito"} className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-black/35 text-stone-300 backdrop-blur hover:bg-black/60 disabled:opacity-40">
          <Heart className={["size-4", project.isFavorite ? "fill-red-400 text-red-400" : ""].join(" ")} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link to={"/projects/" + project.id} className="block truncate text-sm font-semibold text-stone-100 hover:text-orange-300">{project.displayName}</Link>
            <p
              className="mt-1 truncate text-[0.7rem] text-stone-600"
              title={project.originalName}
            >
              {project.originalName}
            </p>
          </div>
          <Link to={"/projects/" + project.id + "/edit"} title="Editar proyecto" className="grid size-7 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-white/5 hover:text-stone-300"><FilePenLine className="size-4" /></Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.68rem]">
          <span className="inline-flex items-center gap-1.5 text-stone-400">
            <Music2 className="size-3 text-orange-300" />
            {project.daw}
          </span>
          <span className="text-stone-700">•</span>
          <span className="text-stone-500">
            {project.bpm ? project.bpm + " BPM" : "BPM —"}
          </span>
          <span className="text-stone-700">•</span>
          <span className="text-stone-500">{project.musicalKey ?? "Tono —"}</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] px-2 py-1 text-[0.62rem] text-stone-400">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: project.statusColor ?? "#78716c" }}
            />
            {project.statusLabel}
          </span>
          <span className="truncate text-[0.62rem] text-stone-600">
            {project.genre ?? "Sin género"}
          </span>
        </div>

        {project.tags.length > 0 ? (
          <div className="mt-3 flex min-h-5 flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/[0.045] px-1.5 py-0.5 text-[0.58rem] text-stone-500"
              >
                #{tag}
              </span>
            ))}
            {project.tags.length > 3 ? (
              <span className="text-[0.58rem] text-stone-600">
                +{project.tags.length - 3}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="text-[0.62rem] text-stone-600">
            Modificado {formatDate(project.fileModifiedAt)}
          </span>
          <div className="flex items-center gap-0.5">
            <CardAction title="Abrir proyecto" disabled={project.isMissing || isBusy} onClick={() => void run(() => openProject(project.id))}><ExternalLink className="size-3.5" /></CardAction>
            <CardAction title="Mostrar archivo" disabled={project.isMissing || isBusy} onClick={() => void run(() => revealProject(project.id))}><LocateFixed className="size-3.5" /></CardAction>
            <CardAction title="Abrir carpeta" disabled={project.isMissing || isBusy} onClick={() => void run(() => openProjectFolder(project.id))}><FolderOpen className="size-3.5" /></CardAction>
            <CardAction title="Abrir carpeta de stems" disabled={isBusy} onClick={() => void run(() => openProjectAssetFolder(project.id, "stems"))}><Music2 className="size-3.5" /></CardAction>
          </div>
        </div>
      </div>
    </article>
  );
});

function CardAction({ title, disabled, onClick, children }: { title: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={title} aria-label={title} disabled={disabled} onClick={onClick} className="grid size-7 place-items-center rounded-lg text-stone-600 hover:bg-white/5 hover:text-stone-300 disabled:cursor-not-allowed disabled:opacity-30">{children}</button>;
}
