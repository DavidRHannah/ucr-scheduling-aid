import { describe, it, expect } from "vitest";
import { getTermLabel, AVAILABLE_TERMS } from "./terms";

describe("getTermLabel", () => {
  it("returns the human-readable label for a known term code", () => {
    expect(getTermLabel("202620")).toBe("Spring 2026");
    expect(getTermLabel("202610")).toBe("Fall 2025");
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
});
