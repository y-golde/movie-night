"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const Item_1 = require("../models/Item");
const MovieHistory_1 = require("../models/MovieHistory");
const router = express_1.default.Router();
// Get items for an event
router.get('/event/:eventId', auth_1.authenticate, async (req, res) => {
    try {
        const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
        const items = await Item_1.Item.find({ eventId })
            .populate('claimedBy', 'username');
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create item (admin only, or host of event)
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { eventId, name } = req.body;
        if (!eventId || !name) {
            return res.status(400).json({ error: 'Event ID and name required' });
        }
        const event = await MovieHistory_1.MovieHistory.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        // Check if user is host or admin
        if (event.hostId.toString() !== req.userId && !req.user?.isAdmin) {
            return res.status(403).json({ error: 'Only host or admin can add items' });
        }
        const item = new Item_1.Item({
            eventId,
            name,
            status: 'available',
        });
        await item.save();
        await item.populate('claimedBy', 'username');
        res.status(201).json(item);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Claim/unclaim item
router.put('/:id/claim', auth_1.authenticate, async (req, res) => {
    try {
        const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await Item_1.Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        if (item.status === 'claimed' && item.claimedBy?.toString() === req.userId) {
            // Unclaim
            item.status = 'available';
            item.claimedBy = undefined;
            item.claimedAt = undefined;
        }
        else if (item.status === 'available') {
            // Claim
            item.status = 'claimed';
            item.claimedBy = req.userId;
            item.claimedAt = new Date();
        }
        else {
            return res.status(400).json({ error: 'Item already claimed by someone else' });
        }
        await item.save();
        await item.populate('claimedBy', 'username');
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete item (admin or host)
router.delete('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const itemId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const item = await Item_1.Item.findById(itemId).populate('eventId');
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        const event = item.eventId;
        if (event.hostId.toString() !== req.userId && !req.user?.isAdmin) {
            return res.status(403).json({ error: 'Only host or admin can delete items' });
        }
        await Item_1.Item.findByIdAndDelete(itemId);
        res.json({ message: 'Item deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
