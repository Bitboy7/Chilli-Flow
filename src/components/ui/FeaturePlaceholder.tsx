import type { LucideIcon } from "lucide-react";

interface FeaturePlaceholderProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  phase: number;
}

export function FeaturePlaceholder({
  icon: Icon,
  eyebrow,
  title,
  description,
  phase,
}: FeaturePlaceholderProps) {
  return (
    <section className="grid min-h-full place-items-center p-6 lg:p-10">
      <div className="w-full max-w-lg rounded-3xl border border-white/[0.07] bg-white/[0.025] p-8 text-center shadow-2xl shadow-black/10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300">
          <Icon className="size-5" strokeWidth={1.7} />
        </span>
        <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-400/70">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-100">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-500">
          {description}
        </p>
        <span className="mt-6 inline-flex rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[0.68rem] text-stone-500">
          Implementación prevista · Fase {phase}
        </span>
      </div>
    </section>
  );
}
