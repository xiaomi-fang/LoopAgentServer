import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[ERROR]', err.message);
  res.status(400).json({ error: err.message });
}
