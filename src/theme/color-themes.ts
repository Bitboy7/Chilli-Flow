export type ColorThemeId = "chilli" | "crimson" | "lime" | "ocean" | "violet";

export type ColorTheme = {
  id: ColorThemeId;
  label: string;
  description: string;
  swatches: [string, string, string];
};

export const colorThemes: ColorTheme[] = [
  {
    id: "chilli",
    label: "Chilli",
    description: "Naranja cálido original",
    swatches: ["#ffb86a", "#fe6e00", "#7c2d12"],
  },
  {
    id: "crimson",
    label: "Crimson",
    description: "Rojo intenso y directo",
    swatches: ["#fca5a5", "#ef4444", "#7f1d1d"],
  },
  {
    id: "lime",
    label: "Lime",
    description: "Verde eléctrico de estudio",
    swatches: ["#d9f99d", "#84cc16", "#365314"],
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Azul cian concentrado",
    swatches: ["#bae6fd", "#0ea5e9", "#0c4a6e"],
  },
  {
    id: "violet",
    label: "Violet",
    description: "Violeta creativo y sobrio",
    swatches: ["#ddd6fe", "#8b5cf6", "#4c1d95"],
  },
];

const storageKey = "chilli-beat:color-theme";
const validIds = new Set<ColorThemeId>(colorThemes.map((theme) => theme.id));

export function storedColorTheme(): ColorThemeId {
  if (typeof window === "undefined") return "chilli";
  const stored = window.localStorage.getItem(storageKey) as ColorThemeId | null;
  return stored && validIds.has(stored) ? stored : "chilli";
}

export function applyColorTheme(theme: ColorThemeId, persist = true) {
  document.documentElement.dataset.colorTheme = theme;
  if (persist) window.localStorage.setItem(storageKey, theme);
}

