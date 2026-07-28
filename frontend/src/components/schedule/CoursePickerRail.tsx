import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import type { CourseInfo } from "@/lib/api";

interface CoursePickerRailProps {
  selectedCourses: CourseInfo[];
  onAddCourse: (course: CourseInfo) => void;
  onRemoveCourse: (courseId: string) => void;
}

export function CoursePickerRail({
  selectedCourses,
  onAddCourse,
  onRemoveCourse,
}: CoursePickerRailProps) {
  return (
    <CourseSearchPanel
      selectedCourses={selectedCourses}
      onAddCourse={onAddCourse}
      onRemoveCourse={onRemoveCourse}
    />
  );
}
