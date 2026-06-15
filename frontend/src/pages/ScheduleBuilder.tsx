import { StatusBanner } from "@/components/schedule/StatusBanner";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { CombinationsList } from "@/components/schedule/CombinationsList";
import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import { lockedSchedule, generatedSchedules } from "@/data/mockSchedule";

export default function ScheduleBuilder() {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Builder</h1>

        <StatusBanner combinationCount={generatedSchedules.length} generationTimeSeconds={1.23} />

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Current Schedule (Locked)</h2>
          <WeeklyCalendar sections={lockedSchedule} />
        </div>

        <CombinationsList combinations={generatedSchedules} />
      </div>

      <CourseSearchPanel />
    </div>
  );
}
