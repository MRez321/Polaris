import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';

// import { errorHandler } from './middleware/errorHandler.js';
// import optimizeRoutes from './routes/optimizeRoutes.js';
import authRoutes from './routes/auth.js';


const app = express();




// === UPDATED CORS CONFIGURATION ===
const allowedOrigins = [
    process.env.CORS_ORIGIN,
    'http://localhost:5173',   // Vite dev
    'http://localhost:3016',   // backend on 3216
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3216',
    'https://polarisstyle.ir',
    'http://polarisstyle.ir',
    'https://api.polarisstyle.ir',
    'http://api.polarisstyle.ir',
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

// app.use(express.static(path.join(process.cwd(), 'public')));

const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));


// app.use('/data', express.static(path.join(process.cwd(), 'data'), {
//     setHeaders: (res) => {
//         res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
//     }
// }));


// Routes
app.use(authRoutes);


// API Routes
// app.use('/api', optimizeRoutes);
// app.use('/api/optimize', optimizeRoutes);
// app.use('/api/auth', authRoutes);


// Global Error Handler
// app.use(errorHandler);


export default app;
