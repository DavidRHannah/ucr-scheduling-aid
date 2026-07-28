# Course Detail Slide-Over Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking a course in the Schedule Builder's search results opens a right-side slide-over showing its description, prerequisites, and every section offered in the active term, with inline pinning.

**Architecture:** `ScheduleBuilder` owns a `detailCourse` state and renders a new `CourseDetailSheet` directly, so the panel reaches the existing add/remove/pin handlers without prop drilling. The sheet reuses the catalog page's `PrerequisiteGroupList` and `SectionOfferingList`; the latter gains optional pin props so the catalog page is unaffected. Two pure helpers (`getTermLabel`, `formatMeeting`) move into `lib/` where the existing Vitest setup can test them.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, shadcn/ui (base-nova style) over base-ui, lucide-react icons, Vitest.

## Global Constraints

- Do not use emojis anywhere in code, comments, commit messages, or documentation.
- Use the `@/` path alias for all imports (e.g. `import { Button } from "@/components/ui/button"`).
- Commit messages are concise, imperative, sentence case, with no conventional-commit prefix (matching `git log`: "Add collapsible sidebar with persisted state").
- Components are organized by domain (`layout/`, `schedule/`, `search/`, `catalog/`, `saved/`), not by type.
- Do not hand-edit files in `components/ui/` beyond what the shadcn CLI generates; add new primitives via the CLI.
- All commands run from `frontend/`. Build: `npm run build`. Lint: `npm run lint`. Tests: `npm test`.
- Vitest only collects `src/**/*.test.ts` and runs in the `node` environment (per `vitest.config.ts`). There is no DOM test environment, so only pure logic in `lib/` is unit-testable. Do not add jsdom or testing-library in this plan.

---

### Task 1: Term label helper

Replaces two hardcoded term-label expressions with one lookup, and gives the sheet (Task 4) a term label to display.

**Files:**
- Create: `frontend/src/lib/terms.ts`
- Test: `frontend/src/lib/terms.test.ts`
- Modify: `frontend/src/context/TermContext.tsx` (lines 1-11)
- Modify: `frontend/src/pages/ScheduleBuilder.tsx` (line 182)
- Modify: `frontend/src/pages/CourseSearchPage.tsx` (line 133)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getTermLabel(code: string): string`, `AVAILABLE_TERMS: Term[]`, and `interface Term { value: string; label: string }`, all exported from `@/lib/terms`. Task 4 imports `getTermLabel`.

Background: `AVAILABLE_TERMS` and `Term` currently live in `TermContext.tsx` and are referenced only inside that file, so moving them is safe. Keeping them re-exported from `TermContext` preserves the existing public surface.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/terms.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/terms.test.ts`
Expected: FAIL — cannot resolve module `./terms`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/terms.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/terms.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Point TermContext at the new module**

In `frontend/src/context/TermContext.tsx`, replace lines 1-11 (the `import React...` line through the closing `];` of `AVAILABLE_TERMS`) with:

```tsx
import React, { createContext, useContext, useState } from "react";
import { AVAILABLE_TERMS, type Term } from "@/lib/terms";

export { AVAILABLE_TERMS };
export type { Term };
```

Leave the rest of the file unchanged.

- [ ] **Step 6: Replace the hardcoded label in ScheduleBuilder**

In `frontend/src/pages/ScheduleBuilder.tsx`, add to the imports:

```tsx
import { getTermLabel } from "@/lib/terms";
```

Then replace line 182:

```tsx
  const activeTermLabel = termCode === "202620" ? "Spring 2026" : "Fall 2025";
```

with:

```tsx
  const activeTermLabel = getTermLabel(termCode);
```

- [ ] **Step 7: Replace the hardcoded label in CourseSearchPage**

In `frontend/src/pages/CourseSearchPage.tsx`, add to the imports:

```tsx
import { getTermLabel } from "@/lib/terms";
```

Then replace line 133:

```tsx
        sectionTermLabel="Spring 2026"
```

with:

```tsx
        sectionTermLabel={getTermLabel(termCode)}
```

`termCode` is already in scope from `const { term: termCode } = useTerm();` at line 12.

