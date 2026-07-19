import { create } from "zustand";

import {
  listWatchedFolders,
  removeWatchedFolder,
  selectAndAddWatchedFolder,
  setWatchedFolderEnabled,
} from "../services/folder-service";
import type { WatchedFolder } from "../types/folders";
import { errorMessage } from "../utils/errors";

interface FoldersState {
  folders: WatchedFolder[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  addSelected: () => Promise<WatchedFolder | null>;
  setEnabled: (folderId: number, enabled: boolean) => Promise<void>;
  remove: (folderId: number) => Promise<void>;
}

function sortFolders(folders: WatchedFolder[]) {
  return [...folders].sort((left, right) =>
    left.folderPath.localeCompare(right.folderPath),
  );
}

export const useFoldersStore = create<FoldersState>((set) => ({
  folders: [],
  isLoading: false,
  error: null,
  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const folders = await listWatchedFolders();
      set({ folders, isLoading: false });
    } catch (error) {
      set({ error: errorMessage(error), isLoading: false });
    }
  },
  addSelected: async () => {
    const folder = await selectAndAddWatchedFolder();
    if (folder) {
      set((state) => ({
        folders: sortFolders([...state.folders, folder]),
        error: null,
      }));
    }
    return folder;
  },
  setEnabled: async (folderId, enabled) => {
    await setWatchedFolderEnabled(folderId, enabled);
    set((state) => ({
      folders: state.folders.map((folder) =>
        folder.id === folderId ? { ...folder, isEnabled: enabled } : folder,
      ),
    }));
  },
  remove: async (folderId) => {
    await removeWatchedFolder(folderId);
    set((state) => ({
      folders: state.folders.filter((folder) => folder.id !== folderId),
    }));
  },
}));
