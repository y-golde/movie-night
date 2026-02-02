import mongoose, { Schema, Document } from 'mongoose';

export interface IRating {
  userId: mongoose.Types.ObjectId;
  movieId?: mongoose.Types.ObjectId; // Optional: if provided, rating is for a specific movie
  rating: number;
  comment: string;
}

export interface IGatheringRating {
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
}

export interface ISuggestion {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IMovieHistory extends Document {
  movieIds: mongoose.Types.ObjectId[]; // Changed to support multiple movies
  candidates: mongoose.Types.ObjectId[]; // Movies available for voting
  watchedDate: Date;
  hostId: mongoose.Types.ObjectId;
  location?: string;
  theme?: string; // Optional theme for AI suggestions
  ratings: IRating[];
  gatheringRatings: IGatheringRating[];
  suggestions: ISuggestion[]; // Track user suggestions
  averageRating: number;
  averageGatheringRating: number;
  status: 'upcoming' | 'watched';
}

const RatingSchema = new Schema<IRating>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: Schema.Types.ObjectId,
    ref: 'Movie',
    required: false,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    minlength: 50,
  },
});

const GatheringRatingSchema = new Schema<IGatheringRating>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
});

const SuggestionSchema = new Schema<ISuggestion>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  movieId: {
    type: Schema.Types.ObjectId,
    ref: 'Movie',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const MovieHistorySchema = new Schema<IMovieHistory>({
  movieIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie',
  }],
  candidates: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie',
  }],
  watchedDate: {
    type: Date,
    required: true,
  },
  hostId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    type: String,
  },
  theme: {
    type: String,
  },
  ratings: [RatingSchema],
  gatheringRatings: [GatheringRatingSchema],
  suggestions: [SuggestionSchema],
  averageRating: {
    type: Number,
    default: 0,
  },
  averageGatheringRating: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['upcoming', 'watched'],
    default: 'upcoming',
  },
});

// Calculate average ratings before saving
(MovieHistorySchema as any).pre('save', function (this: IMovieHistory, next?: (err?: Error) => void) {
  try {
    if (this.ratings && this.ratings.length > 0) {
      const sum = this.ratings.reduce((acc: number, rating: IRating) => acc + rating.rating, 0);
      this.averageRating = sum / this.ratings.length;
    }
    if (this.gatheringRatings && this.gatheringRatings.length > 0) {
      const sum = this.gatheringRatings.reduce((acc: number, rating: IGatheringRating) => acc + rating.rating, 0);
      this.averageGatheringRating = sum / this.gatheringRatings.length;
    }
    if (next && typeof next === 'function') {
      next();
    }
  } catch (error) {
    if (next && typeof next === 'function') {
      next(error as Error);
    }
  }
});

export const MovieHistory = mongoose.model<IMovieHistory>('MovieHistory', MovieHistorySchema);
