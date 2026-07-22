// Helper to convert weekday codes to iCal days
const ICAL_DAYS = { M: 'MO', T: 'TU', W: 'WE', R: 'TH', F: 'FR', S: 'SA', U: 'SU' };

const getDayOfWeekIndex = (dayCode) => {
  const mapping = { U: 0, M: 1, T: 2, W: 3, R: 4, F: 5, S: 6 };
  return mapping[dayCode];
};

// Formats a date object to YYYYMMDDTHHMMSS
const formatIcalDateTime = (date, timeStr) => {
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  
  const cleanTime = timeStr.replace(':', '');
  return `${yyyy}${mm}${dd}T${cleanTime}00`;
};

const formatIcalDateOnly = (date) => {
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

// Title-case helper
const toTitleCase = (str) => {
  return str.toLowerCase().replace(/(?:^|\s|-)\S/g, val => val.toUpperCase());
};

// Main ICS feed compiler
export const generateIcsString = (sections, options = {}) => {
  // 1. Establish default customization options
  const opt = {
    reminder: {
      primary: 10,
      secondary: null,
      ...(options.reminder || {})
    },
    titleFormat: {
      template: '{subject}{number} - {title}',
      titleCase: false,
      ...(options.titleFormat || {})
    },
    description: {
      includeInstructor: true,
      includeInstructorEmail: true,
      includeCrn: true,
      includeSection: false,
      includeUnits: false,
      includeDeliveryMode: false,
      includeSeatCount: false,
      ...(options.description || {})
    },
    location: {
      format: 'buildingRoom',
      includeCampus: false,
      ...(options.location || {})
    },
    asyncSections: {
      includeAsync: false,
      asyncEventDay: 'Monday',
      asyncDuration: 60,
      ...(options.asyncSections || {})
    },
    appearance: {
      colorPerCourse: true,
      defaultColor: '#4285F4',
      ...(options.appearance || {})
    }
  };

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UCR Scheduling Aid//NONSGML Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:America/Los_Angeles',
    'LAST-MODIFIED:20260101T000000Z',
    'TZURL:http://tzurl.org/zoneinfo-outlook/America/Los_Angeles',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0800',
    'TZOFFSETTO:-0700',
    'TZNAME:PDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0700',
    'TZOFFSETTO:-0800',
    'TZNAME:PST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE'
  ];

  sections.forEach((sec, idx) => {
    // 2. Filter out asynchronous classes unless explicitly enabled
    const hasMeetingTimes = sec.meetingTimes && sec.meetingTimes.length > 0;
    if (!hasMeetingTimes) {
      if (!opt.asyncSections.includeAsync) {
        return;
      }
      // Create a mock meeting time for async classes
      const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        .indexOf(opt.asyncSections.asyncEventDay);
      const dayCode = ['U', 'M', 'T', 'W', 'R', 'F', 'S'][dayIndex !== -1 ? dayIndex : 1];
      
      sec.meetingTimes = [{
        weekDays: [dayCode],
        startTime: '12:00',
        endTime: toTimeString(12 * 60 + opt.asyncSections.asyncDuration),
        buildingDescription: 'Online',
        room: 'Asynchronous',
        meetingType: { code: 'ASY', description: 'Asynchronous Instruction' }
      }];
    }

    sec.meetingTimes.forEach(meet => {
      if (meet.weekDays.length === 0) return;

      // 3. Determine start and end dates (UCR terms default fallback if blank)
      const startDate = sec.startDate ? new Date(sec.startDate) : new Date('2026-01-12T08:00:00-08:00');
      const endDate = sec.endDate ? new Date(sec.endDate) : new Date('2026-05-08T18:00:00-08:00');

      // Adjust DTSTART to represent the first meeting day of the class
      let eventDate = new Date(startDate);
      const activeDaysIndexes = meet.weekDays.map(getDayOfWeekIndex);
      
      // Advance eventDate day-by-day until it lands on one of the active weekDays
      while (!activeDaysIndexes.includes(eventDate.getDay())) {
        eventDate.setDate(eventDate.getDate() + 1);
      }

      const dtStart = formatIcalDateTime(eventDate, meet.startTime);
      const dtEnd = formatIcalDateTime(eventDate, meet.endTime);
      
      // Recurrence rule - until parameter in UTC representation
      const untilDate = new Date(endDate);
      untilDate.setDate(untilDate.getDate() + 1); // Ensure last day inclusive
      const recurrenceUntil = `${formatIcalDateOnly(untilDate)}T235959Z`;

      const byDay = meet.weekDays.map(d => ICAL_DAYS[d]).join(',');

      // 4. Custom Title Mapping
      let title = opt.titleFormat.template
        .replace('{subject}', sec.subject)
        .replace('{number}', sec.courseNumber)
        .replace('{title}', sec.courseTitle)
        .replace('{scheduleType}', sec.scheduleType.code)
        .replace('{scheduleTypeFull}', sec.scheduleType.description || '')
        .replace('{section}', sec.sectionNumber)
        .replace('{crn}', sec.crn);

      if (opt.titleFormat.titleCase) {
        title = toTitleCase(title);
      }

      // 5. Custom Description Mapping
      const descriptionParts = [];
      if (opt.description.includeInstructor) {
        descriptionParts.push(`Instructor: ${sec.instructor || 'Staff'}`);
      }
      if (opt.description.includeInstructorEmail && sec.instructor && sec.instructor !== 'Staff') {
        const emailUser = sec.instructor.toLowerCase().replace(/[^a-z]/g, '.');
        descriptionParts.push(`Email: ${emailUser}@email.ucr.edu`);
      }
      if (opt.description.includeCrn) {
        descriptionParts.push(`CRN: ${sec.crn}`);
      }
      if (opt.description.includeSection) {
        descriptionParts.push(`Section: ${sec.sectionNumber}`);
      }
      if (opt.description.includeUnits) {
        descriptionParts.push(`Credits: ${sec.creditHours} units`);
      }
      if (opt.description.includeDeliveryMode) {
        descriptionParts.push(`Method: ${sec.campus || 'In-Person'}`);
      }
      if (opt.description.includeSeatCount) {
        descriptionParts.push(`Seats: ${sec.enrollmentCurrent}/${sec.enrollmentMax}`);
      }
      
      const description = descriptionParts.join('\\n');

      // 6. Custom Location Mapping
      let location = 'Online';
      if (meet.buildingDescription && meet.room) {
        if (opt.location.format === 'buildingRoom') {
          location = `${meet.buildingDescription} Room ${meet.room}`;
        } else if (opt.location.format === 'buildingOnly') {
          location = meet.buildingDescription;
        } else if (opt.location.format === 'roomOnly') {
          location = `Room ${meet.room}`;
        } else {
          location = '';
        }

        if (opt.location.includeCampus && location) {
          location += ', UCR Main Campus';
        }
      }

      // 7. VALARM Alerts
      const alarms = [];
      
      // Primary Alarm
      if (opt.reminder.primary !== null) {
        alarms.push(
          '  BEGIN:VALARM',
          '  ACTION:DISPLAY',
          `  DESCRIPTION:Reminder for ${title}`,
          `  TRIGGER:-PT${opt.reminder.primary}M`,
          '  END:VALARM'
        );
      }

      // Secondary Alarm
      if (opt.reminder.secondary) {
        const secRem = opt.reminder.secondary;
        if (secRem.type === 'minutes_before') {
          alarms.push(
            '  BEGIN:VALARM',
            '  ACTION:DISPLAY',
            `  DESCRIPTION:Secondary Reminder for ${title}`,
            `  TRIGGER:-PT${secRem.value}M`,
            '  END:VALARM'
          );
        } else if (secRem.type === 'morning_of') {
          // Trigger at specific hour (e.g. 7 AM) morning of the class.
          // Trigger trigger time relative to event start:
          // If class starts at 10:00 (600 mins) and trigger is 7:00 (420 mins), alert offset is 3 hours before.
          const [classHrs, classMins] = meet.startTime.split(':').map(Number);
          const classStartMins = classHrs * 60 + classMins;
          const alarmTimeMins = secRem.value * 60;
          
          if (classStartMins > alarmTimeMins) {
            const offsetMinutes = classStartMins - alarmTimeMins;
            alarms.push(
              '  BEGIN:VALARM',
              '  ACTION:DISPLAY',
              `  DESCRIPTION:Morning Reminder for ${title}`,
              `  TRIGGER:-PT${offsetMinutes}M`,
              '  END:VALARM'
            );
          }
        }
      }

      // Add event properties
      ics.push(
        'BEGIN:VEVENT',
        `UID:${sec.crn}-${idx}@ucr-scheduling-aid`,
        `DTSTAMP:${formatIcalDateTime(new Date(), '00:00')}`,
        `DTSTART;TZID=America/Los_Angeles:${dtStart}`,
        `DTEND;TZID=America/Los_Angeles:${dtEnd}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${recurrenceUntil};BYDAY=${byDay}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        ...alarms,
        'END:VEVENT'
      );
    });
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
};

// Helper helper
const toTimeString = (totalMins) => {
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};
