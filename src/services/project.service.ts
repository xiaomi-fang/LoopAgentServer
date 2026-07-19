import { validateProjectTransition } from '../state-machine';
import { ProjectStatus } from '../types';
import prisma from '../prisma';

export async function createProject(data: {
  name: string;
  description?: string;
  goal?: string;
  acceptanceCriteria?: string;
  githubUrl?: string;
  extraInfo?: Record<string, any>;
  creatorAgentId: string;
}) {
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      goal: data.goal ?? null,
      acceptanceCriteria: data.acceptanceCriteria ?? null,
      githubUrl: data.githubUrl ?? null,
      extraInfo: JSON.stringify(data.extraInfo ?? {}),
      status: ProjectStatus.PENDING_ACTIVATION,
      creatorAgentId: data.creatorAgentId,
    },
  });
}

export async function getAllProjects() {
  return prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/** 按创建者 ID 和状态查询项目 */
export async function getProjectsByCreatorAndStatus(creatorAgentId: string, status?: string) {
  const where: any = { creatorAgentId };
  if (status) {
    where.status = status;
  }
  return prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProject(projectId: string) {
  return prisma.project.findUnique({ where: { id: projectId } });
}

export async function getProjectContext(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        include: {
          products: true,
          subTasks: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!project) return null;

  return {
    ...project,
    extraInfo: JSON.parse(project.extraInfo ?? '{}'),
    taskTree: buildTaskTree(project.tasks as any[]),
  };
}

function buildTaskTree(tasks: any[]) {
  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const t of tasks) {
    map.set(t.id, { ...t, children: [] });
  }

  for (const t of tasks) {
    const node = map.get(t.id);
    if (t.parentTaskId && map.has(t.parentTaskId)) {
      map.get(t.parentTaskId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function deleteProject(projectId: string) {
  // 1) 解除任务间的父子关系（自引用外键），避免子任务约束报错
  await prisma.task.updateMany({
    where: { projectId, parentTaskId: { not: null } },
    data: { parentTaskId: null },
  });

  // 2) 按外键依赖顺序删除关联数据
  const tasks = await prisma.task.findMany({ where: { projectId } });
  const taskIds = tasks.map(t => t.id);
  if (taskIds.length > 0) {
    await prisma.product.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.reviewRecord.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.task.deleteMany({ where: { projectId } });
  }

  // 3) 最后删项目本身
  await prisma.project.delete({ where: { id: projectId } });
  return { id: projectId };
}

export async function updateProject(projectId: string, data: {
  name?: string;
  description?: string;
  goal?: string;
  acceptanceCriteria?: string;
  githubUrl?: string;
  status?: string;
}) {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.goal !== undefined) updateData.goal = data.goal;
  if (data.acceptanceCriteria !== undefined) updateData.acceptanceCriteria = data.acceptanceCriteria;
  if (data.githubUrl !== undefined) updateData.githubUrl = data.githubUrl;
  if (data.status !== undefined) updateData.status = data.status;

  return prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });
}

export async function activateProject(projectId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');
    validateProjectTransition(project.status, ProjectStatus.PLANNING);

    return tx.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.PLANNING },
    });
  });
}

export async function markPlanned(projectId: string) {
  return prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.PLANNED },
  });
}

export async function reviewProject(projectId: string, approved: boolean, comment?: string) {
  if (!approved && !comment) {
    throw new Error('审核不通过时必须填写原因');
  }

  return prisma.project.update({
    where: { id: projectId },
    data: {
      status: approved ? ProjectStatus.REVIEW_PASSED : ProjectStatus.REVIEW_FAILED,
      reviewComment: comment ?? null,
    },
  });
}

export async function startDev(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error('Project not found');
  validateProjectTransition(project.status, ProjectStatus.IN_DEVELOPMENT);

  return prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.IN_DEVELOPMENT },
  });
}
