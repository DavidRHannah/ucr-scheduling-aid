# Epic 7: Banner SIS Ingestion and Freshness Pipeline

This epic covers administrative ingestion endpoints, synchronization protocols, and catalog data freshness strategies.

---

### US-7.1: Admin-Triggered Catalog Sync
- **As an** application administrator
- **I want to** trigger a course catalog synchronization from the external UCR Banner student system for a specific term and subject list
- **So that** the application database stays in sync with catalog additions and course deletions

#### Acceptance Criteria
1. Sending a POST request to `/sync` with a valid `termCode` and optional array of `subjects` triggers data extraction from the Banner API.
2. The endpoint is protected by a strong, header-based API key (`INTAKE_API_KEY`). Requests without this key return 401 Unauthorized.
3. The synchronization process handles partial failures (returns 207 Multi-Status) if some subject downloads fail while others succeed.
4. The response returns the count of courses and sections successfully synced.

---

### US-7.2: Bulk Intake Upsert
- **As an** automated ingestion pipeline
- **I want to** load large quantities of course and section records directly into the database in bulk
- **So that** I can rapidly initialize the catalog database for new terms

#### Acceptance Criteria
1. Sending a POST request to `/intake` accepts a payload containing arrays of full Course and Section objects.
2. The endpoint requires `INTAKE_API_KEY` validation.
3. The ingestion engine executes database bulk upserts, creating new course/section records or updating existing ones if their unique identifiers (like CRN + termCode) already exist.

---

### US-7.3: Scheduled Ingestion Loop for Seat Freshness
- **As a** student seeking open course sections
- **I want** the application to periodically update class enrollment and waitlist totals
- **So that** I do not generate schedules around classes that have already filled up

#### Acceptance Criteria
1. A background cron worker triggers the `/sync` endpoint for the active registration term.
2. During active registration periods, the sync process runs every 15-30 minutes to capture enrollment totals, waitlist numbers, and section Open/Closed status.
3. During non-registration periods, the sync runs once daily to refresh basic catalog records.
4. Ingestion errors are captured in logging systems, and existing database data is retained if a sync request fails.
