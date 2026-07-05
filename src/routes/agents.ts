import { Router } from 'express';
import * as agentService from '../services/agent.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  const { name, role, capabilities, endpoint } = req.body;
  if (!name || !role) {
    res.status(400).json({ error: 'name and role are required' });
    return;
  }
  const agent = await agentService.registerAgent({ name, role, capabilities, endpoint });
  res.json(agent);
}));

router.post('/register', asyncHandler(async (req, res) => {
  const { name, role, capabilities, endpoint } = req.body;
  if (!name || !role) {
    res.status(400).json({ error: 'name and role are required' });
    return;
  }
  const agent = await agentService.registerAgent({ name, role, capabilities, endpoint });
  res.json(agent);
}));

router.post('/heartbeat', asyncHandler(async (req, res) => {
  const { agent_id } = req.body;
  if (!agent_id) {
    res.status(400).json({ error: 'agent_id is required' });
    return;
  }
  const agent = await agentService.heartbeat(agent_id);
  res.json(agent);
}));

router.get('/discover', asyncHandler(async (req, res) => {
  const capability = typeof req.query.capability === 'string' ? req.query.capability : undefined;
  const agents = await agentService.discoverAgents(capability);
  res.json(agents);
}));

router.get('/', asyncHandler(async (req, res) => {
  const agents = await agentService.discoverAgents();
  res.json(agents);
}));

// ---- 超级管理员操作 ---- //

// 删除智能体
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await agentService.deleteAgent(id);
  res.json({ message: '智能体已删除', id });
}));

// 更新智能体
router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { name, role, capabilities, status } = req.body;
  const agent = await agentService.updateAgent(id, { name, role, capabilities, status });
  res.json(agent);
}));

export default router;
