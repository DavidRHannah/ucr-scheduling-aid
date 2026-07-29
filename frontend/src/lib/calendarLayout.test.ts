import { describe, it, expect } from "vitest";
import type { Section } from "@/lib/api";
import {
  timeToMinutes,
  getVisibleHourRange,
  placeBlocks,
  type PlacedBlock,
} from "./calendarLayout";

/**
 * Builds a Section carrying only the fields the layout functions read.
 * Cast through unknown because layout never touches the full Section shape.
 */
function makeSection(
  id: string,
  meetings: { weekDays: string[]; startTime: string; endTime: string }[],
): Section {
  return {
    _id: id,
    courseId: { subject: "CS", courseNumber: "010A" },
    sectionNumber: "001",
    meetingTimes: meetings,
  } as unknown as Section;
}

describe("timeToMinutes", () => {
  it("converts a morning time to minutes past midnight", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });

  it("converts midnight to zero", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts an evening time", () => {
    expect(timeToMinutes("19:45")).toBe(1185);
  });
});

describe("getVisibleHourRange", () => {
  it("falls back to the default window when there are no sections", () => {
    expect(getVisibleHourRange([])).toEqual({ startHour: 8, endHour: 18 });
  });

  it("brackets the meetings with one hour of padding on each side", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["M"], startTime: "10:00", endTime: "10:50" }]),
    ];
    expect(getVisibleHourRange(sections)).toEqual({ startHour: 9, endHour: 12 });
  });

  it("clamps the start hour so an early meeting cannot render before 6 AM", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["M"], startTime: "06:00", endTime: "06:50" }]),
    ];
    expect(getVisibleHourRange(sections).startHour).toBe(6);
  });

  it("clamps the end hour so a late meeting cannot render past 11 PM", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["M"], startTime: "22:00", endTime: "22:50" }]),
    ];
    expect(getVisibleHourRange(sections).endHour).toBe(23);
  });

  it("widens the window to cover the earliest and latest meetings together", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["M"], startTime: "09:00", endTime: "09:50" }]),
      makeSection("b", [{ weekDays: ["W"], startTime: "16:00", endTime: "17:20" }]),
    ];
    expect(getVisibleHourRange(sections)).toEqual({ startHour: 8, endHour: 19 });
  });
});

describe("placeBlocks", () => {
  it("places a meeting at the row matching its offset from the grid start", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["M"], startTime: "09:00", endTime: "09:50" }]),
    ];
    const blocks = placeBlocks(sections, 8);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].startRow).toBe(3);
    expect(blocks[0].rowSpan).toBe(2);
  });

  it("emits one block per weekday the meeting occurs on", () => {
    const sections = [
      makeSection("a", [
        { weekDays: ["M", "W", "F"], startTime: "09:00", endTime: "09:50" },
      ]),
    ];
    const blocks = placeBlocks(sections, 8);
    expect(blocks.map((b: PlacedBlock) => b.day)).toEqual(["M", "W", "F"]);
  });

  it("ignores weekend days that the grid does not render", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["S", "U"], startTime: "09:00", endTime: "09:50" }]),
    ];
    expect(placeBlocks(sections, 8)).toEqual([]);
  });

  it("gives a meeting shorter than one row a minimum span of one row", () => {
    const sections = [
      makeSection("a", [{ weekDays: ["M"], startTime: "09:00", endTime: "09:10" }]),
    ];
    expect(placeBlocks(sections, 8)[0].rowSpan).toBe(1);
  });

  it("handles a section with multiple separate meeting blocks", () => {
    const sections = [
      makeSection("a", [
        { weekDays: ["M"], startTime: "09:00", endTime: "09:50" },
        { weekDays: ["W"], startTime: "14:00", endTime: "15:50" },
      ]),
    ];
    const blocks = placeBlocks(sections, 8);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].startRow).toBe(13);
    expect(blocks[1].rowSpan).toBe(4);
  });
});
