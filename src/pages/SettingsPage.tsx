import {
  BadgePlus,
  Check,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Palette,
  Puzzle,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  addCustomExtension,
  getExtensionCatalog,
  removeCustomExtension,
  setCustomExtensionEnabled,
} from "../services/extension-service";
import { useToastStore } from "../stores/toast-store";
import { useUiStore } from "../stores/ui-store";
import { colorThemes } from "../theme/color-themes";
import type { ExtensionCatalogItem } from "../types/folders";
import { errorMessage } from "../utils/errors";

function ExtensionRow({
  item,
  onChanged,
}: {
  item: ExtensionCatalogItem;
  onChanged: () => Promise<void>;
}) {
  const pushToast = useToastStore((state) => state.push);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = async () => {
    if (!item.isCustom || item.customExtensionId === null) {
      return;
    }
    setIsSaving(true);
    try {
      await setCustomExtensionEnabled(
        item.customExtensionId,
        !item.isEnabled,
      );
      await onChanged();
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo actualizar la extensión",
        description: errorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (item.customExtensionId === null) {
      return;
    }
    if (!window.confirm("¿Eliminar la extensión " + item.extension + "?")) {
      return;
    }
    setIsSaving(true);
    try {
      await removeCustomExtension(item.customExtensionId);
      await onChanged();
      pushToast({
        kind: "success",
        title: "Extensión eliminada",
      });
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo eliminar la extensión",
        description: errorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
        item.isEnabled
          ? "border-white/[0.07] bg-white/[0.02]"
          : "border-white/[0.04] bg-black/10 opacity-55",
      ].join(" ")}
    >
      <code className="min-w-24 rounded-lg bg-black/25 px-2 py-1 text-xs font-semibold text-orange-300">
        {item.extension}
      </code>
      <p className="min-w-0 flex-1 truncate text-sm text-stone-300">
        {item.dawName}
      </p>
      {!item.isCustom ? (
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-stone-600">
          <LockKeyhole className="size-3" />
          Integrada
        </span>
      ) : (
        <>
          <button
            type="button"
            role="switch"
            aria-checked={item.isEnabled}
            disabled={isSaving}
            onClick={() => void handleToggle()}
            className={[
              "relative h-5 w-9 rounded-full transition disabled:opacity-50",
              item.isEnabled ? "bg-orange-500" : "bg-stone-700",
            ].join(" ")}
            aria-label={
              item.isEnabled ? "Desactivar extensión" : "Activar extensión"
            }
          >
            <span
              className={[
                "absolute top-1 size-3 rounded-full bg-white transition-[left]",
                item.isEnabled ? "left-5" : "left-1",
              ].join(" ")}
            />
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleRemove()}
            className="grid size-7 place-items-center rounded-lg text-stone-600 hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40"
            aria-label="Eliminar extensión personalizada"
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [catalog, setCatalog] = useState<ExtensionCatalogItem[]>([]);
  const [extension, setExtension] = useState("");
  const [dawName, setDawName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pushToast = useToastStore((state) => state.push);
  const colorTheme = useUiStore((state) => state.colorTheme);
  const setColorTheme = useUiStore((state) => state.setColorTheme);

  const load = useCallback(async () => {
    try {
      const items = await getExtensionCatalog();
      setCatalog(items);
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await addCustomExtension(extension, dawName);
      setExtension("");
      setDawName("");
      await load();
      pushToast({
        kind: "success",
        title: "Extensión agregada",
        description: "Se usará a partir del siguiente escaneo.",
      });
    } catch (error) {
      pushToast({
        kind: "error",
        title: "No se pudo agregar la extensión",
        description: errorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const known = catalog.filter((item) => !item.isCustom);
  const custom = catalog.filter((item) => item.isCustom);

  return (
    <div className="mx-auto w-full max-w-5xl p-5 lg:p-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-100">
          Configuración
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
          Personaliza la apariencia y define qué archivos reconoce Chilli Beat como proyectos.
        </p>
      </header>

      <section className="mt-6 border-y border-white/[0.07] py-5" aria-labelledby="color-theme-heading">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-400/[0.08] text-orange-300">
            <Palette className="size-4" />
          </span>
          <div>
            <h3 id="color-theme-heading" className="text-sm font-medium text-stone-200">Tema de color</h3>
            <p className="mt-1 text-xs leading-5 text-stone-400">Elige el acento de controles, estados activos y acciones principales. La preferencia se guarda en este equipo.</p>
          </div>
        </div>
        <div role="radiogroup" aria-label="Tema de color de la aplicación" className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {colorThemes.map((theme) => {
            const isSelected = colorTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setColorTheme(theme.id)}
                className={[
                  "relative min-h-24 rounded-xl border p-3 text-left transition",
                  isSelected
                    ? "border-orange-400/45 bg-orange-400/[0.07] ring-1 ring-orange-400/15"
                    : "border-white/[0.08] bg-white/[0.018] hover:border-white/[0.16] hover:bg-white/[0.035]",
                ].join(" ")}
              >
                <span className="flex items-center gap-1.5" aria-hidden="true">
                  {theme.swatches.map((color) => <span key={color} className="size-4 rounded-full ring-1 ring-white/10" style={{ backgroundColor: color }} />)}
                </span>
                <span className="mt-3 block text-xs font-medium text-stone-200">{theme.label}</span>
                <span className="mt-1 block text-[0.68rem] leading-4 text-stone-500">{theme.description}</span>
                {isSelected ? <Check className="absolute right-3 top-3 size-4 text-orange-300" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6">
        <h3 className="text-base font-medium text-stone-200">Extensiones de proyectos</h3>
        <p className="mt-1 text-xs leading-5 text-stone-400">Amplía el catálogo sin modificar el código. Los cambios se aplican en el siguiente escaneo.</p>
      </div>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="mt-6 rounded-2xl border border-orange-400/10 bg-orange-400/[0.035] p-4"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-stone-200">
          <BadgePlus className="size-4 text-orange-300" />
          Agregar extensión personalizada
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]">
          <label>
            <span className="mb-1.5 block text-[0.68rem] text-stone-500">
              Extensión
            </span>
            <input
              value={extension}
              onChange={(event) => setExtension(event.currentTarget.value)}
              required
              maxLength={17}
              placeholder=".tracktionedit"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-500 focus:border-orange-400/40"
            />
          </label>
          <label>
            <span className="mb-1.5 block text-[0.68rem] text-stone-500">
              Nombre del DAW
            </span>
            <input
              value={dawName}
              onChange={(event) => setDawName(event.currentTarget.value)}
              required
              maxLength={80}
              placeholder="Waveform"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-500 focus:border-orange-400/40"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:cursor-wait disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Puzzle className="size-3.5" />
            )}
            Agregar
          </button>
        </div>
        <p className="mt-3 text-[0.68rem] text-stone-600">
          Usa únicamente letras y números; el punto inicial es opcional.
        </p>
      </form>

      {loadError ? (
        <div className="mt-5 flex gap-3 rounded-xl border border-red-400/15 bg-red-400/[0.05] p-3">
          <CircleAlert className="size-4 shrink-0 text-red-300" />
          <p className="text-xs text-red-100/70">{loadError}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-stone-600">
          <LoaderCircle className="size-4 animate-spin" />
          Cargando catálogo…
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-stone-300">
                Extensiones integradas
              </h3>
              <span className="text-xs text-stone-600">{known.length}</span>
            </div>
            <div className="space-y-2">
              {known.map((item) => (
                <ExtensionRow
                  key={item.extension}
                  item={item}
                  onChanged={load}
                />
              ))}
            </div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-stone-300">
                Personalizadas
              </h3>
              <span className="text-xs text-stone-600">{custom.length}</span>
            </div>
            {custom.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center text-sm text-stone-600">
                No hay extensiones personalizadas.
              </div>
            ) : (
              <div className="space-y-2">
                {custom.map((item) => (
                  <ExtensionRow
                    key={item.extension}
                    item={item}
                    onChanged={load}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
