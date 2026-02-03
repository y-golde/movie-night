import express, { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Groq from 'groq-sdk';
import { authenticate, AuthRequest } from '../middleware/auth';
import { verifyAdminPassword } from '../middleware/adminPassword';
import { MovieHistory } from '../models/MovieHistory';
import { Movie } from '../models/Movie';
import { MeetingVote } from '../models/MeetingVote';
import { generateAIMovieSuggestions } from '../services/aiMovieRecommendations';
import { getMovieDetails, formatMovieForDB } from '../services/tmdb';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// AI recommendations are not cached - always generate fresh recommendations based on current votes

const router = express.Router();

// Get all movie history (past and upcoming meetings)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const history = await MovieHistory.find()
      .populate('movieIds', 'title poster trailer')
      .populate('candidates', 'title poster')
      .populate('hostId', 'username displayName displayNameColor avatar')
      .populate('ratings.userId', 'username displayName displayNameColor avatar')
      .populate('ratings.movieId', 'title poster')
      .populate('gatheringRatings.userId', 'username displayName displayNameColor avatar')
      .sort({ watchedDate: -1 });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create meeting (admin password required) - movies are optional
const createPastMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { movieIds, watchedDate, location, theme } = req.body;

    if (!watchedDate) {
      return res.status(400).json({ error: 'Meeting date required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // If movieIds provided, verify they exist
    if (movieIds && Array.isArray(movieIds) && movieIds.length > 0) {
      const movies = await Movie.find({ _id: { $in: movieIds } });
      if (movies.length !== movieIds.length) {
        return res.status(404).json({ error: 'One or more movies not found' });
      }
    }

    const userIdObjectId = new mongoose.Types.ObjectId(req.userId);
    const meetingDate = new Date(watchedDate);
    const isUpcoming = meetingDate > new Date();

    const history = new MovieHistory({
      movieIds: movieIds && movieIds.length > 0 ? movieIds : [],
      watchedDate: meetingDate,
      hostId: userIdObjectId,
      location,
      theme,
      status: isUpcoming ? 'upcoming' : 'watched',
    });

    await history.save();
    if (history.movieIds.length > 0) {
      await history.populate('movieIds', 'title poster');
    }
    await history.populate('hostId', 'username displayName displayNameColor avatar');

    res.status(201).json(history);
  } catch (error: any) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: error.message });
  }
};

router.post('/', authenticate, verifyAdminPassword, createPastMeeting);

