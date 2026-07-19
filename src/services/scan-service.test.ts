import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getScanHistory } from "./scan-service";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

describe("scan history service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests one bounded history page from Rust", async () => {
    vi.mocked(invoke).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
    await getScanHistory(3, 20);
    expect(invoke).toHaveBeenCalledWith("get_scan_history", { page: 3, pageSize: 20 });
  });
});
