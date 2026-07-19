import {
  AudioWaveform,
  Clock3,
  Gauge,
  Heart,
  History,
} from "lucide-react";

import { FeaturePlaceholder } from "../components/ui/FeaturePlaceholder";

export function FavoritesPage() {
  return (
    <FeaturePlaceholder
      icon={Heart}
      eyebrow="Colección"
      title="Tus proyectos favoritos"
      description="Los favoritos y sus acciones se conectarán con la biblioteca persistida."
      phase={4}
    />
  );
}

export function RecentProjectsPage() {
  return (
    <FeaturePlaceholder
      icon={Clock3}
      eyebrow="Colección"
      title="Proyectos recientes"
      description="Aquí aparecerán resultados paginados y ordenados por modificación e importación."
      phase={3}
    />
  );
}

export function DawsPage() {
  return (
    <FeaturePlaceholder
      icon={AudioWaveform}
      eyebrow="Explorar"
      title="Biblioteca por DAW"
      description="La vista agrupará proyectos usando el catálogo central de extensiones."
      phase={3}
    />
  );
}

export function StatusesPage() {
  return (
    <FeaturePlaceholder
      icon={Gauge}
      eyebrow="Organización"
      title="Flujo de producción"
      description="Los ocho estados iniciales ya existen en SQLite; su gestión llegará con la edición."
      phase={4}
    />
  );
}

export function ScanHistoryPage() {
  return (
    <FeaturePlaceholder
      icon={History}
      eyebrow="Actividad"
      title="Historial de escaneos"
      description="SQLite ya dispone de la tabla de historial; esta pantalla se conectará tras completar el escáner."
      phase={6}
    />
  );
}
