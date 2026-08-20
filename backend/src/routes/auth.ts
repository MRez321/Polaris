import { Router } from 'express';
import { handleAuth } from '../controllers/authController.js';

const router = Router();

router.all('/api/auth/*', handleAuth);

export default router;