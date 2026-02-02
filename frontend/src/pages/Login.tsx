import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PatternLock from '../components/PatternLock';
import AvatarCreator from '../components/AvatarCreator';
import api from '../services/api';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [pattern, setPattern] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayNameColor, setDisplayNameColor] = useState('#00FFFF'); // Default to cyan
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempDisplayNameColor, setTempDisplayNameColor] = useState('#00FFFF');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  // 8-bit neon color palette
  const neonColors = [
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#FFD700', // Gold (darker yellow for better contrast)
    '#00FF00', // Lime/Green
    '#FF0080', // Hot Pink
    '#0080FF', // Bright Blue
    '#FF8000', // Orange
    '#8000FF', // Purple
  ];
  const [step, setStep] = useState<'username' | 'pattern' | 'set-pattern'>('username');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, refreshUser } = useAuth();
  const navigate = useNavigate();

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

  const handleSaveDisplayName = () => {
    setDisplayName(tempDisplayName);
    setDisplayNameColor(tempDisplayNameColor);
    setIsEditingDisplayName(false);
    setShowColorPicker(false);
  };

  const handleCancelEditingDisplayName = () => {
    setIsEditingDisplayName(false);
    setShowColorPicker(false);
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/check-username', { username: username.trim() });
      console.log('Avatar from backend:', response.data.avatar); // Debug log
      setUserAvatar(response.data.avatar || ''); // Set avatar even if null/undefined
      if (response.data.hasPattern) {
        setStep('pattern');
      } else {
        setStep('set-pattern');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'User not found');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePatternLogin = async (completedPattern: string) => {
    if (!completedPattern) {
      setError('Please draw your pattern');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(username.trim(), completedPattern);
      // Check if there's a redirect path stored
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid pattern');
      setPattern('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFirstPattern = (completedPattern: string) => {
    if (!completedPattern) {
      setError('Please draw your pattern');
      return;
    }
    setPattern(completedPattern);
    setError('');
  };

  const handleChoosePattern = async () => {
    if (!pattern) {
      setError('Please draw your pattern first');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await api.post('/auth/set-pattern', {
        username: username.trim(),
        pattern: pattern,
        confirmPattern: pattern,
        displayName: displayName.trim() || undefined,
        displayNameColor: displayNameColor,
        avatar: userAvatar || undefined,
      });
      
      // Update auth context
      localStorage.setItem('token', response.data.token);
      await refreshUser();
      // Check if there's a redirect path stored
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirectPath);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set pattern');
      setPattern('');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handlePatternChange = (newPattern: string) => {
    setPattern(newPattern);
    setError('');
  };

  const handleBack = () => {
    setStep('username');
    setPattern('');
    setDisplayName('');
    setDisplayNameColor('#00FFFF');
    setUserAvatar('');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">MOVIE NIGHT</h1>
        
        {step === 'username' && (
          <>
            <p className="login-subtitle">who <em>are</em> you</p>
            <form className="login-form" onSubmit={handleUsernameSubmit}>
              <div className="username-row">
                {userAvatar && (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    className="login-avatar-display"
                  />
                )}
                <input
                  type="text"
                  className="login-input"
                  placeholder="USERNAME"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                    // Don't clear avatar immediately - wait for username check
                  }}
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
              {error && <div className="login-error">{error}</div>}
              <button type="submit" className="login-button" disabled={isSubmitting}>
                {isSubmitting ? 'CHECKING...' : 'CONTINUE'}
              </button>
            </form>
          </>
        )}

        {step === 'pattern' && (
          <>
            <p className="login-subtitle">Draw your pattern</p>
            <div className="login-form">
              <PatternLock
                onPatternComplete={handlePatternLogin}
                onPatternChange={handlePatternChange}
                disabled={isSubmitting}
              />
              {error && <div className="login-error">{error}</div>}
              <div className="login-actions">
                <button type="button" className="login-button secondary" onClick={handleBack} disabled={isSubmitting}>
                  BACK
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'set-pattern' && (
          <>
            <p className="login-subtitle">Set your pattern and display name</p>
            <div className="login-form">
              <div className="form-section">
                <label className="form-label">THE <em>you</em> YOU ARE (OPTIONAL)</label>
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
                    <div className="avatar-section-setup">
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt="Avatar" 
                          className="setup-avatar"
                          onClick={() => setShowAvatarCreator(true)}
                        />
                      ) : (
                        <button
                          type="button"
                          className="avatar-create-btn"
                          onClick={() => setShowAvatarCreator(true)}
                          title="Create Avatar"
                        >
                          Create Avatar
                        </button>
                      )}
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
                        className="login-input display-name-input"
                        placeholder="Your display name"
                        value={tempDisplayName}
                        onChange={(e) => {
                          setTempDisplayName(e.target.value);
                          setError('');
                        }}
                        disabled={isSubmitting}
                        maxLength={20}
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      className="login-button"
                      onClick={handleSaveDisplayName}
                      disabled={isSubmitting}
                    >
                      SAVE
                    </button>
                  </div>
                )}
              </div>

              <div className="form-section">
                <label className="form-label">DRAW YOUR PATTERN</label>
                <PatternLock
                  onPatternComplete={handleFirstPattern}
                  onPatternChange={handlePatternChange}
                  disabled={isSubmitting}
                  showChooseButton={true}
                  onChoose={handleChoosePattern}
                />
              </div>

              {error && <div className="login-error">{error}</div>}
              <div className="login-actions">
                <button type="button" className="login-button secondary" onClick={handleBack} disabled={isSubmitting}>
                  BACK
                </button>
              </div>
            </div>

            {showAvatarCreator && (
              <div className="avatar-creator-modal">
                <AvatarCreator
                  onSave={(avatarDataUrl) => {
                    setUserAvatar(avatarDataUrl);
                    setShowAvatarCreator(false);
                  }}
                  onCancel={() => setShowAvatarCreator(false)}
                  initialAvatar={userAvatar}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
