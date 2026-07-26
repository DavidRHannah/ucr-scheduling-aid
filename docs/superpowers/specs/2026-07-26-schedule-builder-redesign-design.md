# Schedule Builder Redesign — Design

Date: 2026-07-26

## Problem

The Schedule Builder presents generated schedules but does not help a student
choose among them. Specifically:

1. The same sections are enumerated three times (weekly calendar, Section
   Control list, and each combination card). No view is clearly primary.
2. Generated combinations, the entire output of the tool, sit below the fold
   under the calendar, three at a time behind a collapsible.
3. Results are unranked. They arrive in backend order with no way to express a
   preference, so the student still evaluates options one by one. This is the
   original pain point stated in CLAUDE.md, only faster.
4. Registration data is absent. Section `status` and enrollment counts exist in
   the payload but never render, so a student can perfect a schedule made of
   closed sections. CRNs, the values actually typed into Banner, appear as
   10px grey text.
5. The calendar is hardcoded Monday-Friday, 8:00-18:00. Evening sections fall
   outside the grid and asynchronous sections (no meeting times) never render.

## Goals

Rank valid schedules against student-stated preferences, lead with a best pick,
justify why it won, and give the student what they need to register.

### Ranking never removes options

No control in this design filters combinations out of the result set. Every
preference expresses itself as rank position only. A student can always reach
any schedule the generator produced, including one composed entirely of closed
sections.

Rationale: a filtered result is invisible and therefore unexplainable. The
student cannot distinguish "no such schedule exists" from "a schedule existed
and was silently discarded", and the second case destroys trust in the tool.
Enrollment status also moves constantly during registration, so a section that
is closed this morning may open this afternoon.

This is an invariant, not a default. Any future control that would hide a
combination violates it.

## Non-Goals

- Blocked-time windows (marking work shifts or practice as unavailable).
- Instructor quality signals. No rating data exists in the system.
- A bespoke mobile layout. Rails collapse responsively; registration happens on
  a laptop and the build effort belongs elsewhere.
- Backend changes. Everything specified here is computed from data the existing
  `/generate` response already returns.

## Ranking Model

Scoring runs client-side over the combinations returned by `/generate`.
Changing a preference re-ranks instantly with no network call. Only changing
the course set or pinned sections triggers regeneration.

Each component yields a subscore in `[0, 1]`. The final score is a weighted sum
scaled to 0-100.

### Component subscores

**Start time.** Let `T` be the student's threshold (minutes from midnight) and
`e` the combination's `earliestStart`.

```
startScore = e >= T ? 1 : max(0, 1 - (T - e) / 180)
```

A schedule starting three or more hours before the threshold scores 0.

**Days on campus.** Let `d = activeDays.length`, ranging 1 to 5.

```
daysScore = (5 - d) / 4
```

**Gaps.** Mode-dependent. Per-day gaps are computed from
`groups[].sections[].blocks`, which carry `{ day, start, end }` with start and
end as minutes from midnight (confirmed in `backend/utils/generator.js`).

- `tight` — minimize dead time, capped at 600 minutes per week:
  `gapScore = max(0, 1 - totalGapMinutes / 600)`
- `lunch` — reward a protected midday break. For each active day, the day
  qualifies if it contains a gap of 45 to 90 minutes overlapping 11:00-14:00.
  `gapScore = qualifyingDays / activeDays.length`
- `none` — the component is excluded and its weight redistributed
  proportionally across the remaining components.

**Availability.** Per section: Open scores 1.0, Waitlisted 0.5, Closed 0.0.
`availabilityScore` is the mean across all sections in the combination.

The "Prioritize open sections" control raises the raw weight of this component.
It never removes anything: a combination containing closed sections sinks in
the ranking but stays reachable through the pager.

### Weight normalization

