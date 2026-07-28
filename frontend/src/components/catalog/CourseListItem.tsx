import { Badge } from "@/components/ui/badge";
import type { CourseInfo } from "@/lib/api";

interface CourseListItemProps {
  course: CourseInfo;
  isSelected: boolean;
  onSelect: (course: CourseInfo) => void;
}

export function CourseListItem({ course, isSelected, onSelect }: CourseListItemProps) {
  return (
    <div
      onClick={() => onSelect(course)}
      className={`cursor-pointer rounded-lg border p-5 transition hover:shadow-md ${
        isSelected ? "border-blue-600 bg-blue-50/30" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-sm font-semibold text-blue-600">
            {course.subject} {course.courseNumber}
          </span>
          <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
        </div>
        <Badge variant="secondary">
          {course.creditHours.low === course.creditHours.high
            ? `${course.creditHours.low} units`
            : `${course.creditHours.low}-${course.creditHours.high} units`}
        </Badge>
      </div>
      {course.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{course.description}</p>
      )}
    </div>
  );
}
