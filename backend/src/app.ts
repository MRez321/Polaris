import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import { errorHandler } from './core/middleware/errorHandler.js';
import { attachSession } from './core/middleware/authMiddleware.js';
import { isLocalDevOrigin, trustedOrigins } from './core/origins.js';
import { authHandler } from './routes/authRoutes.js';
import apiRoutes, { workshopAdminChain } from './routes/apiRoutes.js';
import { ensureUploadsDir, uploadsDir } from './services/galleryService.js';

dotenv.config();

const app = express();
// cPanel and similar setups put Express behind a reverse proxy: trust
// X-Forwarded-* so req.ip is the real client IP (used for audit logs).
app.set('trust proxy', true);

// === CORS CONFIGURATION ===
// Origin trust lists live in one place: src/core/origins.ts (shared with
// better-auth's CSRF gate and socket.io — they can no longer drift).
app.use(
    cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (same-origin, mobile apps, curl)
            if (!origin || trustedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
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

// Workshop module at its own prefix (same admin-gated chain apiRoutes mounts
// inline; alias mounts are removed in Phase 5 once the frontend migrates).
app.use('/api/workshop', workshopAdminChain);

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
