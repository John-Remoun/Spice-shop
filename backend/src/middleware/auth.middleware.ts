import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/tokens';
import { UserRole } from '../types/enums';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: UserRole };
}

/**
 * Requires a valid, non-expired Access Token in the Authorization header.
 *   Authorization: Bearer <accessToken>
 * On success attaches `req.user = { id, role }`. Does NOT touch the DB —
 * cheap, stateless check on every request. Refresh flow lives in
 * auth.controller.ts / POST /api/auth/refresh.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role as UserRole };
    return next();
  } catch (err) {
    // Distinguish expiry so the frontend axios interceptor knows to hit /refresh
    // vs. a hard-invalid token that should force logout.
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid access token' });
  }
}

/** Role guard — chain after requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  };
}
