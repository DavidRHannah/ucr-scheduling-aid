# CLAUDE.md — UCR Scheduling Aid

> This is a living document. Update it as the project evolves to keep goals, status, and conventions in sync with reality.

## Project Vision

Help UCR students build **optimal course schedules** using live registration data and, eventually, degree requirement awareness. The core pain point: students manually try schedule combinations until they find one that's "good enough." This tool should let them find the **best** one.

## Guiding Principles

1. **Ship the schedule builder first.** The combination generator (pick courses → generate conflict-free schedules → rank them) is the highest-value, most feasible feature. It does not depend on degree requirement data.
2. **Degree planning is a stretch goal, not a launch requirement.** Requirement gathering is hard (no structured UCR API, manual curation needed, reliability concerns). Scope it to 1-2 majors if/when pursued, with strong "verify with your advisor" disclaimers.
3. **Mock data shapes must match the real API contract.** Frontend mock data in `frontend/src/data/` should always conform to the types defined in `backend/BACKEND_API.md` so the backend can be swapped in without frontend changes.
4. **Don't give students incorrect academic advice.** Any requirement validation feature must include disclaimers that it is unofficial. Partial/incorrect requirement data is worse than no data.

## Current Status

### What's Built
- **Frontend SPA** — Fully built in React 19 + Vite 8 + TypeScript 6 + Tailwind CSS 4.
- **App Layout & Routing** — App layout sidebar and navigation across all v1 pages.
- **Schedule Builder page** — Interactive combinations planner with section locks and dynamic DFS combination previewing.
- **Course Search page** — Dedicated course catalog query browser with pagination, prerequisites logic pool displays, and section listings.
- **Saved Schedules page** — Interactive profile configurations manager with conflict/gap analysis, deletion tools, and custom export settings.
- **Settings page** — Register/Login user accounts dashboard and administrative Banner sync consoles.
- **Backend API server** — Node.js Express server running on port 3000 with secure JWT auth middlewares and public calendar export feeds.
- **Database & Models** — Mongoose schemas defined for Users, Courses, Sections, Requirements, Prerequisites, and Schedules.
- **Combinatorics Solver** — Backtracking DFS combination calculator with locked-section constraints and linked-component pairing.
- **ICS Calendar Generator** — Timezone-adjusted RFC 5545 calendar compiler with base64url options parsing.
- **Automated Tests** — 25 integration tests validating auth, catalog lookups, admin sync, and schedule CRUD modules.

### What's Not Built
- **Phase 4 Degree Awareness (Stretch)** — Direct degree audits and requirements checking are cut from v1 launch scope.

## Phased Roadmap

### Phase 1: Backend Foundation (Completed)
- Node.js/Express scaffolding.
- MongoDB connection and Mongoose model definitions.
- Auth endpoints and pre-save hashing hooks.
- Administrative Banner sync ingestion pipeline.

### Phase 2: Schedule Generator (Completed)
- Backtracking combination generation.
- Dynamic backend api connection.
- Standalone Course Search catalog browser page.

### Phase 3: User Features (Completed)
- Saved schedules profile CRUD.
- Stats gap and conflict analysis computations.
- Timezone-adjusted ICS calendar exports.
- User profile dashboards and settings consoles.

### Phase 4: Degree Awareness (Stretch/Future)
- Manually curate requirement data for 1-2 popular majors (CS, Biology, etc.)
- Build requirement satisfaction checking
- Requirements page showing progress
- Strong disclaimers on all requirement-related features

## Architecture

```
ucr-scheduling-aid/
├── frontend/ # React SPA (Vite + TypeScript)
│ └── src/
│ ├── components/
│ │ ├── layout/ # AppLayout, Header, Sidebar
│ │ ├── schedule/ # WeeklyCalendar, StatusBanner, CombinationCard, CombinationsList
│ │ ├── search/ # CourseSearchPanel, CourseResultCard
│ │ └── ui/ # shadcn/ui primitives (Button, Card, Input, etc.)
│ ├── data/ # Mock data (to be replaced by API calls)
│ ├── pages/ # Route-level page components
│ └── lib/ # Utilities (cn helper, etc.)
├── backend/ # API spec + reference data (implementation TBD)
│ ├── BACKEND_API.md # Complete REST API contract
│ ├── reqs.json # BCOE degree requirements (manual, incomplete)
│ └── EN-AbetDepth.json # Engineering catalog depth data
└── docs/
 └── superpowers/
 ├── specs/ # Design specifications
 └── plans/ # Implementation plans
```

## Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript 6
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- **UI Components:** shadcn/ui (v4) + Lucide icons
- **Routing:** React Router DOM 7
- **Font:** Geist (via `@fontsource-variable/geist`)
- **Path alias:** `@/` → `./src/` (configured in both `vite.config.ts` and `tsconfig.app.json`)

### Backend (Planned)
- **Runtime:** Node.js
- **Database:** MongoDB (inferred from ObjectId types in API spec)
- **Auth:** JWT
- **Data source:** UCR Banner SIS (via `/sync` ingestion endpoint)

## Conventions

### Frontend
- Components are organized by domain (`layout/`, `schedule/`, `search/`) not by type
- shadcn/ui primitives live in `components/ui/` — don't modify these directly
- Use the `@/` path alias for all imports (e.g., `import { Button } from "@/components/ui/button"`)
- Pages are in `pages/` and are routed via React Router in `App.tsx`
- Mock data lives in `data/` and should match the API spec response shapes exactly
- Run dev server from `frontend/`: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build` (runs `tsc -b && vite build`)

### General
- Design docs and plans go in `docs/superpowers/specs/` and `docs/superpowers/plans/`
- Backend API changes must update `backend/BACKEND_API.md` first (spec-driven development)
- Commit messages should be concise and descriptive (see git log for style)
- Do not use emojis anywhere in the codebase, code comments, commit messages, or documentation.

## Known Risks & Decisions Needed

| Risk | Impact | Mitigation |
|---|---|---|
| No structured UCR API for degree requirements | Cannot build degree planning without manual curation or brittle scraping | Defer to Phase 4; scope to 1-2 majors; add disclaimers |
| Banner scraping may violate UCR ToS | Legal/access risk for live course data | Review ToS; consider reaching out to UCR IT for API access |
| Schedule generator combinatorial explosion | Performance issues with many courses | Set result limits, timeouts; consider pruning strategies |
| Enrollment data staleness | Students see "Open" sections that are actually full | Display "last updated" timestamps; scrape frequently during registration |
| Catalog changes yearly | Requirement data becomes stale | Track catalog year per data set; flag when data may be outdated |

## Updating This Document

Update this file when:
- A new phase begins or a phase is completed
- The tech stack changes (new dependencies, framework swap)
- A major architectural decision is made
- New risks are identified or existing ones are resolved
- Conventions change
