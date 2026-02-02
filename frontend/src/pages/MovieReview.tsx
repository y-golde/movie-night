import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './MovieReview.css';

const MovieReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [movieHistory, setMovieHistory] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchMovieHistory();
    }
  }, [id]);

  const fetchMovieHistory = async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setMovieHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch movie history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (comment.length < 50) {
      alert('Comment must be at least 50 characters');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/reviews/${id}/reviews`, { rating, comment });
      navigate('/');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="review-loading">Loading...</div>;
  }

  if (!movieHistory) {
    return <div className="review-error">Movie not found</div>;
  }

  return (
    <div className="review-page">
      <div className="review-container">
        <h1>REVIEW MOVIE</h1>
        <h2>{movieHistory.movieId?.title?.toUpperCase()}</h2>

        <form onSubmit={handleSubmit} className="review-form">
          <div className="rating-section">
            <label>RATING</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= rating ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="rating-value">{rating} / 5</span>
          </div>

          <div className="comment-section">
            <label htmlFor="comment">COMMENT (MIN 50 CHARACTERS)</label>
            <textarea
              id="comment"
              className="comment-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this movie..."
              rows={8}
              required
              minLength={50}
            />
            <span className="character-count">{comment.length} / 50+</span>
          </div>

          <div className="review-actions">
            <button type="button" onClick={() => navigate('/')} className="cancel-button">
              CANCEL
            </button>
            <button type="submit" className="submit-button" disabled={submitting || comment.length < 50}>
              {submitting ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovieReview;
