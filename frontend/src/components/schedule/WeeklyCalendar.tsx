import { useState } from "react";
import { ZoomIn, ZoomOut, Sliders } from "lucide-react";
import type { Section } from "@/lib/api";
import {
  WEEK_DAYS,
  getVisibleHourRange,
  getAutoRowHeight,
  SCALE_PRESETS,
  placeBlocks,
  assignBlockColumns,
} from "@/lib/calendarLayout";
import { getCourseColorMap, getCourseKey } from "@/lib/wadaSanzoPalette";
import { loadCalendarScale, saveCalendarScale } from "@/lib/builderStorage";

interface WeeklyCalendarProps {
  sections: Section[];
}

export function WeeklyCalendar({ sections }: WeeklyCalendarProps) {
  const { startHour, endHour } = getVisibleHourRange(sections);
  const totalHours = endHour - startHour;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);
  const blocks = assignBlockColumns(placeBlocks(sections, startHour));
  const rowCount = totalHours * 2;
  const courseColorMap = getCourseColorMap(sections);

  // Scale mode: "auto" | "compact" | "medium" | "comfortable" | numeric string (px height per slot)
  const [scaleMode, setScaleMode] = useState<string>(() => {
    return loadCalendarScale() || "auto";
  });

  const autoRowHeight = getAutoRowHeight(startHour, endHour);

  const effectiveRowHeight = (() => {
    if (scaleMode === "auto") return autoRowHeight;
    if (scaleMode === "compact") return SCALE_PRESETS.compact;
    if (scaleMode === "medium") return SCALE_PRESETS.medium;
    if (scaleMode === "comfortable") return SCALE_PRESETS.comfortable;
    const custom = parseInt(scaleMode, 10);
    return isNaN(custom) ? autoRowHeight : Math.min(40, Math.max(14, custom));
  })();

  const handleSetScaleMode = (mode: string) => {
    setScaleMode(mode);
    saveCalendarScale(mode);
  };

  const handleZoom = (delta: number) => {
    const nextHeight = Math.min(40, Math.max(14, effectiveRowHeight + delta));
    handleSetScaleMode(String(nextHeight));
  };

  const formatHourLabel = (hour: number) => {
    if (hour === 0 || hour === 24) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  return (
    <div className="rounded-md border border-gray-200 bg-white shadow-xs overflow-hidden">
      {/* Calendar Toolbar & Scale Controls */}
      <div className="flex flex-wrap items-center justify-end border-b border-gray-200 bg-gray-50/80 px-3 py-2 text-xs gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-gray-400 hidden sm:inline" />
            <span className="text-gray-500 font-medium text-[11px] hidden sm:inline">Vertical Scale:</span>

            <div className="inline-flex rounded-md bg-gray-200/60 p-0.5">
              <button
                type="button"
                onClick={() => handleSetScaleMode("auto")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  scaleMode === "auto"
                    ? "bg-white text-blue-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title={`Auto-fit height based on total hours (${autoRowHeight}px/slot)`}
              >
                Auto ({autoRowHeight}px)
              </button>
              <button
                type="button"
                onClick={() => handleSetScaleMode("compact")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  scaleMode === "compact"
                    ? "bg-white text-blue-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Compact scale (18px per 30m slot)"
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => handleSetScaleMode("medium")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  scaleMode === "medium"
                    ? "bg-white text-blue-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Medium scale (24px per 30m slot)"
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => handleSetScaleMode("comfortable")}
                className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                  scaleMode === "comfortable"
                    ? "bg-white text-blue-700 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                title="Comfortable scale (30px per 30m slot)"
              >
                Comfortable
              </button>
            </div>
          </div>

          <div className="flex items-center gap-0.5 border-l border-gray-300 pl-2">
            <button
              type="button"
              onClick={() => handleZoom(-2)}
              disabled={effectiveRowHeight <= 14}
              className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 transition-colors"
              title="Decrease vertical scale (Zoom out height)"
              aria-label="Decrease vertical scale"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center text-[11px] text-gray-500 font-mono font-medium">
              {effectiveRowHeight}px
            </span>
            <button
              type="button"
              onClick={() => handleZoom(2)}
              disabled={effectiveRowHeight >= 40}
              className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 transition-colors"
              title="Increase vertical scale (Zoom in height)"
              aria-label="Increase vertical scale"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[700px]"
          style={{ gridTemplateColumns: `80px repeat(${WEEK_DAYS.length}, 1fr)` }}
        >
          {/* Header row */}
          <div className="border-b border-r border-gray-200 bg-gray-50/50" />
          {WEEK_DAYS.map((day) => (
            <div
              key={day.key}
              className="border-b border-r border-gray-200 bg-gray-50/50 p-2 text-center text-sm font-semibold text-gray-700"
            >
              {day.label}
            </div>
          ))}

          {/* Time column */}
          <div
            className="relative grid select-none"
            style={{ gridTemplateRows: `repeat(${rowCount}, ${effectiveRowHeight}px)` }}
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="row-span-2 border-b border-r border-gray-200 px-2 py-0.5 text-right text-[11px] font-medium text-gray-400 flex items-start justify-end"
              >
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {WEEK_DAYS.map((day) => (
            <div
              key={day.key}
              className="relative grid border-r border-gray-200"
              style={{ gridTemplateRows: `repeat(${rowCount}, ${effectiveRowHeight}px)` }}
            >
              {hours.map((hour) => (
                <div key={hour} className="row-span-2 border-b border-gray-100" />
              ))}

              {blocks
                .filter((b) => b.day === day.key)
                .map((b, i) => {
                  const courseKey = getCourseKey(b.section);
                  const colorClass =
                    courseColorMap.get(courseKey)?.className ||
                    "bg-gray-50 border-gray-200 text-gray-900";
                  const meeting = b.section.meetingTimes.find((m) =>
                    m.weekDays.includes(day.key),
                  )!;

                  const blockHeight = b.rowSpan * effectiveRowHeight - 4;
                  const isCompact = blockHeight < 34;
                  const showTime = blockHeight >= 34;
                  const showRoom = blockHeight >= 54 && Boolean(meeting.buildingDescription);

                  return (
                    <div
                      key={`${b.section._id}-${i}`}
                      className={`absolute z-10 overflow-hidden rounded-md border transition-all ${colorClass} ${
                        isCompact
                          ? "px-1.5 py-0.5 text-[11px] leading-tight"
                          : "px-2 py-1 text-xs"
                      }`}
                      style={{
                        top: `${(b.startRow - 1) * effectiveRowHeight}px`,
                        height: `${blockHeight}px`,
                        left: `calc(${(b.column / b.columnCount) * 100}% + 2px)`,
                        width: `calc(${100 / b.columnCount}% - 4px)`,
                      }}
                    >
                      <div className="truncate font-semibold">
                        {b.section.courseId.subject} {b.section.courseId.courseNumber}-
                        {b.section.sectionNumber}
                      </div>
                      {showTime && (
                        <div className="truncate text-[11px] opacity-90">
                          {meeting.startTime} - {meeting.endTime}
                        </div>
                      )}
                      {showRoom && (
                        <div className="truncate text-[11px] opacity-80">
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
    </div>
  );
}

