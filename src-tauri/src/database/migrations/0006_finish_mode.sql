CREATE TABLE project_finish_plans (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    next_action TEXT,
    target_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    blocker TEXT,
    is_focus INTEGER NOT NULL DEFAULT 0 CHECK (is_focus IN (0, 1)),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE project_finish_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_finish_tasks_project_order
    ON project_finish_tasks(project_id, sort_order, id);
CREATE INDEX idx_finish_focus
    ON project_finish_plans(is_focus) WHERE is_focus = 1;
CREATE INDEX idx_finish_target
    ON project_finish_plans(target_date) WHERE target_date IS NOT NULL;

CREATE TRIGGER finish_focus_limit_insert
BEFORE INSERT ON project_finish_plans
WHEN NEW.is_focus = 1
 AND (SELECT COUNT(*) FROM project_finish_plans WHERE is_focus = 1) >= 3
BEGIN
    SELECT RAISE(ABORT, 'finish_focus_limit');
END;

CREATE TRIGGER finish_focus_limit_update
BEFORE UPDATE OF is_focus ON project_finish_plans
WHEN NEW.is_focus = 1 AND OLD.is_focus = 0
 AND (SELECT COUNT(*) FROM project_finish_plans WHERE is_focus = 1 AND project_id <> NEW.project_id) >= 3
BEGIN
    SELECT RAISE(ABORT, 'finish_focus_limit');
END;
