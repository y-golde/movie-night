import mongoose, { Schema, Document } from 'mongoose';

export interface IFreeEvening extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // Date of the evening (stored as start of day)
  createdAt: Date;
}

const FreeEveningSchema = new Schema<IFreeEvening>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one free evening per user per date
FreeEveningSchema.index({ userId: 1, date: 1 }, { unique: true });

export const FreeEvening = mongoose.model<IFreeEvening>('FreeEvening', FreeEveningSchema);
