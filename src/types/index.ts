export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ProjectStatus = {
  // 原有状态（兼容）
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  PAUSED: 'paused',
  // 新审核流程状态
  UNDER_REVIEW: 'under_review',
  REVIEW_FAILED: 'review_failed',
  REVIEW_PASSED: 'review_passed',
  IN_DEVELOPMENT: 'in_development',
  DEVELOPMENT_PAUSED: 'development_paused',
} as const;

export type ProjectStatusType = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const AgentStatus = {
  IDLE: 'idle',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export type AgentStatusType = (typeof AgentStatus)[keyof typeof AgentStatus];

export const ProductType = {
  CODE_REPO: 'code_repo',
  DOCUMENT: 'document',
  API_DEFINITION: 'api_definition',
  IMAGE: 'image',
  DATA_FILE: 'data_file',
} as const;

export type ProductTypeType = (typeof ProductType)[keyof typeof ProductType];
