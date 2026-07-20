ALTER TABLE project_files ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual', 'discovered'));
ALTER TABLE project_files ADD COLUMN source_label TEXT;
ALTER TABLE project_files ADD COLUMN relative_path TEXT;
ALTER TABLE project_files ADD COLUMN category_overridden INTEGER NOT NULL DEFAULT 0
    CHECK (category_overridden IN (0, 1));
ALTER TABLE project_files ADD COLUMN is_ignored INTEGER NOT NULL DEFAULT 0
    CHECK (is_ignored IN (0, 1));
ALTER TABLE project_files ADD COLUMN last_seen_at TEXT;

CREATE INDEX idx_project_files_origin
    ON project_files(project_id, origin, is_ignored);
