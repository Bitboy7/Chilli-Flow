# Phase 6 architecture and release evidence

Phase 6 closes the local-first MVP with persistent scan history, conservative
moved-project reconciliation, bounded media handling, additional resilience
tests and a distributable Windows package.

## Scan history

Migration v3 extends each per-folder scan record with moved, marked-missing and
unreadable-entry counters. The history query is ordered newest first, paginated
in SQLite and capped at 100 records per request. React requests 20 records at a
time and refreshes after the scan-finished event.

If the process closes while a scan row is still marked as running, database
startup changes that row to failed, records a finish timestamp and preserves an
existing error message when one exists.

## Moved and missing projects

Reconciliation runs only after a complete folder walk. An indexed path that was
not rediscovered and a new path are considered the same project only when:

- both are inside the folder currently being scanned;
- filename, normalized extension and file size match;
- exactly one old path and exactly one new path share that signature.

The existing project row receives the new physical path and filesystem
metadata, so display name, notes, tags, favorite state and other editable
metadata remain attached. Ambiguous matches are deliberately not guessed. They
become a new project plus a missing old project during the normal upsert and
missing-path steps.

Cancelled scans and scans with unreadable entries persist projects already
discovered but skip both move reconciliation and missing marking. This prevents
permission or transient I/O failures from creating false missing indicators.

## Performance boundaries

- Project and scan-history screens read bounded SQLite pages.
- Search is debounced and all SQL values are bound parameters.
- Reconciliation and missing checks query only paths under the current watched
  folder instead of materializing the complete project library.
- Scanning runs on Tauri's blocking worker pool and reports progress every 250
  files.
- Secondary React routes are emitted as lazy chunks.
- Artwork is accepted up to 12 MB, decoded by Rust, reduced to at most 640×400
  and returned as PNG. React loads it near the viewport and keeps at most 128
  entries in its in-memory cache.

## Release verification

Verified on Windows on July 19, 2026:

- strict TypeScript check and optimized Vite build passed;
- 14 Vitest tests passed across four files;
- 28 Rust tests passed;
- release-mode Tauri compilation passed;
- an x64 NSIS installer was produced;
- the release executable started and remained active during a hidden smoke
  test;
- the real application database migrated to schema v4 while preserving 249
  indexed projects.

The installer is not installed automatically by the build or test workflow.
macOS and Linux packaging must be performed on their respective operating
systems. Actual window rendering and speaker output were not manually
inspected in this automated run.
