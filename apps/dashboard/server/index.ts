import express from 'express';
import cookieSession from 'cookie-session';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { login, logout, requireAuth, SESSION_SECRET_STR } from './auth.ts';
import { api } from './routes.ts';

const app = express();
const PORT = Number(process.env['PORT'] ?? 8787);
const isProd = process.env['NODE_ENV'] === 'production';

app.set('trust proxy', 1); // needed for correct req.ip + secure cookies behind a proxy
app.use(express.json({ limit: '1mb' }));

app.use(cookieSession({
  name: 'ciso.sid',
  secret: SESSION_SECRET_STR,
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 8 * 60 * 60 * 1000, // 8h
}));

// Public auth endpoint (rate-limited inside the handler).
app.post('/api/login', login);
app.post('/api/logout', logout);

// Everything else under /api requires a session.
app.use('/api', requireAuth, api);

// In production, serve the built SPA and fall back to index.html for client routes.
const webDir = fileURLToPath(new URL('../dist-web', import.meta.url));
if (isProd && existsSync(webDir)) {
  app.use(express.static(webDir));
  app.get('*', (_req, res) => {
    res.sendFile(fileURLToPath(new URL('../dist-web/index.html', import.meta.url)));
  });
}

app.listen(PORT, () => {
  console.error(`[ciso-dashboard] listening on :${PORT} (${isProd ? 'production' : 'development'})`);
});
