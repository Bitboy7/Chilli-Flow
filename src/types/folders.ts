export interface WatchedFolder {
  id: number;
  folderPath: string;
  isEnabled: boolean;
  lastScannedAt: string | null;
  createdAt: string;
}

export interface ExtensionCatalogItem {
  extension: string;
  dawName: string;
  isCustom: boolean;
  customExtensionId: number | null;
  isEnabled: boolean;
}
