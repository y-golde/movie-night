"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const Movie_1 = require("../models/Movie");
const tmdb_1 = require("../services/tmdb");
const router = express_1.default.Router();
// Search movies via TMDB
router.get('/search', auth_1.authenticate, async (req, res) => {
    try {
        const query = req.query.q;
        const page = parseInt(req.query.page) || 1;
        if (!query || query.trim().length === 0) {
            return res.status(400).json({ error: 'Search query required' });
        }
        const results = await (0, tmdb_1.searchMovies)(query, page);
        // Format results for frontend
        const formattedResults = results.results.map((movie) => ({
            id: movie.id,
            title: movie.title,
            overview: movie.overview,
            poster: movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : null,
            releaseDate: movie.release_date,
            genreIds: movie.genre_ids,
        }));
        res.json({
            results: formattedResults,
            totalResults: results.total_results,
            totalPages: results.total_pages,
            page,
        });
    }
    catch (error) {
        console.error('Movie search error:', error);
        res.status(500).json({ error: error.message || 'Failed to search movies' });
    }
});
// Get movie details from TMDB
router.get('/tmdb/:tmdbId', auth_1.authenticate, async (req, res) => {
    try {
        const tmdbIdParam = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
        const tmdbId = parseInt(tmdbIdParam);
        if (isNaN(tmdbId)) {
            return res.status(400).json({ error: 'Invalid movie ID' });
        }
        const movieDetails = await (0, tmdb_1.getMovieDetails)(tmdbId);
        const formatted = (0, tmdb_1.formatMovieForDB)(movieDetails);
        res.json({
            ...formatted,
            tmdbId: movieDetails.id,
        });
    }
    catch (error) {
        console.error('Movie details error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch movie details' });
    }
});
// Add movie to database
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const { tmdbId } = req.body;
        if (!tmdbId) {
            return res.status(400).json({ error: 'TMDB ID required' });
        }
        // Check if movie already exists
        const existingMovie = await Movie_1.Movie.findOne({ tmdbId });
        if (existingMovie) {
            return res.json(existingMovie);
        }
        // Fetch details from TMDB
        const movieDetails = await (0, tmdb_1.getMovieDetails)(tmdbId);
        const movieData = (0, tmdb_1.formatMovieForDB)(movieDetails);
        // Save to database
        const movie = new Movie_1.Movie({
            ...movieData,
            addedBy: req.userId,
        });
        await movie.save();
        res.status(201).json(movie);
    }
    catch (error) {
        console.error('Add movie error:', error);
        res.status(500).json({ error: error.message || 'Failed to add movie' });
    }
});
// Get all movies from database
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const movies = await Movie_1.Movie.find().populate('addedBy', 'username').sort({ addedAt: -1 });
        res.json(movies);
    }
    catch (error) {
        console.error('Get movies error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch movies' });
    }
});
// Get movie by ID
router.get('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const movieId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const movie = await Movie_1.Movie.findById(movieId).populate('addedBy', 'username');
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        res.json(movie);
    }
    catch (error) {
        console.error('Get movie error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch movie' });
    }
});
exports.default = router;
