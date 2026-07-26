import { useMemo } from "react";
import type { GeneratedSchedule } from "@/lib/api";
import {
  buildChips,
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
 * Ranks the fetched combinations. Recomputes only when the schedules or the
 * preferences change, so moving a preference slider costs no network call.
 */
export function useScheduleRanking(
  schedules: GeneratedSchedule[],
  prefs: RankingPreferences,
): RankedSchedule[] {
  return useMemo(
    () =>
      rankSchedules(schedules, prefs).map((scored, index) => ({
        ...scored,
        rank: index + 1,
        chips: buildChips(scored.schedule, scored.subscores, prefs),
      })),
    [schedules, prefs],
  );
}
