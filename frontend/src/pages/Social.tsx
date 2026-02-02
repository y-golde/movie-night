import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Social.css';

interface User {
  id: string;
  username: string;
  displayName?: string;
  displayNameColor?: string;
  avatar?: string;
  preferences: {
    genres: string[];
    favoriteMovieIds: number[];
    optionalText?: string;
  };
  favoriteMovies: Array<{
    tmdbId: number;
    title: string;
    poster: string;
  }>;
  lastReview?: {
    movie: {
      _id: string;
      title: string;
      poster?: string;
    };
    rating: number;
    comment: string;
    watchedDate: string;
  };
  createdAt: string;
}

const Social = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/auth/users');
        setUsers(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="social-page">
        <div className="social-container">
          <div className="social-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="social-page">
      <header className="social-header">
        <button className="social-back-btn" onClick={() => navigate('/')}>
          ← BACK
        </button>
        <h1>SOCIAL</h1>
        <div style={{ width: '100px' }}></div>
      </header>

      <div className="social-container">
        {error && <div className="social-error">{error}</div>}

        <div className="users-grid">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-card-header">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="user-avatar" />
                ) : (
                  <div className="user-avatar-placeholder">
                    <span>NO AVATAR</span>
                  </div>
                )}
                <div className="user-name-section">
                  {user.displayName ? (
                    <h2
                      className="user-display-name"
                      style={{ color: user.displayNameColor || '#000' }}
                    >
                      {user.displayName.toUpperCase()}
                    </h2>
                  ) : (
                    <h2 className="user-username">USER</h2>
                  )}
                </div>
              </div>

              {user.preferences.genres.length > 0 && (
                <div className="user-section">
                  <h3>GENRES</h3>
                  <div className="user-genres">
                    {user.preferences.genres.map((genre, idx) => (
                      <span key={idx} className="genre-badge">
                        {genre.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.favoriteMovies.length > 0 && (
                <div className="user-section">
                  <h3>FAVORITE MOVIES</h3>
                  <div className="user-movies">
                    {user.favoriteMovies.map((movie) => (
                      <div key={movie.tmdbId} className="user-movie-card">
                        {movie.poster && (
                          <img src={movie.poster} alt={movie.title} className="user-movie-poster" />
                        )}
                        <p className="user-movie-title">{movie.title.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user.preferences.optionalText && (
                <div className="user-section">
                  <h3>WHAT MAKES A MOVIE GREAT</h3>
                  <p className="user-optional-text">{user.preferences.optionalText}</p>
                </div>
              )}

              {user.lastReview && (
                <div className="user-section">
                  <h3>LAST REVIEW</h3>
                  <div className="user-review">
                    <div className="user-review-movie">
                      {user.lastReview.movie.poster && (
                        <img 
                          src={user.lastReview.movie.poster} 
                          alt={user.lastReview.movie.title} 
                          className="user-review-poster" 
                        />
                      )}
                      <div className="user-review-movie-info">
                        <h4 className="user-review-title">{user.lastReview.movie.title.toUpperCase()}</h4>
                        <div className="user-review-rating">
                          {'⭐'.repeat(user.lastReview.rating)}
                        </div>
                      </div>
                    </div>
                    <p className="user-review-comment">{user.lastReview.comment}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {users.length === 0 && !loading && (
          <div className="social-empty">
            <p>No users found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Social;
