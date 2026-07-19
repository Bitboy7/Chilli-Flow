import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail: string;
  isLoading?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  isLoading = false,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-stone-500">{label}</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-white/[0.06]" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-100">
              {value}
            </p>
          )}
        </div>
        <span className="grid size-9 place-items-center rounded-xl border border-orange-400/10 bg-orange-400/[0.07] text-orange-300">
          <Icon className="size-4" strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-3 text-[0.7rem] text-stone-600">{detail}</p>
    </article>
  );
}
