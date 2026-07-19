import { invoke } from "@tauri-apps/api/core";

import type { ExtensionCatalogItem } from "../types/folders";

export function getExtensionCatalog(): Promise<ExtensionCatalogItem[]> {
  return invoke<ExtensionCatalogItem[]>("get_extension_catalog");
}


export function addCustomExtension(
  extension: string,
  dawName: string,
): Promise<void> {
  return invoke("add_custom_extension", { extension, dawName });
}

export function setCustomExtensionEnabled(
  customExtensionId: number,
  enabled: boolean,
): Promise<void> {
  return invoke("set_custom_extension_enabled", {
    customExtensionId,
    enabled,
  });
}

export function removeCustomExtension(
  customExtensionId: number,
): Promise<void> {
  return invoke("remove_custom_extension", { customExtensionId });
}