// Update meeting (admin password required)
router.put('/:id', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { movieIds, watchedDate, location, theme } = req.body;

    const history = await MovieHistory.findById(historyId);
    if (!history) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // If movieIds provided, verify they exist
    if (movieIds && Array.isArray(movieIds) && movieIds.length > 0) {
      const movies = await Movie.find({ _id: { $in: movieIds } });
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
    if (theme !== undefined) {
      history.theme = theme;
    }

    await history.save();
    if (history.movieIds.length > 0) {
      await history.populate('movieIds', 'title poster');
    }
    await history.populate('hostId', 'username displayName displayNameColor avatar');

    res.json(history);
  } catch (error: any) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add movie rating
router.post('/:id/rating', authenticate, async (req: AuthRequest, res: Response) => {
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

    const history = await MovieHistory.findById(historyId);
    if (!history) {
      return res.status(404).json({ error: 'Movie history not found' });
    }

    const userId = req.userId; // TypeScript now knows this is defined
    const userIdObjectId = new mongoose.Types.ObjectId(userId);
    const movieIdObjectId = movieId ? new mongoose.Types.ObjectId(movieId) : undefined;

    // Remove existing rating from this user for this specific movie (or any movie if movieId not provided)
    history.ratings = history.ratings.filter(
      (r: any) => {
        if (movieId) {
          return !(r.userId.toString() === userId && r.movieId && r.movieId.toString() === movieId);
        }
        return r.userId.toString() !== userId;
      }
    );

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add gathering rating
router.post('/:id/gathering-rating', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, comment } = req.body;
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const history = await MovieHistory.findById(historyId);
    if (!history) {
      return res.status(404).json({ error: 'Movie history not found' });
    }

    const userId = req.userId; // TypeScript now knows this is defined
    const userIdObjectId = new mongoose.Types.ObjectId(userId);

    // Remove existing gathering rating from this user if any
    history.gatheringRatings = history.gatheringRatings.filter(
      (r: any) => r.userId.toString() !== userId
    );

    // Add new gathering rating
    history.gatheringRatings.push({
      userId: userIdObjectId,
      rating,
      comment: comment || undefined,
    });

    await history.save();
    await history.populate('gatheringRatings.userId', 'username displayName displayNameColor avatar');

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete meeting (admin password required)
router.delete('/:id', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const history = await MovieHistory.findById(historyId);

    if (!history) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    await MovieHistory.findByIdAndDelete(historyId);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI movie suggestions for a meeting (admin password required)
router.post('/:id/ai-suggestions', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const limit = parseInt(req.query.limit as string) || 7;

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const suggestions = await generateAIMovieSuggestions(historyId, limit);

    // Automatically add suggestions as candidates
    const suggestionMovieIds = suggestions.map((s: any) => s.movieId);
    if (!meeting.candidates) {
      meeting.candidates = [];
    }
    // Add new suggestions that aren't already candidates
    for (const movieId of suggestionMovieIds) {
      if (!meeting.candidates.some((id: any) => id.toString() === movieId)) {
        meeting.candidates.push(new mongoose.Types.ObjectId(movieId));
      }
    }
    await meeting.save();

    res.json({ suggestions });
  } catch (error: any) {
    console.error('Error generating AI suggestions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI suggestions' });
  }
});

// Get cached AI suggestions for a meeting (admin password required)
router.get('/:id/ai-suggestions', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // This will return cached if available, or generate new ones
    const suggestions = await generateAIMovieSuggestions(historyId, 7);
    res.json({ suggestions });
  } catch (error: any) {
    console.error('Error fetching AI suggestions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch AI suggestions' });
  }
});

