import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AvatarCreator from '../components/AvatarCreator';
import GenreSelector from '../components/GenreSelector';
import FavoriteMoviesSelector from '../components/FavoriteMoviesSelector';
import api from '../services/api';
import './Profile.css';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameColor, setDisplayNameColor] = useState('#00FFFF');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempDisplayNameColor, setTempDisplayNameColor] = useState('#00FFFF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [favoriteMovieIds, setFavoriteMovieIds] = useState<number[]>([]);
  const [optionalText, setOptionalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // 8-bit neon color palette
  const neonColors = [
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#FFD700', // Gold
    '#00FF00', // Lime/Green
    '#FF0080', // Hot Pink
    '#0080FF', // Bright Blue
    '#FF8000', // Orange
    '#8000FF', // Purple
  ];

  // Initialize state from user data
  useEffect(() => {
    if (user) {
      if (user.avatar) setAvatar(user.avatar);
      if (user.displayName) setDisplayName(user.displayName);
      if (user.displayNameColor) setDisplayNameColor(user.displayNameColor);
      if (user.preferences) {
        if (user.preferences.genres) setGenres(user.preferences.genres);
        if (user.preferences.favoriteMovieIds) setFavoriteMovieIds(user.preferences.favoriteMovieIds);
        if (user.preferences.optionalText) setOptionalText(user.preferences.optionalText);
      }
    }
  }, [user]);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const handleAvatarSave = async (avatarDataUrl: string) => {
    try {
      setAvatar(avatarDataUrl);
      await api.put('/auth/avatar', { avatar: avatarDataUrl });
      await refreshUser();
      setShowAvatarCreator(false);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save avatar');
    }
  };

  const handleColorSelect = (color: string) => {
    if (isEditingDisplayName) {
      setTempDisplayNameColor(color);
    } else {
      setDisplayNameColor(color);
    }
    setShowColorPicker(false);
  };

  const handleStartEditingDisplayName = () => {
    setTempDisplayName(displayName);
    setTempDisplayNameColor(displayNameColor);
    setIsEditingDisplayName(true);
  };

  const handleSaveDisplayName = async () => {
    try {
      setDisplayName(tempDisplayName);
      setDisplayNameColor(tempDisplayNameColor);
      await api.put('/auth/display-name', {
        displayName: tempDisplayName.trim() || undefined,
        displayNameColor: tempDisplayNameColor,
      });
      await refreshUser();
      setIsEditingDisplayName(false);
      setShowColorPicker(false);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save display name');
    }
  };

  const handleCancelEditingDisplayName = () => {
    setIsEditingDisplayName(false);
    setShowColorPicker(false);
  };

  const handleGenreToggle = (genre: string) => {
    const newGenres = genres.includes(genre)
      ? genres.filter((g) => g !== genre)
      : [...genres, genre];
    setGenres(newGenres);
  };

  const handleMovieToggle = (tmdbId: number) => {
    const newMovieIds = favoriteMovieIds.includes(tmdbId)
      ? favoriteMovieIds.filter((id) => id !== tmdbId)
      : [...favoriteMovieIds, tmdbId];
    setFavoriteMovieIds(newMovieIds);
  };

  const handleSavePreferences = async () => {
    setError('');
    setIsSaving(true);

    try {
      await api.put('/auth/preferences', {
        preferences: {
          genres,
          favoriteMovieIds,
          optionalText: optionalText.trim() || undefined,
        },
      });
      await refreshUser();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <button className="profile-back-btn" onClick={() => navigate('/')}>
          ← BACK
        </button>
        <h1>PROFILE</h1>
        <div style={{ width: '100px' }}></div>
      </header>

      <div className="profile-container">
        {error && <div className="profile-error">{error}</div>}

        {/* Avatar Section */}
        <section className="profile-section">
          <h2>AVATAR</h2>
          <div className="avatar-section">
            {avatar ? (
              <img src={avatar} alt={`${user.username}'s avatar`} className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                <span>NO AVATAR</span>
              </div>
            )}
            <button className="profile-button" onClick={() => setShowAvatarCreator(true)}>
              {avatar ? 'EDIT AVATAR' : 'CREATE AVATAR'}
            </button>
          </div>
        </section>

        {/* Display Name Section */}
        <section className="profile-section">
          <h2>THE <em>you</em> YOU ARE</h2>
          {!isEditingDisplayName ? (
            <div className="display-name-row-with-avatar">
              <div 
                className="display-name-display"
                onClick={handleStartEditingDisplayName}
              >
                <span 
                  className={`display-name-text ${!displayName ? 'placeholder' : ''}`}
                  style={{ color: displayName ? displayNameColor : '#666' }}
                >
                  {displayName || 'Click to set display name'}
                </span>
              </div>
            </div>
          ) : (
            <div className="display-name-editor">
              <div className="display-name-row">
                <div className="color-picker-container" ref={colorPickerRef}>
                  <button
                    type="button"
                    className="color-picker-button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                  >
                    <span 
                      className="color-picker-swatch" 
                      style={{ backgroundColor: tempDisplayNameColor }}
                    />
                  </button>
                  {showColorPicker && (
                    <div className="color-picker-popup">
                      <div className="neon-color-palette">
                        {neonColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`neon-color-swatch ${tempDisplayNameColor === color ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => handleColorSelect(color)}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  className="profile-input display-name-input"
                  placeholder="Your display name"
                  value={tempDisplayName}
                  onChange={(e) => {
                    setTempDisplayName(e.target.value);
                    setError('');
                  }}
                  maxLength={20}
                  autoFocus
                />
              </div>
              <div className="display-name-actions">
                <button
                  type="button"
                  className="profile-button"
                  onClick={handleCancelEditingDisplayName}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="profile-button"
                  onClick={handleSaveDisplayName}
                >
                  SAVE
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Genres Section */}
        <section className="profile-section">
          <GenreSelector selectedGenres={genres} onGenreToggle={handleGenreToggle} />
        </section>

        {/* Favorite Movies Section */}
        <section className="profile-section">
          <FavoriteMoviesSelector
            selectedMovies={favoriteMovieIds}
            onMovieToggle={handleMovieToggle}
          />
        </section>

        {/* What Makes a Movie Great Section */}
        <section className="profile-section">
          <label htmlFor="optional-text" className="profile-label">
            WHAT MAKES A MOVIE GREAT FOR YOU? (OPTIONAL)
          </label>
          <textarea
            id="optional-text"
            className="profile-textarea"
            value={optionalText}
            onChange={(e) => setOptionalText(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
          />
        </section>

        {/* Save Preferences Button */}
        <div className="profile-actions">
          <button
            type="button"
            className="profile-save-button"
            onClick={handleSavePreferences}
            disabled={isSaving}
          >
            {isSaving ? 'SAVING...' : 'SAVE PREFERENCES'}
          </button>
        </div>
      </div>

      {showAvatarCreator && (
        <div className="avatar-creator-modal">
          <AvatarCreator
            onSave={handleAvatarSave}
            onCancel={() => setShowAvatarCreator(false)}
            initialAvatar={avatar}
          />
        </div>
      )}
    </div>
  );
};

export default Profile;
