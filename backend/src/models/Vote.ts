import mongoose, { Schema, Document } from 'mongoose';

export interface IVote extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  voteType: 'like' | 'dislike';
  cycleId: mongoose.Types.ObjectId;
  review?: string;
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>({
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
  voteType: {
    type: String,
    enum: ['like', 'dislike'],
    required: true,
  },
  cycleId: {
    type: Schema.Types.ObjectId,
    ref: 'Cycle',
    required: true,
  },
  review: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one vote per user per movie per cycle
VoteSchema.index({ userId: 1, movieId: 1, cycleId: 1 }, { unique: true });

export const Vote = mongoose.model<IVote>('Vote', VoteSchema);
