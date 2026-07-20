import {
  ArchiveRestore,
  Check,
  Clock3,
  ExternalLink,
  FileClock,
  FolderOpen,
  History,
  LoaderCircle,
  RotateCcw,
  Unlink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import type { ProjectWorkspaceContext } from "./ProjectWorkspacePage";
import {
  confirmProjectVersion,
  detachProjectVersion,
  getProject,
  listProjectVersions,
  openProjectVersion,
  promoteProjectVersion,
  revealProjectVersion,
} from "../services/project-service";
import { useToastStore } from "../stores/toast-store";
import type { ProjectVersionItem, ProjectVersionSet } from "../types/projects";
import { errorMessage } from "../utils/errors";

export function ProjectVersionsPage() {
  const { project, setProject } = useOutletContext<ProjectWorkspaceContext>();
  const [versions, setVersions] = useState<ProjectVersionSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const pushToast = useToastStore((state) => state.push);

  const load = useCallback(async () => {
    try {
      setVersions(await listProjectVersions(project.id));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [project.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestions = useMemo(
    () => versions?.versions.filter((item) => item.confidence === "suggested") ?? [],
    [versions],
  );
  const accepted = useMemo(
    () => versions?.versions.filter((item) => item.confidence !== "suggested") ?? [],
    [versions],
  );

  const mutate = async (
    versionId: number,
    action: () => Promise<ProjectVersionSet>,
    success: string,
    refreshProject = false,
  ) => {
    setBusyId(versionId);
    try {
      setVersions(await action());
      if (refreshProject) {
        setProject(await getProject(project.id));
      }
      window.dispatchEvent(new Event("chilli:library-changed"));
      pushToast({ kind: "success", title: success });
    } catch (cause) {
      pushToast({
        kind: "error",
        title: "No se pudo actualizar la versión",
        description: errorMessage(cause),
      });
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-100/75">
        {error}
      </div>
    );
  }

  if (!versions) {
    return <VersionSkeleton />;
  }

  return (
    <div className="pt-6">
      <header className="max-w-2xl">
        <h2 className="text-xl font-semibold text-stone-100">Versiones y backups</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Chilli Beat agrupa copias relacionadas sin mover ni modificar los archivos del DAW.
        </p>
      </header>

      <section className="mt-6" aria-labelledby="primary-version-title">
        <h3 id="primary-version-title" className="text-xs font-medium text-stone-400">
          Proyecto principal
        </h3>
        <VersionRow item={versions.primary} primary projectId={project.id} busy={false} />
      </section>

      {suggestions.length > 0 ? (
        <section className="mt-8" aria-labelledby="suggested-versions-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="suggested-versions-title" className="flex items-center gap-2 text-sm font-medium text-amber-200">
                <Clock3 className="size-4" /> Posibles versiones
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                Confirma la relación o mantenlas como proyectos independientes.
              </p>
            </div>
            <span className="rounded-lg bg-amber-400/10 px-2 py-1 text-[0.65rem] text-amber-200">
              Revisión pendiente: {suggestions.length}
            </span>
          </div>
          <div className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.07]">
            {suggestions.map((item) => (
              <VersionRow
                key={item.id}
                item={item}
                projectId={project.id}
                busy={busyId === item.id}
                onConfirm={() => void mutate(
                  item.id,
                  () => confirmProjectVersion(project.id, item.id),
                  "Versión vinculada",
                )}
                onDetach={() => void mutate(
                  item.id,
                  () => detachProjectVersion(project.id, item.id),
                  "Se mantendrá como proyecto independiente",
                )}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="accepted-versions-title">
        <div>
          <h3 id="accepted-versions-title" className="flex items-center gap-2 text-sm font-medium text-stone-300">
            <History className="size-4 text-orange-300" /> Historial relacionado
          </h3>
          <p className="mt-1 text-xs text-stone-600">
            Backups automáticos, copias y versiones confirmadas.
          </p>
        </div>
        {accepted.length === 0 ? (
          <div className="mt-4 border-y border-dashed border-white/[0.08] py-10 text-center">
            <FileClock className="mx-auto size-6 text-stone-700" />
            <p className="mt-3 text-sm text-stone-500">Todavía no se detectaron backups.</p>
            <p className="mt-1 text-xs text-stone-600">
              Aparecerán aquí después del próximo escaneo.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-white/[0.06] border-y border-white/[0.07]">
            {accepted.map((item) => (
              <VersionRow
                key={item.id}
                item={item}
                projectId={project.id}
                busy={busyId === item.id}
                onPromote={() => void mutate(
                  item.id,
                  () => promoteProjectVersion(project.id, item.id),
                  "Archivo principal actualizado",
                  true,
                )}
                onDetach={() => void mutate(
                  item.id,
                  () => detachProjectVersion(project.id, item.id),
                  "Versión separada del proyecto",
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function VersionRow({
  item,
  projectId,
  primary = false,
  busy,
  onConfirm,
  onDetach,
  onPromote,
}: {
  item: ProjectVersionItem;
  projectId: number;
  primary?: boolean;
  busy: boolean;
  onConfirm?: () => void;
  onDetach?: () => void;
  onPromote?: () => void;
}) {
  const pushToast = useToastStore((state) => state.push);
  const open = async (reveal: boolean) => {
    try {
      if (reveal) await revealProjectVersion(projectId, item.id);
      else await openProjectVersion(projectId, item.id);
    } catch (cause) {
      pushToast({
        kind: "error",
        title: reveal ? "No se pudo mostrar el archivo" : "No se pudo abrir la versión",
        description: errorMessage(cause),
      });
    }
  };

  return (
    <article className="flex flex-wrap items-center gap-3 px-1 py-3.5">
      <span className={[
        "grid size-10 shrink-0 place-items-center rounded-xl",
        primary ? "bg-lime-400/10 text-lime-400" : "bg-white/[0.04] text-stone-500",
      ].join(" ")}>
        {primary ? <Check className="size-4" /> : <ArchiveRestore className="size-4" />}
      </span>
      <div className="min-w-48 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-stone-300">{item.fileName}</p>
          <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] text-stone-500">
            {primary ? "Principal" : kindLabel(item.kind)}
          </span>
          {item.isMissing ? (
            <span className="rounded-md bg-red-400/10 px-1.5 py-0.5 text-[0.6rem] text-red-300">
              No encontrado
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[0.65rem] text-stone-600">
          {formatBytes(item.fileSize)} · {formatDate(item.fileModifiedAt)}
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
        {onConfirm ? (
          <ActionButton label="Confirmar vínculo" onClick={onConfirm} disabled={busy} icon={<Check className="size-3.5" />} accent />
        ) : null}
        {onPromote ? (
          <ActionButton label="Usar como principal" onClick={onPromote} disabled={busy} icon={<RotateCcw className="size-3.5" />} />
        ) : null}
        {onDetach ? (
          <ActionButton label="Separar del proyecto" onClick={onDetach} disabled={busy} icon={<Unlink className="size-3.5" />} />
        ) : null}
        <ActionButton label="Mostrar archivo" onClick={() => void open(true)} disabled={busy || item.isMissing} icon={<FolderOpen className="size-3.5" />} />
        <ActionButton label="Abrir en el DAW" onClick={() => void open(false)} disabled={busy || item.isMissing} icon={<ExternalLink className="size-3.5" />} />
        {busy ? <LoaderCircle className="ml-2 size-4 animate-spin text-orange-300" /> : null}
      </div>
    </article>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  icon,
  accent = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={[
        "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-35",
        accent
          ? "bg-orange-500 font-semibold text-stone-950 hover:bg-orange-400"
          : "text-stone-500 hover:bg-white/[0.05] hover:text-stone-200",
      ].join(" ")}
    >
      {icon}<span className="hidden xl:inline">{label}</span>
    </button>
  );
}

function VersionSkeleton() {
  return (
    <div className="mt-6 animate-pulse">
      <div className="h-5 w-48 rounded bg-white/[0.06]" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-white/[0.04]" />
      <div className="mt-8 space-y-px border-y border-white/[0.06]">
        {[0, 1, 2].map((item) => <div key={item} className="h-16 bg-white/[0.015]" />)}
      </div>
    </div>
  );
}

function kindLabel(kind: ProjectVersionItem["kind"]) {
  return ({ backup: "Backup", copy: "Copia", version: "Versión", primary: "Principal" })[kind];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 ** 2).toFixed(1) + " MB";
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Fecha desconocida";
}
