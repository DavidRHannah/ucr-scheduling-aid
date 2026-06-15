# Frontend Shell & Schedule Builder Design

## Goal

Build the initial frontend for UCR Scheduling Aid, matching the reference mockup
(`docs/ucr_course_scheduler.webp`): a full app shell (sidebar navigation + header)
plus a fully detailed Schedule Builder page. Other sidebar pages exist as routed
placeholders. All data is hardcoded/mock for tonight — no backend integration yet,
but mock data shapes mirror the real backend API (`backend/BACKEND_API.md`) so a
future swap to live data doesn't require restructuring components.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- shadcn/ui for primitives (Button, Select, Checkbox, Badge, Card, Collapsible, Input)
- react-router-dom for client-side routing

## Project Structure

```
src/
  components/
    layout/        (Sidebar, Header, AppLayout)
    schedule/       (WeeklyCalendar, CombinationCard, CombinationsList, StatusBanner)
    search/         (CourseSearchPanel, CourseResultCard, FilterControls)
    ui/             (shadcn components)
  pages/
    Dashboard.tsx
    ScheduleBuilder.tsx
    CourseSearch.tsx
    Combos.tsx
    Requirements.tsx
    SavedSchedules.tsx
    Settings.tsx
  data/
    mockSchedule.ts
  App.tsx
```

## Layout Shell

**Sidebar** (`components/layout/Sidebar.tsx`) — fixed-width dark navy column, full height:
- Logo block ("UCR SCHEDULING AID") at top
- Nav list via `react-router` `NavLink` (active-state highlight matching mockup's blue
  highlight on "Schedule Builder"): Dashboard, Schedule Builder, Course Search, Combos,
  Requirements, Saved Schedules, Settings
- Sign Out item near the bottom
- Status footer card (static/mock): "All Systems Operational" (green dot), API Healthy,
  Rate Limit, Version

**Header** (`components/layout/Header.tsx`):
- Left: term selector dropdown ("Spring 2025 ▾") via shadcn `Select`, populated with a
  couple mock terms; selecting one updates local state only
- Right: user avatar circle (initials "JA") + email (mock user data)

**AppLayout** (`components/layout/AppLayout.tsx`) — wraps Sidebar + Header + `<Outlet />`
using `grid-cols-[260px_1fr]`.

## Routing

- `/` → Dashboard
- `/schedule-builder` → Schedule Builder (default active page, fully built)
- `/course-search`, `/combos`, `/requirements`, `/saved-schedules`, `/settings` →
  minimal placeholder components (heading + "Coming soon")

## Schedule Builder Page

Layout: left/center column (calendar + combos) and right column (course search panel).

**StatusBanner** (`components/schedule/StatusBanner.tsx`) — green alert box:
"Found {N} compatible schedule combinations! Generated in {time}s using
conflict-pruned search." Driven by `generatedSchedules.length` from mock data.

**WeeklyCalendar** (`components/schedule/WeeklyCalendar.tsx`) — "Current Schedule (Locked)":
- CSS grid: 5 day columns (Mon–Fri) × hourly rows (8AM–6PM)
- Course blocks positioned via grid-row spans computed from `meetingTimes` start/end times
- Color-coded per course (blue/green/yellow); each block shows course code, section type,
  time, location — matches MATH 009B, CS 010A, ENGL 001A in the mockup

**CombinationsList** (`components/schedule/CombinationsList.tsx`):
- Section header "Generated Combinations (24)"
- Grid of `CombinationCard` components (Combo #1–3 visible by default), each showing
  unit count badge, list of sections with day/time, "No Conflicts" indicator, and a
  "View Details" button (styled but non-functional)
- "Show 21 More Combinations" via shadcn `Collapsible` — toggles rendering remaining
  mock combos

## Course Search Panel

`components/search/CourseSearchPanel.tsx` — right-side column:

- Search input (shadcn `Input` + icon) — live client-side filter of mock results by
  course code/title
- Filter dropdowns (shadcn `Select`):
  - Requirement Type — options sourced from `backend/reqs.json`
  - Department — "All Departments" + mock department list
  - Course Level — "All Levels"
- "Only Show Open Sections" checkbox (shadcn `Checkbox`) — filters by `status === "Open"`
- Search / Clear Filters buttons — Clear Filters resets all filter state to defaults
- Results list (`CourseResultCard.tsx`) — scrollable, each card shows course code/title,
  a requirement/major tag badge, section info (type, enrollment, day/time, location).
  Result count text is static/mock.

All filtering operates on the static mock dataset client-side — no debounce/async needed.

## Mock Data & State

`src/data/mockSchedule.ts` — types mirror the real backend models from
`backend/BACKEND_API.md`:

```ts
interface MeetingTime {
  weekDays: ("M"|"T"|"W"|"R"|"F"|"S"|"U")[];
  startTime: string;  // "HH:mm"
  endTime: string;
  meetingType: { code: string; description: string };
  buildingDescription?: string;
  room?: string;
}

interface Section {
  _id: string;
  courseId: { subject: string; courseNumber: string; title: string; creditHours: { low: number; high: number } };
  crn: string;
  sectionNumber: string;
  scheduleType: { code: "LEC"|"DIS"|"LAB"; description: string };
  enrollmentMax: number;
  enrollmentCurrent: number;
  status: "Open" | "Closed";
  meetingTimes: MeetingTime[];
  reqCode?: string;  // ties to reqs.json for Major/GE badges
}

interface GeneratedSchedule {
  groups: { courseId: Section["courseId"]; sections: Section[] }[];
  totalUnits: number;
  hasConflicts: boolean;
}
```

- `lockedSchedule: Section[]` — MATH 009B, CS 010A, ENGL 001A
- `generatedSchedules: GeneratedSchedule[]` — 24 mock combos (only first 3-4 need full
  detail; rest can be lightweight variations for the "show more" demo)
- `searchResults: Section[]` — CS 061, STAT 008, PHYS 002A
- `requirementTypes` — imported from `backend/reqs.json` for the Requirement Type dropdown

State management: local `useState` per page/component is sufficient — no global store
needed (filters, expanded combos, selected term are all page-local).

## Error Handling & Testing

- No async/network code tonight, so no loading/error states needed
- TypeScript strict mode catches data-shape issues at compile time
- No automated tests for this pass — pure visual/layout build with mock data; manual
  browser verification against the mockup. Vitest can be added later when real logic
  (conflict detection, combination generation) is introduced

## README Updates

Update `README.md` to reflect the current implementation focus (frontend shell +
Schedule Builder UI with mock data) without overstating completed scope — keep the
existing "Why"/"How"/"Features" framing but ensure it doesn't imply backend features
exist yet.
