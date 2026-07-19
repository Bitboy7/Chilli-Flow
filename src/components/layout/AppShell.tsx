import { Outlet } from "react-router-dom";

import { useScanEvents } from "../../hooks/use-scan-events";
import { ScanProgressBar } from "../scanning/ScanProgressBar";
import { Toaster } from "../ui/Toaster";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  useScanEvents();

  return (
    <div className="flex h-screen overflow-hidden bg-[#171513] text-stone-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <ScanProgressBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
