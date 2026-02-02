import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Vote } from '../models/Vote';
import { Cycle } from '../models/Cycle';

const router = express.Router();

// Submit vote
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { movieId, cycleId, voteType, review } = req.body;

    if (!movieId || !cycleId || !voteType) {
      return res.status(400).json({ error: 'Movie ID, cycle ID, and vote type required' });
    }

    if (voteType !== 'like' && voteType !== 'dislike') {
      return res.status(400).json({ error: 'Vote type must be "like" or "dislike"' });
    }

    // Check if cycle is active
    const cycle = await Cycle.findById(cycleId);
    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (!cycle.isActive) {
      return res.status(400).json({ error: 'Cycle is not active' });
    }

    const now = new Date();
    if (now < cycle.startDate || now > cycle.endDate) {
      return res.status(400).json({ error: 'Voting period has not started or has ended' });
    }

    // Check if movie is in cycle
    if (!cycle.movies.includes(movieId)) {
      return res.status(400).json({ error: 'Movie is not in this cycle' });
    }

    // Remove existing vote if any
    await Vote.findOneAndDelete({
      userId: req.userId,
      movieId,
      cycleId,
    });

    // Create new vote
    const vote = new Vote({
      userId: req.userId,
      movieId,
      cycleId,
      voteType,
      review: review || undefined,
    });

    await vote.save();
    res.status(201).json(vote);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already voted for this movie' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get user's votes for a cycle
router.get('/cycle/:cycleId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cycleId = Array.isArray(req.params.cycleId) ? req.params.cycleId[0] : req.params.cycleId;
    const votes = await Vote.find({
      userId: req.userId,
      cycleId,
    });
    res.json(votes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
