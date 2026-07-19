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
}
