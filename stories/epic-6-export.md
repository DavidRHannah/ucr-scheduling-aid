# Epic 6: External iCalendar Export Integration

This epic covers generating and downloading RFC 5545 compliant iCalendar feeds with extensive customization parameters.

---

### US-6.1: Public Calendar Feed Export
- **As a** student registered for courses
- **I want to** export my saved schedule as an iCalendar (.ics) file using a public, shareable link
- **So that** I can subscribe to my class schedule in my personal calendar (Google Calendar, Apple Calendar, Outlook) and see updates automatically

#### Acceptance Criteria
1. Sending a GET request to `/schedules/:scheduleId/export.ics` generates and returns a valid RFC 5545 `.ics` file.
2. The endpoint is public (does not require authentication headers), allowing external calendar applications to poll the URL.
3. Requests to the export endpoint are rate-limited to 30 requests per minute per IP address.
4. Each course section is represented as a recurring calendar event (`VEVENT`) with weekly recurrence rules (`RRULE`) matching the class duration.
5. All dates and times are localized to the `America/Los_Angeles` timezone.

---

### US-6.2: Custom Calendar Reminders
- **As a** student who frequently runs late
- **I want to** configure custom calendar reminders (VALARM) in my exported calendar feed
- **So that** my phone alerts me exactly when I need to leave for class (e.g. 10 minutes before, or the morning of the class)

#### Acceptance Criteria
1. The export endpoint accepts a base64url-encoded JSON `options` query parameter.
2. The `reminder.primary` option accepts values (null, 5, 10, 15, 20, 30, 60) indicating minutes before the class to trigger an alert.
3. The `reminder.secondary` option supports an additional alert, configuring either minutes before or a specific hour on the morning of the class (e.g., alert at 7:00 AM).
4. Providing invalid base64url options or failing validation constraints returns a 400 Bad Request error.

---

### US-6.3: Event Details Customization
- **As a** student subscribing to my class calendar
- **I want to** customize the event title, description fields, and location format in the exported feed
- **So that** the calendar events only show information that is useful to me (such as instructor email, CRN, or building name)

#### Acceptance Criteria
1. The `options` query parameter supports a `titleFormat` block defining templates like `"{subject}{number} - {title}"` and support for title-casing.
2. The `options` query parameter supports `description` toggle booleans: `includeInstructor`, `includeInstructorEmail`, `includeCrn`, `includeSection`, `includeUnits`, `includeDeliveryMode`, and `includeSeatCount`.
3. Location formatting options support rendering the full building and room details, building only, room only, or suppressing location data.
4. Asynchronous sections (online classes with no fixed meeting times) can be optionally excluded, or represented as a single calendar event on a configured weekday and duration.
