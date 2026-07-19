export interface AppStatus {
  appName: string;
  appVersion: string;
  databaseReady: boolean;
  schemaVersion: number;
  projectCount: number;
  watchedFolderCount: number;
}
