import { describe, it, expect } from "vitest";
import type { GeneratedSchedule } from "@/lib/api";
import {
  timeToMinutes,
  isFullyAsync,
  startSubscore,
  daysSubscore,
  collectBlocks,
  gapsSubscore,
  collectSections,
  availabilitySubscore,
  normalizeWeights,
  scoreSchedule,
  rankSchedules,
  buildChips,
  PRESETS,
  DEFAULT_PREFERENCES,
  matchPreset,
  type RankingPreferences,
  type Subscores,
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
    // 08:00-09:00 then 10:00-11:00, a 60 minute gap from 9:00-10:00, entirely before the window.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 480, end: 540 },
        { day: "M", start: 600, end: 660 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores 0 when the gap ends exactly at the window start", () => {
    // Gap 10:00-11:00. gapEnd === 660, and the overlap test is strict.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 540, end: 600 },
        { day: "M", start: 660, end: 720 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores 0 when the gap starts exactly at the window end", () => {
    // Gap 14:00-15:00. gapStart === 840, and the overlap test is strict.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 780, end: 840 },
        { day: "M", start: 900, end: 960 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("counts a gap of exactly the minimum duration", () => {
    // Gap 11:30-12:15, exactly 45 minutes, inside the window.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 630, end: 690 },
        { day: "M", start: 735, end: 795 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(1);
  });

  it("counts a gap of exactly the maximum duration", () => {
    // Gap 11:30-13:00, exactly 90 minutes, inside the window.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 630, end: 690 },
        { day: "M", start: 780, end: 840 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(1);
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

const basePrefs: RankingPreferences = {
  startThresholdMinutes: 540, // 09:00
  gapMode: "none",
  weights: { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 },
};

/** Builds a schedule whose sections carry the given statuses. */
function makeScheduleWithStatuses(statuses: string[]): GeneratedSchedule {
  return makeSchedule({
    groups: [{ sections: statuses.map((status) => ({ status, blocks: [] })) }],
  } as unknown as Partial<GeneratedSchedule>);
}

describe("collectSections", () => {
  it("flattens sections across groups", () => {
    expect(collectSections(makeScheduleWithStatuses(["Open", "Closed"]))).toHaveLength(2);
  });
});

describe("availabilitySubscore", () => {
  it("scores 1 when every section is open", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Open", "Open"]))).toBe(1);
  });

  it("scores 0 when every section is closed", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Closed", "Closed"]))).toBe(0);
  });

  it("scores waitlisted sections at one half", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Waitlisted"]))).toBe(0.5);
  });

  it("averages mixed statuses", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Open", "Closed"]))).toBe(0.5);
  });

  it("scores 1 when there are no sections", () => {
    expect(availabilitySubscore(makeSchedule({ groups: [] }))).toBe(1);
  });
});

describe("normalizeWeights", () => {
  it("leaves weights summing to 1 unchanged", () => {
    const result = normalizeWeights({ start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 }, "lunch");
    expect(result.start).toBeCloseTo(0.25);
  });

  it("rescales weights that do not sum to 1", () => {
    const result = normalizeWeights({ start: 2, days: 2, gaps: 2, availability: 2 }, "lunch");
    expect(result.start).toBeCloseTo(0.25);
  });

  it("zeroes the gap weight and redistributes when mode is none", () => {
    const result = normalizeWeights({ start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 }, "none");
    expect(result.gaps).toBe(0);
    expect(result.start).toBeCloseTo(1 / 3);
    expect(result.start + result.days + result.availability).toBeCloseTo(1);
  });

  it("falls back to equal weights when everything is zero", () => {
    const result = normalizeWeights({ start: 0, days: 0, gaps: 0, availability: 0 }, "lunch");
    expect(result.start).toBeCloseTo(0.25);
  });
});

describe("scoreSchedule", () => {
  it("returns 100 when every subscore is perfect", () => {
    const perfect = makeSchedule({
      earliestStart: "12:00",
      activeDays: ["M"],
      totalGapMinutes: 0,
      groups: [{ sections: [{ status: "Open", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    expect(scoreSchedule(perfect, basePrefs).score).toBe(100);
  });

  it("returns 0 when every subscore is zero", () => {
    const worst = makeSchedule({
      earliestStart: "05:00",
      activeDays: ["M", "T", "W", "R", "F"],
      totalGapMinutes: 900,
      groups: [{ sections: [{ status: "Closed", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    expect(scoreSchedule(worst, { ...basePrefs, gapMode: "tight" }).score).toBe(0);
  });
});

describe("rankSchedules", () => {
  it("orders higher scores first", () => {
    const good = makeSchedule({ activeDays: ["M"], groups: [] });
    const bad = makeSchedule({ activeDays: ["M", "T", "W", "R", "F"], groups: [] });
    const ranked = rankSchedules([bad, good], basePrefs);
    expect(ranked[0].schedule).toBe(good);
    expect(ranked[0].originalIndex).toBe(1);
  });

  it("NEVER removes a combination, whatever the preferences", () => {
    const schedules = [
      makeScheduleWithStatuses(["Closed", "Closed"]),
      makeScheduleWithStatuses(["Open"]),
      makeScheduleWithStatuses(["Waitlisted"]),
    ];
    const configs: RankingPreferences[] = [
      basePrefs,
      { ...basePrefs, gapMode: "tight" },
      { ...basePrefs, weights: { start: 0, days: 0, gaps: 0, availability: 1 } },
      { ...basePrefs, startThresholdMinutes: 1200 },
    ];
    for (const prefs of configs) {
      const ranked = rankSchedules(schedules, prefs);
      expect(ranked).toHaveLength(schedules.length);
      expect(new Set(ranked.map((r) => r.schedule))).toEqual(new Set(schedules));
    }
  });

  it("breaks ties by availability, then fewer days, then earlier end", () => {
    const lowAvailability = makeSchedule({
      activeDays: ["M"],
      groups: [{ sections: [{ status: "Closed", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    const highAvailability = makeSchedule({
      activeDays: ["M"],
      groups: [{ sections: [{ status: "Open", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    const zeroWeights: RankingPreferences = {
      ...basePrefs,
      weights: { start: 0, days: 0, gaps: 0, availability: 0 },
    };
    const ranked = rankSchedules([lowAvailability, highAvailability], zeroWeights);
    expect(ranked[0].schedule).toBe(highAvailability);
  });

  it("is stable for fully equivalent schedules", () => {
    const a = makeSchedule({ groups: [] });
    const b = makeSchedule({ groups: [] });
    const ranked = rankSchedules([a, b], basePrefs);
    expect(ranked[0].schedule).toBe(a);
    expect(ranked[1].schedule).toBe(b);
  });
});

const perfectSubscores: Subscores = { start: 1, days: 1, gaps: 1, availability: 1 };

describe("buildChips", () => {
  it("reports a late start when the start subscore is strong", () => {
    const schedule = makeSchedule({ earliestStart: "10:00", daysOff: [] });
    const chips = buildChips(schedule, perfectSubscores, basePrefs);
    expect(chips.some((c) => c.label === "No classes before 10:00")).toBe(true);
  });

  it("reports days off when any exist", () => {
    const schedule = makeSchedule({ daysOff: ["F"] });
    const chips = buildChips(schedule, perfectSubscores, basePrefs);
    expect(chips.some((c) => c.label === "Fri free")).toBe(true);
  });

  it("names multiple days off together", () => {
    const schedule = makeSchedule({ daysOff: ["T", "R"] });
    const chips = buildChips(schedule, perfectSubscores, basePrefs);
    expect(chips.some((c) => c.label === "Tue, Thu free")).toBe(true);
  });

  it("describes tight gaps in tight mode", () => {
    const chips = buildChips(makeSchedule({ daysOff: [] }), perfectSubscores, {
      ...basePrefs,
      gapMode: "tight",
    });
    expect(chips.some((c) => c.label === "Short gaps between classes")).toBe(true);
  });

  it("describes a midday break in lunch mode", () => {
    const chips = buildChips(makeSchedule({ daysOff: [] }), perfectSubscores, {
      ...basePrefs,
      gapMode: "lunch",
    });
    expect(chips.some((c) => c.label === "Midday break most days")).toBe(true);
  });

  it("raises a caution for waitlisted sections", () => {
    const schedule = makeScheduleWithStatuses(["Open", "Waitlisted"]);
    const chips = buildChips(schedule, { ...perfectSubscores, availability: 0.75 }, basePrefs);
    const caution = chips.find((c) => c.label === "1 waitlisted");
    expect(caution?.tone).toBe("caution");
  });

  it("raises a caution for closed sections", () => {
    const schedule = makeScheduleWithStatuses(["Open", "Closed", "Closed"]);
    const chips = buildChips(schedule, { ...perfectSubscores, availability: 0.33 }, basePrefs);
    expect(chips.some((c) => c.label === "2 closed" && c.tone === "caution")).toBe(true);
  });

  it("keeps every caution chip even when positives would fill the list", () => {
    const schedule = makeSchedule({
      earliestStart: "10:00",
      daysOff: ["T"],
      groups: [
        {
          sections: [
            { status: "Waitlisted", blocks: [] },
            { status: "Closed", blocks: [] },
          ],
        },
      ],
    } as unknown as Partial<GeneratedSchedule>);

    const chips = buildChips(
      schedule,
      { start: 1, days: 1, gaps: 1, availability: 0.5 },
      { ...basePrefs, gapMode: "tight" },
    );

    expect(chips).toHaveLength(4);
    expect(chips.filter((c) => c.tone === "caution").map((c) => c.label)).toEqual([
      "1 waitlisted",
      "1 closed",
    ]);
    expect(chips.filter((c) => c.tone === "positive")).toHaveLength(2);
  });

  it("returns at most four chips and puts cautions last", () => {
    const schedule = makeSchedule({
      earliestStart: "10:00",
      daysOff: ["T", "R"],
      groups: [{ sections: [{ status: "Closed", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    const chips = buildChips(schedule, { ...perfectSubscores, availability: 0 }, {
      ...basePrefs,
      gapMode: "lunch",
    });
    expect(chips.length).toBeLessThanOrEqual(4);
    expect(chips[chips.length - 1].tone).toBe("caution");
  });
});

describe("presets", () => {
  it("defines the three presets from the spec", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(["balanced", "compactWeek", "sleepIn"]);
  });

  it("sets Sleep In to a 10:00 threshold with no gap preference", () => {
    expect(PRESETS.sleepIn.startThresholdMinutes).toBe(600);
    expect(PRESETS.sleepIn.gapMode).toBe("none");
    expect(PRESETS.sleepIn.weights.start).toBe(0.5);
  });

  it("sets Compact Week to weight days most heavily with tight gaps", () => {
    expect(PRESETS.compactWeek.gapMode).toBe("tight");
    expect(PRESETS.compactWeek.weights.days).toBe(0.5);
    expect(PRESETS.compactWeek.startThresholdMinutes).toBe(480);
  });

  it("sets Balanced to even weights protecting a lunch break", () => {
    expect(PRESETS.balanced.gapMode).toBe("lunch");
    expect(PRESETS.balanced.startThresholdMinutes).toBe(540);
    expect(PRESETS.balanced.weights).toEqual({
      start: 0.25,
      days: 0.25,
      gaps: 0.25,
      availability: 0.25,
    });
  });

  it("defaults to Balanced", () => {
    expect(DEFAULT_PREFERENCES).toEqual(PRESETS.balanced);
  });
});

describe("matchPreset", () => {
  it("identifies preferences equal to a preset", () => {
    expect(matchPreset(PRESETS.sleepIn)).toBe("sleepIn");
    expect(matchPreset(PRESETS.balanced)).toBe("balanced");
  });

  it("returns null for customized preferences", () => {
    expect(matchPreset({ ...PRESETS.balanced, startThresholdMinutes: 660 })).toBeNull();
  });
});
