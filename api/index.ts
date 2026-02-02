import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Import shared db connection from backend - ensures same mongoose instance
import connectDB, { mongoose } from '../backend/src/db';

dotenv.config();

const app = express();

// Get frontend URL from environment
const FRONTEND_URL = process.env.FRONTEND_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

// Middleware - allow all origins in production for now (can restrict later)
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Middleware to ensure DB connection before handling requests
app.use(async (req: any, res: any, next: any) => {
  // Skip DB check for health endpoint
  if (req.path === '/health' || req.path === '/api' || req.path === '/api/') {
    return next();
  }

  try {
    await connectDB();
    // Verify connection is actually ready
    if ((mongoose.connection.readyState as number) !== 1) {
      throw new Error('MongoDB connection not ready');
    }
  } catch (error: any) {
    console.error('Failed to connect to MongoDB:', error);
    // Return error for API routes that need DB
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        error: 'Database connection failed',
        message: error.message || 'Unable to connect to database',
        readyState: mongoose.connection.readyState
      });
    }
  }
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongoConnected: (mongoose.connection.readyState as number) === 1,
      dbName: mongoose.connection.name
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      mongoConnected: false,
      error: error.message
    });
  }
});

// Root endpoint for debugging
app.get('/api', async (req, res) => {
  const uri = process.env.MONGODB_URI || '';
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: (mongoose.connection.readyState as number) === 1,
    readyState: mongoose.connection.readyState,
    dbName: mongoose.connection.name,
    path: req.path,
    url: req.url,
    mongoUriSet: !!uri,
    mongoUriLength: uri.length,
  });
});

app.get('/api/', async (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: (mongoose.connection.readyState as number) === 1,
    readyState: mongoose.connection.readyState,
    dbName: mongoose.connection.name,
  });
});

// Debug endpoint to test connection
app.get('/api/debug/connection', async (req, res) => {
  const uri = process.env.MONGODB_URI || '';
  const startTime = Date.now();

  try {
    await connectDB();
    const elapsed = Date.now() - startTime;
    res.json({
      status: 'connected',
      elapsed: `${elapsed}ms`,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    res.status(503).json({
      status: 'failed',
      elapsed: `${elapsed}ms`,
      error: error.message,
      readyState: mongoose.connection.readyState,
      mongoUriSet: !!uri,
      mongoUriLength: uri.length,
    });
  }
});

// Routes - Note: paths are relative to backend/src since that's where routes are
import authRoutes from '../backend/src/routes/auth';
import movieRoutes from '../backend/src/routes/movies';
import cycleRoutes from '../backend/src/routes/cycles';
import voteRoutes from '../backend/src/routes/votes';
import reviewRoutes from '../backend/src/routes/reviews';
import itemRoutes from '../backend/src/routes/items';
import adminRoutes from '../backend/src/routes/admin';
import movieHistoryRoutes from '../backend/src/routes/movieHistory';
import freeEveningRoutes from '../backend/src/routes/freeEvenings';

// Vercel sends all /api/* requests to this function
// The request path includes /api, so we mount routes with /api prefix
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/movie-history', movieHistoryRoutes);
app.use('/api/free-evenings', freeEveningRoutes);

// Export for Vercel serverless
export default app;
