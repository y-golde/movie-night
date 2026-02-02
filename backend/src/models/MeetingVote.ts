import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingVote extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId;
  voteType: 'yes' | 'no';
  reason?: string; // Optional reason for the vote
  createdAt: Date;
}

const MeetingVoteSchema = new Schema<IMeetingVote>({
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
  meetingId: {
    type: Schema.Types.ObjectId,
    ref: 'MovieHistory',
    required: true,
  },
  voteType: {
    type: String,
    enum: ['yes', 'no'],
    required: true,
  },
  reason: {
    type: String,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one vote per user per movie per meeting
MeetingVoteSchema.index({ userId: 1, movieId: 1, meetingId: 1 }, { unique: true });

export const MeetingVote = mongoose.model<IMeetingVote>('MeetingVote', MeetingVoteSchema);
