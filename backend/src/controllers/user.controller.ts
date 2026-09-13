import { Response } from 'express';
import argon2 from 'argon2';
import User from '../models/User';
import Setting from '../models/Setting';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserRole } from '../types/enums';

/** GET /api/users - list all users */
export async function listUsers(_req: AuthenticatedRequest, res: Response) {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  return res.json(users);
}

/** POST /api/users - create a new user (Super Admin) */
export async function createUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !password) {
      return res.status(400).json({ message: 'الاسم وكلمة السر مطلوبان لإنشاء الحساب' });
    }

    const trimmedName = fullName.trim();
    const existing = await User.findOne({
      $or: [
        { fullName: { $regex: new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
      ],
    });

    if (existing) {
      return res.status(409).json({ message: 'مستخدم به هذا الاسم أو الإيميل موجود بالفعل' });
    }

    let userRole = UserRole.SUPER_ADMIN;
    if (role === 'CASHIER' || role === 'staff') {
      userRole = UserRole.STAFF;
    } else if (role === 'SUPER_ADMIN' || role === 'superadmin') {
      userRole = UserRole.SUPER_ADMIN;
    }

    const passwordHash = await argon2.hash(password);
    const user = await User.create({
      fullName: trimmedName,
      email: email ? email.toLowerCase().trim() : undefined,
      passwordHash,
      role: userRole,
      createdBy: req.user!.id,
    });

    // Also update supportEmail in settings if email is provided
    if (email && email.trim()) {
      await Setting.findOneAndUpdate(
        { singleton: 'GLOBAL' },
        { supportEmail: email.toLowerCase().trim() },
        { upsert: true }
      );
    }

    return res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email || '',
      role: user.role,
      createdBy: user.createdBy,
      createdAt: user.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user';
    return res.status(400).json({ message });
  }
}

/** PUT /api/users/profile - update current logged in user's profile */
export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { fullName, email, phone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // Mandatory current password check for any profile change
    if (!currentPassword) {
      return res.status(400).json({ message: 'كلمة السر الحالية مطلوبة لتحديث الملف الشخصي' });
    }

    const validPassword = await argon2.verify(user.passwordHash, currentPassword);
    if (!validPassword) {
      return res.status(401).json({ message: 'كلمة السر الحالية غير صحيحة' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone ? phone.trim() : undefined;
    if (email !== undefined) {
      const cleanEmail = email ? email.toLowerCase().trim() : undefined;
      user.email = cleanEmail;
      
      // Sync to Global Setting supportEmail
      if (cleanEmail) {
        await Setting.findOneAndUpdate(
          { singleton: 'GLOBAL' },
          { supportEmail: cleanEmail },
          { upsert: true }
        );
      }
    }

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ message: 'كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل' });
      }
      user.passwordHash = await argon2.hash(newPassword.trim());
    }

    await user.save();
    return res.json({
      id: user._id.toString(),
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'فشل تحديث البيانات الشخصية';
    return res.status(400).json({ message });
  }
}

/** DELETE /api/users/:id - delete user */
export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  const targetId = req.params.id;
  if (targetId === req.user!.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const targetUser = await User.findById(targetId);
  if (!targetUser) return res.status(404).json({ message: 'User not found' });

  const isCreator = targetUser.createdBy?.toString() === req.user!.id;
  const isSuperAdmin = req.user!.role === UserRole.SUPER_ADMIN;

  if (!isCreator && !isSuperAdmin) {
    return res.status(403).json({ message: 'Only the user who created this account or a Super Admin can delete it' });
  }

  await User.findByIdAndDelete(targetId);
  return res.status(204).send();
}
