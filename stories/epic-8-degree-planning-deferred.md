# Epic 8: Degree Awareness and Quarter Maps (Deferred)

This epic tracks out-of-scope, deferred user stories mapping the long-term vision of degree-aware schedules, college requirement verification, and multi-quarter maps.

---

### US-8.1: Major and College Selection
- **As a** student planning my academic track
- **I want to** select my declared college and major
- **So that** the system can customize search filters and graduation requirements to my degree path

#### Acceptance Criteria (Future)
1. The student can select their major, college, and catalog year in their profile settings.
2. The user interface updates to display breadth and depth requirements customized to that major.

---

### US-8.2: Catalog Breadth Requirement Verification
- **As a** student trying to satisfy general education (GE) requirements
- **I want the system to** verify whether my schedule choices satisfy specific college breadth categories (e.g. Humanities, Natural Science)
- **So that** I know I am making progress toward graduation

#### Acceptance Criteria (Future)
1. The system matches courses in a student's schedule against college-level requirement codes (e.g. `BEMA` or `BEAD` mapping tables).
2. The UI renders checkmarks or progress bars showing which general education categories are satisfied, in progress, or remaining.

---

### US-8.3: Major Requirement Matching
- **As a** student seeking to satisfy major-specific requirements
- **I want the system to** check if my schedule satisfies required core classes or elective depth sequences for my major
- **So that** I do not miss critical milestone courses

#### Acceptance Criteria (Future)
1. The system models major-specific degree require trees (e.g., matching the course catalog arrays in `EN-AbetDepth.json`).
2. The schedule visualizer alerts the student if they have scheduled a course that does not align with their major requirements or milestone recommendations.

---

### US-8.4: Prior Academic History Log
- **As a** returning student user
- **I want to** log my completed courses, transfer credits, and AP/IB scores
- **So that** the application can filter out requirements I have already satisfied

#### Acceptance Criteria (Future)
1. The student profile contains an interactive transcript log where they can add previously completed courses.
2. Requirement check lists automatically mark completed courses as satisfied and verify prerequisite gates using this history log.

---

### US-8.5: Multi-Quarter Graduation Planner
- **As a** student planning my academic track over multiple years
- **I want to** build and visualize a quarter-by-quarter schedule mapping out all courses until graduation
- **So that** I can ensure I finish my degree on time

#### Acceptance Criteria (Future)
1. The application provides a multi-quarter planner grid representing future academic years (Fall, Winter, Spring, Summer).
2. The user can drag and drop courses into future quarters.
3. The system highlights validation warnings if a course is placed in a quarter before its prerequisites are scheduled.
