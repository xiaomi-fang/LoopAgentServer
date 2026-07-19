// src/services/workflow-engine.service.ts
import prisma from '../prisma';
import { TaskStatus } from '../types';

interface TaskNode {
  id: string;
  title: string;
  objective: string;
  acceptanceCriteria: string;
  status: string;
  type: 'serial' | 'parallel';
  dependsOn: string[];
  wfOrder: number | null;
}

interface DAGLayer {
  nodes: TaskNode[];
}

export class WorkflowEngine {
  /**
   * 构建项目的 DAG 结构（给前端展示用）
   */
  async buildDAG(projectId: string): Promise<{ nodes: TaskNode[]; edges: { from: string; to: string }[] }> {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { wfOrder: 'asc' },
    });

    const nodes: TaskNode[] = tasks.map(t => ({
      id: t.id,
      title: t.title,
      objective: t.objective,
      acceptanceCriteria: t.acceptanceCriteria,
      status: t.status,
      type: (t.type as 'serial' | 'parallel') || 'serial',
      dependsOn: JSON.parse(t.dependsOn || '[]'),
      wfOrder: t.wfOrder,
    }));

    const edges: { from: string; to: string }[] = [];
    for (const node of nodes) {
      for (const depId of node.dependsOn) {
        if (nodes.find(n => n.id === depId)) {
          edges.push({ from: depId, to: node.id });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * 拓扑排序 → 分层。检测环路。
   */
  topologicalSort(nodes: TaskNode[]): DAGLayer[] {
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, TaskNode>();

    for (const n of nodes) {
      adj.set(n.id, []);
      inDegree.set(n.id, 0);
      nodeMap.set(n.id, n);
    }

    for (const n of nodes) {
      for (const depId of n.dependsOn) {
        if (adj.has(depId)) {
          adj.get(depId)!.push(n.id);
          inDegree.set(n.id, (inDegree.get(n.id) || 0) + 1);
        }
      }
    }

    // Kahn 算法
    const layers: DAGLayer[] = [];
    let queue: string[] = [];

    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    let visited = 0;
    while (queue.length > 0) {
      const layerNodes = queue.map(id => nodeMap.get(id)!);
      layers.push({ nodes: layerNodes });

      const nextQueue: string[] = [];
      for (const id of queue) {
        visited++;
        for (const neighbor of adj.get(id) || []) {
          const newDeg = (inDegree.get(neighbor) || 1) - 1;
          inDegree.set(neighbor, newDeg);
          if (newDeg === 0) nextQueue.push(neighbor);
        }
      }
      queue = nextQueue;
    }

    if (visited !== nodes.length) {
      throw new Error('工作流中存在环路，请检查任务依赖关系');
    }

    return layers;
  }

  /**
   * 执行项目的工作流
   */
  async run(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('项目不存在');
    if (project.status !== 'in_development') {
      throw new Error('只有研发中的项目才能启动工作流');
    }

    const { nodes } = await this.buildDAG(projectId);
    const layers = this.topologicalSort(nodes);

    // 获取平台实例
    const platform = this.getPlatform();

    for (const layer of layers) {
      // serial 节点按序执行
      for (const node of layer.nodes) {
        if (node.status === 'completed') continue;
        if (node.status === 'blocked') continue;

        if (node.type === 'serial') {
          await this.executeNode(platform, projectId, node);
        }
      }

      // parallel 节点并发执行
      const parallelNodes = layer.nodes.filter(
        n => n.type === 'parallel' && n.status !== 'completed'
      );
      if (parallelNodes.length > 0) {
        await Promise.all(
          parallelNodes.map(node => this.executeNode(platform, projectId, node))
        );
      }

      // 每层执行完后，解锁下一层的 blocked 任务
      await this.unblockDownstream(projectId, layer.nodes.map(n => n.id));
    }
  }

  private getPlatform() {
    const { AgentPlatformFactory } = require('../platforms/platform-factory');
    const { QwenPawConfig } = require('../platforms/qwenpaw/qwenpaw-platform.config');
    return AgentPlatformFactory.create(
      process.env.AGENT_PLATFORM_TYPE || 'qwenpaw',
      QwenPawConfig.fromEnv(),
    );
  }

  private async executeNode(platform: any, projectId: string, node: TaskNode): Promise<void> {
    // 1. 发现空闲 Agent
    const agents = await platform.discoverAgents([]);
    if (agents.length === 0) {
      console.warn(`[WORKFLOW] 无可用 Agent，任务 ${node.id} 等待中`);
      await this.waitForAgent(platform, node);
    }

    const agent = agents[0];

    // 2. 标记任务为 in_progress
    await prisma.task.update({
      where: { id: node.id },
      data: { status: 'in_progress', assigneeAgentId: agent.agentId },
    });

    // 3. 提交任务
    const { externalRef } = await platform.submitTask(agent.agentId, {
      taskId: node.id,
      projectId,
      objective: node.objective,
      acceptanceCriteria: node.acceptanceCriteria,
    });

    // 4. 轮询结果
    const config = this.getConfig();
    const deadline = Date.now() + config.pollTimeoutMs;

    while (Date.now() < deadline) {
      await this.sleep(config.pollIntervalMs);
      const result = await platform.pollTaskResult(externalRef);

      if (result !== null) {
        if (result.status === 'completed') {
          await prisma.task.update({
            where: { id: node.id },
            data: { status: 'completed', submitNote: result.output },
          });
        } else {
          await prisma.task.update({
            where: { id: node.id },
            data: { status: 'failed', comment: result.error },
          });
        }
        return;
      }
    }

    // 超时
    await prisma.task.update({
      where: { id: node.id },
      data: { status: 'failed', comment: 'Agent 执行超时' },
    });
  }

  private getConfig() {
    const { QwenPawConfig } = require('../platforms/qwenpaw/qwenpaw-platform.config');
    return QwenPawConfig.fromEnv();
  }

  private async waitForAgent(platform: any, node: TaskNode): Promise<void> {
    for (let i = 0; i < 30; i++) {  // 最多等 5 分钟
      await this.sleep(10000);
      const agents = await platform.discoverAgents([]);
      if (agents.length > 0) return;
    }
    throw new Error(`任务 ${node.id} 等待 Agent 超时`);
  }

  private async unblockDownstream(projectId: string, completedIds: string[]): Promise<void> {
    const blockedTasks = await prisma.task.findMany({
      where: { projectId, status: 'blocked' },
    });

    for (const task of blockedTasks) {
      const dependsOn: string[] = JSON.parse(task.dependsOn || '[]');
      if (dependsOn.length === 0) continue;
      const allCompleted = dependsOn.every(depId => completedIds.includes(depId));
      if (allCompleted) {
        const deps = await prisma.task.findMany({
          where: { id: { in: dependsOn } },
        });
        const allDone = deps.every(d => d.status === 'completed');
        if (allDone) {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: 'pending' },
          });
        }
      }
    }
  }

  /**
   * 获取项目工作流进度统计
   */
  async getProgress(projectId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    blocked: number;
    failed: number;
  }> {
    const tasks = await prisma.task.findMany({ where: { projectId } });
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const workflowEngine = new WorkflowEngine();
