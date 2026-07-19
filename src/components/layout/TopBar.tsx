import {
  FolderPlus,
  LayoutGrid,
  List,
  ScanSearch,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useLocation } from "react-router-dom";

import { useFoldersStore } from "../../stores/folders-store";
import { useScanStore } from "../../stores/scan-store";
import { useToastStore } from "../../stores/toast-store";
import { useUiStore, type LibraryView } from "../../stores/ui-store";
import { errorMessage } from "../../utils/errors";
import { pageTitles } from "./navigation";

function ViewButton({
  label,
  view,
  currentView,
  onSelect,
  children,
}: {
  label: string;
  view: LibraryView;
  currentView: LibraryView;
  onSelect: (view: LibraryView) => void;
  children: React.ReactNode;
}) {
  const isActive = view === currentView;

  return (
    <button
      type="button"
      onClick={() => onSelect(view)}
      className={[
        "grid size-8 place-items-center rounded-lg transition",
        isActive
          ? "bg-white/10 text-stone-100"
          : "text-stone-500 hover:text-stone-200",
      ].join(" ")}
      aria-label={label}
      aria-pressed={isActive}
    >
      {children}
    </button>
  );
}

export function TopBar() {
  const { pathname } = useLocation();
  const libraryView = useUiStore((state) => state.libraryView);
  const setLibraryView = useUiStore((state) => state.setLibraryView);
  const addSelectedFolder = useFoldersStore((state) => state.addSelected);
  const isScanning = useScanStore((state) => state.isScanning);
  const startScan = useScanStore((state) => state.start);
  const pushToast = useToastStore((state) => state.push);
  const pageTitle = pageTitles[pathname] ?? "Chilli Beat";

  const handleScan = async () => {
    try {
      await startScan();
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo iniciar el escaneo",
        description: errorMessage(error),
      });
    }
  };

  const handleImport = async () => {
    try {
      const folder = await addSelectedFolder();
      if (folder) {
        pushToast({
          kind: "success",
          title: "Carpeta agregada",
          description: "Puedes iniciar el escaneo cuando estés listo.",
        });
      }
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo agregar la carpeta",
        description: errorMessage(error),
      });
    }
  };

  return (
    <header className="flex min-h-[4.5rem] flex-wrap items-center gap-3 border-b border-white/[0.06] bg-[#171513]/90 px-5 py-3 backdrop-blur-xl lg:flex-nowrap lg:px-7">
      <div className="mr-auto min-w-36">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-orange-400/70">
          Workspace
        </p>
        <h1 className="text-lg font-semibold tracking-tight text-stone-100">
          {pageTitle}
        </h1>
      </div>

      <label className="order-3 flex h-10 w-full items-center gap-2.5 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-stone-600 lg:order-none lg:max-w-sm">
        <Search className="size-4 shrink-0" />
        <input
          type="search"
          disabled
          placeholder="Buscar proyectos · Fase 3"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-600 disabled:cursor-not-allowed"
        />
        <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[0.6rem] text-stone-600 xl:block">
          Ctrl K
        </kbd>
      </label>

      <button
        type="button"
        disabled
        title="Disponible en la Fase 3"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.07] px-3 text-xs text-stone-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <SlidersHorizontal className="size-3.5" />
        <span className="hidden xl:inline">Filtros</span>
      </button>

      <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
        <ViewButton
          label="Vista de tarjetas"
          view="grid"
          currentView={libraryView}
          onSelect={setLibraryView}
        >
          <LayoutGrid className="size-4" />
        </ViewButton>
        <ViewButton
          label="Vista de tabla"
          view="table"
          currentView={libraryView}
          onSelect={setLibraryView}
        >
          <List className="size-4" />
        </ViewButton>
      </div>

      <button
        type="button"
        onClick={() => void handleScan()}
        disabled={isScanning}
        title="Escanear todas las carpetas activas"
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.07] px-3 text-xs text-stone-400 transition hover:bg-white/[0.04] hover:text-stone-100 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex"
      >
        <ScanSearch className="size-3.5" />
        Escanear
      </button>
      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={isScanning}
        title="Seleccionar una carpeta"
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-3.5 text-xs font-semibold text-stone-950 shadow-[0_6px_24px_rgba(249,115,22,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FolderPlus className="size-3.5" />
        <span className="hidden sm:inline">Importar carpeta</span>
      </button>
    </header>
  );
}
