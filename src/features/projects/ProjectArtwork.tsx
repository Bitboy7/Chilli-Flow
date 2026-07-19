import { AudioWaveform } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getProjectCover } from "../../services/project-service";

const coverCache = new Map<number, { path: string; dataUrl: string }>();
const MAX_CACHED_COVERS = 128;

function cacheCover(projectId: number, path: string, dataUrl: string) {
  coverCache.delete(projectId);
  coverCache.set(projectId, { path, dataUrl });
  if (coverCache.size > MAX_CACHED_COVERS) {
    const oldest = coverCache.keys().next().value;
    if (oldest !== undefined) coverCache.delete(oldest);
  }
}

const dawGradients: Record<string, string> = {
  "FL Studio": "from-orange-500/35 via-red-500/20 to-stone-950",
  "Ableton Live": "from-sky-400/30 via-cyan-500/15 to-stone-950",
  REAPER: "from-indigo-400/30 via-violet-500/15 to-stone-950",
  Cubase: "from-red-400/30 via-fuchsia-500/15 to-stone-950",
  "Studio One": "from-blue-400/30 via-indigo-500/15 to-stone-950",
  "Pro Tools": "from-purple-400/30 via-blue-500/15 to-stone-950",
  "Logic Pro": "from-pink-400/30 via-orange-500/15 to-stone-950",
  GarageBand: "from-red-500/30 via-orange-500/15 to-stone-950",
  Reason: "from-yellow-400/30 via-orange-500/15 to-stone-950",
};

export function ProjectArtwork({
  daw,
  name,
  compact = false,
  projectId,
  coverPath,
}: {
  daw: string;
  name: string;
  compact?: boolean;
  projectId?: number;
  coverPath?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [cover, setCover] = useState(() => {
    const cached = projectId ? coverCache.get(projectId) : undefined;
    return cached && cached.path === coverPath ? cached.dataUrl : null;
  });

  useEffect(() => {
    if (!projectId || !coverPath) {
      setCover(null);
      return;
    }
    const cached = coverCache.get(projectId);
    if (cached?.path === coverPath) {
      setCover(cached.dataUrl);
      return;
    }
    setCover(null);
    const element = rootRef.current;
    if (!element) return;
    let active = true;
    const load = () => {
      void getProjectCover(projectId).then((asset) => {
        if (active && asset) {
          cacheCover(projectId, coverPath, asset.dataUrl);
          setCover(asset.dataUrl);
        }
      }).catch(() => undefined);
    };
    if (!("IntersectionObserver" in window)) {
      load();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        load();
      }
    }, { rootMargin: "160px" });
    observer.observe(element);
    return () => { active = false; observer.disconnect(); };
  }, [coverPath, projectId]);

  return (
    <div
      ref={rootRef}
      className={[
        "relative overflow-hidden bg-gradient-to-br",
        dawGradients[daw] ?? "from-stone-500/25 via-orange-500/10 to-stone-950",
        compact ? "size-10 rounded-lg" : "aspect-[16/10] w-full",
      ].join(" ")}
      role="img"
      aria-label={"Portada provisional de " + name}
    >
      {cover ? (
        <img src={cover} alt={"Portada de " + name} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : null}
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,transparent_49%,rgba(255,255,255,.15)_50%,transparent_51%)] [background-size:12px_100%]" />
      <AudioWaveform
        className={[
          "absolute text-white/45",
          compact
            ? "left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2"
            : "bottom-5 left-5 size-8",
        ].join(" ")}
        strokeWidth={1.3}
      />
      {!compact ? (
        <span className="absolute bottom-5 right-5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/35">
          {daw}
        </span>
      ) : null}
    </div>
  );
}
