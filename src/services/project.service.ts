import prisma from '../prisma';

export async function createProject(data: {
  name: string;
  description?: string;
  goal?: string;
  acceptanceCriteria?: string;
  extraInfo?: Record<string, any>;
  creatorAgentId: string;
}) {
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      goal: data.goal ?? null,
      acceptanceCriteria: data.acceptanceCriteria ?? null,
      extraInfo: JSON.stringify(data.extraInfo ?? {}),
      status: 'planning',
      creatorAgentId: data.creatorAgentId,
    },
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
