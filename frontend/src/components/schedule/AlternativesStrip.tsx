import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RankedSchedule } from "@/hooks/useScheduleRanking";

/** Cards rendered before the "show more" control. The pager still reaches all results. */
const VISIBLE_LIMIT = 20;

interface AlternativesStripProps {
  results: RankedSchedule[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function AlternativesStrip({ results, selectedIndex, onSelect }: AlternativesStripProps) {
  const [expanded, setExpanded] = useState(false);
  if (results.length <= 1) return null;

  const visible = expanded ? results : results.slice(0, VISIBLE_LIMIT);
  const hidden = results.length - visible.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Alternatives</h3>
        {hidden > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 cursor-pointer text-xs"
            onClick={() => setExpanded(true)}
          >
            Show {hidden} more
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {visible.map((result, index) => (
          <button
            key={result.originalIndex}
            onClick={() => onSelect(index)}
            className={`min-w-[140px] flex-shrink-0 rounded-lg border p-2.5 text-left transition ${
              index === selectedIndex
                ? "border-blue-600 bg-blue-50/40"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">#{result.rank}</span>
              <span className="text-sm font-bold text-blue-700">{result.score}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {result.schedule.activeDays.length} days - {result.schedule.totalUnits} units
            </div>
            <div className="text-xs text-gray-400">
              {result.schedule.earliestStart} to {result.schedule.latestEnd}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
