import { create } from "zustand";

import {
  applyColorTheme,
  storedColorTheme,
  type ColorThemeId,
} from "../theme/color-themes";

export type LibraryView = "grid" | "table";

interface UiState {
  isSidebarCollapsed: boolean;
  isFiltersOpen: boolean;
  libraryView: LibraryView;
  searchQuery: string;
  colorTheme: ColorThemeId;
  toggleSidebar: () => void;
  toggleFilters: () => void;
  setFiltersOpen: (open: boolean) => void;
  setLibraryView: (view: LibraryView) => void;
  setSearchQuery: (query: string) => void;
  setColorTheme: (theme: ColorThemeId) => void;
}

const initialColorTheme = storedColorTheme();
applyColorTheme(initialColorTheme, false);

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  isFiltersOpen: false,
  libraryView: "grid",
  searchQuery: "",
  colorTheme: initialColorTheme,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleFilters: () =>
    set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),
  setFiltersOpen: (isFiltersOpen) => set({ isFiltersOpen }),
  setLibraryView: (libraryView) => set({ libraryView }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setColorTheme: (colorTheme) => {
    applyColorTheme(colorTheme);
    set({ colorTheme });
  },
}));
