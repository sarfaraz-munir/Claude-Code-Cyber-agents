import { timingSafeEqual, randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const PASSWORD = process.env['DASHBOARD_PASSWORD'];
const SESSION_SECRET = process.env['SESSION_SECRET'];

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required (set it in the environment).');
}
if (!PASSWORD) {
  throw new Error('DASHBOARD_PASSWORD is required (set it in the environment).');
}
// After the guards above, these are definitely strings.
const PASSWORD_STR: string = PASSWORD;
export const SESSION_SECRET_STR: string = SESSION_SECRET;

/** Constant-time password check. Never early-returns on length (that leaks length). */
function passwordMatches(candidate: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(PASSWORD_STR);
  if (a.length !== b.length) {
    // Run a dummy compare of equal length so timing does not reveal the mismatch, then fail.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

// ── Login rate limiting: 10 attempts / IP / 15 min ──────────────────────────────
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export const login: RequestHandler = (req: Request, res: Response) => {
  const ip = req.ip ?? 'unknown';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'too many attempts, try again later' });
    return;
  }
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!passwordMatches(password)) {
    res.status(401).json({ error: 'invalid credentials' });
    return;
  }
  if (req.session) req.session.authed = true;
  res.json({ ok: true });
};

export const logout: RequestHandler = (req: Request, res: Response) => {
  if (req.session) req.session.authed = false;
  res.json({ ok: true });
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (req.session?.authed === true) {
    next();
    return;
  }
  res.status(401).json({ error: 'authentication required' });
};

/** Generates a fallback secret only for local dev if none provided (never reached — guarded above). */
export function devSecret(): string {
  return randomBytes(32).toString('hex');
}
