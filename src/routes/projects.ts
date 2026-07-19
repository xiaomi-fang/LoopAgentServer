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

// ---- 专用状态操作 ---- //

// 激活项目 → 进入规划阶段
router.put('/:id/activate', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const project = await projectService.activateProject(id);
  res.json({ message: '项目已进入规划阶段', project });
}));

// 审核项目（通过/驳回）
router.put('/:id/review', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { approved, comment } = req.body;
  const project = await projectService.reviewProject(id, approved, comment);
  res.json({ message: approved ? '审核通过' : '审核不通过', project });
}));

// 开始研发
router.put('/:id/start-dev', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const project = await projectService.startDev(id);
  res.json({ message: '项目已进入研发阶段', project });
}));

export default router;
