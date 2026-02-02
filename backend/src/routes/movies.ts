import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Movie } from '../models/Movie';
import { searchMovies, getMovieDetails, formatMovieForDB } from '../services/tmdb';

const router = express.Router();

// Search movies via TMDB
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const results = await searchMovies(query, page);
    
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
  } catch (error: any) {
    console.error('Movie search error:', error);
    res.status(500).json({ error: error.message || 'Failed to search movies' });
  }
});

// Get movie details from TMDB
router.get('/tmdb/:tmdbId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tmdbIdParam = Array.isArray(req.params.tmdbId) ? req.params.tmdbId[0] : req.params.tmdbId;
    const tmdbId = parseInt(tmdbIdParam);

    if (isNaN(tmdbId)) {
      return res.status(400).json({ error: 'Invalid movie ID' });
    }

    const movieDetails = await getMovieDetails(tmdbId);
    const formatted = formatMovieForDB(movieDetails);

    res.json({
      ...formatted,
      tmdbId: movieDetails.id,
    });
  } catch (error: any) {
    console.error('Movie details error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch movie details' });
  }
});

// Add movie to database
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { tmdbId } = req.body;

    if (!tmdbId) {
      return res.status(400).json({ error: 'TMDB ID required' });
    }

    // Check if movie already exists
    const existingMovie = await Movie.findOne({ tmdbId });
    if (existingMovie) {
      return res.json(existingMovie);
    }

    // Fetch details from TMDB
    const movieDetails = await getMovieDetails(tmdbId);
    const movieData = formatMovieForDB(movieDetails);

    // Save to database
    const movie = new Movie({
      ...movieData,
      addedBy: req.userId,
    });

    await movie.save();
    res.status(201).json(movie);
  } catch (error: any) {
    console.error('Add movie error:', error);
    res.status(500).json({ error: error.message || 'Failed to add movie' });
  }
});

// Get all movies from database
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const movies = await Movie.find().populate('addedBy', 'username').sort({ addedAt: -1 });
    res.json(movies);
  } catch (error: any) {
    console.error('Get movies error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch movies' });
  }
});

// Get movie by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const movieId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const movie = await Movie.findById(movieId).populate('addedBy', 'username');
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json(movie);
  } catch (error: any) {
    console.error('Get movie error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch movie' });
  }
});

export default router;
