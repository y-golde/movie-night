# Environment Variables Setup

## Where to Put Your Secrets

### Backend Secrets (`backend/.env`)

Create or edit `backend/.env` and fill in these values:

```env
# 1. MongoDB Atlas Connection String (REQUIRED)
# Get this from: https://cloud.mongodb.com/
# Steps:
#   - Create a free cluster
#   - Click "Connect" → "Connect your application"
#   - Copy the connection string
#   - Replace <password> with your database user password
#   - Replace <dbname> with "movie-night"
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/movie-night?retryWrites=true&w=majority

# 2. JWT Secret (REQUIRED)
# Generate a random string for production:
#   openssl rand -base64 32
# Or use this for development:
JWT_SECRET=dev-secret-key-change-in-production

# 3. TMDB API Key (REQUIRED)
# Get this from: https://www.themoviedb.org/settings/api
# Steps:
#   - Sign up/login at themoviedb.org
#   - Go to Settings → API
#   - Request an API key (free)
#   - Copy the API key
TMDB_API_KEY=your-tmdb-api-key-here

# 4. OpenAI API Key (OPTIONAL - only needed for AI recommendations)
# Get this from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# 5. Server Configuration (already set, no need to change)
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend Secrets (`frontend/.env`)

Create or edit `frontend/.env`:

```env
# Backend API URL (already set correctly for local development)
VITE_API_URL=http://localhost:3001/api
```

## Quick Setup Steps

1. **MongoDB Atlas** (5 minutes):
   - Go to https://cloud.mongodb.com/
   - Create free account → Create free cluster
   - Create database user (username/password)
   - Whitelist IP: `0.0.0.0/0` (for development)
   - Get connection string and add to `MONGODB_URI`

2. **TMDB API Key** (2 minutes):
   - Go to https://www.themoviedb.org/
   - Sign up/login
   - Settings → API → Request API Key
   - Copy key to `TMDB_API_KEY`

3. **JWT Secret** (1 minute):
   - For development: use `dev-secret-key-change-in-production`
   - For production: run `openssl rand -base64 32` and use that

4. **OpenAI API Key** (optional):
   - Only needed if you want AI recommendations
   - Get from https://platform.openai.com/api-keys

## Verify Setup

After filling in the `.env` files, run:

```bash
npm run dev
```

If you see:
- ✅ "Connected to MongoDB" → MongoDB is working
- ✅ "Server running on port 3001" → Backend is working
- ✅ Frontend opens at http://localhost:5173 → Everything is working!

If you see errors, check:
- MongoDB connection string format
- TMDB API key is correct
- All `.env` files are in the right locations
