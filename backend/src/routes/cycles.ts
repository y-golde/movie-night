import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { verifyAdminPassword } from '../middleware/adminPassword';
import { Cycle } from '../models/Cycle';
import { Vote } from '../models/Vote';
import { Movie } from '../models/Movie';

const router = express.Router();

// Get all cycles
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cycles = await Cycle.find()
      .populate('movies', 'title poster')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    res.json(cycles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get active cycle
router.get('/active', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cycle = await Cycle.findOne({ isActive: true })
      .populate('movies', 'title poster description trailer genres releaseDate runtime')
      .populate('createdBy', 'username');
    
    if (!cycle) {
      return res.json(null);
    }

    // Get vote counts for each movie
    const voteCounts = await Vote.aggregate([
      { $match: { cycleId: cycle._id, voteType: 'like' } },
      { $group: { _id: '$movieId', count: { $sum: 1 } } },
    ]);

    const moviesWithVotes = cycle.movies.map((movie: any) => {
      const voteData = voteCounts.find((v) => v._id.toString() === movie._id.toString());
      return {
        ...movie.toObject(),
        likeCount: voteData?.count || 0,
      };
    });

    res.json({
      ...cycle.toObject(),
      movies: moviesWithVotes,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create cycle (admin password required)
router.post('/', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, movieIds, meetingTime, location } = req.body;

    if (!startDate || !endDate || !movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      return res.status(400).json({ error: 'Start date, end date, and movie IDs required' });
    }

    // Deactivate all other cycles
    await Cycle.updateMany({ isActive: true }, { isActive: false });

    const cycle = new Cycle({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      meetingTime: meetingTime ? new Date(meetingTime) : undefined,
      location: location,
      movies: movieIds,
      createdBy: req.userId,
      isActive: true,
    });

    await cycle.save();
    await cycle.populate('movies', 'title poster');
    await cycle.populate('createdBy', 'username');

    res.status(201).json(cycle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update cycle (admin password required)
router.put('/:id', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, startDate, endDate, movieIds, meetingTime, location } = req.body;
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cycle = await Cycle.findById(cycleId);

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    if (isActive !== undefined) {
      // If activating this cycle, deactivate others
      if (isActive) {
        await Cycle.updateMany({ _id: { $ne: cycle._id }, isActive: true }, { isActive: false });
      }
      cycle.isActive = isActive;
    }

    if (startDate) cycle.startDate = new Date(startDate);
    if (endDate) cycle.endDate = new Date(endDate);
    if (movieIds) cycle.movies = movieIds;
    if (meetingTime !== undefined) cycle.meetingTime = meetingTime ? new Date(meetingTime) : undefined;
    if (location !== undefined) cycle.location = location;

    await cycle.save();
    await cycle.populate('movies', 'title poster');
    await cycle.populate('createdBy', 'username');

    res.json(cycle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Close cycle and determine winner (admin password required)
router.post('/:id/close', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cycle = await Cycle.findById(cycleId).populate('movies');

    if (!cycle) {
      return res.status(404).json({ error: 'Cycle not found' });
    }

    // Get vote counts
    const voteCounts = await Vote.aggregate([
      { $match: { cycleId: cycle._id, voteType: 'like' } },
      { $group: { _id: '$movieId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (voteCounts.length === 0) {
      return res.status(400).json({ error: 'No votes found for this cycle' });
    }

    const winnerMovieId = voteCounts[0]._id;
    cycle.isActive = false;
    await cycle.save();

    res.json({
      winner: winnerMovieId,
      voteCounts,
      message: 'Cycle closed successfully',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
