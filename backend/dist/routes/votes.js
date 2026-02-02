"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const Vote_1 = require("../models/Vote");
const Cycle_1 = require("../models/Cycle");
const router = express_1.default.Router();
// Submit vote
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { movieId, cycleId, voteType } = req.body;
        if (!movieId || !cycleId || !voteType) {
            return res.status(400).json({ error: 'Movie ID, cycle ID, and vote type required' });
        }
        if (voteType !== 'like' && voteType !== 'dislike') {
            return res.status(400).json({ error: 'Vote type must be "like" or "dislike"' });
        }
        // Check if cycle is active
        const cycle = await Cycle_1.Cycle.findById(cycleId);
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
        await Vote_1.Vote.findOneAndDelete({
            userId: req.userId,
            movieId,
            cycleId,
        });
        // Create new vote
        const vote = new Vote_1.Vote({
            userId: req.userId,
            movieId,
            cycleId,
            voteType,
        });
        await vote.save();
        res.status(201).json(vote);
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'You have already voted for this movie' });
        }
        res.status(500).json({ error: error.message });
    }
});
// Get user's votes for a cycle
router.get('/cycle/:cycleId', auth_1.authenticate, async (req, res) => {
    try {
        const cycleId = Array.isArray(req.params.cycleId) ? req.params.cycleId[0] : req.params.cycleId;
        const votes = await Vote_1.Vote.find({
            userId: req.userId,
            cycleId,
        });
        res.json(votes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
