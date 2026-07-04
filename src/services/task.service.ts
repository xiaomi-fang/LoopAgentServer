import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import { validateTransition } from '../state-machine';
import { TaskStatus, TaskStatusType } from '../types';
import * as llmService from '../services/llm.service';

export async function createTask(data: {
  projectId: string;
  parentTaskId?: string;
  title: string;
  objective: string;
  acceptanceCriteria: string;
  creatorAgentId: string;
  reviewerAgentId?: string;
}) {
  return prisma.task.create({
    data: {
      projectId: data.projectId,
      parentTaskId: data.parentTaskId ?? null,
      title: data.title,
      objective: data.objective,
      acceptanceCriteria: data.acceptanceCriteria,
      status: TaskStatus.PENDING,
      creatorAgentId: data.creatorAgentId,
      reviewerAgentId: data.reviewerAgentId ?? null,
    },
  });
}

export async function getAllTasks() {
  return prisma.task.findMany({
    include: {
      products: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTaskById(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { products: true },
  });
}

export async function claimTask(taskId: string, agentId: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');
    if (task.status !== TaskStatus.PENDING) {
      throw new Error(`Task cannot be claimed: current status is "${task.status}"`);
    }

    // 1. Update status to IN_PROGRESS
    const updated = await tx.task.update({
      where: { id: taskId, status: TaskStatus.PENDING },
      data: {
        status: TaskStatus.IN_PROGRESS,
        assigneeAgentId: agentId,
      },
    });

    // 2. Update agent status
    await tx.agent.update({
      where: { id: agentId },
      data: { status: 'busy' },
    });

    // 3. Generate plan and update task
    // We need to fetch the project context for the plan
    const project = await tx.project.findUnique({
      where: { id: task.projectId },
      include: { tasks: { include: { products: true, subTasks: true } } }
    });

    const plan = await llmService.generatePlan(
      task.objective,
      task.acceptanceCriteria,
      project ? JSON.stringify(project) : {}
    );

    await tx.task.update({
      where: { id: taskId },
      data: {
        submitNote: JSON.stringify(plan),
      },
    });

    return updated;
  });
}

export async function getNextTask(agentId: string, projectId?: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error('Agent not found');

  const capabilities: string[] = JSON.parse(agent.capabilities);

  const where: any = {
    status: TaskStatus.PENDING,
    assigneeAgentId: null,
  };

  if (projectId) {
    where.projectId = projectId;
  }

  const candidates = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  if (candidates.length === 0) return null;

  if (capabilities.length === 0) return candidates[0];

  const scored = candidates.map((task: any) => {
    const textToMatch = `${task.title} ${task.objective}`.toLowerCase();
    const score = capabilities.reduce((sum: number, cap: string) => {
      return sum + (textToMatch.includes(cap.toLowerCase()) ? 1 : 0);
    }, 0);
    return { task, score };
  });

  scored.sort((a: any, b: any) => b.score - a.score);
  return scored[0].task;
}

export async function updateTaskStatus(taskId: string, newStatus: TaskStatusType, payload?: any): Promise<any> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { products: true },
    });

    if (!task) throw new Error('Task not found');

    validateTransition(task.status as TaskStatusType, newStatus);

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        submitNote: payload?.submitNote ?? null,
        comment: payload?.comment ?? null,
      } as any,
    });

    return updated;
  });
}

export async function reviewTask(taskId: string, reviewerId: string, result: 'pass' | 'fail', comment: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { products: true },
    });

    if (!task) throw new Error('Task not found');

    if (task.status !== TaskStatus.PENDING_REVIEW) {
      throw new Error(`Task cannot be reviewed: current status is "${task.status}"`);
    }

    if (task.reviewerAgentId && task.reviewerAgentId !== reviewerId) {
      throw new Error(`Reviewer ID ${reviewerId} does not match assigned reviewer ${task.reviewerAgentId}`);
    }

    // Update data with status change, comment, and optional reviewer assignment
    const updateData: any = {
      status: result === 'pass' ? TaskStatus.COMPLETED : TaskStatus.FAILED,
      comment: comment,
    };
    if (!task.reviewerAgentId) {
      updateData.reviewerAgentId = reviewerId;
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return updated;
  });
}

export async function publishProduct(taskId: string, data: {
  productType: string;
  url: string;
  description?: string;
}) {
  return prisma.product.create({
    data: {
      taskId,
      productType: data.productType,
      url: data.url,
      description: data.description,
    },
  });
}

export async function decompose(data: {
  parentTaskId: string;
  subTasks: { title: string; objective: string }[];
  creatorAgentId: string;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const parentTask = await tx.task.findUnique({
      where: { id: data.parentTaskId },
    });

    if (!parentTask) throw new Error('Parent task not found');
    if (parentTask.status !== TaskStatus.IN_PROGRESS) {
      throw new Error(`Task must be in progress to decompose: current status is "${parentTask.status}"`);
    }

    const createdTasks = await Promise.all(
      data.subTasks.map((st) =>
        tx.task.create({
          data: {
            projectId: parentTask.projectId,
            parentTaskId: data.parentTaskId,
            title: st.title,
            objective: st.objective,
            acceptanceCriteria: 'Generated from parent',
            creatorAgentId: data.creatorAgentId,
            status: TaskStatus.PENDING,
          },
        })
      )
    );

    await tx.task.update({
      where: { id: data.parentTaskId },
      data: { status: TaskStatus.COMPLETED },
    });

    return createdTasks;
  });
}
