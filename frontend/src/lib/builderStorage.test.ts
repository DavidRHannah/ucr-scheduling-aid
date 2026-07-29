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
  gapMode: "lunch",
  weights: { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 },
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
    expect(JSON.parse(serializePreferences(samplePreferences)).version).toBe(1);
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
    expect(parsePreferences(JSON.stringify({ version: 1 }))).toBeNull();
  });

  it("returns null when startThresholdMinutes is not a number", () => {
    const raw = JSON.stringify({
      version: 1,
      preferences: { ...samplePreferences, startThresholdMinutes: "9am" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when weights is absent", () => {
    const raw = JSON.stringify({
      version: 1,
      preferences: { startThresholdMinutes: 540, gapMode: "lunch" },
    });
    expect(parsePreferences(raw)).toBeNull();
  });

  it("returns null when weights is an array", () => {
    const raw = JSON.stringify({
      version: 1,
      preferences: { ...samplePreferences, weights: [] },
    });
    expect(parsePreferences(raw)).toBeNull();
  });
});
