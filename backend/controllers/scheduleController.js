import { Schedule } from '../models/Schedule.js';
import { Section } from '../models/Section.js';
import { generateIcsString } from '../utils/ics.js';
import mongoose from 'mongoose';

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper to convert "HH:mm" to minutes from midnight
const toMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hrs, mins] = timeStr.split(':').map(Number);
  return hrs * 60 + mins;
};

const toTimeString = (totalMins) => {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Check time overlaps
const meetOverlaps = (meetA, meetB) => {
  const commonDays = meetA.weekDays.filter(d => meetB.weekDays.includes(d));
  if (commonDays.length === 0) return false;

  const startA = toMinutes(meetA.startTime);
  const endA = toMinutes(meetA.endTime);
  const startB = toMinutes(meetB.startTime);
  const endB = toMinutes(meetB.endTime);

  return startA < endB && startB < endA;
};

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

export const createSchedule = async (req, res) => {
  const { name, termCode, sectionIds } = req.body;

  if (!termCode || !sectionIds) {
    return res.status(400).json({
      message: 'termCode and sectionIds array are required.'
    });
  }

  try {
    const schedule = await Schedule.create({
      userId: req.user.id,
      name: name || 'Untitled Schedule',
      termCode,
      sectionIds
    });

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Create Schedule Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getSchedules = async (req, res) => {
  const { termCode } = req.query;
  const filter = { userId: req.user.id };
  if (termCode) {
    filter.termCode = termCode;
  }

  try {
    const schedules = await Schedule.find(filter).populate('sectionIds');
    res.json(schedules);
  } catch (error) {
    console.error('Fetch Schedules Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const getScheduleById = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid schedule ID format.'
    });
  }

  try {
    const schedule = await Schedule.findById(id).populate('sectionIds');
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found.'
      });
    }

    if (schedule.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Forbidden. You do not own this schedule.'
      });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Fetch Schedule Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const updateSchedule = async (req, res) => {
  const { id } = req.params;
  const { name, sectionIds } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid schedule ID format.'
    });
  }

  try {
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found.'
      });
    }

    if (schedule.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Forbidden. You do not own this schedule.'
      });
    }

    if (name !== undefined) schedule.name = name;
    if (sectionIds !== undefined) schedule.sectionIds = sectionIds;

    await schedule.save();
    
    const updated = await Schedule.findById(id).populate('sectionIds');
    res.json(updated);
  } catch (error) {
    console.error('Update Schedule Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const deleteSchedule = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid schedule ID format.'
    });
  }

  try {
    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found.'
      });
    }

    if (schedule.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Forbidden. You do not own this schedule.'
      });
    }

    await Schedule.deleteOne({ _id: id });
    res.json({
      message: 'Schedule deleted successfully.'
    });
  } catch (error) {
    console.error('Delete Schedule Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const analyzeSchedule = async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({
      message: 'Invalid schedule ID format.'
    });
  }

  try {
    const schedule = await Schedule.findById(id).populate('sectionIds');
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found.'
      });
    }

    if (schedule.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: 'Forbidden. You do not own this schedule.'
      });
    }

    const sections = schedule.sectionIds;

    let totalUnits = 0;
    let totalClassMinutes = 0;
    let earliestStart = 24 * 60;
    let latestEnd = 0;
    const activeDaysSet = new Set();
    const daysEvents = { M: [], T: [], W: [], R: [], F: [], S: [], U: [] };
    const conflicts = [];

    sections.forEach((sec, sIdx) => {
      totalUnits += sec.creditHours;

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
        });
      });

      // Scan for conflicts with subsequently indexed sections
      for (let j = sIdx + 1; j < sections.length; j++) {
        const overlap = sectionsConflict(sec, sections[j]);
        if (overlap) {
          conflicts.push({
            sectionA: sec._id,
            sectionB: sections[j]._id,
            ...overlap
          });
        }
      }
    });

    // Gap computation
    let totalGapMinutes = 0;
    Object.keys(daysEvents).forEach(day => {
      const events = daysEvents[day];
      if (events.length <= 1) return;
      
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

    res.json({
      totalUnits,
      totalClassMinutes,
      earliestStart: earliestStart === 24 * 60 ? '00:00' : toTimeString(earliestStart),
      latestEnd: latestEnd === 0 ? '00:00' : toTimeString(latestEnd),
      activeDays,
      daysOff,
      totalGapMinutes,
      conflicts
    });
  } catch (error) {
    console.error('Analyze Schedule Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};

export const exportIcs = async (req, res) => {
  const { scheduleId } = req.params;

  if (!isValidObjectId(scheduleId)) {
    return res.status(400).json({
      message: 'Invalid schedule ID format.'
    });
  }

  try {
    const schedule = await Schedule.findById(scheduleId).populate('sectionIds');
    if (!schedule) {
      return res.status(404).json({
        message: 'Schedule not found.'
      });
    }

    // Base64url options decoder
    let exportOptions = {};
    if (req.query.options) {
      try {
        let b64 = req.query.options.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) {
          b64 += '=';
        }
        const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
        exportOptions = JSON.parse(jsonStr);
      } catch (err) {
        console.warn('Failed parsing export options base64:', err.message);
      }
    }

    const icsContent = generateIcsString(schedule.sectionIds, exportOptions);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${schedule.name.replace(/[^a-zA-Z0-9]/g, '_')}.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Export ICS Error:', error);
    res.status(500).json({
      message: 'An unexpected error occurred on the server.'
    });
  }
};
