import type { Section } from "@/lib/api";

type WeekDay = "M" | "T" | "W" | "R" | "F" | "S" | "U";

const days: { key: WeekDay; label: string }[] = [
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

/**
 * Bounds the grid to the sections actually present, with one hour of padding.
 * The old fixed 8:00-18:00 window silently hid evening classes.
 */
function getVisibleHourRange(sections: Section[]): {
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

  return {
    startHour: Math.max(MIN_HOUR, earliest),
    endHour: Math.min(MAX_HOUR, latest),
  };
}

const subjectColors = [
  { bg: "bg-blue-50 border-blue-200 text-blue-900" },
  { bg: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  { bg: "bg-amber-50 border-amber-200 text-amber-900" },
  { bg: "bg-purple-50 border-purple-200 text-purple-900" },
  { bg: "bg-rose-50 border-rose-200 text-rose-900" },
  { bg: "bg-indigo-50 border-indigo-200 text-indigo-900" },
  { bg: "bg-cyan-50 border-cyan-200 text-cyan-900" },
  { bg: "bg-violet-50 border-violet-200 text-violet-900" },
];

function getSubjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % subjectColors.length;
  return subjectColors[idx].bg;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface PlacedBlock {
  section: Section;
  day: WeekDay;
  startRow: number;
  rowSpan: number;
}

function placeBlocks(sections: Section[], startHour: number): PlacedBlock[] {
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
        if (days.some((d) => d.key === day)) {
          blocks.push({ section, day, startRow, rowSpan });
        }
      }
    }
  }

  return blocks;
}

interface WeeklyCalendarProps {
  sections: Section[];
}

export function WeeklyCalendar({ sections }: WeeklyCalendarProps) {
  const { startHour, endHour } = getVisibleHourRange(sections);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const blocks = placeBlocks(sections, startHour);
  const rowCount = (endHour - startHour) * 2;

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <div
        className="grid min-w-[700px]"
        style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
      >
        {/* Header row */}
        <div className="border-b border-r border-gray-200" />
        {days.map((day) => (
          <div
            key={day.key}
            className="border-b border-r border-gray-200 p-2 text-center text-sm font-semibold text-gray-700"
          >
            {day.label}
          </div>
        ))}

        {/* Time grid */}
        <div
          className="relative grid"
          style={{ gridTemplateRows: `repeat(${rowCount}, 30px)` }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="row-span-2 border-b border-r border-gray-200 px-2 py-1 text-right text-xs text-gray-400"
            >
              {hour <= 12 ? hour : hour - 12} {hour < 12 ? "AM" : "PM"}
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day.key}
            className="relative grid border-r border-gray-200"
            style={{ gridTemplateRows: `repeat(${rowCount}, 30px)` }}
          >
            {hours.map((hour) => (
              <div key={hour} className="row-span-2 border-b border-gray-100" />
            ))}

            {blocks
              .filter((b) => b.day === day.key)
              .map((b, i) => {
                const colorClass = getSubjectColor(b.section.courseId.subject);
                const meeting = b.section.meetingTimes.find((m) => m.weekDays.includes(day.key))!;
                return (
                  <div
                    key={`${b.section._id}-${i}`}
                    className={`absolute inset-x-1 z-10 rounded-md border px-2 py-1 text-xs ${colorClass}`}
                    style={{
                      top: `${(b.startRow - 1) * 30}px`,
                      height: `${b.rowSpan * 30 - 4}px`,
                    }}
                  >
                    <div className="font-semibold">
                      {b.section.courseId.subject} {b.section.courseId.courseNumber}
                    </div>
                    <div>{b.section.sectionNumber}</div>
                    <div>
                      {meeting.startTime} - {meeting.endTime}
                    </div>
                    {meeting.buildingDescription && (
                      <div>
                        {meeting.buildingDescription} {meeting.room}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
