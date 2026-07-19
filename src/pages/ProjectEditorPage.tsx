import {
  ArrowLeft, CircleAlert, FolderOpen, FolderPlus, ImagePlus, LoaderCircle, Save, Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ProjectArtwork } from "../features/projects/ProjectArtwork";
import { Select } from "../components/ui/Select";
import {
  clearProjectAssetFolder, clearProjectCover, getProject, getProjectFacets, openProjectAssetFolder,
  renameProjectFile, selectProjectAssetFolder, selectProjectCover, updateProject,
} from "../services/project-service";
import { useToastStore } from "../stores/toast-store";
import type { ProjectDetail, ProjectFacets, ProjectFolderCategory, UpdateProjectInput } from "../types/projects";
import { errorMessage } from "../utils/errors";

const emptyFacets: ProjectFacets = { daws: [], extensions: [], statuses: [], genres: [], tags: [] };
const customGenreValue = "__custom_genre__";
const predefinedGenres = [
  "Afrobeat", "Amapiano", "Ambient", "Bachata", "Bolero", "Boom Bap",
  "Breakbeat", "Cinematic", "Corridos tumbados", "Cumbia", "Dancehall",
  "Deep House", "Dembow", "Disco", "Drill", "Drum and Bass", "Dubstep",
  "EDM", "Electro", "Folk", "Funk", "Future Bass", "Future House",
  "Hip Hop", "House", "Hyperpop", "Indie", "Jazz", "Jersey Club", "Latin",
  "Lo-fi", "Merengue", "Metal", "Moombahton", "Phonk", "Pop",
  "Progressive House", "Psytrance", "R&B", "Reggae", "Reggaetón",
  "Regional mexicano", "Rock", "Salsa", "Soul", "Synthwave", "Tech House",
  "Techno", "Trance", "Trap",
];

