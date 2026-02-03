import express from 'express';
import { listAuditLogs } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/audit-logs', protect, adminOnly, listAuditLogs);

export default router;
