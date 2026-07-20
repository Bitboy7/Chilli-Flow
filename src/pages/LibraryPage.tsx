import {
  CircleAlert,
  FolderKanban,
  LibraryBig,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { ProjectCard } from "../features/projects/ProjectCard";
import {
  ProjectFilters,
  ProjectSortControls,
} from "../features/projects/ProjectFilters";
import { ProjectPagination } from "../features/projects/ProjectPagination";
import { ProjectTable } from "../features/projects/ProjectTable";
import { useAppStatus } from "../hooks/use-app-status";
import { useDebouncedValue } from "../hooks/use-debounced-value";
import { useProjectsStore } from "../stores/projects-store";
import { useUiStore } from "../stores/ui-store";

export type LibraryScope =
  | "library"
  | "favorites"
  | "recent"
  | "daws"
  | "statuses";

const copy: Record<LibraryScope, { title: string; description: string }> = {
  library: {
    title: "Todos los proyectos",
    description: "Tu producción local, organizada y lista para continuar.",
  },
  favorites: {
    title: "Favoritos",
    description: "Los proyectos que marcaste para volver a ellos rápidamente.",
  },
  recent: {
    title: "Proyectos recientes",
    description: "Continúa desde las sesiones modificadas más recientemente.",
  },
  daws: {
    title: "Explorar por DAW",
    description: "Concentra la biblioteca en una herramienta concreta.",
  },
  statuses: {
    title: "Explorar por estado",
    description: "Revisa cada producción según su etapa actual.",
  },
};

function LibrarySkeleton({ table }: { table: boolean }) {
  if (table) {
    return (
      <div className="space-y-2 rounded-xl border border-white/[0.06] p-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-lg bg-white/[0.035]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.025]" />
      ))}
    </div>
  );
}

export function LibraryPage({ scope = "library" }: { scope?: LibraryScope }) {
  const { status, error: statusError, isLoading: isStatusLoading } = useAppStatus();
  const query = useProjectsStore((state) => state.query);
  const items = useProjectsStore((state) => state.items);
  const total = useProjectsStore((state) => state.total);
  const isLoading = useProjectsStore((state) => state.isLoading);
  const error = useProjectsStore((state) => state.error);
  const updateQuery = useProjectsStore((state) => state.updateQuery);
  const resetFilters = useProjectsStore((state) => state.resetFilters);
  const load = useProjectsStore((state) => state.load);
  const loadFacets = useProjectsStore((state) => state.loadFacets);
  const libraryView = useUiStore((state) => state.libraryView);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const setFiltersOpen = useUiStore((state) => state.setFiltersOpen);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const pageCopy = copy[scope];

  useEffect(() => {
    if (scope === "favorites") {
      updateQuery({ favoriteOnly: true });
    } else if (scope === "recent") {
      updateQuery({ favoriteOnly: false, sortBy: "modified", sortDirection: "desc" });
    } else {
      updateQuery({ favoriteOnly: false });
    }
    if (scope === "daws" || scope === "statuses") setFiltersOpen(true);
  }, [scope, setFiltersOpen, updateQuery]);

  useEffect(() => {
    if (scope === "favorites" && !query.favoriteOnly) updateQuery({ favoriteOnly: true });
  }, [query.favoriteOnly, scope, updateQuery]);

  useEffect(() => {
    updateQuery({ search: debouncedSearch.trim() || null });
  }, [debouncedSearch, updateQuery]);

  useEffect(() => {
    void load();
  }, [load, query]);

  useEffect(() => {
    void loadFacets();
    const refresh = () => {
      void load();
      void loadFacets();
    };
    window.addEventListener("chilli:library-changed", refresh);
    return () => window.removeEventListener("chilli:library-changed", refresh);
  }, [load, loadFacets]);

  const activeFilterCount = [
    query.daw,
    query.extension,
    query.status,
    query.genre,
    query.tagId,
    query.favoriteOnly,
    query.search,
  ].filter(Boolean).length;
  const hasIndexedProjects = (status?.projectCount ?? 0) > 0 || total > 0;
  const clearFilters = () => {
    resetFilters();
    setSearchQuery("");
  };

  return (
    <div className="mx-auto w-full max-w-[96rem] p-5 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-100">{pageCopy.title}</h2>
          <p className="mt-1 text-sm text-stone-400">{pageCopy.description}</p>
        </div>
        <div className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/[0.025] px-3 text-xs text-stone-400">
          <FolderKanban className="size-4 text-orange-300" />
          {isStatusLoading ? "Consultando carpetas…" : (status?.watchedFolderCount ?? 0) + " carpetas activas"}
        </div>
      </header>

      <ProjectFilters />

      {statusError ? (
        <section role="status" className="mt-4 flex gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="text-xs leading-5 text-amber-100/75">{statusError}</p>
        </section>
      ) : null}

      <section className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-stone-200">
              {total === 1 ? "1 proyecto" : total + " proyectos"}
            </h3>
            <p className="mt-1 text-xs text-stone-400">
              Página {query.page}
              {activeFilterCount > 0 ? " · " + activeFilterCount + " filtros activos" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProjectSortControls />
            {error ? (
              <button type="button" onClick={() => void load()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs text-stone-300 hover:bg-white/[0.04]">
                <RefreshCw className="size-3.5" /> Reintentar
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <LibrarySkeleton table={libraryView === "table"} />
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-400/15 bg-red-400/[0.05] p-6 text-center">
            <CircleAlert className="mx-auto size-5 text-red-300" />
            <p className="mt-3 text-sm font-medium text-red-100/85">No se pudo consultar la biblioteca</p>
            <p className="mt-1 text-xs text-red-100/65">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.09] bg-black/10 px-6 py-10 text-center">
            {hasIndexedProjects || activeFilterCount > 0 ? (
              <>
                <SearchX className="mx-auto size-7 text-stone-500" />
                <h3 className="mt-4 text-base font-medium text-stone-200">Ningún proyecto coincide</h3>
                <p className="mt-2 text-sm text-stone-400">Ajusta la búsqueda o restablece los filtros.</p>
                <button type="button" onClick={clearFilters} className="mt-5 h-11 rounded-xl border border-white/[0.08] px-4 text-xs text-stone-300 hover:bg-white/[0.04]">
                  Restablecer filtros
                </button>
              </>
            ) : (
              <>
                <LibraryBig className="mx-auto size-7 text-stone-500" />
                <h3 className="mt-4 text-base font-medium text-stone-200">Tu biblioteca está lista para comenzar</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-400">
                  Agrega una carpeta y ejecuta un escaneo manual para indexar proyectos reales.
                </p>
                <Link to="/folders" className="mt-5 inline-flex h-11 items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-xs font-medium text-stone-200 hover:bg-white/[0.07]">
                  Gestionar carpetas
                </Link>
              </>
            )}
          </div>
        ) : libraryView === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        ) : (
          <ProjectTable projects={items} />
        )}

        {!isLoading && !error ? <ProjectPagination /> : null}
      </section>
    </div>
  );
}
