# Chilli Beat

[Leer en español](README.es.md)

Chilli Beat is a local-first desktop workspace for music producers who organize sessions across different DAWs, compare mixes and references, recover project context, and turn unfinished ideas into finished songs.

It indexes existing projects without relocating them, keeps backups attached to their primary session, discovers new audio exported inside a project, and creates neutral collaboration packages without claiming that proprietary DAW formats can be converted perfectly.

> **Status:** active desktop beta (`0.1.0`). Windows is the currently verified workflow. The Tauri architecture can also target macOS and Linux, but those releases still require platform-specific validation.

## Product principles

- **Local-first:** metadata remains in a local SQLite database; no account or cloud service is required.
- **Non-destructive:** Chilli Beat stores paths and derived metadata. It does not reorganize, move, or delete source projects and audio.
- **DAW-neutral:** `.flp`, `.als`, `.rpp`, and other native sessions stay in their original format and open in their native DAW.
- **Production-focused:** organization, listening, comparison, completion planning, versions, and handoff live in one project workspace.

## Current features

### Multi-DAW project library

- Recursively index only folders selected by the user; drive roots and symbolic-link traversal are rejected.
- Run cancellable scans outside the UI thread and review persisted scan history with created, updated, moved, missing, and unreadable counts.
- Search, filter, sort, favorite, and paginate large libraries.
- Filter by DAW, extension, status, genre, tags, and favorites.
- Reconcile a uniquely moved project without discarding its local metadata.
- Register additional safe alphanumeric project extensions from Settings.

### Project metadata and artwork

- Store a display name, BPM, musical key, genre, status, rating, tags, notes, and favorite state without editing the native DAW file.
- Choose from 50 predefined genres or enter a custom genre.
- Assign local PNG, JPEG, WebP, or GIF artwork; only the path and a bounded thumbnail are stored.
- Use deterministic minimal fallback artwork when a project has no cover.
- Keep visual-name editing separate from the validated physical-file rename action.
- Configure project folders for stems, mixes, masters, and references.

> BPM and musical key are currently user-managed metadata. Automatic tempo and key detection are not implemented yet.

### Managed project workspaces

Create a project by choosing a name, parent location, DAW, and optional real DAW template. Chilli Beat detects common DAW installations and prepares a neutral structure:

```text
Project Name/
├── Project Files/
├── Audio/
│   ├── Stems/
│   ├── Mixes/
│   └── Masters/
├── MIDI/
├── References/
├── Artwork/
├── Handoffs/
└── Project Info.json
```

Chilli Beat never fabricates a proprietary session. With a matching template, it copies the real project into `Project Files`; without one, the workspace waits for the first save from the selected DAW and links that session during the next library scan.

Existing projects can also preview and apply a non-destructive folder proposal adapted to the DAW. Only missing directories are created; existing files are never moved.

### Automatic project-audio discovery

The **Audio & files** tab synchronizes recognized project folders when it opens, when the application regains focus after returning from a DAW, and when the user presses **Refresh**.

For FL Studio projects it recognizes:

| Folder | Default classification |
| --- | --- |
| `Renders/Mixes` | Mix |
| `Renders/Stems` | Stem |
| `Renders/Masters` | Master |
| `Renders` | Mix/render |
| `Audio` | Project audio |
| `Samples` | Project audio/sample |
| `References` | Reference |
| `Backup` / `Backups` | Excluded from audio discovery |

Managed Chilli Beat workspaces also recognize `Audio/Stems`, `Audio/Mixes`, `Audio/Masters`, and `References`. Explicitly configured production folders have priority over inferred conventions.

- Discover WAV, MP3, FLAC, OGG, M4A, AAC, AIFF, and AIF files without copying them.
- Group results by source folder and distinguish discovered files from manually associated files.
- Deduplicate by canonical path.
- Preserve category changes made by the user during later synchronizations.
- Hide a discovered file permanently from the project view without deleting it from disk.
- Mark previously associated files as missing when their source path no longer exists.
- Bound recursive discovery to recognized folders, six levels, and 2,000 files per synchronization.

### Persistent player and comparison workflow

- Keep playback active while navigating through the library and every project tab.
- Persist the queue, current track, position, volume, repeat mode, and shuffle state in SQLite.
- Add, remove, and reorder queue entries.
- Associate stems, mixes, masters, previews, references, MIDI, presets, samples, artwork, and other files manually when needed.
- Assign two tracks to A/B decks and switch between synchronized sources.
- Apply optional LUFS-based level matching when both analyses are available.
- Preview WAV, MP3, FLAC, and OGG directly from their original path without conversion.

Files such as M4A, AAC, AIFF, and AIF can be discovered and organized, but the current built-in player and analyzer are limited to WAV, MP3, FLAC, and OGG.

### Audio analysis

Run analysis on a compatible associated file to obtain:

- Duration, sample rate, bit depth, and channel count.
- Integrated LUFS, loudness range, and true peak.
- A large normalized amplitude waveform with time markers.
- Rule-based technical observations for level, peak headroom, and dynamics.
- Cached results that are invalidated when file size or modification time changes.
- Clear loading animation, recoverable error state, and retry action.

The waveform represents amplitude over time; it is not an FFT frequency spectrum.

### Finish Mode

Finish Mode turns an archive of unfinished ideas into an actionable production queue:

