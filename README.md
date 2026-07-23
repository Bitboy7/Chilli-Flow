<p align="center">
  <img src="src/assets/chilli-flow.png" width="180" alt="Chilli Flow logo">
</p>

# Chilli Flow

[Versión en español](README.es.md)

Chilli Flow is a local-first desktop workspace for music producers who organize sessions from multiple DAWs, compare mixes and references, recover project context, and turn unfinished ideas into completed tracks.

It indexes existing projects without relocating them automatically, offers an explicitly confirmed organization flow, keeps backups linked to their main sessions, discovers newly exported audio inside projects, and creates neutral collaboration packages without claiming that proprietary formats can be converted perfectly.

> **Status:** active desktop beta (`0.1.0`). Windows is the currently verified workflow. The Tauri architecture can also target macOS and Linux, but those builds still require platform-specific validation.

## Product principles

- **Local-first:** metadata stays in a local SQLite database; no account or cloud service is required.
- **Non-destructive by default:** Chilli Flow changes no file without a detailed preview and explicit confirmation. During organization, the user chooses whether to copy, move, or keep the project in place; destinations are never overwritten.
- **DAW-neutral:** `.flp`, `.als`, `.rpp`, and other native sessions keep their original format and open in their original DAW.
- **Production-focused:** organization, listening, comparison, completion planning, version management, and handoff live in one workspace.

## Current features

### Multi-DAW project library

- Recursively indexes only folders selected by the user; full drive roots are rejected and symbolic links are not followed.
- Runs cancellable scans away from the UI thread, removes deleted projects from the library, and protects subpaths that could not be read. Scan history records created, updated, moved, missing, and unreadable entries.
- Supports search, filtering, sorting, favorites, and pagination for large libraries.
- Filters by DAW, extension, status, genre, tags, and favorites.
- Reconciles a moved project when there is one unique match, preserving its local metadata.
- Lets users register additional safe alphanumeric project extensions in Settings.

### Metadata and artwork

- Stores display name, BPM, key, genre, status, rating, tags, notes, and favorite state without editing the native DAW file.
- Includes 50 predefined genres and accepts custom genres.
- Assigns local PNG, JPEG, WebP, or GIF artwork; only the path and a size-limited thumbnail are stored.
- Generates deterministic minimalist artwork when a project has no cover.
- Keeps display-name editing separate from validated physical file renaming.
- Configures project folders for stems, mixes, masters, and references.

> Analyzing compatible audio automatically estimates BPM and key and assigns the available results to the project. These estimates remain editable because complex rhythms, modulations, and sparse material can require manual correction.

### Managed workspaces

When creating a project, users choose a name, root folder, DAW, and an optional real template. Chilli Flow detects common DAW installations and prepares a neutral structure:

```text
Project name/
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

Chilli Flow never fabricates a proprietary session. With a compatible template, it copies the real project into `Project Files`; without a template, the workspace waits for the first save from the selected DAW and links that session during the next library scan.

Existing projects can preview an individual root and a DAW-aware folder proposal. For a loose project file, the user chooses **copy and organize** (recommended), **move and organize**, or **create folders only**. The preview exposes source, destination, folders, and risks before confirmation. Copying keeps the original as a confirmed version; moving preserves the project's identity and metadata. Projects that already have a dedicated root reuse it without creating a nested duplicate.

The design, guarantees, collision behavior, and recovery model are documented in [Existing project organization](docs/project-organization.md).

### Automatic audio discovery

The **Audio & Files** tab synchronizes recognized folders when it opens, when the application regains focus after returning from the DAW, and when the user selects **Refresh**.

For FL Studio projects, it recognizes:

| Folder | Initial classification |
| --- | --- |
| `Renders/Mixes` | Mix |
| `Renders/Stems` | Stem |
| `Renders/Masters` | Master |
| `Renders` | Mix/render |
| `Audio` | Project audio |
| `Samples` | Project audio/sample |
| `References` | Reference |
| `Backup` / `Backups` | Excluded from audio discovery |

Workspaces created by Chilli Flow also recognize `Audio/Stems`, `Audio/Mixes`, `Audio/Masters`, and `References`. Explicitly configured production folders take precedence over inferred conventions.

- Discovers WAV, MP3, FLAC, OGG, M4A, AAC, AIFF, and AIF without copying them.
- Groups results by source folder and distinguishes discovered files from manual associations.
- Prevents duplicates through canonical paths.
- Preserves user classifications during later synchronizations.
- Lets users permanently hide a discovered file without deleting it from disk.
- Marks associated files as missing when their original path no longer exists.
- Limits traversal to recognized folders, six levels, and 2,000 files per synchronization.

### Persistent player and comparison

- Keeps playing while users navigate the library and all project tabs.
- Persists the queue, current track, position, volume, repeat mode, and shuffle state in SQLite.
- Supports adding, removing, and reordering queue items.
- Manually associates stems, mixes, masters, references, MIDI, presets, samples, artwork, and other files when needed.
- Selects exactly one compatible audio file as the main preview; selecting another replaces the previous choice.
- Assigns two tracks to A/B decks and switches between synchronized sources.
- Applies optional LUFS-based level compensation when both analyses are available.
- Plays WAV, MP3, FLAC, and OGG directly from their original paths without conversion.
- Opens a real-time frequency spectrum that follows the audible A/B deck, respects the current theme, and never changes the source audio.

M4A, AAC, AIFF, and AIF files can be discovered and organized, but the built-in player and analyzer are currently limited to WAV, MP3, FLAC, and OGG.

### Audio analysis

Analysis of a compatible file provides:

- Duration, sample rate, bit depth, and channel count.
- Estimated BPM and musical key, automatically assigned to the project and available for manual correction.
- Integrated LUFS, loudness range, and true peak.
- A normalized-amplitude waveform with time markers.
- Rule-based technical observations for level, peak headroom, and dynamics.
- Cached results that are invalidated when file size or modification time changes.
- A clear loading state, recoverable error state, and retry action.

The waveform represents amplitude over time; it is not an FFT frequency spectrum.

### Finish Mode

Finish Mode turns a collection of unfinished ideas into an actionable production queue:

- Summaries for projects in progress, unopened for 90 days, without a preview, in mixing, and nearly finished.
- A checklist for arrangement, recording, editing, mixing, mastering, artwork, and distribution.
- Next action, target date, low/medium/high priority, current blocker, and focus state.
- A maximum of three focus projects to keep the active workload intentional.
- A project completion plan connected to the main library.

### Versions and backups

- Detects explicit backups and copies such as `backup`, `autosave`, `copy`, and FL Studio's `autosaved at` and `overwritten at` names.
- Hides orphaned autosaves from the main library and links them when a compatible primary session appears.
- Automatically groups high-confidence matches under the main project.
- Presents ambiguous numbered versions such as `v2` for review instead of guessing.
- Lets users open, reveal, confirm, detach, or promote a related version.
- Keeps backups out of the Library and Finish Mode as independent projects.

### Universal Handoff Package

Chilli Flow does not promise conversion between DAWs. It generates a single versioned ZIP with a neutral structure for collaborators:

```text
Project — Handoff v1.zip
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

