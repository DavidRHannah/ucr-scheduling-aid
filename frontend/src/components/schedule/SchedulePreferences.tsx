import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WEEK_DAYS, type WeekDay } from "@/lib/calendarLayout";
import { OptionGroup } from "./OptionGroup";
import {
  isDefaultPreferences,
  type GapMode,
  type RankingPreferences,
} from "@/lib/scheduleRanking";

/** Sentinel option value standing in for a null start threshold. */
const NO_START_PREFERENCE = "none";

const START_OPTIONS = [
  { value: NO_START_PREFERENCE, label: "No preference" },
  { value: String(8 * 60), label: "8 AM" },
  { value: String(9 * 60), label: "9 AM" },
  { value: String(10 * 60), label: "10 AM" },
  { value: String(11 * 60), label: "11 AM" },
  { value: String(12 * 60), label: "12 PM" },
];

const GAP_OPTIONS: { value: GapMode; label: string }[] = [
  { value: "tight", label: "Compact" },
  { value: "none", label: "No preference" },
];

const DAY_OPTIONS = WEEK_DAYS.map((day) => ({ value: day.key, label: day.label }));

interface SchedulePreferencesProps {
  preferences: RankingPreferences;
  onChange: (next: RankingPreferences) => void;
  /** Schedules surviving the active filters. */
  visibleCount: number;
  /** Schedules the active filters removed. */
  hiddenCount: number;
  onReset: () => void;
}

export function SchedulePreferences({
  preferences,
  onChange,
  visibleCount,
  hiddenCount,
  onReset,
}: SchedulePreferencesProps) {
  const startSelected =
    preferences.startThresholdMinutes === null
      ? [NO_START_PREFERENCE]
      : [String(preferences.startThresholdMinutes)];

  const handleStartSelect = (value: string) => {
    onChange({
      ...preferences,
      startThresholdMinutes: value === NO_START_PREFERENCE ? null : Number(value),
    });
  };

  const handleDaySelect = (day: WeekDay) => {
    const nextDays = preferences.preferredDays.includes(day)
      ? preferences.preferredDays.filter((d) => d !== day)
      : [...preferences.preferredDays, day];
    onChange({ ...preferences, preferredDays: nextDays });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-2">
        {visibleCount > 0 || hiddenCount > 0 ? (
          <p className="text-xs text-gray-500">
            {visibleCount} schedule{visibleCount === 1 ? "" : "s"}
            {hiddenCount > 0 && ` - ${hiddenCount} hidden by filters`}
          </p>
        ) : (
          <span />
        )}
        {!isDefaultPreferences(preferences) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 cursor-pointer px-2 text-xs"
            onClick={onReset}
          >
            Reset
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Ranking</h3>
          <p className="text-xs text-gray-400">Reorders results, never removes any.</p>
        </div>

        <OptionGroup
          label="Start no earlier than"
          options={START_OPTIONS}
          selected={startSelected}
          onSelect={handleStartSelect}
        />

        <OptionGroup
          label="Prefer to be on campus"
          options={DAY_OPTIONS}
          selected={preferences.preferredDays}
          onSelect={handleDaySelect}
        />

        <OptionGroup
          label="Between classes"
          options={GAP_OPTIONS}
          selected={[preferences.gapMode]}
          onSelect={(gapMode) => onChange({ ...preferences, gapMode })}
        />
      </section>

      <section className="space-y-2 border-t border-gray-100 pt-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Filters</h3>
          <p className="text-xs text-gray-400">Remove schedules from the list.</p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-closed"
            checked={preferences.hideClosedSections}
            onCheckedChange={(checked) =>
              onChange({ ...preferences, hideClosedSections: checked === true })
            }
          />
          <label htmlFor="hide-closed" className="cursor-pointer text-sm text-gray-700">
            Hide schedules with closed sections
          </label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-waitlisted"
            checked={preferences.hideWaitlistedSections}
            onCheckedChange={(checked) =>
              onChange({ ...preferences, hideWaitlistedSections: checked === true })
            }
          />
          <label htmlFor="hide-waitlisted" className="cursor-pointer text-sm text-gray-700">
            Hide schedules with waitlisted sections
          </label>
        </div>

        <p className="text-xs text-gray-400">
          Sections you&apos;ve pinned yourself are never hidden by these.
        </p>
      </section>
    </div>
  );
}
