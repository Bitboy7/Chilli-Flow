# Chilli Beat

[Versión en español](README.es.md)

Chilli Beat is a cross-platform desktop library for finding and organizing
music-production projects without moving the original files.

The project currently includes **all six planned MVP phases**.

## Current features

- Tauri 2 desktop shell with React, strict TypeScript and Vite.
- Dark responsive interface built with Tailwind CSS and Lucide icons.
- React Router navigation and focused Zustand stores.
- SQLite database owned by Rust, with transactional migrations, foreign keys,
  WAL mode and indexed project paths.
- Explicit watched-folder selection through the native system dialog.
- Enable, disable and remove watched folders without deleting indexed projects
  or physical files.
- Manual scan of one folder or every enabled folder.
- Recursive background scanning with progress events and cancellation.
- Transactional insert/update of detected projects.
- Missing projects are marked only after a complete scan, never after a
  cancelled scan.
- Built-in and user-defined project extensions.
- Friendly errors, confirmations and toast notifications.
- Paginated visual library with card and table views.
- Debounced search over display and original filenames.
- SQLite-backed filters for DAW, extension, status, genre, tags and favorites.
- Safe sorting by name, modified date, creation date, BPM or import date.
- Dedicated Favorites, Recent, DAW and Status library scopes.
- Project detail and editor routes backed by SQLite, with BPM, key, genre,
  status, rating, notes and tag editing.
- Favorite actions from the library and project detail.
- Explicit artwork selection with lazy loading and an in-memory cover cache.
- Safe project opening, folder opening and reveal-in-file-manager actions.
- Physical rename is isolated behind a separate confirmation and preserves the
  project extension; editing the display name never renames the original file.
- Associated-file view for stems, mixes, masters, previews, references,
  artwork, MIDI, presets, samples and other files.
- Multiple files can be explicitly selected, classified, opened and removed
  from the library without changing the physical originals.
- WAV, MP3, FLAC and OGG preview selector and player with play/pause, seek,
  duration and volume controls.
- Editable folders for stems, mixes, masters and references, including direct
  open actions and no automatic file movement.
- Paginated scan history with created, updated, moved, missing and unreadable
  metrics.
- Conservative moved-project reconciliation that preserves editable metadata
  when one unique old/new file pair matches.
- Lazy-loaded secondary routes plus Rust-generated 640×400 thumbnails and a
  bounded, viewport-aware thumbnail cache.

## Supported project formats

| Extension | DAW |
| --- | --- |
| .flp | FL Studio |
| .als | Ableton Live |
| .rpp | REAPER |
| .cpr | Cubase |
| .song | Studio One |
| .ptx | Pro Tools |
| .logicx | Logic Pro |
| .band | GarageBand |
| .reason | Reason |

Additional alphanumeric extensions can be created, disabled and removed from
Settings. Built-in definitions remain centralized in Rust.

## Technology

- Tauri 2
- React 19
- TypeScript
- Vite 7
- Rust
- SQLite through rusqlite with bundled SQLite
- Tailwind CSS 4
- Zustand 5
- React Router 7
- Lucide React

Electron is not used.

## Requirements

- Node.js 22 or a compatible LTS release.
- pnpm 11.
- Stable Rust.
- The platform-specific Tauri 2 prerequisites:
  https://v2.tauri.app/start/prerequisites/

Windows requires Microsoft C++ Build Tools and WebView2.

## Install and run

    pnpm install
    pnpm tauri dev

Running pnpm dev starts only the web interface. Native dialogs, Rust commands
and SQLite require pnpm tauri dev.

On machines where Windows Application Control blocks build scripts generated
inside Documents, use an allowed Cargo target directory:

    $env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
    pnpm tauri dev

## How scanning works

1. The user explicitly selects a concrete project folder.
2. Rust canonicalizes the path and verifies that it exists and is a directory.
3. Full disk roots are rejected.
4. The scanner walks recursively without following symbolic links.
5. Known and enabled custom extensions are matched case-insensitively.
6. Logic Pro and GarageBand packages are indexed as projects without scanning
   their internal contents.
7. Results are written inside SQLite transactions.
8. Existing editable names are preserved during rescans.
9. Before inserting a new row, a completed scan conservatively reconciles one
   unique old/new path with the same filename, extension and size.
10. Remaining indexed paths that disappeared are marked as missing.
11. Cancelling or encountering unreadable entries preserves accessible
    discoveries but skips move and missing-file reconciliation.

