import argon2 from 'argon2';
import User from '../models/User';
import Setting from '../models/Setting';
import { UserRole } from '../types/enums';

/**
 * Idempotent automatic seed function.
 * Called on server startup and via `npm run seed`.
 * Ensures:
 * 1. Default Setting (storeName: 'Spice shop')
 * 2. Creates initial default User 'admin' (Password: '9999') ONLY IF no Super Admin exists.
 * 3. Preserves all user accounts and custom profile edits made in the system.
 */
export async function seedDefaults() {
  try {
    // 1. Ensure Global Setting
    await Setting.findOneAndUpdate(
      { singleton: 'GLOBAL' },
      {
        $setOnInsert: {
          storeName: process.env.SEED_STORE_NAME || 'Spice shop',
          defaultCurrency: process.env.SEED_DEFAULT_CURRENCY || 'EGP',
        },
      },
      { upsert: true }
    );

    // 2. Ensure at least one Super Admin user exists in the system
    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });

    if (!existingSuperAdmin) {
      const passwordHash9999 = await argon2.hash('9999');
      await User.create({
        fullName: 'admin',
        email: 'admin@example.com',
        passwordHash: passwordHash9999,
        role: UserRole.SUPER_ADMIN,
        isActive: true,
      });
      console.log('[seed] Created initial admin user (name: admin, password: 9999)');
    } else {
      console.log('[seed] Super Admin account already exists — preserving all user accounts.');
    }
  } catch (err) {
    console.error('[seed] Error seeding default accounts:', err);
  }
}
