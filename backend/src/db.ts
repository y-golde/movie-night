import mongoose from 'mongoose';

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  const MONGODB_URI = process.env.MONGODB_URI || '';

  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const readyState = mongoose.connection.readyState as number;

  // Already connected
  if (readyState === 1) {
    return mongoose;
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }

  // If already connecting, return the existing promise
  if (readyState === 2 && connectionPromise) {
    return connectionPromise;
  }

  // Create new connection promise
  connectionPromise = (async () => {
    try {
      // Ensure database name is in URI - use 'test' database
      let uri = MONGODB_URI;
      // If URI doesn't have database name (ends with .net/? or .net?), add 'test'
      if (uri.match(/mongodb\+srv:\/\/[^@]+@[^/]+\/\?/)) {
        uri = uri.replace(/mongodb\+srv:\/\/([^@]+@[^/]+)\/\?/, 'mongodb+srv://$1/test?');
        console.log('Fixed URI: Added database name "test"');
      } else if (uri.match(/mongodb\+srv:\/\/[^@]+@[^/]+\?/)) {
        uri = uri.replace(/mongodb\+srv:\/\/([^@]+@[^/]+)\?/, 'mongodb+srv://$1/test?');
        console.log('Fixed URI: Added database name "test"');
      }

      console.log('Connecting to MongoDB...');
      console.log('URI starts with:', uri.substring(0, 30));

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 1,
        minPoolSize: 0,
        maxIdleTimeMS: 30000,
        family: 4,
        dbName: 'test',
      });

      console.log('MongoDB connected successfully to:', mongoose.connection.name);
      return mongoose;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

// Set mongoose to not buffer commands - fail fast if not connected
mongoose.set('bufferCommands', false);

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected event');
});

mongoose.connection.on('error', (err: Error) => {
  console.error('MongoDB connection error event:', err);
  connectionPromise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected event');
  connectionPromise = null;
});

export { mongoose };
export default connectDB;
