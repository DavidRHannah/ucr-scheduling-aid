# Schedule Builder Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rank generated schedules against student preferences, lead with a justified best pick, and give the student the CRNs and section status they need to register.

**Architecture:** All scoring is pure client-side logic over the combinations the existing `POST /generate` endpoint already returns, so preference changes re-rank instantly with no network call. A pure scoring module is unit-tested with Vitest; presentational components consume a memoized ranking hook. The page becomes phase-aware, changing shape between course setup and result exploration.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, shadcn/ui, Vitest (added by Task 1).

Spec: `docs/superpowers/specs/2026-07-26-schedule-builder-redesign-design.md`

## Global Constraints

- No emojis anywhere in code, comments, commit messages, or documentation (CLAUDE.md).
- Use the `@/` path alias for all imports. It maps to `./src/`.
- No backend changes. Every value used here already exists in the `/generate` response.
- **No-removal invariant:** no preference may remove a combination from the result set. Preferences affect rank order only. Pinning a section is exempt: it is an explicit student constraint passed to the backend as `lockedSectionIds`, which legitimately changes what the generator produces. Do not "fix" pinning to satisfy the invariant.
- Do not modify files in `components/ui/` (shadcn primitives).
- Component tasks have no automated tests by design — the spec scopes Vitest to the pure scoring module only. Their verification is `npm run build`, `npm run lint`, and the stated manual check.
- `npm run lint` must not exceed the pre-existing baseline of **25 problems (20 errors, 5 warnings)** — pre-existing `err: any` and `set-state-in-effect` issues. Tasks 16 and 17 may reach **26**, and only if the 26th is a `react-hooks/set-state-in-effect` warning in `ScheduleBuilder.tsx` carried over from the original file. No task may introduce a new rule category.
- All commands run from `frontend/`.

## Data Facts (verified against `backend/utils/generator.js`)

- `GeneratedSchedule.earliestStart` and `.latestEnd` are `"HH:MM"` strings.
- A schedule with no meeting times at all emits the sentinel `earliestStart: "00:00"` and `activeDays: []`. Scored naively this looks like a midnight start and ranks worst. It must be treated as neutral instead.
- `groups[].sections[].blocks` is `{ day: string; start: number; end: number }[]` where `start`/`end` are minutes from midnight. This is the only source of per-day gap data.
- `totalGapMinutes` is summed across all days.
- `daysOff` considers only `M`, `T`, `W`, `R`, `F`.

## File Structure

**Create:**
- `frontend/vitest.config.ts` — test config, standalone so `vite.config.ts` and the production build stay untouched
- `frontend/src/lib/scheduleRanking.ts` — all pure scoring logic and types
- `frontend/src/lib/scheduleRanking.test.ts` — Vitest suite
- `frontend/src/hooks/useScheduleRanking.ts` — memoized ranking
- `frontend/src/components/schedule/SchedulePreferences.tsx`
- `frontend/src/components/schedule/CoursePickerRail.tsx`
- `frontend/src/components/schedule/RankedResultHeader.tsx`
- `frontend/src/components/schedule/AlternativesStrip.tsx`
- `frontend/src/components/schedule/ScheduleSectionTable.tsx`
- `frontend/src/components/schedule/ScheduleActionBar.tsx`
- `frontend/src/components/schedule/NoResultsPanel.tsx`
- `frontend/src/components/schedule/AsyncSectionTray.tsx`

**Modify:**
- `frontend/package.json` — Vitest devDependency and scripts
- `frontend/src/components/schedule/WeeklyCalendar.tsx` — dynamic hour bounds
- `frontend/src/pages/ScheduleBuilder.tsx` — full rewrite to phase-aware layout

**Delete (Task 17):**
- `StatusBanner.tsx`, `CombinationsList.tsx`, `CombinationCard.tsx`, `SectionControlList.tsx`

---

### Task 1: Vitest setup and time/start/days subscores

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/lib/scheduleRanking.ts`
- Test: `frontend/src/lib/scheduleRanking.test.ts`

**Interfaces:**
- Consumes: `GeneratedSchedule`, `Section` from `@/lib/api`
- Produces: `timeToMinutes(time: string): number`, `isFullyAsync(s: GeneratedSchedule): boolean`, `startSubscore(s: GeneratedSchedule, thresholdMinutes: number): number`, `daysSubscore(s: GeneratedSchedule): number`, and the test helper `makeSchedule` used by every later test task

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest@^3.2.0
```

- [ ] **Step 2: Add test scripts to `package.json`**

Add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

Standalone rather than folded into `vite.config.ts` so the production build config carries no test types. The project is ESM (`"type": "module"`), so `__dirname` is unavailable — use `fileURLToPath`.

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `frontend/src/lib/scheduleRanking.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { GeneratedSchedule } from "@/lib/api";
import { timeToMinutes, isFullyAsync, startSubscore, daysSubscore } from "./scheduleRanking";

/**
 * Builds a GeneratedSchedule with only the fields the ranking logic reads.
 * Cast through unknown because ranking never touches the full Section shape.
 */
export function makeSchedule(overrides: Partial<GeneratedSchedule> = {}): GeneratedSchedule {
  return {
    totalUnits: 12,
    totalClassMinutes: 600,
    earliestStart: "09:00",
    latestEnd: "15:00",
    activeDays: ["M", "W", "F"],
    daysOff: ["T", "R"],
    totalGapMinutes: 0,
    groups: [],
    ...overrides,
  } as unknown as GeneratedSchedule;
}

describe("timeToMinutes", () => {
  it("converts HH:MM to minutes from midnight", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("14:00")).toBe(840);
  });
});

describe("isFullyAsync", () => {
  it("is true when no days are active", () => {
    expect(isFullyAsync(makeSchedule({ activeDays: [] }))).toBe(true);
  });

  it("is false when any day is active", () => {
    expect(isFullyAsync(makeSchedule({ activeDays: ["M"] }))).toBe(false);
  });
});

describe("startSubscore", () => {
  const threshold = 600; // 10:00

  it("scores 1 when the first class is at the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "10:00" }), threshold)).toBe(1);
  });

  it("scores 1 when the first class is after the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "11:00" }), threshold)).toBe(1);
  });

  it("scores 0.5 ninety minutes before the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "08:30" }), threshold)).toBeCloseTo(0.5);
  });

  it("scores 0 three or more hours before the threshold", () => {
    expect(startSubscore(makeSchedule({ earliestStart: "07:00" }), threshold)).toBe(0);
    expect(startSubscore(makeSchedule({ earliestStart: "06:00" }), threshold)).toBe(0);
  });

  it("treats a fully asynchronous schedule as neutral, not a midnight start", () => {
    const async = makeSchedule({ activeDays: [], earliestStart: "00:00" });
    expect(startSubscore(async, threshold)).toBe(1);
  });
});

describe("daysSubscore", () => {
  it("scores 1 for a single day on campus", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M"] }))).toBe(1);
  });

  it("scores 0 for five days on campus", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M", "T", "W", "R", "F"] }))).toBe(0);
  });

  it("scores 0.5 for three days on campus", () => {
    expect(daysSubscore(makeSchedule({ activeDays: ["M", "W", "F"] }))).toBe(0.5);
  });

  it("scores 1 and never above 1 for a fully asynchronous schedule", () => {
    expect(daysSubscore(makeSchedule({ activeDays: [] }))).toBe(1);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./scheduleRanking`.

- [ ] **Step 6: Write the implementation**

Create `frontend/src/lib/scheduleRanking.ts`:

```ts
import type { GeneratedSchedule } from "@/lib/api";

/** Start-time penalty reaches zero this many minutes before the threshold. */
const START_PENALTY_WINDOW_MINUTES = 180;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * A schedule with no meeting times at all. The generator emits the sentinel
 * earliestStart "00:00" for these, which would otherwise score as a midnight
 * start. An all-online schedule imposes no morning burden, so it scores
 * neutral on time-of-day and days-on-campus instead.
 */
export function isFullyAsync(schedule: GeneratedSchedule): boolean {
  return schedule.activeDays.length === 0;
}

export function startSubscore(schedule: GeneratedSchedule, thresholdMinutes: number): number {
  if (isFullyAsync(schedule)) return 1;
  const earliest = timeToMinutes(schedule.earliestStart);
  if (earliest >= thresholdMinutes) return 1;
  return clamp01(1 - (thresholdMinutes - earliest) / START_PENALTY_WINDOW_MINUTES);
}

export function daysSubscore(schedule: GeneratedSchedule): number {
  return clamp01((5 - schedule.activeDays.length) / 4);
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 13 tests.

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.ts frontend/src/lib/scheduleRanking.ts frontend/src/lib/scheduleRanking.test.ts
git commit -m "Add Vitest and start/days schedule subscores"
```

