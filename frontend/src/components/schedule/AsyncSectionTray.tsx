import type { Section } from "@/lib/api";

/**
 * A section with no scheduled meeting on any weekday. These have no place on
 * the grid and were previously dropped from the page entirely.
 */
function isAsyncSection(section: Section): boolean {
  return section.meetingTimes.every((meeting) => meeting.weekDays.length === 0);
}

interface AsyncSectionTrayProps {
  sections: Section[];
}

export function AsyncSectionTray({ sections }: AsyncSectionTrayProps) {
  const asyncSections = sections.filter(isAsyncSection);
  if (asyncSections.length === 0) return null;

  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Online / asynchronous
      </h3>
      <p className="mt-1 text-xs text-gray-400">
        These sections have no fixed meeting time and do not appear on the grid.
      </p>
      <ul className="mt-2 space-y-1">
        {asyncSections.map((section) => (
          <li key={section._id} className="text-sm text-gray-700">
            <span className="font-semibold text-blue-600">
              {section.subject} {section.courseNumber}
            </span>{" "}
            {section.scheduleType.code} {section.sectionNumber} - {section.instructor}
          </li>
        ))}
      </ul>
    </div>
  );
}
