export type FinishPriority = "low" | "medium" | "high";
export type FinishTaskStatus = "pending" | "done" | "skipped";

export interface FinishTask {
  id: number;
  label: string;
  status: FinishTaskStatus;
  sortOrder: number;
}

export interface FinishProjectPlan {
  projectId: number;
  nextAction: string | null;
  targetDate: string | null;
  priority: FinishPriority;
  blocker: string | null;
  isFocus: boolean;
  tasks: FinishTask[];
  updatedAt: string;
}

export interface UpdateFinishPlanInput {
  nextAction: string | null;
  targetDate: string | null;
  priority: FinishPriority;
  blocker: string | null;
  isFocus: boolean;
  tasks: Array<{ label: string; status: FinishTaskStatus }>;
}

export interface FinishProjectItem {
  projectId: number;
  displayName: string;
  daw: string;
  coverPath: string | null;
  status: string;
  statusLabel: string;
  statusColor: string | null;
  fileModifiedAt: string | null;
  hasPreview: boolean;
  nextAction: string | null;
  targetDate: string | null;
  priority: FinishPriority;
  blocker: string | null;
  isFocus: boolean;
  completedTasks: number;
  totalTasks: number;
  isDormant: boolean;
  isAlmostFinished: boolean;
}

export interface FinishDashboard {
  summary: {
    inProgress: number;
    dormant: number;
    withoutPreview: number;
    mixing: number;
    almostFinished: number;
    focus: number;
  };
  projects: FinishProjectItem[];
}
