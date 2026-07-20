ALTER TABLE projects ADD COLUMN parent_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN version_kind TEXT NOT NULL DEFAULT 'primary'
    CHECK (version_kind IN ('primary', 'backup', 'copy', 'version'));
ALTER TABLE projects ADD COLUMN version_confidence TEXT
    CHECK (version_confidence IS NULL OR version_confidence IN ('high', 'suggested', 'confirmed', 'rejected'));

CREATE INDEX idx_projects_parent_version
    ON projects(parent_project_id, version_confidence, file_modified_at DESC);
