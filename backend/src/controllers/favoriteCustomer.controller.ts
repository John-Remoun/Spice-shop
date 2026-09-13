import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import FavoriteCustomer from '../models/FavoriteCustomer';

/** GET /api/favorite-customers */
export async function getFavoriteCustomers(_req: AuthenticatedRequest, res: Response) {
  try {
    const favorites = await FavoriteCustomer.find().sort({ createdAt: -1 });
    return res.json(favorites);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل جلب قائمة المفضلة';
    return res.status(500).json({ message });
  }
}

/** POST /api/favorite-customers/toggle */
export async function toggleFavoriteCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { customerName, customerPhone } = req.body;
    const cleanPhone = (customerPhone || '').trim();
    const name = (customerName || '').trim() || 'عميل';

    if (!cleanPhone) {
      return res.status(400).json({ message: 'رقم التليفون مطلوب لتحديد العميل المفضل' });
    }

    const existing = await FavoriteCustomer.findOne({ customerPhone: cleanPhone });
    if (existing) {
      await FavoriteCustomer.deleteOne({ _id: existing._id });
      return res.json({ isFavorite: false, message: 'تم إزالة العميل من المفضلة' });
    } else {
      const created = await FavoriteCustomer.create({ customerName: name, customerPhone: cleanPhone });
      return res.status(201).json({ isFavorite: true, favorite: created, message: 'تم إضافة العميل للمفضلة' });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل تغيير حالة المفضلة';
    return res.status(400).json({ message });
  }
}

/** DELETE /api/favorite-customers/:phone */
export async function removeFavoriteCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { phone } = req.params;
    const cleanPhone = (phone || '').trim();
    await FavoriteCustomer.deleteOne({ customerPhone: cleanPhone });
    return res.json({ message: 'تم حذف العميل من المفضلة' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل حذف العميل من المفضلة';
    return res.status(500).json({ message });
  }
}
