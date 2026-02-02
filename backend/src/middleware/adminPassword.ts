import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const verifyAdminPassword = (
  req: Request | AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'] as string;

  if (!adminPassword) {
    res.status(500).json({ error: 'Admin password not configured' });
    return;
  }

  if (!providedPassword || providedPassword !== adminPassword) {
    res.status(403).json({ error: 'Invalid admin password' });
    return;
  }

  next();
};
