ALTER TABLE scan_history ADD COLUMN projects_moved INTEGER NOT NULL DEFAULT 0 CHECK (projects_moved >= 0);
ALTER TABLE scan_history ADD COLUMN projects_marked_missing INTEGER NOT NULL DEFAULT 0 CHECK (projects_marked_missing >= 0);
ALTER TABLE scan_history ADD COLUMN unreadable_entries INTEGER NOT NULL DEFAULT 0 CHECK (unreadable_entries >= 0);

CREATE INDEX idx_scan_history_status_started ON scan_history(status, started_at DESC);
