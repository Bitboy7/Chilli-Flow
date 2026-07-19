import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

import type { WatchedFolder } from "../types/folders";

export function listWatchedFolders(): Promise<WatchedFolder[]> {
  return invoke<WatchedFolder[]>("list_watched_folders");
}

export async function selectAndAddWatchedFolder(): Promise<WatchedFolder | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Selecciona una carpeta de proyectos",
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return invoke<WatchedFolder>("add_watched_folder", {
    folderPath: selected,
  });
}

export function setWatchedFolderEnabled(
  folderId: number,
  enabled: boolean,
): Promise<void> {
  return invoke("set_watched_folder_enabled", { folderId, enabled });
}

export function removeWatchedFolder(folderId: number): Promise<void> {
  return invoke("remove_watched_folder", { folderId });
}
