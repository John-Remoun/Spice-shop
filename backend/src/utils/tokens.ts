import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error(
    'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in the environment. See .env.example.'
  );
}

export interface AccessTokenPayload {
  sub: string; // user id
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(userId: Types.ObjectId | string, role: string): string {
  const payload: AccessTokenPayload = { sub: userId.toString(), role };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function signRefreshToken(userId: Types.ObjectId | string, tokenVersion: number): string {
  const payload: RefreshTokenPayload = { sub: userId.toString(), tokenVersion };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/api/auth', // scope the cookie to the auth routes only
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days, keep in sync with REFRESH_EXPIRES_IN
};
