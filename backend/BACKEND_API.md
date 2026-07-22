# Schedule Maker API Documentation

This document provides a detailed overview of the Schedule Maker backend API. It's intended for developers who need to interact with the API.

## Base URL

All API endpoints are relative to the base URL:

`[YOUR_BASE_URL]/api`

For local development, this is typically `http://localhost:3000/api`.

## Authentication

The API uses JSON Web Tokens (JWT) for authentication. To access protected routes, you must include an `Authorization` header with the value `Bearer <token>`.

**Example:** `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

A token can be obtained from the `POST /auth/login` endpoint.

---

## API Reference

### Auth

Provides endpoints for user authentication.

#### `POST /auth/register`

Registers a new user in the system.

- **Request Body:**
 ```json
 {
 "email": "user@example.com",
 "password": "a-strong-password",
 "displayName": "Test User"
 }
 ```
- **Responses:**
 - `201 Created`: User successfully created.
 ```json
 {
 "user": {
 "id": "507f1f77bcf86cd799439011",
 "email": "user@example.com",
 "displayName": "Test User"
 },
 "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 }
 ```
 - `400 Bad Request`: Invalid input (e.g., missing fields, password shorter than 6 characters).
 - `409 Conflict`: A user with that email already exists.

#### `POST /auth/login`

Logs in a user and returns a JWT.

- **Request Body:**
 ```json
 {
 "email": "user@example.com",
 "password": "a-strong-password"
 }
 ```
- **Responses:**
 - `200 OK`: Login successful.
 ```json
 {
 "user": {
 "id": "507f1f77bcf86cd799439011",
 "email": "user@example.com",
 "displayName": "Test User"
 },
 "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 }
 ```
 - `401 Unauthorized`: Invalid credentials.

### Courses

Provides endpoints for retrieving course information.

#### `GET /courses`

Retrieves a paginated list of courses. Supports filtering by subject and full-text search.

- **Query Parameters:**
 - `search` (string, optional): A search term to filter courses by subject, course number, or title.
 - `subject` (string, optional): Filter by subject code (e.g., "CS").
 - `page` (number, optional): Page number (default: 1).
 - `limit` (number, optional): Results per page (default: 5, max: 50).
- **Responses:**
 - `200 OK`: A paginated object containing course results.
 ```json
 {
 "data": [
 {
 "_id": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "subjectDescription": "Computer Science",
 "courseNumber": "152",
 "title": "COMPILER DESIGN",
 "description": "Introduction to compiler construction...",
 "creditHours": { "low": 4, "high": 4 },
 "college": { "code": "CENG", "description": "College of Engineering" },
 "department": { "code": "CS", "description": "Computer Science" },
 "isUndergraduate": true,
 "isGraduate": false
 }
 ],
 "total": 142,
 "page": 1,
 "totalPages": 29
 }
 ```

#### `GET /courses/:id`

Retrieves a single course by its unique ID.

- **Path Parameters:**
 - `id` (string): The ID of the course.
- **Responses:**
 - `200 OK`: The requested course object.
 ```json
 {
 "_id": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "subjectDescription": "Computer Science",
 "courseNumber": "152",
 "title": "COMPILER DESIGN",
 "description": "Introduction to compiler construction...",
 "creditHours": { "low": 4, "high": 4 },
 "college": { "code": "CENG", "description": "College of Engineering" },
 "department": { "code": "CS", "description": "Computer Science" },
 "isUndergraduate": true,
 "isGraduate": false
 }
 ```
 - `404 Not Found`: Course not found.

#### `GET /courses/:id/prerequisites`

Retrieves the prerequisites for a single course, grouped by logic group. Prerequisites within the same group are OR'd; groups are AND'd together.

- **Path Parameters:**
 - `id` (string): The ID of the course.
- **Responses:**
 - `200 OK`: A grouped prerequisite object.
 ```json
 {
 "courseId": "683d1a2b4f1c2d3e4f5a6b7c",
 "groups": [
 {
 "logicGroup": "group1",
 "options": [
 {
 "course": {
 "_id": "683d1a2b4f1c2d3e4f5a6b7d",
 "subject": "CS",
 "subjectDescription": "Computer Science",
 "courseNumber": "101",
 "title": "INTRO TO COMPUTER SCIENCE",
 "creditHours": { "low": 3, "high": 3 },
 "isUndergraduate": true,
 "isGraduate": false
 },
 "minGrade": "C",
 "concurrentAllowed": false
 }
 ]
 }
 ]
 }
 ```
 - `404 Not Found`: Course not found.

### Requirements

#### `GET /requirements`

Retrieves a list of all GE/breadth requirement designations in the catalog. Sourced from the college requirements repository.

- **Responses:**
  - `200 OK`: Returns an array of Requirement objects.
  ```json
  [
    {
      "code": "BEAD",
      "description": "EN-ABET Depth"
    },
    {
      "code": "BEMA",
      "description": "EN-Nat Sci - Math/Stat/CS"
    }
  ]
  ```

### Sections

Provides endpoints for retrieving course section information.

#### `GET /sections/course/:courseId`

Retrieves all sections for a given course ID.

- **Path Parameters:**
 - `courseId` (string): The ID of the course.
- **Query Parameters:**
 - `termCode` (string, optional): Filter sections by term.
- **Responses:**
 - `200 OK`: An array of section objects.
 ```json
 [
 {
 "_id": "683d1a2b4f1c2d3e4f5a6b8a",
 "courseId": "683d1a2b4f1c2d3e4f5a6b7c",
 "termCode": "202620",
 "crn": "12345",
 "sectionNumber": "001",
 "scheduleType": { "code": "LEC", "description": "Lecture" },
 "instructionalMethod": { "code": "IP", "description": "In-Person" },
 "instructors": [
 {
 "primary": true,
 "displayName": "Smith, J"
 }
 ],
 "enrollmentMax": 30,
 "enrollmentCurrent": 25,
 "waitlistTotal": 5,
 "waitlistRemaining": 3,
 "status": "Open",
 "linkIdentifier": null,
 "possibleLinks": ["A1"],
 "meetingTimes": [
 {
 "weekDays": ["M", "W", "F"],
 "startTime": "10:00",
 "endTime": "10:50",
 "meetingType": { "code": "LEC", "description": "Lecture" },
 "buildingDescription": "Materials Sci and Engineering",
 "room": "104",
 "startDate": "2026-01-12T00:00:00.000Z",
 "endDate": "2026-05-08T00:00:00.000Z"
 }
 ]
 }
 ]
 ```

#### `GET /sections/crn/:crn`

Retrieves a section by its CRN (Course Reference Number) for a specific term. The `courseId` field is populated with the full course object.

- **Path Parameters:**
 - `crn` (string): The CRN of the section.
- **Query Parameters:**
 - `termCode` (string, required): The term code for the section.
- **Responses:**
 - `200 OK`: The requested section object (with `courseId` populated).
 ```json
 {
 "_id": "683d1a2b4f1c2d3e4f5a6b8a",
 "courseId": {
 "_id": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "subjectDescription": "Computer Science",
 "courseNumber": "152",
 "title": "COMPILER DESIGN",
 "creditHours": { "low": 4, "high": 4 },
 "isUndergraduate": true,
 "isGraduate": false
 },
 "termCode": "202620",
 "crn": "12345",
 "sectionNumber": "001",
 "scheduleType": { "code": "LEC", "description": "Lecture" },
 "instructionalMethod": { "code": "IP", "description": "In-Person" },
 "instructors": [
 { "primary": true, "displayName": "Smith, J" }
 ],
 "enrollmentMax": 30,
 "enrollmentCurrent": 25,
 "status": "Open",
 "linkIdentifier": null,
 "possibleLinks": [],
 "meetingTimes": [
 {
 "weekDays": ["M", "W", "F"],
 "startTime": "10:00",
 "endTime": "10:50",
 "meetingType": { "code": "LEC", "description": "Lecture" },
 "buildingDescription": "Materials Sci and Engineering",
 "room": "104",
 "startDate": "2026-01-12T00:00:00.000Z",
 "endDate": "2026-05-08T00:00:00.000Z"
 }
 ]
 }
 ```
 - `404 Not Found`: Section not found.

#### `GET /sections/:id`

Retrieves a single section by its unique ID. The `courseId` field is populated with the full course object.

- **Path Parameters:**
 - `id` (string): The ID of the section.
- **Responses:**
 - `200 OK`: The requested section object (same shape as `GET /sections/crn/:crn` above).
 - `404 Not Found`: Section not found.

#### `GET /sections/:id/linked`

Retrieves sections that are linked to a specific section (e.g., a required lab or discussion), grouped by link identifier.

- **Path Parameters:**
 - `id` (string): The ID of the section.
- **Responses:**
 - `200 OK`: An array of linked section groups. Returns an empty array if no linked sections exist.
 ```json
 [
 {
 "linkIdentifier": "A1",
 "scheduleType": "Laboratory",
 "options": [
 {
 "_id": "683d1a2b4f1c2d3e4f5a6b8b",
 "courseId": {
 "_id": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "courseNumber": "152",
 "title": "COMPILER DESIGN",
 "creditHours": { "low": 4, "high": 4 }
 },
 "termCode": "202620",
 "crn": "12346",
 "sectionNumber": "L01",
 "scheduleType": { "code": "LAB", "description": "Laboratory" },
 "instructionalMethod": { "code": "IP", "description": "In-Person" },
 "instructors": [
 { "primary": true, "displayName": "Doe, A" }
 ],
 "enrollmentMax": 20,
 "enrollmentCurrent": 15,
 "status": "Open",
 "linkIdentifier": "A1",
 "possibleLinks": [],
 "meetingTimes": [
 {
 "weekDays": ["T"],
 "startTime": "14:00",
 "endTime": "15:50",
 "meetingType": { "code": "LAB", "description": "Laboratory" },
 "buildingDescription": "Science Hall",
 "room": "210",
 "startDate": "2026-01-12T00:00:00.000Z",
 "endDate": "2026-05-08T00:00:00.000Z"
 }
 ]
 }
 ]
 }
 ]
 ```

### Terms

Provides endpoints for retrieving academic term information. Term data is fetched from the external SIS API.

#### `GET /terms`

Retrieves a list of all available academic terms.

- **Responses:**
 - `200 OK`: An array of term objects.
 ```json
 [
 {
 "id": "662f2b1a4c3d5e6f7a8b9c0d",
 "code": "202620",
 "title": "Spring 2026",
 "start": { "year": 2026, "month": 1, "day": 12 },
 "end": { "year": 2026, "month": 5, "day": 8 },
 "category": { "type": "semester" }
 },
 {
 "id": "662f2b1a4c3d5e6f7a8b9c0e",
 "code": "202610",
 "title": "Fall 2025",
 "start": { "year": 2025, "month": 8, "day": 25 },
 "end": { "year": 2025, "month": 12, "day": 12 },
 "category": { "type": "semester" }
 }
 ]
 ```

#### `GET /terms/current`

Retrieves the current academic term.

- **Responses:**
 - `200 OK`: The current term object.
 ```json
 {
 "id": "662f2b1a4c3d5e6f7a8b9c0d",
 "code": "202620",
 "title": "Spring 2026",
 "start": { "year": 2026, "month": 1, "day": 12 },
 "end": { "year": 2026, "month": 5, "day": 8 },
 "category": { "type": "semester" }
 }
 ```

### Schedules

Provides endpoints for managing user-created schedules. All endpoints require authentication. Schedule responses populate `sectionIds` with full section objects (which in turn have `courseId` populated with the full course).

#### `GET /schedules`

Retrieves all schedules for the authenticated user.

- **Query Parameters:**
 - `termCode` (string, optional): Filter schedules by term.
- **Responses:**
 - `200 OK`: An array of the user's schedule objects (populated).
 ```json
 [
 {
 "_id": "683d1a2b4f1c2d3e4f5a6c01",
 "userId": "507f1f77bcf86cd799439011",
 "termCode": "202620",
 "name": "Spring 2026",
 "sectionIds": [
 {
 "_id": "683d1a2b4f1c2d3e4f5a6b8a",
 "courseId": {
 "_id": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "subjectDescription": "Computer Science",
 "courseNumber": "152",
 "title": "COMPILER DESIGN",
 "creditHours": { "low": 4, "high": 4 },
 "isUndergraduate": true,
 "isGraduate": false
 },
 "termCode": "202620",
 "crn": "12345",
 "sectionNumber": "001",
 "scheduleType": { "code": "LEC", "description": "Lecture" },
 "instructionalMethod": { "code": "IP", "description": "In-Person" },
 "instructors": [
 { "primary": true, "displayName": "Smith, J" }
 ],
 "enrollmentMax": 30,
 "enrollmentCurrent": 25,
 "status": "Open",
 "linkIdentifier": null,
 "possibleLinks": [],
 "meetingTimes": [
 {
 "weekDays": ["M", "W", "F"],
 "startTime": "10:00",
 "endTime": "10:50",
 "meetingType": { "code": "LEC", "description": "Lecture" },
 "buildingDescription": "Materials Sci and Engineering",
 "room": "104",
 "startDate": "2026-01-12T00:00:00.000Z",
 "endDate": "2026-05-08T00:00:00.000Z"
 }
 ]
 }
 ],
 "createdAt": "2026-03-20T12:00:00.000Z",
 "updatedAt": "2026-03-20T12:00:00.000Z"
 }
 ]
 ```

#### `GET /schedules/:id`

Retrieves a single schedule by its ID. The user must be the owner of the schedule.

- **Path Parameters:**
 - `id` (string): The ID of the schedule.
- **Responses:**
 - `200 OK`: The requested schedule object (same populated shape as `GET /schedules` above).
 - `404 Not Found`: Schedule not found or user does not have permission.

#### `POST /schedules`

Creates a new schedule for the authenticated user.

- **Request Body:**
 ```json
 {
 "name": "Fall 2024",
 "sectionIds": ["section-id-1", "section-id-2"],
 "termCode": "202430"
 }
 ```
- **Responses:**
 - `201 Created`: The newly created schedule object (populated, same shape as `GET /schedules/:id`).

#### `PATCH /schedules/:id`

Updates a schedule's details (e.g., its name or sections).

- **Path Parameters:**
 - `id` (string): The ID of the schedule to update.
- **Request Body (partial updates allowed):**
 ```json
 {
 "name": "My Updated Schedule Name",
 "sectionIds": ["section-id-3"]
 }
 ```
- **Responses:**
 - `200 OK`: The updated schedule object (populated, same shape as `GET /schedules/:id`).
 - `404 Not Found`: Schedule not found or user does not have permission.

#### `DELETE /schedules/:id`

Deletes a schedule.

- **Path Parameters:**
 - `id` (string): The ID of the schedule to delete.
- **Responses:**
 - `204 No Content`: Successfully deleted.
 - `404 Not Found`: Schedule not found or user does not have permission.

#### `GET /schedules/:id/analyze`

Analyzes a schedule and returns insights, such as time conflicts or credit hour totals.

- **Path Parameters:**
 - `id` (string): The ID of the schedule to analyze.
- **Responses:**
 - `200 OK`: An analysis object with schedule statistics.
 ```json
 {
 "scheduleId": "683d1a2b4f1c2d3e4f5a6c01",
 "scheduleName": "Spring 2026",
 "termCode": "202620",
 "totalUnits": 15,
 "totalClassMinutes": 750,
 "totalClassHours": 12.5,
 "activeDays": ["M", "T", "W", "R", "F"],
 "daysOff": [],
 "earliestStart": "08:00",
 "latestEnd": "16:50",
 "gaps": [
 {
 "day": "M",
 "minutes": 70,
 "between": ["CS 152 Lecture 001", "MATH 251 Lecture 001"]
 }
 ],
 "totalGapMinutes": 70,
 "conflicts": [
 {
 "day": "T",
 "sectionA": "CS 152 Lecture 001",
 "sectionB": "PHYS 200 Lecture 001",
 "overlapStart": "10:00",
 "overlapEnd": "10:50"
 }
 ],
 "hasConflicts": true
 }
 ```

#### `GET /schedules/:scheduleId/export.ics`

Generates and downloads an ICS (iCalendar) file for a schedule. **This is a public endpoint** — no authentication is required, making it suitable for shareable calendar subscription links.

- **Rate Limiting:** 30 requests per minute per IP.
- **Path Parameters:**
 - `scheduleId` (string): The ID of the schedule to export.
- **Query Parameters:**
 - `options` (string, optional): A base64url-encoded JSON object containing export customization options (see [ExportOptions](#exportoptions) below). When omitted, all defaults are applied.
- **Responses:**
 - `200 OK`: Returns an `.ics` file download.
 - `Content-Type: text/calendar; charset=utf-8`
 - `Content-Disposition: attachment; filename="ucr-schedule-{termCode}.ics"`
 - The body is a valid RFC 5545 iCalendar string. Each section's meeting pattern becomes a separate `VEVENT` with a weekly recurrence rule (`RRULE`). All events use the `America/Los_Angeles` timezone.
 - `400 Bad Request`: Invalid `options` parameter (not valid base64url-encoded JSON, or fails schema validation).
 ```json
 {
 "message": "Invalid export options: reminder.primary: Invalid input"
 }
 ```
 - `404 Not Found`: Schedule not found.
 - `429 Too Many Requests`: Rate limit exceeded.
 ```json
 {
 "error": "Too many export requests, please try again later."
 }
 ```

**Example usage (default options):**
```
GET /api/schedules/683d1a2b4f1c2d3e4f5a6c01/export.ics
```

**Example usage (custom options):**
```
GET /api/schedules/683d1a2b4f1c2d3e4f5a6c01/export.ics?options=eyJyZW1pbmRlciI6eyJwcmltYXJ5IjoxNX19
```
The `options` value above decodes to `{"reminder":{"primary":15}}` — only the overridden fields need to be provided; all other options use their defaults.

##### ExportOptions

All fields are optional. When the `options` query parameter is omitted entirely, the full default configuration is applied.

**`reminder`** — Calendar reminders (VALARM)

| Field | Type | Default | Description |
|---|---|---|---|
| `primary` | `null \| 5 \| 10 \| 15 \| 20 \| 30 \| 60` | `10` | Minutes before the event to trigger a reminder. `null` disables the primary reminder. |
| `secondary` | `object \| null` | `null` | An optional second reminder. See below. |

The `secondary` reminder is a discriminated union on `type`:
- `{ "type": "minutes_before", "value": 5 | 10 | 15 | 20 | 30 | 60 }` — triggers N minutes before the event.
- `{ "type": "morning_of", "value": 0–23 }` — triggers at the given hour (0–23) on the morning of the event.

**`titleFormat`** — Event title customization

| Field | Type | Default | Description |
|---|---|---|---|
| `template` | string (max 200) | `"{subject}{number} - {title}"` | Title template with token placeholders. |
| `titleCase` | boolean | `false` | Convert the final title to title case. |

Available tokens: `{subject}`, `{number}`, `{title}`, `{scheduleType}`, `{scheduleTypeFull}`, `{section}`, `{crn}`

**`description`** — Event description fields

| Field | Type | Default | Description |
|---|---|---|---|
| `includeInstructor` | boolean | `true` | Include instructor name. |
| `includeInstructorEmail` | boolean | `true` | Include instructor email (derived as `{userName}@email.ucr.edu`). |
| `includeCrn` | boolean | `true` | Include the CRN. |
| `includeSection` | boolean | `false` | Include section number. |
| `includeUnits` | boolean | `false` | Include credit hours. |
| `includeDeliveryMode` | boolean | `false` | Include instructional method (e.g., "In-Person"). |
| `includeSeatCount` | boolean | `false` | Include enrollment/seat counts. |

**`location`** — Event location detail

| Field | Type | Default | Description |
|---|---|---|---|
| `detailLevel` | `"building" \| "building_room" \| "building_room_map"` | `"building_room"` | Level of location detail. `"building_room_map"` appends a Google Maps link to the description. |

**`asyncSections`** — Handling of asynchronous (online, no set meeting time) sections

| Field | Type | Default | Description |
|---|---|---|---|
| `include` | boolean | `false` | Whether to create placeholder events for async sections. |
| `dayOfWeek` | number (1–7) | `1` | Day of the week for the placeholder (1=Monday, 7=Sunday). |
| `time` | string (`HH:mm`) | `"09:00"` | Start time for the placeholder event. |
| `durationMinutes` | number (15–480) | `60` | Duration of the placeholder event. |

**`colorCoding`** — Event categorization

| Field | Type | Default | Description |
|---|---|---|---|
| `mode` | `"none" \| "by_type" \| "by_course"` | `"none"` | Sets the `CATEGORIES` ICS property. `"by_type"` uses the schedule type (e.g., "Lecture"), `"by_course"` uses the subject+number (e.g., "CS152"). |

### Generator

The core of the application, this endpoint generates possible schedules based on a list of desired courses.

#### `POST /generate`

Generates valid, conflict-free schedules from a given list of course IDs and a term code.

- **Rate Limiting:** This endpoint has a stricter rate limit.
- **Request Body:**
 ```json
 {
 "courseIds": ["course-id-1", "course-id-2", "course-id-3"],
 "termCode": "202430"
 }
 ```
- **Responses:**
 - `200 OK`: Returns an object containing the total number of schedules found and an array of generated schedules.
 ```json
 {
 "total": 2,
 "schedules": [
 {
 "groups": [
 {
 "courseId": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "courseNumber": "152",
 "title": "COMPILER DESIGN",
 "creditHours": { "low": 4, "high": 4 },
 "sections": [
 {
 "sectionId": "683d1a2b4f1c2d3e4f5a6b8a",
 "crn": "12345",
 "sectionNumber": "001",
 "scheduleType": { "code": "LEC", "description": "Lecture" },
 "instructionalMethod": { "code": "IP", "description": "In-Person" },
 "instructors": [
 { "primary": true, "displayName": "Smith, J" }
 ],
 "enrollmentMax": 30,
 "enrollmentCurrent": 25,
 "meetingTimes": [
 {
 "weekDays": ["M", "W", "F"],
 "startTime": "10:00",
 "endTime": "10:50",
 "meetingType": { "code": "LEC", "description": "Lecture" },
 "buildingDescription": "Materials Sci and Engineering",
 "room": "104",
 "startDate": "2026-01-12T00:00:00.000Z",
 "endDate": "2026-05-08T00:00:00.000Z"
 }
 ],
 "blocks": [
 { "day": "M", "start": 600, "end": 650 },
 { "day": "W", "start": 600, "end": 650 },
 { "day": "F", "start": 600, "end": 650 }
 ]
 }
 ]
 }
 ],
 "totalUnits": 4,
 "totalClassMinutes": 150,
 "earliestStart": "10:00",
 "latestEnd": "10:50",
 "activeDays": ["M", "W", "F"],
 "daysOff": ["T", "R"],
 "totalGapMinutes": 0
 }
 ]
 }
 ```

#### `POST /generate/invalid`

Generates schedules that may have conflicts. Useful for finding near-matches when no perfect schedule exists.

- **Request Body:** Same as `/generate`.
- **Responses:**
 - `200 OK`: Returns an object containing the total and an array of schedules with conflict details.
 ```json
 {
 "total": 1,
 "schedules": [
 {
 "groups": [ "..." ],
 "totalUnits": 7,
 "conflicts": [
 {
 "sectionA": {
 "courseId": "683d1a2b4f1c2d3e4f5a6b7c",
 "subject": "CS",
 "courseNumber": "152",
 "sectionNumber": "001",
 "crn": "12345",
 "scheduleType": "Lecture"
 },
 "sectionB": {
 "courseId": "683d1a2b4f1c2d3e4f5a6b7d",
 "subject": "MATH",
 "courseNumber": "251",
 "sectionNumber": "001",
 "crn": "12400",
 "scheduleType": "Lecture"
 },
 "day": "M",
 "overlapStart": "10:00",
 "overlapEnd": "10:50"
 }
 ]
 }
 ]
 }
 ```

### Data Sync (Protected)

These endpoints are used for administrative purposes to ingest and synchronize data from an external Student Information System (SIS). They require a special API key for authorization.

#### `POST /sync`

Synchronizes course and section data for a given term and optional list of subjects from the SIS.

- **Authorization:** Requires `INTAKE_API_KEY`.
- **Request Body:**
 ```json
 {
 "termCode": "202430",
 "subjects": ["CS", "MATH"]
 }
 ```
- **Responses:**
 - `200 OK`: Sync completed successfully.
 - `207 Multi-Status`: Sync completed with some errors. The response body will contain details about the errors.

#### `POST /intake`

Performs a bulk ingestion of course and section data. This is used for large-scale data loading.

- **Authorization:** Requires `INTAKE_API_KEY`.
- **Request Body:** A large JSON object containing term code, an array of courses, and an array of sections.
- **Responses:**
 - `200 OK`: Ingest completed successfully.
 - `207 Multi-Status`: Ingest completed with some errors. The response body will contain details about the errors.

---

## Data Models

### Shared Types

#### CodeDescription

A reusable object used for `scheduleType`, `instructionalMethod`, `meetingType`, `college`, and `department` fields.

| Field | Type | Description |
|---|---|---|
| `code` | string | Short code (e.g., "LEC", "LAB", "IP"). |
| `description` | string | Human-readable label (e.g., "Lecture", "Laboratory", "In-Person"). |

#### Instructor

Represents an instructor assigned to a section.

| Field | Type | Description |
|---|---|---|
| `primary` | boolean | Whether this is the primary instructor. |
| `percentage` | number? | Optional enrollment percentage. |
| `userName` | string? | Optional system username. |
| `displayName` | string? | Display name (e.g., "Smith, J"). |

#### MeetingTime

Represents a recurring meeting time and location for a section.

| Field | Type | Description |
|---|---|---|
| `weekDays` | Array<WeekDay> | Days of the week: `M`, `T`, `W`, `R` (Thursday), `F`, `S`, `U` (Sunday). |
| `startTime` | string | Start time in 24-hour `"HH:mm"` format (e.g., `"14:30"`). |
| `endTime` | string | End time in 24-hour `"HH:mm"` format. |
| `meetingType` | CodeDescription | Type of meeting (e.g., Lecture, Lab). |
| `buildingCode` | string? | Building code. |
| `buildingDescription` | string? | Building name. |
| `room` | string? | Room number. |
| `startDate` | Date | Start date of the meeting period. |
| `endDate` | Date | End date of the meeting period. |

#### Term

Term data comes from the external SIS API and is not stored in the database.

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier from the SIS. |
| `code` | string? | Term code (e.g., "202620"). |
| `title` | string | Display title (e.g., "Spring 2026"). |
| `start` | object? | Start date with `year`, `month`, `day` number fields. |
| `end` | object? | End date with `year`, `month`, `day` number fields. |
| `category` | object? | Category with a `type` string field (e.g., "semester"). |

### User

Represents a user account.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the user. |
| `email` | string | User's unique email address (lowercase, trimmed). |
| `displayName` | string | The user's display name. |
| `passwordHash` | string | Hashed password for the user (never returned in API responses). |
| `createdAt` | Date | Timestamp of user creation. |
| `updatedAt` | Date | Timestamp of the last update. |

### Course

Represents a single academic course.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the course. |
| `subject` | string | The subject code (e.g., "CS"). |
| `subjectDescription` | string | Full subject name (e.g., "Computer Science"). |
| `courseNumber`| string | The course number (e.g., "152"). |
| `title` | string | The full title of the course. |
| `description` | string? | A detailed description of the course. |
| `creditHours` | object | An object with `low` (number) and `high` (number) credit hour values. |
| `college` | CodeDescription? | College the course belongs to. |
| `department` | CodeDescription? | Department the course belongs to. |
| `isUndergraduate` | boolean? | True if the course is for undergraduates. |
| `isGraduate` | boolean? | True if the course is for graduates. |

### Section

Represents a specific section of a course for a given term.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the section. |
| `courseId` | ObjectId | A reference to the parent `Course`. Populated in some responses. |
| `termCode` | string | The term code (e.g., "202620"). |
| `crn` | string | The unique Course Reference Number for the term. |
| `sectionNumber`| string | The section number (e.g., "001", "H01"). |
| `scheduleType` | CodeDescription | The type of class (e.g., `{"code":"LEC","description":"Lecture"}`). |
| `instructionalMethod` | CodeDescription | Delivery method (e.g., `{"code":"IP","description":"In-Person"}`). |
| `instructors`| Array<Instructor> | A list of instructors for the section. |
| `enrollmentMax` | number | Maximum number of students allowed. |
| `enrollmentCurrent` | number | Current number of enrolled students. |
| `waitlistTotal` | number? | Total number of students on the waitlist. |
| `waitlistRemaining` | number? | Remaining spots on the waitlist. |
| `status` | string | Enrollment status (default: "Open"). |
| `meetingTimes`| Array<MeetingTime> | An array of meeting times and locations. |
| `linkIdentifier`| string \| null | An identifier used to link sections together (e.g., a lecture and its required lab). |
| `possibleLinks` | Array<string> | Link identifiers for linked sections this section requires. |

### Prerequisite

Represents a prerequisite relationship between two courses.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier. |
| `courseId` | ObjectId | The course that has this prerequisite. |
| `requiredCourseId` | ObjectId | The required prerequisite course. |
| `minGrade` | string | Minimum grade required (default: "D-"). |
| `concurrentAllowed` | boolean | Whether the prerequisite can be taken concurrently (default: false). |
| `logicGroup` | string | Group name. Prerequisites in the same group are OR'd; groups are AND'd. |

### Schedule

Represents a user-created schedule.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier for the schedule. |
| `userId` | ObjectId | A reference to the `User` who owns the schedule. |
| `termCode`| string | The term code for this schedule. |
| `name` | string | The user-defined name of the schedule (default: "Untitled Schedule"). |
| `sectionIds`| Array<ObjectId>| An array of `Section` IDs. Populated with full section objects in API responses. |
| `createdAt` | Date | Timestamp of schedule creation. |
| `updatedAt` | Date | Timestamp of the last update. |

### Requirement

Represents a GE/Breadth requirement designation in the catalog.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Unique identifier. |
| `code` | string | Unique 4-character code (e.g., "BEAD"). |
| `description`| string | Human-readable name (e.g., "EN-ABET Depth"). |


---
## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request.

- `200 OK`: The request was successful.
- `201 Created`: The resource was successfully created.
- `204 No Content`: The request was successful, and there is no content to return.
- `400 Bad Request`: The request was malformed (e.g., invalid JSON, missing parameters).
- `401 Unauthorized`: Authentication failed or is required.
- `403 Forbidden`: The authenticated user does not have permission to access the resource.
- `404 Not Found`: The requested resource could not be found.
- `409 Conflict`: The request could not be completed due to a conflict with the current state of the resource.
- `500 Internal Server Error`: An unexpected error occurred on the server.

Error responses will include a JSON body with more details:

```json
{
 "message": "A human-readable error message.",
 "errors": [
 { "field": "email", "message": "Email is already in use." }
 ]
}
```
