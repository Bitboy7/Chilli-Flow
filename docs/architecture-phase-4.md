# Phase 4 architecture

Phase 4 adds editable project metadata while keeping filesystem mutation
separate from ordinary form updates.

## Request flow

    Project detail/editor
      -> typed project service
      -> allowlisted Tauri command
      -> ProjectDetailService validation
      -> ProjectDetailRepository transaction
      -> SQLite

The metadata command accepts no project path. It updates the visual name, BPM,
musical key, genre, status, rating, notes and tags. Tag replacement and metadata
changes share one SQLite transaction. Rescanning continues to preserve the
visual name.

## Filesystem boundary

Open, reveal, folder-open and rename operations receive only a numeric project
ID from React. Rust loads the path and watched-folder list from SQLite,
canonicalizes existing paths and verifies containment before calling an OS
adapter. Windows, macOS and Linux use separate process arguments without a
shell command assembled from user text.

Physical rename has a dedicated command and confirmation in the UI. Rust
rejects path components, preserves the known DAW extension, refuses to
overwrite an existing target and attempts to roll back the filesystem rename if
the database update fails.

## Artwork

Rust owns the native image dialog. PNG, JPEG, WebP and GIF files up to 12 MB are
accepted. SQLite stores only the canonical path. React requests a bounded data
URL on demand, waits until artwork approaches the viewport and caches it in
memory by project ID and path.

## Verification on July 19, 2026

- `pnpm check`: passed.
- `pnpm test`: 9 tests passed across 3 files.
- `pnpm build`: passed; 1,840 modules transformed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 17 tests passed.
- `pnpm tauri build --debug --no-bundle`: passed on Windows.
- Hidden executable smoke test: process remained running after startup.

No manual visual inspection was performed in this verification run. Associated
files and audio preview intentionally remain Phase 5 work.
