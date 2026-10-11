import mongoose from 'mongoose';

async function connectWithRetry(uri, attempt = 1, maxAttempts = 12) {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
    });
    console.log('MongoDB connected:', mongoose.connection.name);
  } catch (err) {
    console.error(
      `MongoDB connection attempt ${attempt}/${maxAttempts} failed:`,
      err.message
    );
    if (attempt >= maxAttempts) throw err;
    const delay = Math.min(1000 * 2 ** attempt, 30000);
    console.log(`Retrying in ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    return connectWithRetry(uri, attempt + 1, maxAttempts);
  }
}

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }
  await connectWithRetry(uri);
}
