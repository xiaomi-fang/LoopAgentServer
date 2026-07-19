import { TaskStatus, TaskStatusType, ProjectStatus, ProjectStatusType } from './types';

type TransitionMap = Partial<Record<TaskStatusType, TaskStatusType[]>>;

// ── 任务状态机（含 blocked） ──
const TASK_ALLOWED_TRANSITIONS: TransitionMap = {
  [TaskStatus.BLOCKED]: [TaskStatus.PENDING],
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.PENDING_REVIEW, TaskStatus.FAILED],
  [TaskStatus.PENDING_REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.FAILED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.FAILED]: [TaskStatus.PENDING],
};

// ── 项目状态机 ──
const PROJECT_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [ProjectStatus.PENDING_ACTIVATION]: [ProjectStatus.PLANNING],
  [ProjectStatus.PLANNING]: [ProjectStatus.PLANNED],
  [ProjectStatus.PLANNED]: [ProjectStatus.REVIEW_PASSED, ProjectStatus.REVIEW_FAILED],
  [ProjectStatus.REVIEW_FAILED]: [ProjectStatus.PLANNING],
  [ProjectStatus.REVIEW_PASSED]: [ProjectStatus.IN_DEVELOPMENT],
  [ProjectStatus.IN_DEVELOPMENT]: [ProjectStatus.DEVELOPMENT_PAUSED, ProjectStatus.COMPLETED],
  [ProjectStatus.DEVELOPMENT_PAUSED]: [ProjectStatus.IN_DEVELOPMENT],
  [ProjectStatus.COMPLETED]: [],
};

export function validateTransition(current: TaskStatusType, target: TaskStatusType): void {
  if (current === target) {
    throw new Error(`Task is already in status "${current}"`);
  }

  const allowed = TASK_ALLOWED_TRANSITIONS[current];
  if (!allowed) {
    throw new Error(`Invalid current status: "${current}"`);
  }

  if (!allowed.includes(target)) {
    throw new Error(
      `Invalid status transition: "${current}" → "${target}". Allowed: [${allowed.join(', ') || 'none'}]`
    );
  }
}

export function isTerminalStatus(status: TaskStatusType): boolean {
  return status === TaskStatus.COMPLETED || status === TaskStatus.FAILED;
}

export function validateProjectTransition(current: string, target: string): void {
  if (current === target) {
    throw new Error(`Project is already "${current}"`);
  }

  const allowed = PROJECT_ALLOWED_TRANSITIONS[current];
  if (!allowed || !allowed.includes(target)) {
    throw new Error(
      `Invalid project transition: "${current}" → "${target}". Allowed: [${allowed?.join(', ') || 'none'}]`
    );
  }
}
