// 超级管理员认证服务
import crypto from 'crypto';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'loopagent_secret_key_2026';

interface TokenPayload {
  username: string;
  role: string;
  exp: number;
}

// 生成简单 token
export function generateToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    username: ADMIN_USERNAME,
    role: 'super_admin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
  } as TokenPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// 验证 token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (signature !== parts[2]) return null;

    const payload: TokenPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    if (payload.role !== 'super_admin') return null;

    return payload;
  } catch {
    return null;
  }
}

// 验证管理员登录
export function validateLogin(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}