---

### Task 2: Gap subscores

**Files:**
- Modify: `frontend/src/lib/scheduleRanking.ts`
- Test: `frontend/src/lib/scheduleRanking.test.ts`

**Interfaces:**
- Consumes: `isFullyAsync`, `clamp01` (internal) from Task 1
- Produces: `export type GapMode = "tight" | "lunch" | "none"`, `collectBlocks(s: GeneratedSchedule): { day: string; start: number; end: number }[]`, `gapsSubscore(s: GeneratedSchedule, mode: GapMode): number`

- [ ] **Step 1: Write the failing test**

Append to `frontend/src/lib/scheduleRanking.test.ts`, and extend the existing import from `./scheduleRanking` to also include `collectBlocks` and `gapsSubscore`:

```ts
/** Builds a schedule whose groups carry the given blocks on one section. */
function makeScheduleWithBlocks(
  blocks: { day: string; start: number; end: number }[],
  overrides: Partial<GeneratedSchedule> = {},
): GeneratedSchedule {
  return makeSchedule({
    groups: [{ sections: [{ blocks }] }],
    ...overrides,
  } as unknown as Partial<GeneratedSchedule>);
}

describe("collectBlocks", () => {
  it("flattens blocks across all groups and sections", () => {
    const schedule = makeSchedule({
      groups: [
        { sections: [{ blocks: [{ day: "M", start: 540, end: 590 }] }] },
        { sections: [{ blocks: [{ day: "W", start: 600, end: 650 }] }] },
      ],
    } as unknown as Partial<GeneratedSchedule>);
    expect(collectBlocks(schedule)).toHaveLength(2);
  });

  it("returns an empty array when there are no groups", () => {
    expect(collectBlocks(makeSchedule({ groups: [] }))).toEqual([]);
  });
});

describe("gapsSubscore, tight mode", () => {
  it("scores 1 with no gaps", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 0 }), "tight")).toBe(1);
  });

  it("scores 0.5 at half the 600 minute cap", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 300 }), "tight")).toBeCloseTo(0.5);
  });

  it("scores 0 at or beyond the cap", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 600 }), "tight")).toBe(0);
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 900 }), "tight")).toBe(0);
  });
});

describe("gapsSubscore, lunch mode", () => {
  it("scores 1 when every active day has a qualifying midday gap", () => {
    // Monday: 10:00-11:00 then 12:00-13:00, a 60 minute gap starting at 11:00.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 720, end: 780 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(1);
  });

  it("scores 0 when the gap is shorter than 45 minutes", () => {
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 690, end: 750 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores 0 when the gap is longer than 90 minutes", () => {
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 780, end: 840 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores 0 when a qualifying-length gap falls outside 11:00 to 14:00", () => {
    // 08:00-09:00 then 10:00-11:00, a 60 minute gap ending exactly at 11:00.
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 480, end: 540 },
        { day: "M", start: 600, end: 660 },
      ],
      { activeDays: ["M"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0);
  });

  it("scores the fraction of active days that qualify", () => {
    const schedule = makeScheduleWithBlocks(
      [
        { day: "M", start: 600, end: 660 },
        { day: "M", start: 720, end: 780 },
        { day: "W", start: 600, end: 660 },
      ],
      { activeDays: ["M", "W"] },
    );
    expect(gapsSubscore(schedule, "lunch")).toBe(0.5);
  });
});

describe("gapsSubscore, none mode", () => {
  it("scores 1 regardless of gaps", () => {
    expect(gapsSubscore(makeSchedule({ totalGapMinutes: 900 }), "none")).toBe(1);
  });
});

describe("gapsSubscore, fully asynchronous", () => {
  it("scores 1 in lunch mode without dividing by zero", () => {
    expect(gapsSubscore(makeSchedule({ activeDays: [], groups: [] }), "lunch")).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `collectBlocks` and `gapsSubscore` are not exported.

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/lib/scheduleRanking.ts`:

```ts
/** Weekly dead time at or beyond which the tight-gap subscore bottoms out. */
const TIGHT_GAP_CAP_MINUTES = 600;

/** A midday break must last at least this long to count. */
const LUNCH_MIN_MINUTES = 45;
/** A break longer than this stops being a lunch break and becomes dead time. */
const LUNCH_MAX_MINUTES = 90;
/** The window a qualifying break must overlap: 11:00 to 14:00. */
const LUNCH_WINDOW_START = 11 * 60;
const LUNCH_WINDOW_END = 14 * 60;

export type GapMode = "tight" | "lunch" | "none";

export interface ScheduleBlock {
  day: string;
  start: number;
  end: number;
}

export function collectBlocks(schedule: GeneratedSchedule): ScheduleBlock[] {
  return schedule.groups.flatMap((group) =>
    group.sections.flatMap((section) => section.blocks ?? []),
  );
}

/** True when the day contains a break of lunch length overlapping the midday window. */
function dayHasLunchGap(blocks: ScheduleBlock[]): boolean {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    const duration = gapEnd - gapStart;
    if (duration < LUNCH_MIN_MINUTES || duration > LUNCH_MAX_MINUTES) continue;
    if (gapStart < LUNCH_WINDOW_END && gapEnd > LUNCH_WINDOW_START) return true;
  }
  return false;
}

export function gapsSubscore(schedule: GeneratedSchedule, mode: GapMode): number {
  if (mode === "none") return 1;
  if (isFullyAsync(schedule)) return 1;

  if (mode === "tight") {
    return clamp01(1 - schedule.totalGapMinutes / TIGHT_GAP_CAP_MINUTES);
  }

  const blocks = collectBlocks(schedule);
  const byDay = new Map<string, ScheduleBlock[]>();
  for (const block of blocks) {
    const existing = byDay.get(block.day);
    if (existing) existing.push(block);
    else byDay.set(block.day, [block]);
  }

  const qualifying = schedule.activeDays.filter((day) =>
    dayHasLunchGap(byDay.get(day) ?? []),
  ).length;

  return clamp01(qualifying / schedule.activeDays.length);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, all tests including the 11 new ones.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/scheduleRanking.ts frontend/src/lib/scheduleRanking.test.ts
git commit -m "Add tight and lunch-break gap subscores"
```

---

### Task 3: Availability subscore, weight normalization, composite score, ranking

**Files:**
- Modify: `frontend/src/lib/scheduleRanking.ts`
- Test: `frontend/src/lib/scheduleRanking.test.ts`

**Interfaces:**
- Consumes: `startSubscore`, `daysSubscore`, `gapsSubscore`, `GapMode`
- Produces: `RankingWeights`, `RankingPreferences`, `Subscores`, `ScoredSchedule`, `collectSections`, `availabilitySubscore`, `normalizeWeights`, `scoreSchedule`, `rankSchedules`

- [ ] **Step 1: Write the failing test**

Append to the test file, extending the import to include `collectSections`, `availabilitySubscore`, `normalizeWeights`, `scoreSchedule`, `rankSchedules`, and the type `RankingPreferences`:

