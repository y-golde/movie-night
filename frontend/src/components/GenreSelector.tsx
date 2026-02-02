import './GenreSelector.css';

const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
];

interface GenreSelectorProps {
  selectedGenres: string[];
  onGenreToggle: (genre: string) => void;
}

const GenreSelector = ({ selectedGenres, onGenreToggle }: GenreSelectorProps) => {
  return (
    <div className="genre-selector">
      <h3>SELECT YOUR FAVORITE GENRES (MIN 3)</h3>
      <div className="genre-grid">
        {GENRES.map((genre) => {
          const isSelected = selectedGenres.includes(genre);
          return (
            <button
              key={genre}
              type="button"
              className={`genre-button ${isSelected ? 'selected' : ''}`}
              onClick={() => onGenreToggle(genre)}
            >
              {genre.toUpperCase()}
            </button>
          );
        })}
      </div>
      <p className="genre-count">
        {selectedGenres.length} / 3+ SELECTED
      </p>
    </div>
  );
};

export default GenreSelector;
