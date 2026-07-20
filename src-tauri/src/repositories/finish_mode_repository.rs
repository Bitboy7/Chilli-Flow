use rusqlite::{params, Connection, OptionalExtension};

use crate::{
    errors::{AppError, AppResult},
    models::{
        FinishDashboard, FinishProjectItem, FinishProjectPlan, FinishSummary, FinishTask,
        UpdateFinishPlanInput,
    },
};

const DEFAULT_TASKS: &[&str] = &[
    "Estructura", "Grabación", "Edición", "Mezcla", "Master", "Artwork", "Distribución",
];

pub struct FinishModeRepository;

impl FinishModeRepository {
    pub fn dashboard(connection: &Connection) -> AppResult<FinishDashboard> {
        let mut statement = connection.prepare(
            "SELECT p.id, p.display_name, p.daw, p.cover_path, p.status, ps.label, ps.color,
                    p.file_modified_at, p.preview_path IS NOT NULL,
                    fp.next_action, fp.target_date, COALESCE(fp.priority, 'medium'),
                    fp.blocker, COALESCE(fp.is_focus, 0),
                    COALESCE(SUM(CASE WHEN ft.status = 'done' THEN 1 ELSE 0 END), 0),
                    COALESCE(SUM(CASE WHEN ft.status <> 'skipped' THEN 1 ELSE 0 END), 0),
                    CASE WHEN COALESCE(p.file_modified_at, p.indexed_at) <
                         strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-90 days') THEN 1 ELSE 0 END
             FROM projects p
             JOIN project_statuses ps ON ps.key = p.status
             LEFT JOIN project_finish_plans fp ON fp.project_id = p.id
             LEFT JOIN project_finish_tasks ft ON ft.project_id = p.id
             WHERE p.status NOT IN ('finished', 'archived') AND p.is_missing = 0
             GROUP BY p.id
             ORDER BY COALESCE(fp.is_focus, 0) DESC,
                      CASE COALESCE(fp.priority, 'medium') WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                      fp.target_date IS NULL, fp.target_date,
                      p.file_modified_at DESC, p.id DESC"
        )?;
        let projects = statement.query_map([], |row| {
            let completed_tasks: i64 = row.get(14)?;
            let total_tasks: i64 = row.get(15)?;
            let status: String = row.get(4)?;
            Ok(FinishProjectItem {
                project_id: row.get(0)?,
                display_name: row.get(1)?,
                daw: row.get(2)?,
                cover_path: row.get(3)?,
                status: status.clone(),
                status_label: row.get(5)?,
                status_color: row.get(6)?,
                file_modified_at: row.get(7)?,
                has_preview: row.get::<_, i64>(8)? != 0,
                next_action: row.get(9)?,
                target_date: row.get(10)?,
                priority: row.get(11)?,
                blocker: row.get(12)?,
                is_focus: row.get::<_, i64>(13)? != 0,
                completed_tasks,
                total_tasks,
                is_dormant: row.get::<_, i64>(16)? != 0,
                is_almost_finished: status == "mastering"
                    || (total_tasks > 0 && completed_tasks * 100 / total_tasks >= 70),
            })
        })?.collect::<Result<Vec<_>, _>>()?;
        let summary = FinishSummary {
            in_progress: projects.len() as i64,
            dormant: projects.iter().filter(|project| project.is_dormant).count() as i64,
            without_preview: projects.iter().filter(|project| !project.has_preview).count() as i64,
            mixing: projects.iter().filter(|project| project.status == "mixing").count() as i64,
            almost_finished: projects.iter().filter(|project| project.is_almost_finished).count() as i64,
            focus: projects.iter().filter(|project| project.is_focus).count() as i64,
        };
        Ok(FinishDashboard { summary, projects })
    }

    pub fn get(connection: &mut Connection, project_id: i64) -> AppResult<FinishProjectPlan> {
        Self::ensure(connection, project_id)?;
        Self::read(connection, project_id)
    }

