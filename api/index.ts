import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

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

// MongoDB connection - handle serverless properly
const MONGODB_URI = process.env.MONGODB_URI || '';

let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async (): Promise<typeof mongoose> => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const readyState = mongoose.connection.readyState as number;

  // Already connected
  if (readyState === 1) {
    return mongoose;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  // If already connecting, return the existing promise
  if (readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  // Create new connection promise
  connectionPromise = (async () => {
    try {
      // Connect with options optimized for serverless
      console.log('Attempting MongoDB connection...');
      console.log('URI starts with:', MONGODB_URI.substring(0, 20));

      // Ensure database name is in URI - fix if missing
      let uri = MONGODB_URI;
      // If URI doesn't have database name, add it
      if (uri.includes('mongodb.net/?') || uri.includes('mongodb.net?')) {
        uri = uri.replace('mongodb.net/?', 'mongodb.net/movie-night?').replace('mongodb.net?', 'mongodb.net/movie-night?');
        console.log('Fixed URI: Added database name');
      }
      
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000, // Increased timeout
        socketTimeoutMS: 45000,
        maxPoolSize: 1, // Important for serverless - limit connections
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        family: 4, // Force IPv4 - helps with serverless DNS issues
        dbName: 'movie-night', // Explicitly set database name (backup)
      });

      console.log('MongoDB connected successfully');
      return mongoose;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err: Error) => {
  console.error('MongoDB connection error:', err);
  connectionPromise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  connectionPromise = null;
});

// Set mongoose to not buffer commands - fail fast if not connected
mongoose.set('bufferCommands', false);
// 'bufferMaxEntries' is not a valid Mongoose option in recent versions; removed to fix lint error

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
      mongoConnected: (mongoose.connection.readyState as number) === 1
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

// Root endpoint for debugging - handle both /api and /api/
app.get('/api', (req, res) => {
  const uri = MONGODB_URI || '';
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: (mongoose.connection.readyState as number) === 1,
    readyState: mongoose.connection.readyState,
    path: req.path,
    url: req.url,
    // Debug info (masked)
    mongoUriSet: !!MONGODB_URI,
    mongoUriLength: uri.length,
    mongoUriStart: uri.substring(0, 20) + '...',
    envKeys: Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('VERCEL')),
  });
});

app.get('/api/', (req, res) => {
  const uri = MONGODB_URI || '';
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: (mongoose.connection.readyState as number) === 1,
    readyState: mongoose.connection.readyState,
    path: req.path,
    url: req.url,
    mongoUriSet: !!MONGODB_URI,
    mongoUriLength: uri.length,
  });
});

// Debug endpoint to test connection
app.get('/api/debug/connection', async (req, res) => {
  const uri = MONGODB_URI || '';
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
      mongoUriSet: !!MONGODB_URI,
      mongoUriLength: uri.length,
      mongoUriStart: uri.substring(0, 30) + '...',
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
