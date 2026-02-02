# Movie Night Voting Platform

A brutalist-styled movie voting platform for hosting movie watching parties with AI-powered recommendations.

## Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (free tier)
- TMDB API key (free at https://www.themoviedb.org/settings/api)
- OpenAI API key (for AI recommendations - optional initially)

### 1. Install Dependencies

**Option A - Install all at once (recommended):**
```bash
npm run install:all
```

**Option B - Install separately:**
```bash
# Install root dependencies (for dev script)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/movie-night?retryWrites=true&w=majority

# JWT Secret (change this to a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# TMDB API
TMDB_API_KEY=your-tmdb-api-key

# OpenAI API (optional, for AI recommendations)
OPENAI_API_KEY=your-openai-api-key

# Admin Password (required for admin access)
ADMIN_PASSWORD=your-secure-admin-password

# Server
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 3. MongoDB Atlas Setup

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user
3. Whitelist IP address `0.0.0.0/0` (for development) or your IP
4. Get your connection string and add it to `MONGODB_URI`

### 4. TMDB API Setup

1. Sign up at https://www.themoviedb.org/
2. Go to Settings > API
3. Request an API key (free)
4. Add it to `TMDB_API_KEY`

## Running the Application

### Development Mode (Recommended - Hot Reloading)

**Run both frontend and backend together:**
```bash
# From the root directory
npm run dev
```

This will start both servers with hot reloading:
- Backend: http://localhost:3001 (auto-reloads on file changes)
- Frontend: http://localhost:5173 (auto-reloads on file changes)

**Or run separately:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist folder with a static server
```

## Usage

1. Open http://localhost:5173 in your browser
2. Enter a username and draw a pattern (9-dot grid, minimum 4 dots)
3. Complete onboarding (select genres and favorite movies)
4. Start voting on movies or create voting cycles (admin)

## Features

- **Pattern Lock Authentication**: Unique 9-dot pattern authentication
- **Movie Voting**: Tinder-like swipe interface for voting
- **Movie Reviews**: Post-watch reviews with ratings and comments
- **Item Claiming**: Claim items to bring to movie nights
- **Admin Panel**: Manage users and voting cycles
- **TMDB Integration**: Search and add movies from The Movie Database
- **Brutalist Design**: Bold, high-contrast design aesthetic

## Project Structure

```
movie-night/
├── frontend/          # React + Vite frontend
├── backend/          # Express + TypeScript backend
└── README.md
```

## Deployment

See deployment section in the plan for Vercel/Railway setup instructions.