Weights are stored as raw importance values in `[0, 1]` per component and
normalized at scoring time by dividing by their sum. This makes presets and
arbitrary custom edits well-defined under one rule, and makes the `none` gap
mode a special case of the same rule (its weight becomes 0 and the remainder
renormalizes automatically).

### Lever semantics

The four controls do not all do the same kind of thing, and the distinction
must be explicit:

| Control | Type | Effect |
|---|---|---|
| Start after | Threshold | Sets `T` in the start-time subscore |
| Days on campus | Importance | Sets the raw weight of the days component |
| Between classes | Mode | Selects `tight`, `lunch`, or `none` |
| Prioritize open sections | Importance | Raises the raw weight of the availability component |

The start-time control is the only one that sets a threshold. The days control
sets importance only, because "fewer days" has no meaningful cutoff value the
way "not before 10am" does.

### Presets

Presets set raw weights and the start threshold together.

| Preset | Start weight | Days weight | Gap weight (mode) | Availability weight | Start threshold |
|---|---|---|---|---|---|
| Sleep In | 0.50 | 0.15 | 0.00 (none) | 0.35 | 10:00 |
| Compact Week | 0.10 | 0.50 | 0.20 (tight) | 0.20 | 08:00 |
| Balanced | 0.25 | 0.25 | 0.25 (lunch) | 0.25 | 09:00 |

Balanced is the default on first load. Adjusting any individual lever moves the
panel to a "Custom" state without discarding the current values.

### Tie-breaking

Equal scores resolve in order: higher availability subscore, then fewer active
days, then earlier `latestEnd`, then original index (stable).

### Explanation chips

Every result states why it ranked where it did. Chips derive from subscores:

- `startScore >= 0.8` produces "No classes before {earliestStart}"
- `daysOff` non-empty produces "{days} free"
- `gapScore >= 0.8` in tight mode produces "Short gaps between classes"
- `gapScore >= 0.8` in lunch mode produces "Midday break most days"
- `availabilityScore < 1.0` produces a caution chip, "{n} waitlisted" or
  "{n} closed"

Maximum four chips, cautions shown last and visually distinct. A bare score is
not trustworthy; a justified score is. This is the difference between asserting
a best answer and the student believing it.

### Score presentation

The score renders as a number out of 100 in both the result header and the
alternatives strip. Star ratings are deliberately rejected: they imply a
calibrated five-point scale the model does not have, and introduce a second
visual language for the same underlying value.

## Page States

**Empty.** No courses selected. Centered, prominent course search with a
one-line explanation of what happens after adding courses.

**Generating.** Skeleton in the result area. Rails remain interactive.

**Explore.** The primary layout, described below.

**Zero results.** Calls `generateNearMissSchedules` (`/generate/invalid`), an
endpoint that already exists and is currently unused. Shows the closest
near-misses and names the specific conflict, for example: "CS 100 and MATH 9C
both meet MWF 10:00. Drop one to see 12 schedules." The current page shows only
"Found 0 combinations", which is the tool's worst moment.

**Single result.** No alternatives strip and no pager. Do not imply choice
where none exists.

Generation is automatic and debounced (400ms) on changes to the course set or
pinned sections. The explicit "Generate Combinations" button is removed.
In-flight requests are guarded against stale responses so a fast second change
cannot be overwritten by a slower earlier response.

## Layout (Explore State)

Two columns: a fixed left rail of roughly 300px and a fluid main area.

**Left rail**, independently scrollable:
- Selected courses as removable chips, plus an add-course affordance that
  expands the search inline.
- Preferences: three preset buttons, then the individual levers (start time,
  days on campus, gap mode as a three-way radio, prioritize-open-sections
  toggle).

**Main area**, top to bottom:
- Result header: rank position, score, explanation chips, and a pager reading
  "1 of 47" with previous/next controls bound to the left and right arrow keys.
