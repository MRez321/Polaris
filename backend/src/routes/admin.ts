import { Router } from 'express';
import { protectRoute, requireRole } from '../middleware/authMiddleware.js';
import { getAuditLogs, getAllUsers } from '../controllers/adminController.js';

const router = Router();

router.use(protectRoute, requireRole(['admin']));

router.get('/logs', getAuditLogs);
router.get('/users', getAllUsers);

export default router;