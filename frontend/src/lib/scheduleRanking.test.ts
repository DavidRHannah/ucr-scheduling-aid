import { describe, it, expect } from "vitest";
import type { GeneratedSchedule } from "@/lib/api";
import {
  timeToMinutes,
  isFullyAsync,
  startSubscore,
  daysSubscore,
  collectBlocks,
  gapsSubscore,
} from "./scheduleRanking";

/**
 * Builds a GeneratedSchedule with only the fields the ranking logic reads.
 * Cast through unknown because ranking never touches the full Section shape.
 */
export function makeSchedule(overrides: Partial<GeneratedSchedule> = {}): GeneratedSchedule {
  return {
    totalUnits: 12,
    totalClassMinutes: 600,
    earliestStart: "09:00",
    latestEnd: "15:00",
    activeDays: ["M", "W", "F"],
    daysOff: ["T", "R"],
    totalGapMinutes: 0,
    groups: [],
    ...overrides,
  } as unknown as GeneratedSchedule;
}

describe("timeToMinutes", () => {
  it("converts HH:MM to minutes from midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("14:00")).toBe(840);
  });
});

describe("isFullyAsync", () => {
  it("is true when no days are active", () => {
    expect(isFullyAsync(makeSchedule({ activeDays: [] }))).toBe(true);
  });

  it("is false when any day is active", () => {
    expect(isFullyAsync(makeSchedule({ activeDays: ["M"] }))).toBe(false);
  });
});

describe("startSubscore", () => {
  const threshold = 600; // 10:00

  it("scores 1 when the first class is at the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "10:00" }), threshold)).toBe(1);
  });

  it("scores 1 when the first class is after the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "11:00" }), threshold)).toBe(1);
  });

  it("scores 0.5 ninety minutes before the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "08:30" }), threshold)).toBeCloseTo(0.5);
  });

  it("scores 0 three or more hours before the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "07:00" }), threshold)).toBe(0);
    expect(startSubscore(makeSchedule({ earliestStart: "06:00" }), threshold)).toBe(0);
  });

  it("treats a fully asynchronous schedule as neutral, not a midnight start", () => {
    const async = makeSchedule({ activeDays: [], earliestStart: "00:00" });
    expect(startSubscore(async, threshold)).toBe(1);
  });
});

describe("daysSubscore", () => {
  it("scores 1 for a single day on campus", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M"] }))).toBe(1);
  });

  it("scores 0 for five days on campus", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M", "T", "W", "R", "F"] }))).toBe(0);
  });

  it("scores 0.5 for three days on campus", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M", "W", "F"] }))).toBe(0.5);
  });

  it("scores 1 and never above 1 for a fully asynchronous schedule", () => {
    expect(daysSubscore(makeSchedule({ activeDays: [] }))).toBe(1);
  });
});

/** Builds a schedule whose groups carry the given blocks on one section. */
function makeScheduleWithBlocks(
  blocks: { day: string; start: number; end: number }[],
  overrides: Partial<GeneratedSchedule> = {},
): GeneratedSchedule {
  return makeSchedule({
    groups: [{ sections: [{ blocks }] }],
    ...overrides,
  } as unknown as Partial<GeneratedSchedule>);
}

describe("collectBlocks", () => {
  it("flattens blocks across all groups and sections", () => {
    const schedule = makeSchedule({
      groups: [
        { sections: [{ blocks: [{ day: "M", start: 540, end: 590 }] }] },
        { sections: [{ blocks: [{ day: "W", start: 600, end: 650 }] }] },
      ],
    } as unknown as Partial<GeneratedSchedule>);
    expect(collectBlocks(schedule)).toHaveLength(2);
  });

  it("returns an empty array when there are no groups", () => {
    expect(collectBlocks(makeSchedule({ groups: [] }))).toEqual([]);
  });
});

describe("gapsSubscore, tight mode", () => {
  it("scores 1 with no gaps", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 0 }), "tight")).toBe(1);
  });

  it("scores 0.5 at half the 600 minute cap", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 300 }), "tight")).toBeCloseTo(0.5);
  });

  it("scores 0 at or beyond the cap", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 600 }), "tight")).toBe(0);
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 900 }), "tight")).toBe(0);
  });
});

describe("gapsSubscore, lunch mode", () => {
  it("scores 1 when every active day has a qualifying midday gap", () => {
    // Monday: 10:00-11:00 then 12:00-13:00, a 60 minute gap starting at 11:00.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 720, end: 780 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(1);
  });

  it("scores 0 when the gap is shorter than 45 minutes", () => {
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 690, end: 750 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores 0 when the gap is longer than 90 minutes", () => {
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 780, end: 840 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores 0 when a qualifying-length gap falls outside 11:00 to 14:00", () => {
    // 08:00-09:00 then 10:00-11:00, a 60 minute gap ending exactly at 11:00.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 480, end: 540 },
        { day: "M", start: 600, end: 660 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores the fraction of active days that qualify", () => {
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 720, end: 780 },
        { day: "W", start: 600, end: 660 },
      ],
      { activeDays: ["M", "W"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0.5);
  });
});

describe("gapsSubscore, none mode", () => {
  it("scores 1 regardless of gaps", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 900 }), "none")).toBe(1);
  });
});

describe("gapsSubscore, fully asynchronous", () => {
  it("scores 1 in lunch mode without dividing by zero", () => {
    expect(gapsSubscore(makeSchedule({ activeDays: [], groups: [] }), "lunch")).toBe(1);
  });
});
