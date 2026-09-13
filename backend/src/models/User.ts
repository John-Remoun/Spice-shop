import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../types/enums';

export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  pushSubscriptions: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }[];
  refreshTokenVersion: number;
  otpCode?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema(
  {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
      sparse: true,
    },
    phone: { type: String, required: false, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.SUPER_ADMIN,
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pushSubscriptions: { type: [PushSubscriptionSchema], default: [] },
    refreshTokenVersion: { type: Number, default: 0 },
    otpCode: { type: String, required: false, select: false },
    otpExpiresAt: { type: Date, required: false, select: false },
  },
  { timestamps: true }
);

export default model<IUser>('User', UserSchema);