// Get AI recommendation for which candidate to select based on voting cycle votes and comments (admin password required)
// Note: Not cached - always generates fresh recommendations based on current votes
router.post('/:id/ai-recommendation', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const meeting = await MovieHistory.findById(historyId)
      .populate('candidates', 'title poster description genres tmdbId');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!meeting.candidates || meeting.candidates.length === 0) {
      return res.status(400).json({ error: 'No candidates available for recommendation' });
    }

    // Get all votes for this meeting
    const votes = await MeetingVote.find({ meetingId: historyId })
      .populate('userId', 'username displayName')
      .populate('movieId', 'title');

    if (votes.length === 0) {
      return res.status(400).json({ error: 'No votes available yet. Need votes to generate recommendation.' });
    }

    // Get the meeting theme
    const meetingTheme = meeting.theme;

    // Build data for each candidate - ONLY include candidates with at least one vote
    const candidatesData = (meeting.candidates as any[])
      .map((candidate) => {
        const candidateId = candidate._id.toString();
        const candidateVotes = votes.filter((v: any) => {
          const vMovieId = v.movieId?._id || v.movieId;
          return vMovieId?.toString() === candidateId;
        });

        // Skip candidates with no votes
        if (candidateVotes.length === 0) {
          return null;
        }

        const yesVotes = candidateVotes.filter(v => v.voteType === 'yes');
        const noVotes = candidateVotes.filter(v => v.voteType === 'no');
        const yesVoteReasons = yesVotes.filter(v => v.reason).map(v => v.reason);
        const noVoteReasons = noVotes.filter(v => v.reason).map(v => v.reason);

        const voteDetails = candidateVotes.map((v: any) => ({
          user: (v.userId as any).displayName || (v.userId as any).username,
          vote: v.voteType,
          reason: v.reason,
        }));

        return {
          title: candidate.title,
          description: candidate.description || '',
          genres: candidate.genres || [],
          yesVotes: yesVotes.length,
          noVotes: noVotes.length,
          totalVotes: candidateVotes.length,
          netVotes: yesVotes.length - noVotes.length, // Add net votes for clarity
          yesVoteReasons,
          noVoteReasons,
          voteDetails,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null); // Remove null entries

    // Log candidates for debugging
    console.log('AI Recommendation - Candidates (with votes only):', candidatesData.map(c => ({
      title: c.title,
      yesVotes: c.yesVotes,
      noVotes: c.noVotes,
      netVotes: c.netVotes,
      totalVotes: c.totalVotes
    })));

    if (candidatesData.length === 0) {
      return res.status(400).json({ error: 'No candidates with votes available for recommendation. Candidates need at least one vote to be considered.' });
    }

    const themeSection = meetingTheme
      ? `\n\nMEETING THEME:\nThe group has requested movies that fit this theme: "${meetingTheme}"\nConsider this when making your recommendation.`
      : '';

    // Note: Only candidates with at least one vote are included in candidatesData

    const prompt = `You are a movie recommendation expert. Based on the voting patterns and comments from a movie night group, recommend which candidate movie should be selected for this meeting.

CANDIDATES AND THEIR VOTES (you MUST consider ALL candidates listed below):
${candidatesData.map((c, i) => `
${i + 1}. "${c.title}"
   - Description: ${c.description || 'No description available'}
   - Genres: ${c.genres.join(', ') || 'Unknown'}
   - YES votes: ${c.yesVotes}
   - NO votes: ${c.noVotes}
   - Net votes (YES - NO): ${c.netVotes}
   - Total votes: ${c.totalVotes}
   ${c.yesVoteReasons.length > 0 ? `\n   Reasons for YES votes:\n${c.yesVoteReasons.map((r, j) => `     ${j + 1}. "${r}"`).join('\n')}` : ''}
   ${c.noVoteReasons.length > 0 ? `\n   Reasons for NO votes:\n${c.noVoteReasons.map((r, j) => `     ${j + 1}. "${r}"`).join('\n')}` : ''}
   ${c.voteDetails.length > 0 ? `\n   All votes:\n${c.voteDetails.map((v, j) => `     ${j + 1}. ${v.user}: ${v.vote.toUpperCase()}${v.reason ? ` - "${v.reason}"` : ''}`).join('\n')}` : ''}
`).join('\n')}${themeSection}

TASK:
You MUST analyze and consider EVERY candidate listed above. Then recommend ONE candidate that:
1. Fits the meeting theme if provided (THIS IS THE PRIMARY CONSIDERATION - theme alignment trumps vote counts)
2. Does NOT have strong negative feedback (avoid movies with comments like "I really don't want to watch this" or "watch anything else")
3. Has positive or neutral net support (YES votes minus NO votes) - prefer movies with net votes >= 0
4. Would be most enjoyable for the group based on their comments

CRITICAL RULES (in priority order):
1. Theme fit is THE PRIMARY factor when a theme is provided - a movie that fits the theme is better than one that doesn't, even with better votes
2. AVOID movies with strong negative feedback - if a movie has a NO vote with a comment like "I really don't want to watch this" or "watch anything else", avoid it unless it's the ONLY option that fits the theme
3. Among movies that fit the theme well AND don't have strong negative feedback, choose the one with the best net votes (YES - NO)
4. Net votes matter: 1 YES + 0 NO = better than 1 YES + 1 NO, BUT theme fit and avoiding negative feedback are more important
5. A movie with perfect theme fit, neutral votes (net: 0), and no strong negative feedback is better than:
   - A movie with better votes but poor theme fit
   - A movie with good theme fit but strong negative feedback

DECISION PROCESS:
- First, filter to movies that fit the theme well
- Then, eliminate movies with strong negative feedback (comments expressing strong dislike)
- Finally, among remaining movies, choose the one with the best net votes
- You MUST mention and consider ALL candidates in your analysis

Return ONLY valid JSON in this exact format:
{
  "recommendedMovie": "Exact Movie Title",
  "reason": "Detailed explanation (5-7 sentences) that MUST:
   1. List ALL candidates you considered (mention each by name)
   2. Compare the vote counts (YES/NO/net votes) for each candidate
   3. Identify which movies fit the theme (if theme provided) - be specific about theme alignment
   4. Identify any movies with strong negative feedback that should be avoided
   5. Explain why the chosen movie fits the theme best AND doesn't have strong negative feedback
   6. Address why you chose this movie over alternatives:
      - If a candidate has better net votes but doesn't fit the theme, explain why theme fit matters more
      - If a candidate fits the theme but has strong negative feedback, explain why you avoided it
   7. Reference specific votes and comments when relevant, especially negative ones
   
   Example structure: 'I considered [Movie A], [Movie B], and [Movie C]. [Movie A] has X YES and Y NO votes (net: Z) with a comment "[negative comment]", [Movie B] has... [Movie A] fits the theme because... However, [Movie A] has strong negative feedback ("I really don't want to watch this"), so I'm avoiding it. [Movie B] fits the theme well and has neutral votes without strong negative feedback. Therefore I recommend [Movie B].'"
}`;

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
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    let aiResponse: { recommendedMovie: string; reason: string };
    try {
      aiResponse = JSON.parse(responseContent);
    } catch (error) {
      console.error('Failed to parse AI response:', responseContent);
      throw new Error('Invalid JSON response from AI');
    }

    if (!aiResponse.recommendedMovie || !aiResponse.reason) {
      throw new Error('Invalid response format from AI');
    }

    // Log the AI's recommendation for debugging
    console.log('AI Recommended Movie (JSON):', aiResponse.recommendedMovie);
    console.log('AI Reason:', aiResponse.reason);

    // Extract movie mentioned in reason text (look for "recommend" or "choose" patterns)
    const reasonLower = aiResponse.reason.toLowerCase();
    const recommendPatterns = [
      /(?:recommend|choose|select|pick)\s+['"]([^'"]+)['"]/i,
      /(?:recommend|choose|select|pick)\s+([A-Z][^.!?]+?)(?:\.|$)/i,
      /therefore,\s+i\s+(?:recommend|choose|select|pick)\s+['"]([^'"]+)['"]/i,
    ];

    let movieFromReason: string | null = null;
    for (const pattern of recommendPatterns) {
      const match = aiResponse.reason.match(pattern);
      if (match && match[1]) {
        movieFromReason = match[1].trim();
        break;
      }
    }

    // Check if there's a mismatch between JSON field and reason text
    let finalRecommendedMovie = aiResponse.recommendedMovie.trim();
    if (movieFromReason && movieFromReason.toLowerCase() !== finalRecommendedMovie.toLowerCase()) {
      console.warn(`Mismatch detected! JSON says "${finalRecommendedMovie}" but reason says "${movieFromReason}"`);
      console.warn('Using movie from reason text as it likely reflects the AI\'s actual intent');

      // Try to find the movie mentioned in reason
      const candidateFromReason = (meeting.candidates as any[]).find(
        (c: any) => c.title.trim().toLowerCase() === movieFromReason!.toLowerCase()
      );

      if (candidateFromReason) {
        finalRecommendedMovie = candidateFromReason.title;
        console.log('Using movie from reason:', finalRecommendedMovie);
      } else {
        console.warn(`Movie "${movieFromReason}" from reason not found in candidates, using JSON value`);
      }
    }

    // Find the recommended candidate (case-insensitive, trimmed)
    const recommendedCandidate = (meeting.candidates as any[]).find(
      (c: any) => c.title.trim().toLowerCase() === finalRecommendedMovie.toLowerCase()
    );

    if (!recommendedCandidate) {
      console.error('Available candidates:', (meeting.candidates as any[]).map(c => c.title));
      throw new Error(`Recommended movie "${finalRecommendedMovie}" not found in candidates`);
    }

    console.log('Final matched candidate:', recommendedCandidate.title);

    res.json({
      recommendation: {
        movieId: recommendedCandidate._id.toString(),
        title: recommendedCandidate.title,
        poster: recommendedCandidate.poster || null,
        description: recommendedCandidate.description || '',
        reason: aiResponse.reason,
      },
    });
  } catch (error: any) {
    console.error('Error generating AI recommendation:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI recommendation' });
  }
});

