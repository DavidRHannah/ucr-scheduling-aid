import { Button } from "@/components/ui/button";
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
  { value: "tight", label: "Keep them short" },
  { value: "lunch", label: "Protect a lunch break" },
  { value: "none", label: "No preference" },
];

interface SchedulePreferencesProps {
  preferences: RankingPreferences;
  onChange: (next: RankingPreferences) => void;
}

export function SchedulePreferences({ preferences, onChange }: SchedulePreferencesProps) {
  const activePreset = matchPreset(preferences);
  const presetNames = Object.keys(PRESETS) as PresetName[];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Preferences</h2>
        <p className="mt-1 text-xs text-gray-400">
          Reorders results instantly. Nothing is ever hidden.
        </p>
      </div>

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
        <label className="text-xs font-semibold text-gray-600">
          Fewer days on campus matters
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={preferences.weights.days}
          onChange={(e) =>
            onChange({
              ...preferences,
              weights: { ...preferences.weights, days: Number(e.target.value) },
            })
          }
          className="w-full cursor-pointer"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Between classes</label>
        <div className="space-y-1">
          {GAP_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="gap-mode"
                checked={preferences.gapMode === option.value}
                onChange={() => onChange({ ...preferences, gapMode: option.value })}
                className="cursor-pointer"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Open sections matter</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={preferences.weights.availability}
          onChange={(e) =>
            onChange({
              ...preferences,
              weights: { ...preferences.weights, availability: Number(e.target.value) },
            })
          }
          className="w-full cursor-pointer"
        />
        <p className="text-xs text-gray-400">
          Raising this sinks schedules with closed sections. It never removes them.
        </p>
      </div>
    </div>
  );
}
