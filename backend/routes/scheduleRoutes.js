import express from 'express';
import {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  analyzeSchedule,
  exportIcs
} from '../controllers/scheduleController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Simple in-memory rate limiter for public calendar feeds
const ipRequests = new Map();
const icsRateLimiter = (maxRequests, windowMs) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!ipRequests.has(ip)) {
      ipRequests.set(ip, []);
    }

    let timestamps = ipRequests.get(ip);
    // Filter out timestamps outside window
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        message: 'Too many calendar export requests from this IP. Please try again later.'
      });
    }

    timestamps.push(now);
    ipRequests.set(ip, timestamps);
    next();
  };
};

// JWT Protected CRUD and Analysis Routes
router.use('/analyze', protect); // Ensure /:id/analyze gets caught correctly below or mount explicitly
router.post('/', protect, createSchedule);
router.get('/', protect, getSchedules);
router.get('/:id', protect, getScheduleById);
router.patch('/:id', protect, updateSchedule);
router.delete('/:id', protect, deleteSchedule);
router.get('/:id/analyze', protect, analyzeSchedule);

// Public Rate-Limited Export Route
router.get('/:scheduleId/export.ics', icsRateLimiter(60, 60000), exportIcs); // 60 requests per minute

export default router;
