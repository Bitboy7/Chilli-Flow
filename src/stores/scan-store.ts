import { create } from "zustand";

import {
  cancelScan as cancelScanRequest,
  startScan as startScanRequest,
} from "../services/scan-service";
import type {
  ScanFinished,
  ScanProgress,
} from "../types/scanning";

interface ScanState {
  isScanning: boolean;
  isCancelling: boolean;
  sessionId: number | null;
  folderCount: number;
  progress: ScanProgress | null;
  lastFinished: ScanFinished | null;
  start: (folderId?: number) => Promise<void>;
  cancel: () => Promise<void>;
  receiveProgress: (progress: ScanProgress) => void;
  receiveFinished: (result: ScanFinished) => void;
}

export const useScanStore = create<ScanState>((set, get) => ({
  isScanning: false,
  isCancelling: false,
  sessionId: null,
  folderCount: 0,
  progress: null,
  lastFinished: null,
  start: async (folderId) => {
    if (get().isScanning) {
      return;
    }

    set({
      isScanning: true,
      isCancelling: false,
      sessionId: null,
      folderCount: 0,
      progress: null,
      lastFinished: null,
    });

    try {
      const session = await startScanRequest(folderId);
      set((state) =>
        state.lastFinished?.sessionId === session.sessionId
          ? { folderCount: session.folderCount }
          : {
              sessionId: session.sessionId,
              folderCount: session.folderCount,
            },
      );
    } catch (error) {
      set({ isScanning: false, isCancelling: false });
      throw error;
    }
  },
  cancel: async () => {
    const sessionId = get().sessionId;
    if (sessionId === null || get().isCancelling) {
      return;
    }
    set({ isCancelling: true });
    try {
      await cancelScanRequest(sessionId);
    } catch (error) {
      set({ isCancelling: false });
      throw error;
    }
  },
  receiveProgress: (progress) =>
    set({
      isScanning: true,
      sessionId: progress.sessionId,
      progress,
    }),
  receiveFinished: (lastFinished) =>
    set({
      isScanning: false,
      isCancelling: false,
      sessionId: null,
      progress: null,
      lastFinished,
    }),
}));
