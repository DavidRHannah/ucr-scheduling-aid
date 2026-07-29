import type { Section } from "@/lib/api";

export type WeekDay = "M" | "T" | "W" | "R" | "F" | "S" | "U";

/** The weekdays the grid renders. Weekend meetings are dropped. */
export const WEEK_DAYS: { key: WeekDay; label: string }[] = [
  { key: "M", label: "Mon" },
  { key: "T", label: "Tue" },
  { key: "W", label: "Wed" },
  { key: "R", label: "Thu" },
  { key: "F", label: "Fri" },
];

/** Hard bounds so a stray record cannot render a 24-hour grid. */
const MIN_HOUR = 6;
const MAX_HOUR = 23;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Bounds the grid to the sections actually present, with one hour of padding.
 * The old fixed 8:00-18:00 window silently hid evening classes.
 */
export const SCALE_PRESETS = {
  compact: 18,
  medium: 24,
  comfortable: 30,
} as const;

/**
 * Calculates an optimal half-hour row height (in pixels) based on the total
 * hour span of the schedule. This keeps the total grid height bounded (~480px-540px)
 * so schedules spanning morning to night fit on standard laptop screens without vertical scrolling.
 */
export function getAutoRowHeight(startHour: number, endHour: number): number {
  const totalHours = endHour - startHour;
  if (totalHours <= 8) return SCALE_PRESETS.comfortable;
  if (totalHours <= 10) return SCALE_PRESETS.medium;
  if (totalHours <= 12) return 20;
  return SCALE_PRESETS.compact;
}

export function getVisibleHourRange(sections: Section[]): {
  startHour: number;
  endHour: number;
} {
  const times = sections.flatMap((section) =>
    section.meetingTimes.flatMap((meeting) => [
      timeToMinutes(meeting.startTime),
      timeToMinutes(meeting.endTime),
    ]),
  );

  if (times.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  const earliest = Math.floor(Math.min(...times) / 60) - 1;
  const latest = Math.ceil(Math.max(...times) / 60) + 1;

  const startHour = Math.max(MIN_HOUR, earliest);
  const endHour = Math.min(MAX_HOUR, latest);

  if (startHour >= endHour) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  return { startHour, endHour };
}

export interface PlacedBlock {
  section: Section;
  day: WeekDay;
  startRow: number;
  rowSpan: number;
}

export function placeBlocks(sections: Section[], startHour: number): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  const gridStartMinutes = startHour * 60;

  for (const section of sections) {
    for (const meeting of section.meetingTimes) {
      const startMinutes = timeToMinutes(meeting.startTime) - gridStartMinutes;
      const endMinutes = timeToMinutes(meeting.endTime) - gridStartMinutes;
      // Each row represents 30 minutes; row 1 starts at startHour:00.
      const startRow = Math.floor(startMinutes / 30) + 1;
      const rowSpan = Math.max(1, Math.ceil((endMinutes - startMinutes) / 30));

      for (const day of meeting.weekDays) {
        if (WEEK_DAYS.some((d) => d.key === day)) {
          blocks.push({ section, day, startRow, rowSpan });
        }
      }
    }
  }

  return blocks;
}

export interface LaidOutBlock extends PlacedBlock {
  /** Zero-based horizontal slot within the block's overlap cluster. */
  column: number;
  /** Total slots in that cluster. Shared by every block in it so widths align. */
  columnCount: number;
}

/**
 * Splits overlapping meetings into side-by-side columns.
 *
 * Blocks are grouped per day into clusters of transitively overlapping
 * meetings, then greedily packed into the first column that is free. Every
 * block in a cluster reports the same columnCount so their rendered widths
 * line up even when one of them overlaps only part of the cluster.
 */
export function assignBlockColumns(blocks: PlacedBlock[]): LaidOutBlock[] {
  const result: LaidOutBlock[] = [];

  for (const { key: day } of WEEK_DAYS) {
    const dayBlocks = blocks
      .filter((b) => b.day === day)
      .sort((a, b) => a.startRow - b.startRow || a.rowSpan - b.rowSpan);

    let cluster: PlacedBlock[] = [];
    let clusterEnd = 0;

    const flushCluster = () => {
      if (cluster.length === 0) return;

      const columns: PlacedBlock[][] = [];
      const columnOf = new Map<PlacedBlock, number>();

      for (const block of cluster) {
        let placed = false;
        for (let c = 0; c < columns.length; c++) {
          const last = columns[c][columns[c].length - 1];
          if (last.startRow + last.rowSpan <= block.startRow) {
            columns[c].push(block);
            columnOf.set(block, c);
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([block]);
          columnOf.set(block, columns.length - 1);
        }
      }

      for (const block of cluster) {
        result.push({
          ...block,
          column: columnOf.get(block) ?? 0,
          columnCount: columns.length,
        });
      }

      cluster = [];
      clusterEnd = 0;
    };

    for (const block of dayBlocks) {
      if (cluster.length > 0 && block.startRow >= clusterEnd) {
        flushCluster();
      }
      cluster.push(block);
      clusterEnd = Math.max(clusterEnd, block.startRow + block.rowSpan);
    }
    flushCluster();
  }

  return result;
}
