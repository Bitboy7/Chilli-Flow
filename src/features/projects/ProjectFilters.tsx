import {
  ChevronDown,
  Heart,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";

import { Select } from "../../components/ui/Select";
import { useProjectsStore } from "../../stores/projects-store";
import { useUiStore } from "../../stores/ui-store";
import type {
  ProjectQuery,
  ProjectSort,
  SortDirection,
} from "../../types/projects";

type FilterOption = { value: string; label: string };

function SelectFilter({
  label,
  value,
  options,
  onChange,
  className = "min-w-40 flex-1",
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string | null) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-2 block text-xs font-medium text-stone-400">{label}</span>
      <Select
        ariaLabel={"Filtrar por " + label.toLocaleLowerCase("es")}
        value={value ?? ""}
        onChange={(next) => onChange(next || null)}
        options={[{ value: "", label: "Todos" }, ...options]}
      />
    </div>
  );
}

export function ProjectFilters() {
  const isOpen = useUiStore((state) => state.isFiltersOpen);
  const query = useProjectsStore((state) => state.query);
  const facets = useProjectsStore((state) => state.facets);
  const isLoadingFacets = useProjectsStore((state) => state.isLoadingFacets);
  const updateQuery = useProjectsStore((state) => state.updateQuery);
  const resetFilters = useProjectsStore((state) => state.resetFilters);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const [showMore, setShowMore] = useState(false);

  if (!isOpen) return null;

  const update = <Key extends keyof ProjectQuery>(
    key: Key,
    value: ProjectQuery[Key],
  ) => updateQuery({ [key]: value });

  const reset = () => {
    resetFilters();
    setSearchQuery("");
    setShowMore(false);
  };

  const advancedCount = Number(Boolean(query.extension)) + Number(query.tagId !== null);
  const activeFilters = [
    query.daw ? { key: "daw", label: "DAW: " + query.daw, clear: () => update("daw", null) } : null,
    query.status ? {
      key: "status",
      label: "Estado: " + (facets.statuses.find((item) => item.key === query.status)?.label ?? query.status),
      clear: () => update("status", null),
    } : null,
    query.genre ? { key: "genre", label: "Género: " + query.genre, clear: () => update("genre", null) } : null,
    query.extension ? { key: "extension", label: query.extension, clear: () => update("extension", null) } : null,
    query.tagId !== null ? {
      key: "tag",
      label: "Etiqueta: " + (facets.tags.find((item) => item.id === query.tagId)?.name ?? query.tagId),
      clear: () => update("tagId", null),
    } : null,
    query.favoriteOnly ? { key: "favorite", label: "Solo favoritos", clear: () => update("favoriteOnly", false) } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <section className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.018] p-3" aria-label="Filtros de biblioteca">
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-1 flex h-11 items-center gap-2 self-end px-1 text-xs font-medium text-stone-300">
          <SlidersHorizontal className="size-4 text-orange-300" />
          <span className="hidden xl:inline">Filtrar</span>
          {isLoadingFacets ? <span className="sr-only">Actualizando opciones</span> : null}
        </div>

        <SelectFilter
          label="DAW"
          value={query.daw}
          options={facets.daws.map((value) => ({ value, label: value }))}
          onChange={(value) => update("daw", value)}
        />
        <SelectFilter
          label="Estado"
          value={query.status}
          options={facets.statuses.map((status) => ({ value: status.key, label: status.label }))}
          onChange={(value) => update("status", value)}
        />
        <SelectFilter
          label="Género"
          value={query.genre}
          options={facets.genres.map((value) => ({ value, label: value }))}
          onChange={(value) => update("genre", value)}
        />

        <button
          type="button"
          onClick={() => setShowMore((current) => !current)}
          aria-expanded={showMore}
          className={[
            "inline-flex h-11 items-center gap-2 self-end rounded-xl border px-3 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400",
            showMore || advancedCount
              ? "border-orange-400/25 bg-orange-400/[0.06] text-orange-200"
              : "border-white/[0.08] text-stone-400 hover:bg-white/[0.04] hover:text-stone-100",
          ].join(" ")}
        >
          Más filtros
          {advancedCount ? <span className="grid size-5 place-items-center rounded-full bg-orange-400/15 text-[0.65rem]">{advancedCount}</span> : null}
          <ChevronDown className={["size-3.5 transition", showMore ? "rotate-180" : ""].join(" ")} />
        </button>

        <button
          type="button"
          aria-pressed={query.favoriteOnly}
          onClick={() => update("favoriteOnly", !query.favoriteOnly)}
          className={[
            "inline-flex size-11 items-center justify-center self-end rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400",
            query.favoriteOnly
              ? "border-red-400/20 bg-red-400/[0.07] text-red-300"
              : "border-white/[0.08] text-stone-400 hover:bg-white/[0.04] hover:text-stone-100",
          ].join(" ")}
          title="Mostrar solo favoritos"
          aria-label="Mostrar solo favoritos"
        >
          <Heart className={["size-4", query.favoriteOnly ? "fill-current" : ""].join(" ")} />
        </button>

        {activeFilters.length ? (
          <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 self-end rounded-xl px-3 text-xs text-stone-400 hover:bg-white/[0.04] hover:text-stone-100">
            <RotateCcw className="size-3.5" /> Restablecer
          </button>
        ) : null}
      </div>

      {showMore || advancedCount ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3">
          <SelectFilter
            label="Extensión"
            value={query.extension}
            options={facets.extensions.map((value) => ({ value, label: value }))}
            onChange={(value) => update("extension", value)}
            className="min-w-44 max-w-64 flex-1"
          />
          <SelectFilter
            label="Etiqueta"
            value={query.tagId?.toString() ?? null}
            options={facets.tags.map((tag) => ({ value: tag.id.toString(), label: tag.name }))}
            onChange={(value) => update("tagId", value ? Number(value) : null)}
            className="min-w-44 max-w-64 flex-1"
          />
        </div>
      ) : null}

      {activeFilters.length ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-white/[0.06] pt-3" aria-label="Filtros activos">
          {activeFilters.map((filter) => (
            <button key={filter.key} type="button" onClick={filter.clear} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-white/[0.045] px-2.5 text-xs text-stone-300 hover:bg-white/[0.075]">
              {filter.label}<X className="size-3 text-stone-500" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ProjectSortControls() {
  const query = useProjectsStore((state) => state.query);
  const updateQuery = useProjectsStore((state) => state.updateQuery);
  const value = query.sortBy + ":" + query.sortDirection;

  const update = (next: string) => {
    const [sortBy, sortDirection] = next.split(":") as [ProjectSort, SortDirection];
    updateQuery({ sortBy, sortDirection });
  };

  return (
    <div className="w-52">
      <Select
        ariaLabel="Orden de los proyectos"
        value={value}
        onChange={update}
        options={[
          { value: "modified:desc", label: "Modificados recientemente" },
          { value: "modified:asc", label: "Modificados primero" },
          { value: "name:asc", label: "Nombre A–Z" },
          { value: "name:desc", label: "Nombre Z–A" },
          { value: "created:desc", label: "Creados recientemente" },
          { value: "imported:desc", label: "Importados recientemente" },
          { value: "bpm:desc", label: "BPM mayor primero" },
          { value: "bpm:asc", label: "BPM menor primero" },
        ]}
      />
    </div>
  );
}
