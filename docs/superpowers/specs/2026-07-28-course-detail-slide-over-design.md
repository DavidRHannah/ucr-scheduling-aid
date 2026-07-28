# Course Detail Slide-Over (Schedule Builder) — Design

## Problem

On the Schedule Builder, the Courses tab lists search results as compact cards
showing only subject, course number, title, and credit hours. Clicking a card
does nothing — the only interactive element is the +/trash button that adds or
removes the course outright.

A student therefore has to commit to a course knowing almost nothing about it.
To read the description, check prerequisites, or see what sections actually
exist and when they meet, they have to leave the builder for the Course Search
page, losing their in-progress selection context.

## Goal

Clicking a search result on the Schedule Builder opens a panel showing
everything relevant about that course — description, prerequisites, and every
section offered in the active term — and lets the student act on it directly by
adding the course or pinning a specific section.

## Non-goals

- Opening the panel from the My Courses chips or from the section table under
  the calendar. Both are straightforward follow-ons once the panel exists, but
  are out of scope here.
- Prerequisite satisfaction checking (does this student meet them). That is
  Phase 4 degree-awareness work and carries the accuracy risks called out in
  `CLAUDE.md`.
- A side-by-side section comparison view.
- Adding jsdom / testing-library to enable component tests. That is a separate
  decision, deliberately not bundled into this feature.

## Current state

- `ScheduleBuilder.tsx` lays out `lg:grid-cols-[1fr_300px]` — main content left,
  a 300px sidebar right holding Courses / Preferences tabs.
- The Courses tab renders `CoursePickerRail`, which since the last change is a
  zero-value pass-through to `CourseSearchPanel`.
- `CourseSearchPanel.tsx` owns the search query, results list, and the My
  Courses cart. Result cards have no click handler.
- `ScheduleBuilder` owns `selectedCourses`, `pinnedSections`, `handleAddCourse`,
  `handleRemoveCourse`, and `handleTogglePin` (which enforces one pin per
  course-plus-schedule-type, so pinning a second lecture replaces the first).
- Prior art exists and is directly reusable: `components/catalog/` already has
  `PrerequisiteGroupList` and `SectionOfferingList`, composed by
  `CourseDetailPanel` on the Course Search page.
- `lib/api.ts` already exposes `getCoursePrereqs(id)` and
  `getSectionsByCourse(courseId, termCode)`, used exactly this way by
  `CourseSearchPage`.
- The backend `getCourses` handler applies no `.select()` projection, so search
  results already carry `description`, `college`, and `department`.
- No `sheet` or `dialog` primitive is installed yet. The shadcn `base-nova`
  registry provides `sheet`, backed by base-ui's `Dialog`.

## Design

### Container: a right-side slide-over

Clicking a result card opens a slide-over panel anchored to the right edge, at
roughly 480px. The 300px sidebar is too narrow for prerequisite rule groups and
section rows; a centered modal would be roomier still but would fully cover the
weekly calendar. The slide-over is spatially connected to the result that was
clicked, leaves the calendar partly visible for context, and gives the content
room to breathe.

`npx shadcn add sheet` installs the primitive. Its default content width is
`sm:max-w-sm` (384px), so the builder's usage overrides that to ~480px via
`className`.

Dismissal is by backdrop click, Escape, or the close button — all provided by
the primitive.

### Click target

The whole result card becomes clickable. The existing +/trash button keeps its
current one-click add/remove behavior and calls `stopPropagation` so it does not
also open the panel.

### Panel contents

Top to bottom:

| Section | Content | Source |
|---|---|---|
| Header | `SUBJECT NUMBER`, title, credit hours, college and department badges | Already present on the `CourseInfo` from search results |
| Description | Course description paragraph | Same |
| Prerequisites | Rule groups | `PrerequisiteGroupList`, reused verbatim |
| Sections | One row per section in the active term: schedule type and section number, CRN, meeting days/times, location, instructor, status and enrollment, and a Pin toggle | `SectionOfferingList`, extended |
| Footer | `Add to my courses` / `Remove from my courses`, reflecting current state | New |

The panel stays open after adding a course, so the student can immediately pin a
section without reopening it.

### Pin behavior

Pinning a section when the course is not yet in My Courses adds the course and
locks that section in a single action. The generator takes `courseIds` and
`lockedSectionIds` together, so a lock without its course would be silently
ignored — auto-adding makes the button mean what it appears to mean. Once added,
`handleTogglePin`'s existing one-pin-per-component rule applies unchanged.

### Component structure

