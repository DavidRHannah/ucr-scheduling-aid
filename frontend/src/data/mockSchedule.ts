export interface CodeDescription {
  code: string;
  description: string;
}

export type WeekDay = "M" | "T" | "W" | "R" | "F" | "S" | "U";

export interface MeetingTime {
  weekDays: WeekDay[];
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  meetingType: CodeDescription;
  buildingDescription?: string;
  room?: string;
}

export interface CourseInfo {
  subject: string;
  courseNumber: string;
  title: string;
  creditHours: { low: number; high: number };
}

export interface Section {
  _id: string;
  courseId: CourseInfo;
  crn: string;
  sectionNumber: string;
  scheduleType: CodeDescription; // e.g. { code: "LEC", description: "Lecture" }
  enrollmentMax: number;
  enrollmentCurrent: number;
  status: "Open" | "Closed";
  meetingTimes: MeetingTime[];
  reqCode?: string; // ties to requirementTypes for Major/GE badges
}

export interface GeneratedScheduleGroup {
  courseId: CourseInfo;
  sections: Section[];
}

export interface GeneratedSchedule {
  id: number;
  groups: GeneratedScheduleGroup[];
  totalUnits: number;
  hasConflicts: boolean;
}

const lecture: CodeDescription = { code: "LEC", description: "Lecture" };
const discussion: CodeDescription = { code: "DIS", description: "Discussion" };

// --- Locked schedule (Current Schedule grid) ---

export const lockedSchedule: Section[] = [
  {
    _id: "math009b-dis1b",
    courseId: { subject: "MATH", courseNumber: "009B", title: "Calculus II", creditHours: { low: 4, high: 4 } },
    crn: "10001",
    sectionNumber: "DIS 1B",
    scheduleType: discussion,
    enrollmentMax: 30,
    enrollmentCurrent: 28,
    status: "Open",
    meetingTimes: [
      {
        weekDays: ["M", "R"],
        startTime: "10:00",
        endTime: "10:50",
        meetingType: discussion,
        buildingDescription: "SCI 1",
        room: "123",
      },
    ],
  },
  {
    _id: "cs010a-lec1",
    courseId: { subject: "CS", courseNumber: "010A", title: "Intro to Computer Science", creditHours: { low: 4, high: 4 } },
    crn: "10002",
    sectionNumber: "LEC 1",
    scheduleType: lecture,
    enrollmentMax: 80,
    enrollmentCurrent: 75,
    status: "Open",
    meetingTimes: [
      {
        weekDays: ["M", "R"],
        startTime: "11:00",
        endTime: "12:15",
        meetingType: lecture,
        buildingDescription: "WCH 1",
        room: "120",
      },
    ],
  },
  {
    _id: "engl001a-lec4",
    courseId: { subject: "ENGL", courseNumber: "001A", title: "Critical Reading and Writing", creditHours: { low: 4, high: 4 } },
    crn: "10003",
    sectionNumber: "LEC 4",
    scheduleType: lecture,
    enrollmentMax: 25,
    enrollmentCurrent: 25,
    status: "Closed",
    meetingTimes: [
      {
        weekDays: ["T"],
        startTime: "13:00",
        endTime: "14:15",
        meetingType: lecture,
        buildingDescription: "HUM 1",
        room: "101",
      },
    ],
  },
];

// --- Course info shared across search results and generated schedules ---

const cs061: CourseInfo = { subject: "CS", courseNumber: "061", title: "Data Structures", creditHours: { low: 4, high: 4 } };
const stat008: CourseInfo = { subject: "STAT", courseNumber: "008", title: "Intro to Statistics", creditHours: { low: 4, high: 4 } };
const phys002a: CourseInfo = { subject: "PHYS", courseNumber: "002A", title: "Physics 2A", creditHours: { low: 4, high: 4 } };

const cs061Lec1: Section = {
  _id: "cs061-lec1",
  courseId: cs061,
  crn: "20001",
  sectionNumber: "LEC 1",
  scheduleType: lecture,
  enrollmentMax: 80,
  enrollmentCurrent: 45,
  status: "Open",
  reqCode: "BEAD",
  meetingTimes: [
    { weekDays: ["M", "W"], startTime: "14:30", endTime: "15:45", meetingType: lecture, buildingDescription: "WCH 1", room: "135" },
  ],
};

