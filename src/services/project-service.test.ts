import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  openProjectAssetFolder, projectAudioUrl, removeProjectFile, renameProjectFile,
  setProjectFavorite, setProjectFileCategory, setProjectPreview, syncProjectFiles, updateProject,
} from "./project-service";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), convertFileSrc: vi.fn((path: string) => "asset:" + path) }));

describe("project service command contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends editable metadata without a physical path", async () => {
    vi.mocked(invoke).mockResolvedValue({});
    const input = {
      displayName: "Visual name", bpm: 128, musicalKey: "Fm", genre: "House",
      status: "mixing", rating: 4, notes: "Notes", tags: ["client"],
    };

    await updateProject(7, input);

    expect(invoke).toHaveBeenCalledWith("update_project", { projectId: 7, input });
    expect(Object.keys(input)).not.toContain("filePath");
  });

  it("keeps physical rename behind a separate command", async () => {
    vi.mocked(invoke).mockResolvedValue({});
    await renameProjectFile(7, "new file name");
    expect(invoke).toHaveBeenCalledWith("rename_project_file", {
      projectId: 7, newStem: "new file name",
    });
  });

  it("persists favorite state through Rust", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await setProjectFavorite(7, true);
    expect(invoke).toHaveBeenCalledWith("set_project_favorite", {
      projectId: 7, favorite: true,
    });
  });

  it("removes only the database association", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await removeProjectFile(7, 12);
    expect(invoke).toHaveBeenCalledWith("remove_project_file", { projectId: 7, fileId: 12 });
  });

  it("selects and authorizes preview audio by stored IDs", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined).mockResolvedValueOnce("C:/Audio/demo.wav");
    await setProjectPreview(7, 12);
    const url = await projectAudioUrl(7, 12);
    expect(invoke).toHaveBeenNthCalledWith(1, "set_project_preview", { projectId: 7, fileId: 12 });
    expect(invoke).toHaveBeenNthCalledWith(2, "authorize_project_audio", { projectId: 7, fileId: 12 });
    expect(url).toBe("asset:C:/Audio/demo.wav");
  });

  it("opens a stored production folder by category without sending a path", async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);
    await openProjectAssetFolder(7, "stems");
    expect(invoke).toHaveBeenCalledWith("open_project_asset_folder", {
      projectId: 7, category: "stems",
    });
  });

  it("reclassifies an associated file by IDs and an allowlisted category", async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    await setProjectFileCategory(7, 12, "master");
    expect(invoke).toHaveBeenCalledWith("set_project_file_category", {
      projectId: 7, fileId: 12, category: "master",
    });
  });

  it("syncs project assets using only the stored project ID", async () => {
    vi.mocked(invoke).mockResolvedValue({ files: [], discoveredCount: 0, scannedFolders: 3 });
    await syncProjectFiles(7);
    expect(invoke).toHaveBeenCalledWith("sync_project_files", { projectId: 7 });
  });
});
