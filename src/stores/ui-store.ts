import { create } from "zustand";

export type LibraryView = "grid" | "table";

interface UiState {
  isSidebarCollapsed: boolean;
  isFiltersOpen: boolean;
  libraryView: LibraryView;
  searchQuery: string;
  toggleSidebar: () => void;
  toggleFilters: () => void;
  setFiltersOpen: (open: boolean) => void;
  setLibraryView: (view: LibraryView) => void;
  setSearchQuery: (query: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  isFiltersOpen: false,
  libraryView: "grid",
  searchQuery: "",
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleFilters: () =>
    set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),
  setFiltersOpen: (isFiltersOpen) => set({ isFiltersOpen }),
  setLibraryView: (libraryView) => set({ libraryView }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