```ts
const basePrefs: RankingPreferences = {
  startThresholdMinutes: 540, // 09:00
  gapMode: "none",
  weights: { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 },
};

/** Builds a schedule whose sections carry the given statuses. */
function makeScheduleWithStatuses(statuses: string[]): GeneratedSchedule {
  return makeSchedule({
    groups: [{ sections: statuses.map((status) => ({ status, blocks: [] })) }],
  } as unknown as Partial<GeneratedSchedule>);
}

describe("collectSections", () => {
  it("flattens sections across groups", () => {
    expect(collectSections(makeScheduleWithStatuses(["Open", "Closed"]))).toHaveLength(2);
  });
});

describe("availabilitySubscore", () => {
  it("scores 1 when every section is open", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Open", "Open"]))).toBe(1);
  });

  it("scores 0 when every section is closed", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Closed", "Closed"]))).toBe(0);
  });

  it("scores waitlisted sections at one half", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Waitlisted"]))).toBe(0.5);
  });

  it("averages mixed statuses", () => {
    expect(availabilitySubscore(makeScheduleWithStatuses(["Open", "Closed"]))).toBe(0.5);
  });

  it("scores 1 when there are no sections", () => {
    expect(availabilitySubscore(makeSchedule({ groups: [] }))).toBe(1);
  });
});

describe("normalizeWeights", () => {
  it("leaves weights summing to 1 unchanged", () => {
    const result = normalizeWeights({ start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 }, "lunch");
    expect(result.start).toBeCloseTo(0.25);
  });

  it("rescales weights that do not sum to 1", () => {
    const result = normalizeWeights({ start: 2, days: 2, gaps: 2, availability: 2 }, "lunch");
    expect(result.start).toBeCloseTo(0.25);
  });

  it("zeroes the gap weight and redistributes when mode is none", () => {
    const result = normalizeWeights({ start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 }, "none");
    expect(result.gaps).toBe(0);
    expect(result.start).toBeCloseTo(1 / 3);
    expect(result.start + result.days + result.availability).toBeCloseTo(1);
  });

  it("falls back to equal weights when everything is zero", () => {
    const result = normalizeWeights({ start: 0, days: 0, gaps: 0, availability: 0 }, "lunch");
    expect(result.start).toBeCloseTo(0.25);
  });
});

describe("scoreSchedule", () => {
  it("returns 100 when every subscore is perfect", () => {
    const perfect = makeSchedule({
      earliestStart: "12:00",
      activeDays: ["M"],
      totalGapMinutes: 0,
      groups: [{ sections: [{ status: "Open", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    expect(scoreSchedule(perfect, basePrefs).score).toBe(100);
  });

  it("returns 0 when every subscore is zero", () => {
    const worst = makeSchedule({
      earliestStart: "05:00",
      activeDays: ["M", "T", "W", "R", "F"],
      totalGapMinutes: 900,
      groups: [{ sections: [{ status: "Closed", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    expect(scoreSchedule(worst, { ...basePrefs, gapMode: "tight" }).score).toBe(0);
  });
});

describe("rankSchedules", () => {
  it("orders higher scores first", () => {
    const good = makeSchedule({ activeDays: ["M"], groups: [] });
    const bad = makeSchedule({ activeDays: ["M", "T", "W", "R", "F"], groups: [] });
    const ranked = rankSchedules([bad, good], basePrefs);
    expect(ranked[0].schedule).toBe(good);
    expect(ranked[0].originalIndex).toBe(1);
  });

  it("NEVER removes a combination, whatever the preferences", () => {
    const schedules = [
      makeScheduleWithStatuses(["Closed", "Closed"]),
      makeScheduleWithStatuses(["Open"]),
      makeScheduleWithStatuses(["Waitlisted"]),
    ];
    const configs: RankingPreferences[] = [
      basePrefs,
      { ...basePrefs, gapMode: "tight" },
      { ...basePrefs, weights: { start: 0, days: 0, gaps: 0, availability: 1 } },
      { ...basePrefs, startThresholdMinutes: 1200 },
    ];
    for (const prefs of configs) {
      const ranked = rankSchedules(schedules, prefs);
      expect(ranked).toHaveLength(schedules.length);
      expect(new Set(ranked.map((r) => r.schedule))).toEqual(new Set(schedules));
    }
  });

  it("breaks ties by availability, then fewer days, then earlier end", () => {
    const lowAvailability = makeSchedule({
      activeDays: ["M"],
      groups: [{ sections: [{ status: "Closed", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    const highAvailability = makeSchedule({
      activeDays: ["M"],
      groups: [{ sections: [{ status: "Open", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    const zeroWeights: RankingPreferences = {
      ...basePrefs,
      weights: { start: 0, days: 0, gaps: 0, availability: 0 },
    };
    const ranked = rankSchedules([lowAvailability, highAvailability], zeroWeights);
    expect(ranked[0].schedule).toBe(highAvailability);
  });

  it("is stable for fully equivalent schedules", () => {
    const a = makeSchedule({ groups: [] });
    const b = makeSchedule({ groups: [] });
    const ranked = rankSchedules([a, b], basePrefs);
    expect(ranked[0].schedule).toBe(a);
    expect(ranked[1].schedule).toBe(b);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — the new exports do not exist.

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/lib/scheduleRanking.ts`:

```ts
import type { Section } from "@/lib/api";

export interface RankingWeights {
  start: number;
  days: number;
  gaps: number;
  availability: number;
}

export interface RankingPreferences {
  startThresholdMinutes: number;
  gapMode: GapMode;
  weights: RankingWeights;
}

export interface Subscores {
  start: number;
  days: number;
  gaps: number;
  availability: number;
}

export interface ScoredSchedule {
  schedule: GeneratedSchedule;
  originalIndex: number;
  score: number;
  subscores: Subscores;
}

export function collectSections(schedule: GeneratedSchedule): Section[] {
  return schedule.groups.flatMap((group) => group.sections);
}

export function availabilitySubscore(schedule: GeneratedSchedule): number {
  const sections = collectSections(schedule);
  if (sections.length === 0) return 1;
  const total = sections.reduce((sum, section) => {
    if (section.status === "Open") return sum + 1;
    if (section.status === "Waitlisted") return sum + 0.5;
    return sum;
  }, 0);
  return clamp01(total / sections.length);
}

/**
 * Weights are stored as raw importances and normalized here, so presets and
 * arbitrary user edits obey one rule. The "none" gap mode is a special case of
 * the same rule: its weight drops to zero and the remainder renormalizes.
 */
export function normalizeWeights(weights: RankingWeights, gapMode: GapMode): RankingWeights {
  const effective: RankingWeights = {
    start: Math.max(0, weights.start),
    days: Math.max(0, weights.days),
    gaps: gapMode === "none" ? 0 : Math.max(0, weights.gaps),
    availability: Math.max(0, weights.availability),
  };

  const sum = effective.start + effective.days + effective.gaps + effective.availability;
  if (sum === 0) {
    return { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 };
  }

  return {
    start: effective.start / sum,
    days: effective.days / sum,
    gaps: effective.gaps / sum,
    availability: effective.availability / sum,
  };
}

export function scoreSchedule(
  schedule: GeneratedSchedule,
  prefs: RankingPreferences,
): { score: number; subscores: Subscores } {
  const subscores: Subscores = {
    start: startSubscore(schedule, prefs.startThresholdMinutes),
    days: daysSubscore(schedule),
    gaps: gapsSubscore(schedule, prefs.gapMode),
    availability: availabilitySubscore(schedule),
  };

  const weights = normalizeWeights(prefs.weights, prefs.gapMode);
  const weighted =
    subscores.start * weights.start +
    subscores.days * weights.days +
    subscores.gaps * weights.gaps +
    subscores.availability * weights.availability;

  return { score: Math.round(clamp01(weighted) * 100), subscores };
}

/**
 * Ranks every schedule. This function must never drop an element: preferences
 * express themselves as order only. See the no-removal invariant in the spec.
 */
export function rankSchedules(
  schedules: GeneratedSchedule[],
  prefs: RankingPreferences,
): ScoredSchedule[] {
  const scored: ScoredSchedule[] = schedules.map((schedule, originalIndex) => {
    const { score, subscores } = scoreSchedule(schedule, prefs);
    return { schedule, originalIndex, score, subscores };
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.subscores.availability !== a.subscores.availability) {
      return b.subscores.availability - a.subscores.availability;
    }
    const dayDiff = a.schedule.activeDays.length - b.schedule.activeDays.length;
    if (dayDiff !== 0) return dayDiff;
    const endDiff = timeToMinutes(a.schedule.latestEnd) - timeToMinutes(b.schedule.latestEnd);
    if (endDiff !== 0) return endDiff;
    return a.originalIndex - b.originalIndex;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, including the no-removal invariant test.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/scheduleRanking.ts frontend/src/lib/scheduleRanking.test.ts
git commit -m "Add availability scoring, weight normalization, and ranking"
```

---

### Task 4: Explanation chips

**Files:**
- Modify: `frontend/src/lib/scheduleRanking.ts`
- Test: `frontend/src/lib/scheduleRanking.test.ts`

**Interfaces:**
- Consumes: `Subscores`, `RankingPreferences`, `collectSections`
- Produces: `ExplanationChip`, `buildChips(s: GeneratedSchedule, subscores: Subscores, prefs: RankingPreferences): ExplanationChip[]`

