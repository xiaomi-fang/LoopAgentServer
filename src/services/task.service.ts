import prisma from '../prisma';
import { validateTransition, isTerminalStatus } from '../state-machine';
import { TaskStatus, TaskStatusType } from '../types';

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

export async function claimTask(taskId: string, agentId: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');
    if (task.status !== TaskStatus.PENDING) {
      throw new Error(`Task cannot be claimed: current status is "${task.status}"`);
    }

    const updated = await tx.task.update({
      where: { id: taskId, status: TaskStatus.PENDING },
      data: {
        status: TaskStatus.IN_PROGRESS,
        assigneeAgentId: agentId,
      },
    });

    await tx.agent.update({
      where: { id: agentId },
      data: { status: 'busy' },
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

  const scored = candidates.map((task) => {
    const textToMatch = `${task.title} ${task.objective}`.toLowerCase();
    const score = capabilities.reduce((sum, cap) => {
      return sum + (textToMatch.includes(cap.toLowerCase()) ? 1 : 0);
    }, 0);
    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].task;
}

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatusType,
  payload?: { submitNote?: string; comment?: string }
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { products: true },
    });

    if (!task) throw new Error('Task not found');

    validateTransition(task.status as TaskStatusType, newStatus);

    if (newStatus === TaskStatus.PENDING_REVIEW) {
      if (!payload?.submitNote) {
        throw new Error('Submit note is required when submitting for review');
      }
      if (task.products.length === 0) {
        throw new Error('Must publish at least one product before submitting for review');
      }
      if (!task.reviewerAgentId) {
        throw new Error('Task has no reviewer assigned');
      }
    }

    if (newStatus === TaskStatus.FAILED) {
      await tx.agent.update({
        where: { id: task.assigneeAgentId! },
        data: { status: 'idle' },
      });
    }

    const data: any = { status: newStatus };
    if (isTerminalStatus(newStatus)) {
      data.reviewedAt = new Date();
      if (task.assigneeAgentId) {
        await tx.agent.update({
          where: { id: task.assigneeAgentId },
          data: { status: 'idle' },
        });
      }
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data,
    });

    if (newStatus === TaskStatus.PENDING_REVIEW && task.reviewerAgentId) {
      const hasReviewTasks = await tx.task.count({
        where: {
          reviewerAgentId: task.reviewerAgentId,
          status: TaskStatus.PENDING_REVIEW,
        },
      });
      console.log(
        `[INFO] Agent ${task.reviewerAgentId} has ${hasReviewTasks} tasks pending review`
      );
    }

    return updated;
  });
}

export async function reviewTask(
  taskId: string,
  reviewerId: string,
  result: 'pass' | 'fail',
  comment?: string
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });

    if (!task) throw new Error('Task not found');
    if (task.status !== TaskStatus.PENDING_REVIEW) {
      throw new Error(`Task is not pending review, current status: "${task.status}"`);
    }
    if (task.reviewerAgentId !== reviewerId) {
      throw new Error('You are not the assigned reviewer for this task');
    }
    if (task.assigneeAgentId === reviewerId) {
      throw new Error('Reviewer cannot be the same as the assignee');
    }

    const newStatus = result === 'pass' ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS;

    const data: any = {
      status: newStatus,
      reviewedAt: new Date(),
    };

    const updated = await tx.task.update({
      where: { id: taskId },
      data,
    });

    if (task.assigneeAgentId) {
      await tx.agent.update({
        where: { id: task.assigneeAgentId },
        data: { status: result === 'pass' ? 'idle' : 'busy' },
      });
    }

    return { task: updated, result, comment };
  });
}

export async function decomposeTask(
  parentTaskId: string,
  subTasks: { title: string; objective: string; acceptanceCriteria: string }[],
  creatorAgentId: string
) {
  return prisma.$transaction(async (tx) => {
    const parent = await tx.task.findUnique({ where: { id: parentTaskId } });
    if (!parent) throw new Error('Parent task not found');

    const created = await Promise.all(
      subTasks.map((st) =>
        tx.task.create({
          data: {
            projectId: parent.projectId,
            parentTaskId,
            title: st.title,
            objective: st.objective,
            acceptanceCriteria: st.acceptanceCriteria,
            status: TaskStatus.PENDING,
            creatorAgentId,
          },
        })
      )
    );

    return created;
  });
}
