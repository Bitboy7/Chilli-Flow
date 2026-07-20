# Chilli Beat

[Leer en español](README.es.md)

Chilli Flow is a local-first desktop workspace for music producers who need to organize projects across different DAWs, compare audio quickly, recover context, and finish more music.

It indexes existing sessions without relocating them, keeps backups and related versions attached to the right project, and creates portable collaboration packages without pretending that proprietary DAW formats can be converted perfectly.

> Current status: active desktop beta. The Windows workflow is the currently verified target; the architecture also supports macOS and Linux builds.

## Why Chilli Beat

A folder full of `.flp`, `.als`, `.rpp`, and bounced audio tells you where files are. It does not tell you which version matters, what is blocking a song, which mix is louder, or what a collaborator needs.

Chilli Beat adds that missing production context while keeping the filesystem and the DAW as the source of truth.

## Highlights

### One library for multiple DAWs

- Index selected folders recursively without scanning an entire drive.
- Search, filter, sort, favorite, and paginate large project libraries.
- Track BPM, key, genre, status, rating, tags, notes, artwork, and modification history.
- Support built-in and user-defined project extensions.
- Reconcile uniquely moved projects without discarding local metadata.

### Backups and versions

- Detect explicit backups and copies such as `backup`, `autosave`, `copy`, and FL Studio's `overwritten at` files.
- Group high-confidence matches under the primary project.
- Present ambiguous numbered versions, such as `v2`, for user confirmation.
- Open, reveal, detach, confirm, or promote a related version without modifying the DAW file.

### Managed project workspaces

Create a project by choosing a name, location, DAW, and optional real DAW template. Chilli Beat detects common DAW installations and prepares a neutral workspace:

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

Chilli Beat never fabricates a proprietary project file. With a template, it copies the real file into `Project Files`; without one, the workspace waits for the first save from the selected DAW and links it on the next scan.

### Persistent audio workflow

- Keep playback running while navigating between the library and project views.
- Build and persist a basic playback queue.
- Associate stems, mixes, masters, previews, references, MIDI, presets, samples, and artwork.
- Compare two tracks with level-matched A/B controls.
- Analyze duration, sample rate, bit depth, channel count, integrated LUFS, loudness range, true peak, and a compact waveform.
- Preview WAV, MP3, FLAC, and OGG files without converting the originals.

### Finish Mode

Finish Mode turns an unfinished-project archive into an actionable queue:

- Progress overview for active, stale, preview-less, mixing, and nearly finished projects.
- Checklist for structure, recording, editing, mixing, mastering, artwork, and distribution.
- Next action, target date, priority, current blocker, and up to three focus projects.
- A project-level completion workspace connected to the library.

### Universal Handoff Package

Chilli Beat does not promise impossible DAW-to-DAW conversion. It creates a neutral, versioned collaboration package:

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

Exports can include the original project, selected associated files, wet/dry/neutral variants, BPM, key, time signature, common start point, DAW version, plugins, collaborator notes, audio format metadata, incremental package versioning, and SHA-256 verification. Sources are copied, never moved or rewritten.

## Supported project formats

| Extension | DAW          |
| --------- | ------------ |
| `.flp`    | FL Studio    |
| `.als`    | Ableton Live |
| `.rpp`    | REAPER       |
| `.cpr`    | Cubase       |
| `.song`   | Studio One   |
| `.ptx`    | Pro Tools    |
| `.logicx` | Logic Pro    |
| `.band`   | GarageBand   |
| `.reason` | Reason       |

Additional safe alphanumeric extensions can be managed from Settings.

## Local-first and non-destructive

- Project metadata is stored locally in SQLite.
- No account or cloud service is required.
- Scanning starts only when the user requests it.
- The scanner does not follow symbolic links and rejects full-drive roots.
- Existing project and audio files are not moved or deleted.
- Display-name edits never rename the physical project.
- Physical rename is isolated behind a dedicated, validated action.
- Open and reveal commands resolve trusted paths from SQLite and validate their watched-folder scope.
- Artwork and audio remain on disk; SQLite stores paths and derived metadata, not media blobs.
- Handoff exports use temporary staging and are finalized only after their files are written.

## Technology

| Layer                | Technology                                   |
| -------------------- | -------------------------------------------- |
| Desktop shell        | Tauri 2                                      |
| Interface            | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| State and navigation | Zustand 5, React Router 7                    |
| Native core          | Rust                                         |
| Database             | SQLite through bundled `rusqlite`            |
| Audio analysis       | Symphonia and EBU R128                       |
| Icons                | Lucide React                                 |

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

`pnpm dev` runs only the Vite interface. Native dialogs, Rust commands, SQLite, filesystem validation, and audio authorization require `pnpm tauri dev`.

If Windows Application Control blocks Cargo output under `Documents`:

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
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build --bundles nsis
```

The current codebase is verified with 16 frontend tests and 45 Rust tests. Build and installer commands should be rerun on the target machine before publishing.

## Architecture

```text
React page or component
  → typed frontend service
  → allowlisted Tauri command
  → Rust domain service
  → repository
  → SQLite or validated filesystem operation
```

Long-running scans and audio analysis run outside the UI thread. Filesystem walking happens before short database transactions, and library queries are paginated.

```text
src/                 React interface and typed services
src-tauri/src/       Rust core, scanner, repositories, and SQLite
website/             Marketing and product-presentation site
docs/                Historical architecture notes
```

## Known limitations

- Projects open in their native DAW; Chilli Beat does not convert proprietary session internals.
- A Handoff cannot guarantee routing, automation, plugins, virtual instruments, presets, sidechains, tempo maps, or DAW-specific edits.
- Scans are explicit; live filesystem watchers are not enabled.
- Backup grouping is conservative and ambiguous matches require review.
- Playback codec behavior can depend on the operating-system webview.
- Windows is the actively verified target. macOS and Linux releases require platform-specific testing.

## Additional documentation

Historical architecture notes remain available under [docs](docs/). They describe earlier implementation milestones; this README is the source of truth for the current product.
