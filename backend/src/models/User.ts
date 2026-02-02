import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  username: string;
  patternHash?: string;
  displayName?: string;
  displayNameColor?: string;
  avatar?: string;
  isAdmin: boolean;
  preferences: {
    genres: string[];
    favoriteMovieIds: number[];
    optionalText?: string;
  };
  createdAt: Date;
  comparePattern(pattern: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  patternHash: {
    type: String,
    required: false,
  },
  displayName: {
    type: String,
    required: false,
    trim: true,
  },
  displayNameColor: {
    type: String,
    required: false,
    default: '#000000',
  },
  avatar: {
    type: String,
    required: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  preferences: {
    genres: {
      type: [String],
      default: [],
    },
    favoriteMovieIds: {
      type: [Number],
      default: [],
    },
    optionalText: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Method to compare pattern
UserSchema.methods.comparePattern = async function (pattern: string): Promise<boolean> {
  if (!this.patternHash) return false;
  return bcrypt.compare(pattern, this.patternHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
