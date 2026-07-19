import {
  AudioWaveform,
  Clock3,
  FolderKanban,
  Gauge,
  Heart,
  History,
  LibraryBig,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export const primaryNavigation: NavigationItem[] = [
  { label: "Biblioteca", to: "/library", icon: LibraryBig, end: true },
  { label: "Favoritos", to: "/favorites", icon: Heart },
  { label: "Proyectos recientes", to: "/recent", icon: Clock3 },
  { label: "DAWs", to: "/daws", icon: AudioWaveform },
  { label: "Estados", to: "/statuses", icon: Gauge },
];

export const managementNavigation: NavigationItem[] = [
  { label: "Carpetas", to: "/folders", icon: FolderKanban },
  { label: "Historial", to: "/scan-history", icon: History },
  { label: "Configuración", to: "/settings", icon: Settings2 },
];

export const pageTitles: Record<string, string> = {
  "/library": "Biblioteca",
  "/favorites": "Favoritos",
  "/recent": "Proyectos recientes",
  "/daws": "DAWs",
  "/statuses": "Estados",
  "/folders": "Carpetas supervisadas",
  "/scan-history": "Historial de escaneos",
  "/settings": "Configuración",
};
