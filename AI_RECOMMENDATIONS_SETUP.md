# AI Movie Recommendations Setup

## Overview
AI-powered movie suggestions have been implemented using Groq's Llama 3.3 70B Versatile model. The system analyzes all past meetings and reviews to generate diverse movie recommendations with explanations.

## Environment Variables

Add to `backend/.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from: https://console.groq.com/

## Features Implemented

### Backend
1. **AI Recommendation Service** (`backend/src/services/aiMovieRecommendations.ts`)
   - Analyzes all past meetings and reviews
   - Generates 15 diverse movie suggestions using Llama 3.3 70B Versatile
   - Each suggestion includes an AI-generated explanation
   - Caches results for 1 hour per meeting
   - Handles cases with no viewing history

2. **API Endpoints** (`backend/src/routes/movieHistory.ts`)
   - `POST /movie-history/:id/ai-suggestions` - Generate AI suggestions
   - `GET /movie-history/:id/ai-suggestions` - Get cached suggestions
   - `GET /movie-history/reviews/:movieId` - Get all reviews for a movie
   - `PUT /movie-history/:id` - Update meeting (add movies)

### Frontend
1. **Admin Page Updates** (`frontend/src/pages/Admin.tsx`)
   - AI suggestions section for meetings without movies
   - "AI" button to generate suggestions
   - Display suggestions with posters, titles, and AI explanations
   - "VIEW REVIEWS" button on meeting cards
   - "ADD TO MEETING" button for each suggestion

2. **Reviews Modal** (`frontend/src/components/MovieReviewsModal.tsx`)
   - Displays all reviews for a movie across all meetings
   - Shows user info, ratings, comments, and meeting context

3. **API Service** (`frontend/src/services/api.ts`)
   - `generateAISuggestions(meetingId)` - Generate suggestions
   - `getMovieReviews(movieId)` - Get reviews for a movie

## Usage

1. **Generate AI Suggestions:**
   - Go to Admin page
   - Find a meeting without movies (upcoming meeting)
   - Click "AI" button
   - Wait for suggestions to generate (~5-10 seconds)
   - Review suggestions with AI explanations

2. **View Reviews:**
   - Click "VIEW REVIEWS" button on any meeting card
   - Or click "VIEW REVIEWS" on a movie suggestion
   - See all reviews for that movie across all meetings

3. **Add Movie to Meeting:**
   - Click "ADD TO MEETING" on any suggestion
   - Movie will be added to the meeting's movie list

## Cost

- **Per request:** ~$0.003 (well under $0.50 budget)
- **Model:** Llama 3.3 70B Versatile via Groq
- **Caching:** Results cached for 1 hour to minimize API calls

## Technical Details

- **Model:** `llama-3.1-70b-versatile`
- **Context Window:** 128K tokens
- **Temperature:** 0.7 (balanced creativity/consistency)
- **Response Format:** JSON with structured movie suggestions
- **Cache:** In-memory Map with 1-hour expiry

## Troubleshooting

1. **No suggestions generated:**
   - Check GROQ_API_KEY is set in backend/.env
   - Check browser console for errors
   - Verify admin password is set

2. **Movies not found:**
   - AI may suggest movies not in TMDB
   - These will be filtered out automatically
   - Try generating again for different suggestions

3. **Slow generation:**
   - First request takes ~5-10 seconds
   - Subsequent requests use cache (instant)
   - Cache expires after 1 hour

## Future Enhancements

- Add ability to regenerate suggestions
- Show more detailed movie info (cast, director, etc.)
- Filter suggestions by genre/era
- Save favorite suggestions
- Export suggestions list
