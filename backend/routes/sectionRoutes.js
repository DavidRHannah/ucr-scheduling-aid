import express from 'express';
import {
  getSectionsByCourse,
  getSectionByCrn,
  getSectionById,
  getLinkedSections
} from '../controllers/sectionController.js';

const router = express.Router();

router.get('/course/:courseId', getSectionsByCourse);
router.get('/crn/:crn', getSectionByCrn);
router.get('/:id', getSectionById);
router.get('/:id/linked', getLinkedSections);

export default router;
