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
  activeDimensions,
  scoreSchedule,
  rankSchedules,
  buildChips,
  DEFAULT_PREFERENCES,
  isDefaultPreferences,
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

describe("startSubscore, no preference", () => {
  it("scores 1 for any schedule when the threshold is null", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "07:00" }), null)).toBe(1);
    expect(startSubscore(makeSchedule({ earliestStart: "15:00" }), null)).toBe(1);
  });
});

describe("activeDimensions", () => {
  it("is empty when nothing is set", () => {
    expect(activeDimensions(DEFAULT_PREFERENCES)).toEqual([]);
  });

  it("activates start only when the threshold is not null", () => {
    expect(activeDimensions({ ...DEFAULT_PREFERENCES, startThresholdMinutes: 540 })).toEqual([
      "start",
    ]);
  });

  it("activates days only when at least one day is preferred", () => {
    expect(activeDimensions({ ...DEFAULT_PREFERENCES, preferredDays: ["M"] })).toEqual(["days"]);
  });

  it("activates gaps only in tight mode", () => {
    expect(activeDimensions({ ...DEFAULT_PREFERENCES, gapMode: "tight" })).toEqual(["gaps"]);
  });

  it("activates every dimension that is set", () => {
    const prefs: RankingPreferences = {
      ...DEFAULT_PREFERENCES,
      startThresholdMinutes: 540,
      preferredDays: ["M"],
      gapMode: "tight",
    };
    expect(activeDimensions(prefs)).toEqual(["start", "days", "gaps"]);
  });
});

describe("scoreSchedule", () => {
  it("returns a null score when no dimension is active", () => {
    expect(scoreSchedule(makeSchedule(), DEFAULT_PREFERENCES).score).toBeNull();
  });

  it("still reports every subscore when the score is null", () => {
    const { subscores } = scoreSchedule(makeSchedule(), DEFAULT_PREFERENCES);
    expect(subscores.start).toBe(1);
    expect(subscores.days).toBe(1);
    expect(subscores.gaps).toBe(1);
    expect(subscores.availability).toBe(1);
  });

  it("equals the sole active dimension's subscore", () => {
    // earliestStart 08:00 is 90 minutes before a 09:30 threshold, so the
    // start subscore is 1 - 90/180 = 0.5 and start is the only active
    // dimension.
    const schedule = makeSchedule({ earliestStart: "08:00" });
    const prefs = { ...DEFAULT_PREFERENCES, startThresholdMinutes: 570 };
    expect(scoreSchedule(schedule, prefs).score).toBe(50);
  });

  it("averages two active dimensions equally", () => {
    // start subscore 0.5 (as above); days subscore 0 because every active
    // day (M, W, F) falls outside the preferred set. Mean is 0.25.
    const schedule = makeSchedule({ earliestStart: "08:00", activeDays: ["M", "W", "F"] });
    const prefs: RankingPreferences = {
      ...DEFAULT_PREFERENCES,
      startThresholdMinutes: 570,
      preferredDays: ["T"],
    };
    expect(scoreSchedule(schedule, prefs).score).toBe(25);
  });

  it("returns 100 when every active subscore is perfect", () => {
    const schedule = makeSchedule({
      earliestStart: "10:00",
      activeDays: ["M", "W"],
      totalGapMinutes: 0,
    });
    const prefs: RankingPreferences = {
      startThresholdMinutes: 540,
      gapMode: "tight",
      preferredDays: ["M", "W"],
      hideClosedSections: false,
      hideWaitlistedSections: false,
    };
    expect(scoreSchedule(schedule, prefs).score).toBe(100);
  });
});

