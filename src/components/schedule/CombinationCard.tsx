import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GeneratedSchedule } from "@/data/mockSchedule";

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
}

export function CombinationCard({ combo }: CombinationCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold text-gray-900">Combo #{combo.id}</h3>
        <Badge variant="secondary">{combo.totalUnits} Units</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {combo.groups.map((group) =>
          group.sections.map((section) => {
            const meeting = section.meetingTimes[0];
            return (
              <div key={section._id} className="flex items-start justify-between text-sm">
                <div>
                  <div className="font-semibold text-gray-900">
                    {group.courseId.subject} {group.courseId.courseNumber}
                  </div>
                  <div className="text-gray-500">{section.sectionNumber}</div>
                </div>
                <div className="text-right text-gray-600">
                  <div>{formatDays(meeting.weekDays)}</div>
                  <div>
                    {meeting.startTime} - {meeting.endTime}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {combo.hasConflicts ? "Conflicts" : "No Conflicts"}
          </div>
          <Button size="sm">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}
