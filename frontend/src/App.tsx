import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Main from './pages/Main';
import Voting from './pages/Voting';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import MovieReview from './pages/MovieReview';
import Meetings from './pages/Meetings';
import Social from './pages/Social';
import './App.css';

const ProtectedRoute = ({ children, skipOnboarding }: { children: React.ReactNode; skipOnboarding?: boolean }) => {
  const { user, loading } = useAuth();

  // Wait for auth to finish loading
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // If no user after loading completes, redirect to login
  if (!user) {
    // Store the intended destination so we can redirect after login
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }
    return <Navigate to="/login" replace />;
  }

  // Skip onboarding check for admin page and onboarding page itself
  // Allow access to onboarding page even if needsOnboarding is true
  const isOnboardingPage = window.location.pathname === '/onboarding';
  if (!skipOnboarding && !isOnboardingPage && user.needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vote"
        element={
          <ProtectedRoute>
            <Voting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute skipOnboarding>
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/movie/:id/review"
        element={
          <ProtectedRoute>
            <MovieReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <ProtectedRoute>
            <Meetings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/social"
        element={
          <ProtectedRoute>
            <Social />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Main />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
