# Epic 2: Course Catalog Search and Browsing

This epic covers searching the catalog, applying academic filters, and inspecting course dependencies.

---

### US-2.1: Course Search by Keyword
- **As a** student building a schedule
- **I want to** search for courses using keywords matching course numbers, subject prefixes, or titles
- **So that** I can quickly locate specific courses like CS100 without scrolling the entire database

#### Acceptance Criteria
1. The search input matches keyword inputs against concatenated subject code + course number (e.g. "CS100", "CS 100") and course titles (e.g. "Software Construction") case-insensitively.
2. Results return matching records dynamically or upon clicking the search action.
3. If no matching courses are found, a clear message "No results match your filters" is displayed.

---

### US-2.2: Department and Subject Filtering
- **As a** student looking for courses in my major
- **I want to** filter the catalog search results by specific departments or subject codes
- **So that** I only see relevant courses offered by that department

#### Acceptance Criteria
1. Selecting a department filter (e.g., "Computer Science" or "CS") restricts the search results list to courses matching that subject code.
2. The department select dropdown lists all departments available in the active term catalog, dynamically loaded from database records.
3. Clearing the filter resets the list to show all departments.

---

### US-2.3: Course Level Filter
- **As an** undergraduate student
- **I want to** filter search results to distinguish between lower-division (1-99) and upper-division (100-199) courses
- **So that** I do not accidentally review advanced or graduate courses that I am ineligible to take

#### Acceptance Criteria
1. The course level filter has options for "All Levels", "Lower Division (1-99)", and "Upper Division (100-199)".
2. Selecting "Lower Division" displays courses where the numeric portion of the course number is less than 100.
3. Selecting "Upper Division" displays courses where the numeric portion is between 100 and 199.

---

### US-2.4: Prerequisite Inspection
- **As a** student planning my academic path
- **I want to** view the prerequisite tree for a course directly within the search panel
- **So that** I know if I qualify to enroll in the course before attempting to schedule it

#### Acceptance Criteria
1. The course details or cards display prerequisites grouped by logic pools.
2. Within a logic group, prerequisites are separated by "OR" labels (satisfying any satisfies the group).
3. Logic groups are separated by "AND" boundaries (all groups must be satisfied).
4. Each prerequisite lists the minimum required grade and whether concurrent enrollment is permitted.

---

### US-2.5: Linked Section Association
- **As a** student enrolling in a lecture course
- **I want to** see which laboratory or discussion sections are linked to that lecture
- **So that** I know I must register for both components together

#### Acceptance Criteria
1. Expanding a course card displays all available sections categorized by schedule type (e.g. Lecture, Lab, Discussion).
2. Lecture sections with required companion labs or discussions are marked with link indicators.
3. Selecting a lecture highlights or groups only the corresponding discussions/labs that share its link identifier.
