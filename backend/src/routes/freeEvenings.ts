import express, { Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import { FreeEvening } from '../models/FreeEvening';
import { MovieHistory } from '../models/MovieHistory';
import { User } from '../models/User';

const router = express.Router();

// Helper function to get start and end of upcoming week
const getUpcomingWeekDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get next Monday (or today if it's Monday)
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  
  // Get end of week (Sunday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
};

// Helper function to normalize date to start of day
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// Get free evenings for upcoming week (excluding dates with events)
router.get('/upcoming-week', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = getUpcomingWeekDates();
    
    // Get all meetings in the upcoming week
    const meetings = await MovieHistory.find({
      watchedDate: {
        $gte: startDate,
        $lte: endDate,
      },
    });
    
    // Create set of dates that have meetings (normalize to start of day)
    const datesWithMeetings = new Set(
      meetings.map(m => {
        const meetingDate = normalizeDate(m.watchedDate);
        return meetingDate.toISOString();
      })
    );
    
    // Get all free evenings for the upcoming week
    const freeEvenings = await FreeEvening.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate('userId', 'username displayName displayNameColor avatar')
      .sort({ date: 1 });
    
    // Group by date
    const freeEveningsByDate: Record<string, any[]> = {};
    freeEvenings.forEach(fe => {
      const dateKey = normalizeDate(fe.date).toISOString();
      if (!freeEveningsByDate[dateKey]) {
        freeEveningsByDate[dateKey] = [];
      }
      freeEveningsByDate[dateKey].push(fe);
    });
    
    // Generate all dates in the week
    const weekDates: Array<{ date: string; hasMeeting: boolean; freeUsers: any[] }> = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = normalizeDate(currentDate).toISOString();
      weekDates.push({
        date: dateKey,
        hasMeeting: datesWithMeetings.has(dateKey),
        freeUsers: freeEveningsByDate[dateKey] || [],
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json({
      weekStart: startDate.toISOString(),
      weekEnd: endDate.toISOString(),
      dates: weekDates,
    });
  } catch (error: any) {
    console.error('Error fetching free evenings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark a free evening
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date required' });
    }
    
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const eveningDate = normalizeDate(new Date(date));
    const { startDate, endDate } = getUpcomingWeekDates();
    
    // Check if date is in upcoming week
    if (eveningDate < startDate || eveningDate > endDate) {
      return res.status(400).json({ error: 'Date must be in the upcoming week' });
    }
    
    // Check if there's already a meeting on this date
    const nextDay = new Date(eveningDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const existingMeeting = await MovieHistory.findOne({
      watchedDate: {
        $gte: eveningDate,
        $lt: nextDay,
      },
    });
    
    if (existingMeeting) {
      return res.status(400).json({ error: 'A meeting is already scheduled for this date' });
    }
    
    // Check if free evening already exists
    const existing = await FreeEvening.findOne({
      userId: req.userId,
      date: eveningDate,
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Free evening already marked' });
    }
    
    // Create free evening
    const freeEvening = new FreeEvening({
      userId: req.userId,
      date: eveningDate,
    });
    
    await freeEvening.save();
    await freeEvening.populate('userId', 'username displayName displayNameColor avatar');
    
    res.status(201).json(freeEvening);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Free evening already marked' });
    }
    console.error('Error creating free evening:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unmark a free evening
router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date required' });
    }
    
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const eveningDate = normalizeDate(new Date(date));
    
    const freeEvening = await FreeEvening.findOneAndDelete({
      userId: req.userId,
      date: eveningDate,
    });
    
    if (!freeEvening) {
      return res.status(404).json({ error: 'Free evening not found' });
    }
    
    res.json({ message: 'Free evening removed successfully' });
  } catch (error: any) {
    console.error('Error deleting free evening:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's free evenings for upcoming week
router.get('/my-free-evenings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { startDate, endDate } = getUpcomingWeekDates();
    
    const freeEvenings = await FreeEvening.find({
      userId: req.userId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ date: 1 });
    
    const dates = freeEvenings.map(fe => normalizeDate(fe.date).toISOString());
    
    res.json({ dates });
  } catch (error: any) {
    console.error('Error fetching user free evenings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
