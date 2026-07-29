import type { Section } from "@/lib/api";

export type WeekDay = "M" | "T" | "W" | "R" | "F" | "S" | "U";

/** The weekdays the grid renders. Weekend meetings are dropped. */
export const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: "M", label: "Mon" },
  { key: "T", label: "Tue" },
  { key: "W", label: "Wed" },
  { key: "R", label: "Thu" },
  { key: "F", label: "Fri" },
];

/** Hard bounds so a stray record cannot render a 24-hour grid. */
const MIN_HOUR = 6;
const MAX_HOUR = 23;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Bounds the grid to the sections actually present, with one hour of padding.
 * The old fixed 8:00-18:00 window silently hid evening classes.
 */
export function getVisibleHourRange(sections: Section[]): {
  startHour: number;
  endHour: number;
} {
  const times = sections.flatMap((section) =>
    section.meetingTimes.flatMap((meeting) => [
      timeToMinutes(meeting.startTime),
      timeToMinutes(meeting.endTime),
    ]),
  );

  if (times.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  const earliest = Math.floor(Math.min(...times) / 60) - 1;
  const latest = Math.ceil(Math.max(...times) / 60) + 1;

  const startHour = Math.max(MIN_HOUR, earliest);
  const endHour = Math.min(MAX_HOUR, latest);

  if (startHour >= endHour) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  return { startHour, endHour };
}

export interface PlacedBlock {
  section: Section;
  day: WeekDay;
  startRow: number;
  rowSpan: number;
}

export function placeBlocks(sections: Section[], startHour: number): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  const gridStartMinutes = startHour * 60;

  for (const section of sections) {
    for (const meeting of section.meetingTimes) {
      const startMinutes = timeToMinutes(meeting.startTime) - gridStartMinutes;
      const endMinutes = timeToMinutes(meeting.endTime) - gridStartMinutes;
      // Each row represents 30 minutes; row 1 starts at startHour:00.
      const startRow = Math.floor(startMinutes / 30) + 1;
      const rowSpan = Math.max(1, Math.ceil((endMinutes - startMinutes) / 30));

      for (const day of meeting.weekDays) {
        if (WEEK_DAYS.some((d) => d.key === day)) {
          blocks.push({ section, day, startRow, rowSpan });
        }
      }
    }
  }

  return blocks;
}
