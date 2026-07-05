import { Router } from 'express';
import * as reviewRecordService from '../services/review-record.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

// 创建审核记录（需管理员权限）
router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  const { task_id, reviewer_id, suggestion, status } = req.body;
  if (!task_id || !reviewer_id || !suggestion) {
    res.status(400).json({ error: 'task_id, reviewer_id, suggestion are required' });
    return;
  }
  const record = await reviewRecordService.createReviewRecord({
    taskId: task_id,
    reviewerId: reviewer_id,
    suggestion,
    status,
  });
  res.json(record);
}));

// 按任务 ID 查询审核记录（无需管理员）
router.get('/task/:taskId', asyncHandler(async (req, res) => {
  const records = await reviewRecordService.getReviewRecordsByTask(req.params.taskId as string);
  res.json(records);
}));

/**
 * 审核者操作：通过 / 驳回审核
 * 需校验调用者是指定的审核者
 */
router.patch('/:id/review', requireAdmin, asyncHandler(async (req, res) => {
  const { reviewer_id, result } = req.body;
  if (!reviewer_id || !result) {
    res.status(400).json({ error: 'reviewer_id and result (approved/rejected) are required' });
    return;
  }
  if (!['approved', 'rejected'].includes(result)) {
    res.status(400).json({ error: 'result must be "approved" or "rejected"' });
    return;
  }
  const record = await reviewRecordService.getReviewRecordById(req.params.id as string);
  if (!record) {
    res.status(404).json({ error: '审核记录不存在' });
    return;
  }
  if (record.reviewerId !== reviewer_id) {
    res.status(403).json({ error: '只有该审核记录的审核者才能操作' });
    return;
  }
  if (record.status !== 'in_review' && record.status !== 're_requested') {
    res.status(400).json({ error: `当前状态 ${record.status} 不允许审核操作` });
    return;
  }
  const updated = await reviewRecordService.updateReviewRecordStatus(req.params.id as string, result);
  res.json(updated);
}));

/**
 * 任务执行者操作：重新请求审核
 * 需校验调用者是该任务的执行者
 */
router.patch('/:id/re-request', requireAdmin, asyncHandler(async (req, res) => {
  const { assignee_id } = req.body;
  if (!assignee_id) {
    res.status(400).json({ error: 'assignee_id is required' });
    return;
  }
  const record = await reviewRecordService.getReviewRecordById(req.params.id as string);
  if (!record) {
    res.status(404).json({ error: '审核记录不存在' });
    return;
  }
  // 获取任务，验证执行者
  const task = await prisma.task.findUnique({ where: { id: record.taskId } });
  if (!task) {
    res.status(404).json({ error: '关联任务不存在' });
    return;
  }
  if (task.assigneeAgentId !== assignee_id) {
    res.status(403).json({ error: '只有任务的执行者才能重新请求审核' });
    return;
  }
  if (record.status !== 'rejected') {
    res.status(400).json({ error: '仅当审核未通过时才能重新请求审核' });
    return;
  }
  const updated = await reviewRecordService.updateReviewRecordStatus(req.params.id as string, 're_requested');
  res.json(updated);
}));

export default router;
