# Phase 2 architecture

Phase 2 adds an explicit, cancellable pipeline:

    native folder dialog
      → canonical path validation
      → watched_folders repository
      → background walkdir scan
      → progress events
      → transactional project upsert
      → missing-path reconciliation

The scanner never holds the SQLite mutex while traversing files. A single scan
session can run at a time and uses an atomic cancellation token. Partial results
are persisted after cancellation, but missing-path reconciliation is skipped.

Known DAW formats live in scanner/catalog.rs. Enabled custom extensions are read
from SQLite once per scan session and merged without allowing a custom entry to
override a built-in DAW.