- [ ] **Step 8: Verify the build and full test suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/terms.ts frontend/src/lib/terms.test.ts frontend/src/context/TermContext.tsx frontend/src/pages/ScheduleBuilder.tsx frontend/src/pages/CourseSearchPage.tsx
git commit -m "Replace hardcoded term labels with a shared lookup"
```

---

### Task 2: Shared meeting-time formatter

`SectionOfferingList` prints raw weekday codes (`M/W/F`) while `ScheduleSectionTable` prints `Mon/Wed/Fri` via a local map. The sheet renders meeting times, so consolidate first.

**Files:**
- Create: `frontend/src/lib/meetingTimes.ts`
- Test: `frontend/src/lib/meetingTimes.test.ts`
- Modify: `frontend/src/components/schedule/ScheduleSectionTable.tsx` (lines 1-20)
- Modify: `frontend/src/components/catalog/SectionOfferingList.tsx` (lines 1, 16-23)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `DAY_LABELS: Record<string, string>`, `formatMeetingDays(days: string[]): string`, and `formatMeeting(section: Section): string`, exported from `@/lib/meetingTimes`. Task 3 uses `formatMeetingDays`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/meetingTimes.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/meetingTimes.test.ts`
Expected: FAIL — cannot resolve module `./meetingTimes`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/lib/meetingTimes.ts`:

```ts
import type { Section } from "@/lib/api";

export const DAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

/** Turns ["M","W","F"] into "Mon/Wed/Fri". Unrecognized codes pass through. */
export function formatMeetingDays(days: string[]): string {
  return days.map((day) => DAY_LABELS[day] ?? day).join("/");
}

/**
 * One-line summary of a section's first meeting block.
 * Sections with no meeting days (online or arranged) read as "Asynchronous".
 */
