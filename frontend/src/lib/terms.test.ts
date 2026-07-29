import { describe, it, expect } from "vitest";
import { getTermLabel, generateTermRange, AVAILABLE_TERMS } from "./terms";

describe("generateTermRange", () => {
  it("enumerates every quarter between two terms, inclusive, newest first", () => {
    expect(generateTermRange("202540", "202640")).toEqual([
      { value: "202640", label: "Fall 2026" },
      { value: "202630", label: "Summer 2026" },
      { value: "202620", label: "Spring 2026" },
      { value: "202610", label: "Winter 2026" },
      { value: "202540", label: "Fall 2025" },
    ]);
  });

  it("returns a single term when start and end are the same", () => {
    expect(generateTermRange("202620", "202620")).toEqual([
      { value: "202620", label: "Spring 2026" },
    ]);
  });

  it("rolls over the calendar year boundary between Fall and the next Winter", () => {
    const codes = generateTermRange("202540", "202610").map((t) => t.value);
    expect(codes).toEqual(["202610", "202540"]);
  });
});

describe("getTermLabel", () => {
  it("returns the human-readable label for a known term code", () => {
    expect(getTermLabel("202620")).toBe("Spring 2026");
    expect(getTermLabel("202610")).toBe("Winter 2026");
    expect(getTermLabel("202540")).toBe("Fall 2025");
  });

  it("falls back to the raw code for an unknown term", () => {
    expect(getTermLabel("209999")).toBe("209999");
  });

  it("returns an empty string unchanged", () => {
    expect(getTermLabel("")).toBe("");
  });

  it("resolves every entry in AVAILABLE_TERMS", () => {
    for (const term of AVAILABLE_TERMS) {
      expect(getTermLabel(term.value)).toBe(term.label);
    }
  });

  it("covers Fall 2025 through Fall 2026 in AVAILABLE_TERMS", () => {
    expect(AVAILABLE_TERMS.map((t) => t.value)).toEqual([
      "202640",
      "202630",
      "202620",
      "202610",
      "202540",
    ]);
  });
});
