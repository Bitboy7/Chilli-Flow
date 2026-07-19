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
  projectsMoved: number;
  projectsMarkedMissing: number;
  errorMessage: string | null;
}

export interface ScanHistoryEntry {
  id: number;
  folderPath: string;
  startedAt: string;
  finishedAt: string | null;
  filesScanned: number;
  projectsFound: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsMoved: number;
  projectsMarkedMissing: number;
  unreadableEntries: number;
  status: "running" | "completed" | "cancelled" | "failed";
  errorMessage: string | null;
}

export interface ScanHistoryPage {
  items: ScanHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
