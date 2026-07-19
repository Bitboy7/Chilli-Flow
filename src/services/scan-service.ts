import { invoke } from "@tauri-apps/api/core";

import type { ScanHistoryPage, ScanSession } from "../types/scanning";

export function startScan(folderId?: number): Promise<ScanSession> {
  return invoke<ScanSession>("start_scan", {
    folderId: folderId ?? null,
  });
}

export function cancelScan(sessionId: number): Promise<void> {
  return invoke("cancel_scan", { sessionId });
}

export function getScanHistory(page: number, pageSize = 20): Promise<ScanHistoryPage> {
  return invoke<ScanHistoryPage>("get_scan_history", { page, pageSize });
}
