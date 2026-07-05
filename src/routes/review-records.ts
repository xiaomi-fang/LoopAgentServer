import { Router } from 'express';
import * as reviewRecordService from '../services/review-record.service';
import { asyncHandler } from '../middleware/async-handler';
import { requireAdmin } from '../middleware/auth';

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

// 按任务 ID 查询审核记录
router.get('/task/:taskId', asyncHandler(async (req, res) => {
  const records = await reviewRecordService.getReviewRecordsByTask(req.params.taskId as string);
  res.json(records);
}));

// 更新审核记录状态（需管理员权限）
router.patch('/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) {
    res.status(400).json({ error: 'status is required' });
    return;
  }
  if (!['in_review', 'approved', 'rejected', 're_requested'].includes(status)) {
    res.status(400).json({ error: 'status must be one of: in_review, approved, rejected, re_requested' });
    return;
  }
  const record = await reviewRecordService.updateReviewRecordStatus(req.params.id as string, status);
  res.json(record);
}));

export default router;
