import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSwipe } from '../hooks/useSwipe';
import SwipeContainer from '../components/SwipeContainer';
import MovieCard from '../components/MovieCard';
import api from '../services/api';
import { searchMovies, addMovie } from '../services/tmdb';
import './Voting.css';

interface Movie {
  _id: string;
  title: string;
  poster: string;
  description: string;
  trailer?: string;
  genres?: string[];
  releaseDate?: string | Date;
  likeCount?: number;
}

const Voting = () => {
  const { user } = useAuth();
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingVote, setPendingVote] = useState<'like' | 'dislike' | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [showVotingInterface, setShowVotingInterface] = useState(false);

  useEffect(() => {
    fetchActiveCycle();
  }, []);

  const fetchActiveCycle = async () => {
    try {
      const response = await api.get('/cycles/active');
      const cycle = response.data;
      setActiveCycle(cycle);

      if (cycle) {
        await fetchUserVotes(cycle._id, cycle);
      }
    } catch (error) {
      console.error('Failed to fetch cycle:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserVotes = async (cycleId: string, cycle?: any) => {
    try {
      const response = await api.get(`/votes/cycle/${cycleId}`);
      const votes: any[] = response.data;
      const voteMap: Record<string, string> = {};
      votes.forEach((vote) => {
        voteMap[vote.movieId] = vote.voteType;
      });
      setUserVotes(voteMap);
      
      // Filter movies after getting votes
      const cycleData = cycle || activeCycle;
      if (cycleData) {
        const allMovies = cycleData.movies || [];
        const votedMovieIds = new Set(Object.keys(voteMap));
        const unvotedMovies = allMovies.filter((movie: Movie) => {
          const movieId = typeof movie._id === 'string' ? movie._id : movie._id?.toString();
          return !votedMovieIds.has(movieId);
        });
        setMovies(unvotedMovies);
        // Reset index if current movie was already voted on
        if (currentIndex >= unvotedMovies.length && unvotedMovies.length > 0) {
          setCurrentIndex(0);
        }
        // Show voting interface if there are movies to vote on
        if (unvotedMovies.length > 0) {
          setShowVotingInterface(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch votes:', error);
    }
  };

  const handleVote = async (voteType: 'like' | 'dislike', review?: string) => {
    if (!activeCycle || currentIndex >= movies.length) return;

    const movie = movies[currentIndex];
    try {
      await api.post('/votes', {
        movieId: movie._id,
        cycleId: activeCycle._id,
        voteType,
        review: review || undefined,
      });

      const updatedVotes = { ...userVotes, [movie._id]: voteType };
      setUserVotes(updatedVotes);
      
      // Remove voted movie from list
      const updatedMovies = movies.filter(m => m._id !== movie._id);
      setMovies(updatedMovies);
      
      // Move to next movie or finish
      if (updatedMovies.length > 0) {
        // Stay at same index (which now points to next movie)
        if (currentIndex >= updatedMovies.length) {
          setCurrentIndex(updatedMovies.length - 1);
        }
      } else {
        // All movies voted on
        setCurrentIndex(0);
      }
      
      setShowReviewModal(false);
      setPendingVote(null);
      setReviewText('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit vote');
    }
  };

  const handleSwipeLeft = () => {
    setPendingVote('dislike');
    setShowReviewModal(true);
  };

  const handleSwipeRight = () => {
    setPendingVote('like');
    setShowReviewModal(true);
  };

  const handleSubmitReview = () => {
    if (pendingVote) {
      handleVote(pendingVote, reviewText.trim() || undefined);
    }
  };

  const handleSkipReview = () => {
    if (pendingVote) {
      handleVote(pendingVote);
    }
  };

  const { cardRef, touchHandlers, offset } = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMovies(searchQuery.trim());
      setSearchResults(results.results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMovie = async (tmdbId: number) => {
    try {
      await addMovie(tmdbId);
      await fetchActiveCycle();
      setSearchQuery('');
      setSearchResults([]);
      alert('Movie added successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add movie');
    }
  };

  if (loading) {
    return <div className="voting-loading">Loading...</div>;
  }

  if (!activeCycle) {
    return (
      <div className="voting-page">
        <div className="voting-container">
          <h1>NO ACTIVE VOTING CYCLE</h1>
          {sessionStorage.getItem('adminPassword') && (
            <div className="add-movie-section">
              <h2>ADD MOVIE TO NEXT CYCLE</h2>
              <div className="search-section">
                <input
                  type="text"
                  className="movie-search-input"
                  placeholder="SEARCH MOVIES..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button type="button" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((movie) => (
                    <div key={movie.id} className="search-result-card">
                      {movie.poster && (
                        <img src={movie.poster} alt={movie.title} />
                      )}
                      <div>
                        <h3>{movie.title}</h3>
                        <p>{movie.overview}</p>
                        <button onClick={() => handleAddMovie(movie.id)}>ADD MOVIE</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentMovie = movies.length > 0 ? movies[currentIndex] : null;
  const remainingCount = movies.length;
  const hasSelectedMovie = activeCycle.movies && activeCycle.movies.length > 0 && 
    activeCycle.movies.some((m: any) => m._id);

  const formatMeetingTime = (meetingTime?: string | Date) => {
    if (!meetingTime) return null;
    const date = typeof meetingTime === 'string' ? new Date(meetingTime) : meetingTime;
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="voting-page">
      <div className="voting-container">
        <header className="voting-header">
          <h1>VOTING IN PROGRESS</h1>
          {!hasSelectedMovie && (
            <p className="voting-subtitle">No movie has been selected yet. Vote on candidates below!</p>
          )}
          {activeCycle.meetingTime && (
            <p className="voting-meeting-time">{formatMeetingTime(activeCycle.meetingTime)}</p>
          )}
        </header>

        <div className="voting-actions-header">
          <button 
            className="vote-movies-btn"
            onClick={() => setShowVotingInterface(!showVotingInterface)}
          >
            VOTE! ({remainingCount})
          </button>
          <button 
            className="suggest-movies-btn"
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
            }}
          >
            SUGGEST MOVIES
          </button>
        </div>

        {showVotingInterface && (
          <>
            {currentMovie ? (
              <div className="swipe-area" {...touchHandlers} ref={cardRef}>
                <SwipeContainer offset={offset} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
                  <MovieCard movie={currentMovie} />
                </SwipeContainer>
              </div>
            ) : (
              <div className="voting-complete">
                <h2>ALL MOVIES REVIEWED</h2>
                <p>You've voted on all movies in this cycle.</p>
              </div>
            )}

            {currentMovie && (
              <div className="voting-actions">
                <button className="vote-button dislike" onClick={handleSwipeLeft}>
                  ← DISLIKE
                </button>
                <button className="vote-button like" onClick={handleSwipeRight}>
                  LIKE →
                </button>
              </div>
            )}
          </>
        )}

        {/* Review Modal */}
        {showReviewModal && pendingVote && (
          <div className="review-modal-overlay" onClick={handleSkipReview}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
              <h3>ADD REVIEW (OPTIONAL)</h3>
              <textarea
                className="review-textarea"
                placeholder="Share your thoughts about this movie..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <div className="review-modal-actions">
                <button className="skip-review-btn" onClick={handleSkipReview}>
                  SKIP
                </button>
                <button className="submit-review-btn" onClick={handleSubmitReview}>
                  SUBMIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Suggest Movies Section */}
        <div className="suggest-movies-section">
          <h2>SUGGEST MOVIES</h2>
          <div className="search-section">
            <input
              type="text"
              className="movie-search-input"
              placeholder="SEARCH MOVIES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button type="button" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((movie) => (
                <div key={movie.id} className="search-result-card">
                  {movie.poster && (
                    <img src={movie.poster} alt={movie.title} />
                  )}
                  <div>
                    <h3>{movie.title}</h3>
                    <p>{movie.overview}</p>
                    <button onClick={() => handleAddMovie(movie.id)}>ADD MOVIE</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Voting;
