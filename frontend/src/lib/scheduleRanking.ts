import type { GeneratedSchedule, Section } from "@/lib/api";

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

export function daysSubscore(schedule: GeneratedSchedule): number {
  return clamp01((5 - schedule.activeDays.length) / 4);
}

/** Weekly dead time at or beyond which the tight-gap subscore bottoms out. */
const TIGHT_GAP_CAP_MINUTES = 600;

/** A midday break must last at least this long to count. */
const LUNCH_MIN_MINUTES = 45;
/** A break longer than this stops being a lunch break and becomes dead time. */
const LUNCH_MAX_MINUTES = 90;
/** The window a qualifying break must overlap: 11:00 to 14:00. */
const LUNCH_WINDOW_START = 11 * 60;
const LUNCH_WINDOW_END = 14 * 60;

export type GapMode = "tight" | "lunch" | "none";

export interface ScheduleBlock {
  day: string;
  start: number;
  end: number;
}

export function collectBlocks(schedule: GeneratedSchedule): ScheduleBlock[] {
  return schedule.groups.flatMap((group) =>
    group.sections.flatMap((section) => section.blocks ?? []),
  );
}

/** True when the day contains a break of lunch length overlapping the midday window. */
function dayHasLunchGap(blocks: ScheduleBlock[]): boolean {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    const duration = gapEnd - gapStart;
    if (duration < LUNCH_MIN_MINUTES || duration > LUNCH_MAX_MINUTES) continue;
    if (gapStart < LUNCH_WINDOW_END && gapEnd > LUNCH_WINDOW_START) return true;
  }
  return false;
}

export function gapsSubscore(schedule: GeneratedSchedule, mode: GapMode): number {
  if (mode === "none") return 1;
  if (isFullyAsync(schedule)) return 1;

  if (mode === "tight") {
    return clamp01(1 - schedule.totalGapMinutes / TIGHT_GAP_CAP_MINUTES);
  }

  const blocks = collectBlocks(schedule);
  const byDay = new Map<string, ScheduleBlock[]>();
  for (const block of blocks) {
    const existing = byDay.get(block.day);
    if (existing) existing.push(block);
    else byDay.set(block.day, [block]);
  }

  const qualifying = schedule.activeDays.filter((day) =>
    dayHasLunchGap(byDay.get(day) ?? []),
  ).length;

  return clamp01(qualifying / schedule.activeDays.length);
}

export interface RankingWeights {
  start: number;
  days: number;
  gaps: number;
  availability: number;
}

export interface RankingPreferences {
  startThresholdMinutes: number;
  gapMode: GapMode;
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
 * Weights are stored as raw importances and normalized here, so presets and
 * arbitrary user edits obey one rule. The "none" gap mode is a special case of
 * the same rule: its weight drops to zero and the remainder renormalizes.
 */
export function normalizeWeights(weights: RankingWeights, gapMode: GapMode): RankingWeights {
  const effective: RankingWeights = {
    start: Math.max(0, weights.start),
    days: Math.max(0, weights.days),
    gaps: gapMode === "none" ? 0 : Math.max(0, weights.gaps),
    availability: Math.max(0, weights.availability),
  };

  const sum = effective.start + effective.days + effective.gaps + effective.availability;
  if (sum === 0) {
    return { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 };
  }

  return {
    start: effective.start / sum,
    days: effective.days / sum,
    gaps: effective.gaps / sum,
    availability: effective.availability / sum,
  };
}

export function scoreSchedule(
  schedule: GeneratedSchedule,
  prefs: RankingPreferences,
): { score: number; subscores: Subscores } {
  const subscores: Subscores = {
    start: startSubscore(schedule, prefs.startThresholdMinutes),
    days: daysSubscore(schedule),
    gaps: gapsSubscore(schedule, prefs.gapMode),
    availability: availabilitySubscore(schedule),
  };

  const weights = normalizeWeights(prefs.weights, prefs.gapMode);
  const weighted =
    subscores.start * weights.start +
    subscores.days * weights.days +
    subscores.gaps * weights.gaps +
    subscores.availability * weights.availability;

  return { score: Math.round(clamp01(weighted) * 100), subscores };
}

/**
 * Ranks every schedule. This function must never drop an element: preferences
 * express themselves as order only. See the no-removal invariant in the spec.
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

  if (subscores.gaps >= CHIP_STRENGTH_THRESHOLD) {
    if (prefs.gapMode === "tight") {
      positive.push({ label: "Short gaps between classes", tone: "positive" });
    } else if (prefs.gapMode === "lunch") {
      positive.push({ label: "Midday break most days", tone: "positive" });
    }
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
    weights: { start: 0.5, days: 0.15, gaps: 0, availability: 0.35 },
  },
  compactWeek: {
    startThresholdMinutes: 8 * 60,
    gapMode: "tight",
    weights: { start: 0.1, days: 0.5, gaps: 0.2, availability: 0.2 },
  },
  balanced: {
    startThresholdMinutes: 9 * 60,
    gapMode: "lunch",
    weights: { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 },
  },
};

export const PRESET_LABELS: Record<PresetName, string> = {
  sleepIn: "Sleep In",
  compactWeek: "Compact Week",
  balanced: "Balanced",
};

export const DEFAULT_PREFERENCES: RankingPreferences = PRESETS.balanced;

/** Returns the preset these preferences exactly match, or null if customized. */
export function matchPreset(prefs: RankingPreferences): PresetName | null {
  const names = Object.keys(PRESETS) as PresetName[];
  return (
    names.find((name) => {
      const preset = PRESETS[name];
      return (
        preset.startThresholdMinutes === prefs.startThresholdMinutes &&
        preset.gapMode === prefs.gapMode &&
        preset.weights.start === prefs.weights.start &&
        preset.weights.days === prefs.weights.days &&
        preset.weights.gaps === prefs.weights.gaps &&
        preset.weights.availability === prefs.weights.availability
      );
    }) ?? null
  );
}