export function formatMeeting(section: Section): string {
  const meeting = section.meetingTimes[0];
  if (!meeting || meeting.weekDays.length === 0) return "Asynchronous";
  return `${formatMeetingDays(meeting.weekDays)} ${meeting.startTime} - ${meeting.endTime}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/meetingTimes.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Point ScheduleSectionTable at the shared helper**

In `frontend/src/components/schedule/ScheduleSectionTable.tsx`, delete lines 5-20 (the local `DAY_LABELS` constant and the local `formatMeeting` function) and add the import so the top of the file reads:

```tsx
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/api";
import { formatMeeting } from "@/lib/meetingTimes";
```

The `statusClasses` function and everything below it stay unchanged. The existing call `formatMeeting(section)` at what was line 70 now resolves to the imported helper.

- [ ] **Step 6: Point SectionOfferingList at the shared helper**

In `frontend/src/components/catalog/SectionOfferingList.tsx`, change line 1 to:

```tsx
import type { Section } from "@/lib/api";
import { formatMeetingDays } from "@/lib/meetingTimes";
```

Then replace the meeting-times block (lines 16-23):

```tsx
      <div className="mt-1 text-sm text-gray-700">
        {section.meetingTimes.map((m, mIdx) => (
          <div key={mIdx}>
            {m.weekDays.join("/")} {m.startTime} - {m.endTime}{" "}
            {m.buildingDescription && `(${m.buildingDescription} ${m.room})`}
          </div>
        ))}
      </div>
```

with:

```tsx
      <div className="mt-1 text-sm text-gray-700">
        {section.meetingTimes.map((m, mIdx) => (
          <div key={mIdx}>
            {formatMeetingDays(m.weekDays)} {m.startTime} - {m.endTime}{" "}
            {m.buildingDescription && `(${m.buildingDescription} ${m.room})`}
          </div>
        ))}
      </div>
```

This list renders every meeting block (not just the first), so it uses `formatMeetingDays` rather than `formatMeeting`.

- [ ] **Step 7: Verify the build and full test suite**

Run: `npm run build && npm test`
Expected: build succeeds; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/meetingTimes.ts frontend/src/lib/meetingTimes.test.ts frontend/src/components/schedule/ScheduleSectionTable.tsx frontend/src/components/catalog/SectionOfferingList.tsx
git commit -m "Extract shared meeting time formatter"
```

---

### Task 3: Optional pin controls on SectionOfferingList

Gives the section list a pin toggle when the consumer supplies one. The Course Search page passes neither new prop and must render exactly as before.

**Files:**
- Modify: `frontend/src/components/catalog/SectionOfferingList.tsx`

**Interfaces:**
- Consumes: `formatMeetingDays` from `@/lib/meetingTimes` (Task 2).
- Produces: `SectionOfferingList` accepting two new optional props — `pinnedSections?: Section[]` and `onTogglePin?: (section: Section) => void`. Task 4 passes both.

- [ ] **Step 1: Add pin support to the card**

In `frontend/src/components/catalog/SectionOfferingList.tsx`, replace the imports and the whole `SectionOfferingCard` block (through its closing brace) with:

```tsx
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Section } from "@/lib/api";
import { formatMeetingDays } from "@/lib/meetingTimes";

interface SectionOfferingCardProps {
  section: Section;
  isPinned: boolean;
  onTogglePin?: (section: Section) => void;
}

function SectionOfferingCard({ section, isPinned, onTogglePin }: SectionOfferingCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-blue-600">
          {section.scheduleType.code} {section.sectionNumber}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">CRN: {section.crn}</span>
          {onTogglePin && (
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
          )}
        </div>
      </div>
      <div className="mt-1 text-sm text-gray-700">
        {section.meetingTimes.map((m, mIdx) => (
          <div key={mIdx}>
            {formatMeetingDays(m.weekDays)} {m.startTime} - {m.endTime}{" "}
            {m.buildingDescription && `(${m.buildingDescription} ${m.room})`}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>Instructor: {section.instructor}</span>
        <span
          className={`font-semibold ${
            section.status === "Open" ? "text-green-600" : "text-red-500"
          }`}
        >
          {section.status} ({section.enrollmentCurrent}/{section.enrollmentMax})
        </span>
      </div>
    </div>
  );
}
```

The pin button renders only when `onTogglePin` is supplied, so the Course Search page is visually unchanged.

- [ ] **Step 2: Thread the new props through the list**

Replace the `SectionOfferingListProps` interface and the `SectionOfferingList` function with:

```tsx
interface SectionOfferingListProps {
  sections: Section[];
  loading: boolean;
  termLabel: string;
  pinnedSections?: Section[];
  onTogglePin?: (section: Section) => void;
}

export function SectionOfferingList({
  sections,
  loading,
  termLabel,
  pinnedSections,
  onTogglePin,
}: SectionOfferingListProps) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-900">Offered Sections ({termLabel})</h4>
      {loading ? (
        <div className="text-sm text-gray-400">Loading section schedules...</div>
      ) : sections.length > 0 ? (
        <div className="space-y-2">
          {sections.map((sec) => (
            <SectionOfferingCard
              key={sec._id}
              section={sec}
              isPinned={(pinnedSections ?? []).some((pinned) => pinned._id === sec._id)}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No sections scheduled for this term.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds. `CourseDetailPanel.tsx` passes only `sections`, `loading`, and `termLabel`, which still type-checks because the new props are optional.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/catalog/SectionOfferingList.tsx
git commit -m "Add optional pin controls to the section offering list"
```

---

### Task 4: CourseDetailSheet component

**Files:**
- Create: `frontend/src/components/ui/sheet.tsx` (generated by the shadcn CLI)
- Create: `frontend/src/components/schedule/CourseDetailSheet.tsx`

**Interfaces:**
- Consumes: `getTermLabel` from `@/lib/terms` (Task 1); `SectionOfferingList` with `pinnedSections` and `onTogglePin` (Task 3); the existing `PrerequisiteGroupList` from `@/components/catalog/PrerequisiteGroupList`; existing `api.getCoursePrereqs(id)` and `api.getSectionsByCourse(courseId, termCode)`.
- Produces: `CourseDetailSheet` with props `{ course: CourseInfo | null; termCode: string; isAdded: boolean; pinnedSections: Section[]; onClose: () => void; onAddCourse: (course: CourseInfo) => void; onRemoveCourse: (courseId: string) => void; onTogglePin: (section: Section) => void }`. Task 5 renders it.

- [ ] **Step 1: Install the sheet primitive**

Run from `frontend/`:

```bash
npx shadcn@latest add sheet
```

Expected: creates `src/components/ui/sheet.tsx` exporting `Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`. It is backed by base-ui's `Dialog`, so `Sheet` accepts `open` and `onOpenChange(open, eventDetails)`.

- [ ] **Step 2: Confirm the generated file compiles**

Run: `npm run build`
Expected: build succeeds. If the generated file still imports an `IconPlaceholder` from an `@/app/...` path (a registry artifact the CLI normally rewrites), replace that import with `import { XIcon } from "lucide-react"` and use `<XIcon />` in the close button, then rebuild.

- [ ] **Step 3: Write the sheet component**

Create `frontend/src/components/schedule/CourseDetailSheet.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api, type CourseInfo, type PrerequisiteGroup, type Section } from "@/lib/api";
import { getTermLabel } from "@/lib/terms";
import { PrerequisiteGroupList } from "@/components/catalog/PrerequisiteGroupList";
import { SectionOfferingList } from "@/components/catalog/SectionOfferingList";

interface CourseDetailSheetProps {
  course: CourseInfo | null;
  termCode: string;
  isAdded: boolean;
  pinnedSections: Section[];
  onClose: () => void;
  onAddCourse: (course: CourseInfo) => void;
  onRemoveCourse: (courseId: string) => void;
  onTogglePin: (section: Section) => void;
}

export function CourseDetailSheet({
  course,
  termCode,
  isAdded,
  pinnedSections,
  onClose,
  onAddCourse,
  onRemoveCourse,
  onTogglePin,
}: CourseDetailSheetProps) {
  const [prereqGroups, setPrereqGroups] = useState<PrerequisiteGroup[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);

  /** Guards against a slow earlier response overwriting a newer one. */
  const requestIdRef = useRef(0);

  const courseId = course?._id;

  useEffect(() => {
    if (!courseId) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setPrereqGroups([]);
    setSections([]);

    const load = async () => {
      try {
        const [prereqRes, sectionRes] = await Promise.all([
          api.getCoursePrereqs(courseId),
          api.getSectionsByCourse(courseId, termCode),
        ]);
        if (requestId !== requestIdRef.current) return;
        setPrereqGroups(prereqRes.groups || []);
        setSections(sectionRes || []);
      } catch (err) {
        console.error("Failed fetching course details:", err);
        if (requestId === requestIdRef.current) {
          setError("Could not load prerequisites and sections for this course.");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    };

    load();
  }, [courseId, termCode, retryToken]);

  /** Pinning implies wanting the course, so add it first when it is not selected. */
  const handleTogglePin = (section: Section) => {
    if (course && !isAdded) onAddCourse(course);
    onTogglePin(section);
  };

  return (
    <Sheet open={!!course} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto data-[side=right]:sm:max-w-[480px]"
      >
        {course && (
          <>
            <SheetHeader>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                {course.subject} {course.courseNumber}
              </span>
              <SheetTitle className="text-xl font-bold text-gray-900">
                {course.title}
              </SheetTitle>
              <p className="text-sm text-gray-500">{course.creditHours.low} units</p>
              {(course.college || course.department) && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {course.college && <Badge variant="outline">{course.college}</Badge>}
                  {course.department && <Badge variant="outline">{course.department}</Badge>}
                </div>
              )}
            </SheetHeader>

            <div className="flex-1 space-y-6 px-4">
              {course.description && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-gray-900">Course Description</h4>
                  <p className="text-sm leading-relaxed text-gray-600">{course.description}</p>
                </div>
              )}

              {error ? (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setRetryToken((token) => token + 1)}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <PrerequisiteGroupList groups={prereqGroups} loading={loading} />
                  <SectionOfferingList
                    sections={sections}
                    loading={loading}
                    termLabel={getTermLabel(termCode)}
                    pinnedSections={pinnedSections}
                    onTogglePin={handleTogglePin}
                  />
                </>
              )}
            </div>

            <SheetFooter>
              {isAdded ? (
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  onClick={() => onRemoveCourse(course._id)}
                >
                  Remove from my courses
                </Button>
              ) : (
                <Button
                  className="w-full cursor-pointer"
                  onClick={() => onAddCourse(course)}
                >
                  Add to my courses
                </Button>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds. The component is not yet rendered anywhere; Task 5 wires it in.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/sheet.tsx frontend/src/components/schedule/CourseDetailSheet.tsx
git commit -m "Add course detail slide-over component"
```

---

### Task 5: Wire the sheet into the Schedule Builder

**Files:**
- Modify: `frontend/src/components/search/CourseSearchPanel.tsx`
- Modify: `frontend/src/pages/ScheduleBuilder.tsx`
- Delete: `frontend/src/components/schedule/CoursePickerRail.tsx`

**Interfaces:**
- Consumes: `CourseDetailSheet` (Task 4).
- Produces: user-visible behavior; nothing later depends on it.

Background: `CoursePickerRail` is currently a pure pass-through to `CourseSearchPanel`, so deleting it avoids threading a new prop through a layer that adds nothing.

- [ ] **Step 1: Make result cards clickable**

In `frontend/src/components/search/CourseSearchPanel.tsx`, add `onSelectCourse` to the props interface and destructuring:

```tsx
interface CourseSearchPanelProps {
  selectedCourses: CourseInfo[];
  onAddCourse: (course: CourseInfo) => void;
  onRemoveCourse: (id: string) => void;
  onSelectCourse: (course: CourseInfo) => void;
}

export function CourseSearchPanel({
  selectedCourses,
  onAddCourse,
  onRemoveCourse,
  onSelectCourse,
}: CourseSearchPanelProps) {
```

Then replace the result card (the `<div key={course._id} ...>` block through its closing `</div>`) with:

```tsx
              return (
                <div
                  key={course._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectCourse(course)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectCourse(course);
                    }
                  }}
                  className="cursor-pointer rounded-lg border border-gray-100 bg-white p-3 transition hover:border-gray-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-blue-600">
                        {course.subject} {course.courseNumber}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900 leading-tight mt-0.5">{course.title}</h4>
                    </div>
                    <Button
                      size="icon"
                      variant={isAdded ? "secondary" : "outline"}
                      className="h-7 w-7 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAdded) onRemoveCourse(course._id);
                        else onAddCourse(course);
                      }}
                    >
                      {isAdded ? <Trash2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 font-medium">
                    Credits: {course.creditHours.low} units
                  </div>
                </div>
              );
```

`stopPropagation` keeps the add/remove button a one-click action that does not also open the sheet.

- [ ] **Step 2: Swap CoursePickerRail for CourseSearchPanel in ScheduleBuilder**

In `frontend/src/pages/ScheduleBuilder.tsx`, replace the import line:

```tsx
import { CoursePickerRail } from "@/components/schedule/CoursePickerRail";
```

with:

```tsx
import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import { CourseDetailSheet } from "@/components/schedule/CourseDetailSheet";
```

Then in the Courses tab panel, replace:

```tsx
            <CoursePickerRail
              selectedCourses={selectedCourses}
              onAddCourse={handleAddCourse}
              onRemoveCourse={handleRemoveCourse}
            />
```

with:

```tsx
            <CourseSearchPanel
              selectedCourses={selectedCourses}
              onAddCourse={handleAddCourse}
              onRemoveCourse={handleRemoveCourse}
              onSelectCourse={setDetailCourse}
            />
```

- [ ] **Step 3: Add the detailCourse state**

In `frontend/src/pages/ScheduleBuilder.tsx`, add alongside the other `useState` declarations (after `const [selectedIndex, setSelectedIndex] = useState(0);`):

```tsx
  const [detailCourse, setDetailCourse] = useState<CourseInfo | null>(null);
```

- [ ] **Step 4: Close the sheet when the term changes**

In the `useEffect` keyed on `[termCode]` that resets selection state, add `setDetailCourse(null);` alongside the other resets:

```tsx
  useEffect(() => {
    requestIdRef.current += 1;
    setSelectedCourses([]);
    setPinnedSections([]);
    setCombinations([]);
    setNearMisses([]);
    setSelectedIndex(0);
    setHasGenerated(false);
    setSaveSuccess("");
    setSaveError("");
    setDetailCourse(null);
  }, [termCode]);
```

Leaving a course open after a term switch would show sections for a term the builder has already discarded.

- [ ] **Step 5: Render the sheet**

In `frontend/src/pages/ScheduleBuilder.tsx`, add the sheet as the last child of the outer grid `<div>`, immediately after the closing `</aside>`:

```tsx
      <CourseDetailSheet
        course={detailCourse}
        termCode={termCode}
        isAdded={selectedCourses.some((c) => c._id === detailCourse?._id)}
        pinnedSections={pinnedSections}
        onClose={() => setDetailCourse(null)}
        onAddCourse={handleAddCourse}
        onRemoveCourse={handleRemoveCourse}
        onTogglePin={handleTogglePin}
      />
```

The sheet portals to the document body, so its position in the grid does not affect layout.

- [ ] **Step 6: Delete the dead pass-through**

```bash
rm frontend/src/components/schedule/CoursePickerRail.tsx
```

- [ ] **Step 7: Verify the build, lint, and tests**

Run: `npm run build && npm run lint && npm test`
Expected: build succeeds with no unresolved import of `CoursePickerRail`; lint at or under the current baseline; all tests pass.

- [ ] **Step 8: Verify in a real browser**

Start the dev server (`npm run dev`) with the backend running, then confirm each of the following on the Schedule Builder:

1. Clicking a search result opens a panel from the right showing the course title, credits, description, prerequisites, and sections for the active term.
2. The panel is roughly 480px wide, not the primitive's 384px default. If it is 384px, the `data-[side=right]:sm:max-w-[480px]` override lost to the generated `data-[side=right]:sm:max-w-sm` class — inspect the generated `sheet.tsx` and match its variant prefix exactly.
3. Clicking the +/trash button on a card adds or removes the course without opening the panel.
4. With a course not yet added, clicking Pin on one of its sections both adds the course to My Courses and marks that section pinned.
5. The footer button reads "Add to my courses" before adding and "Remove from my courses" after.
6. Escape, backdrop click, and the close button all dismiss the panel.
7. Switching the term in the header while the panel is open closes it.
8. The Course Search page's detail panel still renders sections with no pin buttons.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/search/CourseSearchPanel.tsx frontend/src/pages/ScheduleBuilder.tsx
git add -u frontend/src/components/schedule/CoursePickerRail.tsx
git commit -m "Open a course detail slide-over from builder search results"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Slide-over container, right side, ~480px | 4 (component), 5 (browser check) |
| Whole result card clickable, button uses stopPropagation | 5 |
| Header, description, prerequisites, sections, footer | 4 |
| Pin auto-adds the course | 4 (`handleTogglePin`) |
| `SectionOfferingList` extended with optional pin props | 3 |
| `PrerequisiteGroupList` reused unchanged | 4 |
| `CourseSearchPanel` gains `onSelectCourse` | 5 |
| `CoursePickerRail` deleted | 5 |
| `getTermLabel` helper replacing both hardcoded labels | 1 |
| Shared `formatMeeting` helper | 2 |
| `ScheduleBuilder` owns `detailCourse`, no prop drilling | 5 |
| Fetch prereqs + sections on open, no `getCourseDetails` | 4 |
| Stale-response guard via `requestIdRef` | 4 |
| No sections / no prerequisites empty states | Inherited unchanged from existing components (3, 4) |
| Fetch failure shows inline error with retry | 4 |
| Term change closes the panel | 5 |
| Course removed while open flips footer to Add | 4 (`isAdded` is derived, so it re-renders) |
| Unit tests for `getTermLabel` and `formatMeeting` | 1, 2 |
| Build, lint, browser verification | 5 |

No gaps.

**Placeholder scan:** No TBD, TODO, "handle edge cases", or "similar to Task N". Every code step carries the actual code.

**Type consistency:** `getTermLabel(code: string): string` is defined in Task 1 and called in Tasks 1 and 4 with the same signature. `formatMeetingDays(days: string[]): string` and `formatMeeting(section: Section): string` are defined in Task 2 and used in Tasks 2 and 3. `SectionOfferingList`'s `pinnedSections?: Section[]` / `onTogglePin?: (section: Section) => void` are defined in Task 3 and passed in Task 4 with matching types. `CourseDetailSheet`'s prop names in Task 4 match the render site in Task 5 exactly (`course`, `termCode`, `isAdded`, `pinnedSections`, `onClose`, `onAddCourse`, `onRemoveCourse`, `onTogglePin`). `setDetailCourse` is passed directly as `onSelectCourse`, and both are `(course: CourseInfo) => void`.
