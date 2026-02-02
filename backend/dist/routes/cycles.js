"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminPassword_1 = require("../middleware/adminPassword");
const Cycle_1 = require("../models/Cycle");
const Vote_1 = require("../models/Vote");
const router = express_1.default.Router();
// Get all cycles
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const cycles = await Cycle_1.Cycle.find()
            .populate('movies', 'title poster')
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });
        res.json(cycles);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get active cycle
router.get('/active', auth_1.authenticate, async (req, res) => {
    try {
        const cycle = await Cycle_1.Cycle.findOne({ isActive: true })
            .populate('movies', 'title poster description trailer')
            .populate('createdBy', 'username');
        if (!cycle) {
            return res.json(null);
        }
        // Get vote counts for each movie
        const voteCounts = await Vote_1.Vote.aggregate([
            { $match: { cycleId: cycle._id, voteType: 'like' } },
            { $group: { _id: '$movieId', count: { $sum: 1 } } },
        ]);
        const moviesWithVotes = cycle.movies.map((movie) => {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create cycle (admin password required)
router.post('/', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const { startDate, endDate, movieIds, meetingTime, location } = req.body;
        if (!startDate || !endDate || !movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
            return res.status(400).json({ error: 'Start date, end date, and movie IDs required' });
        }
        // Deactivate all other cycles
        await Cycle_1.Cycle.updateMany({ isActive: true }, { isActive: false });
        const cycle = new Cycle_1.Cycle({
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update cycle (admin password required)
router.put('/:id', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const { isActive, startDate, endDate, movieIds, meetingTime, location } = req.body;
        const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const cycle = await Cycle_1.Cycle.findById(cycleId);
        if (!cycle) {
            return res.status(404).json({ error: 'Cycle not found' });
        }
        if (isActive !== undefined) {
            // If activating this cycle, deactivate others
            if (isActive) {
                await Cycle_1.Cycle.updateMany({ _id: { $ne: cycle._id }, isActive: true }, { isActive: false });
            }
            cycle.isActive = isActive;
        }
        if (startDate)
            cycle.startDate = new Date(startDate);
        if (endDate)
            cycle.endDate = new Date(endDate);
        if (movieIds)
            cycle.movies = movieIds;
        if (meetingTime !== undefined)
            cycle.meetingTime = meetingTime ? new Date(meetingTime) : undefined;
        if (location !== undefined)
            cycle.location = location;
        await cycle.save();
        await cycle.populate('movies', 'title poster');
        await cycle.populate('createdBy', 'username');
        res.json(cycle);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Close cycle and determine winner (admin password required)
router.post('/:id/close', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const cycle = await Cycle_1.Cycle.findById(cycleId).populate('movies');
        if (!cycle) {
            return res.status(404).json({ error: 'Cycle not found' });
        }
        // Get vote counts
        const voteCounts = await Vote_1.Vote.aggregate([
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
