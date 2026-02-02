import './MovieCard.css';

interface MovieCardProps {
  movie: {
    _id?: string;
    title: string;
    poster: string;
    description: string;
    trailer?: string;
    genres?: string[];
    releaseDate?: string | Date;
    runtime?: number;
  };
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const formatReleaseYear = (date: string | Date | undefined): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.getFullYear().toString();
  };

  const calculateAge = (date: string | Date | undefined): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const currentYear = new Date().getFullYear();
    const releaseYear = dateObj.getFullYear();
    const age = currentYear - releaseYear;
    return age === 0 ? 'NEW' : `${age} ${age === 1 ? 'YEAR' : 'YEARS'} OLD`;
  };

  const formatRuntime = (minutes?: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}M`;
    if (mins === 0) return `${hours}H`;
    return `${hours}H ${mins}M`;
  };

  return (
    <div className="movie-card">
      {movie.poster && (
        <div className="movie-card-poster-wrapper">
          <img src={movie.poster} alt={movie.title} className="movie-card-poster" />
          <div className="movie-card-overlay">
            <div className="swipe-hint-left">← DISLIKE</div>
            <div className="swipe-hint-right">LIKE →</div>
          </div>
        </div>
      )}
      <div className="movie-card-content">
        <div className="movie-card-header">
          <h2 className="movie-card-title">{movie.title.toUpperCase()}</h2>
          <div className="movie-card-meta">
            {movie.releaseDate ? (
              <div className="meta-badge age-badge">
                <span className="meta-label">AGE</span>
                <span className="meta-value">{calculateAge(movie.releaseDate)}</span>
              </div>
            ) : null}
            {movie.runtime ? (
              <div className="meta-badge runtime-badge">
                <span className="meta-label">⏱</span>
                <span className="meta-value">{formatRuntime(movie.runtime)}</span>
              </div>
            ) : null}
            {movie.releaseDate ? (
              <div className="meta-badge year-badge">
                <span className="meta-value">{formatReleaseYear(movie.releaseDate)}</span>
              </div>
            ) : null}
          </div>
        </div>
        
        {/* Genres as cute badges */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="movie-genres">
            {movie.genres.map((genre, index) => (
              <span key={index} className="genre-badge">
                {genre.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        <p className="movie-card-description">{movie.description}</p>
        <a
          href={movie.trailer || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="movie-card-trailer"
          onClick={(e) => {
            if (!movie.trailer) {
              e.preventDefault();
            }
          }}
          style={{ 
            opacity: movie.trailer ? 1 : 0.5,
            cursor: movie.trailer ? 'pointer' : 'not-allowed'
          }}
        >
          🎬 {movie.trailer ? 'WATCH TRAILER →' : 'NO TRAILER AVAILABLE'}
        </a>
      </div>
    </div>
  );
};

export default MovieCard;
