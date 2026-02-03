import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Item } from '../models/Item';
import { MovieHistory } from '../models/MovieHistory';

// Helper to check if user has admin access (either isAdmin flag or admin password)
const hasAdminAccess = (req: AuthRequest): boolean => {
  // Check if user has isAdmin flag
  if (req.user?.isAdmin) {
    return true;
  }
  
  // Check if admin password header is present and valid
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'] as string;
  
  if (adminPassword && providedPassword && providedPassword === adminPassword) {
    return true;
  }
  
  return false;
};

const router = express.Router();

// Get items for an event
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const items = await Item.find({ eventId })
      .populate('claimedBy', 'username displayName displayNameColor avatar');
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create item (admin only, or host of event) - only for future events
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, name } = req.body;

    if (!eventId || !name) {
      return res.status(400).json({ error: 'Event ID and name required' });
    }

    const event = await MovieHistory.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only allow items for future events
    if (event.status !== 'upcoming' || new Date(event.watchedDate) <= new Date()) {
      return res.status(400).json({ error: 'Items can only be added to future events' });
    }

    // Check if user is host or admin
    if (event.hostId.toString() !== req.userId && !hasAdminAccess(req)) {
      return res.status(403).json({ error: 'Only host or admin can add items' });
    }

    const item = new Item({
      eventId,
      name,
      status: 'available',
    });

    await item.save();
    await item.populate('claimedBy', 'username displayName displayNameColor avatar');
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Claim/unclaim item - only for future events, one item per user per event
router.put('/:id/claim', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await Item.findById(itemId).populate('eventId');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const event = item.eventId as any;
    
    // Only allow claiming items for future events
    if (event.status !== 'upcoming' || new Date(event.watchedDate) <= new Date()) {
      return res.status(400).json({ error: 'Items can only be claimed for future events' });
    }

    if (item.status === 'claimed' && item.claimedBy?.toString() === req.userId) {
      // Unclaim
      item.status = 'available';
      item.claimedBy = undefined;
      item.claimedAt = undefined;
    } else if (item.status === 'available') {
      // Check if user already claimed another item for this event
      const userClaimedItem = await Item.findOne({
        eventId: event._id,
        claimedBy: req.userId,
        status: 'claimed',
      });
      
      if (userClaimedItem && userClaimedItem._id.toString() !== itemId) {
        return res.status(400).json({ error: 'You can only claim one item per event' });
      }

      // Claim
      item.status = 'claimed';
      item.claimedBy = req.userId as any;
      item.claimedAt = new Date();
    } else {
      return res.status(400).json({ error: 'Item already claimed by someone else' });
    }

    await item.save();
    await item.populate('claimedBy', 'username displayName displayNameColor avatar');
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item (admin or host) - only for future events
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await Item.findById(itemId).populate('eventId');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const event = item.eventId as any;
    
    // Only allow deleting items for future events
    if (event.status !== 'upcoming' || new Date(event.watchedDate) <= new Date()) {
      return res.status(400).json({ error: 'Items can only be deleted from future events' });
    }

    if (event.hostId.toString() !== req.userId && !hasAdminAccess(req)) {
      return res.status(403).json({ error: 'Only host or admin can delete items' });
    }

    await Item.findByIdAndDelete(itemId);
    res.json({ message: 'Item deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
