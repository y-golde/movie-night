"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMovieForDB = exports.getMovieTrailer = exports.getMoviePosterUrl = exports.getMovieDetails = exports.searchMovies = void 0;
const axios_1 = __importDefault(require("axios"));
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const tmdbClient = axios_1.default.create({
    baseURL: TMDB_BASE_URL,
    params: {
        api_key: TMDB_API_KEY,
    },
});
const searchMovies = async (query, page = 1) => {
    try {
        const response = await tmdbClient.get('/search/movie', {
            params: {
                query,
                page,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error('TMDB search error:', error);
        throw new Error('Failed to search movies');
    }
};
exports.searchMovies = searchMovies;
const getMovieDetails = async (movieId) => {
    try {
        const response = await tmdbClient.get(`/movie/${movieId}`, {
            params: {
                append_to_response: 'videos',
            },
        });
        return response.data;
    }
    catch (error) {
        console.error('TMDB details error:', error);
        throw new Error('Failed to fetch movie details');
    }
};
exports.getMovieDetails = getMovieDetails;
const getMoviePosterUrl = (posterPath) => {
    if (!posterPath) {
        return 'https://via.placeholder.com/500x750?text=No+Poster';
    }
    return `${TMDB_IMAGE_BASE_URL}${posterPath}`;
};
exports.getMoviePosterUrl = getMoviePosterUrl;
const getMovieTrailer = (movieDetails) => {
    const trailers = movieDetails.videos?.results || [];
    const youtubeTrailer = trailers.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
    return youtubeTrailer ? `https://www.youtube.com/watch?v=${youtubeTrailer.key}` : null;
};
exports.getMovieTrailer = getMovieTrailer;
const formatMovieForDB = (tmdbMovie) => {
    return {
        tmdbId: tmdbMovie.id,
        title: tmdbMovie.title,
        poster: (0, exports.getMoviePosterUrl)(tmdbMovie.poster_path),
        trailer: (0, exports.getMovieTrailer)(tmdbMovie),
        description: tmdbMovie.overview,
        genres: tmdbMovie.genres.map((g) => g.name),
        releaseDate: new Date(tmdbMovie.release_date),
    };
};
exports.formatMovieForDB = formatMovieForDB;
