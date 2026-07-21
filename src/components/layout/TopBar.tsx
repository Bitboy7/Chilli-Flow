import {
  FilePlus2,
  FolderPlus,
  LayoutGrid,
  List,
  ScanSearch,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

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
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const isFiltersOpen = useUiStore((state) => state.isFiltersOpen);
  const toggleFilters = useUiStore((state) => state.toggleFilters);
  const addSelectedFolder = useFoldersStore((state) => state.addSelected);
  const isScanning = useScanStore((state) => state.isScanning);
  const startScan = useScanStore((state) => state.start);
  const pushToast = useToastStore((state) => state.push);
  const pageTitle = pageTitles[pathname] ?? "Chilli Flow";
  const searchInput = useRef<HTMLInputElement>(null);
  const isProjectRoute = [
    "/library",
    "/favorites",
    "/recent",
    "/daws",
    "/statuses",
  ].includes(pathname);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (isProjectRoute && (event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [isProjectRoute]);

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
          ref={searchInput}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
          disabled={!isProjectRoute}
          placeholder={
            isProjectRoute ? "Buscar por nombre…" : "Buscar proyectos"
          }
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-600 disabled:cursor-not-allowed"
        />
        <kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[0.6rem] text-stone-600 xl:block">
          Ctrl K
        </kbd>
      </label>

      <button
        type="button"
        onClick={toggleFilters}
        disabled={!isProjectRoute}
        title="Mostrar u ocultar filtros"
        className={[
          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition disabled:cursor-not-allowed disabled:opacity-40",
          isFiltersOpen && isProjectRoute
            ? "border-orange-400/20 bg-orange-400/10 text-orange-200"
            : "border-white/[0.07] text-stone-500 hover:bg-white/[0.04] hover:text-stone-200",
        ].join(" ")}
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
        title={isScanning ? "Escaneando carpetas" : "Escanear carpetas"}
        aria-label={isScanning ? "Escaneando carpetas" : "Escanear carpetas"}
        className="group hidden size-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-stone-400 transition duration-200 hover:border-white/[0.15] hover:bg-white/[0.055] hover:text-stone-100 active:scale-95 disabled:cursor-wait disabled:text-orange-300 disabled:opacity-70 md:inline-grid"
      >
        <ScanSearch className={["size-4.5 transition-transform duration-200 group-hover:scale-105", isScanning ? "animate-pulse" : ""].join(" ")} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => void handleImport()}
        disabled={isScanning}
        title="Importar carpeta"
        aria-label="Importar carpeta"
        className="group inline-grid size-11 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-stone-400 transition duration-200 hover:border-white/[0.15] hover:bg-white/[0.055] hover:text-stone-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FolderPlus className="size-4.5 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
      </button>
      <Link
        to="/projects/new"
        title="Crear nuevo proyecto"
        aria-label="Crear nuevo proyecto"
        className="group inline-grid size-11 shrink-0 place-items-center rounded-xl bg-orange-500 text-stone-950 transition duration-200 hover:bg-orange-400 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
      >
        <FilePlus2 className="size-4.5 transition-transform duration-200 group-hover:scale-105" aria-hidden="true" />
      </Link>
    </header>
  );
}
