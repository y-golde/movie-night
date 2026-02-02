import api from './api';

export type MovieSearchResult = {
  id: number;
  title: string;
  overview: string;
  poster: string | null;
  releaseDate: string;
  genreIds: number[];
};

export type MovieSearchResponse = {
  results: MovieSearchResult[];
  totalResults: number;
  totalPages: number;
  page: number;
};

export const searchMovies = async (query: string, page: number = 1): Promise<MovieSearchResponse> => {
  const response = await api.get('/movies/search', {
    params: { q: query, page },
  });
  return response.data;
};

export const getMovieDetails = async (tmdbId: number) => {
  const response = await api.get(`/movies/tmdb/${tmdbId}`);
  return response.data;
};

export const addMovie = async (tmdbId: number) => {
  const response = await api.post('/movies', { tmdbId });
  return response.data;
};
