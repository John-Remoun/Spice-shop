import { Schema, model, Document } from 'mongoose';

export interface IFavoriteCustomer extends Document {
  customerName: string;
  customerPhone: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteCustomerSchema = new Schema<IFavoriteCustomer>(
  {
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, unique: true, index: true },
    note: { type: String },
  },
  { timestamps: true }
);

export default model<IFavoriteCustomer>('FavoriteCustomer', FavoriteCustomerSchema);
