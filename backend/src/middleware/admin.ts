import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};