// Get all reviews for a specific movie across all meetings (admin password required)
router.get('/reviews/:movieId', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const movieId = Array.isArray(req.params.movieId) ? req.params.movieId[0] : req.params.movieId;

    // Find all meetings that have reviews for this movie
    const meetings = await MovieHistory.find({
      'ratings.movieId': new mongoose.Types.ObjectId(movieId),
    })
      .populate('ratings.userId', 'username displayName displayNameColor avatar')
      .populate('ratings.movieId', 'title poster')
      .populate('movieIds', 'title poster')
      .sort({ watchedDate: -1 });

    // Extract reviews for this specific movie
    const reviews: any[] = [];
    for (const meeting of meetings) {
      const movieReviews = meeting.ratings.filter((r: any) =>
        r.movieId && (r.movieId as any)._id && (r.movieId as any)._id.toString() === movieId
      );

      for (const review of movieReviews) {
        const reviewDoc = review as any;
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
  } catch (error: any) {
    console.error('Error fetching movie reviews:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch reviews' });
  }
});

// User suggestion route (limit 2 per user, no admin password required)
router.post('/:id/suggest', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { tmdbId } = req.body;

    if (!tmdbId) {
      return res.status(400).json({ error: 'TMDB movie ID required' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check user's suggestion count (limit 2 per user)
    const userSuggestions = (meeting.suggestions || []).filter(
      (s: any) => s.userId.toString() === req.userId
    );
    if (userSuggestions.length >= 2) {
      return res.status(400).json({ error: 'You have already suggested 2 movies for this meeting' });
    }

    // Get or create movie from TMDB
    let movie = await Movie.findOne({ tmdbId });
    if (!movie) {
      const movieDetails = await getMovieDetails(tmdbId);
      const movieData = formatMovieForDB(movieDetails);
      movie = new Movie({
        ...movieData,
        addedBy: new mongoose.Types.ObjectId(req.userId),
      });
      await movie.save();
    }

    // Check if already a candidate
    const movieIdStr = movie._id.toString();
    if (meeting.candidates && meeting.candidates.some((id: any) => id.toString() === movieIdStr)) {
      return res.status(400).json({ error: 'This movie is already a candidate' });
    }

    // Add to candidates
    if (!meeting.candidates) {
      meeting.candidates = [];
    }
    meeting.candidates.push(movie._id);

    // Track suggestion
    if (!meeting.suggestions) {
      meeting.suggestions = [];
    }
    meeting.suggestions.push({
      userId: new mongoose.Types.ObjectId(req.userId),
      movieId: movie._id,
      createdAt: new Date(),
    });

    await meeting.save();

    await meeting.populate('candidates', 'title poster');
    await meeting.populate('suggestions.userId', 'username displayName');

    const remainingSuggestions = 2 - userSuggestions.length - 1;

    res.json({
      success: true,
      movie: {
        _id: movie._id,
        title: movie.title,
        poster: movie.poster,
      },
      remainingSuggestions,
    });
  } catch (error: any) {
    console.error('Error suggesting movie:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest movie' });
  }
});

