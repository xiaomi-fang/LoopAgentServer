export const TaskStatus = {
  PENDING: 'pending',
  BLOCKED: 'blocked',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ProjectStatus = {
  PENDING_ACTIVATION: 'pending_activation',
  PLANNING: 'planning',
  PLANNED: 'planned',
  REVIEW_PASSED: 'review_passed',
  REVIEW_FAILED: 'review_failed',
  IN_DEVELOPMENT: 'in_development',
  DEVELOPMENT_PAUSED: 'development_paused',
  COMPLETED: 'completed',
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
