import mongoose from 'mongoose';
import { seedDefaults } from '../utils/seedDefaults';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. See backend/.env.example.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  mongoose.connection.on('error', (err) => {
    console.error('[mongodb] connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[mongodb] disconnected');
  });

  console.log(`[mongodb] connected → ${mongoose.connection.name}`);
  await seedDefaults();
}
