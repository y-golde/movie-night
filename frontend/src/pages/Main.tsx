import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api, { getCandidates, voteOnCandidate, getMyVotes, suggestMovie, getMySuggestions, getUpcomingWeekFreeEvenings, markFreeEvening, unmarkFreeEvening, getMyFreeEvenings } from '../services/api';
import { searchMovies } from '../services/tmdb';
import { generateGoogleCalendarLink, generateGoogleMapsLink, generateWazeLink } from '../utils/meetingLinks';
import { useSwipe } from '../hooks/useSwipe';
import SwipeContainer from '../components/SwipeContainer';
import MovieCard from '../components/MovieCard';
import './Main.css';

interface Movie {
  _id: string;
  title: string;
  poster?: string;
  description?: string;
  trailer?: string;
  likeCount?: number;
}

interface MovieHistory {
  _id: string;
  movieIds: Array<{
    _id: string;
    title: string;
    poster?: string;
  }>;
  watchedDate: string;
  location?: string;
  theme?: string;
  averageRating: number;
  averageRating: number;
  ratings: Array<{
    userId: { username: string; _id?: string };
    movieId?: { _id: string; title?: string } | string;
    rating: number;
    comment: string;
  }>;
  status: string;
}

interface Item {
  _id: string;
  name: string;
  claimedBy?: { username: string };
  status: string;
}

interface Cycle {
  _id: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  meetingTime?: string;
  location?: string;
  theme?: string;
  movies: Movie[];
}

interface UpcomingMeeting {
  _id: string;
  watchedDate: string;
  location?: string;
  movieIds: Movie[];
}