- Weekly calendar as the hero element.
- Alternatives strip: a horizontal scroller of compact ranked cards. Clicking
  one previews it. The current selection is highlighted. Capped at the top 20
  with a "show more" control. The strip is a shortcut to the highest-ranked
  results; the header pager still traverses the full ranked list, so a pager
  reading "1 of 47" alongside a 20-card strip is expected, not a mismatch.
- Section table: course, section number, CRN, days and time, instructor, status
  badge, enrollment count, and a pin toggle per row.
- Action bar: "Copy CRNs" and "Save".

### Calendar changes

Hour bounds become dynamic: the floor of the earliest meeting minus one hour to
the ceiling of the latest plus one hour, clamped to 06:00-23:00, defaulting to
08:00-18:00 when no sections are present. Sections with no meeting times, or
with meeting times carrying no weekdays, render in an "Online / asynchronous"
tray beneath the grid rather than being silently dropped.

### Registration handoff

"Copy CRNs" writes the comma-separated CRN list to the clipboard via
`navigator.clipboard`, with a synchronous fallback and visible confirmation.
The student's actual endpoint is pasting CRNs into Banner.

## Components

**New:**
- `lib/scheduleRanking.ts` — pure scoring functions, no React.
- `hooks/useScheduleRanking.ts` — memoized ranking over fetched combinations.
- `components/schedule/SchedulePreferences.tsx` — presets and levers.
- `components/schedule/CoursePickerRail.tsx` — chips and inline search.
- `components/schedule/RankedResultHeader.tsx` — score, chips, pager.
- `components/schedule/AlternativesStrip.tsx` — ranked horizontal scroller.
- `components/schedule/ScheduleSectionTable.tsx` — CRN, status, pin.
- `components/schedule/ScheduleActionBar.tsx` — copy CRNs, save.
- `components/schedule/NoResultsPanel.tsx` — near-miss handling.
- `components/schedule/AsyncSectionTray.tsx` — asynchronous sections.

**Modified:**
- `WeeklyCalendar` — dynamic hour bounds, asynchronous section handling.
- `CourseSearchPanel` — becomes the rail's add-course flow.

**Retired:**
- `StatusBanner` — reports generation time, which serves the engineer, not the
  student. Replaced by the result header.
- `CombinationsList` and `CombinationCard` — replaced by `AlternativesStrip`.
- `SectionControlList` — merged into `ScheduleSectionTable`.

**Renamed concept:** "Lock" becomes "Pin". Constraint behavior is unchanged;
the control moves onto the section row it applies to, where it is discoverable.

## Testing

The frontend currently has no test runner and no test files. This design adds
Vitest scoped to the pure scoring module only. No component testing
infrastructure, no jsdom, no testing-library.

Justification: the scoring model determines the entire value proposition of the
page and is pure input-to-output logic, which is the cheapest possible thing to
test and the most expensive thing to get silently wrong.

Cases to cover:
- Each subscore at boundaries: at threshold, three hours before, one active day,
  five active days, zero gaps, gaps beyond the cap.
- Lunch mode: qualifying gap, gap too short, gap too long, gap outside the
  11:00-14:00 window.
- Weight redistribution when gap mode is `none`.
- Availability: all open, mixed, and all closed.
- The no-removal invariant: for any preference configuration, the ranked output
  contains exactly the same set of combinations as the input, reordered. This
  is the single most important test in the suite.
- Tie-breaking order.
- Preset application producing expected weights and threshold.

Verification for the whole change: `npm run build` and `npm run lint` must pass,
and lint must not exceed the current baseline of 25 problems.

## Risks

| Risk | Mitigation |
|---|---|
| A four-weight composite ranks something the student disagrees with | Explanation chips make every ranking auditable; pinning is the escape hatch |
| Large course sets produce hundreds of combinations | Ranking is O(n log n) and fine; the strip caps at the top 20 with "show more" |
| Auto-generation fires excessively while editing courses | 400ms debounce plus stale-response guarding |
| Removing the Generate button hides that work is happening | Explicit generating state with a skeleton, not a silent swap |
