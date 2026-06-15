import { Badge } from "@/components/ui/badge";
import { requirementTypes } from "@/data/requirementTypes";
import type { Section } from "@/data/mockSchedule";

const dayLabels: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

function formatDays(days: string[]): string {
  return days.map((d) => dayLabels[d] ?? d).join("/");
}

function requirementLabel(reqCode?: string): string | null {
  if (!reqCode) return null;
  const req = requirementTypes.find((r) => r.code === reqCode);
  return req ? req.code : reqCode;
}

interface CourseResultCardProps {
  section: Section;
}

export function CourseResultCard({ section }: CourseResultCardProps) {
  const meeting = section.meetingTimes[0];
  const label = requirementLabel(section.reqCode);

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-gray-900">
          {section.courseId.subject} {section.courseId.courseNumber} – {section.courseId.title}
        </div>
        {label && <Badge variant="outline">{label}</Badge>}
      </div>

      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-medium text-blue-600">
          {section.scheduleType.code} {section.sectionNumber}
        </span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-600">
          {section.enrollmentCurrent} / {section.enrollmentMax} seats
        </span>
      </div>

      {meeting && (
        <div className="mt-1 text-sm text-gray-600">
          {formatDays(meeting.weekDays)} {meeting.startTime} - {meeting.endTime}
        </div>
      )}
      {meeting?.buildingDescription && (
        <div className="text-sm text-gray-500">
          {meeting.buildingDescription} {meeting.room}
        </div>
      )}
    </div>
  );
}
