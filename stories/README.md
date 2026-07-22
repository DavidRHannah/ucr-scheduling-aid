# UCR Scheduling Aid backlog - Epics and User Stories

This directory contains the product backlog, structured into epics and individual user stories. These stories align directly with the requirements specified in the requirements directory.

## Epics Overview

- [Epic 1: Authentication and Session Management](epic-1-auth.md)
  Status: In Scope (v1 backlog)
  Focuses on registration, login, session validation, and security protocols.

- [Epic 2: Course Catalog Search and Browsing](epic-2-catalog.md)
  Status: In Scope (v1 backlog)
  Focuses on keywords, filters, course level details, and prerequisite viewing.

- [Epic 3: Interactive Schedule Workspace and Visualizer](epic-3-workspace.md)
  Status: In Scope (v1 backlog)
  Focuses on the weekly calendar layout, adding/removing sections, and course locking.

- [Epic 4: Combinatorial Schedule Generation Engine](epic-4-generator.md)
  Status: In Scope (v1 backlog)
  Focuses on conflict-free combination computation, locked section constraint handling, and linked lecture/lab resolving.

- [Epic 5: Saved Schedules Management](epic-5-saved-schedules.md)
  Status: In Scope (v1 backlog)
  Focuses on user schedule CRUD operations, gap metrics, and calendar analysis.

- [Epic 6: External iCalendar Export Integration](epic-6-export.md)
  Status: In Scope (v1 backlog)
  Focuses on generating RFC 5545 calendar feeds and custom subscription options.

- [Epic 7: Banner SIS Ingestion and Freshness Pipeline](epic-7-sync.md)
  Status: In Scope (v1 backlog)
  Focuses on admin endpoints, automated synchronization, and cached seat capacities.

- [Epic 8: Degree Awareness and Quarter Maps](epic-8-degree-planning-deferred.md)
  Status: Deferred (v2 / Future backlog)
  Focuses on college requirement verification, course-to-breadth maps, and multi-quarter path planning.

## Backlog Conventions

Each user story is structured using the standard agile template:

```markdown
### US-[ID]: [Story Title]
- **As a** [user role]
- **I want to** [actionable capability]
- **So that** [underlying value/benefit]

#### Acceptance Criteria
1. [Condition 1]
2. [Condition 2]
```

All IDs correspond to the functional requirements (`FR-` prefix) in the requirements folder.
