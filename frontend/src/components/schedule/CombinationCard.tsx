import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GeneratedSchedule } from "@/lib/api";

const dayLabels: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

function formatDays(days: string[]): string {
  return days.map((d) => dayLabels[d] ?? d).join("/");
}

interface CombinationCardProps {
  combo: GeneratedSchedule;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

export function CombinationCard({ combo, index, isSelected, onSelect }: CombinationCardProps) {

  return (
    <Card className={`transition duration-200 ${isSelected ? "border-blue-600 ring-2 ring-blue-600/20" : "border-gray-200"}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <h3 className="font-semibold text-gray-900">Combo #{index + 1}</h3>
        <Badge variant="secondary">{combo.totalUnits} Units</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
          {combo.groups.map((group) =>
            group.sections.map((section) => {
              const meeting = section.meetingTimes?.[0];
              return (
                <div key={section._id} className="flex items-start justify-between text-xs border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {group.subject} {group.courseNumber}
                    </div>
                    <div className="text-gray-400 font-medium text-[10px]">{section.sectionNumber} • {section.crn}</div>
                  </div>
                  <div className="text-right text-gray-600 text-[11px]">
                    <div>{meeting ? formatDays(meeting.weekDays) : "Async"}</div>
                    <div>
                      {meeting ? `${meeting.startTime} - ${meeting.endTime}` : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex flex-col gap-0.5 text-[11px] text-gray-500">
            <span className="font-medium text-gray-700">{combo.totalGapMinutes} mins gap</span>
            <span>{combo.activeDays.length} days/week</span>
          </div>
          <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={() => onSelect(index)} className="cursor-pointer">
            {isSelected ? "Selected" : "Preview"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