- [ ] **Step 1: Write the failing test**

Append to the test file, extending the import to include `buildChips`:

```ts
const perfectSubscores: Subscores = { start: 1, days: 1, gaps: 1, availability: 1 };

describe("buildChips", () => {
  it("reports a late start when the start subscore is strong", () => {
    const schedule = makeSchedule({ earliestStart: "10:00", daysOff: [] });
    const chips = buildChips(schedule, perfectSubscores, basePrefs);
    expect(chips.some((c) => c.label === "No classes before 10:00")).toBe(true);
  });

  it("reports days off when any exist", () => {
    const schedule = makeSchedule({ daysOff: ["F"] });
    const chips = buildChips(schedule, perfectSubscores, basePrefs);
    expect(chips.some((c) => c.label === "Fri free")).toBe(true);
  });

  it("names multiple days off together", () => {
    const schedule = makeSchedule({ daysOff: ["T", "R"] });
    const chips = buildChips(schedule, perfectSubscores, basePrefs);
    expect(chips.some((c) => c.label === "Tue, Thu free")).toBe(true);
  });

  it("describes tight gaps in tight mode", () => {
    const chips = buildChips(makeSchedule({ daysOff: [] }), perfectSubscores, {
      ...basePrefs,
      gapMode: "tight",
    });
    expect(chips.some((c) => c.label === "Short gaps between classes")).toBe(true);
  });

  it("describes a midday break in lunch mode", () => {
    const chips = buildChips(makeSchedule({ daysOff: [] }), perfectSubscores, {
      ...basePrefs,
      gapMode: "lunch",
    });
    expect(chips.some((c) => c.label === "Midday break most days")).toBe(true);
  });

  it("raises a caution for waitlisted sections", () => {
    const schedule = makeScheduleWithStatuses(["Open", "Waitlisted"]);
    const chips = buildChips(schedule, { ...perfectSubscores, availability: 0.75 }, basePrefs);
    const caution = chips.find((c) => c.label === "1 waitlisted");
    expect(caution?.tone).toBe("caution");
  });

  it("raises a caution for closed sections", () => {
    const schedule = makeScheduleWithStatuses(["Open", "Closed", "Closed"]);
    const chips = buildChips(schedule, { ...perfectSubscores, availability: 0.33 }, basePrefs);
    expect(chips.some((c) => c.label === "2 closed" && c.tone === "caution")).toBe(true);
  });

  it("returns at most four chips and puts cautions last", () => {
    const schedule = makeSchedule({
      earliestStart: "10:00",
      daysOff: ["T", "R"],
      groups: [{ sections: [{ status: "Closed", blocks: [] }] }],
    } as unknown as Partial<GeneratedSchedule>);
    const chips = buildChips(schedule, { ...perfectSubscores, availability: 0 }, {
      ...basePrefs,
      gapMode: "lunch",
    });
    expect(chips.length).toBeLessThanOrEqual(4);
    expect(chips[chips.length - 1].tone).toBe("caution");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `buildChips` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/lib/scheduleRanking.ts`:

```ts
/** A subscore at or above this reads as a genuine strength worth stating. */
const CHIP_STRENGTH_THRESHOLD = 0.8;
const MAX_CHIPS = 4;

const DAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

export interface ExplanationChip {
  label: string;
  tone: "positive" | "caution";
}

/**
 * Turns subscores into plain statements of why a schedule ranked where it did.
 * A bare score is not trustworthy; a justified score is.
 */
export function buildChips(
  schedule: GeneratedSchedule,
  subscores: Subscores,
  prefs: RankingPreferences,
): ExplanationChip[] {
  const positive: ExplanationChip[] = [];
  const cautions: ExplanationChip[] = [];

  if (subscores.start >= CHIP_STRENGTH_THRESHOLD && !isFullyAsync(schedule)) {
    positive.push({ label: `No classes before ${schedule.earliestStart}`, tone: "positive" });
  }

  if (schedule.daysOff.length > 0) {
    const labels = schedule.daysOff.map((day) => DAY_LABELS[day] ?? day).join(", ");
    positive.push({ label: `${labels} free`, tone: "positive" });
  }

  if (subscores.gaps >= CHIP_STRENGTH_THRESHOLD) {
    if (prefs.gapMode === "tight") {
      positive.push({ label: "Short gaps between classes", tone: "positive" });
    } else if (prefs.gapMode === "lunch") {
      positive.push({ label: "Midday break most days", tone: "positive" });
    }
  }

  if (subscores.availability < 1) {
    const sections = collectSections(schedule);
    const waitlisted = sections.filter((s) => s.status === "Waitlisted").length;
    const closed = sections.filter((s) => s.status === "Closed").length;
    if (waitlisted > 0) cautions.push({ label: `${waitlisted} waitlisted`, tone: "caution" });
    if (closed > 0) cautions.push({ label: `${closed} closed`, tone: "caution" });
  }

  return [...positive, ...cautions].slice(0, MAX_CHIPS);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

Note: the final test asserts cautions come last. Because positives are collected first and cautions appended, a schedule with more than four total chips truncates positives out only after cautions would be dropped. If that test fails, the fix is to slice positives to `MAX_CHIPS - cautions.length` before concatenating; apply that fix rather than reordering.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/scheduleRanking.ts frontend/src/lib/scheduleRanking.test.ts
git commit -m "Add explanation chips for schedule rankings"
```

---

### Task 5: Presets and default preferences

**Files:**
- Modify: `frontend/src/lib/scheduleRanking.ts`
- Test: `frontend/src/lib/scheduleRanking.test.ts`

**Interfaces:**
- Consumes: `RankingPreferences`
- Produces: `PresetName`, `PRESETS: Record<PresetName, RankingPreferences>`, `PRESET_LABELS: Record<PresetName, string>`, `DEFAULT_PREFERENCES`, `matchPreset(prefs: RankingPreferences): PresetName | null`

- [ ] **Step 1: Write the failing test**

Append to the test file, extending the import to include `PRESETS`, `DEFAULT_PREFERENCES`, and `matchPreset`:

```ts
describe("presets", () => {
  it("defines the three presets from the spec", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(["balanced", "compactWeek", "sleepIn"]);
  });

  it("sets Sleep In to a 10:00 threshold with no gap preference", () => {
    expect(PRESETS.sleepIn.startThresholdMinutes).toBe(600);
    expect(PRESETS.sleepIn.gapMode).toBe("none");
    expect(PRESETS.sleepIn.weights.start).toBe(0.5);
  });

  it("sets Compact Week to weight days most heavily with tight gaps", () => {
    expect(PRESETS.compactWeek.gapMode).toBe("tight");
    expect(PRESETS.compactWeek.weights.days).toBe(0.5);
    expect(PRESETS.compactWeek.startThresholdMinutes).toBe(480);
  });

  it("sets Balanced to even weights protecting a lunch break", () => {
    expect(PRESETS.balanced.gapMode).toBe("lunch");
    expect(PRESETS.balanced.startThresholdMinutes).toBe(540);
    expect(PRESETS.balanced.weights).toEqual({
      start: 0.25,
      days: 0.25,
      gaps: 0.25,
      availability: 0.25,
    });
  });

  it("defaults to Balanced", () => {
    expect(DEFAULT_PREFERENCES).toEqual(PRESETS.balanced);
  });
});

describe("matchPreset", () => {
  it("identifies preferences equal to a preset", () => {
    expect(matchPreset(PRESETS.sleepIn)).toBe("sleepIn");
    expect(matchPreset(PRESETS.balanced)).toBe("balanced");
  });

  it("returns null for customized preferences", () => {
    expect(matchPreset({ ...PRESETS.balanced, startThresholdMinutes: 660 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `PRESETS` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/lib/scheduleRanking.ts`:

