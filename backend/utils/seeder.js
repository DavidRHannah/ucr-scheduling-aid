import fs from 'fs';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Requirement } from '../models/Requirement.js';
import { buildCourseUpsert, buildSectionUpsert } from './bannerTransform.js';

// Ingests one Banner search-results payload ({ success, data: [...] }) worth
// of sections, upserting Courses and Sections. Returns counts.
const ingestSections = async (sisSections) => {
  let coursesSynced = 0;
  let sectionsSynced = 0;

  for (const sectionData of sisSections) {
    try {
      const { query: courseQuery, payload: coursePayload } = buildCourseUpsert(sectionData);
      const course = await Course.findOneAndUpdate(courseQuery, coursePayload, {
        upsert: true,
        new: true
      });
      coursesSynced++;

      const { query: sectionQuery, payload: sectionPayload } = buildSectionUpsert(sectionData, course._id);
      await Section.findOneAndUpdate(sectionQuery, sectionPayload, {
        upsert: true
      });
      sectionsSynced++;
    } catch (err) {
      // Silence single section failures during auto-seed
    }
  }

  return { coursesSynced, sectionsSynced };
};

// Loads every *.json file in backend/data/raw/ (raw captured Banner
// searchResults dumps, one per subject/term) and ingests them all.
const ingestRawDumpsDir = async () => {
  const rawDir = new URL('../data/raw/', import.meta.url);
  if (!fs.existsSync(rawDir)) {
    return { coursesSynced: 0, sectionsSynced: 0, files: 0 };
  }

  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.json'));
  let coursesSynced = 0;
  let sectionsSynced = 0;

  for (const file of files) {
    const raw = fs.readFileSync(new URL(file, rawDir), 'utf-8');
    const parsed = JSON.parse(raw);
    const sisSections = parsed.data || [];
    const result = await ingestSections(sisSections);
    coursesSynced += result.coursesSynced;
    sectionsSynced += result.sectionsSynced;
  }

  return { coursesSynced, sectionsSynced, files: files.length };
};

export const autoSeed = async () => {
  try {
    const courseCount = await Course.countDocuments();
    if (courseCount > 0) {
      console.log('Database already has course catalog data. Skipping auto-seed.');
      return;
    }

    console.log('Database empty. Initiating automatic data seeding...');

    // 1. Ingest Requirements from reqs.json
    const reqsUrl = new URL('../reqs.json', import.meta.url);
    const rawReqs = fs.readFileSync(reqsUrl, 'utf-8');
    const reqsData = JSON.parse(rawReqs);

    const reqUpserts = reqsData.map(r => ({
      updateOne: {
        filter: { code: r.code },
        update: { code: r.code, description: r.description },
        upsert: true
      }
    }));
    await Requirement.bulkWrite(reqUpserts);
    console.log(`Auto-seeded ${reqsData.length} General Education Breadth Requirements.`);

    // 2. Ingest Courses & Sections from EN-AbetDepth.json
    const sisUrl = new URL('../EN-AbetDepth.json', import.meta.url);
    const rawSis = fs.readFileSync(sisUrl, 'utf-8');
    const sisResponse = JSON.parse(rawSis);
    const abetResult = await ingestSections(sisResponse.data || []);

    // 3. Ingest any manually captured Banner dumps from data/raw/
    const rawResult = await ingestRawDumpsDir();
    if (rawResult.files > 0) {
      console.log(`Auto-seeded ${rawResult.files} raw Banner dump file(s) from data/raw/.`);
    }

    const totalCourses = abetResult.coursesSynced + rawResult.coursesSynced;
    const totalSections = abetResult.sectionsSynced + rawResult.sectionsSynced;
    console.log(`Auto-seeding complete. Imported ${totalCourses} courses and ${totalSections} sections.`);
  } catch (error) {
    console.error('Auto-seed failed:', error);
  }
};

// Force re-ingestion of everything under data/raw/, regardless of whether
// the database already has data. Used by the manual `npm run seed:raw` script.
export const seedRawDumps = async () => {
  const result = await ingestRawDumpsDir();
  console.log(`Ingested ${result.files} file(s) from data/raw/: ${result.coursesSynced} courses, ${result.sectionsSynced} sections.`);
  return result;
};
