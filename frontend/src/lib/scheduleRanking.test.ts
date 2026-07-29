import { describe, it, expect } from "vitest";
import type { GeneratedSchedule } from "@/lib/api";
import {
  timeToMinutes,
  isFullyAsync,
  startSubscore,
  daysSubscore,
  gapsSubscore,
  collectSections,
  availabilitySubscore,
  filterSchedules,
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
  it("scores 1 when no day preference is set", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M", "T", "W", "R", "F"] }), [])).toBe(1);
  });

  it("scores 1 when every active day is inside the preferred set", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M", "W"] }), ["M", "W", "F"])).toBe(1);
  });

  it("penalizes in proportion to active days outside the preferred set", () => {
    // 1 of 4 active days (F) falls outside {M, T, W, R}.
    expect(
      daysSubscore(makeSchedule({ activeDays: ["M", "T", "W", "F"] }), ["M", "T", "W", "R"]),
    ).toBeCloseTo(0.75);
  });

  it("scores 0 when every active day is outside the preferred set", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["F"] }), ["M"])).toBe(0);
  });

  it("scores 1 for a fully asynchronous schedule regardless of preference", () => {
    expect(daysSubscore(makeSchedule({ activeDays: [] }), ["M"])).toBe(1);
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

describe("gapsSubscore, none mode", () => {
  it("scores 1 regardless of gaps", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 900 }), "none")).toBe(1);
  });
});

describe("gapsSubscore, fully asynchronous", () => {
  it("scores 1 in tight mode without dividing by zero", () => {
    expect(gapsSubscore(makeSchedule({ activeDays: [], groups: [] }), "tight")).toBe(1);
  });
});

const basePrefs: RankingPreferences = {
  startThresholdMinutes: 540, // 09:00
  gapMode: "none",
  preferredDays: [],
  hideClosedSections: false,
  hideWaitlistedSections: false,
  weights: { start: 1 / 3, days: 1 / 3, gaps: 1 / 3 },
};

/** Builds a schedule whose sections carry the given statuses (no ids). */
function makeScheduleWithStatuses(statuses: string[]): GeneratedSchedule {
  return makeSchedule({
    groups: [{ sections: statuses.map((status) => ({ status, blocks: [] })) }],
  } as unknown as Partial<GeneratedSchedule>);
}

