import mongoose, { Schema, Document } from 'mongoose';

export interface ICycle extends Document {
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  meetingTime?: Date; // Specific meeting time
  location?: string; // Meeting location address
  movies: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CycleSchema = new Schema<ICycle>({
  isActive: {
    type: Boolean,
    default: false,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  meetingTime: {
    type: Date,
  },
  location: {
    type: String,
  },
  movies: [{
    type: Schema.Types.ObjectId,
    ref: 'Movie',
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Cycle = mongoose.model<ICycle>('Cycle', CycleSchema);