// Get user's suggestion count for a meeting
router.get('/:id/my-suggestions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!req.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const userSuggestions = (meeting.suggestions || []).filter(
      (s: any) => s.userId.toString() === req.userId
    );

    res.json({
      count: userSuggestions.length,
      remaining: Math.max(0, 2 - userSuggestions.length),
      suggestions: userSuggestions,
    });
  } catch (error: any) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch suggestions' });
  }
});

// Add candidate to meeting (admin password required)
router.post('/:id/candidates', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { movieId } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: 'Movie ID required' });
    }

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Check if already a candidate
    if (meeting.candidates && meeting.candidates.some((id: any) => id.toString() === movieId)) {
      return res.status(400).json({ error: 'Movie is already a candidate' });
    }

    // Add to candidates
    if (!meeting.candidates) {
      meeting.candidates = [];
    }
    meeting.candidates.push(new mongoose.Types.ObjectId(movieId));
    await meeting.save();

    await meeting.populate('candidates', 'title poster');
    res.json(meeting);
  } catch (error: any) {
    console.error('Error adding candidate:', error);
    res.status(500).json({ error: error.message || 'Failed to add candidate' });
  }
});

// Remove candidate from meeting (admin password required)
router.delete('/:id/candidates/:movieId', authenticate, verifyAdminPassword, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const movieId = Array.isArray(req.params.movieId) ? req.params.movieId[0] : req.params.movieId;

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Remove from candidates
    if (meeting.candidates) {
      meeting.candidates = meeting.candidates.filter((id: any) => id.toString() !== movieId);
      await meeting.save();
    }

    // Also delete all votes for this candidate
    await MeetingVote.deleteMany({ meetingId: historyId, movieId });

    await meeting.populate('candidates', 'title poster');
    res.json(meeting);
  } catch (error: any) {
    console.error('Error removing candidate:', error);
    res.status(500).json({ error: error.message || 'Failed to remove candidate' });
  }
});

