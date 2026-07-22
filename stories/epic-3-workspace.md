# Epic 3: Interactive Schedule Workspace and Visualizer

This epic covers the active schedule building panel, calendar grid visualization, and course locking controls.

---

### US-3.1: Weekly Calendar Visualization
- **As a** student arranging my weekly schedule
- **I want to** view my scheduled classes on a weekly grid calendar spanning Monday through Friday
- **So that** I can easily spot gaps, early morning classes, and class sequences at a glance

#### Acceptance Criteria
1. The calendar is rendered as a grid representing Monday through Friday, 8:00 AM to 6:00 PM, with hourly guidelines.
2. Selected section blocks are positioned absolutely in their respective day columns and time rows based on start and end time parameters.
3. Each block displays the subject, course number, section code, time range, and building/room.
4. Class blocks are color-coded by course subject for clear visual separation.

---

### US-3.2: Adding Sections to Workspace
- **As a** student using the schedule builder
- **I want to** add a course section from the catalog search panel into my active workspace
- **So that** it is immediately rendered on the calendar and used to compile schedules

#### Acceptance Criteria
1. Clicking the "Add" button on a course section puts that section into the active generation workspace.
2. Adding a section that has a linked dependency (e.g. a lecture requiring a lab) automatically prompts or includes the corresponding linked sections.
3. The calendar updates immediately to show the newly added course blocks, and the combination counter updates.

---

### US-3.3: Removing Sections from Workspace
- **As a** student refactoring my draft schedule
- **I want to** remove a course or specific section from my active workspace
- **So that** it is removed from the calendar and excluded from schedule combination generation

#### Acceptance Criteria
1. The user can remove a course by clicking a delete/remove button on the calendar block or within the search workspace list.
2. Removing a course removes all associated sections (including linked labs/discussions) from the calendar.
3. The generator re-calculates combinations immediately upon removal.

---

### US-3.4: Course and Section Locking
- **As a** student committed to taking a specific class at a specific time
- **I want to** lock that course section on my calendar
- **So that** any generated schedule combinations are forced to keep that section fixed while searching for other classes around it

#### Acceptance Criteria
1. Pinned or locked sections show a distinct "Locked" badge and visual state on the calendar.
2. Locking a course section passes its ID in the lockedSectionIds list to the backend combination generator.
3. Generated combination cards only display options that preserve the locked section.
4. Unlocking the section restores it to a flexible state, permitting the generator to swap sections for that course.
