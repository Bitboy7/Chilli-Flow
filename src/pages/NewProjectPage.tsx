import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileStack,
  FolderOpen,
  FolderTree,
  HardDrive,
  LoaderCircle,
  Music4,
  PackageOpen,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Select } from "../components/ui/Select";
import { openProject } from "../services/project-service";
import {
  createWorkspace,
  listDawInstallations,
  selectWorkspaceParent,
  selectWorkspaceTemplate,
} from "../services/workspace-service";
import { useToastStore } from "../stores/toast-store";
import type { DawInstallation } from "../types/projects";
import { errorMessage } from "../utils/errors";

const folders = [
  "Project Files",
  "Audio / Stems",
  "Audio / Mixes",
  "Audio / Masters",
  "MIDI",
  "References",
  "Artwork",
  "Handoffs",
];

export function NewProjectPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const [installations, setInstallations] = useState<DawInstallation[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [name, setName] = useState("");
  const [parentDirectory, setParentDirectory] = useState("");
  const [templatePath, setTemplatePath] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listDawInstallations()
      .then((items) => {
        const sorted = [...items].sort((left, right) =>
          Number(right.installed) - Number(left.installed)
          || left.daw.localeCompare(right.daw, "es"),
        );
        setInstallations(sorted);
        const initial = sorted.find((item) => item.installed) ?? sorted[0];
        if (initial) setSelectedValue(valueFor(initial));
      })
      .catch((cause) => {
        pushToast({
          kind: "error",
          title: "No se pudieron detectar los DAWs",
          description: errorMessage(cause),
        });
      })
      .finally(() => setDetecting(false));
  }, [pushToast]);

  const selected = useMemo(
    () => installations.find((item) => valueFor(item) === selectedValue) ?? null,
    [installations, selectedValue],
  );
  const canCreate = name.trim().length > 0 && parentDirectory.length > 0 && selected !== null && !busy;

  const chooseParent = async () => {
    try {
      const selectedPath = await selectWorkspaceParent();
      if (selectedPath) setParentDirectory(selectedPath);
    } catch (cause) {
      pushToast({
        kind: "error",
        title: "No se pudo elegir la ubicación",
        description: errorMessage(cause),
      });
    }
  };

  const chooseTemplate = async () => {
    if (!selected) return;
    try {
      const selectedPath = await selectWorkspaceTemplate(selected.extension);
      if (selectedPath) setTemplatePath(selectedPath);
    } catch (cause) {
      pushToast({
        kind: "error",
        title: "No se pudo elegir la plantilla",
        description: errorMessage(cause),
      });
    }
  };

  const submit = async () => {
    if (!canCreate || !selected) return;
    setBusy(true);
    try {
      const project = await createWorkspace({
        name: name.trim(),
        daw: selected.daw,
        extension: selected.extension,
        parentDirectory,
        templatePath,
      });
      window.dispatchEvent(new Event("chilli:library-changed"));
      pushToast({
        kind: "success",
        title: "Workspace creado",
        description: templatePath
          ? "La plantilla se copió como proyecto inicial."
          : "Guarda el primer archivo del DAW dentro de Project Files.",
      });
      if (selected.installed || templatePath) {
        try {
          await openProject(project.id);
        } catch (cause) {
          pushToast({
            kind: "error",
            title: "El workspace se creó, pero el DAW no pudo abrirse",
            description: errorMessage(cause),
          });
        }
      }
      navigate("/projects/" + project.id);
    } catch (cause) {
      pushToast({
        kind: "error",
        title: "No se pudo crear el workspace",
        description: errorMessage(cause),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <Link
        to="/library"
        className="inline-flex min-h-10 items-center gap-2 text-xs text-stone-500 transition hover:text-stone-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        <ArrowLeft className="size-3.5" /> Volver a la biblioteca
      </Link>

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-100">Nuevo proyecto</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Prepara un workspace consistente para cualquier DAW sin fabricar archivos propietarios.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className="space-y-7"
        >
          <fieldset disabled={busy} className="space-y-5">
            <legend className="text-sm font-medium text-stone-300">Identidad del proyecto</legend>
            <Field label="Nombre del proyecto" htmlFor="workspace-name">
              <input
                id="workspace-name"
                value={name}
                onChange={(event) => setName(event.currentTarget.value)}
                maxLength={120}
                autoFocus
                placeholder="Midnight Drive"
                className={inputClass}
              />
            </Field>

            <div>
              <label className="mb-2 block text-xs font-medium text-stone-400">DAW</label>
              {detecting ? (
                <div className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 text-xs text-stone-500">
                  <LoaderCircle className="size-4 animate-spin text-orange-300" /> Detectando instalaciones…
                </div>
              ) : (
                <Select
                  ariaLabel="DAW del proyecto"
                  value={selectedValue}
                  onChange={(value) => {
                    setSelectedValue(value);
                    setTemplatePath(null);
                  }}
                  options={installations.map((item) => ({
                    value: valueFor(item),
                    label: item.daw + " · " + item.extension + (item.installed ? " · Instalado" : " · No detectado"),
                  }))}
                />
              )}
              <div className="mt-2 flex items-center gap-2 text-[0.68rem]">
                <span className={selected?.installed ? "text-lime-400" : "text-amber-300"}>
                  {selected?.installed ? "Instalación detectada" : "Puedes continuar y abrir el DAW manualmente"}
                </span>
                {selected?.executablePath ? (
                  <span className="truncate text-stone-700" title={selected.executablePath}>
                    {selected.executablePath}
                  </span>
                ) : null}
              </div>
            </div>
          </fieldset>

          <fieldset disabled={busy} className="space-y-5 border-t border-white/[0.07] pt-7">
            <legend className="text-sm font-medium text-stone-300">Ubicación y punto de partida</legend>
            <Field label="Guardar workspace en" htmlFor="workspace-parent">
              <div className="flex gap-2">
                <input
                  id="workspace-parent"
                  value={parentDirectory}
                  readOnly
                  placeholder="Selecciona una carpeta"
                  className={inputClass + " cursor-default"}
                />
                <button type="button" onClick={() => void chooseParent()} className={secondaryButton}>
                  <FolderOpen className="size-4" /> Elegir
                </button>
              </div>
            </Field>

            <Field label="Plantilla del DAW" hint="Opcional. Se copia; el archivo original nunca se modifica.">
              <div className="flex gap-2">
                <div className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-stone-500">
                  <span className="truncate">{templatePath ? lastSegment(templatePath) : "Comenzar sin plantilla"}</span>
                </div>
                <button type="button" onClick={() => void chooseTemplate()} disabled={!selected} className={secondaryButton}>
                  <FileStack className="size-4" /> Elegir
                </button>
                {templatePath ? (
                  <button
                    type="button"
                    onClick={() => setTemplatePath(null)}
                    className="h-11 rounded-xl px-3 text-xs text-stone-500 hover:bg-white/[0.04] hover:text-stone-200"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </Field>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6">
            <p className="max-w-md text-xs leading-5 text-stone-600">
              Si comienzas sin plantilla, el proyecto aparecerá como pendiente hasta que guardes el primer archivo dentro de Project Files.
            </p>
            <button
              type="submit"
              disabled={!canCreate}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-stone-950 transition hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : selected?.installed || templatePath ? <ExternalLink className="size-4" /> : <Sparkles className="size-4" />}
              {busy ? "Creando workspace…" : selected?.installed || templatePath ? "Crear y abrir" : "Crear workspace"}
            </button>
          </div>
        </form>

        <aside className="border-t border-white/[0.07] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0" aria-label="Estructura que se creará">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-orange-400/10 text-orange-300">
              <FolderTree className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-stone-300">Workspace neutral</h2>
              <p className="mt-0.5 text-xs text-stone-600">Preparado para organizar y compartir.</p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/15">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="truncate text-xs font-medium text-stone-300">{name.trim() || "Nombre del proyecto"}</p>
              <p className="mt-1 truncate text-[0.62rem] text-stone-600">{parentDirectory || "Ubicación pendiente"}</p>
            </div>
            <ul className="divide-y divide-white/[0.055]">
              {folders.map((folder) => (
                <li key={folder} className="flex items-center gap-3 px-4 py-2.5">
                  <Check className="size-3.5 text-lime-400" />
                  <span className="text-xs text-stone-400">{folder}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 px-4 py-2.5">
                <PackageOpen className="size-3.5 text-sky-400" />
                <span className="text-xs text-stone-400">Project Info.json</span>
              </li>
            </ul>
          </div>

          <div className="mt-5 flex gap-3 text-xs leading-5 text-stone-600">
            <HardDrive className="mt-0.5 size-4 shrink-0 text-stone-500" />
            Chilli Beat crea carpetas y copia la plantilla cuando corresponde. No mueve archivos existentes.
          </div>
          <div className="mt-3 flex gap-3 text-xs leading-5 text-stone-600">
            <Music4 className="mt-0.5 size-4 shrink-0 text-stone-500" />
            El primer guardado se reconocerá durante el siguiente escaneo.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-medium text-stone-400">{label}</label>
      {children}
      {hint ? <p className="mt-2 text-[0.68rem] text-stone-600">{hint}</p> : null}
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-600 transition hover:border-orange-400/25 focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/10 disabled:opacity-40";
const secondaryButton = "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 text-xs text-stone-400 transition hover:border-orange-400/25 hover:bg-orange-400/[0.05] hover:text-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-40";

function valueFor(item: DawInstallation) {
  return item.daw + "|" + item.extension;
}

function lastSegment(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}
