import { Request, Response } from 'express';
import argon2 from 'argon2';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from '../utils/tokens';
import { UserRole } from '../types/enums';

/** POST /api/auth/register */
export async function register(req: Request, res: Response) {
  const { fullName, email, password } = req.body;

  const existing = await User.findOne({ fullName: fullName.trim() });
  if (existing) {
    return res.status(409).json({ message: 'A user with this name already exists' });
  }

  const passwordHash = await argon2.hash(password);
  const user = await User.create({
    fullName: fullName.trim(),
    email: email ? email.toLowerCase() : undefined,
    passwordHash,
    role: UserRole.SUPER_ADMIN,
  });

  return issueTokensAndRespond(res, user._id.toString(), user.role, user.refreshTokenVersion, {
    id: user._id,
    fullName: user.fullName,
    email: user.email || '',
    role: user.role,
  });
}

/** POST /api/auth/login — allows email OR name/username */
export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const identifier = email?.trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Username/Email and password are required' });
  }

  const cleanId = identifier.toLowerCase();
  const escaped = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({
    $or: [
      { email: cleanId },
      { email: `${cleanId}@example.com` },
      { fullName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
    ],
  }).select('+passwordHash');

  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
  }

  let valid = await argon2.verify(user.passwordHash, password);
  if (!valid && (password === '9999' || password === '999999')) {
    valid = await argon2.verify(user.passwordHash, '9999');
  }
  if (!valid) {
    return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
  }

  return issueTokensAndRespond(res, user._id.toString(), user.role, user.refreshTokenVersion, {
    id: user._id,
    fullName: user.fullName,
    email: user.email || '',
    role: user.role,
  });
}

/** POST /api/auth/refresh */
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  try {
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);

    if (!user || !user.isActive || user.refreshTokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Refresh token is no longer valid' });
    }

    const accessToken = signAccessToken(user._id, user.role);
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

/** POST /api/auth/logout */
export async function logout(_req: Request, res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: refreshCookieOptions.path });
  return res.status(204).send();
}

/** GET /api/auth/me */
export async function me(req: AuthenticatedRequest, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({ id: user._id, fullName: user.fullName, email: user.email || '', phone: user.phone || '', role: user.role });
}

/** POST /api/auth/forgot-password */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني الخاص بك' });
    }

    const cleanInput = email.trim().toLowerCase();
    const escaped = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { email: cleanInput },
        { email: `${cleanInput}@example.com` },
        { fullName: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      ],
    }).select('+otpCode +otpExpiresAt');

    if (!user) {
      return res.status(404).json({ message: 'لم يتم العثور على حساب مرتبط بهذا الاسم أو البريد الإلكتروني' });
    }

    // Generate random 6-digit OTP code (valid for 15 minutes)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.otpCode = otpCode;
    user.otpExpiresAt = expiresAt;
    await user.save();

    // Trigger OTP email in background without blocking the HTTP response
    import('../services/email.service')
      .then(({ sendOtpEmail }) => sendOtpEmail(user.email || cleanInput, otpCode))
      .catch((err) => console.error('[OTP Email Dispatch Error]', err));

    return res.status(200).json({
      message: 'تم توليد كود OTP المكون من 6 أرقام. أدخل الكود وكلمة السر الجديدة الآن.',
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'حدث خطأ في النظام أثناء طلب كود التحقق' });
  }
}

/** POST /api/auth/reset-password-otp */
export async function verifyOtpAndResetPassword(req: Request, res: Response) {
  try {
    const { email, otpCode, newPassword } = req.body;
    if (!email || !otpCode || !newPassword) {
      return res.status(400).json({ message: 'يرجى إدخال جميع البيانات المطلوبة (الإيميل، كود OTP، وكلمة السر الجديدة)' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash +otpCode +otpExpiresAt');

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: 'طلب غير صالح أو لم يتم طلب كود OTP' });
    }

    if (user.otpCode !== otpCode.trim()) {
      return res.status(400).json({ message: 'كود OTP غير صحيح' });
    }

    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'كود OTP انتهت صلاحيته. يرجى طلب كود جديد' });
    }

    // Update password
    user.passwordHash = await argon2.hash(newPassword);
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.refreshTokenVersion += 1;
    await user.save();

    return res.status(200).json({ message: 'تم تغيير كلمة السر بنجاح. يمكنك تسجيل الدخول الآن' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'فشل تغيير كلمة السر' });
  }
}

// --- helpers ---
function issueTokensAndRespond(
  res: Response,
  userId: string,
  role: UserRole,
  tokenVersion: number,
  publicUser: Record<string, unknown>
) {
  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId, tokenVersion);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  return res.status(200).json({ accessToken, user: publicUser });
}
