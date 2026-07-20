ALTER TABLE projects ADD COLUMN workspace_root TEXT;
ALTER TABLE projects ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'scanned'
    CHECK (source_kind IN ('scanned', 'managed_pending', 'managed'));

CREATE UNIQUE INDEX idx_projects_workspace_root
    ON projects(workspace_root)
    WHERE workspace_root IS NOT NULL;

