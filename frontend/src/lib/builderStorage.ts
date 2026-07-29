import type { CourseInfo, Section } from "@/lib/api";
import type { RankingPreferences } from "@/lib/scheduleRanking";

/**
 * Bump when the stored shape changes. Payloads carrying any other version are
 * discarded on read, so a shape change can never surface as a parse crash in
 * the builder.
 */
const STORAGE_VERSION = 1;

const BUILDER_STATE_KEY_PREFIX = "builderState:";
const PREFERENCES_KEY = "builderPreferences";

export interface BuilderState {
  courses: CourseInfo[];
  pins: Section[];
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  return parsed as Record<string, unknown>;
}

export function serializeBuilderState(state: BuilderState): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    courses: state.courses,
    pins: state.pins,
  });
}

/**
 * Returns null for absent, malformed, or version-mismatched input. Never throws.
 *
 * Only the outer shape is validated: courses and pins are checked to be arrays,
 * not deep-validated element by element. The version guard is what protects
 * against shape drift, and deep validation would cost more than it saves.
 */
export function parseBuilderState(raw: string | null): BuilderState | null {
  const record = parseJson(raw);
  if (!record) return null;
  if (record.version !== STORAGE_VERSION) return null;
  if (!Array.isArray(record.courses) || !Array.isArray(record.pins)) return null;
  return {
    courses: record.courses as CourseInfo[],
    pins: record.pins as Section[],
  };
}

export function serializePreferences(preferences: RankingPreferences): string {
  return JSON.stringify({ version: STORAGE_VERSION, preferences });
}

/** Returns null for absent, malformed, or version-mismatched input. Never throws. */
export function parsePreferences(raw: string | null): RankingPreferences | null {
  const record = parseJson(raw);
  if (!record) return null;
  if (record.version !== STORAGE_VERSION) return null;

  const preferences = record.preferences;
  if (typeof preferences !== "object" || preferences === null) return null;

  const candidate = preferences as Record<string, unknown>;
  if (typeof candidate.startThresholdMinutes !== "number") return null;
  if (typeof candidate.gapMode !== "string") return null;
  if (typeof candidate.weights !== "object" || candidate.weights === null) return null;

  return preferences as RankingPreferences;
}

function builderStateKey(termCode: string): string {
  return `${BUILDER_STATE_KEY_PREFIX}${termCode}`;
}

export function loadBuilderState(termCode: string): BuilderState | null {
  try {
    return parseBuilderState(localStorage.getItem(builderStateKey(termCode)));
  } catch {
    return null;
  }
}

export function saveBuilderState(termCode: string, state: BuilderState): void {
  try {
    localStorage.setItem(builderStateKey(termCode), serializeBuilderState(state));
  } catch {
    // Persistence is a convenience, never core behavior. localStorage throws in
    // private browsing and when the quota is exhausted; neither should be able
    // to break the builder.
  }
}

export function loadPreferences(): RankingPreferences | null {
  try {
    return parsePreferences(localStorage.getItem(PREFERENCES_KEY));
  } catch {
    return null;
  }
}

export function savePreferences(preferences: RankingPreferences): void {
  try {
    localStorage.setItem(PREFERENCES_KEY, serializePreferences(preferences));
  } catch {
    // See saveBuilderState.
  }
}
