import express from 'express';
import { getCourses, getCourseById, getCoursePrerequisites } from '../controllers/courseController.js';

const router = express.Router();

router.get('/', getCourses);
router.get('/:id', getCourseById);
router.get('/:id/prerequisites', getCoursePrerequisites);

export default router;
