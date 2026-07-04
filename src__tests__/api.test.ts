import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import agentRoutes from '../routes/agents';
import projectRoutes from '../routes/projects';
import taskRoutes from '../routes/tasks';
import productRoutes from '../routes/products';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/agents', agentRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/products', productRoutes);

async function seedDatabase() {
  console.log('[SEED] Cleaning database...');
  await prisma.product.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.agent.deleteMany();

  const agent1 = await prisma.agent.create({
    data: { name: 'Coder', role: 'developer', capabilities: '[]', status: 'idle' },
  });
  const agent2 = await prisma.agent.create({
    data: { name: 'QA', role: 'reviewer', capabilities: '[]', status: 'idle' },
  });
  const project = await prisma.project.create({
    data: { name: 'Test Project', creatorAgentId: agent1.id },
  });

  return { agent1, agent2, project };
}

describe('Health Check', () => {
  it('GET /health - Should return ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

describe('Agents Management', () => {
  let agent1, project;
  beforeAll(async () => { const s = await seedDatabase(); ({ agent1 } = s); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('POST /agents/register - Should register a new agent', async () => {
    const res = await request(app).post('/agents/register').send({ name: 'New Agent', role: 'tester' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /agents/heartbeat - Should update heartbeat', async () => {
    const res = await request(app).post('/agents/heartbeat').send({ agent_id: agent1.id });
    expect(res.status).toBe(200);
  });

  it('GET /agents/discover - Should list agents', async () => {
    const res = await request(app).get('/agents/discover');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Projects Management', () => {
  let agent1, project;
  beforeAll(async () => { const s = await seedDatabase(); ({ agent1, project } = s); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('POST /projects - Should create a project', async () => {
    const res = await request(app).post('/projects').send({ name: 'New Project', creator_agent_id: agent1.id });
    expect(res.status).toBe(200);
  });

  it('GET /projects/:id/context - Should return context', async () => {
    const res = await request(app).get(`/projects/${project.id}/context`);
    expect(res.status).toBe(200);
  });
});

describe('Tasks Management', () => {
  let agent1, project;
  beforeAll(async () => { const s = await seedDatabase(); ({ agent1 } = s); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('POST /tasks - Should create a task', async () => {
    const res = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Task', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id,
    });
    expect(res.status).toBe(200);
  });

  it('POST /tasks/claim - Should claim task', async () => {
    const createRes = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Claimable', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id,
    });
    const res = await request(app).post('/tasks/claim').send({ task_id: createRes.body.id, agent_id: agent1.id });
    expect(res.status).toBe(200);
  });

  it('PATCH /tasks/:id/status - Should update status', async () => {
    const createRes = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Status Task', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id,
    });
    const res = await request(app).patch(`/tasks/${createRes.body.id}/status`).send({ status: 'in_progress' });
    expect(res.status).toBe(200);
  });

  it('POST /tasks/:id/review - Should review task', async () => {
    const createRes = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Review Task', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id, reviewer_agent_id: agent1.id,
    });
    const res = await request(app).post(`/tasks/${createRes.body.id}/review`).send({ reviewer_id: agent1.id, result: 'pass' });
    expect(res.status).toBe(200);
  });

  it('POST /tasks/decompose - Should decompose task', async () => {
    const createRes = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Parent', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id,
    });
    const res = await request(app).post('/tasks/decompose').send({
      parent_task_id: createRes.body.id, sub_tasks: [{ title: 'Sub 1', objective: 'Test', acceptance_criteria: 'Done' }], creator_agent_id: agent1.id,
    });
    expect(res.status).toBe(200);
  });
});

describe('Products Management', () => {
  let agent1, project;
  beforeAll(async () => { const s = await seedDatabase(); ({ agent1 } = s); });
  afterAll(async () => { await prisma.$disconnect(); });

  it('POST /products - Should publish product', async () => {
    const createTaskRes = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Product Task', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id,
    });
    const res = await request(app).post('/products').send({ task_id: createTaskRes.body.id, product_type: 'doc', url: 'http://example.com' });
    expect(res.status).toBe(200);
  });

  it('GET /products/:taskId - Should list products', async () => {
    const createTaskRes = await request(app).post('/tasks').send({
      project_id: project.id, title: 'Products Task', objective: 'Test', acceptance_criteria: 'Done', creator_agent_id: agent1.id,
    });
    await request(app).post('/products').send({ task_id: createTaskRes.body.id, product_type: 'doc', url: 'http://example.com' });
    const res = await request(app).get(`/products/${createTaskRes.body.id}`);
    expect(res.status).toBe(200);
  });
});

afterAll(async () => { await prisma.$disconnect(); }, 10000);
