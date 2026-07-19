import { create } from "zustand";

export type LibraryView = "grid" | "table";

interface UiState {
  isSidebarCollapsed: boolean;
  libraryView: LibraryView;
  searchQuery: string;
  toggleSidebar: () => void;
  setLibraryView: (view: LibraryView) => void;
  setSearchQuery: (query: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  libraryView: "grid",
  searchQuery: "",
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setLibraryView: (libraryView) => set({ libraryView }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
