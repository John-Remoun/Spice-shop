import { Request, Response } from 'express';
import Setting from '../models/Setting';

/** GET /api/settings */
export async function getSettings(_req: Request, res: Response) {
  let settings = await Setting.findOne({ singleton: 'GLOBAL' });
  if (!settings) {
    settings = await Setting.create({
      storeName: process.env.SEED_STORE_NAME || 'Spice shop',
      defaultCurrency: 'EGP',
      singleton: 'GLOBAL',
    });
  }
  return res.json(settings);
}

/** PUT /api/settings */
export async function updateSettings(req: Request, res: Response) {
  try {
    const { storeName, logoUrl, defaultCurrency, defaultLowStockThresholdPct, supportEmail, vapidPublicKey } = req.body;
    let settings = await Setting.findOneAndUpdate(
      { singleton: 'GLOBAL' },
      { storeName, logoUrl, defaultCurrency, defaultLowStockThresholdPct, supportEmail, vapidPublicKey },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    return res.status(400).json({ message });
  }
}
