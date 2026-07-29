// Manually re-ingest every captured Banner dump in backend/data/raw/,
// without wiping the database first. Safe to re-run: Course/Section
// upserts are keyed on (subject, courseNumber) and (crn, termCode).
//
// Usage: npm run seed:raw

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { seedRawDumps } from '../utils/seeder.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  await seedRawDumps();

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((err) => {
  console.error('seed:raw failed:', err);
  process.exit(1);
});
