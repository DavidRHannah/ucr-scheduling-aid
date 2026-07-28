import type { Section } from "@/lib/api";

export const DAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

/** Turns ["M","W","F"] into "Mon/Wed/Fri". Unrecognized codes pass through. */
export function formatMeetingDays(days: string[]): string {
  return days.map((day) => DAY_LABELS[day] ?? day).join("/");
}

/**
 * One-line summary of a section's first meeting block.
 * Sections with no meeting days (online or arranged) read as "Asynchronous".
 */
export function formatMeeting(section: Section): string {
  const meeting = section.meetingTimes[0];
  if (!meeting || meeting.weekDays.length === 0) return "Asynchronous";
  return `${formatMeetingDays(meeting.weekDays)} ${meeting.startTime} - ${meeting.endTime}`;
}