describe("preferred days influence, the weights regression", () => {
  it("ranks a schedule inside the preferred day set above one outside it", () => {
    // Regression test for the removed weights vector: when days is the only
    // active dimension it must fully determine the order. Under the old
    // weighted model this pair could tie or invert, because a preset left
    // days at roughly 11 percent of the score.
    const inside = makeSchedule({ activeDays: ["M", "W"], daysOff: ["T", "R", "F"] });
    const outside = makeSchedule({ activeDays: ["T", "R"], daysOff: ["M", "W", "F"] });
    const prefs: RankingPreferences = { ...DEFAULT_PREFERENCES, preferredDays: ["M", "W"] };

    const ranked = rankSchedules([outside, inside], prefs);

    expect(ranked[0].schedule).toBe(inside);
    expect(ranked[0].score).toBe(100);
    expect(ranked[1].score).toBe(0);
  });
});

describe("rankSchedules with a null score", () => {
  it("does not corrupt the order when every score is null", () => {
    const a = makeSchedule({ activeDays: ["M"], latestEnd: "12:00" });
    const b = makeSchedule({ activeDays: ["M", "W", "F"], latestEnd: "17:00" });
    const ranked = rankSchedules([b, a], DEFAULT_PREFERENCES);

    // Falls through to the tie-breakers: fewer active days wins.
    expect(ranked).toHaveLength(2);
    expect(ranked[0].schedule).toBe(a);
    expect(ranked[0].score).toBeNull();
    expect(ranked[1].score).toBeNull();
  });
});

describe("isDefaultPreferences", () => {
  it("is true for DEFAULT_PREFERENCES", () => {
    expect(isDefaultPreferences(DEFAULT_PREFERENCES)).toBe(true);
  });

  it("is false when a start threshold is set", () => {
    expect(
      isDefaultPreferences({ ...DEFAULT_PREFERENCES, startThresholdMinutes: 540 }),
    ).toBe(false);
  });

  it("is false when a day is preferred", () => {
    expect(isDefaultPreferences({ ...DEFAULT_PREFERENCES, preferredDays: ["M"] })).toBe(false);
  });

  it("is false in tight gap mode", () => {
    expect(isDefaultPreferences({ ...DEFAULT_PREFERENCES, gapMode: "tight" })).toBe(false);
  });

  it("is false when either filter is on", () => {
    expect(
      isDefaultPreferences({ ...DEFAULT_PREFERENCES, hideClosedSections: true }),
    ).toBe(false);
    expect(
      isDefaultPreferences({ ...DEFAULT_PREFERENCES, hideWaitlistedSections: true }),
    ).toBe(false);
  });
});

describe("DEFAULT_PREFERENCES", () => {
  it("sets no ranking preference and no filters", () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      startThresholdMinutes: null,
      gapMode: "none",
      preferredDays: [],
      hideClosedSections: false,
      hideWaitlistedSections: false,
    });
  });
});

describe("rankSchedules", () => {
  it("orders higher scores first", () => {
    // Both schedules have identical activeDays so the tie-breaker cannot
    // decide the order by itself; only a genuine score difference (from
    // earliestStart relative to basePrefs' start threshold) can.
    const good = makeSchedule({ earliestStart: "09:00", activeDays: ["M"], groups: [] });
    const bad = makeSchedule({ earliestStart: "06:00", activeDays: ["M"], groups: [] });
    const ranked = rankSchedules([bad, good], basePrefs);
    expect(ranked[0].schedule).toBe(good);
    expect(ranked[0].originalIndex).toBe(1);
    expect(ranked[0].score).not.toBe(ranked[1].score);
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
      { ...basePrefs, preferredDays: ["M"] },
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
    const noActiveDimensions: RankingPreferences = DEFAULT_PREFERENCES;
    const ranked = rankSchedules([lowAvailability, highAvailability], noActiveDimensions);
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

  it("omits the start chip when no start threshold is set", () => {
    const chips = buildChips(
      makeSchedule({ earliestStart: "07:00" }),
      perfectSubscores,
      DEFAULT_PREFERENCES,
    );
    expect(chips.some((chip) => chip.label.startsWith("No classes before"))).toBe(false);
  });
});
