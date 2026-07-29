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

export function startSubscore(
  schedule: GeneratedSchedule,
  thresholdMinutes: number | null,
): number {
  if (thresholdMinutes === null) return 1;
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

export interface RankingPreferences {
  /** null means no preference, which leaves the start dimension inactive. */
  startThresholdMinutes: number | null;
  gapMode: GapMode;
  preferredDays: WeekDay[];
  hideClosedSections: boolean;
  hideWaitlistedSections: boolean;
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
  score: number | null;
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
 * The dimensions currently contributing to the score. A dimension the
 * student has not set contributes nothing at all, rather than a muted share
 * of a hidden weight vector -- so every control visible in the panel carries
 * equal and predictable influence over the ranking.
 */
export function activeDimensions(
  prefs: RankingPreferences,
): Array<"start" | "days" | "gaps"> {
  const active: Array<"start" | "days" | "gaps"> = [];
  if (prefs.startThresholdMinutes !== null) active.push("start");
  if (prefs.preferredDays.length > 0) active.push("days");
  if (prefs.gapMode === "tight") active.push("gaps");
  return active;
}

/**
 * Scores a schedule as the unweighted mean of the active dimensions. Returns
 * a null score when nothing is set: every schedule would otherwise show an
 * identical, fabricated 100. Subscores are always returned in full, since
 * availability still breaks ties and the chips read from them.
 */
export function scoreSchedule(
  schedule: GeneratedSchedule,
  prefs: RankingPreferences,
): { score: number | null; subscores: Subscores } {
  const subscores: Subscores = {
    start: startSubscore(schedule, prefs.startThresholdMinutes),
    days: daysSubscore(schedule, prefs.preferredDays),
    gaps: gapsSubscore(schedule, prefs.gapMode),
    availability: availabilitySubscore(schedule),
  };

  const active = activeDimensions(prefs);
  if (active.length === 0) return { score: null, subscores };

  const mean = active.reduce((sum, key) => sum + subscores[key], 0) / active.length;
  return { score: Math.round(clamp01(mean) * 100), subscores };
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
    // score is null for every schedule or for none, since it depends only on
    // which dimensions are active. Guard anyway: b.score - a.score on two
    // nulls yields NaN, which would corrupt the sort.
    if (a.score !== null && b.score !== null && b.score !== a.score) {
      return b.score - a.score;
    }
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

  if (
    prefs.startThresholdMinutes !== null &&
    subscores.start >= CHIP_STRENGTH_THRESHOLD &&
    !isFullyAsync(schedule)
  ) {
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

/**
 * Nothing set. Every dimension is inactive, so a fresh builder ranks purely
 * on the tie-breakers (open seats, then fewer days, then an earlier finish)
 * and shows no score until the student expresses a preference.
 */
export const DEFAULT_PREFERENCES: RankingPreferences = {
  startThresholdMinutes: null,
  gapMode: "none",
  preferredDays: [],
  hideClosedSections: false,
  hideWaitlistedSections: false,
};

/** Drives the Reset control's visibility in the preferences panel. */
export function isDefaultPreferences(prefs: RankingPreferences): boolean {
  return (
    prefs.startThresholdMinutes === null &&
    prefs.gapMode === "none" &&
    prefs.preferredDays.length === 0 &&
    !prefs.hideClosedSections &&
    !prefs.hideWaitlistedSections
  );
}
