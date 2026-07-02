import { TaskStatus, TaskStatusType } from './types';

type TransitionMap = Partial<Record<TaskStatusType, TaskStatusType[]>>;

const ALLOWED_TRANSITIONS: TransitionMap = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.PENDING_REVIEW, TaskStatus.FAILED],
  [TaskStatus.PENDING_REVIEW]: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS, TaskStatus.FAILED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.FAILED]: [TaskStatus.PENDING],
};

export function validateTransition(current: TaskStatusType, target: TaskStatusType): void {
  if (current === target) {
    throw new Error(`Task is already in status "${current}"`);
  }

  const allowed = ALLOWED_TRANSITIONS[current];
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
