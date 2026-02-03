import axios from 'axios';

// Use relative URL in production (Vercel), or env variable, or localhost for dev
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add admin password header if available and route requires it
  const adminPassword = sessionStorage.getItem('adminPassword');
  if (adminPassword) {
    // Add for all admin routes (GET, POST, PUT)
    if (config.url?.includes('/admin/')) {
      config.headers['x-admin-password'] = adminPassword;
    }
    // Add for cycle modification routes (POST, PUT only)
    if (config.url?.includes('/cycles') && config.method && ['post', 'put'].includes(config.method.toLowerCase())) {
      config.headers['x-admin-password'] = adminPassword;
    }
    // Add for movie-history routes (POST and DELETE)
    if (config.url?.includes('/movie-history') && config.method && ['post', 'delete'].includes(config.method.toLowerCase())) {
      config.headers['x-admin-password'] = adminPassword;
    }
    // Add for items routes (POST and DELETE) - for admin access
    if (config.url?.includes('/items') && config.method && ['post', 'delete'].includes(config.method.toLowerCase())) {
      config.headers['x-admin-password'] = adminPassword;
    }
  }
  
  // Remove Authorization header if no token (for admin routes that don't require auth)
  if (!localStorage.getItem('token') && config.url?.includes('/admin/verify-password')) {
    delete config.headers.Authorization;
  }
  
  // Add admin password for AI suggestions, reviews, and candidate endpoints
  if (adminPassword) {
    if (config.url?.includes('/movie-history')) {
      const method = config.method?.toLowerCase();
      if (method === 'get' && (config.url?.includes('/ai-suggestions') || config.url?.includes('/reviews/') || config.url?.includes('/candidates'))) {
        config.headers['x-admin-password'] = adminPassword;
      }
      if (['post', 'put', 'delete'].includes(method || '')) {
        // Don't require admin password for voting (post /vote)
        if (!config.url?.includes('/vote')) {
          config.headers['x-admin-password'] = adminPassword;
        }
        // Add for AI recommendation endpoint
        if (config.url?.includes('/ai-recommendation')) {
          config.headers['x-admin-password'] = adminPassword;
        }
      }
    }
  }
  
  return config;
});

// AI Suggestions API
export const generateAISuggestions = async (meetingId: string): Promise<any[]> => {
  const response = await api.post(`/movie-history/${meetingId}/ai-suggestions`);
  return response.data.suggestions || [];
};

// AI Recommendation based on voting cycle votes and comments
export const generateAIRecommendation = async (meetingId: string): Promise<any> => {
  const response = await api.post(`/movie-history/${meetingId}/ai-recommendation`);
  return response.data.recommendation || null;
};

// Get reviews for a movie
export const getMovieReviews = async (movieId: string): Promise<any[]> => {
  const response = await api.get(`/movie-history/reviews/${movieId}`);
  return response.data.reviews || [];
};

// Candidates API
export const addCandidate = async (meetingId: string, movieId: string): Promise<any> => {
  const response = await api.post(`/movie-history/${meetingId}/candidates`, { movieId });
  return response.data;
};

export const removeCandidate = async (meetingId: string, movieId: string): Promise<any> => {
  const response = await api.delete(`/movie-history/${meetingId}/candidates/${movieId}`);
  return response.data;
};

export const getCandidates = async (meetingId: string): Promise<{ candidates: any[]; votes: any[] }> => {
  const response = await api.get(`/movie-history/${meetingId}/candidates`);
  return response.data;
};

// Voting API
export const voteOnCandidate = async (meetingId: string, movieId: string, voteType: 'yes' | 'no', reason?: string): Promise<any> => {
  const response = await api.post(`/movie-history/${meetingId}/vote`, { movieId, voteType, reason });
  return response.data;
};

export const getMyVotes = async (meetingId: string): Promise<any[]> => {
  const response = await api.get(`/movie-history/${meetingId}/my-votes`);
  return response.data;
};

// User suggestions API
export const suggestMovie = async (meetingId: string, tmdbId: number): Promise<any> => {
  const response = await api.post(`/movie-history/${meetingId}/suggest`, { tmdbId });
  return response.data;
};

export const getMySuggestions = async (meetingId: string): Promise<{ count: number; remaining: number }> => {
  const response = await api.get(`/movie-history/${meetingId}/my-suggestions`);
  return response.data;
};

// Free Evenings API
export const getUpcomingWeekFreeEvenings = async (): Promise<any> => {
  const response = await api.get('/free-evenings/upcoming-week');
  return response.data;
};

export const markFreeEvening = async (date: string): Promise<any> => {
  const response = await api.post('/free-evenings', { date });
  return response.data;
};

export const unmarkFreeEvening = async (date: string): Promise<any> => {
  const response = await api.delete('/free-evenings', { data: { date } });
  return response.data;
};

export const getMyFreeEvenings = async (): Promise<{ dates: string[] }> => {
  const response = await api.get('/free-evenings/my-free-evenings');
  return response.data;
};

export default api;
