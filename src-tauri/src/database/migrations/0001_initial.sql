CREATE TABLE project_statuses (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO project_statuses (key, label, color, sort_order, is_system) VALUES
    ('idea', 'Idea', '#A78BFA', 10, 1),
    ('in_progress', 'En progreso', '#FB7185', 20, 1),
    ('arrangement', 'Arreglo', '#F59E0B', 30, 1),
    ('recording', 'Grabación', '#EF4444', 40, 1),
    ('mixing', 'Mezcla', '#38BDF8', 50, 1),
    ('mastering', 'Masterización', '#2DD4BF', 60, 1),
    ('finished', 'Terminado', '#84CC16', 70, 1),
    ('archived', 'Archivado', '#94A3B8', 80, 1);

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    extension TEXT NOT NULL,
    daw TEXT NOT NULL,
    cover_path TEXT,
    preview_path TEXT,
    bpm REAL CHECK (bpm IS NULL OR (bpm > 0 AND bpm < 1000)),
    musical_key TEXT,
    genre TEXT,
    status TEXT NOT NULL DEFAULT 'idea' REFERENCES project_statuses(key) ON UPDATE CASCADE,
    rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
    notes TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
    file_size INTEGER NOT NULL DEFAULT 0 CHECK (file_size >= 0),
    file_created_at TEXT,
    file_modified_at TEXT,
    indexed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    is_missing INTEGER NOT NULL DEFAULT 0 CHECK (is_missing IN (0, 1))
);

CREATE TABLE watched_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_path TEXT NOT NULL UNIQUE,
    is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
    last_scanned_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE project_tags (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, tag_id)
);

CREATE TABLE project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    category TEXT NOT NULL CHECK (
        category IN ('stem', 'mix', 'master', 'preview', 'reference', 'artwork', 'midi', 'preset', 'sample', 'other')
    ),
    file_size INTEGER NOT NULL DEFAULT 0 CHECK (file_size >= 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (project_id, file_path)
);

CREATE TABLE scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_path TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    files_scanned INTEGER NOT NULL DEFAULT 0 CHECK (files_scanned >= 0),
    projects_found INTEGER NOT NULL DEFAULT 0 CHECK (projects_found >= 0),
    projects_created INTEGER NOT NULL DEFAULT 0 CHECK (projects_created >= 0),
    projects_updated INTEGER NOT NULL DEFAULT 0 CHECK (projects_updated >= 0),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'cancelled', 'failed')),
    error_message TEXT
);

CREATE TABLE custom_extensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extension TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK (extension GLOB '.*'),
    daw_name TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_projects_display_name ON projects(display_name COLLATE NOCASE);
CREATE INDEX idx_projects_original_name ON projects(original_name COLLATE NOCASE);
CREATE INDEX idx_projects_daw ON projects(daw);
CREATE INDEX idx_projects_extension ON projects(extension);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_genre ON projects(genre);
CREATE INDEX idx_projects_favorite ON projects(is_favorite) WHERE is_favorite = 1;
CREATE INDEX idx_projects_modified ON projects(file_modified_at DESC);
CREATE INDEX idx_projects_indexed ON projects(indexed_at DESC);
CREATE INDEX idx_projects_missing ON projects(is_missing) WHERE is_missing = 1;
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_category ON project_files(category);
CREATE INDEX idx_scan_history_started ON scan_history(started_at DESC);
CREATE INDEX idx_watched_folders_enabled ON watched_folders(is_enabled) WHERE is_enabled = 1;
