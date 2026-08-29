import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler.js';
import { attachSession } from './middleware/authMiddleware.js';
import { authHandler } from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import { ensureUploadsDir, uploadsDir } from './services/galleryService.js';

dotenv.config();

const app = express();
// cPanel and similar setups put Express behind a reverse proxy: trust
// X-Forwarded-* so req.ip is the real client IP (used for audit logs).
app.set('trust proxy', true);

// === CORS CONFIGURATION ===
const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    'http://localhost:3016', // backend
    'http://127.0.0.1:3016',
    'https://polarisstyle.ir',
    'http://polarisstyle.ir',
    'https://www.polarisstyle.ir',
].filter((o): o is string => Boolean(o));

// Vite auto-increments the dev port when 5173 is taken (5174, 5175, …),
// so allow the whole local dev range instead of one pinned port. Keep this
// in sync with `localDevOrigins` in src/config/auth.ts (better-auth gate).
const LOCAL_DEV_ORIGINS: Record<string, true> = Object.fromEntries(
    ['localhost', '127.0.0.1'].flatMap((host) =>
        [5173, 5174, 5175, 3000, 3001].map(
            (port) => [`http://${host}:${port}`, true] as [string, true],
        ),
    ),
);

app.use(
    cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (same-origin, mobile apps, curl)
            if (!origin || allowedOrigins.includes(origin) || LOCAL_DEV_ORIGINS[origin]) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }),
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Frontend build: CI uploads the Vite build into ./public (cPanel
// FRONTEND_PATH). Express serves it on the same origin as the API.
const publicPath = path.join(process.cwd(), 'public');
ensureUploadsDir();
app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));

// better-auth owns /api/auth/* — mounted before JSON-parsed API routes.
// app.all preserves req.url so the handler sees the full path.
app.all('/api/auth/{*splat}', authHandler);

// Session attribution for audit logs (never blocks)
app.use('/api', attachSession);

// Business API
app.use('/api', apiRoutes);

// Unknown API routes → JSON 404 (never fall through to the SPA)
app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'مسیر API یافت نشد' });
});

// SPA fallback: client-side routes (React Router) deep-link to paths the
// backend doesn't own; serve index.html so the frontend handles routing.
app.get('{*splat}', (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.sendFile(path.join(publicPath, 'index.html'), (err) => {
        if (err) next(err);
    });
});

// Global Error Handler
app.use(errorHandler);

export default app;
