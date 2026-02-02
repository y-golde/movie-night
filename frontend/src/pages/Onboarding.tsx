import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import GenreSelector from '../components/GenreSelector';
import FavoriteMoviesSelector from '../components/FavoriteMoviesSelector';
import AvatarCreator from '../components/AvatarCreator';
import api from '../services/api';
import './Onboarding.css';

const Onboarding = () => {
  const { user, loading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [genres, setGenres] = useState<string[]>([]);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<number[]>([]);
  const [optionalText, setOptionalText] = useState('');
  const [avatar, setAvatar] = useState('');
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize form state from user preferences when user loads
  useEffect(() => {
    if (user) {
      if (user.avatar) {
        setAvatar(user.avatar);
      }
      if (user.preferences) {
        if (user.preferences.genres && user.preferences.genres.length > 0) {
          setGenres(user.preferences.genres);
        }
        if (user.preferences.favoriteMovieIds && user.preferences.favoriteMovieIds.length > 0) {
          setFavoriteMovieIds(user.preferences.favoriteMovieIds);
        }
        if (user.preferences.optionalText) {
          setOptionalText(user.preferences.optionalText);
        }
      }
    }
  }, [user]);

  const handleGenreToggle = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre));
    } else {
      setGenres([...genres, genre]);
    }
  };

  const handleMovieToggle = (tmdbId: number) => {
    if (favoriteMovieIds.includes(tmdbId)) {
      setFavoriteMovieIds(favoriteMovieIds.filter((id) => id !== tmdbId));
    } else {
      setFavoriteMovieIds([...favoriteMovieIds, tmdbId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (genres.length < 3) {
      setError('Please select at least 3 genres');
      return;
    }

    if (favoriteMovieIds.length < 3 || favoriteMovieIds.length > 5) {
      setError('Please select 3-5 favorite movies');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.put('/auth/preferences', {
        preferences: {
          genres,
          favoriteMovieIds,
          optionalText: optionalText.trim() || undefined,
        },
        avatar: avatar || undefined,
      });
      // Refresh user data to update needsOnboarding flag
      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <div className="onboarding-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <div className="onboarding-error">No user found. Please log in.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <h1>WELCOME, {(user.displayName || user.username).toUpperCase()}</h1>
        <p className="onboarding-subtitle">Tell us about your movie taste</p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="avatar-section-onboarding">
            <label className="onboarding-label">AVATAR</label>
            <div className="avatar-container-onboarding">
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Avatar" 
                  className="onboarding-avatar"
                  onClick={() => setShowAvatarCreator(true)}
                />
              ) : (
                <button
                  type="button"
                  className="avatar-placeholder-btn-onboarding"
                  onClick={() => setShowAvatarCreator(true)}
                >
                  +
                </button>
              )}
            </div>
          </div>

          <GenreSelector selectedGenres={genres} onGenreToggle={handleGenreToggle} />

          <FavoriteMoviesSelector
            selectedMovies={favoriteMovieIds}
            onMovieToggle={handleMovieToggle}
          />

          <div className="optional-section">
            <label htmlFor="optional-text">WHAT MAKES A MOVIE GREAT FOR YOU? (OPTIONAL)</label>
            <textarea
              id="optional-text"
              className="optional-textarea"
              value={optionalText}
              onChange={(e) => setOptionalText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
            />
          </div>

          {error && <div className="onboarding-error">{error}</div>}

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || genres.length < 3 || favoriteMovieIds.length < 3}
          >
            {isSubmitting ? 'SAVING...' : 'CONTINUE'}
          </button>
        </form>

        {showAvatarCreator && (
          <div className="avatar-creator-modal">
            <AvatarCreator
              onSave={(avatarDataUrl) => {
                setAvatar(avatarDataUrl);
                setShowAvatarCreator(false);
              }}
              onCancel={() => setShowAvatarCreator(false)}
              initialAvatar={avatar}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
