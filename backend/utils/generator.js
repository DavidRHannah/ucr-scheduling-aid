import { Section } from '../models/Section.js';
import { Course } from '../models/Course.js';

// Helper to convert "HH:mm" to minutes from midnight
const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
};

// Helper to convert minutes from midnight to "HH:mm"
const toTimeString = (totalMins) => {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check if two meeting times overlap
const meetOverlaps = (meetA, meetB) => {
  const commonDays = meetA.weekDays.filter(d => meetB.weekDays.includes(d));
  if (commonDays.length === 0) return false;

  const startA = toMinutes(meetA.startTime);
  const endA = toMinutes(meetA.endTime);
  const startB = toMinutes(meetB.startTime);
  const endB = toMinutes(meetB.endTime);

  return startA < endB && startB < endA;
};

// Check if two sections conflict
const sectionsConflict = (secA, secB) => {
  for (const meetA of secA.meetingTimes) {
    for (const meetB of secB.meetingTimes) {
      if (meetOverlaps(meetA, meetB)) {
        return {
          day: meetA.weekDays.find(d => meetB.weekDays.includes(d)) || 'M',
          overlapStart: toTimeString(Math.max(toMinutes(meetA.startTime), toMinutes(meetB.startTime))),
          overlapEnd: toTimeString(Math.min(toMinutes(meetA.endTime), toMinutes(meetB.endTime)))
        };
      }
    }
  }
  return null;
};

// Main generator backtracking implementation
export const generateCombinations = async (courseIds, termCode, lockedSectionIds = [], allowConflicts = false) => {
  // 1. Load locked sections
  let lockedSections = [];
  if (lockedSectionIds.length > 0) {
    lockedSections = await Section.find({ _id: { $in: lockedSectionIds } }).populate('courseId');
  }

  // Get list of courses from locked sections to include in execution scope
  const lockedCourseIds = lockedSections.map(s => s.courseId._id.toString());
  
  // Combine all course IDs uniquely
  const allCourseIds = Array.from(new Set([...courseIds, ...lockedCourseIds]));

  if (allCourseIds.length === 0) {
    return [];
  }

  // Fetch all sections in scope
  const sectionsInScope = await Section.find({
    courseId: { $in: allCourseIds },
    termCode
  }).populate('courseId');

  // 2. Group sections into pools by Course and Schedule Type (e.g. CS10 Lecture, CS10 Lab)
  const poolsMap = {};
  sectionsInScope.forEach(sec => {
    const cId = sec.courseId._id.toString();
    const typeCode = sec.scheduleType.code;
    const poolKey = `${cId}_${typeCode}`;

    if (!poolsMap[poolKey]) {
      poolsMap[poolKey] = {
        courseId: cId,
        typeCode,
        courseRef: sec.courseId,
        sections: []
      };
    }
    
    // Check if this component has a locked section
    const lockedForThisComponent = lockedSections.find(ls => 
      ls.courseId._id.toString() === cId && ls.scheduleType.code === typeCode
    );

    if (lockedForThisComponent) {
      // If locked, only this section is a candidate
      if (lockedForThisComponent._id.toString() === sec._id.toString()) {
        poolsMap[poolKey].sections = [sec];
      }
    } else {
      poolsMap[poolKey].sections.push(sec);
    }
  });

  const pools = Object.values(poolsMap).filter(p => p.sections.length > 0);

  // If we have course components in scope, but some have 0 sections available, no combinations can exist
  const expectedPoolCount = allCourseIds.reduce((acc, cId) => {
    const componentTypes = Array.from(new Set(
      sectionsInScope.filter(s => s.courseId._id.toString() === cId).map(s => s.scheduleType.code)
    ));
    return acc + componentTypes.length;
  }, 0);

  if (pools.length < expectedPoolCount) {
    return [];
  }

  const results = [];

  const backtrack = (poolIdx, currentSelection) => {
    if (poolIdx === pools.length) {
      // 3. Complete valid schedule found - calculate metrics
      const scheduleResult = formatSchedule(currentSelection);
      results.push(scheduleResult);
      return;
    }

    const currentPool = pools[poolIdx];
    
    for (const section of currentPool.sections) {
      let conflictsList = [];
      let hasConflict = false;

      // Time overlap check
      for (const selected of currentSelection) {
        const conflict = sectionsConflict(selected, section);
        if (conflict) {
          hasConflict = true;
          conflictsList.push({
            sectionA: selected,
            sectionB: section,
            ...conflict
          });
        }
      }

      if (hasConflict && !allowConflicts) {
        continue; // Skip if conflicts are not allowed
      }

      // Link dependency matching (lectures paired with labs/discussions sharing same identifier)
      let linkMismatch = false;
      const companionSections = currentSelection.filter(s => s.courseId._id.toString() === currentPool.courseId);
      for (const companion of companionSections) {
        if (section.linkIdentifier && companion.linkIdentifier) {
          if (section.linkIdentifier !== companion.linkIdentifier) {
            linkMismatch = true;
            break;
          }
        }
      }

      if (linkMismatch) {
        continue; // Skip due to link mismatch
      }

      currentSelection.push(section);
      backtrack(poolIdx + 1, currentSelection);
      currentSelection.pop();
    }
  };

  backtrack(0, []);

  return results;
};

// Formats a combination array into the GeneratedSchedule structure
const formatSchedule = (sectionsList) => {
  let totalUnits = 0;
  let totalClassMinutes = 0;
  let earliestStart = 24 * 60;
  let latestEnd = 0;
  const activeDaysSet = new Set();
  const daysEvents = { M: [], T: [], W: [], R: [], F: [], S: [], U: [] };

  const groupsMap = {};

  sectionsList.forEach(sec => {
    const cId = sec.courseId._id.toString();
    totalUnits += sec.creditHours;

    if (!groupsMap[cId]) {
      groupsMap[cId] = {
        courseId: cId,
        subject: sec.subject,
        courseNumber: sec.courseNumber,
        title: sec.courseTitle,
        creditHours: sec.courseId.creditHours,
        sections: []
      };
    }

    // Map section details
    const blocks = [];
    sec.meetingTimes.forEach(meet => {
      const start = toMinutes(meet.startTime);
      const end = toMinutes(meet.endTime);
      const duration = end - start;

      meet.weekDays.forEach(day => {
        activeDaysSet.add(day);
        totalClassMinutes += duration;
        earliestStart = Math.min(earliestStart, start);
        latestEnd = Math.max(latestEnd, end);
        
        daysEvents[day].push({ start, end, section: sec });
        blocks.push({ day, start, end });
      });
    });

    groupsMap[cId].sections.push({
      ...sec.toObject(),
      blocks
    });
  });

  // Calculate gaps
  let totalGapMinutes = 0;
  Object.keys(daysEvents).forEach(day => {
    const events = daysEvents[day];
    if (events.length <= 1) return;
    
    // Sort events by start time
    events.sort((a, b) => a.start - b.start);

    for (let i = 0; i < events.length - 1; i++) {
      const currentEnd = events[i].end;
      const nextStart = events[i + 1].start;
      if (nextStart > currentEnd) {
        totalGapMinutes += (nextStart - currentEnd);
      }
    }
  });

  const activeDays = Array.from(activeDaysSet);
  const weekDaysList = ['M', 'T', 'W', 'R', 'F'];
  const daysOff = weekDaysList.filter(d => !activeDays.includes(d));

  return {
    totalUnits,
    totalClassMinutes,
    earliestStart: earliestStart === 24 * 60 ? '00:00' : toTimeString(earliestStart),
    latestEnd: latestEnd === 0 ? '00:00' : toTimeString(latestEnd),
    activeDays,
    daysOff,
    totalGapMinutes,
    groups: Object.values(groupsMap)
  };
};
