import mongoose, { Schema, Document } from 'mongoose';

export interface IItem extends Document {
  eventId: mongoose.Types.ObjectId;
  name: string;
  claimedBy?: mongoose.Types.ObjectId;
  claimedAt?: Date;
  status: 'available' | 'claimed';
}

const ItemSchema = new Schema<IItem>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'MovieHistory',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  claimedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  claimedAt: Date,
  status: {
    type: String,
    enum: ['available', 'claimed'],
    default: 'available',
  },
});

export const Item = mongoose.model<IItem>('Item', ItemSchema);
