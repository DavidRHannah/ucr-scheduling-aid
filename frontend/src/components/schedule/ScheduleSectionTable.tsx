import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/api";

const DAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

function formatMeeting(section: Section): string {
  const meeting = section.meetingTimes[0];
  if (!meeting || meeting.weekDays.length === 0) return "Asynchronous";
  const days = meeting.weekDays.map((day) => DAY_LABELS[day] ?? day).join("/");
  return `${days} ${meeting.startTime} - ${meeting.endTime}`;
}

function statusClasses(status: Section["status"]): string {
  if (status === "Open") return "bg-green-50 text-green-700";
  if (status === "Waitlisted") return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-700";
}

interface ScheduleSectionTableProps {
  sections: Section[];
  pinnedSections: Section[];
  onTogglePin: (section: Section) => void;
}

export function ScheduleSectionTable({
  sections,
  pinnedSections,
  onTogglePin,
}: ScheduleSectionTableProps) {
  if (sections.length === 0) {
    return <p className="text-sm text-gray-400">No sections to show yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Course</th>
            <th className="px-3 py-2 font-semibold">CRN</th>
            <th className="px-3 py-2 font-semibold">Meets</th>
            <th className="px-3 py-2 font-semibold">Instructor</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Pin</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            const isPinned = pinnedSections.some((pinned) => pinned._id === section._id);
            return (
              <tr key={section._id} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <div className="font-semibold text-gray-900">
                    {section.subject} {section.courseNumber}
                  </div>
                  <div className="text-xs text-gray-400">
                    {section.scheduleType.code} {section.sectionNumber}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{section.crn}</td>
                <td className="px-3 py-2 text-gray-700">{formatMeeting(section)}</td>
                <td className="px-3 py-2 text-gray-600">{section.instructor}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(section.status)}`}
                  >
                    {section.status}
                  </span>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {section.enrollmentCurrent}/{section.enrollmentMax}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={isPinned ? "Unpin section" : "Pin section"}
                    className="h-7 w-7 cursor-pointer"
                    onClick={() => onTogglePin(section)}
                  >
                    {isPinned ? (
                      <Pin className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
