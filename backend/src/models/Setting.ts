import { Schema, model, Document } from 'mongoose';

export interface ISetting extends Document {
  storeName: string;
  logoUrl?: string;
  defaultCurrency: string; // ISO 4217, e.g. "USD", "EGP"
  defaultLowStockThresholdPct: number; // fallback % used when a per-item threshold isn't set
  supportEmail?: string;
  whatsappSenderPhone?: string;
  vapidPublicKey?: string; // exposed to frontend for push subscription
  singleton: 'GLOBAL'; // fixed value enforces one document per collection
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    storeName: { type: String, required: true, default: 'Spice shop' },
    logoUrl: String,
    defaultCurrency: { type: String, required: true, default: 'USD' },
    defaultLowStockThresholdPct: { type: Number, default: 10, min: 0, max: 100 },
    supportEmail: String,
    whatsappSenderPhone: String,
    vapidPublicKey: String,
    singleton: { type: String, enum: ['GLOBAL'], default: 'GLOBAL', unique: true },
  },
  { timestamps: true }
);

export default model<ISetting>('Setting', SettingSchema);
