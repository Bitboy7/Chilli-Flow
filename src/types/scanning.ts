export interface ScanSession {
  sessionId: number;
  folderCount: number;
}

export interface ScanProgress {
  sessionId: number;
  folderId: number;
  folderPath: string;
  filesScanned: number;
  projectsFound: number;
  unreadableEntries: number;
}

export interface ScanFinished {
  sessionId: number;
  status: "completed" | "cancelled" | "failed";
  filesScanned: number;
  projectsFound: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsMarkedMissing: number;
  errorMessage: string | null;
}
