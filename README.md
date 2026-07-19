# Chilli Beat

[Versión en español](README.es.md)

Chilli Beat is a cross-platform desktop library for finding and organizing
music-production projects without moving the original files.

The project currently includes **Phase 1 and Phase 2** of the MVP.

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

Search, the paginated visual library and project cards belong to Phase 3.

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
9. A completed scan marks previously indexed paths that disappeared as missing.
10. Cancelling preserves partial discoveries but skips missing-file detection.

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
- scan_history
- custom_extensions
- settings
- schema_migrations

Audio and artwork files are never stored as SQLite blobs. Only their paths will
be recorded in later phases.

## Security

- The frontend has no shell permission.
- It has no unrestricted filesystem permission.
- The only Phase 2 plugin capability is dialog:allow-open.
- Rust validates every watched-folder path received from the frontend.
- Symbolic links are not followed by the scanner.
- Whole-drive roots are rejected.
- User files are never moved, renamed or deleted.
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
not while walking the filesystem.

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
    pnpm tauri build --debug --no-bundle

Verified on Windows on July 19, 2026:

- TypeScript strict check: passed.
- Vitest: 3 tests passed.
- Rust: 10 tests passed.
- Tauri debug build without bundling: passed.
- Hidden runtime smoke test: the process started and remained stable.

The window was not manually inspected during the automated verification.

If required by Windows Application Control:

    $env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
    cargo test --manifest-path src-tauri/Cargo.toml
    pnpm tauri build --debug --no-bundle

## Current limitations

- Phase 3 search, filters, sorting, pagination and project cards are not yet
  implemented.
- Project metadata editing starts in Phase 4.
- Associated files and audio preview start in Phase 5.
- Scan-history UI and moved-file heuristics remain scheduled for Phase 6,
  although scan-history records are already persisted.
- Automatic scanning and filesystem watchers are intentionally not enabled.
