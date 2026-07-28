export interface Term {
  value: string;
  label: string;
}

export const AVAILABLE_TERMS: Term[] = [
  { value: "202620", label: "Spring 2026" },
  { value: "202610", label: "Fall 2025" },
];

/** Human-readable name for a Banner term code, or the raw code when unrecognized. */
export function getTermLabel(code: string): string {
  return AVAILABLE_TERMS.find((term) => term.value === code)?.label ?? code;
}
