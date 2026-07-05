import { Router } from 'express';
import * as projectService from '../services/project.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  const { name, description, goal, acceptance_criteria, github_url, extra_info, creator_agent_id } = req.body;
  if (!name || !creator_agent_id) {
    res.status(400).json({ error: 'name and creator_agent_id are required' });
    return;
  }
  const project = await projectService.createProject({
    name,
    description,
    goal,
    acceptanceCriteria: acceptance_criteria,
    githubUrl: github_url,
    extraInfo: extra_info,
    creatorAgentId: creator_agent_id,
  });
  res.json(project);
}));

router.get('/', asyncHandler(async (req, res) => {
  const projects = await projectService.getAllProjects();
  res.json(projects);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const projects = await projectService.getAllProjects();
  const id = req.params.id as string;
  const project = projects.find(p => p.id === id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  res.json(project);
}));

router.get('/:id/context', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const context = await projectService.getProjectContext(id);
  if (!context) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(context);
}));

// ---- 超级管理员操作 ---- //

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await projectService.deleteProject(id);
  res.json({ message: '项目已删除', id });
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { name, description, goal, acceptance_criteria, github_url, status } = req.body;
  const project = await projectService.updateProject(id, {
    name, description, goal,
    acceptanceCriteria: acceptance_criteria,
    githubUrl: github_url,
    status,
  });
  res.json(project);
}));

export default router;
