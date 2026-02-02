import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Get frontend URL from environment or use Vercel's URL
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:5173';

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || FRONTEND_URL, 
  credentials: true 
}));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || '';

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Note: Routes are already prefixed with /api in vercel.json rewrites
// But the routes themselves expect /api prefix, so we keep it
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
