import { invoke } from "@tauri-apps/api/core";

import type { ScanSession } from "../types/scanning";

export function startScan(folderId?: number): Promise<ScanSession> {
  return invoke<ScanSession>("start_scan", {
    folderId: folderId ?? null,
  });
}

export function cancelScan(sessionId: number): Promise<void> {
  return invoke("cancel_scan", { sessionId });
}