const cs061Lec2: Section = {
  _id: "cs061-lec2",
  courseId: cs061,
  crn: "20002",
  sectionNumber: "LEC 2",
  scheduleType: lecture,
  enrollmentMax: 80,
  enrollmentCurrent: 38,
  status: "Open",
  reqCode: "BEAD",
  meetingTimes: [
    { weekDays: ["M", "W"], startTime: "16:00", endTime: "17:15", meetingType: lecture, buildingDescription: "WCH 1", room: "135" },
  ],
};

const cs061Lec3: Section = {
  _id: "cs061-lec3",
  courseId: cs061,
  crn: "20003",
  sectionNumber: "LEC 3",
  scheduleType: lecture,
  enrollmentMax: 80,
  enrollmentCurrent: 60,
  status: "Open",
  reqCode: "BEAD",
  meetingTimes: [
    { weekDays: ["T", "R"], startTime: "14:30", endTime: "15:45", meetingType: lecture, buildingDescription: "WCH 1", room: "135" },
  ],
};

const stat008Lec2: Section = {
  _id: "stat008-lec2",
  courseId: stat008,
  crn: "20010",
  sectionNumber: "LEC 2",
  scheduleType: lecture,
  enrollmentMax: 100,
  enrollmentCurrent: 12,
  status: "Open",
  reqCode: "BEMA",
  meetingTimes: [
    { weekDays: ["T", "R"], startTime: "09:30", endTime: "10:45", meetingType: lecture, buildingDescription: "SMSU", room: "101" },
  ],
};

const stat008Lec3: Section = {
  _id: "stat008-lec3",
  courseId: stat008,
  crn: "20011",
  sectionNumber: "LEC 3",
  scheduleType: lecture,
  enrollmentMax: 100,
  enrollmentCurrent: 50,
  status: "Open",
  reqCode: "BEMA",
  meetingTimes: [
    { weekDays: ["M", "W"], startTime: "09:30", endTime: "10:45", meetingType: lecture, buildingDescription: "SMSU", room: "101" },
  ],
};

const phys002aDis1a: Section = {
  _id: "phys002a-dis1a",
  courseId: phys002a,
  crn: "20020",
  sectionNumber: "DIS 1A",
  scheduleType: discussion,
  enrollmentMax: 30,
  enrollmentCurrent: 25,
  status: "Open",
  reqCode: "BEPS",
  meetingTimes: [
    { weekDays: ["F"], startTime: "13:00", endTime: "14:50", meetingType: discussion, buildingDescription: "PHY", room: "205" },
  ],
};

// --- Generated combinations ---

const baseCombos: GeneratedSchedule[] = [
  {
    id: 1,
    groups: [
      { courseId: cs061, sections: [cs061Lec1] },
      { courseId: stat008, sections: [stat008Lec2] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  },
  {
    id: 2,
    groups: [
      { courseId: cs061, sections: [cs061Lec2] },
      { courseId: stat008, sections: [stat008Lec2] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  },
  {
    id: 3,
    groups: [
      { courseId: cs061, sections: [cs061Lec3] },
      { courseId: stat008, sections: [stat008Lec3] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  },
];

// Remaining combos (4-24) reuse the same section pool in different
// groupings so "Show More Combinations" has real data to render.
const sectionPool: [Section, Section][] = [
  [cs061Lec1, stat008Lec3],
  [cs061Lec2, stat008Lec3],
  [cs061Lec3, stat008Lec2],
  [cs061Lec1, stat008Lec2],
];

const extraCombos: GeneratedSchedule[] = Array.from({ length: 21 }, (_, i) => {
  const [a, b] = sectionPool[i % sectionPool.length];
  return {
    id: i + 4,
    groups: [
      { courseId: a.courseId, sections: [a] },
      { courseId: b.courseId, sections: [b] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  };
});

export const generatedSchedules: GeneratedSchedule[] = [...baseCombos, ...extraCombos];

// --- Course search results ---

export const searchResults: Section[] = [cs061Lec1, cs061Lec2, stat008Lec2, phys002aDis1a];

export const totalSearchResults = 134;
