import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { attachSession } from './middleware/authMiddleware.js';
import { authHandler } from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
dotenv.config();
const app = express();
// === CORS CONFIGURATION ===
const allowedOrigins = [
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    'http://localhost:5173', // Vite dev
    'http://localhost:3016', // backend
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3016',
    'https://polarisstyle.ir',
    'http://polarisstyle.ir',
    'https://www.polarisstyle.ir',
    'https://api.polarisstyle.ir',
    'http://api.polarisstyle.ir',
].filter((o) => Boolean(o));
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (same-origin, mobile apps, curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Static files (cPanel public assets if served from Node)
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));
// better-auth owns /api/auth/* — mounted before JSON-parsed API routes.
// app.all preserves req.url so the handler sees the full path.
app.all('/api/auth/{*splat}', authHandler);
// Session attribution for audit logs (never blocks)
app.use('/api', attachSession);
// Business API
app.use('/api', apiRoutes);
// Global Error Handler
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map