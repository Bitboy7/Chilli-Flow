use crate::{
    errors::{AppError, AppResult},
    models::{FinishDashboard, FinishProjectPlan, UpdateFinishPlanInput},
    repositories::FinishModeRepository,
    state::AppState,
};

pub struct FinishModeService;

impl FinishModeService {
    pub fn dashboard(state: &AppState) -> AppResult<FinishDashboard> {
        let connection = state.database().connection()?;
        FinishModeRepository::dashboard(&connection)
    }

    pub fn get(state: &AppState, project_id: i64) -> AppResult<FinishProjectPlan> {
        let mut connection = state.database().connection()?;
        FinishModeRepository::get(&mut connection, project_id)
    }

    pub fn update(
        state: &AppState,
        project_id: i64,
        mut input: UpdateFinishPlanInput,
    ) -> AppResult<FinishProjectPlan> {
        input.next_action = normalize_optional(input.next_action, 240, "próxima acción")?;
        input.blocker = normalize_optional(input.blocker, 500, "bloqueo")?;
        input.target_date = validate_date(input.target_date)?;
        if input.tasks.is_empty() || input.tasks.len() > 20 {
            return Err(AppError::InvalidFinishPlan("se requieren entre 1 y 20 etapas".into()));
        }
        let mut labels = Vec::new();
        for task in &mut input.tasks {
            task.label = task.label.trim().to_owned();
            if task.label.is_empty() || task.label.chars().count() > 80 {
                return Err(AppError::InvalidFinishPlan(
                    "cada etapa debe tener entre 1 y 80 caracteres".into(),
                ));
            }
            if labels.iter().any(|label: &String| label.eq_ignore_ascii_case(&task.label)) {
                return Err(AppError::InvalidFinishPlan("las etapas no pueden repetirse".into()));
            }
            labels.push(task.label.clone());
        }
        let mut connection = state.database().connection()?;
        if input.is_focus && FinishModeRepository::focus_count_except(&connection, project_id)? >= 3 {
            return Err(AppError::InvalidFinishPlan(
                "solo puedes mantener tres proyectos en foco".into(),
            ));
        }
        FinishModeRepository::update(&mut connection, project_id, &input)
    }
}

fn normalize_optional(value: Option<String>, maximum: usize, field: &str) -> AppResult<Option<String>> {
    let Some(value) = value else { return Ok(None); };
    let value = value.trim();
    if value.is_empty() { return Ok(None); }
    if value.chars().count() > maximum {
        return Err(AppError::InvalidFinishPlan(format!("{field} supera {maximum} caracteres")));
    }
    Ok(Some(value.to_owned()))
}

fn validate_date(value: Option<String>) -> AppResult<Option<String>> {
    let Some(value) = normalize_optional(value, 10, "fecha objetivo")? else { return Ok(None); };
    let parts = value.split('-').map(str::parse::<u32>).collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::InvalidFinishPlan("fecha objetivo no válida".into()))?;
    if parts.len() != 3 || parts[0] < 2000 || parts[1] == 0 || parts[1] > 12
        || parts[2] == 0 || parts[2] > 31
    {
        return Err(AppError::InvalidFinishPlan("fecha objetivo no válida".into()));
    }
    Ok(Some(value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_dates_and_optional_copy() {
        assert_eq!(validate_date(Some("2026-08-20".into())).unwrap().as_deref(), Some("2026-08-20"));
        assert!(validate_date(Some("20/08/2026".into())).is_err());
        assert_eq!(normalize_optional(Some("  ".into()), 20, "campo").unwrap(), None);
    }
}
