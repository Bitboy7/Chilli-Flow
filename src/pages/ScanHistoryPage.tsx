import {
  ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock3,
  FolderSearch, LoaderCircle, RefreshCw, XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { getScanHistory } from "../services/scan-service";
import type { ScanHistoryEntry, ScanHistoryPage as ScanHistoryResult } from "../types/scanning";
import { formatDate } from "../utils/dates";
import { errorMessage } from "../utils/errors";

export function ScanHistoryPage() {
  const [result, setResult] = useState<ScanHistoryResult | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const history = await getScanHistory(page, 20);
      setResult(history); setError(null);
      if (history.page !== page) setPage(history.page);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setIsLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener("chilli:scan-history-changed", refresh);
    return () => window.removeEventListener("chilli:scan-history-changed", refresh);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-400/70">Actividad local</p><h1 className="mt-2 text-2xl font-semibold text-stone-100">Historial de escaneos</h1><p className="mt-2 text-sm text-stone-500">Resultados persistidos por carpeta, incluidos movimientos, faltantes y entradas ilegibles.</p></div>
        <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-xs text-stone-400 hover:bg-white/[0.04] disabled:opacity-40"><RefreshCw className={["size-3.5", isLoading ? "animate-spin" : ""].join(" ")} /> Actualizar</button>
      </header>

      {isLoading && !result ? <div className="grid min-h-80 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-300" /></div> : error ? <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><p className="mt-3 text-sm text-red-100/70">{error}</p></div> : !result?.items.length ? <div className="mt-6 rounded-2xl border border-dashed border-white/[0.08] p-12 text-center"><FolderSearch className="mx-auto size-7 text-stone-700" /><p className="mt-3 text-sm text-stone-500">Todavía no se ha ejecutado ningún escaneo.</p></div> : <>
        <section className="mt-6 space-y-3">{result.items.map((entry) => <HistoryRow key={entry.id} entry={entry} />)}</section>
        <footer className="mt-5 flex items-center justify-between"><p className="text-xs text-stone-600">{result.total} registros · Página {result.page} de {result.totalPages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((value) => value - 1)} className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-stone-500 disabled:opacity-30" aria-label="Página anterior"><ChevronLeft className="size-4" /></button><button type="button" disabled={page >= result.totalPages || isLoading} onClick={() => setPage((value) => value + 1)} className="grid size-9 place-items-center rounded-xl border border-white/[0.08] text-stone-500 disabled:opacity-30" aria-label="Página siguiente"><ChevronRight className="size-4" /></button></div></footer>
      </>}
    </div>
  );
}

function HistoryRow({ entry }: { entry: ScanHistoryEntry }) {
  const status = statusView(entry.status);
  const Icon = status.icon;
  return <article className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4"><div className="flex flex-wrap items-start gap-4"><span className={["grid size-9 shrink-0 place-items-center rounded-xl", status.className].join(" ")}><Icon className={["size-4", entry.status === "running" ? "animate-spin" : ""].join(" ")} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium text-stone-300">{lastSegment(entry.folderPath)}</p><span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] text-stone-500">{status.label}</span></div><p className="mt-1 break-all text-[0.65rem] text-stone-600">{entry.folderPath}</p></div><div className="text-right"><p className="text-xs text-stone-400">{formatDate(entry.startedAt)}</p><p className="mt-1 text-[0.62rem] text-stone-600">{duration(entry.startedAt, entry.finishedAt)}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.055] pt-4 sm:grid-cols-7"><Metric label="Archivos" value={entry.filesScanned} /><Metric label="Proyectos" value={entry.projectsFound} /><Metric label="Nuevos" value={entry.projectsCreated} accent="text-lime-400" /><Metric label="Actualizados" value={entry.projectsUpdated} /><Metric label="Movidos" value={entry.projectsMoved} accent="text-sky-400" /><Metric label="Faltantes" value={entry.projectsMarkedMissing} accent="text-amber-400" /><Metric label="Ilegibles" value={entry.unreadableEntries} accent="text-red-300" /></div>{entry.errorMessage ? <p className="mt-3 rounded-lg bg-amber-400/[0.05] px-3 py-2 text-[0.68rem] text-amber-100/55">{entry.errorMessage}</p> : null}</article>;
}

function Metric({ label, value, accent = "text-stone-300" }: { label: string; value: number; accent?: string }) { return <div><p className={["text-sm font-semibold", accent].join(" ")}>{value}</p><p className="mt-0.5 text-[0.58rem] text-stone-600">{label}</p></div>; }
function statusView(status: ScanHistoryEntry["status"]) { switch (status) { case "completed": return { label: "Completado", icon: CircleCheck, className: "bg-lime-400/10 text-lime-400" }; case "failed": return { label: "Falló", icon: XCircle, className: "bg-red-400/10 text-red-400" }; case "cancelled": return { label: "Cancelado", icon: CircleAlert, className: "bg-amber-400/10 text-amber-400" }; default: return { label: "En curso", icon: Clock3, className: "bg-sky-400/10 text-sky-400" }; } }
function lastSegment(path: string) { const segments = path.split(/[\\/]/).filter(Boolean); return segments[segments.length - 1] ?? path; }
function duration(start: string, finish: string | null) { if (!finish) return "En curso"; const milliseconds = new Date(finish).getTime() - new Date(start).getTime(); if (!Number.isFinite(milliseconds) || milliseconds < 0) return "Duración desconocida"; if (milliseconds < 1000) return "< 1 s"; const seconds = Math.round(milliseconds / 1000); return seconds < 60 ? seconds + " s" : Math.floor(seconds / 60) + " min " + seconds % 60 + " s"; }