```ts
export type PresetName = "sleepIn" | "compactWeek" | "balanced";

export const PRESETS: Record<PresetName, RankingPreferences> = {
  sleepIn: {
    startThresholdMinutes: 10 * 60,
    gapMode: "none",
    weights: { start: 0.5, days: 0.15, gaps: 0, availability: 0.35 },
  },
  compactWeek: {
    startThresholdMinutes: 8 * 60,
    gapMode: "tight",
    weights: { start: 0.1, days: 0.5, gaps: 0.2, availability: 0.2 },
  },
  balanced: {
    startThresholdMinutes: 9 * 60,
    gapMode: "lunch",
    weights: { start: 0.25, days: 0.25, gaps: 0.25, availability: 0.25 },
  },
};

export const PRESET_LABELS: Record<PresetName, string> = {
  sleepIn: "Sleep In",
  compactWeek: "Compact Week",
  balanced: "Balanced",
};

export const DEFAULT_PREFERENCES: RankingPreferences = PRESETS.balanced;

/** Returns the preset these preferences exactly match, or null if customized. */
export function matchPreset(prefs: RankingPreferences): PresetName | null {
  const names = Object.keys(PRESETS) as PresetName[];
  return (
    names.find((name) => {
      const preset = PRESETS[name];
      return (
        preset.startThresholdMinutes === prefs.startThresholdMinutes &&
        preset.gapMode === prefs.gapMode &&
        preset.weights.start === prefs.weights.start &&
        preset.weights.days === prefs.weights.days &&
        preset.weights.gaps === prefs.weights.gaps &&
        preset.weights.availability === prefs.weights.availability
      );
    }) ?? null
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/scheduleRanking.ts frontend/src/lib/scheduleRanking.test.ts
git commit -m "Add ranking presets and default preferences"
```

---

### Task 6: useScheduleRanking hook

**Files:**
- Create: `frontend/src/hooks/useScheduleRanking.ts`

**Interfaces:**
- Consumes: `rankSchedules`, `buildChips`, `ScoredSchedule`, `ExplanationChip`, `RankingPreferences`
- Produces: `RankedSchedule` (a `ScoredSchedule` plus `chips` and `rank`), `useScheduleRanking(schedules, prefs): RankedSchedule[]`

- [ ] **Step 1: Write the implementation**

```ts
import { useMemo } from "react";
import type { GeneratedSchedule } from "@/lib/api";
import {
  buildChips,
  rankSchedules,
  type ExplanationChip,
  type RankingPreferences,
  type ScoredSchedule,
} from "@/lib/scheduleRanking";

export interface RankedSchedule extends ScoredSchedule {
  /** One-based position in the ranked list. */
  rank: number;
  chips: ExplanationChip[];
}

/**
 * Ranks the fetched combinations. Recomputes only when the schedules or the
 * preferences change, so moving a preference slider costs no network call.
 */
export function useScheduleRanking(
  schedules: GeneratedSchedule[],
  prefs: RankingPreferences,
): RankedSchedule[] {
  return useMemo(
    () =>
      rankSchedules(schedules, prefs).map((scored, index) => ({
        ...scored,
        rank: index + 1,
        chips: buildChips(scored.schedule, scored.subscores, prefs),
      })),
    [schedules, prefs],
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useScheduleRanking.ts
git commit -m "Add useScheduleRanking hook"
```

---

### Task 7: WeeklyCalendar dynamic hour bounds

**Files:**
- Modify: `frontend/src/components/schedule/WeeklyCalendar.tsx`

**Interfaces:**
- Consumes: `Section` from `@/lib/api`
- Produces: `WeeklyCalendar` with unchanged props (`{ sections: Section[] }`), plus exported `getVisibleHourRange(sections: Section[]): { startHour: number; endHour: number }`

- [ ] **Step 1: Replace the fixed hour constants**

In `WeeklyCalendar.tsx`, delete these three lines:

```ts
const startHour = 8; // 8 AM
const endHour = 18; // 6 PM
const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
```

Replace with:

```ts
/** Hard bounds so a stray record cannot render a 24-hour grid. */
const MIN_HOUR = 6;
const MAX_HOUR = 23;
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

/**
 * Bounds the grid to the sections actually present, with one hour of padding.
 * The old fixed 8:00-18:00 window silently hid evening classes.
 */
export function getVisibleHourRange(sections: Section[]): {
  startHour: number;
  endHour: number;
} {
  const times = sections.flatMap((section) =>
    section.meetingTimes.flatMap((meeting) => [
      timeToMinutes(meeting.startTime),
      timeToMinutes(meeting.endTime),
    ]),
  );

  if (times.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  const earliest = Math.floor(Math.min(...times) / 60) - 1;
  const latest = Math.ceil(Math.max(...times) / 60) + 1;

  return {
    startHour: Math.max(MIN_HOUR, earliest),
    endHour: Math.min(MAX_HOUR, latest),
  };
}
```

- [ ] **Step 2: Make `placeBlocks` take the start hour**

Change the `placeBlocks` signature and its first line from:

```ts
function placeBlocks(sections: Section[]): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  const gridStartMinutes = startHour * 60;
```

to:

```ts
function placeBlocks(sections: Section[], startHour: number): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  const gridStartMinutes = startHour * 60;
```

- [ ] **Step 3: Compute the range inside the component**

Replace the first two lines of the `WeeklyCalendar` function body:

```ts
  const blocks = placeBlocks(sections);
  const rowCount = (endHour - startHour) * 2;
```

with:

```ts
  const { startHour, endHour } = getVisibleHourRange(sections);
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const blocks = placeBlocks(sections, startHour);
  const rowCount = (endHour - startHour) * 2;
```

- [ ] **Step 4: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint shows no more than the 25 baseline problems.

- [ ] **Step 5: Manual check**

Run `npm run dev`, open the Schedule Builder, and generate a schedule containing a section that meets after 18:00. Confirm the block renders inside the grid rather than being clipped.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/schedule/WeeklyCalendar.tsx
git commit -m "Bound weekly calendar hours to the sections present"
```

---

### Task 8: AsyncSectionTray

**Files:**
- Create: `frontend/src/components/schedule/AsyncSectionTray.tsx`

**Interfaces:**
- Consumes: `Section` from `@/lib/api`
- Produces: `isAsyncSection(section: Section): boolean`, `AsyncSectionTray({ sections }: { sections: Section[] })`

- [ ] **Step 1: Write the implementation**

```tsx
import type { Section } from "@/lib/api";

/**
 * A section with no scheduled meeting on any weekday. These have no place on
 * the grid and were previously dropped from the page entirely.
 */
export function isAsyncSection(section: Section): boolean {
  return section.meetingTimes.every((meeting) => meeting.weekDays.length === 0);
}

interface AsyncSectionTrayProps {
  sections: Section[];
}

