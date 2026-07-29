import { AlertCircle } from "lucide-react";
import type { GeneratedSchedule } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface NoResultsPanelProps {
  nearMisses: GeneratedSchedule[];
  isLoading: boolean;
  pinnedCount: number;
  onClearPins: () => void;
  /** Combinations the generator produced before any preference filter ran. */
  totalGenerated: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function NoResultsPanel({
  nearMisses,
  isLoading,
  pinnedCount,
  onClearPins,
  totalGenerated,
  hasActiveFilters,
  onClearFilters,
}: NoResultsPanelProps) {
  const filteredToZero = totalGenerated > 0 && hasActiveFilters;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="space-y-3">
          {filteredToZero ? (
            <div className="space-y-2">
              <h2 className="font-semibold text-amber-900">
                {totalGenerated} schedule{totalGenerated === 1 ? "" : "s"} hidden by your Open
                Sections filters
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Every conflict-free combination includes a closed or waitlisted section that
                isn&apos;t pinned.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-400 bg-white text-amber-900 hover:bg-amber-50"
                onClick={onClearFilters}
              >
                Clear open-sections filters
              </Button>
            </div>
          ) : (
            <div>
              <h2 className="font-semibold text-amber-900">
                No conflict-free schedule for these courses
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Every combination of the sections offered this term has at least one time
                collision.
              </p>
            </div>
          )}

          {pinnedCount > 0 && (
            <div className="space-y-2 rounded-md border border-amber-300 bg-amber-100/60 p-3">
              <p className="text-sm text-amber-900">
                You have {pinnedCount} pinned section{pinnedCount === 1 ? "" : "s"}. A pinned
                section can constrain the result, and pins persist across reloads, so one may no
                longer be offered this term after a catalog update.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-400 bg-white text-amber-900 hover:bg-amber-50"
                onClick={onClearPins}
              >
                Clear all {pinnedCount} pin{pinnedCount === 1 ? "" : "s"}
              </Button>
            </div>
          )}

          {!filteredToZero && isLoading && (
            <p className="text-sm text-amber-700">Checking closest options...</p>
          )}

          {!filteredToZero && !isLoading && nearMisses.length > 0 && (
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

          {!filteredToZero && !isLoading && nearMisses.length === 0 && pinnedCount === 0 && (
            <p className="text-sm text-amber-800">
              Try removing a course, or check the Course Catalog for other sections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
