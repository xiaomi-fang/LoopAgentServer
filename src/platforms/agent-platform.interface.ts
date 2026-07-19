/** Agent 运行状态（平台归一化后的通用格式） */
export interface AgentStatus {
  agentId: string;
  name: string;
  /** idle = 可分配任务 | busy = 正在执行 | offline = 不可用（禁用/断连） */
  status: 'idle' | 'busy' | 'offline';
  capabilities: string[];
  lastHeartbeat?: string;
}

/** 提交给 Agent 执行的任务 */
export interface TaskSubmission {
  taskId: string;
  projectId: string;
  objective: string;
  acceptanceCriteria: string;
  context?: Record<string, any>;
}

/** 任务执行结果 */
export interface TaskResult {
  status: 'completed' | 'failed';
  output?: string;
  error?: string;
}

/** Agent 平台接口 */
export interface AgentPlatform {
  /** 获取平台上所有 Agent 状态 */
  listAllAgents(): Promise<AgentStatus[]>;

  /** 检查指定 Agent 是否空闲 */
  checkAgentStatus(agentId: string): Promise<AgentStatus>;

  /** 按能力发现空闲 Agent */
  discoverAgents(capabilities: string[]): Promise<AgentStatus[]>;

  /** 向指定 Agent 提交后台任务，返回外部 taskRef */
  submitTask(agentId: string, task: TaskSubmission): Promise<{ externalRef: string }>;

  /** 轮询已提交任务的结果。返回 null 表示任务仍在执行中 */
  pollTaskResult(externalRef: string): Promise<TaskResult | null>;

  /** 发送消息给指定 Agent（如审核不通过原因） */
  sendMessage(agentId: string, message: string): Promise<void>;
}
