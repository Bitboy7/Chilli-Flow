# Phase 3 architecture

Phase 3 adds a bounded query pipeline:

    top-bar search and filter panel
      → 300 ms debounce
      → Zustand query DTO
      → list_projects Tauri command
      → allowlisted sort selection
      → parameterized SQLite query
      → ProjectPage with at most 100 rows

The default page size is 24. A monotonically increasing request identifier in
the Zustand store prevents a slow, stale response from replacing a newer query.

Search covers display_name and original_name. Filters cover DAW, extension,
status, genre, tag and favorite state. Facets are queried separately so project
rows remain bounded.

Migration v2 adds:

- a tag_id-first index for tag filtering;
- missing-state plus modified-date ordering;
- missing-state plus creation-date ordering;
- missing-state plus BPM ordering.

Sort fields and directions are Rust enums. The frontend cannot send SQL column
names or expressions. All filter values are bound through rusqlite.
