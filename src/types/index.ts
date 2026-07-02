export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ProjectStatus = {
  PLANNING: 'planning',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  PAUSED: 'paused',
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
