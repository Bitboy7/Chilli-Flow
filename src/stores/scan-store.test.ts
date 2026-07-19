import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  cancelScan,
  startScan,
} from "../services/scan-service";
import { useScanStore } from "./scan-store";

vi.mock("../services/scan-service", () => ({
  startScan: vi.fn(),
  cancelScan: vi.fn(),
}));

const initialState = {
  isScanning: false,
  isCancelling: false,
  sessionId: null,
  folderCount: 0,
  progress: null,
  lastFinished: null,
};

describe("scan store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScanStore.setState(initialState);
  });

  it("tracks a background session returned by Rust", async () => {
    vi.mocked(startScan).mockResolvedValue({
      sessionId: 7,
      folderCount: 2,
    });

    await useScanStore.getState().start();

    expect(startScan).toHaveBeenCalledWith(undefined);
    expect(useScanStore.getState()).toMatchObject({
      isScanning: true,
      sessionId: 7,
      folderCount: 2,
    });
  });

  it("stores progress and a completed result", () => {
    useScanStore.getState().receiveProgress({
      sessionId: 3,
      folderId: 10,
      folderPath: "C:/Music",
      filesScanned: 500,
      projectsFound: 4,
      unreadableEntries: 0,
    });
    expect(useScanStore.getState().progress?.filesScanned).toBe(500);

    useScanStore.getState().receiveFinished({
      sessionId: 3,
      status: "completed",
      filesScanned: 700,
      projectsFound: 5,
      projectsCreated: 4,
      projectsUpdated: 1,
      projectsMarkedMissing: 0,
      errorMessage: null,
    });

    expect(useScanStore.getState()).toMatchObject({
      isScanning: false,
      sessionId: null,
      lastFinished: {
        sessionId: 3,
        projectsFound: 5,
      },
    });
  });

  it("sends cancellation for the active session", async () => {
    vi.mocked(cancelScan).mockResolvedValue();
    useScanStore.setState({
      isScanning: true,
      sessionId: 12,
    });

    await useScanStore.getState().cancel();

    expect(cancelScan).toHaveBeenCalledWith(12);
    expect(useScanStore.getState().isCancelling).toBe(true);
  });
});
