import mongoose from 'mongoose';

// Extend the NodeJS global type so TypeScript is happy with the cache object
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  } | undefined;
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDb = async (): Promise<mongoose.Connection> => {
  if (cached!.conn) {
    return cached!.conn;
  }

  const mongodburl = process.env.MONGODB_URI;
  if (!mongodburl) {
    throw new Error("MONGODB_URI environment variable is not set. Add it in Vercel → Settings → Environment Variables.");
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(mongodburl).then((m) => m.connection);
  }

  try {
    cached!.conn = await cached!.promise;
    return cached!.conn;
  } catch (error) {
    cached!.promise = null; // reset so next call retries
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export default connectDb;
