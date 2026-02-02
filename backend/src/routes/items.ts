import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Item } from '../models/Item';
import { MovieHistory } from '../models/MovieHistory';

const router = express.Router();

// Get items for an event
router.get('/event/:eventId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
    const items = await Item.find({ eventId })
      .populate('claimedBy', 'username');
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create item (admin only, or host of event)
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

    // Check if user is host or admin
    if (event.hostId.toString() !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Only host or admin can add items' });
    }

    const item = new Item({
      eventId,
      name,
      status: 'available',
    });

    await item.save();
    await item.populate('claimedBy', 'username');
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Claim/unclaim item
router.put('/:id/claim', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.status === 'claimed' && item.claimedBy?.toString() === req.userId) {
      // Unclaim
      item.status = 'available';
      item.claimedBy = undefined;
      item.claimedAt = undefined;
    } else if (item.status === 'available') {
      // Claim
      item.status = 'claimed';
      item.claimedBy = req.userId as any;
      item.claimedAt = new Date();
    } else {
      return res.status(400).json({ error: 'Item already claimed by someone else' });
    }

    await item.save();
    await item.populate('claimedBy', 'username');
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item (admin or host)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const item = await Item.findById(itemId).populate('eventId');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const event = item.eventId as any;
    if (event.hostId.toString() !== req.userId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Only host or admin can delete items' });
    }

    await Item.findByIdAndDelete(itemId);
    res.json({ message: 'Item deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
