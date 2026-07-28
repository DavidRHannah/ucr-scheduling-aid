import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CourseInfo, PrerequisiteGroup, Section } from "@/lib/api";
import { PrerequisiteGroupList } from "./PrerequisiteGroupList";
import { SectionOfferingList } from "./SectionOfferingList";

interface CourseDetailPanelProps {
  course: CourseInfo | null;
  prereqGroups: PrerequisiteGroup[];
  sections: Section[];
  loading: boolean;
  sectionTermLabel: string;
  onAddToBuilder: (course: CourseInfo) => void;
}

export function CourseDetailPanel({
  course,
  prereqGroups,
  sections,
  loading,
  sectionTermLabel,
  onAddToBuilder,
}: CourseDetailPanelProps) {
  return (
    <div className="border-l border-gray-200 bg-white p-6 overflow-y-auto">
      {course ? (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {course.subject} {course.courseNumber}
            </span>
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            <div className="mt-2 flex gap-2">
              {course.college && <Badge variant="outline">{course.college}</Badge>}
              {course.department && <Badge variant="outline">{course.department}</Badge>}
            </div>
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => onAddToBuilder(course)}
                className="w-full cursor-pointer"
              >
                Add to Schedule Builder
              </Button>
            </div>
          </div>

          {course.description && (
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-gray-900">Course Description</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
            </div>
          )}

          <PrerequisiteGroupList groups={prereqGroups} loading={loading} />
          <SectionOfferingList sections={sections} loading={loading} termLabel={sectionTermLabel} />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-center text-sm text-gray-400">
          Select a course from the catalog search list to inspect detailed prerequisites and available class sections.
        </div>
      )}
    </div>
  );
}
