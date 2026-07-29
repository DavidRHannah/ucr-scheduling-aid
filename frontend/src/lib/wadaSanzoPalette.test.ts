import { describe, expect, it } from "vitest";
import { getCourseColorMap, getCourseKey, WADA_SANZO_PALETTE } from "./wadaSanzoPalette";
import type { Section } from "./api";

function mockSection(subject: string, courseNumber: string, id: string): Section {
  return {
    _id: id,
    crn: "12345",
    sectionNumber: "001",
    termCode: "202640",
    subject,
    courseNumber,
    courseTitle: `${subject} Course`,
    creditHours: 4,
    scheduleType: { code: "LEC", description: "Lecture" },
    instructor: "Prof. Smith",
    meetingTimes: [],
    enrollmentMax: 30,
    enrollmentCurrent: 20,
    waitlistTotal: 0,
    waitlistRemaining: 0,
    status: "Open",
    courseId: {
      _id: `c_${subject}_${courseNumber}`,
      subject,
      courseNumber,
      title: `${subject} Course`,
      creditHours: { low: 4, high: 4 },
    },
  };
}

describe("wadaSanzoPalette", () => {
  it("extracts correct course key", () => {
    const s1 = mockSection("CS", "010A", "1");
    expect(getCourseKey(s1)).toBe("CS 010A");
  });

  it("assigns Palette[0] to single-course schedule", () => {
    const sections = [
      mockSection("MATH", "009A", "1"),
      mockSection("MATH", "009A", "2"), // lecture and discussion
    ];
    const map = getCourseColorMap(sections);
    expect(map.size).toBe(1);
    expect(map.get("MATH 009A")).toEqual(WADA_SANZO_PALETTE[0]);
  });

  it("assigns colors deterministically in alphabetical course order", () => {
    // Adding courses in arbitrary order: MATH 009A, CS 010A, ENGL 001A
    const sections = [
      mockSection("MATH", "009A", "1"),
      mockSection("CS", "010A", "2"),
      mockSection("ENGL", "001A", "3"),
    ];

    const map = getCourseColorMap(sections);
    expect(map.size).toBe(3);

    // Alphabetical order: CS 010A (0), ENGL 001A (1), MATH 009A (2)
    expect(map.get("CS 010A")).toEqual(WADA_SANZO_PALETTE[0]);
    expect(map.get("ENGL 001A")).toEqual(WADA_SANZO_PALETTE[1]);
    expect(map.get("MATH 009A")).toEqual(WADA_SANZO_PALETTE[2]);
  });

  it("maintains consistent color mapping for 1, 2, and 3 course schedules", () => {
    const cs = mockSection("CS", "010A", "1");
    const engl = mockSection("ENGL", "001A", "2");
    const math = mockSection("MATH", "009A", "3");

    const map1 = getCourseColorMap([math]);
    const map2 = getCourseColorMap([math, cs]);
    const map3 = getCourseColorMap([math, cs, engl]);

    // In 1-course schedule (MATH 009A), MATH gets Palette[0]
    expect(map1.get("MATH 009A")).toEqual(WADA_SANZO_PALETTE[0]);

    // In 2-course schedule (CS 010A, MATH 009A), CS gets Palette[0] and MATH gets Palette[1]
    expect(map2.get("CS 010A")).toEqual(WADA_SANZO_PALETTE[0]);
    expect(map2.get("MATH 009A")).toEqual(WADA_SANZO_PALETTE[1]);

    // In 3-course schedule (CS 010A, ENGL 001A, MATH 009A)
    expect(map3.get("CS 010A")).toEqual(WADA_SANZO_PALETTE[0]);
    expect(map3.get("ENGL 001A")).toEqual(WADA_SANZO_PALETTE[1]);
    expect(map3.get("MATH 009A")).toEqual(WADA_SANZO_PALETTE[2]);
  });
});
