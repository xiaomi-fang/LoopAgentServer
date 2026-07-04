import { Router } from 'express';
import * as agentService from '../services/agent.service';
import { asyncHandler } from '../middleware/async-handler';

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

export default router;
