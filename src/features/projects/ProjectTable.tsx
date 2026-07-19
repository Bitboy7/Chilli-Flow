import { CircleAlert, Heart } from "lucide-react";
import { Link } from "react-router-dom";

import type { ProjectListItem } from "../../types/projects";
import { formatDate } from "../../utils/dates";
import { ProjectArtwork } from "./ProjectArtwork";

export function ProjectTable({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
      <table className="w-full min-w-[58rem] border-collapse text-left">
        <thead className="bg-white/[0.025] text-[0.65rem] uppercase tracking-wider text-stone-600">
          <tr>
            <th className="px-4 py-3 font-medium">Proyecto</th>
            <th className="px-3 py-3 font-medium">DAW</th>
            <th className="px-3 py-3 font-medium">BPM / Tono</th>
            <th className="px-3 py-3 font-medium">Estado</th>
            <th className="px-3 py-3 font-medium">Género</th>
            <th className="px-4 py-3 text-right font-medium">Modificado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.055]">
          {projects.map((project) => (
            <tr
              key={project.id}
              className="bg-white/[0.012] transition hover:bg-white/[0.035]"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <ProjectArtwork
                    projectId={project.id}
                    coverPath={project.coverPath}
                    daw={project.daw}
                    name={project.displayName}
                    compact
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={"/projects/" + project.id} className="max-w-64 truncate text-sm font-medium text-stone-200 hover:text-orange-300">{project.displayName}</Link>
                      {project.isFavorite ? (
                        <Heart className="size-3 fill-red-400 text-red-400" />
                      ) : null}
                      {project.isMissing ? (
                        <CircleAlert
                          className="size-3.5 text-red-400"
                          aria-label="Archivo no encontrado"
                        />
                      ) : null}
                    </div>
                    <p className="mt-0.5 max-w-72 truncate text-[0.65rem] text-stone-600">
                      {project.originalName}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <p className="text-xs text-stone-400">{project.daw}</p>
                <p className="mt-0.5 text-[0.62rem] uppercase text-stone-600">
                  {project.extension}
                </p>
              </td>
              <td className="px-3 py-3 text-xs text-stone-500">
                {project.bpm ?? "—"} / {project.musicalKey ?? "—"}
              </td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                  <span
                    className="size-1.5 rounded-full"
                    style={{
                      backgroundColor: project.statusColor ?? "#78716c",
                    }}
                  />
                  {project.statusLabel}
                </span>
              </td>
              <td className="px-3 py-3 text-xs text-stone-500">
                {project.genre ?? "—"}
              </td>
              <td className="px-4 py-3 text-right text-[0.65rem] text-stone-600">
                {formatDate(project.fileModifiedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
