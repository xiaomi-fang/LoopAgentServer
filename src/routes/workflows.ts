// src/routes/workflows.ts
import { Router } from 'express';
import { workflowEngine } from '../services/workflow-engine.service';
import prisma from '../prisma';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// 获取项目工作流 DAG（节点 + 连线）
router.get('/:projectId/dag', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const dag = await workflowEngine.buildDAG(projectId);
  res.json(dag);
}));

// 获取项目工作流进度统计
router.get('/:projectId/progress', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  const progress = await workflowEngine.getProgress(projectId);
  res.json(progress);
}));

// 启动工作流
router.post('/:projectId/run', requireAdmin, asyncHandler(async (req, res) => {
  const projectId = req.params.projectId as string;
  // 异步运行（不 await，后台执行）
  workflowEngine.run(projectId).catch(err => {
    console.error('[WORKFLOW] Run error:', err);
  });
  res.json({ message: '工作流已启动（后台运行）', projectId });
}));

// 更新任务状态（Agent 回调用 / 手动推进）
router.put('/tasks/:taskId/status', requireAdmin, asyncHandler(async (req, res) => {
  const taskId = req.params.taskId as string;
  const { status, comment, submitNote } = req.body;

  const validStatuses = ['pending', 'in_progress', 'blocked', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: `无效状态: ${status}，可用: ${validStatuses.join(', ')}` });
    return;
  }

  const updateData: any = { status };
  if (comment !== undefined) updateData.comment = comment;
  if (submitNote !== undefined) updateData.submitNote = submitNote;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });
  res.json(task);
}));

export default router;
