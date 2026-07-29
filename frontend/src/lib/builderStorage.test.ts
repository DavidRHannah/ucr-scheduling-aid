import { describe, it, expect } from "vitest";
import type { CourseInfo, Section } from "@/lib/api";
import type { RankingPreferences } from "@/lib/scheduleRanking";
import {
  serializeBuilderState,
  parseBuilderState,
  serializePreferences,
  parsePreferences,
} from "./builderStorage";

function makeCourse(id: string): CourseInfo {
  return {
    _id: id,
    subject: "CS",
    courseNumber: "010A",
    title: "Introduction to Computer Science",
    creditHours: { low: 4, high: 4 },
  };
}

/**
 * Builds a Section carrying only the fields these tests compare on.
 * Cast through unknown because storage round-trips the object opaquely.
 */
function makeSection(id: string): Section {
  return {
    _id: id,
    sectionNumber: "001",
    crn: "12345",
    termCode: "202540",
    courseId: { _id: "c1" },
    scheduleType: { code: "LEC" },
  } as unknown as Section;
}

const samplePreferences: RankingPreferences = {
  startThresholdMinutes: 9 * 60,
  gapMode: "none",
  preferredDays: ["M", "W"],
  hideClosedSections: false,
  hideWaitlistedSections: true,
};

describe("serializeBuilderState / parseBuilderState", () => {
  it("round-trips courses and pins", () => {
    const state = { courses: [makeCourse("c1")], pins: [makeSection("s1")] };
    const parsed = parseBuilderState(serializeBuilderState(state));
    expect(parsed).toEqual(state);
  });

  it("round-trips empty collections", () => {
    const state = { courses: [], pins: [] };
    expect(parseBuilderState(serializeBuilderState(state))).toEqual(state);
  });

  it("writes a version field", () => {
    const raw = serializeBuilderState({ courses: [], pins: [] });
    expect(JSON.parse(raw).version).toBe(1);
  });

  it("does not leak the version into the parsed result", () => {
    const parsed = parseBuilderState(serializeBuilderState({ courses: [], pins: [] }));
    expect(parsed).not.toHaveProperty("version");
  });

  it("returns null for absent input", () => {
    expect(parseBuilderState(null)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseBuilderState("{not json")).toBeNull();
  });

  it("returns null for a version mismatch", () => {
    const raw = JSON.stringify({ version: 99, courses: [], pins: [] });
    expect(parseBuilderState(raw)).toBeNull();
  });

  it("returns null when the version is absent", () => {
    expect(parseBuilderState(JSON.stringify({ courses: [], pins: [] }))).toBeNull();
  });

  it("returns null when courses is not an array", () => {
    const raw = JSON.stringify({ version: 1, courses: "nope", pins: [] });
    expect(parseBuilderState(raw)).toBeNull();
  });

  it("returns null when pins is absent", () => {
    expect(parseBuilderState(JSON.stringify({ version: 1, courses: [] }))).toBeNull();
  });

  it("returns null for a JSON primitive", () => {
    expect(parseBuilderState("42")).toBeNull();
  });

  it("returns null for JSON null", () => {
    expect(parseBuilderState("null")).toBeNull();
  });

  it("returns null when a course is missing _id", () => {
    const raw = JSON.stringify({
      version: 1,
      courses: [{ subject: "CS", courseNumber: "010A" }],
      pins: [],
    });
    expect(parseBuilderState(raw)).toBeNull();
  });

  it("returns null when a pin is missing courseId", () => {
    const raw = JSON.stringify({
      version: 1,
      courses: [],
      pins: [{ _id: "s1", scheduleType: { code: "LEC" } }],
    });
    expect(parseBuilderState(raw)).toBeNull();
  });
});

describe("serializePreferences / parsePreferences", () => {
  it("round-trips preferences", () => {
    expect(parsePreferences(serializePreferences(samplePreferences))).toEqual(
      samplePreferences,
    );
  });

  it("writes a version field", () => {
    expect(JSON.parse(serializePreferences(samplePreferences)).version).toBe(3);
  });

  it("returns null for absent input", () => {
    expect(parsePreferences(null)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parsePreferences("{not json")).toBeNull();
  });

  it("returns null for a version mismatch", () => {
    const raw = JSON.stringify({ version: 99, preferences: samplePreferences });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when preferences is absent", () => {
    expect(parsePreferences(JSON.stringify({ version: 3 }))).toBeNull();
  });

  it("returns null when startThresholdMinutes is not a number", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, startThresholdMinutes: "9am" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null for the previous shape's version", () => {
    const raw = JSON.stringify({
      version: 2,
      preferences: {
        startThresholdMinutes: 540,
        gapMode: "none",
        preferredDays: [],
        hideClosedSections: false,
        hideWaitlistedSections: false,
        weights: { start: 1 / 3, days: 1 / 3, gaps: 1 / 3 },
      },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when preferredDays is absent", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: {
        startThresholdMinutes: 540,
        gapMode: "none",
        hideClosedSections: false,
        hideWaitlistedSections: false,
      },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when preferredDays is not an array", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, preferredDays: "M" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when preferredDays contains an invalid weekday key", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, preferredDays: ["Xyz"] },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("accepts weekend weekday keys in preferredDays", () => {
    const prefs: RankingPreferences = { ...samplePreferences, preferredDays: ["S", "U"] };
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs);
  });

  it("returns null when gapMode is not a valid gap mode", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, gapMode: "relaxed" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when hideClosedSections is not a boolean", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, hideClosedSections: "yes" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when hideWaitlistedSections is not a boolean", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, hideWaitlistedSections: "yes" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("accepts a null startThresholdMinutes", () => {
    const prefs: RankingPreferences = { ...samplePreferences, startThresholdMinutes: null };
    expect(parsePreferences(serializePreferences(prefs))).toEqual(prefs);
  });

  it("returns null when startThresholdMinutes is neither a number nor null", () => {
    const raw = JSON.stringify({
      version: 3,
      preferences: { ...samplePreferences, startThresholdMinutes: "9am" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });
});
