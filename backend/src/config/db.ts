import mongoose from 'mongoose';
import dns from 'node:dns';
import { seedDefaults } from '../utils/seedDefaults';

// Force Node.js to use IPv4 and reliable DNS servers (fixes ETIMEOUT on Windows Node.js with MongoDB Atlas)
dns.setDefaultResultOrder('ipv4first');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // fallback gracefully
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. See backend/.env.example.');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  mongoose.connection.on('error', (err) => {
    console.error('[mongodb] connection error:', err);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[mongodb] disconnected');
  });

  console.log(`[mongodb] connected → ${mongoose.connection.name}`);
  await seedDefaults();
}

