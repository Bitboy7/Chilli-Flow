CREATE TABLE project_handoff_settings (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    daw_version TEXT,
    time_signature TEXT NOT NULL DEFAULT '4/4',
    common_start TEXT NOT NULL DEFAULT '00:00:00.000',
    collaborator_notes TEXT,
    plugins_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE handoff_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    destination_path TEXT NOT NULL,
    file_count INTEGER NOT NULL CHECK (file_count >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(project_id, version_number)
);

CREATE INDEX idx_handoff_exports_project_created
    ON handoff_exports(project_id, created_at DESC);
