import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import { useScanEvents } from "../../hooks/use-scan-events";
import { GlobalAudioPlayer } from "../../features/playback/GlobalAudioPlayer";
import { ScanProgressBar } from "../scanning/ScanProgressBar";
import { Toaster } from "../ui/Toaster";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  useScanEvents();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#171513] text-stone-100">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <ScanProgressBar />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <Suspense fallback={<div className="grid min-h-80 place-items-center text-sm text-stone-600">Cargando vista…</div>}><Outlet /></Suspense>
          </main>
        </div>
      </div>
      <GlobalAudioPlayer />
      <Toaster />
    </div>
  );
}
