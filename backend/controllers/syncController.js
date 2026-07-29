import fs from 'fs';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Requirement } from '../models/Requirement.js';
import { buildCourseUpsert, buildSectionUpsert } from '../utils/bannerTransform.js';

export const syncData = async (req, res) => {
  const { termCode, subjects } = req.body;

  if (!termCode) {
    return res.status(400).json({
      message: 'termCode is required.'
    });
  }

  try {
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

    // 2. Ingest Courses & Sections from EN-AbetDepth.json
    const sisUrl = new URL('../EN-AbetDepth.json', import.meta.url);
    const rawSis = fs.readFileSync(sisUrl, 'utf-8');
    const sisResponse = JSON.parse(rawSis);
    const sisSections = sisResponse.data || [];

    let coursesSynced = 0;
    let sectionsSynced = 0;
    const errors = [];

    // Filter by subjects if provided
    const targetSections = subjects && subjects.length > 0
      ? sisSections.filter(s => subjects.includes(s.subject))
      : sisSections;

    // We process sections sequentially or in simple chunks to correctly manage Course ID references
    for (const sectionData of targetSections) {
      try {
        // Enforce termCode filter if matching
        if (sectionData.term !== termCode) {
          continue;
        }

        // 2a. Upsert Course
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
        errors.push(`Failed syncing CRN ${sectionData.courseReferenceNumber}: ${err.message}`);
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        synced: { courses: coursesSynced, sections: sectionsSynced },
        errors
      });
    }

    res.json({
      synced: { courses: coursesSynced, sections: sectionsSynced }
    });
  } catch (error) {
    console.error('Data Sync Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const bulkIntake = async (req, res) => {
  const { courses, sections } = req.body;

  if (!Array.isArray(courses) || !Array.isArray(sections)) {
    return res.status(400).json({
      message: 'courses and sections arrays are required.'
    });
  }

  try {
    const courseUpserts = courses.map(c => ({
      updateOne: {
        filter: { subject: c.subject, courseNumber: c.courseNumber },
        update: c,
        upsert: true
      }
    }));
    const sectionUpserts = sections.map(s => ({
      updateOne: {
        filter: { crn: s.crn, termCode: s.termCode },
        update: s,
        upsert: true
      }
    }));

    await Course.bulkWrite(courseUpserts);
    await Section.bulkWrite(sectionUpserts);

    res.json({
      ingested: {
        courses: courses.length,
        sections: sections.length
      }
    });
  } catch (error) {
    console.error('Bulk Ingest Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};
