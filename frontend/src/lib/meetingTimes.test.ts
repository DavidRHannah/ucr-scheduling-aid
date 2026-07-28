import { describe, it, expect } from "vitest";
import type { MeetingTime, Section } from "@/lib/api";
import { formatMeetingDays, formatMeeting } from "./meetingTimes";

/**
 * Builds a Section carrying only the fields the formatters read.
 * Cast through unknown because formatting never touches the full Section shape.
 */
function makeSection(meetingTimes: Partial<MeetingTime>[]): Section {
  return { meetingTimes } as unknown as Section;
}

describe("formatMeetingDays", () => {
  it("maps single-letter codes to short day names", () => {
    expect(formatMeetingDays(["M", "W", "F"])).toBe("Mon/Wed/Fri");
  });

  it("handles a single day", () => {
    expect(formatMeetingDays(["R"])).toBe("Thu");
  });

  it("passes unrecognized codes through unchanged", () => {
    expect(formatMeetingDays(["M", "X"])).toBe("Mon/X");
  });

  it("returns an empty string when there are no days", () => {
    expect(formatMeetingDays([])).toBe("");
  });
});

describe("formatMeeting", () => {
  it("formats the first meeting block as days plus a time range", () => {
    const section = makeSection([
      { weekDays: ["M", "W"], startTime: "09:00", endTime: "09:50" },
    ]);
    expect(formatMeeting(section)).toBe("Mon/Wed 09:00 - 09:50");
  });

  it("reads as Asynchronous when the section has no meeting blocks", () => {
    expect(formatMeeting(makeSection([]))).toBe("Asynchronous");
  });

  it("reads as Asynchronous when the meeting block lists no week days", () => {
    const section = makeSection([
      { weekDays: [], startTime: "00:00", endTime: "00:00" },
    ]);
    expect(formatMeeting(section)).toBe("Asynchronous");
  });
});