export function ProjectEditorPage() {
  const projectId = Number(useParams().projectId);
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [facets, setFacets] = useState(emptyFacets);
  const [form, setForm] = useState<UpdateProjectInput | null>(null);
  const [tagText, setTagText] = useState("");
  const [renameStem, setRenameStem] = useState("");
  const [usesCustomGenre, setUsesCustomGenre] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const applyProject = useCallback((value: ProjectDetail) => {
    setProject(value);
    setForm({
      displayName: value.displayName, bpm: value.bpm, musicalKey: value.musicalKey,
      genre: value.genre, status: value.status, rating: value.rating,
      notes: value.notes, tags: value.tags,
    });
    setTagText(value.tags.join(", "));
    setUsesCustomGenre(false);
    setRenameStem(value.originalName.toLowerCase().endsWith(value.extension.toLowerCase())
      ? value.originalName.slice(0, -value.extension.length) : value.originalName);
  }, []);

  useEffect(() => {
    if (!Number.isSafeInteger(projectId) || projectId <= 0) { setError("Identificador de proyecto no válido."); return; }
    void Promise.all([getProject(projectId), getProjectFacets()]).then(([detail, available]) => {
      applyProject(detail); setFacets(available); setError(null);
    }).catch((cause) => setError(errorMessage(cause)));
  }, [applyProject, projectId]);

  const tags = useMemo(() => tagText.split(",").map((tag) => tag.trim()).filter(Boolean), [tagText]);
  const genreOptions = useMemo(() => {
    const currentGenre = form?.genre?.trim();
    return [...new Set([
      ...predefinedGenres,
      ...facets.genres,
      ...(currentGenre && !usesCustomGenre ? [currentGenre] : []),
    ])].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
  }, [facets.genres, form?.genre, usesCustomGenre]);
  const patchForm = (patch: Partial<UpdateProjectInput>) => setForm((current) => current ? { ...current, ...patch } : current);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy("save");
    try {
      const updated = await updateProject(projectId, { ...form, tags });
      applyProject(updated);
      window.dispatchEvent(new Event("chilli:library-changed"));
      pushToast({ kind: "success", title: "Proyecto actualizado", description: "El archivo físico conserva su nombre." });
      navigate("/projects/" + projectId);
    } catch (cause) {
      pushToast({ kind: "error", title: "No se pudo guardar", description: errorMessage(cause) });
    } finally { setBusy(null); }
  };

  const changeCover = async () => {
    if (!project) return;
    setBusy("cover");
    try {
      const before = project.coverPath;
      const updated = await selectProjectCover(project.id);
      setProject(updated);
      if (updated.coverPath !== before) pushToast({ kind: "success", title: "Portada actualizada" });
    } catch (cause) { pushToast({ kind: "error", title: "No se pudo usar la portada", description: errorMessage(cause) }); }
    finally { setBusy(null); }
  };

  const removeCover = async () => {
    if (!project) return;
    setBusy("cover");
    try { setProject(await clearProjectCover(project.id)); pushToast({ kind: "success", title: "Portada eliminada" }); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo eliminar la portada", description: errorMessage(cause) }); }
    finally { setBusy(null); }
  };

  const renamePhysical = async () => {
    if (!project || !renameStem.trim()) return;
    const nextName = renameStem.trim() + project.extension;
    if (!window.confirm("Esto renombrará el archivo físico a \"" + nextName + "\". ¿Deseas continuar?")) return;
    setBusy("rename");
    try {
      const updated = await renameProjectFile(project.id, renameStem);
      applyProject(updated);
      window.dispatchEvent(new Event("chilli:library-changed"));
      pushToast({ kind: "success", title: "Archivo físico renombrado", description: updated.originalName });
    } catch (cause) { pushToast({ kind: "error", title: "No se pudo renombrar", description: errorMessage(cause) }); }
    finally { setBusy(null); }
  };

  const changeAssetFolder = async (category: ProjectFolderCategory) => {
    setBusy("folder");
    try { setProject(await selectProjectAssetFolder(projectId, category)); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo guardar la carpeta", description: errorMessage(cause) }); }
    finally { setBusy(null); }
  };

  const clearAssetFolder = async (category: ProjectFolderCategory) => {
    setBusy("folder");
    try { setProject(await clearProjectAssetFolder(projectId, category)); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo quitar la carpeta", description: errorMessage(cause) }); }
    finally { setBusy(null); }
  };

  const openAssetFolder = async (category: ProjectFolderCategory) => {
    try { await openProjectAssetFolder(projectId, category); }
    catch (cause) { pushToast({ kind: "error", title: "No se pudo abrir la carpeta", description: errorMessage(cause) }); }
  };

  if (error) return <EditorMessage error={error} />;
  if (!project || !form) return <div className="grid min-h-96 place-items-center"><LoaderCircle className="size-6 animate-spin text-orange-300" /></div>;

  return (
    <form onSubmit={(event) => void save(event)} className="mx-auto w-full max-w-6xl p-5 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to={"/projects/" + project.id} className="inline-flex items-center gap-2 text-xs text-stone-500 hover:text-stone-200"><ArrowLeft className="size-3.5" /> Cancelar y volver</Link>
        <button type="submit" disabled={busy !== null} className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-semibold text-stone-950 hover:bg-orange-400 disabled:opacity-50">{busy === "save" ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar cambios</button>
      </div>

      <header className="mt-6"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-orange-400/70">Metadatos locales</p><h1 className="mt-2 text-2xl font-semibold text-stone-100">Editar {project.displayName}</h1><p className="mt-2 text-sm text-stone-500">El nombre visual y los metadatos no alteran el archivo del DAW.</p></header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside>
          <div className="overflow-hidden rounded-2xl border border-white/[0.08]"><ProjectArtwork projectId={project.id} coverPath={project.coverPath} daw={project.daw} name={project.displayName} /></div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => void changeCover()} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-xs text-stone-400 hover:bg-white/[0.04] disabled:opacity-40"><ImagePlus className="size-4" /> Elegir portada</button>
            {project.coverPath ? <button type="button" disabled={busy !== null} onClick={() => void removeCover()} className="grid size-9 place-items-center rounded-xl border border-red-400/15 text-red-300 hover:bg-red-400/10 disabled:opacity-40" aria-label="Eliminar portada"><Trash2 className="size-4" /></button> : null}
          </div>
          <p className="mt-2 text-[0.65rem] leading-5 text-stone-600">PNG, JPG, WebP o GIF. Máximo 12 MB. Solo se guarda la ruta.</p>
        </aside>

        <div className="space-y-5">
          <section className="grid gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:grid-cols-2">
            <Field label="Nombre visual" wide><input required maxLength={200} value={form.displayName} onChange={(e) => patchForm({ displayName: e.currentTarget.value })} className={inputClass} /></Field>
            <Field label="BPM"><input type="number" min="1" max="999" step="0.01" value={form.bpm ?? ""} onChange={(e) => patchForm({ bpm: e.currentTarget.value ? Number(e.currentTarget.value) : null })} className={inputClass} /></Field>
            <Field label="Tonalidad"><input maxLength={32} value={form.musicalKey ?? ""} onChange={(e) => patchForm({ musicalKey: e.currentTarget.value || null })} placeholder="F#m" className={inputClass} /></Field>
            <Field label="Género">
              <Select
                ariaLabel="Género"
                value={usesCustomGenre ? customGenreValue : form.genre ?? ""}
                onChange={(value) => {
                  setUsesCustomGenre(value === customGenreValue);
                  patchForm({ genre: value && value !== customGenreValue ? value : null });
                }}
                options={[
                  { value: "", label: "Sin género" },
                  ...genreOptions.map((genre) => ({ value: genre, label: genre })),
                  { value: customGenreValue, label: "Otro…" },
                ]}
                searchable
                searchPlaceholder="Buscar género…"
              />
              {usesCustomGenre ? (
                <input
                  autoFocus
                  maxLength={100}
                  value={form.genre ?? ""}
                  onChange={(event) => patchForm({ genre: event.currentTarget.value || null })}
                  placeholder="Escribe un género"
                  className={inputClass + " mt-2"}
                />
              ) : null}
            </Field>
            <Field label="Estado"><Select ariaLabel="Estado" value={form.status} onChange={(value) => patchForm({ status: value })} options={facets.statuses.map((status) => ({ value: status.key, label: status.label }))} /></Field>
            <Field label="Calificación"><Select ariaLabel="Calificación" value={form.rating?.toString() ?? ""} onChange={(value) => patchForm({ rating: value ? Number(value) : null })} options={[{ value: "", label: "Sin calificar" }, ...[0,1,2,3,4,5].map((rating) => ({ value: rating.toString(), label: `${rating} / 5` }))]} /></Field>
            <Field label="Etiquetas separadas por comas" wide><input value={tagText} onChange={(e) => setTagText(e.currentTarget.value)} placeholder="cliente, urgente, house" className={inputClass} /><p className="mt-1 text-[0.62rem] text-stone-600">Hasta 20 etiquetas de 40 caracteres.</p></Field>
            <Field label="Notas" wide><textarea rows={7} maxLength={10000} value={form.notes ?? ""} onChange={(e) => patchForm({ notes: e.currentTarget.value || null })} className={inputClass + " min-h-36 py-3"} /></Field>
          </section>

          <section className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.035] p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-100/80"><TriangleAlert className="size-4 text-amber-300" /> Renombrar el archivo físico</div>
            <p className="mt-2 text-xs leading-5 text-amber-100/45">Acción separada y explícita. Conserva la extensión {project.extension} y nunca cambia el nombre visual.</p>
            <div className="mt-4 flex gap-2"><input value={renameStem} onChange={(e) => setRenameStem(e.currentTarget.value)} maxLength={200} disabled={project.isMissing} className={inputClass + " flex-1"} /><button type="button" disabled={busy !== null || project.isMissing || !renameStem.trim()} onClick={() => void renamePhysical()} className="h-10 rounded-xl border border-amber-400/20 px-4 text-xs font-medium text-amber-200 hover:bg-amber-400/10 disabled:opacity-35">Renombrar…</button></div>
            <p className="mt-2 break-all text-[0.62rem] text-stone-600">Actual: {project.filePath}</p>
          </section>

          <section className="rounded-2xl border border-white/[0.07] p-5">
            <h2 className="text-sm font-medium text-stone-300">Carpetas de producción</h2>
            <p className="mt-2 text-xs text-stone-600">Rutas opcionales para stems, mixes, masters y referencias. No se mueve ningún archivo.</p>
            <div className="mt-4 space-y-2">
              {folderCategories.map((item) => {
                const path = project.folders[item.value];
                return <div key={item.value} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-stone-400">{item.label}</p><p className="mt-1 truncate text-[0.62rem] text-stone-600" title={path ?? undefined}>{path ?? "Sin carpeta configurada"}</p></div>{path ? <><button type="button" onClick={() => void openAssetFolder(item.value)} className="grid size-8 place-items-center rounded-lg text-stone-500 hover:bg-white/5" title="Abrir carpeta"><FolderOpen className="size-4" /></button><button type="button" disabled={busy !== null} onClick={() => void clearAssetFolder(item.value)} className="grid size-8 place-items-center rounded-lg text-stone-600 hover:bg-red-400/10 hover:text-red-300" title="Quitar ruta"><Trash2 className="size-4" /></button></> : null}<button type="button" disabled={busy !== null} onClick={() => void changeAssetFolder(item.value)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 text-[0.65rem] text-stone-400 hover:bg-white/5 disabled:opacity-40"><FolderPlus className="size-3.5" /> {path ? "Cambiar" : "Elegir"}</button></div>;
              })}
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3 text-sm text-stone-200 outline-none placeholder:text-stone-700 focus:border-orange-400/40 disabled:opacity-40";
const folderCategories: { value: ProjectFolderCategory; label: string }[] = [
  { value: "stems", label: "Stems" }, { value: "mixes", label: "Mixes" },
  { value: "masters", label: "Masters" }, { value: "references", label: "Referencias" },
];
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-[0.68rem] text-stone-500">{label}</span>{children}</label>; }
function EditorMessage({ error }: { error: string }) { return <div className="mx-auto max-w-xl p-8"><div className="rounded-2xl border border-red-400/20 bg-red-400/[0.05] p-6 text-center"><CircleAlert className="mx-auto size-6 text-red-300" /><p className="mt-3 text-sm text-red-100/70">{error}</p><Link to="/library" className="mt-4 inline-block text-xs text-stone-400 underline">Volver a la biblioteca</Link></div></div>; }
