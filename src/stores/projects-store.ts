import { create } from "zustand";

import {
  getProjectFacets,
  listProjects,
} from "../services/project-service";
import type {
  ProjectFacets,
  ProjectListItem,
  ProjectQuery,
} from "../types/projects";
import { errorMessage } from "../utils/errors";

export const defaultProjectQuery: ProjectQuery = {
  page: 1,
  pageSize: 24,
  search: null,
  daw: null,
  extension: null,
  status: null,
  genre: null,
  tagId: null,
  favoriteOnly: false,
  sortBy: "modified",
  sortDirection: "desc",
};

const emptyFacets: ProjectFacets = {
  daws: [],
  extensions: [],
  statuses: [],
  genres: [],
  tags: [],
};

interface ProjectsState {
  items: ProjectListItem[];
  query: ProjectQuery;
  facets: ProjectFacets;
  total: number;
  totalPages: number;
  isLoading: boolean;
  isLoadingFacets: boolean;
  error: string | null;
  updateQuery: (patch: Partial<ProjectQuery>) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
  load: () => Promise<void>;
  loadFacets: () => Promise<void>;
}

let latestRequest = 0;

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  items: [],
  query: defaultProjectQuery,
  facets: emptyFacets,
  total: 0,
  totalPages: 0,
  isLoading: false,
  isLoadingFacets: false,
  error: null,
  updateQuery: (patch) =>
    set((state) => ({
      query: {
        ...state.query,
        ...patch,
        page: patch.page ?? 1,
      },
    })),
  setPage: (page) =>
    set((state) => ({
      query: { ...state.query, page: Math.max(1, page) },
    })),
  resetFilters: () =>
    set((state) => ({
      query: {
        ...defaultProjectQuery,
        sortBy: state.query.sortBy,
        sortDirection: state.query.sortDirection,
      },
    })),
  load: async () => {
    const request = ++latestRequest;
    set({ isLoading: true, error: null });
    try {
      const page = await listProjects(get().query);
      if (request !== latestRequest) {
        return;
      }
      set((state) => ({
        items: page.items,
        total: page.total,
        totalPages: page.totalPages,
        isLoading: false,
        query:
          page.page === state.query.page
            ? state.query
            : { ...state.query, page: page.page },
      }));
    } catch (error) {
      if (request === latestRequest) {
        set({
          isLoading: false,
          error: errorMessage(error),
          items: [],
          total: 0,
          totalPages: 0,
        });
      }
    }
  },
  loadFacets: async () => {
    set({ isLoadingFacets: true });
    try {
      const facets = await getProjectFacets();
      set({ facets, isLoadingFacets: false });
    } catch {
      set({ isLoadingFacets: false });
    }
  },
}));
