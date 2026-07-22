import express from 'express';
import { generateSchedules, generateInvalidSchedules } from '../controllers/generatorController.js';

const router = express.Router();

router.post('/generate', generateSchedules);
router.post('/generate/invalid', generateInvalidSchedules);

export default router;