- Overview of projects in progress, stale for 90 days, without a preview, in mixing, and nearly finished.
- Checklist for structure, recording, editing, mixing, mastering, artwork, and distribution.
- Next action, target date, low/medium/high priority, current blocker, and focus state.
- Maximum of three focus projects to keep the active workload intentional.
- Project-level completion plan connected to the main library.

### Versions and backups

- Detect explicit backups and copies such as `backup`, `autosave`, `copy`, FL Studio's `autosaved at`, and `overwritten at` files.
- Hide orphan autosaves from the main library and attach them when a matching primary session appears.
- Group high-confidence matches under the primary project.
- Present ambiguous numbered versions, such as `v2`, for review instead of guessing.
- Open, reveal, confirm, detach, or promote a related version.
- Keep backups out of Library and Finish Mode as independent projects.

### Universal Handoff Package

Chilli Beat does not promise DAW-to-DAW conversion. It creates a versioned neutral package for collaborators:

```text
Project — Handoff v1/
├── Audio/
│   ├── Stems/
│   │   ├── Wet/
│   │   ├── Dry/
│   │   └── Neutral/
│   ├── Mixes/
│   └── Masters/
├── MIDI/
├── References/
├── Preview/
├── Artwork/
├── Project Files/
├── Project Info.json
├── Checksums.sha256
└── README.pdf
```

A handoff can include the native project, selected associated files, wet/dry/neutral variants, BPM, key, time signature, common start point, DAW version, plugin list, collaborator notes, technical audio metadata, incremental package versioning, and SHA-256 verification. Sources are copied into a staging directory and are never moved or rewritten.

### Personalization and accessibility

- Choose among five persistent accent themes: Chilli, Crimson, Lime, Ocean, and Violet.
- Use modern keyboard-focus states, accessible labels, native media controls, and reduced-motion fallbacks.
- Keep project artwork colors present in the animated ambient project header without obscuring content.

## Supported project formats

| Extension | DAW |
| --- | --- |
| `.flp` | FL Studio |
| `.als` | Ableton Live |
| `.rpp` | REAPER |
| `.cpr` | Cubase |
| `.song` | Studio One |
| `.ptx` | Pro Tools |
| `.logicx` | Logic Pro |
| `.band` | GarageBand |
| `.reason` | Reason |

Additional safe extensions can be managed in Settings without replacing the built-in catalog.

## Local data and safety

- Project metadata, scan history, Finish Mode, playback state, analyses, handoff history, and discovered-file state are stored in SQLite schema v10.
- Artwork and audio remain on disk; media is not stored as database blobs.
- Library scans start only when requested and can be cancelled.
- Project-audio synchronization reads only recognized or explicitly configured project folders.
- Open and reveal operations resolve stored IDs and validate trusted paths.
- Physical rename is isolated behind a dedicated validated command.
- Handoff output is finalized only after every staged file has been written successfully.

## Technology

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri 2 |
| Interface | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| State and navigation | Zustand 5, React Router 7 |
| Native core | Rust |
| Database | SQLite through bundled `rusqlite` |
| Audio decoding and analysis | Symphonia and EBU R128 |
| Filesystem discovery | `walkdir` with canonical-path validation |
| Artwork processing | `image` |
| Handoff verification | SHA-256 |
| Icons | Lucide React |

Electron is not used.

## Requirements

- Node.js 22 or a compatible LTS release.
- pnpm 11.
- Stable Rust.
- [Tauri 2 platform prerequisites](https://v2.tauri.app/start/prerequisites/).

Windows development also requires Microsoft C++ Build Tools and WebView2.

## Development

```powershell
pnpm install
pnpm tauri dev
```

`pnpm dev` starts only the Vite interface. Native dialogs, Rust commands, SQLite, filesystem validation, audio authorization, and handoff generation require `pnpm tauri dev`.

If Windows Application Control blocks Cargo output inside `Documents`:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
pnpm tauri dev
```

If port `1420` is already in use, stop the previous Vite process before starting another Tauri development session.

## Verification

```powershell
pnpm check
pnpm build
pnpm exec vitest run src
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
pnpm tauri build --bundles nsis
```

The current codebase passes **17 frontend tests** and **52 Rust tests**. Build and installer commands should still be rerun on the target machine before publishing.

## Architecture

```text
React page or component
  → typed frontend service
  → allowlisted Tauri command
  → Rust domain service
  → repository
  → SQLite or validated filesystem operation
```

Long-running library scans run outside the UI thread. Filesystem walking happens before short database transactions, and library queries are paginated.

```text
src/                 React interface, stores, components, and typed services
src-tauri/src/       Rust core, scanner, domain services, repositories, and SQLite
website/             Product-presentation site
docs/                Historical architecture and milestone notes
```

## Known limitations

- Native project internals are not converted between DAWs.
- A handoff cannot preserve every routing graph, automation lane, plugin, virtual instrument, preset, sidechain, marker, tempo map, or DAW-specific edit.
- BPM and key are not automatically detected from audio yet.
- Library indexing remains user-triggered. Project-audio discovery refreshes on tab entry, application focus, or manual refresh; there is no continuous filesystem watcher.
- Backup grouping is conservative, and ambiguous matches require user confirmation.
- Playback codec behavior can depend on the operating-system webview.
- Windows is the actively verified target; macOS and Linux releases need platform-specific testing.

## Additional documentation

Historical design and architecture notes remain under [docs](docs/). They describe earlier implementation milestones; this README and [README.es.md](README.es.md) are the source of truth for the current product.