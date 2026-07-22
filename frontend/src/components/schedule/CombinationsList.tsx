import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CombinationCard } from "./CombinationCard";
import type { GeneratedSchedule } from "@/lib/api";

interface CombinationsListProps {
  combinations: GeneratedSchedule[];
  selectedComboIndex: number | null;
  onSelectCombo: (index: number) => void;
  initialVisibleCount?: number;
}

export function CombinationsList({
  combinations,
  selectedComboIndex,
  onSelectCombo,
  initialVisibleCount = 3,
}: CombinationsListProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = combinations.slice(0, initialVisibleCount);
  const rest = combinations.slice(initialVisibleCount);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Generated Combinations ({combinations.length})
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {visible.map((combo, idx) => (
          <CombinationCard
            key={idx}
            combo={combo}
            index={idx}
            isSelected={selectedComboIndex === idx}
            onSelect={onSelectCombo}
          />
        ))}
      </div>

      {rest.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
              {rest.map((combo, idx) => {
                const actualIdx = idx + initialVisibleCount;
                return (
                  <CombinationCard
                    key={actualIdx}
                    combo={combo}
                    index={actualIdx}
                    isSelected={selectedComboIndex === actualIdx}
                    onSelect={onSelectCombo}
                  />
                );
              })}
            </div>
          </CollapsibleContent>

          <div className="flex justify-center pt-4">
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
