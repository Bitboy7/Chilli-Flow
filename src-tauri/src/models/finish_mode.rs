use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FinishPriority {
    Low,
    Medium,
    High,
}

impl FinishPriority {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FinishTaskStatus {
    Pending,
    Done,
    Skipped,
}

impl FinishTaskStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Done => "done",
            Self::Skipped => "skipped",
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishTask {
    pub id: i64,
    pub label: String,
    pub status: String,
    pub sort_order: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishTaskInput {
    pub label: String,
    pub status: FinishTaskStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishProjectPlan {
    pub project_id: i64,
    pub next_action: Option<String>,
    pub target_date: Option<String>,
    pub priority: String,
    pub blocker: Option<String>,
    pub is_focus: bool,
    pub tasks: Vec<FinishTask>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateFinishPlanInput {
    pub next_action: Option<String>,
    pub target_date: Option<String>,
    pub priority: FinishPriority,
    pub blocker: Option<String>,
    pub is_focus: bool,
    pub tasks: Vec<FinishTaskInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishProjectItem {
    pub project_id: i64,
    pub display_name: String,
    pub daw: String,
    pub cover_path: Option<String>,
    pub status: String,
    pub status_label: String,
    pub status_color: Option<String>,
    pub file_modified_at: Option<String>,
    pub has_preview: bool,
    pub next_action: Option<String>,
    pub target_date: Option<String>,
    pub priority: String,
    pub blocker: Option<String>,
    pub is_focus: bool,
    pub completed_tasks: i64,
    pub total_tasks: i64,
    pub is_dormant: bool,
    pub is_almost_finished: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishSummary {
    pub in_progress: i64,
    pub dormant: i64,
    pub without_preview: i64,
    pub mixing: i64,
    pub almost_finished: i64,
    pub focus: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FinishDashboard {
    pub summary: FinishSummary,
    pub projects: Vec<FinishProjectItem>,
}
