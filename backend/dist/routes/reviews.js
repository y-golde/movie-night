"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const MovieHistory_1 = require("../models/MovieHistory");
const Movie_1 = require("../models/Movie");
const router = express_1.default.Router();
// Get all movie history
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const history = await MovieHistory_1.MovieHistory.find()
            .populate('movieId', 'title poster')
            .populate('hostId', 'username')
            .populate('ratings.userId', 'username')
            .sort({ watchedDate: -1 });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get movie history by ID
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const history = await MovieHistory_1.MovieHistory.findById(historyId)
            .populate('movieId', 'title poster description')
            .populate('hostId', 'username')
            .populate('ratings.userId', 'username');
        if (!history) {
            return res.status(404).json({ error: 'Movie history not found' });
        }
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create movie history entry (when movie is watched)
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { movieId, watchedDate } = req.body;
        if (!movieId || !watchedDate) {
            return res.status(400).json({ error: 'Movie ID and watched date required' });
        }
        const movie = await Movie_1.Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        const history = new MovieHistory_1.MovieHistory({
            movieId,
            watchedDate: new Date(watchedDate),
            hostId: req.userId,
            status: 'watched',
        });
        await history.save();
        await history.populate('movieId', 'title poster');
        await history.populate('hostId', 'username');
        res.status(201).json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add review to movie history
router.post('/:id/reviews', auth_1.authenticate, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || !comment) {
            return res.status(400).json({ error: 'Rating and comment required' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        if (comment.length < 50) {
            return res.status(400).json({ error: 'Comment must be at least 50 characters' });
        }
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const history = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!history) {
            return res.status(404).json({ error: 'Movie history not found' });
        }
        // Check if user already reviewed
        const existingReview = history.ratings.find((r) => r.userId.toString() === req.userId);
        if (existingReview) {
            // Update existing review
            existingReview.rating = rating;
            existingReview.comment = comment;
        }
        else {
            // Add new review
            history.ratings.push({
                userId: req.userId,
                rating,
                comment,
            });
        }
        await history.save();
        await history.populate('ratings.userId', 'username');
        await history.populate('movieId', 'title poster');
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
