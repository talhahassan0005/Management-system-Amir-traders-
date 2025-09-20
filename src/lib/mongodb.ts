import mongoose from 'mongoose';

// Get MongoDB URI from environment variables (do not throw at import time)
const MONGODB_URI = process.env.MONGODB_URI;

// Declare global mongoose cache
declare global {
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('✅ Using existing MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    if (!MONGODB_URI) {
      // Defer error to first usage rather than breaking build
      throw new Error('MONGODB_URI is not set. Define it in environment before serving API routes.');
    }
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔄 Connecting to MongoDB...');
      }
      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Successfully connected to MongoDB');
        }
        return mongoose;
      });
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      cached.promise = null;
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error('❌ Failed to establish MongoDB connection:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Function to check if MongoDB is connected
export function isConnected() {
  return mongoose.connection.readyState === 1;
}

// Function to get connection status
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
}

export default connectDB;
