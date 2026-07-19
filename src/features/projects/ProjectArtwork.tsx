import { AudioWaveform } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getProjectCover } from "../../services/project-service";

const coverCache = new Map<number, { path: string; dataUrl: string }>();
const MAX_CACHED_COVERS = 128;

type GeneratedArtworkData = {
  accentHue: number;
  baseHue: number;
  circles: Array<{ opacity: number; radius: number; x: number; y: number }>;
  rotation: number;
  stripeOffset: number;
  variant: number;
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function generateArtworkData(seed: string): GeneratedArtworkData {
  const random = seededRandom(hashSeed(seed));
  const baseHue = Math.floor(random() * 360);
  return {
    baseHue,
    accentHue: (baseHue + 35 + Math.floor(random() * 105)) % 360,
    circles: Array.from({ length: 6 }, () => ({
      x: random() * 100,
      y: random() * 62.5,
      radius: 8 + random() * 24,
      opacity: 0.05 + random() * 0.13,
    })),
    rotation: -28 + random() * 56,
    stripeOffset: random() * 18,
    variant: Math.floor(random() * 3),
  };
}

function GeneratedArtwork({ seed }: { seed: string }) {
  const artwork = generateArtworkData(seed);
  const gradientId = `project-artwork-${hashSeed(seed)}`;

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 62.5"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${artwork.baseHue} 72% 38%)`} />
          <stop offset="55%" stopColor={`hsl(${artwork.accentHue} 62% 24%)`} />
          <stop offset="100%" stopColor={`hsl(${artwork.baseHue} 38% 7%)`} />
        </linearGradient>
      </defs>

      <rect width="100" height="62.5" fill={`url(#${gradientId})`} />
      {artwork.circles.map((circle, index) => (
        <circle
          key={index}
          cx={circle.x}
          cy={circle.y}
          r={circle.radius}
          fill="white"
          opacity={circle.opacity}
        />
      ))}

      {artwork.variant === 0 ? (
        <g
          opacity="0.16"
          stroke="white"
          strokeWidth="2.2"
          transform={`rotate(${artwork.rotation} 50 31.25)`}
        >
          {Array.from({ length: 7 }, (_, index) => (
            <line key={index} x1={-15 + index * 18 + artwork.stripeOffset} y1="-10" x2={-15 + index * 18 + artwork.stripeOffset} y2="73" />
          ))}
        </g>
      ) : artwork.variant === 1 ? (
        <g fill="none" stroke="white" opacity="0.2">
          <circle cx="50" cy="31.25" r="10" />
          <circle cx="50" cy="31.25" r="20" />
          <circle cx="50" cy="31.25" r="30" />
        </g>
      ) : (
        <path
          d={`M -5 ${18 + artwork.stripeOffset} Q 20 55 45 25 T 105 ${30 + artwork.stripeOffset / 2}`}
          fill="none"
          opacity="0.22"
          stroke="white"
          strokeWidth="2"
        />
      )}
      <rect y="39" width="100" height="23.5" fill="black" opacity="0.18" />
    </svg>
  );
}

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
      aria-label={(cover ? "Portada de " : "Portada generada de ") + name}
    >
      {cover ? (
        <img src={cover} alt={"Portada de " + name} loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <GeneratedArtwork seed={`${projectId ?? "project"}:${name}:${daw}`} />
      )}
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