    pub fn update(
        connection: &mut Connection,
        project_id: i64,
        input: &UpdateFinishPlanInput,
    ) -> AppResult<FinishProjectPlan> {
        let transaction = connection.transaction()?;
        let exists: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
        )?;
        if !exists { return Err(AppError::ProjectNotFound); }
        transaction.execute(
            "INSERT INTO project_finish_plans
             (project_id, next_action, target_date, priority, blocker, is_focus)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(project_id) DO UPDATE SET
               next_action = excluded.next_action,
               target_date = excluded.target_date,
               priority = excluded.priority,
               blocker = excluded.blocker,
               is_focus = excluded.is_focus,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
            params![
                project_id, input.next_action, input.target_date, input.priority.as_str(),
                input.blocker, input.is_focus,
            ],
        )?;
        transaction.execute("DELETE FROM project_finish_tasks WHERE project_id = ?1", [project_id])?;
        {
            let mut insert = transaction.prepare(
                "INSERT INTO project_finish_tasks (project_id, label, status, sort_order)
                 VALUES (?1, ?2, ?3, ?4)"
            )?;
            for (index, task) in input.tasks.iter().enumerate() {
                insert.execute(params![
                    project_id, task.label, task.status.as_str(), index as i64,
                ])?;
            }
        }
        transaction.commit()?;
        Self::read(connection, project_id)
    }

    pub fn focus_count_except(connection: &Connection, project_id: i64) -> AppResult<i64> {
        connection.query_row(
            "SELECT COUNT(*) FROM project_finish_plans WHERE is_focus = 1 AND project_id <> ?1",
            [project_id],
            |row| row.get(0),
        ).map_err(Into::into)
    }

    fn ensure(connection: &mut Connection, project_id: i64) -> AppResult<()> {
        let transaction = connection.transaction()?;
        let exists: bool = transaction.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?1)", [project_id], |row| row.get(0),
        )?;
        if !exists { return Err(AppError::ProjectNotFound); }
        transaction.execute(
            "INSERT INTO project_finish_plans (project_id) VALUES (?1)
             ON CONFLICT(project_id) DO NOTHING",
            [project_id],
        )?;
        let task_count: i64 = transaction.query_row(
            "SELECT COUNT(*) FROM project_finish_tasks WHERE project_id = ?1",
            [project_id],
            |row| row.get(0),
        )?;
        if task_count == 0 {
            let mut insert = transaction.prepare(
                "INSERT INTO project_finish_tasks (project_id, label, sort_order)
                 VALUES (?1, ?2, ?3)"
            )?;
            for (index, label) in DEFAULT_TASKS.iter().enumerate() {
                insert.execute(params![project_id, label, index as i64])?;
            }
        }
        transaction.commit()?;
        Ok(())
    }

    fn read(connection: &Connection, project_id: i64) -> AppResult<FinishProjectPlan> {
        let mut plan = connection.query_row(
            "SELECT project_id, next_action, target_date, priority, blocker, is_focus, updated_at
             FROM project_finish_plans WHERE project_id = ?1",
            [project_id],
            |row| Ok(FinishProjectPlan {
                project_id: row.get(0)?,
                next_action: row.get(1)?,
                target_date: row.get(2)?,
                priority: row.get(3)?,
                blocker: row.get(4)?,
                is_focus: row.get::<_, i64>(5)? != 0,
                tasks: Vec::new(),
                updated_at: row.get(6)?,
            }),
        ).optional()?.ok_or(AppError::ProjectNotFound)?;
        let mut statement = connection.prepare(
            "SELECT id, label, status, sort_order FROM project_finish_tasks
             WHERE project_id = ?1 ORDER BY sort_order, id"
        )?;
        plan.tasks = statement.query_map([project_id], |row| Ok(FinishTask {
            id: row.get(0)?, label: row.get(1)?, status: row.get(2)?, sort_order: row.get(3)?,
        }))?.collect::<Result<Vec<_>, _>>()?;
        Ok(plan)
    }
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;
    use crate::{
        database::{configure_connection, migrations},
        models::{FinishPriority, FinishTaskInput, FinishTaskStatus},
    };
    use super::*;

    fn database() -> Connection {
        let mut connection = Connection::open_in_memory().expect("database");
        configure_connection(&connection).expect("configure");
        migrations::run(&mut connection).expect("migrations");
        for index in 1..=4 {
            connection.execute(
                "INSERT INTO projects (display_name, original_name, file_path, extension, daw)
                 VALUES (?1, ?2, ?3, '.flp', 'FL Studio')",
                params![format!("Demo {index}"), format!("demo{index}.flp"), format!("C:/demo{index}.flp")],
            ).expect("project");
        }
        connection
    }

    fn input(focus: bool) -> UpdateFinishPlanInput {
        UpdateFinishPlanInput {
            next_action: Some("Terminar mezcla".into()), target_date: None,
            priority: FinishPriority::High, blocker: None, is_focus: focus,
            tasks: vec![FinishTaskInput { label: "Mezcla".into(), status: FinishTaskStatus::Pending }],
        }
    }

    #[test]
    fn creates_the_default_completion_template() {
        let mut connection = database();
        let plan = FinishModeRepository::get(&mut connection, 1).expect("plan");
        assert_eq!(plan.tasks.len(), 7);
        assert_eq!(plan.tasks[0].label, "Estructura");
    }

    #[test]
    fn database_rejects_more_than_three_focus_projects() {
        let mut connection = database();
        for project_id in 1..=3 {
            FinishModeRepository::update(&mut connection, project_id, &input(true)).expect("focus");
        }
        assert!(FinishModeRepository::update(&mut connection, 4, &input(true)).is_err());
    }
}
