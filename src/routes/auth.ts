// 管理员登录路由
import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { validateLogin, generateToken } from '../services/auth.service';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码为必填项' });
    return;
  }

  if (!validateLogin(username, password)) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const token = generateToken();
  res.json({
    token,
    username,
    role: 'super_admin',
    message: '登录成功'
  });
}));

export default router;
