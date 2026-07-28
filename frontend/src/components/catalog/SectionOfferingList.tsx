import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/api";
import { formatMeetingDays } from "@/lib/meetingTimes";

interface SectionOfferingCardProps {
  section: Section;
  isPinned: boolean;
  onTogglePin?: (section: Section) => void;
}

function SectionOfferingCard({ section, isPinned, onTogglePin }: SectionOfferingCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-blue-600">
          {section.scheduleType.code} {section.sectionNumber}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">CRN: {section.crn}</span>
          {onTogglePin && (
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
          )}
        </div>
      </div>
      <div className="mt-1 text-sm text-gray-700">
        {section.meetingTimes.map((m, mIdx) => (
          <div key={mIdx}>
            {formatMeetingDays(m.weekDays)} {m.startTime} - {m.endTime}{" "}
            {m.buildingDescription && `(${m.buildingDescription} ${m.room})`}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Instructor: {section.instructor}</span>
        <span
          className={`font-semibold ${
            section.status === "Open" ? "text-green-600" : "text-red-500"
          }`}
        >
          {section.status} ({section.enrollmentCurrent}/{section.enrollmentMax})
        </span>
      </div>
    </div>
  );
}

interface SectionOfferingListProps {
  sections: Section[];
  loading: boolean;
  termLabel: string;
  pinnedSections?: Section[];
  onTogglePin?: (section: Section) => void;
}

export function SectionOfferingList({
  sections,
  loading,
  termLabel,
  pinnedSections,
  onTogglePin,
}: SectionOfferingListProps) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-900">Offered Sections ({termLabel})</h4>
      {loading ? (
        <div className="text-sm text-gray-400">Loading section schedules...</div>
      ) : sections.length > 0 ? (
        <div className="space-y-2">
          {sections.map((sec) => (
            <SectionOfferingCard
              key={sec._id}
              section={sec}
              isPinned={(pinnedSections ?? []).some((pinned) => pinned._id === sec._id)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No sections scheduled for this term.</p>
      )}
    </div>
  );
}
