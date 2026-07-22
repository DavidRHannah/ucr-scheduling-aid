# Epic 1: Authentication and Session Management

This epic covers user registration, login, session retention, and security boundaries.

---

### US-1.1: New User Account Registration
- **As a** prospective student user
- **I want to** create a new account using my email, a secure password, and display name
- **So that** I can save my course schedules and persist my workspaces across devices

#### Acceptance Criteria
1. Submitting a unique email, password of 6 or more characters, and display name creates a new user record in the database and returns a JWT token.
2. Registering with an email that already exists in the system returns a 409 Conflict error.
3. Submitting invalid email formats or passwords shorter than 6 characters returns a 400 Bad Request error detailing the input flaws.

---

### US-1.2: Account Login and Token Generation
- **As a** registered student user
- **I want to** log in with my email and password
- **So that** I can retrieve my saved schedules and workspace settings

#### Acceptance Criteria
1. Providing correct credentials returns a user object and a JWT token.
2. Failing to provide correct credentials returns a 401 Unauthorized status with a generic message: "Invalid email or password".
3. The server response must not indicate whether the email or the password was the incorrect field.

---

### US-1.3: Secure User Logout
- **As an** active user
- **I want to** log out of my active session
- **So that** my credentials and access token are cleared from the browser and database cache

#### Acceptance Criteria
1. Clicking the sign out button removes the stored JWT token from local storage/cookie cache.
2. The user is redirected to the public view or landing screen.
3. Future requests to protected endpoints return 401 until the user logs in again.

---

### US-1.4: Protected Workspace Routing
- **As a** visitor without an account
- **I want to** be blocked from accessing protected pages like Saved Schedules
- **So that** my personal course selections remain private and secured

#### Acceptance Criteria
1. Accessing a URL route under `/saved-schedules` without a valid token redirects the user to the login screen.
2. The application remembers the original page request and redirects the user back to it after a successful login.
3. Public routes (such as schedule building, course catalog search, and calendar previewing) remain accessible without authentication.
