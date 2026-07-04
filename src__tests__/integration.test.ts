import request from 'supertest';
import { app } from '../index';
import prisma from '../prisma';

// 测试前准备：清理数据库并插入种子数据
async function seedDatabase() {
  console.log('[SEED] Cleaning database...');
  await prisma.product.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.agent.deleteMany();

  // 创建测试智能体
  const agent1 = await prisma.agent.create({
    data: {
      name: 'Coder',
      role: 'developer',
      capabilities: JSON.stringify(['coding']),
      status: 'idle',
      endpoint: 'http://localhost:4000/coder',
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      name: 'QA',
      role: 'reviewer',
      capabilities: JSON.stringify(['quality-assurance']),
      status: 'idle',
      endpoint: 'http://localhost:4000/qa',
    },
  });

  // 创建测试项目
  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      description: 'A test project for API testing',
      goal: 'Implement user authentication',
      acceptanceCriteria: JSON.stringify(['User can login', 'Password validation']),
      creatorAgentId: agent1.id,
    },
  });

  return { agent1, agent2, project };
}

// ============ 健康检查端点 ============
describe('Health Check', () => {
  it('GET /health - Should return ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

// ============ 智能体管理端点 ============
describe('Agents Management', () => {
  let agent1, agent2, project;

  beforeAll(async () => {
    const seeded = await seedDatabase();
    ({ agent1, agent2, project } = seeded);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /agents/register', () => {
    it('Should register a new agent with required fields', async () => {
      const res = await request(app)
        .post('/agents/register')
        .send({ name: 'New Agent', role: 'tester', capabilities: '[]' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New Agent');
    });

    it('Should reject registration without name', async () => {
      const res = await request(app)
        .post('/agents/register')
        .send({ role: 'tester' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /agents/heartbeat', () => {
    it('Should update agent heartbeat status', async () => {
      const res = await request(app)
        .post('/agents/heartbeat')
        .send({ agent_id: agent1.id });

      expect(res.status).toBe(200);
    });

    it('Should reject heartbeat without agent_id', async () => {
      const res = await request(app)
        .post('/agents/heartbeat')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /agents/discover', () => {
    it('Should discover all agents', async () => {
      const res = await request(app).get('/agents/discover');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Should filter agents by capability', async () => {
      const res = await request(app)
        .get('/agents/discover?capability=coding');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ============ 项目管理端点 ============
describe('Projects Management', () => {
  let project;

  beforeAll(async () => {
    const seeded = await seedDatabase();
    ({ project } = seeded);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /projects', () => {
    it('Should create a new project', async () => {
      const res = await request(app)
        .post('/projects')
        .send({ name: 'New Project', creator_agent_id: agent1.id });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('Should reject project without name', async () => {
      const res = await request(app)
        .post('/projects')
        .send({ creator_agent_id: agent1.id });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /projects/:id/context', () => {
    it('Should return project context for existing project', async () => {
      const res = await request(app)
        .get(`/projects/${project.id}/context`);

      expect(res.status).toBe(200);
    });

    it('Should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/projects/nonexistent-id/context');

      expect(res.status).toBe(404);
    });
  });
});

// ============ 任务管理端点 ============
describe('Tasks Management', () => {
  let agent1, agent2, project;

  beforeAll(async () => {
    const seeded = await seedDatabase();
    ({ agent1, agent2 } = seeded);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /tasks', () => {
    it('Should create a new task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Test Task',
          objective: 'Implement feature X',
          acceptance_criteria: 'Feature works correctly',
          creator_agent_id: agent1.id,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
    });

    it('Should reject task without required fields', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /tasks/claim', () => {
    it('Should claim a task for an agent', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Claimable Task',
          objective: 'Test claim functionality',
          acceptance_criteria: 'Task is claimed',
          creator_agent_id: agent1.id,
        });

      const taskId = createRes.body.id;
      if (!taskId) return;

      const res = await request(app)
        .post('/tasks/claim')
        .send({ task_id: taskId, agent_id: agent1.id });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /tasks/next', () => {
    it('Should return next available task for agent', async () => {
      const res = await request(app)
        .get('/tasks/next?agent_id=' + agent1.id);

      expect(res.status).toBe(200);
    });

    it('Should reject without agent_id', async () => {
      const res = await request(app)
        .get('/tasks/next');

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /tasks/:id/status', () => {
    it('Should update task status to in_progress', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Status Task',
          objective: 'Test status update',
          acceptance_criteria: 'Task status changed',
          creator_agent_id: agent1.id,
        });

      const taskId = createRes.body.id;
      if (!taskId) return;

      await request(app).post('/tasks/claim').send({ task_id: taskId, agent_id: agent1.id });

      const res = await request(app)
        .patch(`/tasks/${taskId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /tasks/:id/review', () => {
    it('Should review a task as pass', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Review Task',
          objective: 'Test review functionality',
          acceptance_criteria: 'Task is reviewed',
          creator_agent_id: agent1.id,
          reviewer_agent_id: agent2.id,
        });

      const taskId = createRes.body.id;
      if (!taskId) return;

      await request(app).post('/tasks/claim').send({ task_id: taskId, agent_id: agent1.id });

      const res = await request(app)
        .post(`/tasks/${taskId}/review`)
        .send({ reviewer_id: agent2.id, result: 'pass', comment: 'All good' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /tasks/decompose', () => {
    it('Should decompose a parent task into sub-tasks', async () => {
      const createRes = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Parent Task for Decomposition',
          objective: 'Decompose me',
          acceptance_criteria: 'Sub-tasks created',
          creator_agent_id: agent1.id,
        });

      const parentId = createRes.body.id;
      if (!parentId) return;

      const res = await request(app)
        .post('/tasks/decompose')
        .send({
          parent_task_id: parentId,
          sub_tasks: [
            { title: 'Sub Task 1', objective: 'First step', acceptance_criteria: 'Done' },
            { title: 'Sub Task 2', objective: 'Second step', acceptance_criteria: 'Done' },
          ],
          creator_agent_id: agent1.id,
        });

      expect(res.status).toBe(200);
    });
  });
});

// ============ 产物管理端点 ============
describe('Products Management', () => {
  let agent1, project;

  beforeAll(async () => {
    const seeded = await seedDatabase();
    ({ agent1 } = seeded);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /products', () => {
    it('Should publish a product for a task', async () => {
      const createTaskRes = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Product Task',
          objective: 'Create deliverable',
          acceptance_criteria: 'Product delivered',
          creator_agent_id: agent1.id,
        });

      const taskId = createTaskRes.body.id;
      if (!taskId) return;

      const res = await request(app)
        .post('/products')
        .send({ task_id: taskId, product_type: 'api', url: 'http://example.com/api' });

      expect(res.status).toBe(200);
    });

    it('Should reject product without required fields', async () => {
      const res = await request(app)
        .post('/products')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /products/:taskId', () => {
    it('Should return products for a task', async () => {
      const createTaskRes = await request(app)
        .post('/tasks')
        .send({
          project_id: project.id,
          title: 'Products Task',
          objective: 'Test products retrieval',
          acceptance_criteria: 'Products retrieved',
          creator_agent_id: agent1.id,
        });

      const taskId = createTaskRes.body.id;
      if (!taskId) return;

      await request(app).post('/products').send({
        task_id: taskId,
        product_type: 'doc',
        url: 'http://example.com/doc',
      });

      const res = await request(app)
        .get(`/products/${taskId}`);

      expect(res.status).toBe(200);
    });
  });
});
