import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RankedSchedule } from "@/hooks/useScheduleRanking";

interface RankedResultHeaderProps {
  result: RankedSchedule;
  position: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function RankedResultHeader({
  result,
  position,
  total,
  onPrevious,
  onNext,
}: RankedResultHeaderProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPrevious, onNext]);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">
            {position === 1 ? "Best match" : `Option ${position}`}
          </h2>
          {result.score !== null && (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-700">
              {result.score}
            </span>
          )}
          <span className="text-sm text-gray-500">{result.schedule.totalUnits} units</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {result.chips.map((chip) => (
            <span
              key={chip.label}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                chip.tone === "caution"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 cursor-pointer"
          aria-label="Previous schedule"
          disabled={position <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm tabular-nums text-gray-600">
          {position} of {total}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 cursor-pointer"
          aria-label="Next schedule"
          disabled={position >= total}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
