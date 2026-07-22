import express from 'express';
import { getRequirements } from '../controllers/courseController.js';

const router = express.Router();

router.get('/', getRequirements);

export default router;
