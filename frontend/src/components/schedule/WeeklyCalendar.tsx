import type { Section } from "@/lib/api";
import {
  WEEK_DAYS,
  getVisibleHourRange,
  placeBlocks,
  assignBlockColumns,
} from "@/lib/calendarLayout";

import { getCourseColorMap, getCourseKey } from "@/lib/wadaSanzoPalette";

interface WeeklyCalendarProps {
  sections: Section[];
}

export function WeeklyCalendar({ sections }: WeeklyCalendarProps) {
  const { startHour, endHour } = getVisibleHourRange(sections);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const blocks = assignBlockColumns(placeBlocks(sections, startHour));
  const rowCount = (endHour - startHour) * 2;
  const courseColorMap = getCourseColorMap(sections);

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <div
        className="grid min-w-[700px]"
        style={{ gridTemplateColumns: `80px repeat(${WEEK_DAYS.length}, 1fr)` }}
      >
        {/* Header row */}
        <div className="border-b border-r border-gray-200" />
        {WEEK_DAYS.map((day) => (
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

        {WEEK_DAYS.map((day) => (
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
                const courseKey = getCourseKey(b.section);
                const colorClass = courseColorMap.get(courseKey)?.className || "bg-gray-50 border-gray-200 text-gray-900";
                const meeting = b.section.meetingTimes.find((m) =>
                  m.weekDays.includes(day.key),
                )!;
                // Only as many lines as the block's height can actually hold:
                // one row is 30px, which fits a single line of text-xs.
                const showTime = b.rowSpan >= 2;
                const showRoom = b.rowSpan >= 3 && Boolean(meeting.buildingDescription);
                return (
                  <div
                    key={`${b.section._id}-${i}`}
                    className={`absolute z-10 overflow-hidden rounded-md border px-2 py-1 text-xs ${colorClass}`}
                    style={{
                      top: `${(b.startRow - 1) * 30}px`,
                      height: `${b.rowSpan * 30 - 4}px`,
                      left: `calc(${(b.column / b.columnCount) * 100}% + 2px)`,
                      width: `calc(${100 / b.columnCount}% - 4px)`,
                    }}
                  >
                    <div className="truncate font-semibold">
                      {b.section.courseId.subject} {b.section.courseId.courseNumber}-
                      {b.section.sectionNumber}
                    </div>
                    {showTime && (
                      <div className="truncate">
                        {meeting.startTime} - {meeting.endTime}
                      </div>
                    )}
                    {showRoom && (
                      <div className="truncate">
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
