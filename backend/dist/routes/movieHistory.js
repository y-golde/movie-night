"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = require("../middleware/auth");
const adminPassword_1 = require("../middleware/adminPassword");
const MovieHistory_1 = require("../models/MovieHistory");
const Movie_1 = require("../models/Movie");
const MeetingVote_1 = require("../models/MeetingVote");
const aiMovieRecommendations_1 = require("../services/aiMovieRecommendations");
const router = express_1.default.Router();
// Get all movie history (past and upcoming meetings)
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const history = await MovieHistory_1.MovieHistory.find()
            .populate('movieIds', 'title poster')
            .populate('candidates', 'title poster')
            .populate('hostId', 'username displayName displayNameColor avatar')
            .populate('ratings.userId', 'username displayName displayNameColor avatar')
            .populate('ratings.movieId', 'title poster')
            .populate('gatheringRatings.userId', 'username displayName displayNameColor avatar')
            .sort({ watchedDate: -1 });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create meeting (admin password required) - movies are optional
const createPastMeeting = async (req, res) => {
    try {
        const { movieIds, watchedDate, location } = req.body;
        if (!watchedDate) {
            return res.status(400).json({ error: 'Meeting date required' });
        }
        if (!req.userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // If movieIds provided, verify they exist
        if (movieIds && Array.isArray(movieIds) && movieIds.length > 0) {
            const movies = await Movie_1.Movie.find({ _id: { $in: movieIds } });
            if (movies.length !== movieIds.length) {
                return res.status(404).json({ error: 'One or more movies not found' });
            }
        }
        const userIdObjectId = new mongoose_1.default.Types.ObjectId(req.userId);
        const meetingDate = new Date(watchedDate);
        const isUpcoming = meetingDate > new Date();
        const history = new MovieHistory_1.MovieHistory({
            movieIds: movieIds && movieIds.length > 0 ? movieIds : [],
            watchedDate: meetingDate,
            hostId: userIdObjectId,
            location,
            status: isUpcoming ? 'upcoming' : 'watched',
        });
        await history.save();
        if (history.movieIds.length > 0) {
            await history.populate('movieIds', 'title poster');
        }
        await history.populate('hostId', 'username displayName displayNameColor avatar');
        res.status(201).json(history);
    }
    catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: error.message });
    }
};
router.post('/', auth_1.authenticate, adminPassword_1.verifyAdminPassword, createPastMeeting);
// Update meeting (admin password required)
router.put('/:id', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { movieIds, watchedDate, location } = req.body;
        const history = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!history) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        // If movieIds provided, verify they exist
        if (movieIds && Array.isArray(movieIds) && movieIds.length > 0) {
            const movies = await Movie_1.Movie.find({ _id: { $in: movieIds } });
            if (movies.length !== movieIds.length) {
                return res.status(404).json({ error: 'One or more movies not found' });
            }
        }
        if (movieIds !== undefined) {
            history.movieIds = movieIds;
        }
        if (watchedDate) {
            const meetingDate = new Date(watchedDate);
            history.watchedDate = meetingDate;
            history.status = meetingDate > new Date() ? 'upcoming' : 'watched';
        }
        if (location !== undefined) {
            history.location = location;
        }
        await history.save();
        if (history.movieIds.length > 0) {
            await history.populate('movieIds', 'title poster');
        }
        await history.populate('hostId', 'username displayName displayNameColor avatar');
        res.json(history);
    }
    catch (error) {
        console.error('Error updating meeting:', error);
        res.status(500).json({ error: error.message });
    }
});
// Add movie rating
router.post('/:id/rating', auth_1.authenticate, async (req, res) => {
    try {
        const { rating, comment, movieId } = req.body;
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!req.userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        if (!comment || comment.length < 50) {
            return res.status(400).json({ error: 'Comment must be at least 50 characters' });
        }
        const history = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!history) {
            return res.status(404).json({ error: 'Movie history not found' });
        }
        const userId = req.userId; // TypeScript now knows this is defined
        const userIdObjectId = new mongoose_1.default.Types.ObjectId(userId);
        const movieIdObjectId = movieId ? new mongoose_1.default.Types.ObjectId(movieId) : undefined;
        // Remove existing rating from this user for this specific movie (or any movie if movieId not provided)
        history.ratings = history.ratings.filter((r) => {
            if (movieId) {
                return !(r.userId.toString() === userId && r.movieId && r.movieId.toString() === movieId);
            }
            return r.userId.toString() !== userId;
        });
        // Add new rating
        history.ratings.push({
            userId: userIdObjectId,
            movieId: movieIdObjectId,
            rating,
            comment,
        });
        await history.save();
        await history.populate('ratings.userId', 'username displayName displayNameColor avatar');
        if (movieIdObjectId) {
            await history.populate('ratings.movieId', 'title poster');
        }
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Add gathering rating
router.post('/:id/gathering-rating', auth_1.authenticate, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!req.userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }
        const history = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!history) {
            return res.status(404).json({ error: 'Movie history not found' });
        }
        const userId = req.userId; // TypeScript now knows this is defined
        const userIdObjectId = new mongoose_1.default.Types.ObjectId(userId);
        // Remove existing gathering rating from this user if any
        history.gatheringRatings = history.gatheringRatings.filter((r) => r.userId.toString() !== userId);
        // Add new gathering rating
        history.gatheringRatings.push({
            userId: userIdObjectId,
            rating,
            comment: comment || undefined,
        });
        await history.save();
        await history.populate('gatheringRatings.userId', 'username displayName displayNameColor avatar');
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Delete meeting (admin password required)
router.delete('/:id', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const history = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!history) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        await MovieHistory_1.MovieHistory.findByIdAndDelete(historyId);
        res.json({ message: 'Meeting deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get AI movie suggestions for a meeting (admin password required)
router.post('/:id/ai-suggestions', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const limit = parseInt(req.query.limit) || 15;
        const meeting = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        const suggestions = await (0, aiMovieRecommendations_1.generateAIMovieSuggestions)(historyId, limit);
        // Automatically add suggestions as candidates
        const suggestionMovieIds = suggestions.map((s) => s.movieId);
        if (!meeting.candidates) {
            meeting.candidates = [];
        }
        // Add new suggestions that aren't already candidates
        for (const movieId of suggestionMovieIds) {
            if (!meeting.candidates.some((id) => id.toString() === movieId)) {
                meeting.candidates.push(new mongoose_1.default.Types.ObjectId(movieId));
            }
        }
        await meeting.save();
        res.json({ suggestions });
    }
    catch (error) {
        console.error('Error generating AI suggestions:', error);
        res.status(500).json({ error: error.message || 'Failed to generate AI suggestions' });
    }
});
// Get cached AI suggestions for a meeting (admin password required)
router.get('/:id/ai-suggestions', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const meeting = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        // This will return cached if available, or generate new ones
        const suggestions = await (0, aiMovieRecommendations_1.generateAIMovieSuggestions)(historyId, 15);
        res.json({ suggestions });
    }
    catch (error) {
        console.error('Error fetching AI suggestions:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch AI suggestions' });
    }
});
// Get all reviews for a specific movie across all meetings (admin password required)
router.get('/reviews/:movieId', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const movieId = Array.isArray(req.params.movieId) ? req.params.movieId[0] : req.params.movieId;
        // Find all meetings that have reviews for this movie
        const meetings = await MovieHistory_1.MovieHistory.find({
            'ratings.movieId': new mongoose_1.default.Types.ObjectId(movieId),
        })
            .populate('ratings.userId', 'username displayName displayNameColor avatar')
            .populate('ratings.movieId', 'title poster')
            .populate('movieIds', 'title poster')
            .sort({ watchedDate: -1 });
        // Extract reviews for this specific movie
        const reviews = [];
        for (const meeting of meetings) {
            const movieReviews = meeting.ratings.filter((r) => r.movieId && r.movieId._id && r.movieId._id.toString() === movieId);
            for (const review of movieReviews) {
                const reviewDoc = review;
                reviews.push({
                    _id: reviewDoc._id || reviewDoc.id,
                    userId: review.userId,
                    rating: review.rating,
                    comment: review.comment,
                    meeting: {
                        _id: meeting._id,
                        watchedDate: meeting.watchedDate,
                        location: meeting.location,
                    },
                });
            }
        }
        res.json({ reviews });
    }
    catch (error) {
        console.error('Error fetching movie reviews:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch reviews' });
    }
});
// Add candidate to meeting (admin password required)
router.post('/:id/candidates', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { movieId } = req.body;
        if (!movieId) {
            return res.status(400).json({ error: 'Movie ID required' });
        }
        const meeting = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        const movie = await Movie_1.Movie.findById(movieId);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        // Check if already a candidate
        if (meeting.candidates && meeting.candidates.some((id) => id.toString() === movieId)) {
            return res.status(400).json({ error: 'Movie is already a candidate' });
        }
        // Add to candidates
        if (!meeting.candidates) {
            meeting.candidates = [];
        }
        meeting.candidates.push(new mongoose_1.default.Types.ObjectId(movieId));
        await meeting.save();
        await meeting.populate('candidates', 'title poster');
        res.json(meeting);
    }
    catch (error) {
        console.error('Error adding candidate:', error);
        res.status(500).json({ error: error.message || 'Failed to add candidate' });
    }
});
// Remove candidate from meeting (admin password required)
router.delete('/:id/candidates/:movieId', auth_1.authenticate, adminPassword_1.verifyAdminPassword, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const movieId = Array.isArray(req.params.movieId) ? req.params.movieId[0] : req.params.movieId;
        const meeting = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        // Remove from candidates
        if (meeting.candidates) {
            meeting.candidates = meeting.candidates.filter((id) => id.toString() !== movieId);
            await meeting.save();
        }
        // Also delete all votes for this candidate
        await MeetingVote_1.MeetingVote.deleteMany({ meetingId: historyId, movieId });
        await meeting.populate('candidates', 'title poster');
        res.json(meeting);
    }
    catch (error) {
        console.error('Error removing candidate:', error);
        res.status(500).json({ error: error.message || 'Failed to remove candidate' });
    }
});
// Get candidates and votes for a meeting
router.get('/:id/candidates', auth_1.authenticate, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const meeting = await MovieHistory_1.MovieHistory.findById(historyId)
            .populate('candidates', 'title poster description genres');
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        // Get all votes for this meeting
        const votes = await MeetingVote_1.MeetingVote.find({ meetingId: historyId })
            .populate('userId', 'username displayName displayNameColor avatar')
            .populate('movieId', 'title');
        res.json({
            candidates: meeting.candidates || [],
            votes,
        });
    }
    catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch candidates' });
    }
});
// Vote on a candidate (yes/no with optional reason)
router.post('/:id/vote', auth_1.authenticate, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { movieId, voteType, reason } = req.body;
        if (!movieId || !voteType) {
            return res.status(400).json({ error: 'Movie ID and vote type required' });
        }
        if (voteType !== 'yes' && voteType !== 'no') {
            return res.status(400).json({ error: 'Vote type must be "yes" or "no"' });
        }
        const meeting = await MovieHistory_1.MovieHistory.findById(historyId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        // Check if movie is a candidate
        if (!meeting.candidates || !meeting.candidates.some((id) => id.toString() === movieId)) {
            return res.status(400).json({ error: 'Movie is not a candidate for this meeting' });
        }
        // Check if meeting is upcoming
        if (meeting.status !== 'upcoming' && new Date(meeting.watchedDate) <= new Date()) {
            return res.status(400).json({ error: 'Cannot vote on past meetings' });
        }
        // Remove existing vote if any
        await MeetingVote_1.MeetingVote.findOneAndDelete({
            userId: req.userId,
            movieId,
            meetingId: historyId,
        });
        // Create new vote
        const vote = new MeetingVote_1.MeetingVote({
            userId: req.userId,
            movieId,
            meetingId: historyId,
            voteType,
            reason: reason || undefined,
        });
        await vote.save();
        await vote.populate('userId', 'username displayName displayNameColor avatar');
        await vote.populate('movieId', 'title');
        res.status(201).json(vote);
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'You have already voted for this movie' });
        }
        console.error('Error submitting vote:', error);
        res.status(500).json({ error: error.message || 'Failed to submit vote' });
    }
});
// Get user's votes for a meeting
router.get('/:id/my-votes', auth_1.authenticate, async (req, res) => {
    try {
        const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const votes = await MeetingVote_1.MeetingVote.find({
            userId: req.userId,
            meetingId: historyId,
        }).populate('movieId', 'title poster');
        res.json(votes);
    }
    catch (error) {
        console.error('Error fetching user votes:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch votes' });
    }
});
exports.default = router;
