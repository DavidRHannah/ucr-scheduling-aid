import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Courses</h2>

      {selectedCourses.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedCourses.map((course) => (
            <Badge key={course._id} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
              <span>
                {course.subject} {course.courseNumber}
              </span>
              <button
                onClick={() => onRemoveCourse(course._id)}
                aria-label={`Remove ${course.subject} ${course.courseNumber}`}
                className="rounded-full p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No courses yet. Add one to see schedules.</p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full cursor-pointer gap-1.5"
        onClick={() => setIsAdding((open) => !open)}
      >
        <Plus className="h-3.5 w-3.5" />
        {isAdding ? "Done adding" : "Add course"}
      </Button>

      {isAdding && (
        <div className="-mx-4 border-y border-gray-200">
          <CourseSearchPanel
            selectedCourses={selectedCourses}
            onAddCourse={onAddCourse}
            onRemoveCourse={onRemoveCourse}
            onGenerate={() => setIsAdding(false)}
            isGenerating={false}
          />
        </div>
      )}
    </div>
  );
}
