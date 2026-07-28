import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, type CourseInfo, type PrerequisiteGroup, type Section } from "@/lib/api";
import { getTermLabel } from "@/lib/terms";
import { PrerequisiteGroupList } from "@/components/catalog/PrerequisiteGroupList";
import { SectionOfferingList } from "@/components/catalog/SectionOfferingList";

interface CourseDetailSheetProps {
  course: CourseInfo | null;
  termCode: string;
  isAdded: boolean;
  pinnedSections: Section[];
  onClose: () => void;
  onAddCourse: (course: CourseInfo) => void;
  onRemoveCourse: (courseId: string) => void;
  onTogglePin: (section: Section) => void;
}

export function CourseDetailSheet({
  course,
  termCode,
  isAdded,
  pinnedSections,
  onClose,
  onAddCourse,
  onRemoveCourse,
  onTogglePin,
}: CourseDetailSheetProps) {
  const [prereqGroups, setPrereqGroups] = useState<PrerequisiteGroup[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  /** Guards against a slow earlier response overwriting a newer one. */
  const requestIdRef = useRef(0);

  const courseId = course?._id;

  useEffect(() => {
    if (!courseId) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setPrereqGroups([]);
    setSections([]);

    const load = async () => {
      try {
        const [prereqRes, sectionRes] = await Promise.all([
          api.getCoursePrereqs(courseId),
          api.getSectionsByCourse(courseId, termCode),
        ]);
        if (requestId !== requestIdRef.current) return;
        setPrereqGroups(prereqRes.groups || []);
        setSections(sectionRes || []);
      } catch (err) {
        console.error("Failed fetching course details:", err);
        if (requestId === requestIdRef.current) {
          setError("Could not load prerequisites and sections for this course.");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    };

    load();
  }, [courseId, termCode, retryToken]);

  /** Pinning implies wanting the course, so add it first when it is not selected. */
  const handleTogglePin = (section: Section) => {
    if (course && !isAdded) onAddCourse(course);
    onTogglePin(section);
  };

  return (
    <Sheet open={!!course} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto data-[side=right]:sm:max-w-[480px]"
      >
        {course && (
          <>
            <SheetHeader>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {course.subject} {course.courseNumber}
              </span>
              <SheetTitle className="text-xl font-bold text-gray-900">
                {course.title}
              </SheetTitle>
              <p className="text-sm text-gray-500">{course.creditHours.low} units</p>
              {(course.college || course.department) && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {course.college && <Badge variant="outline">{course.college}</Badge>}
                  {course.department && <Badge variant="outline">{course.department}</Badge>}
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 space-y-6 px-4">
              {course.description && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-gray-900">Course Description</h4>
                  <p className="text-sm leading-relaxed text-gray-600">{course.description}</p>
                </div>
              )}

              {error ? (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setRetryToken((token) => token + 1)}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <PrerequisiteGroupList groups={prereqGroups} loading={loading} />
                  <SectionOfferingList
                    sections={sections}
                    loading={loading}
                    termLabel={getTermLabel(termCode)}
                    pinnedSections={pinnedSections}
                    onTogglePin={handleTogglePin}
                  />
                </>
              )}
            </div>

            <SheetFooter>
              {isAdded ? (
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => onRemoveCourse(course._id)}
                >
                  Remove from my courses
                </Button>
              ) : (
                <Button
                  className="w-full cursor-pointer"
                  onClick={() => onAddCourse(course)}
                >
                  Add to my courses
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
