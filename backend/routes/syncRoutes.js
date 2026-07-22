import express from 'express';
import { syncData, bulkIntake } from '../controllers/syncController.js';
import { protectAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.post('/sync', protectAdmin, syncData);
router.post('/intake', protectAdmin, bulkIntake);

export default router;
