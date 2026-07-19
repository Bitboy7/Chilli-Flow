import {
  CircleAlert,
  Database,
  FolderKanban,
  LibraryBig,
  Music2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { StatCard } from "../components/ui/StatCard";
import { useAppStatus } from "../hooks/use-app-status";

export function LibraryPage() {
  const { status, error, isLoading } = useAppStatus();

  return (
    <div className="mx-auto w-full max-w-[96rem] p-5 lg:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[#1d1a17] p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-orange-500/[0.07] blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/15 bg-orange-400/[0.06] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-orange-300">
            <Music2 className="size-3" />
            Tu música, en contexto
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-stone-100 lg:text-3xl">
            Todos tus proyectos, sin perder el ritmo.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-500">
            Chilli Beat organizará los proyectos de tus DAWs sin mover los
            archivos originales. La biblioteca se alimentará únicamente de las
            carpetas que elijas.
          </p>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={LibraryBig}
          label="Proyectos disponibles"
          value={status?.projectCount ?? 0}
          detail="Registros activos en la biblioteca local"
          isLoading={isLoading}
        />
        <StatCard
          icon={FolderKanban}
          label="Carpetas activas"
          value={status?.watchedFolderCount ?? 0}
          detail="El escaneo se habilitará en la Fase 2"
          isLoading={isLoading}
        />
        <StatCard
          icon={Database}
          label="Esquema SQLite"
          value={status ? `v${status.schemaVersion}` : "—"}
          detail={
            status?.databaseReady
              ? `Base local lista · Chilli Beat ${status.appVersion}`
              : "Esperando al proceso nativo"
          }
          isLoading={isLoading}
        />
      </section>

      {error ? (
        <section className="mt-5 flex gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] p-4 text-sm text-amber-100/80">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <div>
            <p className="font-medium text-amber-200">
              Backend nativo no conectado
            </p>
            <p className="mt-1 text-xs leading-5 text-amber-100/55">{error}</p>
          </div>
        </section>
      ) : null}

      {!isLoading && status?.projectCount === 0 ? (
        <section className="mt-5 rounded-3xl border border-dashed border-white/[0.09] bg-black/10 px-6 py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-stone-500">
            <LibraryBig className="size-6" strokeWidth={1.5} />
          </span>
          <h3 className="mt-5 text-base font-semibold text-stone-200">
            Tu biblioteca está lista para comenzar
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            No hay proyectos indexados. La selección de carpetas y el escaneo
            seguro se incorporarán en la siguiente fase.
          </p>
          <Link
            to="/folders"
            className="mt-5 inline-flex h-9 items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-xs font-medium text-stone-300 transition hover:bg-white/[0.07]"
          >
            Ver gestión de carpetas
          </Link>
        </section>
      ) : null}
    </div>
  );
}
