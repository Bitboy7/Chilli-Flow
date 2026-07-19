CREATE INDEX idx_project_tags_tag_project
    ON project_tags(tag_id, project_id);

CREATE INDEX idx_projects_library_modified
    ON projects(is_missing, file_modified_at DESC, id DESC);

CREATE INDEX idx_projects_library_created
    ON projects(is_missing, file_created_at DESC, id DESC);

CREATE INDEX idx_projects_library_bpm
    ON projects(is_missing, bpm, id DESC);
