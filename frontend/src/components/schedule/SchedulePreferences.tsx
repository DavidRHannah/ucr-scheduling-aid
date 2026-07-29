import { Button } from "@/components/ui/button";
import { WEEK_DAYS, type WeekDay } from "@/lib/calendarLayout";
import {
  PRESETS,
  PRESET_LABELS,
  matchPreset,
  type GapMode,
  type PresetName,
  type RankingPreferences,
} from "@/lib/scheduleRanking";

const START_OPTIONS = [
  { minutes: 8 * 60, label: "8:00 AM" },
  { minutes: 9 * 60, label: "9:00 AM" },
  { minutes: 10 * 60, label: "10:00 AM" },
  { minutes: 11 * 60, label: "11:00 AM" },
  { minutes: 12 * 60, label: "12:00 PM" },
];

const GAP_OPTIONS: { value: GapMode; label: string }[] = [
  { value: "tight", label: "Compact" },
  { value: "none", label: "No preference" },
];

interface SchedulePreferencesProps {
  preferences: RankingPreferences;
  onChange: (next: RankingPreferences) => void;
}

export function SchedulePreferences({ preferences, onChange }: SchedulePreferencesProps) {
  const activePreset = matchPreset(preferences);
  const presetNames = Object.keys(PRESETS) as PresetName[];

  const toggleDay = (day: WeekDay) => {
    const isSelected = preferences.preferredDays.includes(day);
    const nextDays = isSelected
      ? preferences.preferredDays.filter((d) => d !== day)
      : [...preferences.preferredDays, day];
    onChange({ ...preferences, preferredDays: nextDays });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {presetNames.map((name) => (
          <Button
            key={name}
            size="sm"
            variant={activePreset === name ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onChange(PRESETS[name])}
          >
            {PRESET_LABELS[name]}
          </Button>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <span className="text-xs font-semibold text-gray-400">
          {activePreset ? "Adjust to customize" : "Custom"}
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Start no earlier than</label>
        <div className="flex flex-wrap gap-1">
          {START_OPTIONS.map((option) => (
            <Button
              key={option.minutes}
              size="sm"
              variant={preferences.startThresholdMinutes === option.minutes ? "secondary" : "ghost"}
              className="h-7 cursor-pointer px-2 text-xs"
              onClick={() => onChange({ ...preferences, startThresholdMinutes: option.minutes })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Prefer to be on campus</label>
        <div className="flex flex-wrap gap-1">
          {WEEK_DAYS.map((day) => (
            <Button
              key={day.key}
              size="sm"
              variant={preferences.preferredDays.includes(day.key) ? "secondary" : "ghost"}
              className="h-7 cursor-pointer px-2 text-xs"
              onClick={() => toggleDay(day.key)}
            >
              {day.label}
            </Button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {preferences.preferredDays.length === 0
            ? "No preference — every day is equally fine."
            : "Schedules using other days are still shown, just ranked lower."}
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Between classes</label>
        <div className="flex flex-wrap gap-1">
          {GAP_OPTIONS.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={preferences.gapMode === option.value ? "secondary" : "ghost"}
              className="h-7 cursor-pointer px-2 text-xs"
              onClick={() => onChange({ ...preferences, gapMode: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5 border-t border-gray-100 pt-3">
        <label className="text-xs font-semibold text-gray-600">Open sections</label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={preferences.hideClosedSections}
            onChange={(e) => onChange({ ...preferences, hideClosedSections: e.target.checked })}
            className="cursor-pointer"
          />
          Hide schedules with closed sections
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={preferences.hideWaitlistedSections}
            onChange={(e) => onChange({ ...preferences, hideWaitlistedSections: e.target.checked })}
            className="cursor-pointer"
          />
          Hide schedules with waitlisted sections
        </label>
        <p className="text-xs text-gray-400">
          A section you&apos;ve pinned yourself is never hidden by these, even if it&apos;s closed
          or waitlisted.
        </p>
      </div>
    </div>
  );
}
