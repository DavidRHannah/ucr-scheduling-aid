import type { CourseInfo, Section } from "@/lib/api";
import type { GapMode, RankingPreferences } from "@/lib/scheduleRanking";
import type { WeekDay } from "@/lib/calendarLayout";

/**
 * The full weekday key set. Intentionally not derived from `WEEK_DAYS`
 * (`@/lib/calendarLayout`), which only covers Mon-Fri for calendar-grid
 * rendering purposes -- validating against it here would reject a
 * legitimately stored Saturday/Sunday preference.
 */
const VALID_WEEK_DAYS: readonly WeekDay[] = ["M", "T", "W", "R", "F", "S", "U"];
const VALID_GAP_MODES: readonly GapMode[] = ["tight", "none"];

/**
 * Bump the relevant constant when its stored shape changes. Payloads carrying
 * any other version are discarded on read, so a shape change can never
 * surface as a parse crash in the builder. Kept separate so a builder-state
 * shape change (e.g. to Section) doesn't discard a user's saved preferences,
 * and vice versa.
 */
const BUILDER_STATE_VERSION = 1;
const PREFERENCES_VERSION = 3;

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
    version: BUILDER_STATE_VERSION,
    courses: state.courses,
    pins: state.pins,
  });
}

/**
 * Returns null for absent, malformed, or version-mismatched input. Never throws.
 *
 * The outer shape is validated (courses/pins are arrays), and each element is
 * shallow-checked for only the fields the app actually dereferences without a
 * guard elsewhere (`courseId._id` and `scheduleType.code` on pins, `_id` on
 * both) — not deep-validated in full. The version guard is the primary
 * defense against shape drift; this element check exists so a missed version
 * bump fails closed (state is dropped) instead of throwing on click and
 * persisting the broken state across reloads.
 */
export function parseBuilderState(raw: string | null): BuilderState | null {
  const record = parseJson(raw);
  if (!record) return null;
  if (record.version !== BUILDER_STATE_VERSION) return null;
  if (!Array.isArray(record.courses) || !Array.isArray(record.pins)) return null;

  const coursesOk = record.courses.every(
    (c) => typeof (c as CourseInfo)?._id === "string",
  );
  const pinsOk = record.pins.every((s) => {
    const section = s as Section;
    return (
      typeof section?._id === "string" &&
      typeof section?.courseId?._id === "string" &&
      typeof section?.scheduleType?.code === "string"
    );
  });
  if (!coursesOk || !pinsOk) return null;

  return {
    courses: record.courses as CourseInfo[],
    pins: record.pins as Section[],
  };
}

export function serializePreferences(preferences: RankingPreferences): string {
  return JSON.stringify({ version: PREFERENCES_VERSION, preferences });
}

/** Returns null for absent, malformed, or version-mismatched input. Never throws. */
export function parsePreferences(raw: string | null): RankingPreferences | null {
  const record = parseJson(raw);
  if (!record) return null;
  if (record.version !== PREFERENCES_VERSION) return null;

  const preferences = record.preferences;
  if (typeof preferences !== "object" || preferences === null) return null;

  const candidate = preferences as Record<string, unknown>;
  if (
    candidate.startThresholdMinutes !== null &&
    typeof candidate.startThresholdMinutes !== "number"
  ) {
    return null;
  }
  if (
    typeof candidate.gapMode !== "string" ||
    !VALID_GAP_MODES.includes(candidate.gapMode as GapMode)
  ) {
    return null;
  }
  if (
    !Array.isArray(candidate.preferredDays) ||
    !candidate.preferredDays.every((d) => VALID_WEEK_DAYS.includes(d as WeekDay))
  ) {
    return null;
  }
  if (typeof candidate.hideClosedSections !== "boolean") return null;
  if (typeof candidate.hideWaitlistedSections !== "boolean") return null;

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
