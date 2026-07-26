import { AlertCircle } from "lucide-react";
import type { GeneratedSchedule } from "@/lib/api";

interface NoResultsPanelProps {
  nearMisses: GeneratedSchedule[];
  isLoading: boolean;
}

export function NoResultsPanel({ nearMisses, isLoading }: NoResultsPanelProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold text-amber-900">
              No conflict-free schedule for these courses
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Every combination of the sections offered this term has at least one time
              collision.
            </p>
          </div>

          {isLoading && <p className="text-sm text-amber-700">Checking closest options...</p>}

          {!isLoading && nearMisses.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-900">
                Closest options, if you can drop one course
              </h3>
              <ul className="space-y-1.5">
                {nearMisses.slice(0, 3).map((miss, index) => (
                  <li key={index} className="rounded-md bg-white/70 p-2 text-sm text-amber-900">
                    {miss.groups.map((group) => `${group.subject} ${group.courseNumber}`).join(", ")}
                    <span className="text-amber-700"> - {miss.totalUnits} units</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isLoading && nearMisses.length === 0 && (
            <p className="text-sm text-amber-800">
              Try removing a course, or check the Course Catalog for other sections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
