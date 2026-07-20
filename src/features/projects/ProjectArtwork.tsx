import { AudioWaveform } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getProjectCover } from "../../services/project-service";

const coverCache = new Map<number, { path: string; dataUrl: string }>();
const MAX_CACHED_COVERS = 128;

type GeneratedArtworkData = {
  anchorX: number;
  anchorY: number;
  palette: ArtworkPalette;
  rotation: number;
  variant: number;
};

export type ArtworkPalette = {
  accent: string;
  background: string;
  foreground: string;
  mid: string;
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

export function generateArtworkPalette(seed: string): ArtworkPalette {
  const colorSeed = hashSeed(`${seed}:color`);
  const baseHue = colorSeed % 360;
  const accentHue = (baseHue + 32 + ((colorSeed >>> 8) % 92)) % 360;
  const saturationShift = (colorSeed >>> 16) % 12;

  return {
    background: `hsl(${baseHue} ${20 + saturationShift}% 8%)`,
    mid: `hsl(${baseHue} ${34 + saturationShift}% 23%)`,
    accent: `hsl(${accentHue} ${48 + saturationShift}% 57%)`,
    foreground: `hsl(${accentHue} ${28 + saturationShift}% 88%)`,
  };
}

function generateArtworkData(seed: string): GeneratedArtworkData {
  const random = seededRandom(hashSeed(seed));
  return {
    anchorX: 24 + random() * 52,
    anchorY: 18 + random() * 27,
    palette: generateArtworkPalette(seed),
    rotation: -18 + random() * 36,
    variant: Math.floor(random() * 4),
  };
}

function GeneratedArtwork({ seed }: { seed: string }) {
  const artwork = generateArtworkData(seed);
  const artworkId = hashSeed(seed);
  const gradientId = `project-artwork-gradient-${artworkId}`;
  const glowId = `project-artwork-glow-${artworkId}`;
  const { accent, background, foreground, mid } = artwork.palette;

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 62.5"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={background} />
          <stop offset="58%" stopColor={mid} />
          <stop offset="100%" stopColor={background} />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={foreground} stopOpacity="0.7" />
          <stop offset="45%" stopColor={accent} stopOpacity="0.38" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="62.5" fill={`url(#${gradientId})`} />
      <circle cx={artwork.anchorX} cy={artwork.anchorY} r="38" fill={`url(#${glowId})`} />

      {artwork.variant === 0 ? (
        <g fill="none" transform={`rotate(${artwork.rotation} 50 31.25)`}>
          <circle cx={artwork.anchorX} cy={artwork.anchorY} r="18" stroke={foreground} strokeOpacity="0.5" strokeWidth="0.8" />
          <circle cx={artwork.anchorX} cy={artwork.anchorY} r="24" stroke={foreground} strokeOpacity="0.16" strokeWidth="0.55" />
        </g>
      ) : artwork.variant === 1 ? (
        <g transform={`rotate(${artwork.rotation} 50 31.25)`}>
          <rect x="34" y="-13" width="32" height="88" rx="16" fill={accent} fillOpacity="0.27" />
          <rect x="39" y="-13" width="32" height="88" rx="16" fill="none" stroke={foreground} strokeOpacity="0.35" strokeWidth="0.7" />
        </g>
      ) : artwork.variant === 2 ? (
        <g transform={`translate(${artwork.anchorX - 50} ${artwork.anchorY - 31.25})`}>
          <path d="M18 5 H82 C82 19 70 30 54 31.25 C70 32.5 82 43.5 82 57.5 H18 C18 43.5 30 32.5 46 31.25 C30 30 18 19 18 5Z" fill={accent} fillOpacity="0.34" />
          <path d="M18 5 H82 M18 57.5 H82" fill="none" stroke={foreground} strokeOpacity="0.42" strokeWidth="0.7" />
        </g>
      ) : (
        <g transform={`rotate(${artwork.rotation} 50 31.25)`}>
          <path d="M23 8 L63 14 L77 52 L37 46 Z" fill={accent} fillOpacity="0.32" />
          <path d="M31 5 L69 18 L70 55 L32 42 Z" fill="none" stroke={foreground} strokeOpacity="0.48" strokeWidth="0.75" />
        </g>
      )}

      <path
        d="M8 54 H28"
        fill="none"
        stroke={foreground}
        strokeOpacity="0.5"
        strokeWidth="0.7"
      />
      <circle cx="31" cy="54" r="1" fill={accent} opacity="0.85" />
      <path
        d="M73 9 H92"
        fill="none"
        stroke={foreground}
        strokeOpacity="0.22"
        strokeWidth="0.55"
      />
      <rect y="41" width="100" height="21.5" fill={background} opacity="0.22" />
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
  onCoverResolved,
}: {
  daw: string;
  name: string;
  compact?: boolean;
  projectId?: number;
  coverPath?: string | null;
  onCoverResolved?: (dataUrl: string | null) => void;
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

  useEffect(() => {
    onCoverResolved?.(cover);
  }, [cover, onCoverResolved]);

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
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/[0.025]" />
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
