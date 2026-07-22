# Non-Functional Requirements — UCR Scheduling Aid

> **Version:** 1.0
> **Last Updated:** 2026-07-15
> **Status:** Approved

This document details the non-functional requirements (NFRs) for the UCR Scheduling Aid, specifying the quality attributes, design constraints, and system limits required for a production-ready application.

---

## 1. Performance & Responsiveness

| ID | Requirement | Metric / Target |
|---|---|---|
| **NFR-PERF.1** | **Schedule Generation Latency** | The `POST /generate` endpoint must complete in `< 2.5 seconds` for up to 5 courses under normal server load. |
| **NFR-PERF.2** | **Course Search Latency** | Paginated database queries for courses/sections must return results in `< 200ms`. |
| **NFR-PERF.3** | **Page Transition & Rendering** | Client-side page rendering and UI state transitions on the Schedule Builder must be smooth (targeting `60 FPS`, zero layout shifts). |
| **NFR-PERF.4** | **Initial Page Load (LCP)** | Largest Contentful Paint (LCP) for the application frontend must be `< 1.5 seconds` on a standard desktop broadband connection. |
| **NFR-PERF.5** | **Calendar Export Generation** | Generating and streaming the ICS file from `/export.ics` must begin in `< 500ms`. |

---

## 2. Reliability & Resilience

| ID | Requirement | Target |
|---|---|---|
| **NFR-RELI.1** | **Banner SIS Resilience** | The data sync pipeline must be designed defensively. If UCR Banner SIS changes its HTML structure, rate limits request, or encounters downtime, the sync pipeline must catch errors gracefully, log alerts, and retain existing cache data rather than wiping the database. |
| **NFR-RELI.2** | **Partial Sync Recovery** | If a sync process fails midway (e.g., during a specific subject ingestion), the system must support resume capability or transactional rollback to ensure no corrupted course/section records are visible to users. |
| **NFR-RELI.3** | **Database Availability** | The database must support automatic failover or local replication (e.g., MongoDB replica sets) to target `99.9%` service availability. |
| **NFR-RELI.4** | **Graceful Degraded State** | If the backend goes offline, the frontend must display a prominent, user-friendly error banner rather than crashing or freezing. |

---

## 3. Security & Data Protection

| ID | Requirement | Target / Standard |
|---|---|---|
| **NFR-SEC.1** | **Password Security** | All passwords stored in the database must be hashed using `bcrypt` (work factor ≥ 10) or `Argon2id`. Cleartext passwords must never be stored, logged, or transmitted. |
| **NFR-SEC.2** | **Transport Encryption** | All client-to-server communications must use TLS 1.3 (HTTPS) in production. HTTP requests must be automatically redirected to HTTPS. |
| **NFR-SEC.3** | **Token Authentication** | User sessions must be authenticated via JSON Web Tokens (JWT) using `HMAC-SHA256` signatures. Tokens should have an expiration of `7 days`. |
| **NFR-SEC.4** | **API Key Protection** | The admin endpoints (`/sync`, `/intake`) must be protected by a strong, cryptographically secure API key (`INTAKE_API_KEY`) passed in the headers. |
| **NFR-SEC.5** | **Public Link Rate Limiting** | The unauthenticated `/schedules/:id/export.ics` endpoint must be rate-limited to `30 requests per minute per IP address` to prevent abuse. |
| **NFR-SEC.6** | **Authorization Checks** | Object-level access control (OLAC) must be enforced. A user can only view, edit, or delete schedules containing their associated `userId`. |

---

## 4. Scalability & System Limits

| ID | Requirement | Target / Constraint |
|---|---|---|
| **NFR-SCAL.1** | **Combinatorial Guardrails** | To prevent server resource exhaustion, the Schedule Generator must enforce limits. The engine must reject generation requests containing `> 7 courses` or any single course containing `> 40 active sections` (e.g., massive intro biology lectures/labs). |
| **NFR-SCAL.2** | **Concurrency** | The backend must handle at least `50 concurrent schedule generation requests` without drop-offs in latency (using cluster processes, worker threads, or async microtasks). |
| **NFR-SCAL.3** | **Database Indexing** | MongoDB collections must have indexes on frequently searched/sorted fields: `crn` + `termCode`, `subject` + `courseNumber`, `userId` on schedules, and `requirementDesignation`. |
| **NFR-SCAL.4** | **ICS Caching** | The server should cache generated ICS configurations for active schedule IDs for up to 5 minutes to mitigate high traffic on popular subscription feeds. |

---

## 5. Usability & Aesthetics

| ID | Requirement | Target / Standard |
|---|---|---|
| **NFR-USA.1** | **Aesthetic Standard** | The user interface must feel modern, premium, and dynamic, employing a cohesive dark-navy/slate color palette (curated HSL) and smooth transitions. |
| **NFR-USA.2** | **Responsiveness** | The Schedule Builder layout must adapt seamlessly between desktop (`> 1024px`, 2-column) and tablet/mobile screens (single-column stack, collapsible sidebar navigation). |
| **NFR-USA.3** | **Visual Indicators** | Interactive components (buttons, input fields, checkboxes) must have explicit hover, focus, and disabled states. Long-running actions (searching, exporting, generating) must show skeletons or spinner animations. |
| **NFR-USA.4** | **Academic Disclaimer** | A permanent, visible disclaimer must be rendered on the Schedule Builder and Saved Schedules page stating: *"This tool is unofficial. Please cross-reference all schedules with your academic advisor and the UCR registration portal before registering."* |

---

## 6. Maintainability & Code Quality

| ID | Requirement | Target / Standard |
|---|---|---|
| **NFR-MNT.1** | **Static Analysis & Linting** | Frontend code must pass standard ESLint checks with zero warnings. TypeScript strict compilation mode (`strict: true`) must be enforced. |
| **NFR-MNT.2** | **Modular Components** | React components must be kept small (under 300 lines of code) and organized domain-specifically (`layout`, `schedule`, `search`). |
| **NFR-MNT.3** | **Test Coverage** | Core logic (specifically schedule time conflicts, gap calculations, and the combinatorics generator) must have `> 90% unit test coverage` using Vitest or Jest. |
| **NFR-MNT.4** | **Documentation Integrity** | Codebase documentation (API specifications, design docs, plans, and CLAUDE.md) must be maintained and updated as features are implemented. |

---

## 7. Operational Constraints

| ID | Requirement | Target / Constraint |
|---|---|---|
| **NFR-CON.1** | **Browser Compatibility** | The frontend must be compatible with the last 2 versions of all major browsers: Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge. |
| **NFR-CON.2** | **Deployment Strategy** | The frontend must support static hosting (e.g., Vercel, Netlify) with environment variable configurations for backend API routes. The backend must be containerizable via Docker. |
| **NFR-CON.3** | **Dependency Security** | Third-party packages must be regularly scanned for vulnerabilities (`npm audit`). Major dependency additions must be reviewed to prevent bundle-size bloat. |

---

## Revision History

| Date | Version | Changes |
|---|---|---|
| 2026-07-15 | 1.0 | Initial release finalized with client scope constraints. |
