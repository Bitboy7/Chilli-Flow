# Phase 5 architecture

Phase 5 associates user-owned files with a project without copying, moving or
deleting them. SQLite stores canonical paths and classification metadata only.

## Associated files

React submits a project ID and an allowlisted category. Rust owns the native
multi-file dialog, canonicalizes every selection, verifies that it is a file
and records its name, extension and size in one transaction. The unique
`(project_id, file_path)` constraint converts repeated selections into category
updates instead of duplicates.

Removing an item deletes only its `project_files` row. If it was the selected
preview, `projects.preview_path` is cleared in the same transaction. Opening an
item resolves its path from the stored file ID; React cannot provide the path.

## Audio playback

The supported MVP formats are WAV, MP3, FLAC and OGG. Selecting a preview saves
the existing associated path on the project. Before playback, Rust resolves the
project/file pair, canonicalizes the existing path, checks the extension and
adds only that file to Tauri's runtime asset scope. The configured static asset
scope is empty.

The React player uses the original asset without conversion and provides
play/pause, progress seeking, elapsed time, duration and volume. Only the
selected preview is loaded.

## Verification on July 19, 2026

- `pnpm check`: passed.
- `pnpm test`: 11 tests passed across 3 files.
- `pnpm build`: passed; 1,842 modules transformed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 20 tests passed.
- `pnpm tauri build --debug --no-bundle`: passed on Windows.
- Hidden executable smoke test: process remained running after startup.

Actual speaker output and every platform codec were not manually tested. Audio
support ultimately depends on the operating-system webview codec availability.
