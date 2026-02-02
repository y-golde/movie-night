import { useState, useEffect } from 'react';
import { searchMovies, getMovieDetails, type MovieSearchResult } from '../services/tmdb';
import './FavoriteMoviesSelector.css';

interface FavoriteMoviesSelectorProps {
  selectedMovies: number[];
  onMovieToggle: (tmdbId: number) => void;
}

const FavoriteMoviesSelector = ({ selectedMovies, onMovieToggle }: FavoriteMoviesSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState<MovieSearchResult[]>([]);

  // Sync selectedMovieDetails with selectedMovies prop
  useEffect(() => {
    const syncMovieDetails = async () => {
      // Get current state and filter to only keep selected movies
      setSelectedMovieDetails(prev => {
        const filtered = prev.filter(m => selectedMovies.includes(m.id));
        const existingIds = filtered.map(m => m.id);
        const missingIds = selectedMovies.filter(id => !existingIds.includes(id));
        
        // Fetch missing movies asynchronously
        if (missingIds.length > 0) {
          (async () => {
            try {
              const movieDetails = await Promise.all(missingIds.map(id => getMovieDetails(id)));
              
              // Convert to MovieSearchResult format
              const formattedMovies: MovieSearchResult[] = movieDetails.map(movie => {
                // Handle both backend response format and TMDB format
                const releaseDate = movie.releaseDate 
                  ? (movie.releaseDate instanceof Date 
                      ? movie.releaseDate.toISOString().split('T')[0]
                      : typeof movie.releaseDate === 'string' 
                        ? movie.releaseDate 
                        : '')
                  : '';
                
                return {
                  id: movie.tmdbId || movie.id,
                  title: movie.title,
                  overview: movie.overview || movie.description || '',
                  poster: movie.poster || (movie.posterPath ? `https://image.tmdb.org/t/p/w500${movie.posterPath}` : null),
                  releaseDate: releaseDate,
                  genreIds: movie.genreIds || [],
                };
              });
              
              setSelectedMovieDetails(prevState => {
                const existingIds = prevState.map(m => m.id);
                const newMovies = formattedMovies.filter(m => !existingIds.includes(m.id));
                return [...prevState, ...newMovies];
              });
            } catch (error) {
              console.error('Error loading saved movies:', error);
            }
          })();
        }
        
        return filtered;
      });
    };
    
    syncMovieDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMovies]); // Only depend on selectedMovies to avoid loops

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchMovies(searchQuery.trim(), 1);
      setSearchResults(results.results.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMovieSelect = async (movie: MovieSearchResult) => {
    if (selectedMovies.includes(movie.id)) {
      // Deselect
      onMovieToggle(movie.id);
      setSelectedMovieDetails(selectedMovieDetails.filter((m) => m.id !== movie.id));
    } else {
      // Select (max 5)
      if (selectedMovies.length >= 5) {
        alert('Maximum 5 favorite movies allowed');
        return;
      }
      onMovieToggle(movie.id);
      setSelectedMovieDetails([...selectedMovieDetails, movie]);
    }
  };

  return (
    <div className="favorite-movies-selector">
      <h3>SELECT 3-5 FAVORITE MOVIES</h3>
      
      <div className="search-section">
        <input
          type="text"
          className="movie-search-input"
          placeholder="SEARCH MOVIES..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button type="button" className="search-button" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((movie) => {
            const isSelected = selectedMovies.includes(movie.id);
            return (
              <div
                key={movie.id}
                className={`movie-result-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleMovieSelect(movie)}
              >
                {movie.poster && (
                  <img src={movie.poster} alt={movie.title} className="movie-poster" />
                )}
                <div className="movie-info">
                  <h4>{movie.title}</h4>
                  <p>{movie.releaseDate}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedMovieDetails.length > 0 && (
        <div className="selected-movies">
          <h4>SELECTED MOVIES ({selectedMovieDetails.length}/5)</h4>
          <div className="selected-movies-grid">
            {selectedMovieDetails.map((movie) => (
              <div key={movie.id} className="selected-movie-card">
                {movie.poster && (
                  <img src={movie.poster} alt={movie.title} className="movie-poster-small" />
                )}
                <p>{movie.title}</p>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => handleMovieSelect(movie)}
                >
                  REMOVE
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoriteMoviesSelector;
