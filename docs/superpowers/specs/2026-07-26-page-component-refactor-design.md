# Page Component Refactor — Design

Date: 2026-07-26

## Goal

Refactor the four route-level page components so their large inline JSX blocks
are extracted into smaller, typed, presentational components. This is a **pure
refactor**: zero visible change to the UI or behavior. Same markup, same
classNames, just relocated. Pages retain all state and handlers; extracted
components receive props and render.

## Motivation

Each page currently mixes data fetching, state, and 250-300 lines of inline
markup, making them hard to scan and change. The codebase already establishes a
convention of small domain-organized presentational components
(`CombinationsList`, `StatusBanner`, `CourseSearchPanel`). This work applies that
convention consistently across all pages.

## Conventions Followed

- Components are functional, typed with `interface` props, matching existing style.
- Organized by domain under `components/`, not by type.
- All types imported from `@/lib/api` — no new type definitions.
- `@/` path alias for imports.
- No emojis anywhere.

## Extractions

### CourseSearchPage — `components/catalog/`
- `CatalogSearchForm` — search input + department select + submit button.
- `CourseListItem` — one clickable catalog result card.
- `CourseDetailPanel` — the right-hand detail side panel, composed of:
  - `PrerequisiteGroupList` — prerequisite rule groups display.
  - `SectionOfferingList` (uses `SectionOfferingCard`) — offered sections.

### ScheduleBuilder — `components/schedule/`
- `SaveSchedulePanel` — save-name form plus the signed-out "Sign in to save" prompt.
- `SaveStatusBanner` — the save success/error messages.
- `SectionControlList` (uses `SectionControlCard`) — the lock/unlock section list.

### SavedSchedules — `components/saved/`
- `ScheduleListSidebar` (uses `ScheduleListItem`) — saved configurations list.
- `ScheduleAnalyticsPanel` — stats grid plus `ConflictWarning`.
- `IcsExportOptions` — the iCalendar export customization form and button.

### Settings — `components/settings/`
- `AuthPanel` — wraps the profile-vs-form conditional (`UserProfileCard` + `AuthForm`).
- `CatalogSyncPanel` — the Banner catalog sync form card.

### Shared
- `SignInPrompt` (`components/layout/`) — the full-page "sign in" gate used by
  `SavedSchedules`.

## Verification

Behavior-preserving, so both must pass clean after the refactor:
- `npm run build` (runs `tsc -b && vite build`)
- `npm run lint`
