import { Router } from 'express';
import * as projectService from '../services/project.service';
import { asyncHandler } from '../middleware/async-handler';

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

router.get('/:id/context', asyncHandler(async (req, res) => {
  const context = await projectService.getProjectContext(req.params.id as string);
  if (!context) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(context);
}));

export default router;
