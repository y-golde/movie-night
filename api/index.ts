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

let cachedConnection: typeof mongoose | null = null;

const connectDB = async (): Promise<typeof mongoose> => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const readyState = mongoose.connection.readyState as number;

  if (cachedConnection && readyState === 1) {
    return cachedConnection;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  // If already connecting, wait for it
  if (readyState === 2) {
    await new Promise((resolve) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', resolve);
    });
    if ((mongoose.connection.readyState as number) === 1) {
      cachedConnection = mongoose;
      return mongoose;
    }
  }

  try {
    // Connect with options optimized for serverless
    cachedConnection = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000, // Increased timeout
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 1, // Important for serverless - limit connections
      minPoolSize: 0,
      maxIdleTimeMS: 30000,
      bufferCommands: false, // Disable mongoose buffering - fail fast if not connected
      bufferMaxEntries: 0,
    });

    // Wait for connection to be fully ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);
        
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve(null);
        });
        
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    }

    console.log('MongoDB connected successfully, readyState:', mongoose.connection.readyState);
    return cachedConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    cachedConnection = null;
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  cachedConnection = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  cachedConnection = null;
});

// Middleware to ensure DB connection before handling requests
app.use(async (req, res, next) => {
  // Skip DB check for health endpoint
  if (req.path === '/health' || req.path === '/api' || req.path === '/api/') {
    return next();
  }

  try {
    const connection = await connectDB();
    // Ensure connection is actually ready
    const readyState = mongoose.connection.readyState as number;
    if (readyState !== 1) {
      // Wait a bit more if still connecting
      if (readyState === 2) {
        await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 2000);
          mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve(null);
          });
          mongoose.connection.once('error', () => {
            clearTimeout(timeout);
            resolve(null);
          });
        });
      }
      
      // Check again
      if ((mongoose.connection.readyState as number) !== 1) {
        throw new Error('MongoDB connection not ready');
      }
    }
  } catch (error: any) {
    console.error('Failed to connect to MongoDB:', error);
    console.error('MongoDB URI present:', !!MONGODB_URI);
    console.error('Connection state:', mongoose.connection.readyState);
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
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: (mongoose.connection.readyState as number) === 1,
    path: req.path,
    url: req.url
  });
});

app.get('/api/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongoConnected: (mongoose.connection.readyState as number) === 1,
    path: req.path,
    url: req.url
  });
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
