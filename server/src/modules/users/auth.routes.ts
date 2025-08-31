import { Router } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma';
import { signAccessToken, authGuard } from '../../auth/jwt';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(60).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  try {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { email, password, displayName } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, displayName: displayName ?? null },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return res.status(201).json({ user, accessToken });
  } catch (e: any) {
    console.error('REGISTER_ERROR:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    return res.json({
      user: { id: user.id, email: user.email, displayName: user.displayName, createdAt: user.createdAt },
      accessToken,
    });
  } catch (e: any) {
    console.error('LOGIN_ERROR:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
});

router.get('/me', authGuard, async (req, res) => {
  try {
    // @ts-expect-error populated by authGuard
    const { sub } = req.user as { sub: string };
    const me = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, displayName: true, createdAt: true },
    });
    if (!me) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: me });
  } catch (e: any) {
    console.error('ME_ERROR:', e);
    return res.status(500).json({ error: 'Internal Server Error', details: e?.message });
  }
});

export default router;
