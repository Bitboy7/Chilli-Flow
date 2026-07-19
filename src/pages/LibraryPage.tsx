import {
  CircleAlert,
  Database,
  FolderKanban,
  LibraryBig,
  Music2,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";

import { ProjectCard } from "../features/projects/ProjectCard";
import { ProjectFilters } from "../features/projects/ProjectFilters";
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

const copy: Record<LibraryScope, { eyebrow: string; title: string; description: string }> = {
  library: {
    eyebrow: "Tu música, en contexto",
    title: "Todos tus proyectos, sin perder el ritmo.",
    description:
      "Explora únicamente los proyectos indexados desde las carpetas que elegiste.",
  },
  favorites: {
    eyebrow: "Selección personal",
    title: "Tus proyectos favoritos.",
    description: "Una vista filtrada de los proyectos que has marcado para volver a ellos.",
  },
  recent: {
    eyebrow: "Actividad reciente",
    title: "Continúa donde lo dejaste.",
    description: "Proyectos ordenados por su última modificación en el sistema de archivos.",
  },
  daws: {
    eyebrow: "Explorar por software",
    title: "Proyectos por DAW.",
    description: "Usa el filtro de DAW para concentrarte en una herramienta concreta.",
  },
  statuses: {
    eyebrow: "Flujo de producción",
    title: "Proyectos por estado.",
    description: "Filtra la biblioteca según la etapa actual de cada producción.",
  },
};

function LibrarySkeleton({ table }: { table: boolean }) {
  if (table) {
    return (
      <div className="space-y-2 rounded-2xl border border-white/[0.06] p-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-xl bg-white/[0.035]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="aspect-[4/5] animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.025]"
        />
      ))}
    </div>
  );
}

export function LibraryPage({
  scope = "library",
}: {
  scope?: LibraryScope;
}) {
  const { status, error: statusError, isLoading: isStatusLoading } =
    useAppStatus();
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
      updateQuery({
        favoriteOnly: false,
        sortBy: "modified",
        sortDirection: "desc",
      });
    } else {
      updateQuery({ favoriteOnly: false });
    }

    if (scope === "daws" || scope === "statuses") {
      setFiltersOpen(true);
    }
  }, [scope, setFiltersOpen, updateQuery]);

  useEffect(() => {
    if (scope === "favorites" && !query.favoriteOnly) {
      updateQuery({ favoriteOnly: true });
    }
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
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#1d1a17] p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-orange-500/[0.07] blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/15 bg-orange-400/[0.06] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-orange-300">
            <Music2 className="size-3" />
            {pageCopy.eyebrow}
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-stone-100 lg:text-3xl">
            {pageCopy.title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">
            {pageCopy.description}
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <LibraryBig className="size-4 text-orange-300" />
          <p className="mt-3 text-2xl font-semibold text-stone-100">
            {isLoading ? "—" : total}
          </p>
          <p className="text-xs text-stone-600">Resultados actuales</p>
        </article>
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <FolderKanban className="size-4 text-lime-400" />
          <p className="mt-3 text-2xl font-semibold text-stone-100">
            {isStatusLoading ? "—" : status?.watchedFolderCount ?? 0}
          </p>
          <p className="text-xs text-stone-600">Carpetas activas</p>
        </article>
        <article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <Database className="size-4 text-sky-400" />
          <p className="mt-3 text-2xl font-semibold text-stone-100">
            {status ? "v" + status.schemaVersion : "—"}
          </p>
          <p className="text-xs text-stone-600">Esquema SQLite</p>
        </article>
      </section>

      <ProjectFilters />

      {statusError ? (
        <section className="mt-5 flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/80">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="text-xs leading-5 text-amber-100/60">{statusError}</p>
        </section>
      ) : null}

      <section className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-stone-300">
              {total === 1 ? "1 proyecto" : total + " proyectos"}
            </h3>
            <p className="mt-1 text-[0.65rem] text-stone-600">
              Página {query.page}
              {activeFilterCount > 0
                ? " · " + activeFilterCount + " filtros activos"
                : ""}
            </p>
          </div>
          {error ? (
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs text-stone-400 hover:bg-white/[0.04]"
            >
              <RefreshCw className="size-3.5" />
              Reintentar
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <LibrarySkeleton table={libraryView === "table"} />
        ) : error ? (
          <div className="rounded-2xl border border-red-400/15 bg-red-400/[0.05] p-6 text-center">
            <CircleAlert className="mx-auto size-5 text-red-300" />
            <p className="mt-3 text-sm font-medium text-red-100/80">
              No se pudo consultar la biblioteca
            </p>
            <p className="mt-1 text-xs text-red-100/50">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/[0.09] bg-black/10 px-6 py-12 text-center">
            {hasIndexedProjects || activeFilterCount > 0 ? (
              <>
                <SearchX className="mx-auto size-7 text-stone-600" />
                <h3 className="mt-4 text-base font-medium text-stone-300">
                  Ningún proyecto coincide
                </h3>
                <p className="mt-2 text-sm text-stone-600">
                  Ajusta la búsqueda o restablece los filtros.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 h-9 rounded-lg border border-white/[0.08] px-3 text-xs text-stone-400 hover:bg-white/[0.04]"
                >
                  Restablecer filtros
                </button>
              </>
            ) : (
              <>
                <LibraryBig className="mx-auto size-7 text-stone-600" />
                <h3 className="mt-4 text-base font-medium text-stone-300">
                  Tu biblioteca está lista para comenzar
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                  Agrega una carpeta y ejecuta un escaneo manual para indexar
                  proyectos reales.
                </p>
                <Link
                  to="/folders"
                  className="mt-5 inline-flex h-9 items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-stone-300 hover:bg-white/[0.07]"
                >
                  Gestionar carpetas
                </Link>
              </>
            )}
          </div>
        ) : libraryView === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <ProjectTable projects={items} />
        )}

        {!isLoading && !error ? <ProjectPagination /> : null}
      </section>
    </div>
  );
}
