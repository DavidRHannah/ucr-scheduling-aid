import type { GeneratedSchedule } from "@/lib/api";

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
