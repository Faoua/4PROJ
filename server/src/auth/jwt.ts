import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const rawSecret = process.env.JWT_SECRET;
const JWT_SECRET: jwt.Secret = (rawSecret && rawSecret.trim()) || 'dev-secret';

export type JwtPayload = { sub: string; email: string };

// 7 jours en secondes (nombre pour éviter l'overload TS)
export function signAccessToken(payload: JwtPayload, expiresInSec = 7 * 24 * 60 * 60) {
  const options: jwt.SignOptions = { expiresIn: expiresInSec };
  return jwt.sign(payload as jwt.JwtPayload, JWT_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  return decoded as JwtPayload;
}

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    // @ts-expect-error attach
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
