export interface Term {
  value: string;
  label: string;
}

// UCR Banner term codes are the literal 4-digit calendar year the quarter
// starts in, plus a 2-digit quarter suffix. Confirmed against real termDesc
// values returned by Banner: 202540 = "Fall 2025", 202610 = "Winter 2026",
// 202620 = "Spring 2026", 202630 = "Summer 2026", 202640 = "Fall 2026" --
// so within one calendar year the quarters run Winter(10) < Spring(20) <
// Summer(30) < Fall(40), and the next Winter starts a new calendar year.
const QUARTERS: { suffix: string; name: string }[] = [
  { suffix: "10", name: "Winter" },
  { suffix: "20", name: "Spring" },
  { suffix: "30", name: "Summer" },
  { suffix: "40", name: "Fall" },
];

interface ParsedTerm {
  year: number;
  quarterIndex: number;
}

function parseTermCode(code: string): ParsedTerm {
  const year = Number(code.slice(0, 4));
  const suffix = code.slice(4);
  const quarterIndex = QUARTERS.findIndex((q) => q.suffix === suffix);
  return { year, quarterIndex };
}

function formatTerm({ year, quarterIndex }: ParsedTerm): Term {
  const quarter = QUARTERS[quarterIndex];
  return { value: `${year}${quarter.suffix}`, label: `${quarter.name} ${year}` };
}

/** Enumerates every quarter between two term codes, inclusive, newest first. */
export function generateTermRange(startCode: string, endCode: string): Term[] {
  const start = parseTermCode(startCode);
  const end = parseTermCode(endCode);

  const terms: Term[] = [];
  let { year, quarterIndex } = end;
  while (year > start.year || (year === start.year && quarterIndex >= start.quarterIndex)) {
    terms.push(formatTerm({ year, quarterIndex }));
    quarterIndex--;
    if (quarterIndex < 0) {
      quarterIndex = QUARTERS.length - 1;
      year--;
    }
  }
  return terms;
}

export const AVAILABLE_TERMS: Term[] = generateTermRange("202540", "202640");

/** Human-readable name for a Banner term code, or the raw code when unrecognized. */
export function getTermLabel(code: string): string {
  return AVAILABLE_TERMS.find((term) => term.value === code)?.label ?? code;
}