No scan starts automatically.

## Database

The database is created in the application-data directory returned by Tauri for
the current platform. Its filename is chilli-beat.sqlite3.

The schema contains:

- projects
- project_statuses
- watched_folders
- tags
- project_tags
- project_files
- project_folders
- scan_history
- custom_extensions
- settings
- schema_migrations

Schema migration v2 adds indexes for tag filtering and common library sort
orders. Migration v3 adds scan-history reconciliation metrics. Migration v4
adds categorized production-folder paths. Project and history queries use
pagination; project filters use bound parameters, allowlisted sort expressions
and a maximum page size of 100.

Scan rows left in the running state by an interrupted process are recovered as
failed at the next application startup, with a finish timestamp and diagnostic
message.

Audio and artwork files are never stored as SQLite blobs. Artwork paths are
stored in Phase 4 and image bytes are read on demand for display.

## Security

- The frontend has no shell permission.
- It has no unrestricted filesystem permission.
- The only Phase 2 plugin capability is dialog:allow-open.
- Rust validates every watched-folder path received from the frontend.
- Symbolic links are not followed by the scanner.
- Whole-drive roots are rejected.
- User files are never moved or deleted. A project file can only be renamed
  from its dedicated editor action after explicit confirmation.
- Open, reveal and physical-rename commands resolve paths from a project ID in
  SQLite and verify that the path belongs to a watched folder.
- Artwork is selected through a Rust-owned native dialog, restricted to known
  raster formats and 12 MB.
- The asset protocol starts with an empty scope. Rust authorizes one stored,
  existing audio path only after validating its project ID, file ID and format.
- The CSP blocks undeclared sources, objects and frames.

## Architecture

    React UI
      → typed Tauri service
      → exposed command
      → domain service
      → repository
      → SQLite

Long-running scans run outside the UI thread and send progress through Tauri
events. SQLite is locked only for short transactional persistence operations,
not while walking the filesystem. Library results are fetched page by page;
the frontend does not load the full project collection into memory.

Important directories:

    src/
      components/
      hooks/
      pages/
      services/
      stores/
      types/
      utils/

    src-tauri/src/
      commands/
      database/
      errors/
      models/
      platform/
      repositories/
      scanner/
      services/
      state/

## Verification

    pnpm check
    pnpm test
    pnpm build
    cargo test --manifest-path src-tauri/Cargo.toml
    pnpm tauri build --bundles nsis

Verified on Windows on July 19, 2026:

- TypeScript strict check: passed.
- Vitest: 14 tests passed across 4 files.
- Rust: 28 tests passed.
- Optimized Tauri release build: passed.
- Windows NSIS installer creation: passed.
- Release runtime smoke test: the process started and remained stable.
- Real application database migrated to schema v4 while retaining 249 indexed
  projects.
- Final initial JavaScript chunk: 283.54 KB (89.46 KB gzip); secondary screens
  are emitted as lazy chunks.

Final Windows artifact:

    C:\Users\dev-y\.cargo\chilli-beat-target\release\bundle\nsis\Chilli Beat_0.1.0_x64-setup.exe

    Size: 3,295,660 bytes
    SHA-256: BED2A2CFF3ED7BD37B50FA6CF0333DE2143531633ED5DD7F6E8277FE85A17EE5

The installer was built but not installed automatically. The window and actual
audio output were not manually inspected during the automated verification.
`cargo fmt --check` could not run because rustfmt is not installed in the
current Rust toolchain.

If required by Windows Application Control:

    $env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
    cargo test --manifest-path src-tauri/Cargo.toml
    pnpm tauri build --bundles nsis

## Known limitations

- Automatic scanning and filesystem watchers are intentionally not enabled;
  scans remain explicit user actions.
- Move detection is deliberately conservative: name, extension and size must
  identify exactly one old and one new path inside the scanned folder.
- Audio codec support depends on the operating-system webview. Actual speaker
  output was not manually tested in this run.
- Windows release and NSIS packaging are verified. macOS and Linux builds need
  to be produced and tested on those operating systems.
- Custom project statuses remain a future extension; the eight seeded MVP
  statuses are available now.

## Phase documentation

- [Phase 3 architecture](docs/architecture-phase-3.md)
- [Phase 4 architecture](docs/architecture-phase-4.md)
- [Phase 5 architecture](docs/architecture-phase-5.md)
- [Phase 6 architecture and release evidence](docs/architecture-phase-6.md)
