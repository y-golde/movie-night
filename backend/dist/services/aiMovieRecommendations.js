"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIMovieSuggestions = void 0;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const mongoose_1 = __importDefault(require("mongoose"));
const MovieHistory_1 = require("../models/MovieHistory");
const Movie_1 = require("../models/Movie");
const MeetingVote_1 = require("../models/MeetingVote");
const tmdb_1 = require("./tmdb");
const groq = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY,
});
// Cache for AI suggestions (1 hour expiry)
const suggestionCache = new Map();
const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const generateAIMovieSuggestions = async (meetingId, limit = 15) => {
    try {
        // Check cache first
        const cached = suggestionCache.get(meetingId);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
            return cached.suggestions;
        }
        // Fetch all past meetings with reviews
        const now = new Date();
        const pastMeetings = await MovieHistory_1.MovieHistory.find({
            $or: [
                { status: 'watched' },
                { watchedDate: { $lt: now } }
            ],
            movieIds: { $exists: true, $ne: [] } // Only meetings with movies
        })
            .populate('movieIds', 'title poster description genres tmdbId')
            .populate('ratings.userId', 'username displayName')
            .populate('ratings.movieId', 'title tmdbId')
            .sort({ watchedDate: -1 });
        // Fetch all voting data from past meetings (candidates that were voted on)
        const allVotes = await MeetingVote_1.MeetingVote.find({
            meetingId: { $in: pastMeetings.map(m => m._id) }
        })
            .populate('movieId', 'title')
            .populate('userId', 'username displayName')
            .sort({ createdAt: -1 });
        // If no past meetings, provide a default prompt
        if (pastMeetings.length === 0) {
            const prompt = `You are a movie recommendation expert. Generate ${limit} diverse movie recommendations for a movie night group.

Since this is a new group with no viewing history yet, suggest a variety of:
- Popular and critically acclaimed films
- Different genres (action, comedy, drama, thriller, sci-fi, etc.)
- Different eras (classics and modern films)
- Mix of well-known and lesser-known gems

For each movie, provide:
- The exact movie title (must be searchable on TMDB)
- A brief explanation (2-3 sentences) of why this movie is a good choice

Return ONLY valid JSON in this exact format:
{
  "movies": [
    {
      "title": "Exact Movie Title",
      "reason": "Brief explanation of why this movie is a good choice..."
    }
  ]
}`;
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: 'You are a movie recommendation expert. Always respond with valid JSON only.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 2000,
                response_format: { type: 'json_object' },
            });
            const responseContent = completion.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error('No response from AI');
            }
            const aiResponse = JSON.parse(responseContent);
            if (!aiResponse.movies || !Array.isArray(aiResponse.movies)) {
                throw new Error('Invalid response format from AI');
            }
            // Fetch movie details from TMDB
            const suggestionsWithDetails = await Promise.all(aiResponse.movies.slice(0, limit).map(async (suggestion) => {
                try {
                    const searchResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(suggestion.title)}`);
                    const searchData = await searchResponse.json();
                    if (!searchData.results || searchData.results.length === 0) {
                        return null;
                    }
                    const tmdbMovie = searchData.results[0];
                    const movieDetails = await (0, tmdb_1.getMovieDetails)(tmdbMovie.id);
                    let movie = await Movie_1.Movie.findOne({ tmdbId: movieDetails.id });
                    if (!movie) {
                        const movieData = (0, tmdb_1.formatMovieForDB)(movieDetails);
                        movie = new Movie_1.Movie({
                            ...movieData,
                            addedBy: new mongoose_1.default.Types.ObjectId('000000000000000000000000'),
                        });
                        await movie.save();
                    }
                    return {
                        movieId: movie._id.toString(),
                        tmdbId: movieDetails.id,
                        title: movieDetails.title,
                        poster: movieDetails.poster_path
                            ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`
                            : null,
                        description: movieDetails.overview,
                        genres: movieDetails.genres.map((g) => g.name),
                        releaseDate: movieDetails.release_date,
                        reason: suggestion.reason,
                    };
                }
                catch (error) {
                    console.error(`Error fetching details for ${suggestion.title}:`, error);
                    return null;
                }
            }));
            const validSuggestions = suggestionsWithDetails.filter((s) => s !== null);
            suggestionCache.set(meetingId, {
                suggestions: validSuggestions,
                timestamp: Date.now(),
            });
            return validSuggestions;
        }
        // Extract data for prompt
        const watchedMovies = [];
        const movieMap = new Map();
        // Aggregate data by movie
        for (const meeting of pastMeetings) {
            if (!meeting.movieIds || meeting.movieIds.length === 0)
                continue;
            for (const movie of meeting.movieIds) {
                const movieId = movie._id.toString();
                if (!movieMap.has(movieId)) {
                    movieMap.set(movieId, {
                        title: movie.title,
                        genres: movie.genres || [],
                        ratings: [],
                        reviews: [],
                    });
                }
                const movieData = movieMap.get(movieId);
                // Get reviews for this specific movie from this meeting
                const movieReviews = meeting.ratings.filter((r) => r.movieId && r.movieId._id.toString() === movieId);
                for (const review of movieReviews) {
                    movieData.ratings.push(review.rating);
                    movieData.reviews.push({
                        rating: review.rating,
                        comment: review.comment,
                        user: review.userId.displayName || review.userId.username,
                    });
                }
            }
        }
        // Convert to array and calculate averages
        for (const [movieId, data] of movieMap.entries()) {
            const avgRating = data.ratings.length > 0
                ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
                : 0;
            watchedMovies.push({
                title: data.title,
                genres: data.genres,
                averageRating: avgRating,
                reviewCount: data.reviews.length,
                reviews: data.reviews.slice(0, 10), // Limit to 10 most recent reviews per movie
            });
        }
        // Build prompt
        const genreFrequency = {};
        watchedMovies.forEach(movie => {
            movie.genres.forEach(genre => {
                genreFrequency[genre] = (genreFrequency[genre] || 0) + 1;
            });
        });
        const topGenres = Object.entries(genreFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([genre]) => genre);
        const highRatedMovies = watchedMovies
            .filter(m => m.averageRating >= 4)
            .slice(0, 10)
            .map(m => m.title);
        const lowRatedMovies = watchedMovies
            .filter(m => m.averageRating <= 2)
            .slice(0, 5)
            .map(m => m.title);
        // Sample review comments (positive and negative)
        const positiveComments = watchedMovies
            .flatMap(m => m.reviews.filter(r => r.rating >= 4).map(r => r.comment))
            .slice(0, 5);
        const negativeComments = watchedMovies
            .flatMap(m => m.reviews.filter(r => r.rating <= 2).map(r => r.comment))
            .slice(0, 5);
        // Extract voting patterns
        const yesVotes = allVotes.filter(v => v.voteType === 'yes');
        const noVotes = allVotes.filter(v => v.voteType === 'no');
        const yesVoteReasons = yesVotes.filter(v => v.reason).map(v => v.reason).slice(0, 5);
        const noVoteReasons = noVotes.filter(v => v.reason).map(v => v.reason).slice(0, 5);
        const yesVotedMovies = [...new Set(yesVotes.map(v => v.movieId.title))].slice(0, 10);
        const noVotedMovies = [...new Set(noVotes.map(v => v.movieId.title))].slice(0, 10);
        const prompt = `You are a movie recommendation expert analyzing a movie night group's viewing history, reviews, and voting preferences.

GROUP'S MOVIE HISTORY:
- Total movies watched: ${watchedMovies.length}
- Top genres: ${topGenres.join(', ') || 'None yet'}
- Highly rated movies (4+ stars): ${highRatedMovies.length > 0 ? highRatedMovies.join(', ') : 'None yet'}
- Low rated movies (2 stars or less): ${lowRatedMovies.length > 0 ? lowRatedMovies.join(', ') : 'None yet'}

REVIEW PATTERNS:
${positiveComments.length > 0 ? `Positive review themes:\n${positiveComments.map((c, i) => `${i + 1}. "${c.substring(0, 100)}..."`).join('\n')}` : 'No positive reviews yet'}
${negativeComments.length > 0 ? `\nNegative review themes:\n${negativeComments.map((c, i) => `${i + 1}. "${c.substring(0, 100)}..."`).join('\n')}` : '\nNo negative reviews yet'}

VOTING PATTERNS:
${yesVotes.length > 0 ? `Movies they voted YES on (${yesVotes.length} votes): ${yesVotedMovies.join(', ') || 'None'}` : 'No yes votes yet'}
${yesVoteReasons.length > 0 ? `\nReasons for YES votes:\n${yesVoteReasons.map((r, i) => `${i + 1}. "${r}"`).join('\n')}` : ''}
${noVotes.length > 0 ? `\nMovies they voted NO on (${noVotes.length} votes): ${noVotedMovies.join(', ') || 'None'}` : '\nNo no votes yet'}
${noVoteReasons.length > 0 ? `\nReasons for NO votes:\n${noVoteReasons.map((r, i) => `${i + 1}. "${r}"`).join('\n')}` : ''}

TASK:
Generate ${limit} diverse movie recommendations for this group. Consider:
1. Movies similar to their highly-rated films
2. Movies in genres they enjoy
3. Movies that avoid themes/styles they disliked
4. Movies similar to ones they voted YES on
5. Avoid movies they voted NO on (unless reasons were specific and don't apply)
6. Variety in genres, eras, and styles
7. Mix of popular and lesser-known films
8. Avoid movies they've already watched: ${watchedMovies.map(m => m.title).join(', ')}

For each movie, provide:
- The exact movie title (must be searchable on TMDB)
- A brief explanation (2-3 sentences) of why this movie fits the group's preferences, referencing their voting patterns and reviews

Return ONLY valid JSON in this exact format:
{
  "movies": [
    {
      "title": "Exact Movie Title",
      "reason": "Brief explanation of why this movie fits the group..."
    }
  ]
}

Be creative but practical. Focus on quality recommendations that match their taste.`;
        // Call Groq API
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'You are a movie recommendation expert. Always respond with valid JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        });
        const responseContent = completion.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error('No response from AI');
        }
        // Parse JSON response
        let aiResponse;
        try {
            aiResponse = JSON.parse(responseContent);
        }
        catch (error) {
            console.error('Failed to parse AI response:', responseContent);
            throw new Error('Invalid JSON response from AI');
        }
        if (!aiResponse.movies || !Array.isArray(aiResponse.movies)) {
            throw new Error('Invalid response format from AI');
        }
        // Fetch movie details from TMDB for each suggestion
        const suggestionsWithDetails = await Promise.all(aiResponse.movies.slice(0, limit).map(async (suggestion) => {
            try {
                // Search for movie on TMDB
                const searchResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(suggestion.title)}`);
                const searchData = await searchResponse.json();
                if (!searchData.results || searchData.results.length === 0) {
                    console.warn(`Movie not found on TMDB: ${suggestion.title}`);
                    return null;
                }
                // Get first result (most likely match)
                const tmdbMovie = searchData.results[0];
                const movieDetails = await (0, tmdb_1.getMovieDetails)(tmdbMovie.id);
                // Check if movie already exists in database
                let movie = await Movie_1.Movie.findOne({ tmdbId: movieDetails.id });
                if (!movie) {
                    // Create movie in database
                    const movieData = (0, tmdb_1.formatMovieForDB)(movieDetails);
                    // Use a default admin user ID or the first user (you may want to pass userId from request)
                    // For now, we'll create without addedBy and handle it in the route
                    movie = new Movie_1.Movie({
                        ...movieData,
                        addedBy: new mongoose_1.default.Types.ObjectId('000000000000000000000000'), // Placeholder
                    });
                    await movie.save();
                }
                return {
                    movieId: movie._id.toString(),
                    tmdbId: movieDetails.id,
                    title: movieDetails.title,
                    poster: movieDetails.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`
                        : null,
                    description: movieDetails.overview,
                    genres: movieDetails.genres.map((g) => g.name),
                    releaseDate: movieDetails.release_date,
                    reason: suggestion.reason, // AI-generated explanation
                };
            }
            catch (error) {
                console.error(`Error fetching details for ${suggestion.title}:`, error);
                return null;
            }
        }));
        // Filter out null results
        const validSuggestions = suggestionsWithDetails.filter((s) => s !== null);
        // Cache results
        suggestionCache.set(meetingId, {
            suggestions: validSuggestions,
            timestamp: Date.now(),
        });
        return validSuggestions;
    }
    catch (error) {
        console.error('Error generating AI suggestions:', error);
        throw new Error(`Failed to generate AI suggestions: ${error.message}`);
    }
};
exports.generateAIMovieSuggestions = generateAIMovieSuggestions;
