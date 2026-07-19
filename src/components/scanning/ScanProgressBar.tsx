import { LoaderCircle, OctagonX } from "lucide-react";

import { useScanStore } from "../../stores/scan-store";
import { useToastStore } from "../../stores/toast-store";
import { errorMessage } from "../../utils/errors";

export function ScanProgressBar() {
  const isScanning = useScanStore((state) => state.isScanning);
  const isCancelling = useScanStore((state) => state.isCancelling);
  const progress = useScanStore((state) => state.progress);
  const folderCount = useScanStore((state) => state.folderCount);
  const cancel = useScanStore((state) => state.cancel);
  const pushToast = useToastStore((state) => state.push);

  if (!isScanning) {
    return null;
  }

  const handleCancel = async () => {
    try {
      await cancel();
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo cancelar",
        description: errorMessage(error),
      });
    }
  };

  return (
    <section
      className="relative border-b border-orange-400/10 bg-orange-400/[0.045] px-5 py-2.5 lg:px-7"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <LoaderCircle className="size-4 shrink-0 animate-spin text-orange-300" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 text-xs">
            <p className="truncate font-medium text-stone-300">
              {progress ? progress.folderPath : "Preparando escaneo…"}
            </p>
            <p className="shrink-0 text-stone-500">
              {progress
                ? `${progress.filesScanned.toLocaleString()} archivos · ${progress.projectsFound} proyectos`
                : `${folderCount || "—"} carpetas`}
            </p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-1/3 animate-[scan_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-orange-500 to-red-400" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCancel()}
          disabled={isCancelling}
          className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-red-400/15 px-3 text-xs text-red-300 transition hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-50"
        >
          <OctagonX className="size-3.5" />
          {isCancelling ? "Cancelando…" : "Cancelar"}
        </button>
      </div>
    </section>
  );
}
