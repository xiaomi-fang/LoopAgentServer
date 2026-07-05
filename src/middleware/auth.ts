// 超级管理员认证中间件
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权，请先登录' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: '登录已过期或无效，请重新登录' });
    return;
  }

  // 将管理员信息注入请求
  (req as any).admin = payload;
  next();
}
