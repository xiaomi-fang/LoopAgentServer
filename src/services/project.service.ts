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
      status: 'planning',
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
  // 先删除项目下所有任务的产物
  const tasks = await prisma.task.findMany({ where: { projectId } });
  const taskIds = tasks.map(t => t.id);
  if (taskIds.length > 0) {
    await prisma.product.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.task.deleteMany({ where: { projectId } });
  }
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