/** Builds a schedule whose sections carry the given status and id, for filterSchedules tests. */
function makeScheduleWithSections(sections: { status: string; _id?: string }[]): GeneratedSchedule {
  return makeSchedule({
    groups: [
      { sections: sections.map((s) => ({ _id: s._id ?? "sec", status: s.status, blocks: [] })) },
    ],
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

describe("filterSchedules", () => {
  const noFilters = { hideClosedSections: false, hideWaitlistedSections: false };

  it("returns the input unchanged when both filters are off", () => {
    const schedules = [makeScheduleWithSections([{ status: "Closed" }])];
    expect(filterSchedules(schedules, noFilters, new Set())).toBe(schedules);
  });

  it("excludes a schedule with a closed section when hideClosedSections is on", () => {
    const open = makeScheduleWithSections([{ status: "Open" }]);
    const closed = makeScheduleWithSections([{ status: "Closed" }]);
    const result = filterSchedules(
      [open, closed],
      { hideClosedSections: true, hideWaitlistedSections: false },
      new Set(),
    );
    expect(result).toEqual([open]);
  });

  it("excludes a schedule with a waitlisted section when hideWaitlistedSections is on", () => {
    const open = makeScheduleWithSections([{ status: "Open" }]);
    const waitlisted = makeScheduleWithSections([{ status: "Waitlisted" }]);
    const result = filterSchedules(
      [open, waitlisted],
      { hideClosedSections: false, hideWaitlistedSections: true },
      new Set(),
    );
    expect(result).toEqual([open]);
  });

  it("excludes a schedule failing either filter when both are on", () => {
    const open = makeScheduleWithSections([{ status: "Open" }]);
    const closed = makeScheduleWithSections([{ status: "Closed" }]);
    const waitlisted = makeScheduleWithSections([{ status: "Waitlisted" }]);
    const result = filterSchedules(
      [open, closed, waitlisted],
      { hideClosedSections: true, hideWaitlistedSections: true },
      new Set(),
    );
    expect(result).toEqual([open]);
  });

  it("exempts a pinned section from the filter even when its status would otherwise exclude it", () => {
    const closedPinned = makeScheduleWithSections([{ status: "Closed", _id: "pinned-1" }]);
    const result = filterSchedules(
      [closedPinned],
      { hideClosedSections: true, hideWaitlistedSections: false },
      new Set(["pinned-1"]),
    );
    expect(result).toEqual([closedPinned]);
  });

  it("still filters a schedule's other, non-pinned closed sections even when one section is pinned", () => {
    const schedule = makeScheduleWithSections([
      { status: "Closed", _id: "pinned-1" },
      { status: "Closed", _id: "not-pinned" },
    ]);
    const result = filterSchedules(
      [schedule],
      { hideClosedSections: true, hideWaitlistedSections: false },
      new Set(["pinned-1"]),
    );
    expect(result).toEqual([]);
  });
});

describe("normalizeWeights", () => {
  it("leaves weights summing to 1 unchanged", () => {
    const result = normalizeWeights({ start: 1 / 3, days: 1 / 3, gaps: 1 / 3 }, "tight", true);
    expect(result.start).toBeCloseTo(1 / 3);
  });

  it("rescales weights that do not sum to 1", () => {
    const result = normalizeWeights({ start: 2, days: 2, gaps: 2 }, "tight", true);
    expect(result.start).toBeCloseTo(1 / 3);
  });

  it("zeroes the gap weight and redistributes when mode is none", () => {
    const result = normalizeWeights({ start: 1 / 3, days: 1 / 3, gaps: 1 / 3 }, "none", true);
    expect(result.gaps).toBe(0);
    expect(result.start).toBeCloseTo(0.5);
    expect(result.start + result.days).toBeCloseTo(1);
  });

  it("zeroes the days weight and redistributes when no preferred days are set", () => {
    const result = normalizeWeights({ start: 1 / 3, days: 1 / 3, gaps: 1 / 3 }, "tight", false);
    expect(result.days).toBe(0);
    expect(result.start).toBeCloseTo(0.5);
    expect(result.start + result.gaps).toBeCloseTo(1);
  });

  it("falls back to equal weights when everything is zero", () => {
    const result = normalizeWeights({ start: 0, days: 0, gaps: 0 }, "tight", true);
    expect(result.start).toBeCloseTo(1 / 3);
  });

  it("falls back to equal weights when both gaps and days are zeroed out", () => {
    const result = normalizeWeights({ start: 0, days: 1, gaps: 1 }, "none", false);
    expect(result).toEqual({ start: 1 / 3, days: 1 / 3, gaps: 1 / 3 });
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
      { ...basePrefs, weights: { start: 0, days: 0, gaps: 1 } },
      { ...basePrefs, startThresholdMinutes: 1200 },
      { ...basePrefs, hideClosedSections: true, hideWaitlistedSections: true },
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
      weights: { start: 0, days: 0, gaps: 0 },
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
      gapMode: "tight",
    });
    expect(chips.length).toBeLessThanOrEqual(4);
    expect(chips[chips.length - 1].tone).toBe("caution");
  });
});

describe("presets", () => {
  it("defines the three presets from the spec", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(["balanced", "compactWeek", "sleepIn"]);
  });

  it("sets Sleep In to a 10:00 threshold with no gap preference and no day/filter preference", () => {
    expect(PRESETS.sleepIn.startThresholdMinutes).toBe(600);
    expect(PRESETS.sleepIn.gapMode).toBe("none");
    expect(PRESETS.sleepIn.preferredDays).toEqual([]);
    expect(PRESETS.sleepIn.hideClosedSections).toBe(false);
    expect(PRESETS.sleepIn.hideWaitlistedSections).toBe(false);
    expect(PRESETS.sleepIn.weights.start).toBe(0.8);
  });

  it("sets Compact Week to weight days and gaps most heavily with tight gaps", () => {
    expect(PRESETS.compactWeek.gapMode).toBe("tight");
    expect(PRESETS.compactWeek.weights.days).toBe(0.4);
    expect(PRESETS.compactWeek.weights.gaps).toBe(0.4);
    expect(PRESETS.compactWeek.startThresholdMinutes).toBe(480);
  });

  it("sets Balanced to even weights with no gap preference", () => {
    expect(PRESETS.balanced.gapMode).toBe("none");
    expect(PRESETS.balanced.startThresholdMinutes).toBe(540);
    expect(PRESETS.balanced.weights).toEqual({
      start: 0.34,
      days: 0.33,
      gaps: 0.33,
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

  it("returns null when a filter toggle differs from the preset", () => {
    expect(matchPreset({ ...PRESETS.balanced, hideClosedSections: true })).toBeNull();
  });

  it("returns null when the preferred day set differs from the preset", () => {
    expect(matchPreset({ ...PRESETS.balanced, preferredDays: ["M"] })).toBeNull();
  });
});
