import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import './Meetings.css';

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
  hostId: {
    username: string;
    displayName?: string;
    displayNameColor?: string;
    avatar?: string;
  };
  ratings: Array<{
    userId: {
      username: string;
      displayName?: string;
      displayNameColor?: string;
      avatar?: string;
    };
    rating: number;
    comment: string;
  }>;
  gatheringRatings: Array<{
    userId: {
      username: string;
      displayName?: string;
      displayNameColor?: string;
      avatar?: string;
    };
    rating: number;
    comment?: string;
  }>;
  averageRating: number;
  averageGatheringRating: number;
  status: 'upcoming' | 'watched';
}

const Meetings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MovieHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MovieHistory | null>(null);
  const [movieRating, setMovieRating] = useState(0);
  const [movieComment, setMovieComment] = useState('');
  const [gatheringRating, setGatheringRating] = useState(0);
  const [gatheringComment, setGatheringComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await api.get('/movie-history');
      setMeetings(response.data.sort((a: MovieHistory, b: MovieHistory) => 
        new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
      ));
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasUserRatedMovie = (meeting: MovieHistory): boolean => {
    if (!user) return false;
    return meeting.ratings.some(r => 
      r.userId.username === user.username || (r.userId as any)._id === user.id
    );
  };

  const hasUserRatedGathering = (meeting: MovieHistory): boolean => {
    if (!user) return false;
    return meeting.gatheringRatings.some(r => 
      r.userId.username === user.username || (r.userId as any)._id === user.id
    );
  };

  const handleSubmitMovieRating = async (meetingId: string) => {
    if (!movieRating || movieComment.length < 50) {
      alert('Please provide a rating (1-5) and a comment of at least 50 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/movie-history/${meetingId}/rating`, {
        rating: movieRating,
        comment: movieComment,
      });
      setMovieRating(0);
      setMovieComment('');
      setSelectedMeeting(null);
      fetchMeetings();
      alert('Movie rating submitted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitGatheringRating = async (meetingId: string) => {
    if (!gatheringRating) {
      alert('Please provide a rating (1-5)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/movie-history/${meetingId}/gathering-rating`, {
        rating: gatheringRating,
        comment: gatheringComment || undefined,
      });
      setGatheringRating(0);
      setGatheringComment('');
      setSelectedMeeting(null);
      fetchMeetings();
      alert('Gathering rating submitted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="meetings-loading">Loading...</div>;
  }

  return (
    <div className="meetings-page">
      <header className="meetings-header">
        <button className="meetings-back-btn" onClick={() => navigate('/')}>
          ← BACK
        </button>
        <h1>MEETINGS</h1>
        <div style={{ width: '100px' }}></div>
      </header>

      <div className="meetings-container">
        {meetings.length === 0 ? (
          <p className="no-meetings">No meetings found.</p>
        ) : (
          <div className="meetings-list">
            {meetings.map((meeting) => (
              <div key={meeting._id} className="meeting-card">
                <div className="meeting-header">
                  <div className="meeting-movies-list">
                    {(meeting.movieIds || []).map((movie, idx) => (
                      <div key={movie._id || idx} className="meeting-movie-mini">
                        {movie.poster && (
                          <img
                            src={movie.poster}
                            alt={movie.title}
                            className="meeting-poster"
                          />
                        )}
                        <span className="meeting-movie-title-mini">{movie.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className="meeting-info">
                    <h3>{(meeting.movieIds || []).map(m => m.title).join(' + ').toUpperCase()}</h3>
                    <p className="meeting-date">
                      {new Date(meeting.watchedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {meeting.location && (
                      <p className="meeting-location">📍 {meeting.location}</p>
                    )}
                    {meeting.theme && (
                      <p className="meeting-theme">🎬 Theme: {meeting.theme}</p>
                    )}
                    <div className="ratings-summary">
                      <span className="rating-badge">
                        Movie: {meeting.averageRating > 0 ? meeting.averageRating.toFixed(1) : 'N/A'} ⭐
                      </span>
                      <span className="rating-badge">
                        Gathering: {meeting.averageGatheringRating > 0 ? meeting.averageGatheringRating.toFixed(1) : 'N/A'} ⭐
                      </span>
                    </div>
                  </div>
                </div>

                <div className="meeting-actions">
                  {!hasUserRatedMovie(meeting) && (
                    <button
                      className="rating-btn"
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setMovieRating(0);
                        setMovieComment('');
                        setGatheringRating(0);
                        setGatheringComment('');
                      }}
                    >
                      RATE MOVIE
                    </button>
                  )}
                  {!hasUserRatedGathering(meeting) && (
                    <button
                      className="rating-btn gathering"
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setMovieRating(0);
                        setMovieComment('');
                        setGatheringRating(0);
                        setGatheringComment('');
                      }}
                    >
                      RATE GATHERING
                    </button>
                  )}
                  {(hasUserRatedMovie(meeting) && hasUserRatedGathering(meeting)) && (
                    <span className="rated-badge">✓ RATED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMeeting && (
        <div className="rating-modal">
          <div className="rating-modal-content">
            <h2>RATE {(selectedMeeting.movieIds || []).map(m => m.title).join(' + ').toUpperCase()}</h2>
            
            {!hasUserRatedMovie(selectedMeeting) && (
              <div className="rating-section">
                <h3>MOVIE RATING</h3>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star ${movieRating >= star ? 'filled' : ''}`}
                      onClick={() => setMovieRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <label>
                  COMMENT (MIN 50 CHARACTERS)
                  <textarea
                    value={movieComment}
                    onChange={(e) => setMovieComment(e.target.value)}
                    placeholder="Share your thoughts about the movie..."
                    rows={4}
                  />
                </label>
                <button
                  className="submit-rating-btn"
                  onClick={() => handleSubmitMovieRating(selectedMeeting._id)}
                  disabled={isSubmitting || !movieRating || movieComment.length < 50}
                >
                  SUBMIT MOVIE RATING
                </button>
              </div>
            )}

            {!hasUserRatedGathering(selectedMeeting) && (
              <div className="rating-section">
                <h3>GATHERING RATING</h3>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star ${gatheringRating >= star ? 'filled' : ''}`}
                      onClick={() => setGatheringRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <label>
                  COMMENT (OPTIONAL)
                  <textarea
                    value={gatheringComment}
                    onChange={(e) => setGatheringComment(e.target.value)}
                    placeholder="Share your thoughts about the gathering..."
                    rows={3}
                  />
                </label>
                <button
                  className="submit-rating-btn"
                  onClick={() => handleSubmitGatheringRating(selectedMeeting._id)}
                  disabled={isSubmitting || !gatheringRating}
                >
                  SUBMIT GATHERING RATING
                </button>
              </div>
            )}

            <button
              className="close-modal-btn"
              onClick={() => setSelectedMeeting(null)}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
