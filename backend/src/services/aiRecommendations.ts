import { User } from '../models/User';
import { Vote } from '../models/Vote';
import { MovieHistory } from '../models/MovieHistory';
import { Movie } from '../models/Movie';
import { searchMovies, getMovieDetails } from './tmdb';

interface RecommendationScore {
  movieId: string;
  tmdbId: number;
  score: number;
  reasons: string[];
}

/**
 * Simple recommendation algorithm based on:
 * 1. User's favorite genres
 * 2. Similarity to favorite movies
 * 3. Collaborative filtering (users with similar tastes)
 * 4. Avoiding movies with negative reviews
 */
export const generateRecommendations = async (userId: string, limit: number = 10): Promise<RecommendationScore[]> => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const scores: RecommendationScore[] = [];
  const userGenres = user.preferences.genres || [];
  const favoriteMovieIds = user.preferences.favoriteMovieIds || [];

  // Get user's voting history
  const userVotes = await Vote.find({ userId }).populate('movieId');
  const likedMovies = userVotes.filter((v) => v.voteType === 'like').map((v) => v.movieId);

  // Get user's reviews
  const userReviews = await MovieHistory.find({
    'ratings.userId': userId,
  }).populate('movieId');

  // Extract negative patterns from reviews
  const negativeKeywords: string[] = [];
  userReviews.forEach((review) => {
    const userRating = review.ratings.find((r) => r.userId.toString() === userId);
    if (userRating && userRating.rating <= 2) {
      // Extract keywords from negative comments
      const words = userRating.comment.toLowerCase().split(/\s+/);
      negativeKeywords.push(...words.filter((w) => w.length > 4));
    }
  });

  // Get all movies from database
  const allMovies = await Movie.find();

  // Score each movie
  for (const movie of allMovies) {
    let score = 0;
    const reasons: string[] = [];

    // Genre match (40% weight)
    const genreMatch = movie.genres.filter((g) => userGenres.includes(g)).length;
    if (genreMatch > 0) {
      score += genreMatch * 10;
      reasons.push(`Matches ${genreMatch} of your favorite genres`);
    }

    // Similarity to favorite movies (30% weight)
    if (favoriteMovieIds.includes(movie.tmdbId)) {
      score += 50;
      reasons.push('One of your favorite movies');
    }

    // Collaborative filtering (20% weight)
    // Find users with similar tastes
    const similarUsers = await findSimilarUsers(userId, userGenres);
    const similarUserVotes = await Vote.find({
      userId: { $in: similarUsers },
      movieId: movie._id,
      voteType: 'like',
    });
    if (similarUserVotes.length > 0) {
      score += similarUserVotes.length * 5;
      reasons.push(`Liked by ${similarUserVotes.length} users with similar taste`);
    }

    // Avoid negative patterns (penalty)
    const movieDescription = movie.description.toLowerCase();
    const hasNegativePattern = negativeKeywords.some((keyword) =>
      movieDescription.includes(keyword)
    );
    if (hasNegativePattern) {
      score -= 20;
      reasons.push('May contain elements you disliked');
    }

    // Avoid already watched movies
    const alreadyWatched = userReviews.some(
      (review) => review.movieIds && review.movieIds.some((m: any) => m.toString() === movie._id.toString())
    );
    if (alreadyWatched) {
      score = 0; // Don't recommend watched movies
    }

    // Avoid already voted movies
    const alreadyVoted = userVotes.some((v) => v.movieId.toString() === movie._id.toString());
    if (alreadyVoted) {
      score *= 0.5; // Reduce score but don't eliminate
    }

    if (score > 0) {
      scores.push({
        movieId: movie._id.toString(),
        tmdbId: movie.tmdbId,
        score,
        reasons,
      });
    }
  }

  // Sort by score and return top recommendations
  return scores.sort((a, b) => b.score - a.score).slice(0, limit);
};

/**
 * Find users with similar taste based on genres and voting patterns
 */
const findSimilarUsers = async (userId: string, userGenres: string[]): Promise<string[]> => {
  const similarUsers = await User.find({
    _id: { $ne: userId },
    'preferences.genres': { $in: userGenres },
  }).limit(10);

  return similarUsers.map((u) => u._id.toString());
};

/**
 * Generate recommendations for all users (weekly batch job)
 */
export const generateWeeklyRecommendations = async (): Promise<void> => {
  const users = await User.find();
  
  for (const user of users) {
    try {
      const recommendations = await generateRecommendations(user._id.toString(), 5);
      
      // Store recommendations (you could add a Recommendations model)
      console.log(`Generated ${recommendations.length} recommendations for user ${user.username}`);
      
      // In a real implementation, you'd store these in a database
      // and notify users or add them to the next voting cycle
    } catch (error) {
      console.error(`Failed to generate recommendations for user ${user._id}:`, error);
    }
  }
};
