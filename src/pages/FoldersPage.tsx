import {
  CircleAlert,
  Folder,
  FolderPlus,
  FolderSearch2,
  HardDrive,
  LoaderCircle,
  ScanSearch,
  Trash2,
} from "lucide-react";
import { useEffect } from "react";

import { useFoldersStore } from "../stores/folders-store";
import { useScanStore } from "../stores/scan-store";
import { useToastStore } from "../stores/toast-store";
import type { WatchedFolder } from "../types/folders";
import { formatDate } from "../utils/dates";
import { errorMessage } from "../utils/errors";

function FolderCard({ folder }: { folder: WatchedFolder }) {
  const setEnabled = useFoldersStore((state) => state.setEnabled);
  const remove = useFoldersStore((state) => state.remove);
  const isScanning = useScanStore((state) => state.isScanning);
  const startScan = useScanStore((state) => state.start);
  const pushToast = useToastStore((state) => state.push);

  const handleToggle = async () => {
    try {
      await setEnabled(folder.id, !folder.isEnabled);
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo actualizar la carpeta",
        description: errorMessage(error),
      });
    }
  };

  const handleScan = async () => {
    try {
      await startScan(folder.id);
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo iniciar el escaneo",
        description: errorMessage(error),
      });
    }
  };

  const handleRemove = async () => {
    const confirmed = window.confirm(
      "¿Dejar de supervisar esta carpeta? Los proyectos ya indexados permanecerán en la biblioteca.",
    );
    if (!confirmed) {
      return;
    }

    try {
      await remove(folder.id);
      pushToast({
        kind: "success",
        title: "Carpeta eliminada",
        description: "No se eliminó ni movió ningún archivo del disco.",
      });
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo eliminar la carpeta",
        description: errorMessage(error),
      });
    }
  };

  return (
    <article
      className={[
        "rounded-2xl border p-4 transition",
        folder.isEnabled
          ? "border-white/[0.08] bg-white/[0.025]"
          : "border-white/[0.05] bg-black/10 opacity-65",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-orange-400/10 bg-orange-400/[0.06] text-orange-300">
          <Folder className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium text-stone-200"
            title={folder.folderPath}
          >
            {folder.folderPath}
          </p>
          <p className="mt-1 text-xs text-stone-600">
            Último escaneo: {formatDate(folder.lastScannedAt)}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={folder.isEnabled}
          onClick={() => void handleToggle()}
          className={[
            "relative h-6 w-11 shrink-0 rounded-full transition",
            folder.isEnabled ? "bg-orange-500" : "bg-stone-700",
          ].join(" ")}
          aria-label={
            folder.isEnabled ? "Desactivar supervisión" : "Activar supervisión"
          }
        >
          <span
            className={[
              "absolute top-1 size-4 rounded-full bg-white shadow transition-[left]",
              folder.isEnabled ? "left-6" : "left-1",
            ].join(" ")}
          />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span
          className={[
            "inline-flex items-center gap-1.5 text-[0.68rem] font-medium",
            folder.isEnabled ? "text-lime-400/80" : "text-stone-600",
          ].join(" ")}
        >
          <span
            className={[
              "size-1.5 rounded-full",
              folder.isEnabled ? "bg-lime-400" : "bg-stone-600",
            ].join(" ")}
          />
          {folder.isEnabled ? "Supervisión activa" : "Pausada"}
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={!folder.isEnabled || isScanning}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs text-stone-400 transition hover:bg-white/[0.05] hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ScanSearch className="size-3.5" />
            Escanear
          </button>
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={isScanning}
            className="grid size-8 place-items-center rounded-lg text-stone-600 transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Eliminar carpeta supervisada"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

export function FoldersPage() {
  const folders = useFoldersStore((state) => state.folders);
  const isLoading = useFoldersStore((state) => state.isLoading);
  const load = useFoldersStore((state) => state.load);
  const addSelected = useFoldersStore((state) => state.addSelected);
  const error = useFoldersStore((state) => state.error);
  const isScanning = useScanStore((state) => state.isScanning);
  const pushToast = useToastStore((state) => state.push);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    try {
      const folder = await addSelected();
      if (folder) {
        pushToast({
          kind: "success",
          title: "Carpeta supervisada",
          description: "El escaneo solo comenzará cuando lo solicites.",
        });
      }
    } catch (addError) {
      pushToast({
        kind: "error",
        title: "No se pudo agregar la carpeta",
        description: errorMessage(addError),
      });
    }
  };

  const activeFolders = folders.filter((folder) => folder.isEnabled).length;

  return (
    <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-400/70">
            Fuentes de la biblioteca
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-100">
            Carpetas supervisadas
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            Chilli Beat solo recorre las carpetas elegidas aquí. Nunca mueve,
            renombra ni elimina sus archivos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={isScanning}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FolderPlus className="size-4" />
          Agregar carpeta
        </button>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <HardDrive className="size-4 text-orange-300" />
          <p className="mt-3 text-2xl font-semibold text-stone-100">
            {folders.length}
          </p>
          <p className="text-xs text-stone-600">Carpetas registradas</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <FolderSearch2 className="size-4 text-lime-400" />
          <p className="mt-3 text-2xl font-semibold text-stone-100">
            {activeFolders}
          </p>
          <p className="text-xs text-stone-600">Incluidas en “Escanear todo”</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <ScanSearch className="size-4 text-sky-400" />
          <p className="mt-3 text-sm font-medium text-stone-300">
            Manual y cancelable
          </p>
          <p className="mt-2 text-xs text-stone-600">Sin escaneos automáticos</p>
        </div>
      </section>

      {error ? (
        <div className="mt-5 flex gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-4">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-300" />
          <p className="text-sm text-red-100/70">{error}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 py-14 text-sm text-stone-600">
          <LoaderCircle className="size-4 animate-spin" />
          Cargando carpetas…
        </div>
      ) : folders.length === 0 ? (
        <section className="mt-6 rounded-3xl border border-dashed border-white/[0.09] bg-black/10 px-6 py-14 text-center">
          <FolderPlus className="mx-auto size-7 text-stone-600" />
          <h3 className="mt-4 text-base font-medium text-stone-300">
            Aún no supervisas ninguna carpeta
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Selecciona una carpeta concreta que contenga proyectos musicales.
            Las raíces completas de disco se rechazan por seguridad.
          </p>
        </section>
      ) : (
        <section className="mt-6 grid gap-3 lg:grid-cols-2">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </section>
      )}
    </div>
  );
}
