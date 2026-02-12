import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api, { generateAISuggestions, generateAIRecommendation } from '../services/api';
import { searchMovies } from '../services/tmdb';
import MovieReviewsModal from '../components/MovieReviewsModal';
import VotesModal from '../components/VotesModal';
import './Admin.css';

interface User {
  _id: string;
  username: string;
  displayName?: string;
  displayNameColor?: string;
  hasPattern?: boolean;
  avatar?: string;
  createdAt: string;
}

interface Movie {
  _id: string;
  title: string;
  poster: string;
}


const Admin = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    movieIds: [] as string[],
    watchedDate: '',
    location: '',
    theme: '',
  });
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [movieSearchQuery, setMovieSearchQuery] = useState('');
  const [movieSearchResults, setMovieSearchResults] = useState<any[]>([]);
  const [isSearchingMovies, setIsSearchingMovies] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [deletingMeetingId, setDeletingMeetingId] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any[]>>({});
  const [generatingSuggestions, setGeneratingSuggestions] = useState<Record<string, boolean>>({});
  const [aiRecommendations, setAiRecommendations] = useState<Record<string, any>>({});
  const [reviewsModal, setReviewsModal] = useState<{ movieId: string; movieTitle: string; moviePoster?: string } | null>(null);
  const [votesModal, setVotesModal] = useState<{ movieTitle: string; moviePoster?: string; votes: any[] } | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  const [meetingVotes, setMeetingVotes] = useState<Record<string, any[]>>({});
  const [meetingItems, setMeetingItems] = useState<Record<string, any[]>>({});
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
  const [showAddItem, setShowAddItem] = useState<Record<string, boolean>>({});
  const [isAddingItem, setIsAddingItem] = useState<Record<string, boolean>>({});
  const [editingMeeting, setEditingMeeting] = useState<any | null>(null);
  const [editMeetingForm, setEditMeetingForm] = useState({
    watchedDate: '',
    location: '',
    theme: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    // Ensure user is logged in
    if (!user) {
      setLoading(false);
      return;
    }
    
    // Check if admin password is already verified in session
    const storedPassword = sessionStorage.getItem('adminPassword');
    if (storedPassword) {
      setIsAdminVerified(true);
      // Fetch all data (users, movies, meetings) - all work with admin password
      fetchData();
    } else {
      // If no password stored, set loading to false so password form can show
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchMovies(), fetchMeetings()]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await api.get('/movie-history');
      const meetingsData = response.data.sort((a: any, b: any) => 
        new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
      );
      setMeetings(meetingsData);
      
      // Fetch votes for each meeting
      const votesMap: Record<string, any[]> = {};
      const itemsMap: Record<string, any[]> = {};
      for (const meeting of meetingsData) {
        if (meeting.candidates && meeting.candidates.length > 0) {
          try {
            const candidatesResponse = await api.get(`/movie-history/${meeting._id}/candidates`);
            votesMap[meeting._id] = candidatesResponse.data.votes || [];
          } catch (error) {
            console.error(`Failed to fetch votes for meeting ${meeting._id}:`, error);
            votesMap[meeting._id] = [];
          }
        }
        
        // Fetch items for upcoming meetings
        const isUpcoming = meeting.status === 'upcoming' || new Date(meeting.watchedDate) > new Date();
        if (isUpcoming) {
          try {
            const itemsResponse = await api.get(`/items/event/${meeting._id}`);
            itemsMap[meeting._id] = itemsResponse.data || [];
          } catch (error: any) {
            if (error.response?.status !== 404) {
              console.error(`Failed to fetch items for meeting ${meeting._id}:`, error);
            }
            itemsMap[meeting._id] = [];
          }
        }
      }
      setMeetingVotes(votesMap);
      setMeetingItems(itemsMap);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const adminPassword = sessionStorage.getItem('adminPassword');
      if (!adminPassword) {
        console.error('No admin password in sessionStorage');
        setUsers([]);
        return;
      }
      
      const response = await api.get('/admin/users');
      console.log('Fetched users:', response.data);
      setUsers(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      console.error('Error response:', error.response);
      // Show error to user
      if (error.response?.status === 403) {
        // Admin password invalid or missing
        sessionStorage.removeItem('adminPassword');
        setIsAdminVerified(false);
        alert('Admin password required or invalid. Please enter admin password again.');
      } else {
        const errorMsg = error.response?.data?.error || error.message || 'Failed to fetch users';
        console.error('Fetch users error:', errorMsg);
        // Don't alert on every render, just log
      }
      setUsers([]);
    }
  };

  const fetchMovies = async () => {
    try {
      const response = await api.get('/movies');
      setMovies(response.data);
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    }
  };

  const verifyAdminPassword = async () => {
    try {
      setPasswordError('');
      if (!adminPassword.trim()) {
        setPasswordError('Password required');
        return;
      }
      // Verify password - this endpoint doesn't require authentication
      await api.post('/admin/verify-password', { password: adminPassword }, {
        headers: {
          // Don't send auth token if not logged in
          ...(localStorage.getItem('token') ? {} : { Authorization: '' })
        }
      });
      // Store password in sessionStorage for API requests
      sessionStorage.setItem('adminPassword', adminPassword);
      setAdminPassword('');
      setIsAdminVerified(true);
      // Fetch all data (users, movies, meetings) - all work with admin password
      fetchData();
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Invalid admin password');
    }
  };

  const createUser = async () => {
    try {
      if (!newUsername.trim()) {
        alert('Please enter a username');
        return;
      }
      await api.post('/admin/users', { username: newUsername.trim() });
      setNewUsername('');
      setShowCreateUser(false);
      // Refresh users list
      await fetchUsers();
      alert('User created successfully!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Failed to create user';
      alert(errorMsg);
      console.error('Create user error:', error);
    }
  };

  const resetUserPattern = async (userId: string, username: string) => {
    if (!confirm(`Reset pattern for ${username}? They will need to set a new pattern on next login.`)) return;
    try {
      await api.post(`/admin/users/${userId}/reset-pattern`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reset pattern');
    }
  };

  const handleMovieSearch = async () => {
    if (!movieSearchQuery.trim()) return;
    setIsSearchingMovies(true);
    try {
      const results = await searchMovies(movieSearchQuery.trim(), 1);
      setMovieSearchResults(results.results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Movie search error:', error);
      alert('Failed to search movies');
    } finally {
      setIsSearchingMovies(false);
    }
  };

  const handleAddMovieFromSearch = async (tmdbId: number) => {
    try {
      // Add movie to database if not exists
      const response = await api.post('/movies', { tmdbId });
      const movieId = response.data._id;
      if (!newMeeting.movieIds.includes(movieId)) {
        setNewMeeting({ ...newMeeting, movieIds: [...newMeeting.movieIds, movieId] });
      }
      setMovieSearchQuery('');
      setMovieSearchResults([]);
      fetchMovies(); // Refresh movies list
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add movie');
    }
  };

  const handleRemoveMovieFromMeeting = (movieId: string) => {
    setNewMeeting({
      ...newMeeting,
      movieIds: newMeeting.movieIds.filter(id => id !== movieId),
    });
  };

  const deleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
      return;
    }
    if (!window.confirm('This will permanently delete the meeting and all its ratings. Are you absolutely sure?')) {
      return;
    }

    setDeletingMeetingId(meetingId);
    try {
      await api.delete(`/movie-history/${meetingId}`);
      await fetchMeetings();
      alert('Meeting deleted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete meeting');
    } finally {
      setDeletingMeetingId(null);
    }
  };

  const openEditMeeting = (meeting: any) => {
    const d = new Date(meeting.watchedDate);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    setEditMeetingForm({
      watchedDate: local.toISOString().slice(0, 16),
      location: meeting.location || '',
      theme: meeting.theme || '',
    });
    setEditingMeeting(meeting);
  };

  const saveEditMeeting = async () => {
    if (!editingMeeting) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/movie-history/${editingMeeting._id}`, {
        watchedDate: editMeetingForm.watchedDate,
        location: editMeetingForm.location,
        theme: editMeetingForm.theme,
      });
      await fetchMeetings();
      setEditingMeeting(null);
      alert('Meeting updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update meeting');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleGenerateAISuggestions = async (meetingId: string) => {
    setGeneratingSuggestions({ ...generatingSuggestions, [meetingId]: true });
    try {
      const suggestions = await generateAISuggestions(meetingId);
      setAiSuggestions({ ...aiSuggestions, [meetingId]: suggestions });
      // Reset carousel to first item when new suggestions load
      setCarouselIndex({ ...carouselIndex, [meetingId]: 0 });
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate AI suggestions');
    } finally {
      setGeneratingSuggestions({ ...generatingSuggestions, [meetingId]: false });
    }
  };

  const handleGenerateAIRecommendation = async (meetingId: string) => {
    setGeneratingSuggestions({ ...generatingSuggestions, [meetingId]: true });
    try {
      const recommendation = await generateAIRecommendation(meetingId);
      if (recommendation) {
        setAiRecommendations({ ...aiRecommendations, [meetingId]: recommendation });
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to generate AI recommendation');
    } finally {
      setGeneratingSuggestions({ ...generatingSuggestions, [meetingId]: false });
    }
  };

  const handleAddCandidate = async (meetingId: string, movieId: string) => {
    try {
      await api.post(`/movie-history/${meetingId}/candidates`, { movieId });
      await fetchMeetings();
      alert('Movie added to voting options');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add movie to voting options');
    }
  };

  const handleRemoveCandidate = async (meetingId: string, movieId: string) => {
    try {
      await api.delete(`/movie-history/${meetingId}/candidates/${movieId}`);
      await fetchMeetings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove candidate');
    }
  };

  const handleSelectMovie = async (meetingId: string, movieId: string) => {
    if (!confirm('Set this movie as the selected movie for this meeting?')) return;
    try {
      await api.put(`/movie-history/${meetingId}`, { movieIds: [movieId] });
      await fetchMeetings();
      alert('Movie selected successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to select movie');
    }
  };

  const handleUnselectMovie = async (meetingId: string) => {
    if (!confirm('Unselect the movie for this meeting? Voting will continue.')) return;
    try {
      await api.put(`/movie-history/${meetingId}`, { movieIds: [] });
      await fetchMeetings();
      alert('Movie unselected successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to unselect movie');
    }
  };

  const handleAddItemToMeeting = async (meetingId: string) => {
    const itemName = newItemNames[meetingId];
    if (!itemName?.trim()) return;
    
    setIsAddingItem({ ...isAddingItem, [meetingId]: true });
    try {
      await api.post('/items', {
        eventId: meetingId,
        name: itemName.trim(),
      });
      setNewItemNames({ ...newItemNames, [meetingId]: '' });
      setShowAddItem({ ...showAddItem, [meetingId]: false });
      await fetchMeetings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add item');
    } finally {
      setIsAddingItem({ ...isAddingItem, [meetingId]: false });
    }
  };

  const handleDeleteItemFromMeeting = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await api.delete(`/items/${itemId}`);
      await fetchMeetings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleViewReviews = (movieId: string, movieTitle: string, moviePoster?: string) => {
    setReviewsModal({ movieId, movieTitle, moviePoster });
  };

  const handleViewMeetingReviews = (meeting: any) => {
    // Show reviews for all movies in this meeting
    const movies = meeting.movieIds || [];
    if (movies.length === 0) {
      alert('No movies in this meeting');
      return;
    }
    // For now, show reviews for the first movie (could be enhanced to show all)
    const firstMovie = movies[0];
    handleViewReviews(firstMovie._id, firstMovie.title, firstMovie.poster);
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${username}? This action cannot be undone.`)) {
      return;
    }

    // Double confirmation
    if (!window.confirm(`Final confirmation: Delete ${username}?`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      alert('User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  // Show loading state while fetching data (only if admin password verified)
  if (isAdminVerified && loading) {
    return (
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-loading">Loading...</div>
        </div>
      </div>
    );
  }

  // Show password form if admin password not verified
  if (!isAdminVerified) {
    return (
      <div className="admin-page">
        <header className="admin-header">
          <Link to="/" className="admin-nav-link">← HOME</Link>
          <h1>ADMIN ACCESS</h1>
          <div style={{ width: '100px' }}></div>
        </header>
        <div className="admin-container">
          <section className="admin-section">
            <h2>ENTER ADMIN PASSWORD</h2>
            {!user && (
              <p style={{ marginBottom: '1rem', fontFamily: 'Courier New, monospace', color: '#aa0000' }}>
                You must be logged in to access admin. Please log in first.
              </p>
            )}
            {user && (
              <p style={{ marginBottom: '1rem', fontFamily: 'Courier New, monospace' }}>
                Logged in as: <strong style={{ color: user.displayNameColor || '#000' }}>
                  {user.displayName || user.username}
                </strong>
              </p>
            )}
            <div className="admin-password-form">
              <div className="form-group">
                <label>ADMIN PASSWORD</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      verifyAdminPassword();
                    }
                  }}
                  placeholder="Enter admin password"
                  autoFocus
                />
                {passwordError && <span className="error-message">{passwordError}</span>}
              </div>
              <button className="admin-button" onClick={verifyAdminPassword}>
                VERIFY & ACCESS ADMIN
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="admin-loading">Loading...</div>;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="admin-nav-link">← HOME</Link>
        <h1>ADMIN PANEL</h1>
        <div style={{ width: '100px' }}></div>
      </header>
      <div className="admin-container">
        <section className="admin-section">
          <h2>MEETINGS</h2>
          <button className="admin-button" onClick={() => setShowCreateMeeting(!showCreateMeeting)}>
            {showCreateMeeting ? 'CANCEL' : 'CREATE MEETING'}
          </button>

          {showCreateMeeting && (
            <div className="create-cycle-form">
              <div className="form-group">
                <label>MOVIE (OPTIONAL - LEAVE EMPTY FOR VOTING SESSION)</label>
                <div className="movie-search-section">
                  <div className="search-input-group">
                    <input
                      type="text"
                      value={movieSearchQuery}
                      onChange={(e) => setMovieSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleMovieSearch()}
                      placeholder="Search for movie..."
                      className="movie-search-input"
                    />
                    <button
                      type="button"
                      onClick={handleMovieSearch}
                      disabled={isSearchingMovies}
                      className="search-btn"
                    >
                      {isSearchingMovies ? 'SEARCHING...' : 'SEARCH'}
                    </button>
                  </div>
                  {movieSearchResults.length > 0 && (
                    <div className="movie-search-results">
                      {movieSearchResults.map((movie) => (
                        <div
                          key={movie.id}
                          className="movie-search-result-item"
                          onClick={() => handleAddMovieFromSearch(movie.id)}
                        >
                          {movie.poster && <img src={movie.poster} alt={movie.title} />}
                          <div>
                            <h4>{movie.title}</h4>
                            <p>{movie.overview?.substring(0, 100)}...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {newMeeting.movieIds.length > 0 && (
                    <div className="selected-movies-list">
                      <p className="selected-movie-label">SELECTED MOVIES ({newMeeting.movieIds.length}):</p>
                      {newMeeting.movieIds.map((movieId) => {
                        const movie = movies.find(m => m._id === movieId);
                        return movie ? (
                          <div key={movieId} className="selected-movie-item">
                            <span>{movie.title}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMovieFromMeeting(movieId)}
                              className="remove-movie-btn"
                            >
                              ✕
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>MEETING DATE</label>
                <input
                  type="datetime-local"
                  value={newMeeting.watchedDate}
                  onChange={(e) => setNewMeeting({ ...newMeeting, watchedDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>LOCATION (OPTIONAL)</label>
                <input
                  type="text"
                  value={newMeeting.location}
                  onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                  placeholder="e.g., hayarden 96 - Ramat gan"
                />
              </div>
              <div className="form-group">
                <label>THEME (OPTIONAL - FOR AI SUGGESTIONS)</label>
                <input
                  type="text"
                  value={newMeeting.theme}
                  onChange={(e) => setNewMeeting({ ...newMeeting, theme: e.target.value })}
                  placeholder="e.g., sci-fi classics, horror comedies, foreign films"
                />
              </div>
              <button
                className="admin-button"
                onClick={async () => {
                  try {
                    if (!newMeeting.watchedDate) {
                      alert('Please fill in the meeting date');
                      return;
                    }
                    await api.post('/movie-history', {
                      ...newMeeting,
                      movieIds: newMeeting.movieIds.length > 0 ? newMeeting.movieIds : undefined,
                    });
                    alert('Meeting created successfully');
                    setNewMeeting({ movieIds: [], watchedDate: '', location: '', theme: '' });
                    setShowCreateMeeting(false);
                    await fetchMeetings();
                  } catch (error: any) {
                    alert(error.response?.data?.error || 'Failed to create meeting');
                  }
                }}
              >
                CREATE MEETING
              </button>
            </div>
          )}

          {meetings.length > 0 && (
            <div className="meetings-list-admin" style={{ marginTop: '2rem' }}>
              <h3 style={{ fontFamily: 'Courier New, monospace', fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'uppercase' }}>
                EXISTING MEETINGS ({meetings.length})
              </h3>
              <div className="meetings-grid">
                {meetings.map((meeting) => {
                  const isUpcoming = meeting.status === 'upcoming' || new Date(meeting.watchedDate) > new Date();
                  return (
                    <div key={meeting._id} className={`meeting-card-admin ${isUpcoming ? 'upcoming-meeting' : ''}`}>
                      {isUpcoming && (
                        <span className="upcoming-badge-admin">UPCOMING</span>
                      )}
                      <div className="meeting-card-content">
                        <div className="meeting-movies-admin">
                          {(meeting.movieIds || (meeting.movieId ? [meeting.movieId] : [])).map((movie: any, idx: number) => (
                            <div key={movie._id || idx} className="meeting-movie-item-admin">
                              {movie.poster && (
                                <img src={movie.poster} alt={movie.title} className="meeting-poster-admin" />
                              )}
                              <span className="meeting-movie-title">{movie.title}</span>
                            </div>
                          ))}
                          {isUpcoming && (!meeting.movieIds || meeting.movieIds.length === 0) && (
                            <div className="voting-in-progress-message">
                              <span>🗳️ VOTING STILL IN PROGRESS</span>
                            </div>
                          )}
                        </div>
                        <div className="meeting-info-admin">
                          <p className="meeting-date-admin">
                            {new Date(meeting.watchedDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              ...(isUpcoming && { hour: '2-digit', minute: '2-digit' }),
                            })}
                          </p>
                          {meeting.location && (
                            <p className="meeting-location-admin">📍 {meeting.location}</p>
                          )}
                          {!isUpcoming && (
                            <div className="ratings-summary-admin">
                              <span>Movie: {meeting.averageRating > 0 ? meeting.averageRating.toFixed(1) : 'N/A'} ⭐</span>
                              <span>Gathering: {meeting.averageGatheringRating > 0 ? meeting.averageGatheringRating.toFixed(1) : 'N/A'} ⭐</span>
                            </div>
                          )}
                          <div className="meeting-actions-admin">
                            <button
                              className="edit-meeting-btn"
                              onClick={() => openEditMeeting(meeting)}
                            >
                              EDIT
                            </button>
                            {(meeting.movieIds?.length > 0) && (
                              <>
                                <button
                                  className="view-reviews-btn"
                                  onClick={() => handleViewMeetingReviews(meeting)}
                                >
                                  VIEW REVIEWS
                                </button>
                                {isUpcoming && (
                                  <button
                                    className="unselect-movie-btn"
                                    onClick={() => handleUnselectMovie(meeting._id)}
                                  >
                                    UNSELECT MOVIE
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              className="delete-meeting-btn"
                              onClick={() => deleteMeeting(meeting._id)}
                              disabled={deletingMeetingId === meeting._id}
                            >
                              {deletingMeetingId === meeting._id ? 'DELETING...' : 'DELETE'}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {editingMeeting?._id === meeting._id && (
                        <div className="edit-meeting-modal">
                          <h3 className="edit-meeting-title">EDIT MEETING</h3>
                          <div className="edit-meeting-form">
                            <div className="form-group">
                              <label>MEETING DATE & TIME</label>
                              <input
                                type="datetime-local"
                                value={editMeetingForm.watchedDate}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, watchedDate: e.target.value })}
                              />
                            </div>
                            <div className="form-group">
                              <label>LOCATION (OPTIONAL)</label>
                              <input
                                type="text"
                                value={editMeetingForm.location}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, location: e.target.value })}
                                placeholder="e.g., hayarden 96 - Ramat gan"
                              />
                            </div>
                            <div className="form-group">
                              <label>THEME (OPTIONAL)</label>
                              <input
                                type="text"
                                value={editMeetingForm.theme}
                                onChange={(e) => setEditMeetingForm({ ...editMeetingForm, theme: e.target.value })}
                                placeholder="e.g., sci-fi classics, horror comedies"
                              />
                            </div>
                            <div className="edit-meeting-actions">
                              <button
                                className="admin-button"
                                onClick={() => setEditingMeeting(null)}
                                disabled={isSavingEdit}
                              >
                                CANCEL
                              </button>
                              <button
                                className="admin-button"
                                onClick={saveEditMeeting}
                                disabled={isSavingEdit}
                              >
                                {isSavingEdit ? 'SAVING...' : 'SAVE'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Bring List Section for upcoming meetings */}
                      {isUpcoming && (
                        <div className="bring-list-section-admin">
                          <div className="bring-list-header-admin">
                            <h4 className="bring-list-title-admin">BRING LIST</h4>
                            <button
                              className="add-item-btn-admin"
                              onClick={() => setShowAddItem({ ...showAddItem, [meeting._id]: !showAddItem[meeting._id] })}
                            >
                              {showAddItem[meeting._id] ? 'CANCEL' : '+ ADD ITEM'}
                            </button>
                          </div>
                          
                          {showAddItem[meeting._id] && (
                            <div className="add-item-form-admin">
                              <input
                                type="text"
                                value={newItemNames[meeting._id] || ''}
                                onChange={(e) => setNewItemNames({ ...newItemNames, [meeting._id]: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItemToMeeting(meeting._id)}
                                placeholder="e.g., Chips, Soda, Popcorn..."
                                className="add-item-input-admin"
                                disabled={isAddingItem[meeting._id]}
                              />
                              <button
                                onClick={() => handleAddItemToMeeting(meeting._id)}
                                disabled={!newItemNames[meeting._id]?.trim() || isAddingItem[meeting._id]}
                                className="submit-item-btn-admin"
                              >
                                {isAddingItem[meeting._id] ? 'ADDING...' : 'ADD'}
                              </button>
                            </div>
                          )}
                          
                          {meetingItems[meeting._id] && meetingItems[meeting._id].length > 0 ? (
                            <div className="items-list-admin">
                              {meetingItems[meeting._id].map((item: any) => (
                                <div key={item._id} className="item-card-admin">
                                  <span className="item-name-admin">{item.name.toUpperCase()}</span>
                                  <div className="item-actions-admin">
                                    {item.status === 'claimed' && item.claimedBy ? (
                                      <span 
                                        className="item-claimed-admin"
                                        style={{ 
                                          color: item.claimedBy.displayNameColor || '#000',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {item.claimedBy.displayName || item.claimedBy.username}
                                      </span>
                                    ) : (
                                      <span className="item-available-admin">AVAILABLE</span>
                                    )}
                                    <button
                                      onClick={() => handleDeleteItemFromMeeting(item._id)}
                                      className="delete-item-btn-admin"
                                      title="Delete item"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="no-items-message-admin">No items yet. Add items to bring.</p>
                          )}
                        </div>
                      )}
                      
                      {/* Candidates Section for meetings without movies */}
                      {isUpcoming && (!meeting.movieIds || meeting.movieIds.length === 0) && (
                        <div className="ai-suggestions-section">
                          <h4 className="ai-suggestions-title">VOTING CANDIDATES</h4>
                          
                          {/* Show existing candidates with votes */}
                          {meeting.candidates && meeting.candidates.length > 0 && (() => {
                            const votes = meetingVotes[meeting._id] || [];
                            
                            // Calculate vote counts for each candidate and sort by best
                            const candidatesWithVotes = meeting.candidates.map((candidate: any) => {
                              const candidateId = candidate._id || candidate;
                              const candidateVotes = votes.filter((v: any) => {
                                const vMovieId = v.movieId?._id || v.movieId;
                                return vMovieId === candidateId || vMovieId?.toString() === candidateId?.toString();
                              });
                              const yesVotes = candidateVotes.filter((v: any) => v.voteType === 'yes').length;
                              const noVotes = candidateVotes.filter((v: any) => v.voteType === 'no').length;
                              const totalVotes = yesVotes + noVotes;
                              const score = totalVotes > 0 ? yesVotes / totalVotes : 0;
                              
                              return {
                                ...candidate,
                                yesVotes,
                                noVotes,
                                totalVotes,
                                score,
                              };
                            }).sort((a: any, b: any) => {
                              // Sort by: highest yes votes first, then by highest score
                              if (b.yesVotes !== a.yesVotes) {
                                return b.yesVotes - a.yesVotes;
                              }
                              return b.score - a.score;
                            });
                            
                            return (
                              <div className="candidates-list">
                                <h5 className="candidates-list-title">
                                  VOTING RESULTS ({candidatesWithVotes.length} CANDIDATES) - ORDERED BY BEST
                                </h5>
                                <div className="candidates-grid">
                                  {candidatesWithVotes.map((candidate: any) => {
                                    const candidateId = candidate._id || candidate;
                                    const candidateVotes = (meetingVotes[meeting._id] || []).filter((v: any) => {
                                      const vMovieId = v.movieId?._id || v.movieId;
                                      return vMovieId === candidateId || vMovieId?.toString() === candidateId?.toString();
                                    });
                                    return (
                                      <div key={candidateId} className="candidate-item">
                                        {candidate.poster && (
                                          <img 
                                            src={candidate.poster} 
                                            alt={candidate.title} 
                                            className="candidate-poster"
                                            onClick={() => {
                                              if (candidateVotes.length > 0) {
                                                setVotesModal({
                                                  movieTitle: candidate.title,
                                                  moviePoster: candidate.poster,
                                                  votes: candidateVotes,
                                                });
                                              }
                                            }}
                                            style={{ cursor: candidateVotes.length > 0 ? 'pointer' : 'default' }}
                                          />
                                        )}
                                        <span className="candidate-title">{candidate.title}</span>
                                        <div className="candidate-votes">
                                          <div className="vote-count yes-votes">👍 {candidate.yesVotes}</div>
                                          <div className="vote-count no-votes">👎 {candidate.noVotes}</div>
                                        </div>
                                        <button
                                          className="select-movie-btn"
                                          onClick={() => handleSelectMovie(meeting._id, candidateId)}
                                        >
                                          SELECT AS MOVIE
                                        </button>
                                        <button
                                          className="remove-candidate-btn"
                                          onClick={() => handleRemoveCandidate(meeting._id, candidateId)}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}


                          {/* AI Recommendation */}
                          {meeting.candidates && meeting.candidates.length > 0 && meetingVotes[meeting._id] && meetingVotes[meeting._id].length > 0 && (
                            <div className="ai-recommendation-section">
                              <h5 className="ai-recommendation-title">AI RECOMMENDATION</h5>
                              {!aiRecommendations[meeting._id] && !generatingSuggestions[meeting._id] && (
                                <button
                                  className="ai-button ai-recommendation-button"
                                  onClick={() => handleGenerateAIRecommendation(meeting._id)}
                                >
                                  GET AI RECOMMENDATION
                                </button>
                              )}
                              {generatingSuggestions[meeting._id] && !aiRecommendations[meeting._id] && (
                                <div className="ai-suggestions-loading">Analyzing votes and generating recommendation...</div>
                              )}
                              {aiRecommendations[meeting._id] && (
                                <div className="ai-recommendation-card">
                                  <div className="ai-recommendation-header">
                                    <h6 className="ai-recommendation-label">RECOMMENDED CANDIDATE</h6>
                                    {aiRecommendations[meeting._id].poster && (
                                      <img src={aiRecommendations[meeting._id].poster} alt={aiRecommendations[meeting._id].title} className="ai-recommendation-poster" />
                                    )}
                                  </div>
                                  <h4 className="ai-recommendation-movie-title">{aiRecommendations[meeting._id].title}</h4>
                                  <p className="ai-recommendation-reason">{aiRecommendations[meeting._id].reason}</p>
                                  <button
                                    className="select-recommended-movie-btn"
                                    onClick={() => handleSelectMovie(meeting._id, aiRecommendations[meeting._id].movieId)}
                                  >
                                    SELECT THIS MOVIE
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* AI Suggestions */}
                          <div className="ai-suggestions-subsection">
                            <h5 className="ai-suggestions-subtitle">AI SUGGESTIONS</h5>
                            {!aiSuggestions[meeting._id] && !generatingSuggestions[meeting._id] && (
                              <button
                                className="ai-button"
                                onClick={() => handleGenerateAISuggestions(meeting._id)}
                              >
                                GENERATE AI SUGGESTIONS
                              </button>
                            )}
                            {generatingSuggestions[meeting._id] && !aiRecommendations[meeting._id] && (
                              <div className="ai-suggestions-loading">Generating AI suggestions...</div>
                            )}
                            {aiSuggestions[meeting._id] && aiSuggestions[meeting._id].length > 0 && (
                            <div className="ai-suggestions-carousel-container">
                              <div className="carousel-header">
                                <p className="ai-suggestions-count">
                                  {aiSuggestions[meeting._id].length} suggestions
                                </p>
                                <div className="carousel-nav-buttons-top">
                                  <button
                                    className="carousel-nav-btn carousel-prev"
                                    onClick={() => {
                                      const currentIndex = carouselIndex[meeting._id] || 0;
                                      const newIndex = currentIndex > 0 ? currentIndex - 1 : aiSuggestions[meeting._id].length - 1;
                                      setCarouselIndex({ ...carouselIndex, [meeting._id]: newIndex });
                                    }}
                                    aria-label="Previous suggestion"
                                  >
                                    ← PREV
                                  </button>
                                  <button
                                    className="carousel-nav-btn carousel-next"
                                    onClick={() => {
                                      const currentIndex = carouselIndex[meeting._id] || 0;
                                      const newIndex = currentIndex < aiSuggestions[meeting._id].length - 1 ? currentIndex + 1 : 0;
                                      setCarouselIndex({ ...carouselIndex, [meeting._id]: newIndex });
                                    }}
                                    aria-label="Next suggestion"
                                  >
                                    NEXT →
                                  </button>
                                </div>
                              </div>
                              <div className="carousel-viewport-wrapper">
                                <div className="carousel-viewport">
                                  <div
                                    className="carousel-track"
                                    style={{
                                      transform: `translateX(-${(carouselIndex[meeting._id] || 0) * 100}%)`,
                                    }}
                                  >
                                    {aiSuggestions[meeting._id].map((suggestion: any) => (
                                      <div key={suggestion.movieId} className="carousel-slide">
                                        <div className="carousel-movie-card">
                                          <h5 className="carousel-movie-title">{suggestion.title}</h5>
                                          {suggestion.poster && (
                                            <div className="carousel-poster-container">
                                              <img
                                                src={suggestion.poster}
                                                alt={suggestion.title}
                                                className="carousel-poster"
                                              />
                                            </div>
                                          )}
                                          <p className="carousel-movie-description">
                                            {suggestion.description || 'No description available'}
                                          </p>
                                          <div className="carousel-movie-actions">
                                            <button
                                              className="view-reviews-btn-small"
                                              onClick={() => handleViewReviews(suggestion.movieId, suggestion.title, suggestion.poster)}
                                            >
                                              VIEW REVIEWS
                                            </button>
                                            <button
                                              className="add-to-meeting-btn"
                                              onClick={() => handleAddCandidate(meeting._id, suggestion.movieId)}
                                            >
                                              ADD TO VOTING OPTIONS
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="carousel-indicators">
                                {aiSuggestions[meeting._id].map((_: any, idx: number) => (
                                  <button
                                    key={idx}
                                    className={`carousel-indicator ${(carouselIndex[meeting._id] || 0) === idx ? 'active' : ''}`}
                                    onClick={() => setCarouselIndex({ ...carouselIndex, [meeting._id]: idx })}
                                    aria-label={`Go to suggestion ${idx + 1}`}
                                  />
                                ))}
                              </div>
                            </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Reviews Modal */}
        {reviewsModal && (
          <MovieReviewsModal
            movieId={reviewsModal.movieId}
            movieTitle={reviewsModal.movieTitle}
            moviePoster={reviewsModal.moviePoster}
            onClose={() => setReviewsModal(null)}
          />
        )}

        {/* Votes Modal */}
        {votesModal && (
          <VotesModal
            movieTitle={votesModal.movieTitle}
            moviePoster={votesModal.moviePoster}
            votes={votesModal.votes}
            onClose={() => setVotesModal(null)}
          />
        )}

        <section className="admin-section">
          <h2>USER MANAGEMENT</h2>
          <button className="admin-button" onClick={() => setShowCreateUser(!showCreateUser)}>
            {showCreateUser ? 'CANCEL' : 'CREATE NEW USER'}
          </button>

          {showCreateUser && (
            <div className="create-user-form">
              <div className="form-group">
                <label>USERNAME</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      createUser();
                    }
                  }}
                  placeholder="Enter username"
                />
              </div>
              <button className="admin-button" onClick={createUser}>
                CREATE USER
              </button>
            </div>
          )}

          <div className="users-list">
            {users.length === 0 ? (
              <p style={{ fontFamily: 'Courier New, monospace', marginTop: '1rem' }}>
                No users found.
              </p>
            ) : (
              users.map((u) => (
                <div key={u._id} className="user-card">
                  <div className="user-info">
                    {u.avatar && (
                      <img 
                        src={u.avatar} 
                        alt={u.displayName || u.username} 
                        className="user-avatar"
                      />
                    )}
                    <div className="user-details">
                      <span className="username">{u.username}</span>
                      <span className="user-date">
                        Joined: {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                      {u.hasPattern === false ? (
                        <span className="user-status">No pattern set</span>
                      ) : (
                        <span className="user-status" style={{ color: '#000', fontStyle: 'normal' }}>
                          Pattern set
                        </span>
                      )}
                      {u.displayName && (
                        <span 
                          className="user-display-name" 
                          style={{ color: u.displayNameColor || '#000', fontWeight: 'bold' }}
                        >
                          Display: {u.displayName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="user-actions">
                    {user && u._id.toString() === user.id ? (
                      <span className="admin-badge">YOU</span>
                    ) : (
                      <>
                        <button
                          className="admin-button small"
                          onClick={() => resetUserPattern(u._id, u.displayName || u.username)}
                        >
                          RESET PATTERN
                        </button>
                        <button
                          className="admin-button small delete-btn"
                          onClick={() => deleteUser(u._id, u.displayName || u.username)}
                          disabled={deletingUserId === u._id}
                        >
                          {deletingUserId === u._id ? 'DELETING...' : 'DELETE'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Admin;
