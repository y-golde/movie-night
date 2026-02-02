import express, { Request, Response } from 'express';
import { User } from '../models/User';
import { MovieHistory } from '../models/MovieHistory';
import { hashPattern, verifyPattern, validatePattern } from '../services/patternAuth';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Check if username exists and has pattern set
router.post('/check-username', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Case-insensitive username lookup
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      hasPattern: !!user.patternHash,
      avatar: user.avatar,
    });
  } catch (error: any) {
    console.error('Check username error:', error);
    res.status(500).json({ error: error.message || 'Failed to check username' });
  }
});

// Set pattern and display name for user (first time)
router.post('/set-pattern', async (req: Request, res: Response) => {
  try {
    const { username, pattern, confirmPattern, displayName, displayNameColor, avatar } = req.body;

    if (!username || !pattern || !confirmPattern) {
      return res.status(400).json({ error: 'Username, pattern, and confirmation required' });
    }

    if (pattern !== confirmPattern) {
      return res.status(400).json({ error: 'Patterns do not match' });
    }

    if (!validatePattern(pattern)) {
      return res.status(400).json({ error: 'Invalid pattern. Must connect at least 4 dots.' });
    }

    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.patternHash) {
      return res.status(400).json({ error: 'Pattern already set. Use login instead.' });
    }

    user.patternHash = await hashPattern(pattern);
    if (displayName && displayName.trim()) {
      user.displayName = displayName.trim();
    }
    if (displayNameColor) {
      user.displayNameColor = displayNameColor;
    }
    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    const token = generateToken(user._id.toString());
    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        displayNameColor: user.displayNameColor,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        needsOnboarding: !user.preferences.genres.length && !user.preferences.favoriteMovieIds.length,
      },
    });
  } catch (error: any) {
    console.error('Set pattern error:', error);
    res.status(500).json({ error: error.message || 'Failed to set pattern' });
  }
});

// Login with pattern
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, pattern } = req.body;

    if (!username || !pattern) {
      return res.status(400).json({ error: 'Username and pattern required' });
    }

    // Case-insensitive username lookup
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.patternHash) {
      return res.status(400).json({ error: 'Pattern not set. Please set your pattern first.' });
    }

    const isValid = await user.comparePattern(pattern);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid pattern' });
    }

    const token = generateToken(user._id.toString());
    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        displayNameColor: user.displayNameColor,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        needsOnboarding: !user.preferences.genres.length && !user.preferences.favoriteMovieIds.length,
      },
    });
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-patternHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      displayNameColor: user.displayNameColor,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
      preferences: user.preferences,
      needsOnboarding: !user.preferences.genres.length && !user.preferences.favoriteMovieIds.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user avatar
router.put('/avatar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { avatar } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.avatar = avatar;
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      avatar: user.avatar,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user preferences
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { preferences, avatar } = req.body;
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (preferences) {
      if (preferences.genres) {
        user.preferences.genres = preferences.genres;
      }
      if (preferences.favoriteMovieIds) {
        user.preferences.favoriteMovieIds = preferences.favoriteMovieIds;
      }
      if (preferences.optionalText !== undefined) {
        user.preferences.optionalText = preferences.optionalText;
      }
    }

    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      preferences: user.preferences,
      avatar: user.avatar,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (public info only)
router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({})
      .select('-patternHash')
      .sort({ createdAt: -1 });
    
    // Fetch movie details for favorite movies and last review
    const usersWithMovies = await Promise.all(
      users.map(async (user) => {
        const favoriteMovies = [];
        if (user.preferences?.favoriteMovieIds && user.preferences.favoriteMovieIds.length > 0) {
          try {
            const { getMovieDetails, formatMovieForDB } = await import('../services/tmdb');
            const moviePromises = user.preferences.favoriteMovieIds.slice(0, 5).map(async (tmdbId: number) => {
              try {
                const movieDetails = await getMovieDetails(tmdbId);
                const formatted = formatMovieForDB(movieDetails);
                return {
                  tmdbId: movieDetails.id,
                  title: formatted.title,
                  poster: formatted.poster,
                };
              } catch (error) {
                console.error(`Error fetching movie ${tmdbId}:`, error);
                return null;
              }
            });
            const movies = await Promise.all(moviePromises);
            favoriteMovies.push(...movies.filter(m => m !== null));
          } catch (error) {
            console.error('Error fetching favorite movies:', error);
          }
        }

        // Find last review by this user
        let lastReview = null;
        try {
          const histories = await MovieHistory.find({
            'ratings.userId': user._id,
            status: 'watched',
          })
            .populate('ratings.movieId', 'title poster')
            .populate('movieIds', 'title poster')
            .sort({ watchedDate: -1 })
            .limit(10);

          // Find the most recent review with a movieId
          for (const history of histories) {
            const userRatings = history.ratings.filter(
              (r: any) => r.userId.toString() === user._id.toString() && r.movieId
            );
            if (userRatings.length > 0) {
              const review = userRatings[0] as any;
              const movie = review.movieId;
              if (movie) {
                lastReview = {
                  movie: {
                    _id: movie._id,
                    title: movie.title,
                    poster: movie.poster,
                  },
                  rating: review.rating,
                  comment: review.comment,
                  watchedDate: history.watchedDate,
                };
                break;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching last review for user ${user._id}:`, error);
        }

        return {
          id: user._id,
          username: user.username,
          displayName: user.displayName,
          displayNameColor: user.displayNameColor,
          avatar: user.avatar,
          preferences: {
            genres: user.preferences?.genres || [],
            favoriteMovieIds: user.preferences?.favoriteMovieIds || [],
            optionalText: user.preferences?.optionalText,
          },
          favoriteMovies,
          lastReview,
          createdAt: user.createdAt,
        };
      })
    );

    res.json(usersWithMovies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
