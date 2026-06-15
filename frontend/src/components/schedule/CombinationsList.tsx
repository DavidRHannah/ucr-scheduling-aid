import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CombinationCard } from "./CombinationCard";
import type { GeneratedSchedule } from "@/data/mockSchedule";

interface CombinationsListProps {
  combinations: GeneratedSchedule[];
  initialVisibleCount?: number;
}

export function CombinationsList({ combinations, initialVisibleCount = 3 }: CombinationsListProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = combinations.slice(0, initialVisibleCount);
  const rest = combinations.slice(initialVisibleCount);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Generated Combinations ({combinations.length})
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {visible.map((combo) => (
          <CombinationCard key={combo.id} combo={combo} />
        ))}
      </div>

      {rest.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
              {rest.map((combo) => (
                <CombinationCard key={combo.id} combo={combo} />
              ))}
            </div>
          </CollapsibleContent>

          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setExpanded((v) => !v)}
              className="gap-2"
            >
              {expanded ? "Show Fewer Combinations" : `Show ${rest.length} More Combinations`}
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