// Get candidates and votes for a meeting (no admin password required - users need to see candidates)
router.get('/:id/candidates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const meeting = await MovieHistory.findById(historyId)
      .populate('candidates', 'title poster description genres releaseDate runtime trailer');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Get all votes for this meeting
    const votes = await MeetingVote.find({ meetingId: historyId })
      .populate('userId', 'username displayName displayNameColor avatar')
      .populate('movieId', 'title');

    res.json({
      candidates: meeting.candidates || [],
      votes,
    });
  } catch (error: any) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch candidates' });
  }
});

// Vote on a candidate (yes/no with optional reason)
router.post('/:id/vote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { movieId, voteType, reason } = req.body;

    if (!movieId || !voteType) {
      return res.status(400).json({ error: 'Movie ID and vote type required' });
    }

    if (voteType !== 'yes' && voteType !== 'no') {
      return res.status(400).json({ error: 'Vote type must be "yes" or "no"' });
    }

    const meeting = await MovieHistory.findById(historyId);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if movie is a candidate
    if (!meeting.candidates || !meeting.candidates.some((id: any) => id.toString() === movieId)) {
      return res.status(400).json({ error: 'Movie is not a candidate for this meeting' });
    }

    // Check if meeting is upcoming
    if (meeting.status !== 'upcoming' && new Date(meeting.watchedDate) <= new Date()) {
      return res.status(400).json({ error: 'Cannot vote on past meetings' });
    }

    // Remove existing vote if any
    await MeetingVote.findOneAndDelete({
      userId: req.userId,
      movieId,
      meetingId: historyId,
    });

    // Create new vote
    const vote = new MeetingVote({
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
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already voted for this movie' });
    }
    console.error('Error submitting vote:', error);
    res.status(500).json({ error: error.message || 'Failed to submit vote' });
  }
});

// Get user's votes for a meeting
router.get('/:id/my-votes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const historyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const votes = await MeetingVote.find({
      userId: req.userId,
      meetingId: historyId,
    }).populate('movieId', 'title poster');

    res.json(votes);
  } catch (error: any) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch votes' });
  }
});

export default router;
