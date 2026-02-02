import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || '';
  
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
