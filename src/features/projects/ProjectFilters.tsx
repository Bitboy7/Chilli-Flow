import { RotateCcw, SlidersHorizontal } from "lucide-react";

import { useProjectsStore } from "../../stores/projects-store";
import { useUiStore } from "../../stores/ui-store";
import type {
  ProjectQuery,
  ProjectSort,
  SortDirection,
} from "../../types/projects";

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="min-w-36 flex-1">
      <span className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-stone-600">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.currentTarget.value || null)}
        className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#171513] px-2.5 text-xs text-stone-300 outline-none focus:border-orange-400/40"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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

  if (!isOpen) {
    return null;
  }

  const update = <Key extends keyof ProjectQuery>(
    key: Key,
    value: ProjectQuery[Key],
  ) => updateQuery({ [key]: value });
  const handleReset = () => {
    resetFilters();
    setSearchQuery("");
  };

  return (
    <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-300">
          <SlidersHorizontal className="size-4 text-orange-300" />
          Filtros de biblioteca
          {isLoadingFacets ? (
            <span className="text-[0.65rem] text-stone-600">Actualizando…</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs text-stone-500 hover:bg-white/[0.04] hover:text-stone-200"
        >
          <RotateCcw className="size-3.5" />
          Restablecer
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SelectFilter
          label="DAW"
          value={query.daw}
          options={facets.daws.map((value) => ({ value, label: value }))}
          onChange={(value) => update("daw", value)}
        />
        <SelectFilter
          label="Extensión"
          value={query.extension}
          options={facets.extensions.map((value) => ({
            value,
            label: value,
          }))}
          onChange={(value) => update("extension", value)}
        />
        <SelectFilter
          label="Estado"
          value={query.status}
          options={facets.statuses.map((status) => ({
            value: status.key,
            label: status.label,
          }))}
          onChange={(value) => update("status", value)}
        />
        <SelectFilter
          label="Género"
          value={query.genre}
          options={facets.genres.map((value) => ({ value, label: value }))}
          onChange={(value) => update("genre", value)}
        />
        <SelectFilter
          label="Etiqueta"
          value={query.tagId?.toString() ?? null}
          options={facets.tags.map((tag) => ({
            value: tag.id.toString(),
            label: tag.name,
          }))}
          onChange={(value) => update("tagId", value ? Number(value) : null)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/[0.06] pt-4">
        <label className="min-w-44">
          <span className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-stone-600">
            Ordenar por
          </span>
          <select
            value={query.sortBy}
            onChange={(event) =>
              update("sortBy", event.currentTarget.value as ProjectSort)
            }
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#171513] px-2.5 text-xs text-stone-300 outline-none focus:border-orange-400/40"
          >
            <option value="name">Nombre</option>
            <option value="modified">Última modificación</option>
            <option value="created">Fecha de creación</option>
            <option value="bpm">BPM</option>
            <option value="imported">Fecha de importación</option>
          </select>
        </label>
        <label className="min-w-36">
          <span className="mb-1.5 block text-[0.65rem] font-medium uppercase tracking-wider text-stone-600">
            Dirección
          </span>
          <select
            value={query.sortDirection}
            onChange={(event) =>
              update(
                "sortDirection",
                event.currentTarget.value as SortDirection,
              )
            }
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-[#171513] px-2.5 text-xs text-stone-300 outline-none focus:border-orange-400/40"
          >
            <option value="desc">Descendente</option>
            <option value="asc">Ascendente</option>
          </select>
        </label>
        <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs text-stone-400">
          <input
            type="checkbox"
            checked={query.favoriteOnly}
            onChange={(event) =>
              update("favoriteOnly", event.currentTarget.checked)
            }
            className="size-3.5 accent-orange-500"
          />
          Solo favoritos
        </label>
      </div>
    </section>
  );
}
