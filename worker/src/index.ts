import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authRoutes } from './routes/auth';
import { voicepackRoutes } from './routes/voicepacks';

const app = new Hono<{ Bindings: Env }>();

// CORS — in production, SPA and API share the same domain so this is only
// needed for local dev (Vite :5173 → Worker :8787). Restrict to the site
// origin and localhost to prevent other sites from making credentialed requests.
app.use('/api/*', cors({
  origin: (origin, c) => {
    const siteOrigin = (c.env as Env).SITE_ORIGIN;
    if (origin === siteOrigin) return origin;
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Security headers on every response
app.use('*', async (c, next) => {
  await next();
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/voicepacks', voicepackRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

export default app;
