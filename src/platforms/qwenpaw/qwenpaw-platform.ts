// src/platforms/qwenpaw/qwenpaw-platform.ts
import axios from 'axios';
import { AgentPlatform, AgentStatus, TaskSubmission, TaskResult } from '../agent-platform.interface';
import { QwenPawConfig } from './qwenpaw-platform.config';

export class QwenPawPlatform implements AgentPlatform {
  private http;

  constructor(private config: QwenPawConfig) {
    this.http = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
      },
      timeout: 10000,
    });
  }

  async listAllAgents(): Promise<AgentStatus[]> {
    const { data } = await this.http.get('/api/agents');
    return data.map((a: any) => ({
      agentId: a.id,
      name: a.name,
      status: this.normalizeStatus(a.enabled, a.status),
      capabilities: a.capabilities || [],
      lastHeartbeat: a.lastHeartbeat,
    }));
  }

  async checkAgentStatus(agentId: string): Promise<AgentStatus> {
    const agents = await this.listAllAgents();
    return agents.find(a => a.agentId === agentId) || {
      agentId, name: '', status: 'offline', capabilities: [],
    };
  }

  async discoverAgents(capabilities: string[]): Promise<AgentStatus[]> {
    const agents = await this.listAllAgents();
    return agents.filter(a => {
      if (a.status !== 'idle') return false;
      if (capabilities.length === 0) return true;
      return capabilities.some(cap =>
        a.capabilities.some((ac: string) =>
          ac.toLowerCase().includes(cap.toLowerCase())
        )
      );
    });
  }

  async submitTask(agentId: string, task: TaskSubmission): Promise<{ externalRef: string }> {
    const { data } = await this.http.post('/api/console/chat/task', {
      session_id: `loopagent-task-${task.taskId}`,
      input: [{
        role: 'user',
        content: [{ type: 'text', text: this.buildPrompt(task) }],
      }],
      user_id: agentId,
    });
    return { externalRef: data.task_id };
  }

  async pollTaskResult(externalRef: string): Promise<TaskResult | null> {
    try {
      const { data } = await this.http.get(`/api/console/chat/task/${externalRef}`);
      if (data.status !== 'finished') return null;
      return {
        status: data.result?.status === 'completed' ? 'completed' : 'failed',
        output: JSON.stringify(data.result?.output || ''),
        error: data.result?.error?.message,
      };
    } catch {
      return null;
    }
  }

  async sendMessage(agentId: string, message: string): Promise<void> {
    await this.http.post('/api/console/chat/task', {
      session_id: `loopagent-notify-${agentId}-${Date.now()}`,
      input: [{
        role: 'user',
        content: [{ type: 'text', text: message }],
      }],
      user_id: agentId,
    });
  }

  private normalizeStatus(enabled: boolean, rawStatus: string): 'idle' | 'busy' | 'offline' {
    if (!enabled) return 'offline';
    switch (rawStatus) {
      case 'idle': return 'idle';
      case 'running':
      case 'busy': return 'busy';
      default: return 'offline';
    }
  }

  private buildPrompt(task: TaskSubmission): string {
    return `请执行以下任务：

项目ID: ${task.projectId}
任务ID: ${task.taskId}
目标: ${task.objective}
验收标准: ${task.acceptanceCriteria}

${
  task.context
    ? `项目上下文:\n${JSON.stringify(task.context, null, 2)}`
    : ''
}

完成后请返回执行结果。`;
  }
}
