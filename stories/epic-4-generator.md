# Epic 4: Combinatorial Schedule Generation Engine

This epic covers the backend combination engine, backtracking solver, constraint verification, and conflict detection.

---

### US-4.1: Conflict-Free Schedule Permutations
- **As a** student taking multiple classes
- **I want to** run a solver that takes all my selected courses and generates every possible conflict-free combination of sections
- **So that** I do not have to manually cross-reference class times to find schedules that work

#### Acceptance Criteria
1. The `POST /generate` endpoint takes an array of course database IDs and a term code, returning all possible section permutations that have zero overlapping times.
2. The response returns combinations grouped by course, containing statistics like totalUnits, totalClassMinutes, totalGapMinutes, earliestStart, latestEnd, activeDays, and daysOff.
3. If no conflict-free combinations exist, the generator returns an empty list.

---

### US-4.2: Generation with Locked Sections
- **As a** student who has locked a specific section (e.g. a morning chemistry lecture)
- **I want** the combination generator to treat that locked section as a fixed constraint
- **So that** every output combination retains that section and only permutes the remaining unlocked courses

#### Acceptance Criteria
1. The generation input accepts an optional array `lockedSectionIds`.
2. The DFS backtracking engine registers these locked section IDs as fixed assignments.
3. The generator skips evaluating alternative sections for any course that has a locked section.
4. All generated schedules contain the exact locked sections provided in the input.

---

### US-4.3: Resolving Linked Lecture and Lab/Discussion Units
- **As a** student generating schedules for a science or engineering course
- **I want** the combination engine to treat lectures and their required labs/discussions as a single unit
- **So that** it only generates schedules where I am placed in a lab that is compatible with my lecture link identifier

#### Acceptance Criteria
1. The solver inspects `linkIdentifier` attributes on course sections.
2. If a selected lecture requires a linked component, the engine groups the lecture and companion lab/discussion together during permutation checking.
3. The generator rejects combinations where a lecture is paired with a lab/discussion that does not share its `linkIdentifier`.

---

### US-4.4: Near-Miss Schedule Generation
- **As a** student with a highly constrained course load
- **I want to** view "near-miss" schedules that have minor conflicts when no perfect schedule exists
- **So that** I can see if a conflict is minor enough to resolve manually (such as overlapping office hours or petitioning sections)

#### Acceptance Criteria
1. The `POST /generate/invalid` endpoint returns schedules containing one or more time conflicts.
2. Each invalid schedule combination contains a `conflictDetails` block specifying the conflicting sections, overlapping days, and exact overlap time ranges.
3. Near-miss schedules are returned only if no perfect schedules are found, or when specifically requested by the user.
