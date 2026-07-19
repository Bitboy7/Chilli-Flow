import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getProjectFacets,
  listProjects,
} from "../services/project-service";
import { defaultProjectQuery, useProjectsStore } from "./projects-store";

vi.mock("../services/project-service", () => ({
  listProjects: vi.fn(),
  getProjectFacets: vi.fn(),
}));

describe("projects store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectsStore.setState({
      items: [],
      query: { ...defaultProjectQuery },
      facets: {
        daws: [],
        extensions: [],
        statuses: [],
        genres: [],
        tags: [],
      },
      total: 0,
      totalPages: 0,
      isLoading: false,
      isLoadingFacets: false,
      error: null,
    });
  });

  it("resets pagination when a filter changes", () => {
    useProjectsStore.getState().setPage(4);
    useProjectsStore.getState().updateQuery({ daw: "Ableton Live" });

    expect(useProjectsStore.getState().query).toMatchObject({
      page: 1,
      daw: "Ableton Live",
    });
  });

  it("stores only the page returned by the backend", async () => {
    vi.mocked(listProjects).mockResolvedValue({
      items: [
        {
          id: 1,
          displayName: "Midnight Drive",
          originalName: "beat.flp",
          filePath: "C:/Music/beat.flp",
          extension: ".flp",
          daw: "FL Studio",
          coverPath: null,
          bpm: 128,
          musicalKey: "Fm",
          genre: "House",
          status: "mixing",
          statusLabel: "Mezcla",
          statusColor: "#38BDF8",
          rating: null,
          isFavorite: false,
          fileCreatedAt: null,
          fileModifiedAt: null,
          indexedAt: "2026-07-19T00:00:00Z",
          isMissing: false,
          tags: [],
        },
      ],
      total: 2500,
      page: 1,
      pageSize: 24,
      totalPages: 105,
    });

    await useProjectsStore.getState().load();

    expect(listProjects).toHaveBeenCalledWith(defaultProjectQuery);
    expect(useProjectsStore.getState().items).toHaveLength(1);
    expect(useProjectsStore.getState().total).toBe(2500);
  });

  it("loads filter facets independently from project rows", async () => {
    vi.mocked(getProjectFacets).mockResolvedValue({
      daws: ["FL Studio"],
      extensions: [".flp"],
      statuses: [],
      genres: ["House"],
      tags: [],
    });

    await useProjectsStore.getState().loadFacets();

    expect(useProjectsStore.getState().facets.daws).toEqual(["FL Studio"]);
    expect(useProjectsStore.getState().items).toEqual([]);
  });
});
