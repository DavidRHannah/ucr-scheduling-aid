import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import requirementRoutes from './routes/requirementRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import generatorRoutes from './routes/generatorRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';

// Load environment variables
dotenv.config();

// Connect to Database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

// Standard Security & Utility Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api', syncRoutes);
app.use('/api', generatorRoutes);

// Basic Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'UCR Scheduling Aid API is running'
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An unexpected error occurred on the server.'
  });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export default app;
