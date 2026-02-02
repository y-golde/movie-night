import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  genre_ids: number[];
  backdrop_path: string | null;
}

interface TMDBSearchResponse {
  results: TMDBMovie[];
  total_results: number;
  total_pages: number;
}

interface TMDBMovieDetails extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  videos: {
    results: {
      key: string;
      type: string;
      site: string;
    }[];
  };
}

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export const searchMovies = async (query: string, page: number = 1): Promise<TMDBSearchResponse> => {
  try {
    const response = await tmdbClient.get('/search/movie', {
      params: {
        query,
        page,
      },
    });
    return response.data;
  } catch (error) {
    console.error('TMDB search error:', error);
    throw new Error('Failed to search movies');
  }
};

export const getMovieDetails = async (movieId: number): Promise<TMDBMovieDetails> => {
  try {
    const response = await tmdbClient.get(`/movie/${movieId}`, {
      params: {
        append_to_response: 'videos',
      },
    });
    return response.data;
  } catch (error) {
    console.error('TMDB details error:', error);
    throw new Error('Failed to fetch movie details');
  }
};

export const getMoviePosterUrl = (posterPath: string | null): string => {
  if (!posterPath) {
    return 'https://via.placeholder.com/500x750?text=No+Poster';
  }
  return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
};

export const getMovieTrailer = (movieDetails: TMDBMovieDetails): string | null => {
  const trailers = movieDetails.videos?.results || [];
  const youtubeTrailer = trailers.find(
    (video) => video.site === 'YouTube' && video.type === 'Trailer'
  );
  return youtubeTrailer ? `https://www.youtube.com/watch?v=${youtubeTrailer.key}` : null;
};

export const formatMovieForDB = (tmdbMovie: TMDBMovieDetails): {
  tmdbId: number;
  title: string;
  poster: string;
  trailer: string | null;
  description: string;
  genres: string[];
  releaseDate: Date;
  runtime?: number;
} => {
  return {
    tmdbId: tmdbMovie.id,
    title: tmdbMovie.title,
    poster: getMoviePosterUrl(tmdbMovie.poster_path),
    trailer: getMovieTrailer(tmdbMovie),
    description: tmdbMovie.overview,
    genres: tmdbMovie.genres.map((g) => g.name),
    releaseDate: new Date(tmdbMovie.release_date),
    runtime: tmdbMovie.runtime || undefined,
  };
};
