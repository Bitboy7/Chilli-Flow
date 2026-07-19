import { ChevronLeft, ChevronRight } from "lucide-react";

import { useProjectsStore } from "../../stores/projects-store";

export function ProjectPagination() {
  const page = useProjectsStore((state) => state.query.page);
  const total = useProjectsStore((state) => state.total);
  const totalPages = useProjectsStore((state) => state.totalPages);
  const pageSize = useProjectsStore((state) => state.query.pageSize);
  const setPage = useProjectsStore((state) => state.setPage);

  if (totalPages <= 1) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5"
      aria-label="Paginación de proyectos"
    >
      <p className="text-xs text-stone-600">
        Mostrando {first}–{last} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 text-xs text-stone-400 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-3.5" />
          Anterior
        </button>
        <span className="min-w-20 text-center text-xs text-stone-500">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 text-xs text-stone-400 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-30"
        >
          Siguiente
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </nav>
  );
}