| File | Change |
|---|---|
| `components/ui/sheet.tsx` | New, via shadcn CLI |
| `components/schedule/CourseDetailSheet.tsx` | New. Owns the panel: fetches prerequisites and sections for the open course, renders header, description, prerequisites, sections, and footer |
| `components/catalog/SectionOfferingList.tsx` | Extended with optional `pinnedSections` and `onTogglePin` props. When omitted, renders exactly as today |
| `components/catalog/PrerequisiteGroupList.tsx` | Reused unchanged |
| `components/search/CourseSearchPanel.tsx` | Gains one `onSelectCourse` prop; result cards become clickable |
| `components/schedule/CoursePickerRail.tsx` | Deleted (see below) |

Extending `SectionOfferingList` with optional pin props, rather than writing a
builder-specific copy, keeps a single source of truth for how a section renders.
The Course Search page passes neither prop and is visually unaffected.

### Supporting cleanups

Three small changes that this work directly requires or trips over:

1. **`getTermLabel(code)` helper.** The panel header needs a term label. Today
   `ScheduleBuilder.tsx` hardcodes
   `termCode === "202620" ? "Spring 2026" : "Fall 2025"` and
   `CourseSearchPage.tsx` hardcodes the literal `"Spring 2026"`. Both are
   replaced by one lookup against `AVAILABLE_TERMS` in `TermContext.tsx`,
   returning the raw code as fallback for an unknown term.

2. **Shared `formatMeeting` helper.** `SectionOfferingList` prints raw weekday
   codes (`M/W/F`) while `ScheduleSectionTable` maps them to `Mon/Wed/Fri` via
   its local `DAY_LABELS`. Since the panel renders meeting times, the day-label
   map and formatter move to `lib/` and both call sites use it.

3. **Delete `CoursePickerRail`.** It is now a pure pass-through to
   `CourseSearchPanel`. Removing it avoids threading `onSelectCourse` through a
   layer that adds nothing; `ScheduleBuilder` renders `CourseSearchPanel`
   directly in the Courses tab.

## Data flow

`ScheduleBuilder` owns the new `detailCourse: CourseInfo | null` state and
renders `CourseDetailSheet` itself, so the panel has direct access to
`handleAddCourse`, `handleRemoveCourse`, `handleTogglePin`, `selectedCourses`,
and `pinnedSections` without prop drilling. `CourseSearchPanel` only reports
which course was clicked.

`CourseDetailSheet` fetches on open, keyed to the course id:

- `api.getCoursePrereqs(course._id)`
- `api.getSectionsByCourse(course._id, termCode)`

No `getCourseDetails` call is needed — search results are already complete
course documents.

Both requests are guarded against out-of-order responses using the same
`requestIdRef` counter pattern already used by `ScheduleBuilder.generate`, so a
slow fetch for a previously-viewed course cannot overwrite the current one.

No backend changes. No new API endpoints. No new types beyond the panel's own
props.

## Edge cases

| Case | Handling |
|---|---|
| Course has no sections this term | `SectionOfferingList` already renders "No sections scheduled for this term" |
| Course has no prerequisites | `PrerequisiteGroupList` already renders "No prerequisites registered for this course" |
| Prerequisite or section fetch fails | Inline error message in that section with a retry control; the panel stays open and the rest of the content still renders |
| Term changed while the panel is open | Panel closes. `ScheduleBuilder` already resets all selection state on `termCode` change, so leaving a stale course open would be misleading |
| Course removed while its panel is open | Panel stays open; the footer flips back to `Add to my courses`. Existing `handleRemoveCourse` already clears that course's pins |
| Section pinned, then course removed | Existing behavior — `handleRemoveCourse` filters that course's pins out |

## Testing / verification

Frontend Vitest is configured but has no DOM environment (no jsdom, no
testing-library), and the only existing test is the pure scoring module
`src/lib/scheduleRanking.test.ts`. Rather than add test infrastructure as a side
effect of this feature, the design pushes the genuinely testable logic into
`lib/` where the existing setup covers it with no new dependencies:

1. `getTermLabel` — known codes, unknown-code fallback.
2. `formatMeeting` — multi-day, single-day, and asynchronous (no meeting times).

Beyond that:

3. `npm run build` and `npm run lint`, at or under the current lint baseline.
4. A live browser check driving the dev server with Playwright (Chromium is
   installed in this environment): click a result, confirm the panel opens with
   description, prerequisites, and sections; confirm the +/trash button adds
   without opening the panel; confirm Pin on a non-added course both adds the
   course and locks the section; confirm the calendar updates behind the panel.

## Open questions

None — all resolved during brainstorming.
