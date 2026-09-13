import 'dotenv/config';
import argon2 from 'argon2';
import { connectDB } from '../config/db';
import User from '../models/User';
import Setting from '../models/Setting';
import { UserRole } from '../types/enums';
import mongoose from 'mongoose';

/**
 * Run with: npm run seed
 * Idempotent — safe to re-run; it will not duplicate the settings singleton
 * or an existing admin email.
 */
async function seed() {
  await connectDB();

  await Setting.findOneAndUpdate(
    { singleton: 'GLOBAL' },
    {
      $setOnInsert: {
        storeName: process.env.SEED_STORE_NAME || 'Spice shop',
        defaultCurrency: process.env.SEED_DEFAULT_CURRENCY || 'USD',
      },
    },
    { upsert: true }
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const passwordHash = await argon2.hash(adminPassword);
      await User.create({
        fullName: process.env.SEED_ADMIN_NAME || 'Super Admin',
        email: adminEmail,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
      });
      console.log(`[seed] created super admin: ${adminEmail}`);
    } else {
      console.log(`[seed] super admin already exists: ${adminEmail}`);
    }
  } else {
    console.log('[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin creation');
  }

  console.log('[seed] done');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
