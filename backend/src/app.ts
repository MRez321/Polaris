import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
// import cookieParser from 'cookie-parser';
import path from 'path';

// import { errorHandler } from './middleware/errorHandler.js';
// import optimizeRoutes from './routes/optimizeRoutes.js';
// import authRoutes from './routes/authRoutes.js';


const app = express();




// === UPDATED CORS CONFIGURATION ===
const allowedOrigins = [
    process.env.CORS_ORIGIN,
    'http://localhost:5173',   // Vite dev
    'http://localhost:3200',   // if you ever run backend on 3200
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3200',
    'https://pixelstar.ir',
].filter(Boolean); // remove undefined/null

app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
// ==================================
// app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files

// app.use(express.static(path.join(process.cwd(), 'public')));

const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));


// app.use('/data', express.static(path.join(process.cwd(), 'data'), {
//     setHeaders: (res) => {
//         res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
//     }
// }));


// Routes


// API Routes
// app.use('/api', optimizeRoutes);
// app.use('/api/optimize', optimizeRoutes);
// app.use('/api/auth', authRoutes);


// Global Error Handler
// app.use(errorHandler);


export default app;