export function AsyncSectionTray({ sections }: AsyncSectionTrayProps) {
  const asyncSections = sections.filter(isAsyncSection);
  if (asyncSections.length === 0) return null;

  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Online / asynchronous
      </h3>
      <p className="mt-1 text-xs text-gray-400">
        These sections have no fixed meeting time and do not appear on the grid.
      </p>
      <ul className="mt-2 space-y-1">
        {asyncSections.map((section) => (
          <li key={section._id} className="text-sm text-gray-700">
            <span className="font-semibold text-blue-600">
              {section.subject} {section.courseNumber}
            </span>{" "}
            {section.scheduleType.code} {section.sectionNumber} - {section.instructor}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/AsyncSectionTray.tsx
git commit -m "Add asynchronous section tray"
```

---

### Task 9: SchedulePreferences

**Files:**
- Create: `frontend/src/components/schedule/SchedulePreferences.tsx`

**Interfaces:**
- Consumes: `RankingPreferences`, `GapMode`, `PresetName`, `PRESETS`, `PRESET_LABELS`, `matchPreset`
- Produces: `SchedulePreferences({ preferences, onChange })` where `onChange: (next: RankingPreferences) => void`

Note: the exported component name `SchedulePreferences` intentionally differs from the type `RankingPreferences` to avoid a collision.

- [ ] **Step 1: Write the implementation**

```tsx
import { Button } from "@/components/ui/button";
import {
  PRESETS,
  PRESET_LABELS,
  matchPreset,
  type GapMode,
  type PresetName,
  type RankingPreferences,
} from "@/lib/scheduleRanking";

const START_OPTIONS = [
  { minutes: 8 * 60, label: "8:00 AM" },
  { minutes: 9 * 60, label: "9:00 AM" },
  { minutes: 10 * 60, label: "10:00 AM" },
  { minutes: 11 * 60, label: "11:00 AM" },
  { minutes: 12 * 60, label: "12:00 PM" },
];

const GAP_OPTIONS: { value: GapMode; label: string }[] = [
  { value: "tight", label: "Keep them short" },
  { value: "lunch", label: "Protect a lunch break" },
  { value: "none", label: "No preference" },
];

interface SchedulePreferencesProps {
  preferences: RankingPreferences;
  onChange: (next: RankingPreferences) => void;
}

export function SchedulePreferences({ preferences, onChange }: SchedulePreferencesProps) {
  const activePreset = matchPreset(preferences);
  const presetNames = Object.keys(PRESETS) as PresetName[];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Preferences</h2>
        <p className="mt-1 text-xs text-gray-400">
          Reorders results instantly. Nothing is ever hidden.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {presetNames.map((name) => (
          <Button
            key={name}
            size="sm"
            variant={activePreset === name ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onChange(PRESETS[name])}
          >
            {PRESET_LABELS[name]}
          </Button>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <span className="text-xs font-semibold text-gray-400">
          {activePreset ? "Adjust to customize" : "Custom"}
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Start no earlier than</label>
        <div className="flex flex-wrap gap-1">
          {START_OPTIONS.map((option) => (
            <Button
              key={option.minutes}
              size="sm"
              variant={preferences.startThresholdMinutes === option.minutes ? "secondary" : "ghost"}
              className="h-7 cursor-pointer px-2 text-xs"
              onClick={() => onChange({ ...preferences, startThresholdMinutes: option.minutes })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">
          Fewer days on campus matters
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={preferences.weights.days}
          onChange={(e) =>
            onChange({
              ...preferences,
              weights: { ...preferences.weights, days: Number(e.target.value) },
            })
          }
          className="w-full cursor-pointer"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Between classes</label>
        <div className="space-y-1">
          {GAP_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="gap-mode"
                checked={preferences.gapMode === option.value}
                onChange={() => onChange({ ...preferences, gapMode: option.value })}
                className="cursor-pointer"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-gray-600">Open sections matter</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={preferences.weights.availability}
          onChange={(e) =>
            onChange({
              ...preferences,
              weights: { ...preferences.weights, availability: Number(e.target.value) },
            })
          }
          className="w-full cursor-pointer"
        />
        <p className="text-xs text-gray-400">
          Raising this sinks schedules with closed sections. It never removes them.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/SchedulePreferences.tsx
git commit -m "Add schedule preference controls with presets"
```

---

### Task 10: CoursePickerRail

**Files:**
- Create: `frontend/src/components/schedule/CoursePickerRail.tsx`

**Interfaces:**
- Consumes: `CourseInfo` from `@/lib/api`, `CourseSearchPanel` from `@/components/search/CourseSearchPanel`
- Produces: `CoursePickerRail({ selectedCourses, onAddCourse, onRemoveCourse })`

- [ ] **Step 1: Write the implementation**

`CourseSearchPanel` already renders a cart, a search form, results, and a Generate button. Generation is automatic now, so the rail renders chips itself and reveals the existing panel only while adding.

```tsx
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import type { CourseInfo } from "@/lib/api";

interface CoursePickerRailProps {
  selectedCourses: CourseInfo[];
  onAddCourse: (course: CourseInfo) => void;
  onRemoveCourse: (courseId: string) => void;
}

export function CoursePickerRail({
  selectedCourses,
  onAddCourse,
  onRemoveCourse,
}: CoursePickerRailProps) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Courses</h2>

      {selectedCourses.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedCourses.map((course) => (
            <Badge key={course._id} variant="secondary" className="gap-1 py-1 pl-2 pr-1">
              <span>
                {course.subject} {course.courseNumber}
              </span>
              <button
                onClick={() => onRemoveCourse(course._id)}
                aria-label={`Remove ${course.subject} ${course.courseNumber}`}
                className="rounded-full p-0.5 text-gray-400 transition hover:bg-gray-200 hover:text-gray-900"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No courses yet. Add one to see schedules.</p>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full cursor-pointer gap-1.5"
        onClick={() => setIsAdding((open) => !open)}
      >
        <Plus className="h-3.5 w-3.5" />
        {isAdding ? "Done adding" : "Add course"}
      </Button>

      {isAdding && (
        <div className="-mx-4 border-y border-gray-200">
          <CourseSearchPanel
            selectedCourses={selectedCourses}
            onAddCourse={onAddCourse}
            onRemoveCourse={onRemoveCourse}
            onGenerate={() => setIsAdding(false)}
            isGenerating={false}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/CoursePickerRail.tsx
git commit -m "Add course picker rail"
```

---

### Task 11: RankedResultHeader

**Files:**
- Create: `frontend/src/components/schedule/RankedResultHeader.tsx`

**Interfaces:**
- Consumes: `RankedSchedule` from `@/hooks/useScheduleRanking`
- Produces: `RankedResultHeader({ result, position, total, onPrevious, onNext })`

- [ ] **Step 1: Write the implementation**

Arrow keys move between results, so the student can flip through options without reaching for the mouse. The listener is skipped while focus is in a form control.

```tsx
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RankedSchedule } from "@/hooks/useScheduleRanking";

interface RankedResultHeaderProps {
  result: RankedSchedule;
  position: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function RankedResultHeader({
  result,
  position,
  total,
  onPrevious,
  onNext,
}: RankedResultHeaderProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPrevious, onNext]);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">
            {position === 1 ? "Best match" : `Option ${position}`}
          </h2>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-700">
            {result.score}
          </span>
          <span className="text-sm text-gray-500">{result.schedule.totalUnits} units</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {result.chips.map((chip) => (
            <span
              key={chip.label}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                chip.tone === "caution"
                  ? "bg-amber-50 text-amber-800"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 cursor-pointer"
          aria-label="Previous schedule"
          disabled={position <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm tabular-nums text-gray-600">
          {position} of {total}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 cursor-pointer"
          aria-label="Next schedule"
          disabled={position >= total}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/RankedResultHeader.tsx
git commit -m "Add ranked result header with pager"
```

---

### Task 12: AlternativesStrip

**Files:**
- Create: `frontend/src/components/schedule/AlternativesStrip.tsx`

**Interfaces:**
- Consumes: `RankedSchedule`
- Produces: `AlternativesStrip({ results, selectedIndex, onSelect })` where indices are positions in the ranked array

- [ ] **Step 1: Write the implementation**

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RankedSchedule } from "@/hooks/useScheduleRanking";

/** Cards rendered before the "show more" control. The pager still reaches all results. */
const VISIBLE_LIMIT = 20;

interface AlternativesStripProps {
  results: RankedSchedule[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function AlternativesStrip({ results, selectedIndex, onSelect }: AlternativesStripProps) {
  const [expanded, setExpanded] = useState(false);
  if (results.length <= 1) return null;

  const visible = expanded ? results : results.slice(0, VISIBLE_LIMIT);
  const hidden = results.length - visible.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Alternatives</h3>
        {hidden > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 cursor-pointer text-xs"
            onClick={() => setExpanded(true)}
          >
            Show {hidden} more
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {visible.map((result, index) => (
          <button
            key={result.originalIndex}
            onClick={() => onSelect(index)}
            className={`min-w-[140px] flex-shrink-0 rounded-lg border p-2.5 text-left transition ${
              index === selectedIndex
                ? "border-blue-600 bg-blue-50/40"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">#{result.rank}</span>
              <span className="text-sm font-bold text-blue-700">{result.score}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {result.schedule.activeDays.length} days - {result.schedule.totalUnits} units
            </div>
            <div className="text-xs text-gray-400">
              {result.schedule.earliestStart} to {result.schedule.latestEnd}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/AlternativesStrip.tsx
git commit -m "Add ranked alternatives strip"
```

---

### Task 13: ScheduleSectionTable

**Files:**
- Create: `frontend/src/components/schedule/ScheduleSectionTable.tsx`

**Interfaces:**
- Consumes: `Section` from `@/lib/api`
- Produces: `ScheduleSectionTable({ sections, pinnedSections, onTogglePin })`

- [ ] **Step 1: Write the implementation**

This replaces `SectionControlList`. "Lock" becomes "Pin" and moves onto the row it constrains, and the row now carries the CRN, status, and enrollment the student needs to register.

```tsx
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/api";

const DAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

function formatMeeting(section: Section): string {
  const meeting = section.meetingTimes[0];
  if (!meeting || meeting.weekDays.length === 0) return "Asynchronous";
  const days = meeting.weekDays.map((day) => DAY_LABELS[day] ?? day).join("/");
  return `${days} ${meeting.startTime} - ${meeting.endTime}`;
}

function statusClasses(status: Section["status"]): string {
  if (status === "Open") return "bg-green-50 text-green-700";
  if (status === "Waitlisted") return "bg-amber-50 text-amber-800";
  return "bg-red-50 text-red-700";
}

interface ScheduleSectionTableProps {
  sections: Section[];
  pinnedSections: Section[];
  onTogglePin: (section: Section) => void;
}

export function ScheduleSectionTable({
  sections,
  pinnedSections,
  onTogglePin,
}: ScheduleSectionTableProps) {
  if (sections.length === 0) {
    return <p className="text-sm text-gray-400">No sections to show yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Course</th>
            <th className="px-3 py-2 font-semibold">CRN</th>
            <th className="px-3 py-2 font-semibold">Meets</th>
            <th className="px-3 py-2 font-semibold">Instructor</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Pin</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => {
            const isPinned = pinnedSections.some((pinned) => pinned._id === section._id);
            return (
              <tr key={section._id} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <div className="font-semibold text-gray-900">
                    {section.subject} {section.courseNumber}
                  </div>
                  <div className="text-xs text-gray-400">
                    {section.scheduleType.code} {section.sectionNumber}
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{section.crn}</td>
                <td className="px-3 py-2 text-gray-700">{formatMeeting(section)}</td>
                <td className="px-3 py-2 text-gray-600">{section.instructor}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses(section.status)}`}
                  >
                    {section.status}
                  </span>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {section.enrollmentCurrent}/{section.enrollmentMax}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={isPinned ? "Unpin section" : "Pin section"}
                    className="h-7 w-7 cursor-pointer"
                    onClick={() => onTogglePin(section)}
                  >
                    {isPinned ? (
                      <Pin className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/ScheduleSectionTable.tsx
git commit -m "Add schedule section table with CRN, status, and pinning"
```

---

### Task 14: ScheduleActionBar

**Files:**
- Create: `frontend/src/components/schedule/ScheduleActionBar.tsx`

**Interfaces:**
- Consumes: `Section` from `@/lib/api`
- Produces: `ScheduleActionBar({ sections, isSignedIn, saveName, isSaving, onSaveNameChange, onSave })`

- [ ] **Step 1: Write the implementation**

```tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Section } from "@/lib/api";

interface ScheduleActionBarProps {
  sections: Section[];
  isSignedIn: boolean;
  saveName: string;
  isSaving: boolean;
  onSaveNameChange: (value: string) => void;
  onSave: (e: React.FormEvent) => void;
}

export function ScheduleActionBar({
  sections,
  isSignedIn,
  saveName,
  isSaving,
  onSaveNameChange,
  onSave,
}: ScheduleActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const crns = sections.map((section) => section.crn).join(", ");
    try {
      await navigator.clipboard.writeText(crns);
    } catch {
      // Clipboard access can be denied or unavailable outside a secure context.
      window.prompt("Copy these CRNs", crns);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
      <Button variant="outline" className="cursor-pointer gap-1.5" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy CRNs"}
      </Button>

      {isSignedIn ? (
        <form onSubmit={onSave} className="flex items-center gap-2">
          <Input
            required
            type="text"
            placeholder="Plan name"
            className="w-[200px]"
            value={saveName}
            onChange={(e) => onSaveNameChange(e.target.value)}
          />
          <Button type="submit" disabled={isSaving} className="cursor-pointer">
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
          <span className="text-xs font-medium text-gray-500">Sign in to save:</span>
          <Link to="/settings">
            <Button size="sm" variant="outline" className="h-7 cursor-pointer px-2.5 text-xs">
              Sign In
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/ScheduleActionBar.tsx
git commit -m "Add schedule action bar with CRN copy"
```

---

### Task 15: NoResultsPanel

**Files:**
- Create: `frontend/src/components/schedule/NoResultsPanel.tsx`

**Interfaces:**
- Consumes: `GeneratedSchedule`, `Section` from `@/lib/api`, `collectSections` from `@/lib/scheduleRanking`
- Produces: `NoResultsPanel({ nearMisses, isLoading })`

- [ ] **Step 1: Write the implementation**

Zero results is the tool's worst moment. Rather than reporting "0 combinations", show the near-misses the existing `/generate/invalid` endpoint returns and name the courses involved.

```tsx
import { AlertCircle } from "lucide-react";
import type { GeneratedSchedule } from "@/lib/api";

interface NoResultsPanelProps {
  nearMisses: GeneratedSchedule[];
  isLoading: boolean;
}

export function NoResultsPanel({ nearMisses, isLoading }: NoResultsPanelProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold text-amber-900">
              No conflict-free schedule for these courses
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Every combination of the sections offered this term has at least one time
              collision.
            </p>
          </div>

          {isLoading && <p className="text-sm text-amber-700">Checking closest options...</p>}

          {!isLoading && nearMisses.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-900">
                Closest options, if you can drop one course
              </h3>
              <ul className="space-y-1.5">
                {nearMisses.slice(0, 3).map((miss, index) => (
                  <li key={index} className="rounded-md bg-white/70 p-2 text-sm text-amber-900">
                    {miss.groups.map((group) => `${group.subject} ${group.courseNumber}`).join(", ")}
                    <span className="text-amber-700"> - {miss.totalUnits} units</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isLoading && nearMisses.length === 0 && (
            <p className="text-sm text-amber-800">
              Try removing a course, or check the Course Catalog for other sections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES; lint at or below baseline.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/schedule/NoResultsPanel.tsx
git commit -m "Add near-miss panel for zero-result schedules"
```

---

### Task 16: Rewrite ScheduleBuilder as a phase-aware page

**Files:**
- Modify: `frontend/src/pages/ScheduleBuilder.tsx` (full rewrite)

**Interfaces:**
- Consumes: every component from Tasks 6-15
- Produces: the assembled page

- [ ] **Step 1: Replace the file contents**

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTerm } from "@/context/TermContext";
import { api, type CourseInfo, type GeneratedSchedule, type Section } from "@/lib/api";
import { DEFAULT_PREFERENCES, type RankingPreferences } from "@/lib/scheduleRanking";
import { useScheduleRanking } from "@/hooks/useScheduleRanking";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { AsyncSectionTray } from "@/components/schedule/AsyncSectionTray";
import { SchedulePreferences } from "@/components/schedule/SchedulePreferences";
import { CoursePickerRail } from "@/components/schedule/CoursePickerRail";
import { RankedResultHeader } from "@/components/schedule/RankedResultHeader";
import { AlternativesStrip } from "@/components/schedule/AlternativesStrip";
import { ScheduleSectionTable } from "@/components/schedule/ScheduleSectionTable";
import { ScheduleActionBar } from "@/components/schedule/ScheduleActionBar";
import { NoResultsPanel } from "@/components/schedule/NoResultsPanel";
import { SaveStatusBanner } from "@/components/schedule/SaveStatusBanner";

/** Wait this long after a course or pin change before regenerating. */
const GENERATE_DEBOUNCE_MS = 400;

export default function ScheduleBuilder() {
  const { user } = useAuth();
  const { term: termCode } = useTerm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCourses, setSelectedCourses] = useState<CourseInfo[]>([]);
  const [pinnedSections, setPinnedSections] = useState<Section[]>([]);
  const [combinations, setCombinations] = useState<GeneratedSchedule[]>([]);
  const [nearMisses, setNearMisses] = useState<GeneratedSchedule[]>([]);
  const [preferences, setPreferences] = useState<RankingPreferences>(DEFAULT_PREFERENCES);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");

  /** Guards against a slow earlier response overwriting a newer one. */
  const requestIdRef = useRef(0);

  const ranked = useScheduleRanking(combinations, preferences);
  const current = ranked[selectedIndex];
  const currentSections = current
    ? current.schedule.groups.flatMap((group) => group.sections)
    : pinnedSections;

  useEffect(() => {
    const addCourseId = searchParams.get("addCourseId");
    if (!addCourseId) return;
    const loadAndAdd = async () => {
      try {
        const course = await api.getCourseDetails(addCourseId);
        setSelectedCourses((prev) =>
          prev.some((c) => c._id === course._id) ? prev : [...prev, course],
        );
      } catch (err) {
        console.error("Failed adding course from query param:", err);
      }
    };
    loadAndAdd();
    searchParams.delete("addCourseId");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const generate = useCallback(async () => {
    if (selectedCourses.length === 0) {
      setCombinations([]);
      setNearMisses([]);
      setHasGenerated(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsGenerating(true);
    setSaveSuccess("");
    setSaveError("");

    const body = {
      courseIds: selectedCourses.map((c) => c._id),
      termCode,
      lockedSectionIds: pinnedSections.map((s) => s._id),
    };

    try {
      const res = await api.generateSchedules(body);
      if (requestId !== requestIdRef.current) return;

      const schedules = res.schedules || [];
      setCombinations(schedules);
      setSelectedIndex(0);
      setHasGenerated(true);

      if (schedules.length === 0) {
        const nearRes = await api.generateNearMissSchedules(body);
        if (requestId !== requestIdRef.current) return;
        setNearMisses(nearRes.schedules || []);
      } else {
        setNearMisses([]);
      }
    } catch (err) {
      console.error("Combinations generation failed:", err);
      if (requestId === requestIdRef.current) {
        setCombinations([]);
        setHasGenerated(true);
      }
    } finally {
      if (requestId === requestIdRef.current) setIsGenerating(false);
    }
  }, [selectedCourses, termCode, pinnedSections]);

  useEffect(() => {
    const timer = window.setTimeout(generate, GENERATE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [generate]);

  useEffect(() => {
    setSelectedCourses([]);
    setPinnedSections([]);
    setCombinations([]);
    setNearMisses([]);
    setSelectedIndex(0);
    setHasGenerated(false);
    setSaveSuccess("");
    setSaveError("");
  }, [termCode]);

  const handleAddCourse = (course: CourseInfo) => {
    setSelectedCourses((prev) =>
      prev.some((c) => c._id === course._id) ? prev : [...prev, course],
    );
  };

  const handleRemoveCourse = (courseId: string) => {
    setSelectedCourses((prev) => prev.filter((c) => c._id !== courseId));
    setPinnedSections((prev) => prev.filter((s) => s.courseId._id !== courseId));
  };

  const handleTogglePin = (section: Section) => {
    setPinnedSections((prev) => {
      if (prev.some((s) => s._id === section._id)) {
        return prev.filter((s) => s._id !== section._id);
      }
      // One pin per course component: pinning a second lecture replaces the first.
      const cleaned = prev.filter(
        (s) =>
          !(
            s.courseId._id === section.courseId._id &&
            s.scheduleType.code === section.scheduleType.code
          ),
      );
      return [...cleaned, section];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setIsSaving(true);
    setSaveSuccess("");
    setSaveError("");
    try {
      await api.createSchedule({
        name: saveName.trim() || "My Target Schedule",
        termCode,
        sectionIds: currentSections.map((s) => s._id),
      });
      setSaveSuccess("Schedule saved successfully!");
      setSaveName("");
    } catch (err: any) {
      setSaveError(err.message || "Failed saving schedule configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  const activeTermLabel = termCode === "202620" ? "Spring 2026" : "Fall 2025";

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-6 overflow-y-auto border-r border-gray-200 bg-white p-4">
        <CoursePickerRail
          selectedCourses={selectedCourses}
          onAddCourse={handleAddCourse}
          onRemoveCourse={handleRemoveCourse}
        />
        {selectedCourses.length > 0 && (
          <div className="border-t border-gray-100 pt-4">
            <SchedulePreferences preferences={preferences} onChange={setPreferences} />
          </div>
        )}
      </aside>

      <main className="space-y-5 overflow-y-auto p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Schedule Builder</h1>
          <p className="text-sm text-gray-500">Ranked schedules for {activeTermLabel}.</p>
        </div>

        <SaveStatusBanner success={saveSuccess} error={saveError} />

        {selectedCourses.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
            <h2 className="font-semibold text-gray-900">Add courses to get started</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Pick the courses you need this term. Every conflict-free schedule is generated and
              ranked against your preferences.
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="space-y-3">
            <div className="h-6 w-56 animate-pulse rounded bg-gray-100" />
            <div className="h-[420px] animate-pulse rounded-lg bg-gray-100" />
          </div>
        )}

        {!isGenerating && hasGenerated && combinations.length === 0 && (
          <NoResultsPanel nearMisses={nearMisses} isLoading={false} />
        )}

        {!isGenerating && current && (
          <>
            <RankedResultHeader
              result={current}
              position={selectedIndex + 1}
              total={ranked.length}
              onPrevious={() => setSelectedIndex((i) => Math.max(0, i - 1))}
              onNext={() => setSelectedIndex((i) => Math.min(ranked.length - 1, i + 1))}
            />

            <WeeklyCalendar sections={currentSections} />
            <AsyncSectionTray sections={currentSections} />

            <AlternativesStrip
              results={ranked}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
            />

            <ScheduleSectionTable
              sections={currentSections}
              pinnedSections={pinnedSections}
              onTogglePin={handleTogglePin}
            />

            <ScheduleActionBar
              sections={currentSections}
              isSignedIn={!!user}
              saveName={saveName}
              isSaving={isSaving}
              onSaveNameChange={setSaveName}
              onSave={handleSave}
            />
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: build PASSES. Lint may now report one additional `set-state-in-effect` warning from the term-reset effect, which is carried over from the original file. It must not exceed 26 problems; if it does, an unrelated new issue was introduced.

- [ ] **Step 3: Manual check**

Run `npm run dev` and confirm each state:
1. With no courses, the empty prompt shows and no request fires.
2. Adding a course auto-generates after a brief pause, with no Generate button anywhere.
3. Switching presets reorders the alternatives strip instantly and with no network request (check the Network tab).
4. Left and right arrow keys move between results; typing in the plan name field does not.
5. "Copy CRNs" places a comma-separated list on the clipboard.
6. Pinning a section regenerates and constrains the results.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ScheduleBuilder.tsx
git commit -m "Rewrite Schedule Builder as a ranked, phase-aware page"
```

---

### Task 17: Remove retired components and verify

**Files:**
- Delete: `frontend/src/components/schedule/StatusBanner.tsx`
- Delete: `frontend/src/components/schedule/CombinationsList.tsx`
- Delete: `frontend/src/components/schedule/CombinationCard.tsx`
- Delete: `frontend/src/components/schedule/SectionControlList.tsx`

- [ ] **Step 1: Confirm nothing still imports them**

```bash
grep -rn "StatusBanner\|CombinationsList\|CombinationCard\|SectionControlList" frontend/src
```

Expected: no matches. `SaveStatusBanner` is a different component and must survive; if the grep matches it, that is the substring `StatusBanner` inside `SaveStatusBanner` and is fine. Any other match must be resolved before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm frontend/src/components/schedule/StatusBanner.tsx \
       frontend/src/components/schedule/CombinationsList.tsx \
       frontend/src/components/schedule/CombinationCard.tsx \
       frontend/src/components/schedule/SectionControlList.tsx
```

- [ ] **Step 3: Full verification**

```bash
npm test && npm run build && npm run lint
```

Expected: tests PASS; build PASSES; lint at or below 26 problems.

- [ ] **Step 4: Commit**

```bash
git commit -m "Remove components superseded by the ranked schedule builder"
```

---

## Self-Review

**Spec coverage.** Ranking model Tasks 1-5; presets Task 5; explanation chips Task 4; score presentation Tasks 11-12; no-removal invariant Task 3 test plus Task 9 copy; empty state Task 16; generating state Task 16; explore layout Task 16; zero results Task 15; single result Task 12 (the strip returns null at one result); auto-generation with debounce and stale-response guarding Task 16; calendar dynamic hours Task 7; async tray Task 8; section table with CRN and status Task 13; copy CRNs Task 14; pin rename Tasks 13 and 16; retirements Task 17; Vitest scoped to scoring Task 1.

**Type consistency.** `RankingPreferences` is the type and `SchedulePreferences` the component, named apart deliberately. `RankedSchedule` extends `ScoredSchedule` with `rank` and `chips`. `AlternativesStrip.onSelect` and `RankedResultHeader.position` both index the ranked array, and Task 16 passes `selectedIndex` and `selectedIndex + 1` correspondingly. `collectSections` is defined in Task 3 and reused in Task 4.

**Known deviation.** The spec places preferences in the rail alongside courses; Task 16 hides the preference block until at least one course is selected, since ranking controls are meaningless with nothing to rank.
