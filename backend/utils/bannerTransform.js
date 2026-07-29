// Shared helpers for transforming raw UCR Banner (SSB) search-results JSON
// into the Course/Section document shapes used by our Mongoose schemas.

// Convert Banner time "1230" to "12:30"
export const formatTime = (timeStr) => {
  if (!timeStr) return null;
  if (timeStr.includes(':')) return timeStr;
  const cleaned = timeStr.padStart(4, '0');
  return `${cleaned.slice(0, 2)}:${cleaned.slice(2)}`;
};

// Map Banner weekday booleans to a weekDays array
export const mapWeekDays = (meet) => {
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

// Map Banner schedule type description to our schema code
export const mapScheduleType = (desc) => {
  const d = (desc || '').toUpperCase();
  if (d.includes('LECTURE')) return 'LEC';
  if (d.includes('DISCUSSION')) return 'DIS';
  if (d.includes('LAB')) return 'LAB';
  if (d.includes('SEMINAR')) return 'SEM';
  return 'IND';
};

// Build the Course upsert query + payload for one Banner section record
export const buildCourseUpsert = (sectionData) => {
  const query = {
    subject: sectionData.subject,
    courseNumber: sectionData.courseNumber
  };
  const payload = {
    ...query,
    title: sectionData.courseTitle,
    creditHours: {
      low: sectionData.creditHourLow || 4,
      high: sectionData.creditHourHigh || 4
    },
    description: sectionData.courseDescription || '',
    college: sectionData.collegeCode || 'CENG',
    department: sectionData.departmentDescription || 'Engineering'
  };
  return { query, payload };
};

// Build the Section upsert query + payload for one Banner section record.
// Requires the resolved Mongoose Course _id.
export const buildSectionUpsert = (sectionData, courseId) => {
  const meetings = (sectionData.meetingsFaculty || [])
    .map((m) => {
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
    })
    .filter((m) => m.startTime && m.endTime);

  const primaryFaculty = (sectionData.faculty || []).find((f) => f.primaryIndicator);
  const instructorName = primaryFaculty ? primaryFaculty.displayName : 'Staff';

  let status = 'Open';
  if (sectionData.enrollment >= sectionData.maximumEnrollment) {
    status = sectionData.waitCount > 0 ? 'Waitlisted' : 'Closed';
  }

  const query = {
    crn: sectionData.courseReferenceNumber,
    termCode: sectionData.term
  };
  const payload = {
    courseId,
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
  return { query, payload };
};
