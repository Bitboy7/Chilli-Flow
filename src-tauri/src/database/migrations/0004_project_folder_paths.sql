CREATE TABLE project_folders (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('stems', 'mixes', 'masters', 'references')),
    folder_path TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (project_id, category)
);

CREATE INDEX idx_project_folders_path ON project_folders(folder_path);
