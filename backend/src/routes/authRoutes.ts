import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protectRoute, requireRole } from '../middleware/authMiddleware.js';
import {
    handleAuth,
    getMe,
    updateProfile,
    logoutAll,
} from '../controllers/authController.js';

const router = Router();

// Rate Limiter Configuration
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Limit each IP to 20 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication requests, please try again later' },
});

// --- Public Routes ---

// Better Auth Handler (Handles sign-in, sign-up, social callbacks, etc.)
// We apply rate limiting here to protect against brute force
router.all('/api/auth/*path', authLimiter, handleAuth);

// --- Protected Routes ---

// Get current user profile
router.get('/me', protectRoute, getMe);

// Update user profile (e.g., change name or role)
router.patch('/profile', protectRoute, updateProfile);

// Admin only: Logout all users (useful for security breaches)
router.post('/logout-all', protectRoute, requireRole(['admin']), logoutAll);

export default router;