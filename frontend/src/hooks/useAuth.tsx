import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  username: string;
  displayName?: string;
  displayNameColor?: string;
  isAdmin: boolean;
  avatar?: string;
  needsOnboarding?: boolean;
  preferences?: {
    genres: string[];
    favoriteMovieIds: number[];
    optionalText?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, pattern: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error: any) {
      console.error('Failed to fetch user:', error);
      // Only clear token if it's an auth error (401/403), not network errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, pattern: string) => {
    try {
      const response = await api.post('/auth/login', { username: username.trim().toLowerCase(), pattern });
      const { token: newToken, user: newUser } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
