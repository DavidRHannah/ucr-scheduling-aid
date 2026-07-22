# Epic 5: Saved Schedules Management

This epic covers creating, reading, updating, deleting, and analyzing user-saved schedules.

---

### US-5.1: Save Active Schedule Configuration
- **As a** logged-in student user
- **I want to** save my current calendar schedule with a custom name
- **So that** I can retrieve it later or keep multiple options for comparison

#### Acceptance Criteria
1. Sending a POST request to `/schedules` containing a name, array of section IDs, and a term code creates a new schedule record in the database.
2. The saved schedule record is associated with the authenticated user's ID using token parameters.
3. The response returns the created schedule object with timestamps.

---

### US-5.2: Retrieve List of Saved Schedules
- **As a** logged-in student user
- **I want to** view a list of all my saved schedules, filtered by academic term
- **So that** I can review different draft options I created for the upcoming term

#### Acceptance Criteria
1. Sending a GET request to `/schedules` returns all schedules belonging to the authenticated user.
2. The user can pass an optional `termCode` query parameter to filter the returned list to a specific quarter.
3. Schedule list items display the schedule name, total units, creation date, and list of included course codes.

---

### US-5.3: Update and Rename Saved Schedule
- **As a** logged-in student user
- **I want to** rename or modify the sections of an existing saved schedule
- **So that** I can update my drafts as registration conditions shift

#### Acceptance Criteria
1. Sending a PATCH request to `/schedules/:id` allows partial updates to the schedule's name or section IDs list.
2. The endpoint verifies that the authenticated user is the owner of the schedule, returning 403 Forbidden if not.
3. The response returns the updated schedule object, and the `updatedAt` timestamp is updated.

---

### US-5.4: Delete Saved Schedule
- **As a** logged-in student user
- **I want to** delete a saved schedule that I no longer need
- **So that** my list of saved schedules remains clean and organized

#### Acceptance Criteria
1. Sending a DELETE request to `/schedules/:id` removes the schedule record from the database.
2. The endpoint verifies ownership before deletion, returning 403 Forbidden if the user is not the owner.
3. Attempting to delete a non-existent schedule returns 404 Not Found.

---

### US-5.5: Analyze Schedule Quality
- **As a** student comparing multiple schedules
- **I want to** run a quality analysis on a schedule to see class gaps, total active days, and earliest/latest start times
- **So that** I can choose the schedule that best fits my lifestyle (e.g., maximizing days off or avoiding long gaps)

#### Acceptance Criteria
1. Sending a GET request to `/schedules/:id/analyze` returns a report containing:
   - `totalCredits` and `totalClassMinutes`
   - `activeDays` and `daysOff`
   - `earliestStart` and `latestEnd` times
   - `conflicts` (if any exist)
   - `gaps` (list of gaps between back-to-back classes with start/end times and gap duration)
2. All time-based calculations use the `America/Los_Angeles` timezone.
3. The analysis fails with 403 if the user is not the schedule owner.
