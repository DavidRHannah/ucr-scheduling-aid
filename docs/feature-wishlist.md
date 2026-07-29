# Feature Wishlist

Running list of ideas to plan out in detail later. Not specs — just enough context to pick back up.

**Everything below is a proposal to evaluate during planning, not a decision.** Approaches are open to change; the value of each entry is the problem statement and the grounded file references, not the suggested fix.

Entries are ordered roughly by priority.

## Explicitly out of scope for the MVP

- **Catalog data freshness / staleness indicators.** The app displays `enrollmentCurrent`/`enrollmentMax`/`waitlistTotal`/`status` from `models/Section.js` with no "last synced" timestamp anywhere in the frontend. This is a deliberate MVP tradeoff: data is manually seeded via `npm run seed:raw` until the UCR API application is accepted. Revisit once live data access exists (this is the "Enrollment data staleness" row in CLAUDE.md's risk table).
- **Native mobile apps.** Possible future effort; not on this list. Web mobile responsiveness for the calendar grid is in scope and listed below.
- **Preferences ranking redesign.** Deferred — see the entry at the bottom for why.

---

# Features

## Persist builder state across reloads

**Problem:** `ScheduleBuilder.tsx` keeps `selectedCourses`/`pinnedSections` only in React `useState`. A refresh, an accidental back-button press, or navigating to another page silently discards everything with no warning or recovery. Losing twenty minutes of course picking to a stray click is the kind of thing that makes people stop trusting a tool.

**Proposed approach:** Persist builder state to localStorage, following the pattern already established in `TermContext`/`AuthContext`/`Sidebar`. Key by `termCode` so switching terms and switching back restores the right selection. Decide whether generated `combinations` are persisted too or recomputed on load (recomputing is simpler and avoids staleness).

**Related files:** `frontend/src/pages/ScheduleBuilder.tsx`, `frontend/src/context/TermContext.tsx` (localStorage pattern reference).

## Load a saved schedule into the Schedule Builder for continued editing

**Problem:** A saved schedule is currently a dead end — `SavedSchedules.tsx` can list, preview, and delete schedules (via `api.getSchedules`/`api.deleteSchedule`), but there's no way to bring one back into the builder to keep refining it. The builder always starts blank.

**Proposed approach:**
- Add an "Edit" button on the Saved Schedules page (`ScheduleListSidebar.tsx` or the schedule detail view) that navigates to the builder with the schedule's ID, reusing the existing `useSearchParams()` pattern already in the builder (it currently supports `?addCourseId=<id>`) — likely `?scheduleId=<id>`.
- On the builder side, when `scheduleId` is present, fetch via `api.getScheduleById` (already defined in `api.ts`, currently unused) and hydrate `selectedCourses` by re-deriving each section's parent course (`section.courseId`).
- Decide what happens to `pinnedSections`: a saved `Schedule` is just a flat `sectionIds: Section[]` list server-side, so pin/lock state isn't persisted and a load can't distinguish "pinned" from "generated" sections as they were when saved. Likely resolution: treat all loaded sections as pinned by default, letting the user unpin individually to let the generator vary them again.
- Saving back: `handleSave`/`api.createSchedule` always creates a new schedule. An edit flow should offer "update this schedule" (via the already-unused `api.updateSchedule(id, body)`) versus "save as new," rather than silently duplicating.
- Term handling: the builder's term comes from `TermContext`, and switching terms currently wipes builder state. Loading a schedule whose `termCode` differs from the active term needs to either switch the term context first or warn before hydrating.

**Related files:** `frontend/src/pages/SavedSchedules.tsx`, `frontend/src/components/saved/ScheduleListSidebar.tsx`, `frontend/src/pages/ScheduleBuilder.tsx`, `frontend/src/lib/api.ts` (`getScheduleById`, `updateSchedule` — defined, unused), `backend/models/Schedule.js`.

## Section detail popout + calendar block content reduction

**Problem:** The calendar blocks are trying to carry more information than short meetings have room for. Text overflow and truncation are handled (blocks now gate what they show on block height — time at `rowSpan >= 2`, room at `rowSpan >= 3`), so this is no longer a rendering defect; it's an information-density tradeoff. A short block can only ever show the course line and time, with no room for instructor or building/room detail regardless of truncation.

**Proposed approach:** Reduce each block to minimal at-a-glance content (course code + time, maybe a color indicator), and make the whole block clickable to open a section-detail slide-over — reusing the pattern established by `CourseDetailSheet` (the course search slide-over). The sheet carries the detail (room, instructor, section number) that no longer fits on the block.

**Open questions:**
- Should the sheet duplicate the existing pin/lock toggle (from the section offering list), or stay read-only? Two pin UIs risk drifting.
- Hover/click affordance for blocks once the whole block is clickable.

**Note:** `WeeklyCalendar.tsx` now delegates its pure block-layout geometry (`timeToMinutes`, `getVisibleHourRange`, `placeBlocks`, `assignBlockColumns`, `WEEK_DAYS`, `PlacedBlock`) to `frontend/src/lib/calendarLayout.ts`. A popout implementation should read block positioning from there rather than from the component.

**Related files:** `frontend/src/components/schedule/WeeklyCalendar.tsx`, `frontend/src/lib/calendarLayout.ts`, `frontend/src/components/schedule/CourseDetailSheet.tsx` (pattern to reuse), `frontend/src/pages/ScheduleBuilder.tsx`.

## Web mobile responsiveness for the weekly calendar

**Problem:** Page-level shells already handle narrow viewports reasonably (e.g. `ScheduleBuilder.tsx:189` uses `grid-cols-1 lg:grid-cols-[1fr_300px]`, so the side panel stacks below the calendar). The gap is `WeeklyCalendar.tsx` itself: zero responsive breakpoints, fixed 30px row heights, and seven fixed day columns. On a phone the grid either squeezes each day to an unreadable sliver or overflows the viewport. Roughly 8 of 41 `.tsx` files use breakpoints at all, so coverage is thin outside the page shells.

**Proposed approach (needs design thought, not just breakpoints):** Options worth weighing during planning:
- Horizontal scroll with a minimum per-column width, keeping the week intact but requiring swipe.
- A single-day or three-day view on narrow screens with day navigation, trading the week overview for legibility.
- An agenda/list view on mobile instead of a grid — arguably the better mobile idiom for "what's my week," and cheap to render from the same block data.

Applies to both the builder and the Saved Schedules preview, since both render `WeeklyCalendar`. Scoped to web only; native apps are out of scope per the note above.

**Related files:** `frontend/src/components/schedule/WeeklyCalendar.tsx`, `frontend/src/lib/calendarLayout.ts`, `frontend/src/pages/ScheduleBuilder.tsx`, `frontend/src/pages/SavedSchedules.tsx`.

## Course search: annotate courses with no sections in the active term

**Problem:** `Course` documents are global/term-agnostic (no `termCode` field), while `Section` documents are term-scoped. `getCourses` (`backend/controllers/courseController.js`) doesn't filter or annotate by term at all, so results already include courses with zero sections in the selected term with no indication to the user. `CourseSearchPanel` now receives a required `termCode` prop and re-queries when it changes, so results at least reflect the active term's freshness — but there's still no signal distinguishing a course with zero sections this term from one that's actively offered. Separately, the `useEffect` keyed on `termCode` in `ScheduleBuilder.tsx` unconditionally wipes `selectedCourses`, `pinnedSections`, and `combinations` on every term switch, even for courses that still have sections in the new term.

**Proposed approach for search:**
- Extend `getCourses` to accept an optional `termCode` and cheaply tag each result with a `hasSectionsThisTerm` boolean (e.g. `Section.distinct('courseId', { termCode })` or an aggregation exists check), rather than filtering results out server-side.
- Show courses with `hasSectionsThisTerm: false` visually muted with a "Not offered this term" badge, and disable or warn on adding them, rather than hiding them — hiding risks confusing a student who knows the course exists but can't find it.

**Proposed approach for term-change state:**
- Replace the unconditional wipe with logic that keeps selected courses which still have sections in the new term and drops the rest, surfacing which were removed and why.
- `pinnedSections` must still clear unconditionally, since a `Section._id` is term-specific and can't carry over even when the parent course does.
- `combinations` still need a full reset either way, being generated per-term.

**Related files:** `backend/controllers/courseController.js` (`getCourses`), `backend/models/Course.js`, `backend/models/Section.js`, `frontend/src/components/search/CourseSearchPanel.tsx`, `frontend/src/pages/ScheduleBuilder.tsx` (term-change effect).

## ICS export UI redesign (quick export + options popover)

**Context:** ICS export UI was removed from Saved Schedules pending a redesign (see CLAUDE.md "What's Not Built"); the backend endpoint is intact: `GET /:scheduleId/export.ics` (`backend/routes/scheduleRoutes.js:52`, rate-limited 60 req/min, handled by `exportIcs` at `backend/controllers/scheduleController.js:302`). Public GET taking the schedule ID directly, with optional settings as a base64url-encoded JSON blob in `?options=` (decoded at `scheduleController.js:319-332`), fed to `generateIcsString` (`backend/utils/ics.js`).

Worth noting on priority: a student builds a schedule roughly once a quarter and then registers in Banner, so calendar export is a nice-to-have rather than a retention driver.

**Proposed approach:** Skip a dedicated export page.
- Quick "Export" button on the selected schedule in `SavedSchedules.tsx` hitting `export.ics` with no `options` param (the backend already defaults sanely with `exportOptions = {}`) — one click, zero configuration.
- Advanced settings (timezone, alarms, recurring vs. single-occurrence, subscribe-link vs. download) go in a small popover anchored to that button. This is secondary configuration, not a destination.
- Defer full-page treatment until the sharing/socials idea is actually scoped, rather than reserving page real estate for a feature that doesn't exist yet.

**Related files:** `frontend/src/pages/SavedSchedules.tsx`, `backend/controllers/scheduleController.js` (`exportIcs`), `backend/routes/scheduleRoutes.js`, `backend/utils/ics.js`.

## Smaller QOL items

- **Undo/confirm when removing a course from the builder.** `handleRemoveCourse` (`ScheduleBuilder.tsx`, ~line 143) removes instantly with no confirmation — inconsistent with `SavedSchedules.tsx`, which uses `confirm()` before deleting. Less urgent once builder state persists (above), since the cost of a misclick drops.
- **Running credit-hour total.** Neither `CourseSearchPanel.tsx` nor the builder shows total credits across selected courses; helps students catch an overload before generating.
- **"Open sections only" filter** in search, to cut noise on popular courses with many closed sections.
- **"Save as" / duplicate on Saved Schedules.** Currently only select and delete are supported, so there's no way to branch a saved schedule into a variant without overwriting. Cheap once the load/edit flow above exists — it reuses `createSchedule` with the loaded sections.
- **Conflict warning in search results before adding.** Flag in `CourseSearchPanel.tsx` results when a course's sections would all conflict with already-pinned sections. Note this is *not* a small UI change despite appearing alongside the others: computing it requires section data for every search result, meaning either an N+1 of section fetches or a new endpoint that returns conflict state for a candidate set. Size it properly before committing.

**Related files:** `frontend/src/pages/ScheduleBuilder.tsx`, `frontend/src/components/search/CourseSearchPanel.tsx`, `frontend/src/pages/SavedSchedules.tsx`, `frontend/src/components/saved/ScheduleListSidebar.tsx`.

---

# Deferred

## Schedule Builder preferences redesign: priority order instead of weighted sliders

**Status: deferred.** Rewrites working code to address a complaint from an unclear number of users, and the diagnosis below may target the wrong layer. Revisit if real users report it.

**Problem:** The Preferences tab (`SchedulePreferences.tsx`) exposes two continuous sliders — "Fewer days on campus matters" (`weights.days`) and "Open sections matter" (`weights.availability`) — plus discrete start-time and gap-mode controls. Adjusting a slider often doesn't visibly reorder results, which reads as broken. Contributing causes traced in `frontend/src/lib/scheduleRanking.ts`:
- `scoreSchedule` (165-184) weights four subscores, but `normalizeWeights` (144-163) renormalizes them to sum to 1, so moving one slider only shifts its relative share rather than isolating that factor.
- Two of the four weights (`start`, `gaps`) have no slider at all — reachable only via the three presets, leaving half the model invisible to direct control.
- The score is rounded to an integer 0-100 (line 183), so small nudges collapse to the same displayed value.
- `daysSubscore` has only 5 discrete values, so many schedules tie on that axis and fall through to the tie-breaker cascade in `rankSchedules` (190-210).

**Why it's deferred rather than planned:**
- The root cause may not be the ranking math at all. If a student picks five courses and the generator yields three valid combinations, no ranking change makes results visibly reorder. Confirm the candidate-set size before rewriting the scorer.
- The proposed fix (lexicographic priority ordering) has the mirror-image failure mode: priority 1 dominates absolutely and priorities 2-4 only break exact ties, so they would feel inert — the same complaint in a new shape. Making it feel right likely needs tiered or bucketed comparison, reintroducing the complexity the redesign was meant to remove.

**If revisited, cheaper alternative:** keep the weighted model but improve legibility — discrete steps (Off/Low/Medium/High) instead of continuous sliders, stop silently renormalizing (or visualize the effective split), and add feedback when an adjustment changes ordering below the top result.

**Related files:** `frontend/src/components/schedule/SchedulePreferences.tsx`, `frontend/src/lib/scheduleRanking.ts`, `frontend/src/components/schedule/RankedResultHeader.tsx`.
