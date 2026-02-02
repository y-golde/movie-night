import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { generateRecommendations, generateWeeklyRecommendations } from '../services/aiRecommendations';

const router = express.Router();

// Get recommendations for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const recommendations = await generateRecommendations(req.userId!, limit);
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate weekly recommendations (admin only, or cron job)
router.post('/generate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await generateWeeklyRecommendations();
    res.json({ message: 'Recommendations generated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
