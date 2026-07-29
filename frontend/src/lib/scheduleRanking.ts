import type { GeneratedSchedule, Section } from "@/lib/api";
import type { WeekDay } from "@/lib/calendarLayout";

/** Start-time penalty reaches zero this many minutes before the threshold. */
const START_PENALTY_WINDOW_MINUTES = 180;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * A schedule with no meeting times at all. The generator emits the sentinel
 * earliestStart "00:00" for these, which would otherwise score as a midnight
 * start. An all-online schedule imposes no morning burden, so it scores
 * neutral on time-of-day and days-on-campus instead.
 */
export function isFullyAsync(schedule: GeneratedSchedule): boolean {
  return schedule.activeDays.length === 0;
}

export function startSubscore(schedule: GeneratedSchedule, thresholdMinutes: number): number {
  if (isFullyAsync(schedule)) return 1;
  const earliest = timeToMinutes(schedule.earliestStart);
  if (earliest >= thresholdMinutes) return 1;
  return clamp01(1 - (thresholdMinutes - earliest) / START_PENALTY_WINDOW_MINUTES);
}

/**
 * Scores how well a schedule's active days fit inside the student's
 * preferred day set. An empty preference means "no preference" and always
 * scores 1. A schedule that has to use days outside the preferred set is
 * penalized in proportion to what fraction of its active days that is --
 * it is never excluded outright, since a locked course may only offer a
 * section on a day outside the preference and that schedule may be the
 * only option.
 */
export function daysSubscore(schedule: GeneratedSchedule, preferredDays: WeekDay[]): number {
  if (preferredDays.length === 0) return 1;
  if (isFullyAsync(schedule)) return 1;
  const outside = schedule.activeDays.filter(
    (day) => !preferredDays.includes(day as WeekDay),
  ).length;
  return clamp01(1 - outside / schedule.activeDays.length);
}

/** Weekly dead time at or beyond which the tight-gap subscore bottoms out. */
const TIGHT_GAP_CAP_MINUTES = 600;

export type GapMode = "tight" | "none";

export function gapsSubscore(schedule: GeneratedSchedule, mode: GapMode): number {
  if (mode === "none") return 1;
  if (isFullyAsync(schedule)) return 1;
  return clamp01(1 - schedule.totalGapMinutes / TIGHT_GAP_CAP_MINUTES);
}

export interface RankingWeights {
  start: number;
  days: number;
  gaps: number;
}

export interface RankingPreferences {
  startThresholdMinutes: number;
  gapMode: GapMode;
  preferredDays: WeekDay[];
  hideClosedSections: boolean;
  hideWaitlistedSections: boolean;
  weights: RankingWeights;
}

export interface Subscores {
  start: number;
  days: number;
  gaps: number;
  availability: number;
}

export interface ScoredSchedule {
  schedule: GeneratedSchedule;
  originalIndex: number;
  score: number;
  subscores: Subscores;
}

export function collectSections(schedule: GeneratedSchedule): Section[] {
  return schedule.groups.flatMap((group) => group.sections);
}

export function availabilitySubscore(schedule: GeneratedSchedule): number {
  const sections = collectSections(schedule);
  if (sections.length === 0) return 1;
  const total = sections.reduce((sum, section) => {
    if (section.status === "Open") return sum + 1;
    if (section.status === "Waitlisted") return sum + 0.5;
    return sum;
  }, 0);
  return clamp01(total / sections.length);
}

/**
 * Excludes schedules containing a Closed or Waitlisted section, per the
 * active filter toggles. A section in pinnedSectionIds is exempt: the
 * student explicitly locked it in, so it should never be the reason a
 * schedule disappears -- otherwise a single pinned Closed section (e.g. one
 * the student is already enrolled in) would zero out every result, since
 * the generator forces it into every combination.
 *
 * This is a real filter, not a ranking signal -- unlike rankSchedules, it
 * is allowed to drop schedules and does.
 */
export function filterSchedules(
  schedules: GeneratedSchedule[],
  prefs: Pick<RankingPreferences, "hideClosedSections" | "hideWaitlistedSections">,
  pinnedSectionIds: Set<string>,
): GeneratedSchedule[] {
  if (!prefs.hideClosedSections && !prefs.hideWaitlistedSections) {
    return schedules;
  }
  return schedules.filter((schedule) =>
    collectSections(schedule).every((section) => {
      if (pinnedSectionIds.has(section._id)) return true;
      if (prefs.hideClosedSections && section.status === "Closed") return false;
      if (prefs.hideWaitlistedSections && section.status === "Waitlisted") return false;
      return true;
    }),
  );
}

/**
 * Weights are stored as raw importances and normalized here, so presets and
 * arbitrary user edits obey one rule. "none" gap mode and an empty preferred
 * day set are both special cases of the same rule: the corresponding
 * weight drops to zero and the remainder renormalizes.
 */
export function normalizeWeights(
  weights: RankingWeights,
  gapMode: GapMode,
  hasPreferredDays: boolean,
): RankingWeights {
  const effective: RankingWeights = {
    start: Math.max(0, weights.start),
    days: hasPreferredDays ? Math.max(0, weights.days) : 0,
    gaps: gapMode === "none" ? 0 : Math.max(0, weights.gaps),
  };

  const sum = effective.start + effective.days + effective.gaps;
  if (sum === 0) {
    return { start: 1 / 3, days: 1 / 3, gaps: 1 / 3 };
  }

  return {
    start: effective.start / sum,
    days: effective.days / sum,
    gaps: effective.gaps / sum,
  };
}

