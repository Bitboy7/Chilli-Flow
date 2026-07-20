import {
  ArrowRight, Ban, CircleAlert, CircleCheckBig, Clock3,
  Flag, ListChecks, Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ProjectArtwork } from "../features/projects/ProjectArtwork";
import { getFinishDashboard } from "../services/finish-service";
import type { FinishDashboard, FinishProjectItem } from "../types/finish";
import { errorMessage } from "../utils/errors";

type FinishFilter = "all" | "focus" | "dormant" | "no_preview" | "mixing" | "almost";

export function FinishModePage() {
  const [dashboard, setDashboard] = useState<FinishDashboard | null>(null);
  const [filter, setFilter] = useState<FinishFilter>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      setDashboard(await getFinishDashboard());
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("chilli:finish-changed", refresh);
    window.addEventListener("chilli:library-changed", refresh);
    return () => {
      window.removeEventListener("chilli:finish-changed", refresh);
      window.removeEventListener("chilli:library-changed", refresh);
    };
  }, []);

  const projects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return (dashboard?.projects ?? []).filter((project) => {
      const matchesFilter = filter === "all"
        || (filter === "focus" && project.isFocus)
        || (filter === "dormant" && project.isDormant)
        || (filter === "no_preview" && !project.hasPreview)
        || (filter === "mixing" && project.status === "mixing")
        || (filter === "almost" && project.isAlmostFinished);
      return matchesFilter && (!normalizedQuery
        || project.displayName.toLocaleLowerCase("es").includes(normalizedQuery)
        || project.nextAction?.toLocaleLowerCase("es").includes(normalizedQuery));
    });
  }, [dashboard, filter, query]);

  const focusProjects = dashboard?.projects.filter((project) => project.isFocus) ?? [];

  return (
    <div className="mx-auto w-full max-w-[88rem] p-5 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.07] pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-orange-300"><ListChecks className="size-4" /> Finish Mode</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-100">Termina lo que ya empezaste.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">Elige pocos proyectos, define el siguiente paso y reduce la distancia hasta una versión terminada.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
          <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Buscar proyecto o próxima acción" aria-label="Buscar en Finish Mode" className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/20 pl-10 pr-3 text-sm text-stone-200 outline-none placeholder:text-stone-500 focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/10" />
        </div>
      </header>

      {isLoading ? <FinishSkeleton /> : error ? (
        <div className="mt-6 rounded-xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-200">
          <CircleAlert className="size-5" /><p className="mt-2">{error}</p>
          <button type="button" onClick={() => void load()} className="mt-4 h-9 rounded-lg border border-red-300/20 px-3 text-xs hover:bg-red-300/10">Reintentar</button>
        </div>
      ) : dashboard ? (
        <>
          <section className="mt-5 flex flex-wrap gap-2" aria-label="Señales de Finish Mode">
            <SignalButton active={filter === "all"} onClick={() => setFilter("all")} label="En progreso" value={dashboard.summary.inProgress} />
            <SignalButton active={filter === "focus"} onClick={() => setFilter("focus")} label="En foco" value={dashboard.summary.focus} />
            <SignalButton active={filter === "dormant"} onClick={() => setFilter("dormant")} label="Dormidos 90 días" value={dashboard.summary.dormant} />
            <SignalButton active={filter === "no_preview"} onClick={() => setFilter("no_preview")} label="Sin preview" value={dashboard.summary.withoutPreview} />
            <SignalButton active={filter === "mixing"} onClick={() => setFilter("mixing")} label="En mezcla" value={dashboard.summary.mixing} />
            <SignalButton active={filter === "almost"} onClick={() => setFilter("almost")} label="Casi terminados" value={dashboard.summary.almostFinished} />
          </section>

          <section className="mt-7">
            <div className="flex items-baseline justify-between gap-4">
              <div><h2 className="text-base font-semibold text-stone-200">En foco</h2><p className="mt-1 text-xs text-stone-500">{focusProjects.length} de 3 espacios usados</p></div>
              {focusProjects.length ? <button type="button" onClick={() => setFilter("focus")} className="text-xs text-stone-400 hover:text-stone-200">Ver solo estos</button> : null}
            </div>
            {focusProjects.length ? (
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {focusProjects.map((project) => <FocusProject key={project.projectId} project={project} />)}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-4 rounded-xl border border-dashed border-white/[0.1] px-4 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-stone-500"><Flag className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="text-sm text-stone-300">Todavía no elegiste un proyecto en foco.</p><p className="mt-1 text-xs text-stone-500">Abre un proyecto y reserva uno de los tres espacios para comprometerte con él.</p></div>
              </div>
            )}
          </section>

          <section className="mt-8">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div><h2 className="text-base font-semibold text-stone-200">Proyectos activos</h2><p className="mt-1 text-xs text-stone-500">{projects.length} resultados · ordenados por foco, prioridad y objetivo</p></div>
            </div>
            {projects.length ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.07]">
                <div className="divide-y divide-white/[0.06]">
                  {projects.map((project) => <FinishProjectRow key={project.projectId} project={project} />)}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.1] px-6 py-12 text-center">
                <CircleCheckBig className="mx-auto size-7 text-stone-600" />
                <p className="mt-3 text-sm text-stone-300">No hay proyectos con esta señal.</p>
                <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-3 text-xs text-orange-300 hover:text-orange-200">Mostrar todos</button>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function SignalButton({ active, label, value, onClick }: { active: boolean; label: string; value: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={["inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition", active ? "border-orange-400/30 bg-orange-400/10 text-orange-100" : "border-white/[0.07] bg-white/[0.02] text-stone-400 hover:bg-white/[0.05] hover:text-stone-200"].join(" ")}><span>{label}</span><span className={["tabular-nums", active ? "text-orange-300" : "text-stone-500"].join(" ")}>{value}</span></button>;
}

function FocusProject({ project }: { project: FinishProjectItem }) {
  return (
    <Link to={"/projects/" + project.projectId + "/finish"} className="group flex min-w-0 items-center gap-3 rounded-xl border border-orange-400/15 bg-orange-400/[0.035] p-3 hover:bg-orange-400/[0.065]">
      <ProjectArtwork compact projectId={project.projectId} coverPath={project.coverPath} daw={project.daw} name={project.displayName} />
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-stone-200">{project.displayName}</p><p className="mt-1 truncate text-xs text-stone-400">{project.nextAction ?? "Define una próxima acción"}</p></div>
      <ArrowRight className="size-4 shrink-0 text-stone-600 group-hover:text-orange-300" />
    </Link>
  );
}

function FinishProjectRow({ project }: { project: FinishProjectItem }) {
  const progress = project.totalTasks ? Math.round(project.completedTasks / project.totalTasks * 100) : 0;
  return (
    <article className="group bg-white/[0.012] px-4 py-3 hover:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <ProjectArtwork compact projectId={project.projectId} coverPath={project.coverPath} daw={project.daw} name={project.displayName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={"/projects/" + project.projectId + "/finish"} className="truncate text-sm font-medium text-stone-200 hover:text-orange-200">{project.displayName}</Link>
            {project.isFocus ? <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-[0.6rem] text-orange-200"><Flag className="size-2.5 fill-current" /> En foco</span> : null}
            {project.isDormant ? <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.045] px-2 py-0.5 text-[0.6rem] text-stone-400"><Clock3 className="size-2.5" /> Dormido</span> : null}
            {project.blocker ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/[0.08] px-2 py-0.5 text-[0.6rem] text-amber-200"><Ban className="size-2.5" /> Bloqueado</span> : null}
          </div>
          <p className="mt-1 truncate text-xs text-stone-400">{project.nextAction ?? "Sin próxima acción definida"}</p>
        </div>
        <div className="hidden w-36 sm:block">
          <div className="flex justify-between text-[0.6rem] text-stone-500"><span>{project.completedTasks}/{project.totalTasks || 7} etapas</span><span>{progress}%</span></div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-orange-400/70" style={{ width: progress + "%" }} /></div>
        </div>
        <div className="hidden w-28 text-right md:block">
          <p className="text-[0.6rem] uppercase text-stone-600">{priorityLabel(project.priority)}</p>
          <p className="mt-1 text-xs text-stone-400">{project.targetDate ? formatTarget(project.targetDate) : "Sin objetivo"}</p>
        </div>
        <Link to={"/projects/" + project.projectId + "/finish"} aria-label={"Abrir plan de " + project.displayName} className="grid size-8 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-white/[0.06] hover:text-stone-200"><ArrowRight className="size-4" /></Link>
      </div>
    </article>
  );
}

function FinishSkeleton() {
  return <div className="mt-6 space-y-6"><div className="flex gap-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 w-32 animate-pulse rounded-lg bg-white/[0.035]" />)}</div><div className="space-y-2">{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-white/[0.025]" />)}</div></div>;
}

function priorityLabel(priority: FinishProjectItem["priority"]) {
  return priority === "high" ? "Prioridad alta" : priority === "low" ? "Prioridad baja" : "Prioridad media";
}

function formatTarget(value: string) {
  const date = new Date(value + "T12:00:00");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(date);
}
