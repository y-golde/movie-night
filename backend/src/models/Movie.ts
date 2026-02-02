import mongoose, { Schema, Document } from 'mongoose';

export interface IMovie extends Document {
  tmdbId: number;
  title: string;
  poster: string;
  trailer?: string;
  description: string;
  genres: string[];
  releaseDate: Date;
  runtime?: number;
  addedBy: mongoose.Types.ObjectId;
  addedAt: Date;
}

const MovieSchema = new Schema<IMovie>({
  tmdbId: {
    type: Number,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  poster: {
    type: String,
    required: true,
  },
  trailer: String,
  description: {
    type: String,
    required: true,
  },
  genres: {
    type: [String],
    default: [],
  },
  releaseDate: Date,
  runtime: Number,
  addedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Movie = mongoose.model<IMovie>('Movie', MovieSchema);
