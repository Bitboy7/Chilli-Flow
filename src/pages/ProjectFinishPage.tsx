import {
  Ban, Check, CheckCircle2, ChevronDown, ChevronUp, Circle, Flag,
  ListPlus, LoaderCircle, MinusCircle, Save, Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { Select } from "../components/ui/Select";
import { getProjectFinishPlan, updateProjectFinishPlan } from "../services/finish-service";
import { useToastStore } from "../stores/toast-store";
import type {
  FinishPriority, FinishProjectPlan, FinishTask,
} from "../types/finish";
import { errorMessage } from "../utils/errors";
import type { ProjectWorkspaceContext } from "./ProjectWorkspacePage";

const priorityOptions = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

export function ProjectFinishPage() {
  const { project } = useOutletContext<ProjectWorkspaceContext>();
  const pushToast = useToastStore((state) => state.push);
  const [plan, setPlan] = useState<FinishProjectPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    void getProjectFinishPlan(project.id)
      .then((result) => { if (active) { setPlan(result); setError(null); } })
      .catch((cause) => { if (active) setError(errorMessage(cause)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [project.id]);

  const activeTasks = plan?.tasks.filter((task) => task.status !== "skipped") ?? [];
  const completed = activeTasks.filter((task) => task.status === "done").length;
  const progress = activeTasks.length ? Math.round(completed / activeTasks.length * 100) : 0;

  const updateField = <Key extends keyof FinishProjectPlan>(key: Key, value: FinishProjectPlan[Key]) => {
    setPlan((current) => current ? { ...current, [key]: value } : current);
  };

  const updateTask = (index: number, patch: Partial<FinishTask>) => {
    setPlan((current) => current ? {
      ...current,
      tasks: current.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...patch } : task),
    } : current);
  };

  const moveTask = (index: number, direction: -1 | 1) => {
    setPlan((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.tasks.length) return current;
      const tasks = [...current.tasks];
      const [task] = tasks.splice(index, 1);
      tasks.splice(target, 0, task);
      return { ...current, tasks };
    });
  };

  const removeTask = (index: number) => {
    if (!plan || plan.tasks.length <= 1) {
      pushToast({ kind: "error", title: "El plan necesita al menos una etapa" });
      return;
    }
    setPlan({ ...plan, tasks: plan.tasks.filter((_, taskIndex) => taskIndex !== index) });
  };

  const addTask = () => {
    if (!plan || plan.tasks.length >= 20) return;
    let suffix = 1;
    let label = "Nueva etapa";
    while (plan.tasks.some((task) => task.label.toLocaleLowerCase("es") === label.toLocaleLowerCase("es"))) {
      suffix += 1;
      label = "Nueva etapa " + suffix;
    }
    setPlan({
      ...plan,
      tasks: [...plan.tasks, {
        id: -Date.now(),
        label,
        status: "pending",
        sortOrder: plan.tasks.length,
      }],
    });
  };

  const save = async () => {
    if (!plan) return;
    setIsSaving(true);
    try {
      const updated = await updateProjectFinishPlan(project.id, {
        nextAction: plan.nextAction,
        targetDate: plan.targetDate,
        priority: plan.priority,
        blocker: plan.blocker,
        isFocus: plan.isFocus,
        tasks: plan.tasks.map((task) => ({ label: task.label, status: task.status })),
      });
      setPlan(updated);
      window.dispatchEvent(new Event("chilli:finish-changed"));
      pushToast({ kind: "success", title: "Plan actualizado", description: "La próxima acción quedó lista para tu siguiente sesión." });
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo guardar el plan", description: errorMessage(cause) });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PlanSkeleton />;
  if (error || !plan) return <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.05] p-5 text-sm text-red-200">{error ?? "No se pudo cargar el plan."}</div>;

  return (
    <div className="pt-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-stone-100">Plan de cierre</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">Define el siguiente paso concreto y adapta las etapas a la forma real en que terminarás este proyecto.</p>
        </div>
        <button type="button" disabled={isSaving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-40">
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar plan
        </button>
      </header>

      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)]">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
          <label className="block text-xs font-medium text-stone-300" htmlFor="finish-next-action">Próxima acción</label>
          <input id="finish-next-action" value={plan.nextAction ?? ""} onChange={(event) => updateField("nextAction", event.currentTarget.value || null)} placeholder="Ej. Corregir las voces del segundo verso" maxLength={240} className="mt-2 h-11 w-full rounded-xl border border-white/[0.09] bg-black/20 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-500 focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/10" />
          <p className="mt-2 text-[0.65rem] text-stone-500">Debe ser una acción pequeña que puedas comenzar sin volver a decidir qué hacer.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div><label className="mb-2 block text-xs font-medium text-stone-300">Prioridad</label><Select ariaLabel="Prioridad del proyecto" value={plan.priority} options={priorityOptions} onChange={(value) => updateField("priority", value as FinishPriority)} /></div>
            <div><label className="mb-2 block text-xs font-medium text-stone-300" htmlFor="finish-target-date">Fecha objetivo</label><input id="finish-target-date" type="date" value={plan.targetDate ?? ""} onChange={(event) => updateField("targetDate", event.currentTarget.value || null)} className="h-10 w-full rounded-xl border border-white/[0.09] bg-black/20 px-3 text-sm text-stone-200 outline-none [color-scheme:dark] focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/10" /></div>
          </div>

          <label className="mt-5 block text-xs font-medium text-stone-300" htmlFor="finish-blocker">Bloqueo actual</label>
          <div className="relative mt-2"><Ban className="pointer-events-none absolute left-3 top-3 size-4 text-stone-600" /><textarea id="finish-blocker" value={plan.blocker ?? ""} onChange={(event) => updateField("blocker", event.currentTarget.value || null)} placeholder="Opcional: qué impide avanzar y qué necesitas resolver" maxLength={500} rows={3} className="w-full resize-y rounded-xl border border-white/[0.09] bg-black/20 py-2.5 pl-10 pr-3 text-sm leading-5 text-stone-200 outline-none placeholder:text-stone-500 focus:border-orange-400/55 focus:ring-2 focus:ring-orange-400/10" /></div>

          <button type="button" onClick={() => updateField("isFocus", !plan.isFocus)} aria-pressed={plan.isFocus} className={["mt-5 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition", plan.isFocus ? "border-orange-400/25 bg-orange-400/[0.07]" : "border-white/[0.08] hover:bg-white/[0.035]"].join(" ")}>
            <span className={["grid size-9 place-items-center rounded-lg", plan.isFocus ? "bg-orange-500 text-stone-950" : "bg-white/[0.04] text-stone-500"].join(" ")}><Flag className={["size-4", plan.isFocus ? "fill-current" : ""].join(" ")} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-stone-200">{plan.isFocus ? "Proyecto en foco" : "Reservar un espacio en foco"}</span><span className="mt-1 block text-xs text-stone-500">Puedes comprometerte con un máximo de tres proyectos simultáneos.</span></span>
            {plan.isFocus ? <Check className="size-4 text-orange-300" /> : null}
          </button>
        </div>

        <aside className="rounded-xl border border-white/[0.07] p-5">
          <div className="flex items-center justify-between"><div><p className="text-xs text-stone-500">Avance del plan</p><p className="mt-1 text-2xl font-semibold tabular-nums text-stone-100">{progress}%</p></div><CheckCircle2 className="size-6 text-orange-300" /></div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full bg-orange-400" style={{ width: progress + "%" }} /></div>
          <p className="mt-2 text-xs text-stone-500">{completed} de {activeTasks.length} etapas activas completadas</p>
          <div className="mt-5 border-t border-white/[0.06] pt-4 text-xs leading-5 text-stone-400">
            {plan.nextAction ? <p>Tu siguiente sesión empieza con: <span className="text-stone-200">{plan.nextAction}</span></p> : <p>Define una próxima acción para evitar volver a evaluar todo el proyecto al abrirlo.</p>}
          </div>
        </aside>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-white/[0.07]">
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3">
          <div><h3 className="text-sm font-medium text-stone-200">Etapas para terminar</h3><p className="mt-1 text-xs text-stone-500">Completa, omite, renombra o reordena según este proyecto.</p></div>
          <button type="button" disabled={plan.tasks.length >= 20} onClick={addTask} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs text-stone-300 hover:bg-white/[0.04] disabled:opacity-35"><ListPlus className="size-4" /> Añadir etapa</button>
        </header>
        <div className="divide-y divide-white/[0.055]">
          {plan.tasks.map((task, index) => (
            <TaskRow key={task.id} task={task} index={index} count={plan.tasks.length} onChange={(patch) => updateTask(index, patch)} onMove={(direction) => moveTask(index, direction)} onRemove={() => removeTask(index)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TaskRow({ task, index, count, onChange, onMove, onRemove }: { task: FinishTask; index: number; count: number; onChange: (patch: Partial<FinishTask>) => void; onMove: (direction: -1 | 1) => void; onRemove: () => void }) {
  const toggleDone = () => onChange({ status: task.status === "done" ? "pending" : "done" });
  const toggleSkipped = () => onChange({ status: task.status === "skipped" ? "pending" : "skipped" });
  return (
    <div className={["flex items-center gap-3 px-4 py-2.5", task.status === "skipped" ? "opacity-50" : ""].join(" ")}>
      <button type="button" onClick={toggleDone} disabled={task.status === "skipped"} aria-label={(task.status === "done" ? "Marcar pendiente " : "Completar ") + task.label} className="grid size-8 shrink-0 place-items-center rounded-lg text-stone-500 hover:bg-white/[0.05] hover:text-orange-300 disabled:opacity-30">
        {task.status === "done" ? <CheckCircle2 className="size-5 fill-orange-400/10 text-orange-300" /> : <Circle className="size-5" />}
      </button>
      <input value={task.label} onChange={(event) => onChange({ label: event.currentTarget.value })} maxLength={80} aria-label={"Nombre de etapa " + (index + 1)} className={["min-w-0 flex-1 bg-transparent text-sm outline-none focus:text-orange-100", task.status === "done" ? "text-stone-500 line-through" : "text-stone-300"].join(" ")} />
      <button type="button" onClick={toggleSkipped} title={task.status === "skipped" ? "Incluir etapa" : "Omitir etapa"} className="grid size-8 place-items-center rounded-lg text-stone-600 hover:bg-white/[0.05] hover:text-stone-300"><MinusCircle className="size-4" /></button>
      <div className="flex">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={"Subir " + task.label} className="grid size-8 place-items-center text-stone-600 hover:text-stone-300 disabled:opacity-20"><ChevronUp className="size-4" /></button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={"Bajar " + task.label} className="grid size-8 place-items-center text-stone-600 hover:text-stone-300 disabled:opacity-20"><ChevronDown className="size-4" /></button>
      </div>
      <button type="button" onClick={onRemove} aria-label={"Eliminar " + task.label} className="grid size-8 place-items-center rounded-lg text-stone-600 hover:bg-red-400/10 hover:text-red-300"><Trash2 className="size-4" /></button>
    </div>
  );
}

function PlanSkeleton() {
  return <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-xl bg-white/[0.025]" /><div className="h-48 animate-pulse rounded-xl bg-white/[0.025]" /></div>;
}
