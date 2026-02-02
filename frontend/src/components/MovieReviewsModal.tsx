import { useState, useEffect } from 'react';
import { getMovieReviews } from '../services/api';
import './MovieReviewsModal.css';

interface Review {
  _id: string;
  userId: {
    username: string;
    displayName?: string;
    displayNameColor?: string;
    avatar?: string;
  };
  rating: number;
  comment: string;
  meeting: {
    _id: string;
    watchedDate: string;
    location?: string;
  };
}

interface MovieReviewsModalProps {
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  onClose: () => void;
}

const MovieReviewsModal = ({ movieId, movieTitle, moviePoster, onClose }: MovieReviewsModalProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const data = await getMovieReviews(movieId);
        setReviews(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [movieId]);

  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="movie-reviews-modal-overlay" onClick={onClose}>
      <div className="movie-reviews-modal" onClick={(e) => e.stopPropagation()}>
        <div className="movie-reviews-modal-header">
          <div className="movie-reviews-modal-title-section">
            {moviePoster && (
              <img src={moviePoster} alt={movieTitle} className="movie-reviews-modal-poster" />
            )}
            <div>
              <h2>{movieTitle}</h2>
              <p className="movie-reviews-modal-subtitle">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          <button className="movie-reviews-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="movie-reviews-modal-content">
          {loading && (
            <div className="movie-reviews-modal-loading">Loading reviews...</div>
          )}

          {error && (
            <div className="movie-reviews-modal-error">{error}</div>
          )}

          {!loading && !error && reviews.length === 0 && (
            <div className="movie-reviews-modal-empty">
              No reviews yet for this movie.
            </div>
          )}

          {!loading && !error && reviews.length > 0 && (
            <div className="movie-reviews-list">
              {reviews.map((review) => (
                <div key={review._id} className="movie-review-item">
                  <div className="movie-review-header">
                    <div className="movie-review-user">
                      {review.userId.avatar && (
                        <img
                          src={review.userId.avatar}
                          alt={review.userId.displayName || review.userId.username}
                          className="movie-review-avatar"
                        />
                      )}
                      <span
                        className="movie-review-username"
                        style={{ color: review.userId.displayNameColor || '#000' }}
                      >
                        {review.userId.displayName || review.userId.username}
                      </span>
                    </div>
                    <div className="movie-review-rating">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="movie-review-comment">{review.comment}</p>
                  <div className="movie-review-meta">
                    <span className="movie-review-date">
                      {new Date(review.meeting.watchedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    {review.meeting.location && (
                      <span className="movie-review-location">📍 {review.meeting.location}</span>
                    )}
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

export default MovieReviewsModal;
