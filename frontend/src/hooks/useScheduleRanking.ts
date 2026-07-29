import { useMemo } from "react";
import type { GeneratedSchedule } from "@/lib/api";
import {
  buildChips,
  filterSchedules,
  rankSchedules,
  type ExplanationChip,
  type RankingPreferences,
  type ScoredSchedule,
} from "@/lib/scheduleRanking";

export interface RankedSchedule extends ScoredSchedule {
  /** One-based position in the ranked list. */
  rank: number;
  chips: ExplanationChip[];
}

/**
 * Filters out schedules the active preferences hard-exclude, then ranks
 * what's left. Recomputes only when the schedules, preferences, or pinned
 * sections change, so moving a preference control costs no network call.
 */
export function useScheduleRanking(
  schedules: GeneratedSchedule[],
  prefs: RankingPreferences,
  pinnedSectionIds: Set<string>,
): RankedSchedule[] {
  return useMemo(() => {
    const filtered = filterSchedules(schedules, prefs, pinnedSectionIds);
    return rankSchedules(filtered, prefs).map((scored, index) => ({
      ...scored,
      rank: index + 1,
      chips: buildChips(scored.schedule, scored.subscores, prefs),
    }));
  }, [schedules, prefs, pinnedSectionIds]);
}
