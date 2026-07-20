import { invoke } from "@tauri-apps/api/core";

import type { FinishDashboard, FinishProjectPlan, UpdateFinishPlanInput } from "../types/finish";

export function getFinishDashboard(): Promise<FinishDashboard> {
  return invoke<FinishDashboard>("get_finish_dashboard");
}

export function getProjectFinishPlan(projectId: number): Promise<FinishProjectPlan> {
  return invoke<FinishProjectPlan>("get_project_finish_plan", { projectId });
}

export function updateProjectFinishPlan(
  projectId: number,
  input: UpdateFinishPlanInput,
): Promise<FinishProjectPlan> {
  return invoke<FinishProjectPlan>("update_project_finish_plan", { projectId, input });
}