const Main = () => {
  const { user, logout } = useAuth();
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [pastMeetings, setPastMeetings] = useState<MovieHistory[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MovieHistory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [movieRatings, setMovieRatings] = useState<Record<string, { rating: number; comment: string }>>({});
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [hoveredStar, setHoveredStar] = useState<Record<string, number>>({});
  const [openTooltip, setOpenTooltip] = useState<string | null>(null);
  const [meetingCandidates, setMeetingCandidates] = useState<Record<string, any[]>>({});
  const [meetingVotes, setMeetingVotes] = useState<Record<string, any[]>>({});
  const [myVotes, setMyVotes] = useState<Record<string, Record<string, { voteType: string; reason?: string }>>>({});
  const [votingMovieId, setVotingMovieId] = useState<{ meetingId: string; movieId: string } | null>(null);
  const [voteReason, setVoteReason] = useState('');
  const [showTinderInterface, setShowTinderInterface] = useState(false);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [pendingVote, setPendingVote] = useState<'yes' | 'no' | null>(null);
  const [showSuggestMovies, setShowSuggestMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mySuggestions, setMySuggestions] = useState<Record<string, { count: number; remaining: number }>>({});
  const [freeEveningsData, setFreeEveningsData] = useState<any>(null);
  const [myFreeEveningDates, setMyFreeEveningDates] = useState<Set<string>>(new Set());

  const handleSwipeLeft = () => {
    if (showTinderInterface) {
      setPendingVote('no');
      setShowReviewModal(true);
    }
  };

  const handleSwipeRight = () => {
    if (showTinderInterface) {
      setPendingVote('yes');
      setShowReviewModal(true);
    }
  };

  const { cardRef, touchHandlers, offset } = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  const handleSubmitVote = async (voteType: 'yes' | 'no', review?: string) => {
    if (!activeCycle?._id) return;
    const candidates = meetingCandidates[activeCycle._id] || [];
    const unvotedCandidates = candidates.filter((c: any) => {
      const candidateId = c._id || c;
      return !myVotes[activeCycle._id]?.[candidateId];
    });
    const currentCandidate = unvotedCandidates[currentCandidateIndex];
    if (!currentCandidate) return;

    const candidateId = currentCandidate._id || currentCandidate;
    const savedIndex = currentCandidateIndex;
    
    try {
      await voteOnCandidate(activeCycle._id, candidateId, voteType, review || undefined);
      
      // Update local vote state immediately
      setMyVotes(prev => {
        const updated = {
          ...prev,
          [activeCycle._id]: {
            ...prev[activeCycle._id],
            [candidateId]: { voteType, reason: review },
          },
        };
        
        // Calculate remaining unvoted candidates with updated votes
        const remainingUnvoted = candidates.filter((c: any) => {
          const cId = c._id || c;
          return !updated[activeCycle._id]?.[cId];
        });
        
        // Update index: stay at same position (which now shows next candidate)
        // If we were at the last one, we're done
        if (remainingUnvoted.length > 0) {
          // Keep same index (array shifted, so this points to next candidate)
          const newIndex = savedIndex < remainingUnvoted.length ? savedIndex : 0;
          setCurrentCandidateIndex(newIndex);
        } else {
          // All done
          setShowTinderInterface(false);
          setCurrentCandidateIndex(0);
        }
        
        return updated;
      });
      
      setShowReviewModal(false);
      setPendingVote(null);
      setVoteReason('');
      
      // Refresh data in background (non-blocking)
      fetchData().catch(err => console.error('Background refresh failed:', err));
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit vote');
    }
  };

  useEffect(() => {
    fetchData();
    fetchFreeEvenings();
  }, []);

  const fetchFreeEvenings = async () => {
    try {
      const [weekData, myData] = await Promise.all([
        getUpcomingWeekFreeEvenings(),
        getMyFreeEvenings(),
      ]);
      setFreeEveningsData(weekData);
      setMyFreeEveningDates(new Set(myData.dates));
    } catch (error) {
      console.error('Failed to fetch free evenings:', error);
    }
  };

  const handleToggleFreeEvening = async (date: string) => {
    try {
      if (myFreeEveningDates.has(date)) {
        await unmarkFreeEvening(date);
        setMyFreeEveningDates(prev => {
          const newSet = new Set(prev);
          newSet.delete(date);
          return newSet;
        });
      } else {
        await markFreeEvening(date);
        setMyFreeEveningDates(prev => new Set(prev).add(date));
      }
      await fetchFreeEvenings(); // Refresh to get updated user list
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update free evening');
    }
  };

  // Sync candidate index when candidates or votes change (but not during active voting)
  useEffect(() => {
    if (showTinderInterface && activeCycle?._id && !showReviewModal) {
      const candidates = meetingCandidates[activeCycle._id] || [];
      const unvotedCandidates = candidates.filter((c: any) => {
        const candidateId = c._id || c;
        return !myVotes[activeCycle._id]?.[candidateId];
      });
      
      // Reset index if out of bounds (but don't interfere if we're in the middle of voting)
      if (unvotedCandidates.length > 0) {
        if (currentCandidateIndex >= unvotedCandidates.length) {
          setCurrentCandidateIndex(0);
        }
      } else if (unvotedCandidates.length === 0) {
        // All voted - close interface
        setShowTinderInterface(false);
        setCurrentCandidateIndex(0);
      }
    }
  }, [showTinderInterface, activeCycle?._id, meetingCandidates, myVotes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null);
      }
    };

    if (openTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openTooltip]);

  const fetchData = async () => {
    try {
      // Get all meetings and separate into past and upcoming
      const historyResponse = await api.get('/movie-history');
      const now = new Date();
      const past = historyResponse.data.filter((h: MovieHistory) => 
        h.status === 'watched' || new Date(h.watchedDate) < now
      );
      const upcoming = historyResponse.data.filter((h: MovieHistory) => 
        h.status === 'upcoming' || new Date(h.watchedDate) >= now
      );
      
      setPastMeetings(past.sort((a: MovieHistory, b: MovieHistory) => 
        new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
      ));
      setUpcomingMeetings(upcoming.sort((a: MovieHistory, b: MovieHistory) => 
        new Date(a.watchedDate).getTime() - new Date(b.watchedDate).getTime()
      ));

      // Fetch candidates and votes for upcoming meetings without movies
      for (const meeting of upcoming) {
        if (!meeting.movieIds || meeting.movieIds.length === 0) {
          try {
            const candidatesData = await getCandidates(meeting._id);
            setMeetingCandidates(prev => ({ ...prev, [meeting._id]: candidatesData.candidates || [] }));
            setMeetingVotes(prev => ({ ...prev, [meeting._id]: candidatesData.votes || [] }));
            
            const myVotesData = await getMyVotes(meeting._id);
            const votesMap: Record<string, { voteType: string; reason?: string }> = {};
            myVotesData.forEach((vote: any) => {
              votesMap[vote.movieId._id || vote.movieId] = {
                voteType: vote.voteType,
                reason: vote.reason,
              };
            });
            setMyVotes(prev => ({ ...prev, [meeting._id]: votesMap }));

            // Fetch user's suggestion count
            try {
              const suggestionsData = await getMySuggestions(meeting._id);
              setMySuggestions(prev => ({ ...prev, [meeting._id]: suggestionsData }));
            } catch (error) {
              console.error(`Failed to fetch suggestions for meeting ${meeting._id}:`, error);
            }
          } catch (error) {
            console.error(`Failed to fetch candidates for meeting ${meeting._id}:`, error);
          }
        }
      }

      // Find the next upcoming meeting
      const nextUpcoming = upcoming.length > 0 ? upcoming[0] : null;
      
      if (nextUpcoming) {
        // Check if it has movies selected
        if (nextUpcoming.movieIds && nextUpcoming.movieIds.length > 0) {
          // Has movies - show the first one
          setSelectedMovie(nextUpcoming.movieIds[0]);
          setActiveCycle({
            _id: nextUpcoming._id,
            isActive: true,
            startDate: nextUpcoming.watchedDate,
            endDate: nextUpcoming.watchedDate,
            meetingTime: nextUpcoming.watchedDate,
            location: nextUpcoming.location,
            movies: nextUpcoming.movieIds,
          });
        } else {
          // No movies - this is a voting session
          setSelectedMovie(null);
          setActiveCycle({
            _id: nextUpcoming._id,
            isActive: true,
            startDate: nextUpcoming.watchedDate,
            endDate: nextUpcoming.watchedDate,
            meetingTime: nextUpcoming.watchedDate,
            location: nextUpcoming.location,
            theme: nextUpcoming.theme,
            movies: [],
          });
        }
      } else {
        setSelectedMovie(null);
        setActiveCycle(null);
      }

      // Get items for upcoming event if there's a meeting time (optional - don't fail if endpoint doesn't exist)
      if (nextUpcoming?.watchedDate) {
        try {
          const itemsResponse = await api.get('/items');
          setItems(itemsResponse.data.filter((item: Item) => item.status === 'available'));
        } catch (error: any) {
          // Items endpoint is optional - only log if it's not a 404
          if (error.response?.status !== 404) {
            console.error('Failed to fetch items:', error);
          }
          setItems([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimItem = async (itemId: string) => {
    try {
      await api.put(`/items/${itemId}/claim`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to claim item');
    }
  };

  const handleRateMovie = async (meetingId: string, movieId: string, rating: number, comment: string) => {
    try {
      if (!comment || comment.trim().length < 50) {
        alert('Please provide a comment of at least 50 characters');
        return;
      }
      await api.post(`/movie-history/${meetingId}/rating`, {
        rating,
        comment: comment.trim(),
        movieId,
      });
      setMovieRatings({ ...movieRatings, [`${meetingId}-${movieId}`]: { rating, comment: comment.trim() } });
      setEditingMovieId(null);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit rating');
    }
  };

  const hasUserRatedMovie = (meeting: MovieHistory): boolean => {
    if (!user) return false;
    return meeting.ratings.some(r => 
      r.userId.username === user.username || r.userId._id === user.id
    );
  };

  const getUserMovieRating = (meeting: MovieHistory, movieId: string): { rating: number; comment: string } | null => {
    if (!user) return null;
    // Find rating for this specific movie by this user
    const rating = meeting.ratings.find(r => {
      const userMatch = r.userId.username === user.username || r.userId._id === user.id;
      if (!movieId) {
        // If no movieId specified, match ratings without movieId (legacy ratings)
        return userMatch && !r.movieId;
      }
      // Match by movieId (handle both object and string formats)
      if (!r.movieId) return false;
      const ratingMovieId = typeof r.movieId === 'string' ? r.movieId : (r.movieId as any)?._id || (r.movieId as any)?.toString();
      return userMatch && ratingMovieId === movieId;
    });
    return rating ? { rating: rating.rating, comment: rating.comment } : null;
  };

  const handleVote = async (voteType: 'yes' | 'no') => {
    if (!votingMovieId) return;
    
    try {
      await voteOnCandidate(votingMovieId.meetingId, votingMovieId.movieId, voteType, voteReason || undefined);
      setVotingMovieId(null);
      setVoteReason('');
      await fetchData(); // Refresh to get updated votes
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit vote');
    }
  };

  const handleSearchMovies = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchMovies(searchQuery.trim());
      setSearchResults(results.results);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to search movies');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestMovie = async (tmdbId: number) => {
    if (!activeCycle?._id) return;
    
    try {
      const result = await suggestMovie(activeCycle._id, tmdbId);
      alert(`Movie suggested successfully! ${result.remainingSuggestions} suggestion${result.remainingSuggestions !== 1 ? 's' : ''} remaining.`);
      setSearchQuery('');
      setSearchResults([]);
      await fetchData(); // Refresh to get updated candidates and suggestion count
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to suggest movie');
    }
  };


  if (loading) {
    return <div className="main-loading">Loading...</div>;
  }

  // Determine if we should show voting (upcoming meeting exists but no movie selected)
  const shouldShowVoting = activeCycle && !selectedMovie && (!activeCycle.movies || activeCycle.movies.length === 0);

  return (
    <div className="main-page">
      <header className="main-header">
        <h1>MOVIE NIGHT</h1>
        <div className="header-actions">
          <Link to="/social" className="nav-link">SOCIAL</Link>
          <Link to="/profile" className="nav-link">EDIT</Link>
          <div className="user-info-header">
            {user?.avatar && (
              <img src={user.avatar} alt={user?.displayName || user?.username} className="header-avatar" />
            )}
            <span 
              className="username" 
              style={{ color: user?.displayNameColor || '#000' }}
            >
              {user?.displayName || user?.username}
            </span>
          </div>
          <button onClick={logout} className="logout-btn">
            LOGOUT
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* PRESENT SECTION */}
        <section className="present-section">
          <h2>PRESENT</h2>
          
          {shouldShowVoting ? (
            <div className="voting-prompt-card">
              <h3>VOTING IN PROGRESS</h3>
              <p>No movie has been selected yet. Vote on candidates below!</p>
              {activeCycle?.theme && (
                <p className="voting-theme">
                  <strong>THEME:</strong> {activeCycle.theme}
                </p>
              )}
              {activeCycle?.meetingTime && (
                <p className="voting-meeting-time">
                  {new Date(activeCycle.meetingTime).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              )}
              
              <div className="voting-actions-header">
                <button 
                  className="vote-movies-btn"
                  onClick={() => {
                    const candidates = activeCycle?._id ? (meetingCandidates[activeCycle._id] || []) : [];
                    const unvotedCandidates = candidates.filter((c: any) => {
                      const candidateId = c._id || c;
                      return !myVotes[activeCycle!._id]?.[candidateId];
                    });
                    if (unvotedCandidates.length > 0) {
                      setCurrentCandidateIndex(0);
                      setShowTinderInterface(true);
                    } else {
                      alert('You have voted on all candidates!');
                    }
                  }}
                >
                  VOTE! ({(() => {
                    if (!activeCycle?._id) return 0;
                    const candidates = meetingCandidates[activeCycle._id] || [];
                    return candidates.filter((c: any) => {
                      const candidateId = c._id || c;
                      return !myVotes[activeCycle._id]?.[candidateId];
                    }).length;
                  })()} left)
                </button>
                <button 
                  className="suggest-movies-btn"
                  onClick={() => {
                    setShowSuggestMovies(!showSuggestMovies);
                    if (!showSuggestMovies) {
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                  disabled={activeCycle?._id && (mySuggestions[activeCycle._id]?.remaining || 0) === 0}
                >
                  SUGGEST MOVIES {activeCycle?._id && mySuggestions[activeCycle._id]?.remaining !== undefined 
                    ? `(${mySuggestions[activeCycle._id].remaining} LEFT)` 
                    : ''}
                </button>
              </div>

              {showSuggestMovies && activeCycle?._id && (
                <div className="suggest-movies-section">
                  <h4>SUGGEST MOVIES</h4>
                  {mySuggestions[activeCycle._id]?.remaining === 0 ? (
                    <p className="suggestions-limit-reached">You have reached your limit of 2 suggestions for this meeting.</p>
                  ) : (
                    <>
                      <div className="search-section">
                        <input
                          type="text"
                          className="movie-search-input"
                          placeholder="SEARCH MOVIES..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearchMovies()}
                        />
                        <button 
                          type="button" 
                          onClick={handleSearchMovies} 
                          disabled={isSearching || !searchQuery.trim()}
                        >
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
                                <h5>{movie.title}</h5>
                                <p>{movie.overview}</p>
                                <button onClick={() => handleSuggestMovie(movie.id)}>
                                  SUGGEST MOVIE
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {showTinderInterface && activeCycle?._id && (() => {
                const candidates = meetingCandidates[activeCycle._id] || [];
                const unvotedCandidates = candidates.filter((c: any) => {
                  const candidateId = c._id || c;
                  return !myVotes[activeCycle._id]?.[candidateId];
                });
                
                // Reset index if out of bounds
                let safeIndex = currentCandidateIndex;
                if (safeIndex >= unvotedCandidates.length && unvotedCandidates.length > 0) {
                  safeIndex = 0;
                  setCurrentCandidateIndex(0);
                } else if (unvotedCandidates.length === 0) {
                  safeIndex = -1;
                }
                
                const currentCandidate = safeIndex >= 0 ? unvotedCandidates[safeIndex] : null;
                
                if (!currentCandidate || unvotedCandidates.length === 0) {
                  return (
                    <div className="voting-complete">
                      <h4>ALL CANDIDATES REVIEWED</h4>
                      <p>You've voted on all candidates.</p>
                      <button 
                        className="close-voting-btn"
                        onClick={() => {
                          setShowTinderInterface(false);
                          setCurrentCandidateIndex(0);
                        }}
                      >
                        CLOSE
                      </button>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="swipe-area" {...touchHandlers} ref={cardRef}>
                      <SwipeContainer offset={offset} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
                        <MovieCard movie={{
                          _id: currentCandidate._id || currentCandidate,
                          title: currentCandidate.title,
                          poster: currentCandidate.poster || '',
                          description: currentCandidate.description || '',
                          trailer: currentCandidate.trailer,
                          genres: currentCandidate.genres,
                          releaseDate: currentCandidate.releaseDate,
                          runtime: currentCandidate.runtime,
                        }} />
                      </SwipeContainer>
                    </div>
                    {showReviewModal && pendingVote && (
                      <div className="review-modal-overlay" onClick={() => handleSubmitVote(pendingVote)}>
                        <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                          <h3>ADD REVIEW (OPTIONAL)</h3>
                          <textarea
                            className="review-textarea"
                            placeholder="Share your thoughts about this movie..."
                            value={voteReason}
                            onChange={(e) => setVoteReason(e.target.value)}
                            maxLength={500}
                            rows={4}
                          />
                          <div className="review-modal-actions">
                            <button className="skip-review-btn" onClick={() => handleSubmitVote(pendingVote)}>
                              SKIP
                            </button>
                            <button className="submit-review-btn" onClick={() => handleSubmitVote(pendingVote, voteReason.trim() || undefined)}>
                              SUBMIT
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : activeCycle && activeCycle.meetingTime && selectedMovie ? (
            <div className="upcoming-event-card">
              <h3>UPCOMING MOVIE NIGHT</h3>
              <div className="upcoming-movies">
                {activeCycle.movies
                  .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
                  .slice(0, 3)
                  .map((movie) => (
                    <div key={movie._id} className={`upcoming-movie-card ${movie._id === selectedMovie._id ? 'selected' : ''}`}>
                      {movie.poster && (
                        <img src={movie.poster} alt={movie.title} className="upcoming-movie-poster" />
                      )}
                      <h4>{movie.title.toUpperCase()}</h4>
                      {movie._id === selectedMovie._id && (
                        <span className="selected-badge">SELECTED</span>
                      )}
                    </div>
                  ))}
              </div>
              <div className="meeting-details">
                <p className="meeting-time">
                  {new Date(activeCycle.meetingTime).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Jerusalem',
                  })}
                </p>
                {activeCycle.location && (
                  <div className="meeting-location">
                    <p className="location-address">{activeCycle.location}</p>
                    <div className="location-links">
                      <a
                        href={generateGoogleCalendarLink(
                          `Movie Night: ${selectedMovie.title}`,
                          new Date(activeCycle.meetingTime),
                          activeCycle.location,
                          `Watching ${selectedMovie.title}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="location-link"
                      >
                        📅 CALENDAR
                      </a>
                      <a
                        href={generateGoogleMapsLink(activeCycle.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="location-link"
                      >
                        🗺️ MAPS
                      </a>
                      <a
                        href={generateWazeLink(activeCycle.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="location-link"
                      >
                        🧭 WAZE
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Items to bring */}
              {items.length > 0 && (
                <div className="items-section-present">
                  <h4>ITEMS TO BRING</h4>
                  <div className="items-list-present">
                    {items.map((item) => (
                      <div key={item._id} className="item-card-present">
                        <span className="item-name">{item.name.toUpperCase()}</span>
                        {item.status === 'claimed' && item.claimedBy ? (
                          <span className="item-claimed">Claimed by {item.claimedBy.username}</span>
                        ) : (
                          <button
                            onClick={() => handleClaimItem(item._id)}
                            className="claim-button"
                          >
                            CLAIM
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-upcoming-event">
              <p>No upcoming event scheduled</p>
            </div>
          )}
        </section>

        {/* FUTURE SECTION */}
        {freeEveningsData ? (() => {
          const hasEventThisWeek = freeEveningsData.dates.some((dayData: any) => dayData.hasMeeting);
          
          if (hasEventThisWeek) {
            return (
              <section className="future-section">
                <h2>FUTURE</h2>
                <div className="future-explanation">
                  <p>When there's no event scheduled for the upcoming week, you can mark your free evenings here to help coordinate the next movie night.</p>
                </div>
              </section>
            );
          }
          
          return (
            <section className="future-section">
              <h2>FUTURE</h2>
              <div className="free-evenings-calendar">
                <div className="week-dates-grid">
                  {freeEveningsData.dates.map((dayData: any) => {
                    const date = new Date(dayData.date);
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNumber = date.getDate();
                    const isMarked = myFreeEveningDates.has(dayData.date);
                    
                    return (
                      <div
                        key={dayData.date}
                        className={`day-card ${isMarked ? 'marked-free' : ''}`}
                      >
                        <div className="day-header">
                          <span className="day-name">{dayName.toUpperCase()}</span>
                          <span className="day-number">{dayNumber}</span>
                        </div>
                        <button
                          className={`mark-free-btn ${isMarked ? 'marked' : ''}`}
                          onClick={() => handleToggleFreeEvening(dayData.date)}
                        >
                          {isMarked ? '✓ FREE' : 'MARK FREE'}
                        </button>
                        {dayData.freeUsers.length > 0 && (
                          <div className="free-users-list">
                            <p className="free-users-count">{dayData.freeUsers.length} free</p>
                            <div className="free-users-avatars">
                              {dayData.freeUsers.slice(0, 3).map((fe: any) => (
                                <div key={fe._id} className="free-user-avatar" title={fe.userId?.displayName || fe.userId?.username}>
                                  {fe.userId?.avatar ? (
                                    <img src={fe.userId.avatar} alt={fe.userId?.displayName || fe.userId?.username} />
                                  ) : (
                                    <div
                                      className="free-user-initial"
                                      style={{ backgroundColor: fe.userId?.displayNameColor || '#000' }}
                                    >
                                      {(fe.userId?.displayName || fe.userId?.username || '?')[0].toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {dayData.freeUsers.length > 3 && (
                                <div className="free-user-more">+{dayData.freeUsers.length - 3}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })() : null}

        {/* PAST SECTION */}
        <section className="past-section">
          <h2>PAST</h2>
          {pastMeetings.length > 0 ? (
            <div className="past-meetings-list">
              {pastMeetings.map((meeting) => {
                const movies = meeting.movieIds || [];

                return (
                  <div key={meeting._id} className="past-meeting-card">
                    <div className="past-meeting-header">
                      <p className="past-meeting-date">
                        {new Date(meeting.watchedDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {meeting.location && (
                        <p className="past-meeting-location">📍 {meeting.location}</p>
                      )}
                    </div>

                    {/* Movies with ratings */}
                    {movies.map((movie, idx) => {
                      const ratingKey = `${meeting._id}-${movie._id || idx}`;
                      const userRating = getUserMovieRating(meeting, movie._id || '');
                      const currentRating = movieRatings[ratingKey]?.rating || userRating?.rating || 0;
                      const currentComment = movieRatings[ratingKey]?.comment || userRating?.comment || '';
                      const isEditing = editingMovieId === ratingKey;

                      return (
                        <div key={movie._id || idx} className="past-movie-rating-card">
                          <div className="movie-rating-left">
                            {movie.poster && (
                              <img src={movie.poster} alt={movie.title} className="movie-rating-poster" />
                            )}
                            <span className="movie-rating-name">{movie.title}</span>
                          </div>
                          <div className="movie-rating-right">
                            <div className="movie-rating-stars">
                              {[1, 2, 3, 4, 5].map((star) => {
                                const hoverRating = hoveredStar[ratingKey] || currentRating;
                                return (
                                  <button
                                    key={star}
                                    type="button"
                                    className={`star-btn-editable ${hoverRating >= star ? 'filled' : ''}`}
                                    onClick={() => {
                                      if (!isEditing) {
                                        setEditingMovieId(ratingKey);
                                        setMovieRatings({
                                          ...movieRatings,
                                          [ratingKey]: { rating: star, comment: currentComment },
                                        });
                                      } else {
                                        setMovieRatings({
                                          ...movieRatings,
                                          [ratingKey]: { rating: star, comment: currentComment },
                                        });
                                      }
                                    }}
                                    onMouseEnter={() => {
                                      setHoveredStar({ ...hoveredStar, [ratingKey]: star });
                                    }}
                                    onMouseLeave={() => {
                                      const newHovered = { ...hoveredStar };
                                      delete newHovered[ratingKey];
                                      setHoveredStar(newHovered);
                                    }}
                                    title={`Rate ${star} stars`}
                                  >
                                    ★
                                  </button>
                                );
                              })}
                            </div>
                            <div className="movie-rating-comment">
                              {isEditing || !userRating ? (
                                <>
                                  <div className="comment-label-row">
                                    <label htmlFor={`comment-${ratingKey}`}>COMMENT</label>
                                    <div className="tooltip-container">
                                      <span 
                                        className="tooltip-icon" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenTooltip(openTooltip === `${ratingKey}-edit` ? null : `${ratingKey}-edit`);
                                        }}
                                      >
                                        (?)
                                      </span>
                                      {openTooltip === `${ratingKey}-edit` && (
                                        <div className="tooltip-popup" onClick={(e) => e.stopPropagation()}>
                                          This information will help us gather AI insights to pick the next movie candidates
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <textarea
                                    id={`comment-${ratingKey}`}
                                    className="movie-comment-textarea"
                                    value={currentComment}
                                    onChange={(e) => {
                                      setMovieRatings({
                                        ...movieRatings,
                                        [ratingKey]: { rating: currentRating, comment: e.target.value },
                                      });
                                    }}
                                    placeholder="Share your thoughts about this movie..."
                                    rows={4}
                                  />
                                  <div className="rating-actions">
                                    <button
                                      type="button"
                                      className="save-rating-btn"
                                      onClick={() => {
                                        if (currentRating > 0 && currentComment.trim().length >= 50) {
                                          handleRateMovie(meeting._id, movie._id || '', currentRating, currentComment);
                                        } else {
                                          alert('Please provide a rating and a comment of at least 50 characters');
                                        }
                                      }}
                                      disabled={currentRating === 0 || currentComment.trim().length < 50}
                                    >
                                      SAVE
                                    </button>
                                    {userRating && (
                                      <button
                                        type="button"
                                        className="cancel-rating-btn"
                                        onClick={() => {
                                          setEditingMovieId(null);
                                          setMovieRatings({
                                            ...movieRatings,
                                            [ratingKey]: { rating: userRating.rating, comment: userRating.comment },
                                          });
                                        }}
                                      >
                                        CANCEL
                                      </button>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="comment-label-row">
                                    <label>COMMENT</label>
                                    <div className="tooltip-container">
                                      <span 
                                        className="tooltip-icon" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenTooltip(openTooltip === `${ratingKey}-view` ? null : `${ratingKey}-view`);
                                        }}
                                      >
                                        (?)
                                      </span>
                                      {openTooltip === `${ratingKey}-view` && (
                                        <div className="tooltip-popup" onClick={(e) => e.stopPropagation()}>
                                          This information will help us gather AI insights to pick the next movie candidates
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="saved-comment">
                                    <p>{userRating.comment}</p>
                                    <button
                                      type="button"
                                      className="edit-rating-btn"
                                      onClick={() => {
                                        setEditingMovieId(ratingKey);
                                        setMovieRatings({
                                          ...movieRatings,
                                          [ratingKey]: { rating: userRating.rating, comment: userRating.comment },
                                        });
                                      }}
                                    >
                                      EDIT
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-past-meetings">
              <p>No past meetings yet</p>
            </div>
          )}
        </section>
      </main>

      {/* Voting Modal */}
      {votingMovieId && (
        <div className="voting-modal-overlay" onClick={() => setVotingMovieId(null)}>
          <div className="voting-modal" onClick={(e) => e.stopPropagation()}>
            <h3>VOTE ON MOVIE</h3>
            <div className="voting-modal-content">
              <p>Do you want to watch this movie?</p>
              <textarea
                className="vote-reason-input"
                placeholder="Why? (optional - this helps improve future recommendations)"
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                maxLength={500}
              />
              <div className="voting-modal-actions">
                <button
                  className="vote-yes-btn-modal"
                  onClick={() => handleVote('yes')}
                >
                  YES 👍
                </button>
                <button
                  className="vote-no-btn-modal"
                  onClick={() => handleVote('no')}
                >
                  NO 👎
                </button>
                <button
                  className="cancel-vote-btn"
                  onClick={() => {
                    setVotingMovieId(null);
                    setVoteReason('');
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Modal */}
      {votingMovieId && (
        <div className="voting-modal-overlay" onClick={() => setVotingMovieId(null)}>
          <div className="voting-modal" onClick={(e) => e.stopPropagation()}>
            <h3>VOTE ON MOVIE</h3>
            <div className="voting-modal-content">
              <p>Do you want to watch this movie?</p>
              <textarea
                className="vote-reason-input"
                placeholder="Why? (optional - this helps improve future recommendations)"
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                maxLength={500}
              />
              <div className="voting-modal-actions">
                <button
                  className="vote-yes-btn-modal"
                  onClick={() => handleVote('yes')}
                >
                  YES 👍
                </button>
                <button
                  className="vote-no-btn-modal"
                  onClick={() => handleVote('no')}
                >
                  NO 👎
                </button>
                <button
                  className="cancel-vote-btn"
                  onClick={() => {
                    setVotingMovieId(null);
                    setVoteReason('');
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Main;
