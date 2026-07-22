# Functional Requirements — UCR Scheduling Aid

> **Version:** 1.0 (Finalized)
> **Last Updated:** 2026-07-15
> **Status:** Approved — Ready for implementation

This document captures all functional requirements for the UCR Scheduling Aid. Requirements are organized by domain, prioritized using MoSCoW (Must / Should / Could / Won't for v1), and tagged with current implementation status.

---

## Conventions

| Field | Meaning |
|---|---|
| **ID** | `FR-{domain}.{number}` — stable identifier |
| **Priority** | **Must** = launch blocker · **Should** = high-value, not blocking · **Could** = nice-to-have · **Won't (v1)** = deferred |
| **Status** | Implemented · Partial · Not Started · Spec Only (API spec exists, no code) |

---

## 1. Authentication & User Management

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-AUTH.1 | A user can register an account with email, password (≥6 chars), and display name | Must | Spec Only |
| FR-AUTH.2 | A user can log in with email and password and receive a JWT token | Must | Spec Only |
| FR-AUTH.3 | Authentication errors do not disclose whether email or password was incorrect | Must | Spec Only |
| FR-AUTH.4 | A user can sign out, which clears their session/token | Must | Partial (button rendered, no logic) |
| FR-AUTH.5 | The header displays the authenticated user's initials and email | Should | Partial (hardcoded) |
| FR-AUTH.6 | Protected routes redirect unauthenticated users to login | Must | Not Started |

### Acceptance Criteria
- **FR-AUTH.1**: Registration with duplicate email returns 409. Missing fields return 400 with field-level errors.
- **FR-AUTH.2**: Successful login returns `{ user: { id, email, displayName }, token }`. Invalid credentials return 401.
- **FR-AUTH.3**: Login failure message is always `"Invalid email or password"` regardless of which field is wrong.
- **FR-AUTH.6**: All `/schedules` endpoints require JWT. All `/courses`, `/sections`, `/terms` endpoints are public.

---

## 2. Course & Section Data

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-COURSE.1 | A user can search courses by keyword (matches subject+number and title, case-insensitive) | Must | Partial (client-side on mock data) |
| FR-COURSE.2 | A user can filter courses by department/subject code | Must | Partial (3 hardcoded departments) |
| FR-COURSE.3 | A user can filter courses by course level (lower division 1-99, upper division 100-199) | Should | Partial (client-side) |
| FR-COURSE.4 | A user can filter sections by open/closed status | Must | Partial (client-side) |
| FR-COURSE.5 | A user can filter sections by breadth requirement designation code | Should | Partial (8 of 119 codes) |
| FR-COURSE.6 | Course search results are paginated (default 20 per page) with total count | Must | Not Started |
| FR-COURSE.7 | A user can view all sections for a specific course, optionally filtered by term | Must | Spec Only |
| FR-COURSE.8 | A user can look up a section by CRN (within a specific term) | Should | Spec Only |
| FR-COURSE.9 | A user can view prerequisite information for a course, grouped by AND/OR logic | Should | Spec Only |
| FR-COURSE.10 | A user can view linked sections for a section (e.g., required lab/discussion for a lecture) | Must | Spec Only |
| FR-COURSE.11 | Each section displays: section number, CRN, schedule type, instructor, meeting times (days + start/end + building/room), enrollment (current/max), waitlist info, status (Open/Closed/Waitlisted), and requirement designation | Must | Partial (frontend shows subset) |
| FR-COURSE.12 | The department list used for filtering is dynamically loaded from available course data, not hardcoded | Should | Not Started |
| FR-COURSE.13 | The requirement type list used for filtering is loaded from the full catalog (119 codes across 6 colleges) | Should | Not Started |
| FR-COURSE.14 | A user can clear all search filters to reset to defaults with one action | Should | Implemented |
| FR-COURSE.15 | Course data supports variable-credit courses with a credit range (low/high) | Should | Partial (type exists, not surfaced in UI) |
| FR-COURSE.16 | The backend provides a public endpoint to retrieve all breadth requirement codes and descriptions | Should | Spec Only |

### Acceptance Criteria
- **FR-COURSE.1**: Searching "CS100" or "software" matches `CS 100 — Software Construction`. Search is case-insensitive.
- **FR-COURSE.6**: Response includes `{ page, limit, totalItems, totalPages }` pagination metadata.
- **FR-COURSE.9**: Prerequisites use group-based logic: courses within a `logicGroup` are OR'd (any satisfies); groups are AND'd (all must be satisfied). Each prerequisite has `minGrade` (default "D-") and `concurrentAllowed`.
- **FR-COURSE.10**: Linked sections share a `linkIdentifier`. A lecture with identifier "A" returns all labs/discussions also with identifier "A".
- **FR-COURSE.16**: `GET /requirements` returns the complete list of 119 GE requirement designations and their human-readable descriptions (sourced from `reqs.json`).

---

## 3. Term Management

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-TERM.1 | The system displays all available academic terms in a selectable dropdown | Must | Partial (2 hardcoded terms) |
| FR-TERM.2 | The system identifies and defaults to the current active term | Must | Not Started |
| FR-TERM.3 | Selecting a term updates all data views (courses, sections, schedules) to that term | Must | Not Started |
| FR-TERM.4 | Term data is fetched live from the external SIS (not cached in the app database) | Should | Not Started |

### Acceptance Criteria
- **FR-TERM.1**: Terms display human-readable names (e.g., "Spring 2026") with machine-readable codes (e.g., "202620").
- **FR-TERM.3**: Changing the term selector in the header propagates to all components on the page — course search results, schedule combinations, and saved schedules all reflect the selected term.

---

## 4. Schedule Builder & Calendar

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-SCHED.1 | A user can view a weekly calendar showing their current schedule with course blocks positioned by day and time | Must | Implemented |
| FR-SCHED.2 | Course blocks display: subject + course number, section number, schedule type, time range, and building/room | Must | Implemented |
| FR-SCHED.3 | Course blocks are color-coded by subject/course for visual distinction | Must | Implemented (3 subjects + fallback) |
| FR-SCHED.4 | The calendar grid spans Mon–Fri, 8 AM – 6 PM, with 30-minute row resolution | Must | Implemented |
| FR-SCHED.5 | A user can add a course section to their schedule workspace from search results | Must | Not Started (button rendered, no logic) |
| FR-SCHED.6 | A user can remove a course section from their schedule workspace | Must | Not Started |
| FR-SCHED.7 | A status banner shows the count of generated combinations and generation time | Must | Implemented (hardcoded values) |
| FR-SCHED.8 | A user can view generated schedule combinations in a scrollable grid | Must | Implemented |
| FR-SCHED.9 | Initially shows 3 combinations with a "Show More" toggle to reveal all | Should | Implemented |
| FR-SCHED.10 | Each combination card shows: combo number, total units, conflict status, and section details (course code, section number, days, times) | Must | Implemented |
| FR-SCHED.11 | Conflict-free combinations show a green "No Conflicts" indicator; conflicting ones show a red warning with conflict count | Must | Implemented |
| FR-SCHED.12 | A user can select a combination to preview it in the weekly calendar | Should | Not Started ("View Details" rendered, no logic) |
| FR-SCHED.13 | The color palette for course blocks dynamically assigns colors based on subjects in the current schedule | Could | Not Started (hardcoded to 3 subjects) |
| FR-SCHED.14 | A user can "lock" specific courses or sections in their current schedule workspace | Must | Partial (visual "Locked" state exists, no toggling) |

### Acceptance Criteria
- **FR-SCHED.1**: Calendar uses CSS grid positioning calculated from meeting time data: `startRow = floor((startMinutes - 480) / 30) + 1`.
- **FR-SCHED.5**: Adding a section adds the corresponding course (and all its linked sections if applicable) to the generation workspace.
- **FR-SCHED.12**: Selecting a combination updates the weekly calendar to show that combination's sections.
- **FR-SCHED.14**: Locking a course enforces that all generated combinations must retain this course.

---

## 5. Schedule Generation Engine

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-GEN.1 | Given a set of selected courses, a term, and optional locked sections, the system generates all valid (conflict-free) schedule combinations | Must | Spec Only |
| FR-GEN.2 | Each generated combination selects one section per course | Must | Spec Only |
| FR-GEN.3 | Linked sections (lecture + required lab/discussion) are treated as a unit during generation | Must | Spec Only |
| FR-GEN.4 | Time conflict detection compares meeting times across all sections for overlapping day + time | Must | Spec Only |
| FR-GEN.5 | The system can also generate "near-miss" combinations that have conflicts, with detailed conflict metadata | Could | Spec Only |
| FR-GEN.6 | Each generated schedule includes: course groups (containing selected sections and time blocks), total credits, total class minutes, earliest start time, latest end time, active days, days off, and total gap minutes | Must | Spec Only |
| FR-GEN.7 | Conflict details include: the two conflicting sections, the conflicting day, and the overlap start/end times | Should | Spec Only |
| FR-GEN.8 | The generation response includes a performance metric (generation time in seconds) | Should | Spec Only |
| FR-GEN.9 | The generator respects "locked sections" passed in the active workspace; generated combinations must contain the locked sections and fit any additional searched sections around them | Must | Not Started |
| FR-GEN.10 | The generator does not apply ranking or sorting; results are returned in arbitrary order for client display | Must | Not Started |

### Acceptance Criteria
- **FR-GEN.1**: Input is `{ courseIds: string[], termCode: string, lockedSectionIds?: string[] }`. Output is an array of `GeneratedSchedule` objects with `conflicts: 0` (or `conflicts > 0` for invalid generation).
- **FR-GEN.3**: If a student selects a lecture that has `linkIdentifier: "A"`, the generator automatically includes one of the linked labs/discussions with the same identifier.
- **FR-GEN.4**: Two sections conflict if they share at least one common day AND their time ranges overlap (i.e., `startA < endB && startB < endA`).
- **FR-GEN.6**: Output schema maps directly to `BACKEND_API.md` response shapes, returning a list of `groups` (where each group has a course's metadata and its chosen sections with day/time `blocks` converted to minutes from midnight) along with pre-calculated statistics like `totalClassMinutes` and `totalGapMinutes`.
- **FR-GEN.9**: If sections X and Y are passed in `lockedSectionIds`, and course Z is searched and added, every generated combination must include sections X and Y, plus a section of Z that does not conflict with X or Y.

---

## 6. Saved Schedules & Export

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-SAVE.1 | A user can save a schedule with a name, a set of section IDs, and a term code | Must | Spec Only |
| FR-SAVE.2 | A user can view a list of all their saved schedules, optionally filtered by term | Must | Spec Only |
| FR-SAVE.3 | A user can view a single saved schedule with full section details populated | Must | Spec Only |
| FR-SAVE.4 | A user can update a saved schedule's name or section list (partial updates) | Should | Spec Only |
| FR-SAVE.5 | A user can delete a saved schedule | Must | Spec Only |
| FR-SAVE.6 | Only the schedule owner can view, update, or delete their schedules (returns 403 for non-owners) | Must | Spec Only |
| FR-SAVE.7 | A user can analyze a saved schedule to see: total credits, total class hours, active days, days off, earliest start, latest end, conflicts, and gaps between classes | Should | Spec Only |
| FR-SAVE.8 | A user can export a schedule as an ICS calendar file (RFC 5545 compliant, America/Los_Angeles timezone) | Should | Spec Only |
| FR-SAVE.9 | ICS export is publicly accessible (no auth) via a shareable link for calendar subscription | Should | Spec Only |
| FR-SAVE.10 | ICS export supports customization options: reminder settings (primary/secondary), title format template, description toggles (instructor, email, CRN, section, units, delivery mode, seat count), location format, and async section handling | Could | Spec Only |

### Acceptance Criteria
- **FR-SAVE.7**: Gap analysis returns `{ day, after: Section, before: Section, gapMinutes, gapStart, gapEnd }` for each gap between consecutive classes on the same day.
- **FR-SAVE.8**: ICS file uses `RRULE:FREQ=WEEKLY` for recurring class meetings, with proper `VTIMEZONE` for `America/Los_Angeles`.
- **FR-SAVE.9**: Export URL format: `GET /schedules/:scheduleId/export.ics`. Rate limited at 30 req/min/IP.
- **FR-SAVE.10**: Options are passed as a base64url-encoded JSON `options` query parameter matching the `ExportOptions` schema in `BACKEND_API.md`. Invalid encoding or schema validation failures return 400.

---

## 7. Degree Awareness *(Deferred to Future Version)*

> [!WARNING]
> These requirements represent the full vision from the README but are deferred for v1. They require significant data infrastructure that does not yet exist.

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-DEG.1 | The system stores breadth/GE requirement designation codes for all 6 UCR colleges (119 codes) | Won't (v1) | Partial (reqs.json has codes, no course mapping) |
| FR-DEG.2 | The system maps courses to the requirements they satisfy, per college | Won't (v1) | Not Started |
| FR-DEG.3 | The system stores major-specific degree requirements (required courses, elective pools, unit minimums) | Won't (v1) | Not Started |
| FR-DEG.4 | A user can input their major, college, and catalog year to receive personalized requirement information | Won't (v1) | Not Started |
| FR-DEG.5 | A user can input previously completed courses to track degree progress | Won't (v1) | Not Started |
| FR-DEG.6 | The system shows which requirements are satisfied, in progress, and remaining | Won't (v1) | Not Started |
| FR-DEG.7 | The course search filters account for the student's major and college context | Won't (v1) | Not Started |
| FR-DEG.8 | A user can plan multiple future quarters with course selections toward graduation | Won't (v1) | Not Started |
| FR-DEG.9 | A user can use a saved schedule as a base to find additional courses that fit specific constraints (e.g., "ethnicity course, MWF mornings") | Won't (v1) | Not Started |

---

## 8. App Shell & Navigation

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-SHELL.1 | The app has a persistent sidebar (260px) with navigation links to: Schedule Builder, Course Search, Saved Schedules, and Settings | Must | Partial (7 links are rendered, 3 need removal) |
| FR-SHELL.2 | The active navigation item is visually highlighted | Must | Implemented |
| FR-SHELL.3 | The header displays a page title that updates based on the current route | Must | Implemented |
| FR-SHELL.4 | The sidebar displays a system status footer showing API health, rate limit usage, and app version | Could | Partial (hardcoded) |
| FR-SHELL.5 | The layout is responsive: 2-column (sidebar + content) on desktop, collapsible sidebar on mobile | Could | Partial (grid exists, no mobile collapse) |

---

## 9. Data Ingestion & Freshness

| ID | Requirement | Priority | Status |
|---|---|---|---|
| FR-SYNC.1 | An admin can trigger a data sync from UCR Banner SIS for a specific term and optional subject list | Must | Spec Only |
| FR-SYNC.2 | An admin can perform bulk ingestion of course and section data via a protected endpoint | Should | Spec Only |
| FR-SYNC.3 | Data sync supports partial failure (207 Multi-Status) — some items can fail while others succeed | Should | Spec Only |
| FR-SYNC.4 | Bulk ingestion uses upsert semantics (creates new records, updates existing ones) | Should | Spec Only |
| FR-SYNC.5 | Both sync endpoints are protected by an API key (INTAKE_API_KEY), not user JWT | Must | Spec Only |
| FR-SYNC.6 | Course/section enrollment details (open seats, waitlist counts) are synced periodically: every 15-30 minutes during registration, daily otherwise | Must | Not Started |

### Acceptance Criteria
- **FR-SYNC.1**: Input is `{ termCode, subjects?: string[] }`. Response includes `{ synced: { courses, sections }, errors }`.
- **FR-SYNC.4**: If a course with the same subject+courseNumber already exists for the term, it is updated rather than duplicated.
- **FR-SYNC.6**: A background cron or job triggers the `/sync` API endpoint with the current term to keep data reasonably fresh without overloading the partially documented Banner SIS API.

---

## Decided Scope & Constraints (v1)

### Page Scope
- **In-Scope**: Schedule Builder (`/schedule-builder`), Course Search (`/course-search`), Saved Schedules (`/saved-schedules`), Settings (`/settings`).
- **Deferred/Out-of-Scope**: Dashboard, Combos, Requirements.

### UCR Banner Integration
- Access is **partial**. No official Banner API keys or complete documentation are available, meaning the sync mechanism must be resilient to potential schema shifts and rate limiting.

### Enrollment Freshness
- Periodic background synchronization running every 15-30 minutes during peak registration periods and once daily during non-registration periods. Real-time querying is deferred.

### locked Course Logic
- Course-level locking acts as a hard filter for schedule generation. For example, if a user locks "CS 010A" and searches for "breadth courses in the morning", the generator will only output combinations that contain a valid "CS 010A" section alongside the search-matching sections.

---

## Revision History

| Date | Version | Changes |
|---|---|---|
| 2026-07-15 | 1.0 | Initial draft — extracted from spec. |
| 2026-07-15 | 1.1 | Finalized — incorporated answers on scope, sync frequency, locked course behavior, and sorting. |

