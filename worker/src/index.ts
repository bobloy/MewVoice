import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authRoutes } from './routes/auth';
import { voicepackRoutes } from './routes/voicepacks';

const app = new Hono<{ Bindings: Env }>();

// CORS — in production, SPA and API share the same domain so CORS isn't
// strictly needed, but we keep it for local dev (localhost:3000 → :8787)
app.use('/api/*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/voicepacks', voicepackRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

export default app;