The handoff can include the native project, selected associated files, wet/dry/neutral variants, BPM, key, time signature, common start point, DAW version, plugin list, collaborator notes, technical audio metadata, an incremental version, and SHA-256 verification. Sources are copied to a private temporary directory, compressed into one atomic ZIP, and never moved or rewritten.

### Customization and accessibility

- Offers five persistent accent themes: Chilli, Crimson, Lime, Ocean, and Violet.
- Uses keyboard focus states, accessible labels, native media controls, and reduced-motion alternatives.
- Integrates artwork colors into the animated ambient project header without obscuring content.

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

Additional safe extensions can be added in Settings without replacing the built-in catalog.

## Local data and security

- Metadata, scan history, Finish Mode, playback, analysis, handoff history, and discovered-file state are stored in SQLite using schema v11.
- Artwork and audio stay on disk; media is not stored as blobs in the database.
- Library scans start only when requested and can be cancelled.
- Audio synchronization reads only recognized folders or folders explicitly configured for the project.
- Open and reveal actions resolve stored identifiers and validate trusted paths.
- Physical renaming is isolated in a dedicated validated command.
- A handoff is finalized only after all files have been successfully written, compressed, and synchronized; incomplete temporary files and folders are removed.

## Technology

| Layer | Technology |
| --- | --- |
| Desktop application | Tauri 2 |
| Interface | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| State and routing | Zustand 5, React Router 7 |
| Native core | Rust |
| Database | SQLite through embedded `rusqlite` |
| Audio decoding and analysis | Symphonia and EBU R128 |
| File discovery | `walkdir` with canonical-path validation |
| Artwork processing | `image` |
| Handoff verification | SHA-256 |
| Icons | Lucide React |

Electron is not used.

## Requirements

- Node.js 22 or a compatible LTS release.
- pnpm 11.
- Stable Rust.
- [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for each platform.

Windows also requires Microsoft C++ Build Tools and WebView2.

## Development

```powershell
pnpm install
pnpm tauri dev
```

`pnpm dev` starts only the Vite interface. Native dialogs, Rust commands, SQLite, filesystem validation, audio authorization, and handoff generation require `pnpm tauri dev`.

If Windows Application Control blocks Cargo output inside `Documents`:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-flow-target"
pnpm tauri dev
```

If port `1420` is already in use, stop the previous Vite process before starting another Tauri session.

## Verification

```powershell
pnpm check
pnpm build
pnpm exec vitest run src
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
pnpm tauri build --bundles nsis
```

Run the build and installer commands again on the target machine before publishing.

## Architecture

```text
React page or component
  → typed frontend service
  → allowed Tauri command
  → Rust domain service
  → repository
  → SQLite or validated filesystem operation
```

Long-running library scans execute away from the UI thread. Filesystem traversal happens before short transactions, and library queries are paginated.

```text
src/                 React interface, stores, components, and typed services
src-tauri/src/       Rust core, scanner, services, repositories, and SQLite
website/             Product presentation website
docs/                Historical architecture and milestone notes
```

## Known limitations

- Native project internals are not converted between DAWs.
- A handoff cannot preserve every routing, automation, plugin, virtual instrument, preset, sidechain, marker, tempo map, or DAW-specific edit.
- Automatic BPM and key detection is heuristic; complex rhythms, tempo changes, modulations, or sparse material can produce estimates that need manual correction.
- Library indexing requires a user action. Audio discovery refreshes when the tab opens, the application regains focus, or the user selects Refresh; there is no permanent watcher.
- Backup grouping is conservative, and ambiguous matches require confirmation.
- Codec behavior can depend on the operating system's webview.
- Windows is the actively verified target; macOS and Linux require platform-specific testing.

## Additional documentation

Historical design and architecture notes remain available in [docs](docs/). They describe earlier milestones; this README is the source of truth for the current product.