export function scoreSchedule(
  schedule: GeneratedSchedule,
  prefs: RankingPreferences,
): { score: number; subscores: Subscores } {
  const subscores: Subscores = {
    start: startSubscore(schedule, prefs.startThresholdMinutes),
    days: daysSubscore(schedule, prefs.preferredDays),
    gaps: gapsSubscore(schedule, prefs.gapMode),
    availability: availabilitySubscore(schedule),
  };

  const weights = normalizeWeights(prefs.weights, prefs.gapMode, prefs.preferredDays.length > 0);
  const weighted =
    subscores.start * weights.start +
    subscores.days * weights.days +
    subscores.gaps * weights.gaps;

  return { score: Math.round(clamp01(weighted) * 100), subscores };
}

/**
 * Ranks every schedule. This function must never drop an element: preferences
 * express themselves as order only. See the no-removal invariant in the spec.
 * Availability no longer drives the weighted score directly, but still
 * breaks ties -- a schedule with more open seats wins an otherwise-equal
 * comparison.
 */
export function rankSchedules(
  schedules: GeneratedSchedule[],
  prefs: RankingPreferences,
): ScoredSchedule[] {
  const scored: ScoredSchedule[] = schedules.map((schedule, originalIndex) => {
    const { score, subscores } = scoreSchedule(schedule, prefs);
    return { schedule, originalIndex, score, subscores };
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.subscores.availability !== a.subscores.availability) {
      return b.subscores.availability - a.subscores.availability;
    }
    const dayDiff = a.schedule.activeDays.length - b.schedule.activeDays.length;
    if (dayDiff !== 0) return dayDiff;
    const endDiff = timeToMinutes(a.schedule.latestEnd) - timeToMinutes(b.schedule.latestEnd);
    if (endDiff !== 0) return endDiff;
    return a.originalIndex - b.originalIndex;
  });
}

/** A subscore at or above this reads as a genuine strength worth stating. */
const CHIP_STRENGTH_THRESHOLD = 0.8;
const MAX_CHIPS = 4;

const DAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

export interface ExplanationChip {
  label: string;
  tone: "positive" | "caution";
}

/**
 * Turns subscores into plain statements of why a schedule ranked where it did.
 * A bare score is not trustworthy; a justified score is.
 */
export function buildChips(
  schedule: GeneratedSchedule,
  subscores: Subscores,
  prefs: RankingPreferences,
): ExplanationChip[] {
  const positive: ExplanationChip[] = [];
  const cautions: ExplanationChip[] = [];

  if (subscores.start >= CHIP_STRENGTH_THRESHOLD && !isFullyAsync(schedule)) {
    positive.push({ label: `No classes before ${schedule.earliestStart}`, tone: "positive" });
  }

  if (schedule.daysOff.length > 0) {
    const labels = schedule.daysOff.map((day) => DAY_LABELS[day] ?? day).join(", ");
    positive.push({ label: `${labels} free`, tone: "positive" });
  }

  if (subscores.gaps >= CHIP_STRENGTH_THRESHOLD && prefs.gapMode === "tight") {
    positive.push({ label: "Short gaps between classes", tone: "positive" });
  }

  if (subscores.availability < 1) {
    const sections = collectSections(schedule);
    const waitlisted = sections.filter((s) => s.status === "Waitlisted").length;
    const closed = sections.filter((s) => s.status === "Closed").length;
    if (waitlisted > 0) cautions.push({ label: `${waitlisted} waitlisted`, tone: "caution" });
    if (closed > 0) cautions.push({ label: `${closed} closed`, tone: "caution" });
  }

  const room = Math.max(0, MAX_CHIPS - cautions.length);
  return [...positive.slice(0, room), ...cautions];
}

export type PresetName = "sleepIn" | "compactWeek" | "balanced";

export const PRESETS: Record<PresetName, RankingPreferences> = {
  sleepIn: {
    startThresholdMinutes: 10 * 60,
    gapMode: "none",
    preferredDays: [],
    hideClosedSections: false,
    hideWaitlistedSections: false,
    weights: { start: 0.8, days: 0.1, gaps: 0.1 },
  },
  compactWeek: {
    startThresholdMinutes: 8 * 60,
    gapMode: "tight",
    preferredDays: [],
    hideClosedSections: false,
    hideWaitlistedSections: false,
    weights: { start: 0.2, days: 0.4, gaps: 0.4 },
  },
  balanced: {
    startThresholdMinutes: 9 * 60,
    gapMode: "none",
    preferredDays: [],
    hideClosedSections: false,
    hideWaitlistedSections: false,
    weights: { start: 0.34, days: 0.33, gaps: 0.33 },
  },
};

export const PRESET_LABELS: Record<PresetName, string> = {
  sleepIn: "Sleep In",
  compactWeek: "Compact Week",
  balanced: "Balanced",
};

export const DEFAULT_PREFERENCES: RankingPreferences = PRESETS.balanced;

function sameDaySet(a: WeekDay[], b: WeekDay[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((day) => setB.has(day));
}

/** Returns the preset these preferences exactly match, or null if customized. */
export function matchPreset(prefs: RankingPreferences): PresetName | null {
  const names = Object.keys(PRESETS) as PresetName[];
  return (
    names.find((name) => {
      const preset = PRESETS[name];
      return (
        preset.startThresholdMinutes === prefs.startThresholdMinutes &&
        preset.gapMode === prefs.gapMode &&
        preset.hideClosedSections === prefs.hideClosedSections &&
        preset.hideWaitlistedSections === prefs.hideWaitlistedSections &&
        sameDaySet(preset.preferredDays, prefs.preferredDays) &&
        preset.weights.start === prefs.weights.start &&
        preset.weights.days === prefs.weights.days &&
        preset.weights.gaps === prefs.weights.gaps
      );
    }) ?? null
  );
}
