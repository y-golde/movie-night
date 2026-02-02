import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || '';

// Ensure connection uses 'test' database
let uri = MONGODB_URI;
if (uri.includes('mongodb.net/?') || uri.includes('mongodb.net?')) {
  uri = uri.replace('mongodb.net/?', 'mongodb.net/test?').replace('mongodb.net?', 'mongodb.net/test?');
} else if (uri.includes('mongodb.net/movie-night')) {
  uri = uri.replace('mongodb.net/movie-night', 'mongodb.net/test');
}

mongoose
  .connect(uri, { dbName: 'test' })
  .then(() => {
    console.log('Connected to MongoDB (test database)');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import authRoutes from './routes/auth';
import movieRoutes from './routes/movies';
import cycleRoutes from './routes/cycles';
import voteRoutes from './routes/votes';
import reviewRoutes from './routes/reviews';
import itemRoutes from './routes/items';
import adminRoutes from './routes/admin';
import movieHistoryRoutes from './routes/movieHistory';
import freeEveningRoutes from './routes/freeEvenings';
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/movie-history', movieHistoryRoutes);
app.use('/api/free-evenings', freeEveningRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
