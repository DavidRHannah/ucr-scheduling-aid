import fs from 'fs';
import { Course } from '../models/Course.js';
import { Section } from '../models/Section.js';
import { Requirement } from '../models/Requirement.js';

// Helper to convert time "1230" to "12:30"
const formatTime = (timeStr) => {
  if (!timeStr) return null;
  if (timeStr.includes(':')) return timeStr;
  const cleaned = timeStr.padStart(4, '0');
  return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
};

// Helper to map weekday booleans to array
const mapWeekDays = (meet) => {
  const weekDays = [];
  if (meet.monday) weekDays.push('M');
  if (meet.tuesday) weekDays.push('T');
  if (meet.wednesday) weekDays.push('W');
  if (meet.thursday) weekDays.push('R');
  if (meet.friday) weekDays.push('F');
  if (meet.saturday) weekDays.push('S');
  if (meet.sunday) weekDays.push('U');
  return weekDays;
};

// Map Banner description to schema code
const mapScheduleType = (desc) => {
  const d = (desc || '').toUpperCase();
  if (d.includes('LECTURE')) return 'LEC';
  if (d.includes('DISCUSSION')) return 'DIS';
  if (d.includes('LAB')) return 'LAB';
  if (d.includes('SEMINAR')) return 'SEM';
  return 'IND';
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
    const sisSections = sisResponse.data || [];

    let coursesSynced = 0;
    let sectionsSynced = 0;

    for (const sectionData of sisSections) {
      try {
        // Upsert Course
        const courseQuery = {
          subject: sectionData.subject,
          courseNumber: sectionData.courseNumber
        };
        
        const coursePayload = {
          ...courseQuery,
          title: sectionData.courseTitle,
          creditHours: {
            low: sectionData.creditHourLow || 4,
            high: sectionData.creditHourHigh || 4
          },
          description: sectionData.courseDescription || '',
          college: sectionData.collegeCode || 'CENG',
          department: sectionData.departmentDescription || 'Engineering'
        };

        const course = await Course.findOneAndUpdate(courseQuery, coursePayload, {
          upsert: true,
          new: true
        });
        coursesSynced++;

        // Map Meeting Times
        const meetings = (sectionData.meetingsFaculty || []).map(m => {
          const meet = m.meetingTime || {};
          return {
            weekDays: mapWeekDays(meet),
            startTime: formatTime(meet.beginTime) || '08:00',
            endTime: formatTime(meet.endTime) || '09:00',
            meetingType: {
              code: meet.meetingType || 'LEC',
              description: meet.meetingTypeDescription || 'Lecture'
            },
            buildingDescription: meet.buildingDescription || null,
            room: meet.room || null
          };
        }).filter(m => m.startTime && m.endTime);

        // Find primary instructor name
        const primaryFaculty = (sectionData.faculty || []).find(f => f.primaryIndicator);
        const instructorName = primaryFaculty ? primaryFaculty.displayName : 'Staff';

        // Upsert Section
        const sectionQuery = {
          crn: sectionData.courseReferenceNumber,
          termCode: sectionData.term
        };

        let status = 'Open';
        if (sectionData.enrollment >= sectionData.maximumEnrollment) {
          status = (sectionData.waitCount > 0) ? 'Waitlisted' : 'Closed';
        }

        const sectionPayload = {
          courseId: course._id,
          crn: sectionData.courseReferenceNumber,
          sectionNumber: sectionData.sequenceNumber || '001',
          termCode: sectionData.term,
          subject: sectionData.subject,
          courseNumber: sectionData.courseNumber,
          courseTitle: sectionData.courseTitle,
          creditHours: sectionData.creditHourLow || 4,
          scheduleType: {
            code: mapScheduleType(sectionData.scheduleTypeDescription),
            description: sectionData.scheduleTypeDescription || 'Lecture'
          },
          instructor: instructorName,
          meetingTimes: meetings,
          enrollmentMax: sectionData.maximumEnrollment || 30,
          enrollmentCurrent: sectionData.enrollment || 0,
          waitlistTotal: sectionData.waitCapacity || 0,
          waitlistRemaining: sectionData.waitAvailable || 0,
          status,
          campus: sectionData.campusDescription || 'Main Campus',
          requirementDesignation: sectionData.requirementDesignation || null,
          linkIdentifier: sectionData.linkIdentifier || null
        };

        await Section.findOneAndUpdate(sectionQuery, sectionPayload, {
          upsert: true
        });
        sectionsSynced++;
      } catch (err) {
        // Silence single section failures during auto-seed
      }
    }

    console.log(`Auto-seeding complete. Imported ${coursesSynced} courses and ${sectionsSynced} sections.`);
  } catch (error) {
    console.error('Auto-seed failed:', error);
  }
};
