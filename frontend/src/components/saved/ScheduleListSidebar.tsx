import type { SavedSchedule } from "@/lib/api";

interface ScheduleListItemProps {
  schedule: SavedSchedule;
  isSelected: boolean;
  onSelect: (schedule: SavedSchedule) => void;
}

function ScheduleListItem({ schedule, isSelected, onSelect }: ScheduleListItemProps) {
  return (
    <div
      onClick={() => onSelect(schedule)}
      className={`w-full cursor-pointer rounded-md p-3 text-left transition hover:bg-gray-50 border ${
        isSelected ? "border-blue-600 bg-blue-50/20" : "border-transparent"
      }`}
    >
      <div className="font-semibold text-gray-900 truncate">{schedule.name}</div>
      <div className="text-xs text-gray-400 mt-1">
        {schedule.sectionIds.length} sections
      </div>
    </div>
  );
}

interface ScheduleListSidebarProps {
  schedules: SavedSchedule[];
  selectedSchedule: SavedSchedule | null;
  loading: boolean;
  onSelect: (schedule: SavedSchedule) => void;
}

export function ScheduleListSidebar({
  schedules,
  selectedSchedule,
  loading,
  onSelect,
}: ScheduleListSidebarProps) {
  return (
    <div className="border-l border-gray-200 bg-white p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedules</h2>
      {loading ? (
        <div className="text-sm text-gray-400">Loading saved plans...</div>
      ) : (
        <div className="space-y-2">
          {schedules.map((sched) => (
            <ScheduleListItem
              key={sched._id}
              schedule={sched}
              isSelected={selectedSchedule?._id === sched._id}
              onSelect={onSelect}
            />
          ))}

          {schedules.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              No saved schedules found. Use the Schedule Builder to save a combination.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
