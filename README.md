# UCR Scheduling Aid

A full-stack web application designed to help UC Riverside students build, optimize, and export conflict-free course schedules using actual class registration catalog data.

---

## Features

### 1. Interactive Schedule Builder
- Select multiple target courses from the catalog basket.
- Backtrack DFS combinatorics engine calculates all conflict-free combinations in real-time.
- Toggle pin/lock icons on sections to freeze specific course times (e.g. lock a lecture CRN) and regenerate the remaining components around it.
- Save active combinations to personal database profiles.

### 2. Standalone Course Catalog Browser
- View paginated catalog results with keyword search and department filters.
- Displays course description sheets, populated course prerequisite logic pools, and term section lists.

### 3. Saved Schedules and Analysis
- Manage saved quarters plans with private ownership filters.
- Fetches dynamic analytics reports detailing total credits, active days, class minutes, gaps, and schedule overlaps/conflicts.
- Exports schedules to Google or Apple Calendar using customized timezone-adjusted RFC 5545 iCalendar feeds.
- Supports customized feed descriptions and alarms.

### 4. User Accounts and Settings
- Create secure credentials profiles with password hashing.
- Features an administrative synchronization console allowing sync triggers for UCR Banner SIS data.

---

## Tech Stack

### Frontend
- **Framework:** React 19 + TypeScript 6
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **Routing:** React Router DOM 7

### Backend
- **Runtime:** Node.js Express (ES Modules)
- **Database:** MongoDB / Mongoose ODM
- **Auth:** JWT Access Tokens (7-day expiry)
- **Data Intake:** In-memory bulk write pipelines processing UCR Banner SIS dumps

---

## Directory Structure

```
ucr-scheduling-aid/
├── frontend/             # React SPA (Vite + TS + Tailwind)
│   ├── src/
│   │   ├── components/   # Layout, search, and weekly calendar widgets
│   │   ├── context/      # Authentication state providers
│   │   ├── lib/          # API fetch client wrappers
│   │   ├── pages/        # Core screens (Catalog Search, Saved Schedules, builder)
│   │   └── main.tsx      # Entry point
│   └── package.json
├── backend/              # Node.js Express REST API server
│   ├── config/           # Database connections
│   ├── controllers/      # Route logic handlers
│   ├── middleware/       # Auth guards and intake key verification
│   ├── models/           # Mongoose schemas
│   ├── routes/           # REST endpoints
│   ├── utils/            # DFS combination solvers and iCal string compilers
│   ├── tests/            # Mock controller integration test suites
│   ├── reqs.json         # Reference GE Breadth requirements list
│   ├── EN-AbetDepth.json # Reference Engineering catalog section dump
│   ├── BACKEND_API.md    # API REST contracts
│   └── package.json
├── requirements/         # System specifications
└── stories/              # Agile backlog epics and acceptance criteria
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or via URI connection)

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
3. Set your MongoDB connection URI and signing secrets in `.env`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the development API server:
   ```bash
   npm run dev
   ```
   *The server runs by default on port 3000.*

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development SPA:
   ```bash
   npm run dev
   ```
   *The V1 client runs by default on port 5173.*

---

## Verification and Testing

### Running API Integration Tests
The backend contains 25 test cases verifying authentication validation, catalog cursors, bulk ingestion parsing, gap analytics, and calendar feed configurations:
1. Navigate to the backend directory.
2. Execute the test command:
   ```bash
   npm test
   ```

### Building Frontend for Production
To compile and bundle the React SPA into static production assets:
1. Navigate to the frontend directory.
2. Run the compiler:
   ```bash
   npm run build
   ```
   *Output files will be generated in `frontend/dist/`.*
