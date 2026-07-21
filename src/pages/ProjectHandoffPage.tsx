import {
  AlertTriangle,
  FileArchive,
  FolderOpen,
  LoaderCircle,
  PackageCheck,
  PackageOpen,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Select } from "../components/ui/Select";
import type { ProjectWorkspaceContext } from "./ProjectWorkspacePage";
import {
  createHandoff,
  getHandoffPreview,
  openHandoffDestination,
  selectHandoffDestination,
} from "../services/handoff-service";
import { useToastStore } from "../stores/toast-store";
import type {
  HandoffExportResult,
  HandoffPreview,
  HandoffSettings,
} from "../types/projects";
import { errorMessage } from "../utils/errors";

const inputClass =
  "h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-500 transition hover:border-white/[0.13] focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/10";
const variantOptions = [
  { value: "neutral", label: "Original / sin clasificar" },
  { value: "wet", label: "Con efectos" },
  { value: "dry", label: "Sin efectos" },
];
const variantCategories = new Set(["stem", "mix", "master"]);

export function ProjectHandoffPage() {
  const { project } = useOutletContext<ProjectWorkspaceContext>();
  const pushToast = useToastStore((state) => state.push);
  const [preview, setPreview] = useState<HandoffPreview | null>(null);
  const [settings, setSettings] = useState<HandoffSettings | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [variants, setVariants] = useState<Record<number, "wet" | "dry" | "neutral">>({});
  const [destination, setDestination] = useState("");
  const [includeProject, setIncludeProject] = useState(project.sourceKind !== "managed_pending");
  const [plugins, setPlugins] = useState("");
  const [result, setResult] = useState<HandoffExportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await getHandoffPreview(project.id);
      setPreview(next);
      setSettings(next.settings);
      setPlugins(next.settings.plugins.join(", "));
      setSelectedIds(new Set(next.files.filter((file) => !file.isMissing).map((file) => file.id)));
      setVariants(Object.fromEntries(next.files.map((file) => [file.id, "neutral"])));
      if (project.workspaceRoot) setDestination(project.workspaceRoot + "\\Handoffs");
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }, [project.id, project.workspaceRoot]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCount = selectedIds.size + Number(includeProject);
  const canExport = Boolean(settings && destination && selectedCount > 0 && !busy);
  const missingRequirement = !destination
    ? "Elige una carpeta de destino para continuar."
    : selectedCount === 0
      ? "Selecciona al menos un archivo para el paquete."
      : null;
  const availableFiles = useMemo(
    () => preview?.files.filter((file) => !file.isMissing) ?? [],
    [preview],
  );

  const chooseDestination = async () => {
    try {
      const path = await selectHandoffDestination();
      if (path) setDestination(path);
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo elegir el destino", description: errorMessage(cause) });
    }
  };

  const exportPackage = async () => {
    if (!settings || !canExport) return;
    setBusy(true);
    setResult(null);
    try {
      const exported = await createHandoff(project.id, {
        settings: {
          ...settings,
          plugins: plugins.split(",").map((item) => item.trim()).filter(Boolean),
        },
        selections: availableFiles
          .filter((file) => selectedIds.has(file.id))
          .map((file) => ({ fileId: file.id, variant: variants[file.id] ?? "neutral" })),
        includeProjectFile: includeProject,
        destinationParent: destination,
      });
      setResult(exported);
      pushToast({
        kind: "success",
        title: "Handoff ZIP preparado",
        description: "El archivo ZIP se creó sin modificar los originales.",
      });
      setPreview((current) => current ? { ...current, nextVersion: current.nextVersion + 1 } : current);
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo crear el Handoff", description: errorMessage(cause) });
    } finally {
      setBusy(false);
    }
  };
  const openResult = async () => {
    if (!result) return;
    try {
      await openHandoffDestination(project.id, result.destinationPath);
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo abrir el paquete", description: errorMessage(cause) });
    }
  };


  if (error) return <div role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-100/80">{error}</div>;
  if (!preview || !settings) {
    return (
      <div role="status" aria-live="polite" className="grid min-h-64 place-items-center text-sm text-stone-400">
        <span className="inline-flex items-center gap-3"><LoaderCircle aria-hidden="true" className="size-5 animate-spin text-orange-300 motion-reduce:animate-none" />Cargando configuración del Handoff…</span>
      </div>
    );
  }

  const hasSidebar = preview.warnings.length > 0 || Boolean(result);

  return (
    <div className="pt-5">
      <header className="max-w-3xl">
        <p className="text-xs font-medium text-orange-300">Intercambio entre DAWs</p>
        <h2 className="mt-2 text-xl font-semibold text-stone-100">Universal Handoff</h2>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          Crea un único archivo ZIP portable y verificable. No convierte el proyecto ni promete conservar routing, plugins o automatización.
        </p>
      </header>

      <div className={["mt-6 grid items-start gap-7", hasSidebar ? "lg:grid-cols-[minmax(0,1fr)_19rem]" : ""].join(" ")}>
        <div className="space-y-7">
          <section aria-labelledby="handoff-context">
            <h3 id="handoff-context" className="text-sm font-medium text-stone-300">Contexto para el colaborador</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Versión del DAW · Opcional" htmlFor="handoff-daw-version">
                <input id="handoff-daw-version" value={settings.dawVersion ?? ""} maxLength={80} placeholder="FL Studio 2025.1" onChange={(event) => setSettings({ ...settings, dawVersion: event.currentTarget.value || null })} className={inputClass} />
              </Field>
              <Field label="Compás" htmlFor="handoff-signature">
                <input id="handoff-signature" value={settings.timeSignature} maxLength={16} placeholder="4/4" onChange={(event) => setSettings({ ...settings, timeSignature: event.currentTarget.value })} className={inputClass} />
              </Field>
              <Field label="Punto de inicio común" htmlFor="handoff-start" hint="Todos los stems deben comenzar aquí.">
                <input id="handoff-start" value={settings.commonStart} maxLength={32} placeholder="00:00:00.000" onChange={(event) => setSettings({ ...settings, commonStart: event.currentTarget.value })} className={inputClass} />
              </Field>
              <Field label="Plugins · Opcional" htmlFor="handoff-plugins" hint="Separados por comas.">
                <input id="handoff-plugins" value={plugins} placeholder="Serum, Pro-Q 3, Valhalla VintageVerb" onChange={(event) => setPlugins(event.currentTarget.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Notas para el colaborador · Opcional" htmlFor="handoff-notes">
              <textarea id="handoff-notes" value={settings.collaboratorNotes ?? ""} maxLength={5000} rows={4} placeholder="Qué falta, decisiones creativas y detalles importantes…" onChange={(event) => setSettings({ ...settings, collaboratorNotes: event.currentTarget.value || null })} className={inputClass + " h-auto resize-y py-3 leading-6"} />
            </Field>
          </section>

          <section className="border-t border-white/[0.07] pt-6" aria-labelledby="handoff-files">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 id="handoff-files" className="text-sm font-medium text-stone-300">Contenido del paquete</h3>
                <p className="mt-1 text-xs text-stone-400">{selectedCount} {selectedCount === 1 ? "elemento seleccionado" : "elementos seleccionados"}</p>
              </div>
              <button type="button" onClick={() => setSelectedIds(selectedIds.size === availableFiles.length ? new Set() : new Set(availableFiles.map((file) => file.id)))} className="min-h-10 rounded-lg px-3 text-xs text-stone-400 transition hover:bg-white/[0.04] hover:text-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">
                {selectedIds.size === availableFiles.length ? "Deseleccionar archivos" : "Seleccionar disponibles"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.07]">
              <label className="flex cursor-pointer items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
                <input type="checkbox" checked={includeProject} disabled={project.sourceKind === "managed_pending"} onChange={(event) => setIncludeProject(event.currentTarget.checked)} className="size-4 accent-orange-500" />
                <FileArchive className="size-4 text-stone-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-stone-300">Proyecto original de {project.daw}</span>
                  <span className="mt-0.5 block text-xs text-stone-400">{project.sourceKind === "managed_pending" ? "Pendiente del primer guardado" : project.originalName}</span>
                </span>
              </label>
              {preview.files.length === 0 ? (
                <div className="p-8 text-center text-sm text-stone-400">Asocia stems, mezclas o referencias desde Audio y archivos.</div>
              ) : (
                <div className="divide-y divide-white/[0.055]">
                  {preview.files.map((file) => (
                    <div key={file.id} className={["flex flex-wrap items-center gap-3 px-4 py-3", file.isMissing ? "opacity-45" : "hover:bg-white/[0.02]"].join(" ")}>
                      <input aria-label={"Incluir " + file.fileName} type="checkbox" checked={selectedIds.has(file.id)} disabled={file.isMissing} onChange={(event) => setSelectedIds((current) => {
                        const next = new Set(current);
                        if (event.currentTarget.checked) next.add(file.id); else next.delete(file.id);
                        return next;
                      })} className="size-4 accent-orange-500" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-stone-300">{file.fileName}</p>
                        <p className="mt-0.5 text-xs text-stone-400">{categoryLabel(file.category)}{file.isMissing ? " · No encontrado" : ""}</p>
                      </div>
                      {variantCategories.has(file.category) ? (
                        <div className="w-36">
                          <Select ariaLabel={"Variante de " + file.fileName} disabled={!selectedIds.has(file.id) || file.isMissing} value={variants[file.id] ?? "neutral"} options={variantOptions} onChange={(value) => setVariants({ ...variants, [file.id]: value as "wet" | "dry" | "neutral" })} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-white/[0.07] pt-6" aria-labelledby="handoff-destination">
            <h3 id="handoff-destination" className="text-sm font-medium text-stone-300">Carpeta donde guardar el ZIP · Requerido</h3>
            <div className="mt-3 flex gap-2">
              <input value={destination} readOnly aria-label="Carpeta donde guardar el ZIP" placeholder="Selecciona dónde guardar el archivo ZIP" className={inputClass + " min-w-0 flex-1 cursor-default"} />
              <button type="button" disabled={busy} onClick={() => void chooseDestination()} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 text-xs text-stone-300 transition hover:border-orange-400/25 hover:bg-orange-400/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400">
                <FolderOpen className="size-4" /> Elegir
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p id="handoff-export-help" className="max-w-lg text-xs leading-5 text-stone-400">{missingRequirement ?? "El ZIP incluirá Project Info.json, README.pdf, Checksums.sha256 y los archivos seleccionados."}</p>
              <button type="button" aria-describedby="handoff-export-help" disabled={!canExport} onClick={() => void exportPackage()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-stone-950 transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-40">
                {busy ? <LoaderCircle className="size-4 animate-spin" /> : <PackageOpen className="size-4" />}
                {busy ? "Comprimiendo ZIP…" : "Crear ZIP v" + preview.nextVersion}
              </button>
            </div>
          </section>
        </div>

        {hasSidebar ? (
          <aside className="space-y-4 lg:sticky lg:top-6">
            {preview.warnings.length ? (
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-4">
              <h3 className="flex items-center gap-2 text-xs font-medium text-amber-200"><AlertTriangle className="size-4" /> Antes de compartir</h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-amber-100/55">{preview.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul>
            </div>
          ) : null}

            {result ? (
            <div role="status" className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4">
              <PackageCheck className="size-5 text-emerald-300" />
              <h3 className="mt-3 text-sm font-medium text-emerald-100">Handoff ZIP v{result.versionNumber} listo</h3>
              <p className="mt-1 text-xs leading-5 text-emerald-100/55">{result.fileCount} archivos comprimidos y verificados.</p>
              <button type="button" onClick={() => void openResult()} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300/15 px-3 text-xs text-emerald-200 hover:bg-emerald-300/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300">
                <FileArchive className="size-3.5" /> Mostrar archivo ZIP
              </button>
            </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-2 block text-xs font-medium text-stone-300">{label}</label>{children}{hint ? <p className="mt-1.5 text-xs text-stone-400">{hint}</p> : null}</div>;
}

function categoryLabel(category: string) {
  return ({ stem: "Stem", mix: "Mezcla", master: "Master", preview: "Preview", reference: "Referencia", artwork: "Artwork", midi: "MIDI", preset: "Preset", sample: "Sample", other: "Otro" } as Record<string, string>)[category] ?? category;
}
