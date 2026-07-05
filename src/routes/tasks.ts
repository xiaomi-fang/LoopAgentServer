import { Router } from 'express';
import * as taskService from '../services/task.service';
import { TaskStatusType } from '../types';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', asyncHandler(async (req, res) => {
  const { project_id, parent_task_id, title, objective, acceptance_criteria, creator_agent_id, assignee_agent_id, reviewer_agent_id } = req.body;
  if (!project_id || !title || !objective || !acceptance_criteria || !creator_agent_id) {
    res.status(400).json({ error: 'project_id, title, objective, acceptance_criteria, creator_agent_id are required' });
    return;
  }
  const task = await taskService.createTask({
    projectId: project_id,
    parentTaskId: parent_task_id,
    title,
    objective,
    acceptanceCriteria: acceptance_criteria,
    creatorAgentId: creator_agent_id,
    assigneeAgentId: assignee_agent_id,
    reviewerAgentId: reviewer_agent_id,
  });
  res.json(task);
}));

router.get('/', asyncHandler(async (req, res) => {
  const tasks = await taskService.getAllTasks();
  res.json(tasks);
}));

/** 获取项目的任务树 */
router.get('/tree/:projectId', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const tree = await taskService.getTaskTree(projectId);
  res.json(tree);
}));

router.post('/claim', asyncHandler(async (req, res) => {
  const { task_id, agent_id } = req.body;
  if (!task_id || !agent_id) {
    res.status(400).json({ error: 'task_id and agent_id are required' });
    return;
  }
  const task = await taskService.claimTask(task_id, agent_id);
  res.json(task);
}));

router.get('/next', asyncHandler(async (req, res) => {
  const agentId = typeof req.query.agent_id === 'string' ? req.query.agent_id : '';
  const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : undefined;
  if (!agentId) {
    res.status(400).json({ error: 'agent_id is required' });
    return;
  }
  const task = await taskService.getNextTask(agentId, projectId);
  if (!task) {
    res.json({ message: 'No pending tasks available' });
    return;
  }
  res.json(task);
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const { status, submit_note, comment } = req.body;
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  const task = await taskService.updateTaskStatus(req.params.id as string, status as TaskStatusType, {
    submitNote: submit_note,
    comment,
  });
  res.json(task);
}));

router.post('/:id/review', asyncHandler(async (req, res) => {
  const { reviewer_id, result, comment } = req.body;
  if (!reviewer_id || !result) {
    res.status(400).json({ error: 'reviewer_id and result are required' });
    return;
  }
  if (!['pass', 'fail'].includes(result)) {
    res.status(400).json({ error: 'result must be "pass" or "fail"' });
    return;
  }
  const outcome = await taskService.reviewTask(req.params.id as string, reviewer_id, result, comment);
  res.json(outcome);
}));

router.post('/decompose', asyncHandler(async (req, res) => {
  const { parent_task_id, sub_tasks, creator_agent_id } = req.body;
  if (!parent_task_id || !sub_tasks || !creator_agent_id) {
    res.status(400).json({ error: 'parent_task_id, sub_tasks, creator_agent_id are required' });
    return;
  }
  const mapped = (sub_tasks as any[]).map((st: any) => ({
    title: st.title,
    objective: st.objective,
  }));
  const created = await taskService.decompose({
    parentTaskId: parent_task_id,
    subTasks: mapped,
    creatorAgentId: creator_agent_id,
  });
  res.json(created);
}));

/** 拖拽/右键重设父任务或排序 */
router.patch('/:id/reparent', asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { parent_task_id, new_index } = req.body;
  const task = await taskService.reparentTask(id, {
    parentTaskId: parent_task_id,
    newIndex: new_index,
  });
  res.json(task);
}));

// ---- 超级管理员操作 ---- //

router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  await taskService.deleteTask(id);
  res.json({ message: '任务已删除', id });
}));

router.put('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { title, objective, acceptance_criteria, assignee_agent_id, reviewer_agent_id } = req.body;
  const task = await taskService.updateTask(id, {
    title, objective,
    acceptanceCriteria: acceptance_criteria,
    assigneeAgentId: assignee_agent_id,
    reviewerAgentId: reviewer_agent_id,
  });
  res.json(task);
}));

export default router;
