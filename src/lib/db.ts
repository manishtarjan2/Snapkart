import mongoose from 'mongoose';

// Extend the NodeJS global type so TypeScript is happy with the cache object
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  } | undefined;
}

const mongodburl = process.env.MONGODB_URI;
if (!mongodburl) {
  throw new Error("MONGODB_URI is missing or invalid");
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDb = async (): Promise<mongoose.Connection> => {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(mongodburl).then((m: typeof mongoose) => m.connection);
  }

  try {
    cached!.conn = await cached!.promise;
    return cached!.conn;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export default connectDb;
