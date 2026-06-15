# Frontend Shell & Schedule Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial frontend for UCR Scheduling Aid — a full app shell (sidebar + header) with a fully detailed Schedule Builder page matching `docs/ucr_course_scheduler.webp`, using hardcoded mock data shaped like the real backend API.

**Architecture:** Vite + React + TypeScript SPA. `react-router-dom` for routing between sidebar pages (only Schedule Builder is fully built; others are placeholders). Tailwind CSS + shadcn/ui for styling/primitives. Mock data in `src/data/mockSchedule.ts` typed to mirror `backend/BACKEND_API.md` models, with requirement-type options sourced from `backend/reqs.json`.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v4, shadcn/ui, react-router-dom, lucide-react (icons, comes with shadcn)

---

## Spec Coverage Notes

This plan has no automated tests per the spec ("No automated tests for this pass — pure visual/layout build with mock data"). Verification for each task is `npm run build` (TypeScript + Vite build must succeed with no errors) plus, for the final task, a manual dev-server smoke check via `curl`.

---

## File Structure

```
ucr-scheduling-aid/
  package.json, vite.config.ts, tsconfig.json, tsconfig.app.json, tsconfig.node.json, index.html
  components.json                 (shadcn config)
  src/
    main.tsx
    App.tsx
    index.css
    vite-env.d.ts
    lib/
      utils.ts                    (shadcn cn() helper)
    components/
      ui/                          (shadcn-generated: button, select, checkbox, card, badge, collapsible, input)
      layout/
        Sidebar.tsx
        Header.tsx
        AppLayout.tsx
      schedule/
        StatusBanner.tsx
        WeeklyCalendar.tsx
        CombinationCard.tsx
        CombinationsList.tsx
      search/
        CourseSearchPanel.tsx
        CourseResultCard.tsx
    data/
      mockSchedule.ts
      requirementTypes.ts
    pages/
      Dashboard.tsx
      ScheduleBuilder.tsx
      CourseSearchPage.tsx
      Combos.tsx
      Requirements.tsx
      SavedSchedules.tsx
      Settings.tsx
```

---

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: project scaffold via Vite template (package.json, vite.config.ts, tsconfig*.json, index.html, src/main.tsx, src/App.tsx, src/index.css, src/vite-env.d.ts)

- [ ] **Step 1: Scaffold the project in the current directory**

Run (from `/home/david/projects/ucr-scheduling-aid`):
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about the directory not being empty, choose to continue (it will not overwrite `README.md`, `docs/`, `backend/`, `.gitignore`, `.git/`).

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully, producing a `dist/` directory.

- [ ] **Step 4: Add a `.gitignore` entry check**

The Vite template creates its own `.gitignore`. Open it and confirm it includes `node_modules` and `dist`. If the repo's existing root `.gitignore` (currently empty) was overwritten or merged, ensure the merged file contains at least:
```
node_modules
dist
*.local
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Scaffold Vite React TypeScript project"
```

---

### Task 2: Install Tailwind CSS, shadcn/ui, react-router-dom

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`, `tsconfig.app.json`
- Modify: `src/index.css`
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`, `select.tsx`, `checkbox.tsx`, `card.tsx`, `badge.tsx`, `collapsible.tsx`, `input.tsx`

- [ ] **Step 1: Install Tailwind CSS v4 Vite plugin**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add the Tailwind Vite plugin**

In `vite.config.ts`, add the import and plugin:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Import Tailwind in the global stylesheet**

Replace the contents of `src/index.css` with:
```css
@import "tailwindcss";
```

- [ ] **Step 4: Configure path aliases for shadcn**

In `tsconfig.json`, ensure the `compilerOptions` includes (add a top-level `paths` config under a `compilerOptions` block if the generated file uses project references — add to `tsconfig.app.json` if that's where `compilerOptions` lives):
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

In `vite.config.ts`, add the `resolve.alias` so Vite can resolve `@/`:
```ts
import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 5: Install Node types for the path alias (if not already present)**

```bash
npm install -D @types/node
```

- [ ] **Step 6: Run shadcn init**

```bash
npx shadcn@latest init -d
```
This creates `components.json`, `src/lib/utils.ts`, and updates `src/index.css` with shadcn's CSS variables/theme layer (it will append to the `@import "tailwindcss";` line, not replace it — verify after running).

- [ ] **Step 7: Add the required shadcn components**

```bash
npx shadcn@latest add button select checkbox card badge collapsible input -y
```
This creates `src/components/ui/button.tsx`, `select.tsx`, `checkbox.tsx`, `card.tsx`, `badge.tsx`, `collapsible.tsx`, `input.tsx`.

- [ ] **Step 8: Install react-router-dom**

```bash
npm install react-router-dom
```

- [ ] **Step 9: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Add Tailwind CSS, shadcn/ui, and react-router-dom"
```

---

### Task 3: Mock data module

**Files:**
- Create: `src/data/requirementTypes.ts`
- Create: `src/data/mockSchedule.ts`

- [ ] **Step 1: Create the requirement types data file**

Create `src/data/requirementTypes.ts`:
```ts
export interface RequirementType {
  code: string;
  description: string;
}

// Subset of backend/reqs.json used to populate the
// "Requirement Type" filter dropdown in the Course Search panel.
export const requirementTypes: RequirementType[] = [
  { code: "BEAD", description: "EN-ABET Depth" },
  { code: "BEET", description: "EN-Ethnicity" },
  { code: "BEFA", description: "EN-Hum - FA/Lit/Phil/Rel" },
  { code: "BEMA", description: "EN-Nat Sci - Math/Stat/CS" },
  { code: "BEPS", description: "EN-Nat Sci - Physical Sci" },
  { code: "BEAT", description: "EN-Soc Sci - Anth/Psyc/Soc" },
  { code: "BBE1", description: "BU-Composition - 1st Qtr" },
  { code: "BBET", description: "BU-Ethnicity" },
];
```

- [ ] **Step 2: Create the mock schedule data file with types and data**

Create `src/data/mockSchedule.ts`:
```ts
export interface CodeDescription {
  code: string;
  description: string;
}

export type WeekDay = "M" | "T" | "W" | "R" | "F" | "S" | "U";

export interface MeetingTime {
  weekDays: WeekDay[];
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  meetingType: CodeDescription;
  buildingDescription?: string;
  room?: string;
}

export interface CourseInfo {
  subject: string;
  courseNumber: string;
  title: string;
  creditHours: { low: number; high: number };
}

export interface Section {
  _id: string;
  courseId: CourseInfo;
  crn: string;
  sectionNumber: string;
  scheduleType: CodeDescription; // e.g. { code: "LEC", description: "Lecture" }
  enrollmentMax: number;
  enrollmentCurrent: number;
  status: "Open" | "Closed";
  meetingTimes: MeetingTime[];
  reqCode?: string; // ties to requirementTypes for Major/GE badges
}

export interface GeneratedScheduleGroup {
  courseId: CourseInfo;
  sections: Section[];
}

export interface GeneratedSchedule {
  id: number;
  groups: GeneratedScheduleGroup[];
  totalUnits: number;
  hasConflicts: boolean;
}

const lecture: CodeDescription = { code: "LEC", description: "Lecture" };
const discussion: CodeDescription = { code: "DIS", description: "Discussion" };

// --- Locked schedule (Current Schedule grid) ---

export const lockedSchedule: Section[] = [
  {
    _id: "math009b-dis1b",
    courseId: { subject: "MATH", courseNumber: "009B", title: "Calculus II", creditHours: { low: 4, high: 4 } },
    crn: "10001",
    sectionNumber: "DIS 1B",
    scheduleType: discussion,
    enrollmentMax: 30,
    enrollmentCurrent: 28,
    status: "Open",
    meetingTimes: [
      {
        weekDays: ["M", "R"],
        startTime: "10:00",
        endTime: "10:50",
        meetingType: discussion,
        buildingDescription: "SCI 1",
        room: "123",
      },
    ],
  },
  {
    _id: "cs010a-lec1",
    courseId: { subject: "CS", courseNumber: "010A", title: "Intro to Computer Science", creditHours: { low: 4, high: 4 } },
    crn: "10002",
    sectionNumber: "LEC 1",
    scheduleType: lecture,
    enrollmentMax: 80,
    enrollmentCurrent: 75,
    status: "Open",
    meetingTimes: [
      {
        weekDays: ["M", "R"],
        startTime: "11:00",
        endTime: "12:15",
        meetingType: lecture,
        buildingDescription: "WCH 1",
        room: "120",
      },
    ],
  },
  {
    _id: "engl001a-lec4",
    courseId: { subject: "ENGL", courseNumber: "001A", title: "Critical Reading and Writing", creditHours: { low: 4, high: 4 } },
    crn: "10003",
    sectionNumber: "LEC 4",
    scheduleType: lecture,
    enrollmentMax: 25,
    enrollmentCurrent: 25,
    status: "Closed",
    meetingTimes: [
      {
        weekDays: ["T"],
        startTime: "13:00",
        endTime: "14:15",
        meetingType: lecture,
        buildingDescription: "HUM 1",
        room: "101",
      },
    ],
  },
];

// --- Course info shared across search results and generated schedules ---

const cs061: CourseInfo = { subject: "CS", courseNumber: "061", title: "Data Structures", creditHours: { low: 4, high: 4 } };
const stat008: CourseInfo = { subject: "STAT", courseNumber: "008", title: "Intro to Statistics", creditHours: { low: 4, high: 4 } };
const phys002a: CourseInfo = { subject: "PHYS", courseNumber: "002A", title: "Physics 2A", creditHours: { low: 4, high: 4 } };

const cs061Lec1: Section = {
  _id: "cs061-lec1",
  courseId: cs061,
  crn: "20001",
  sectionNumber: "LEC 1",
  scheduleType: lecture,
  enrollmentMax: 80,
  enrollmentCurrent: 45,
  status: "Open",
  reqCode: "BEAD",
  meetingTimes: [
    { weekDays: ["M", "W"], startTime: "14:30", endTime: "15:45", meetingType: lecture, buildingDescription: "WCH 1", room: "135" },
  ],
};

const cs061Lec2: Section = {
  _id: "cs061-lec2",
  courseId: cs061,
  crn: "20002",
  sectionNumber: "LEC 2",
  scheduleType: lecture,
  enrollmentMax: 80,
  enrollmentCurrent: 38,
  status: "Open",
  reqCode: "BEAD",
  meetingTimes: [
    { weekDays: ["M", "W"], startTime: "16:00", endTime: "17:15", meetingType: lecture, buildingDescription: "WCH 1", room: "135" },
  ],
};

const cs061Lec3: Section = {
  _id: "cs061-lec3",
  courseId: cs061,
  crn: "20003",
  sectionNumber: "LEC 3",
  scheduleType: lecture,
  enrollmentMax: 80,
  enrollmentCurrent: 60,
  status: "Open",
  reqCode: "BEAD",
  meetingTimes: [
    { weekDays: ["T", "R"], startTime: "14:30", endTime: "15:45", meetingType: lecture, buildingDescription: "WCH 1", room: "135" },
  ],
};

const stat008Lec2: Section = {
  _id: "stat008-lec2",
  courseId: stat008,
  crn: "20010",
  sectionNumber: "LEC 2",
  scheduleType: lecture,
  enrollmentMax: 100,
  enrollmentCurrent: 12,
  status: "Open",
  reqCode: "BEMA",
  meetingTimes: [
    { weekDays: ["T", "R"], startTime: "09:30", endTime: "10:45", meetingType: lecture, buildingDescription: "SMSU", room: "101" },
  ],
};

const stat008Lec3: Section = {
  _id: "stat008-lec3",
  courseId: stat008,
  crn: "20011",
  sectionNumber: "LEC 3",
  scheduleType: lecture,
  enrollmentMax: 100,
  enrollmentCurrent: 50,
  status: "Open",
  reqCode: "BEMA",
  meetingTimes: [
    { weekDays: ["M", "W"], startTime: "09:30", endTime: "10:45", meetingType: lecture, buildingDescription: "SMSU", room: "101" },
  ],
};

const phys002aDis1a: Section = {
  _id: "phys002a-dis1a",
  courseId: phys002a,
  crn: "20020",
  sectionNumber: "DIS 1A",
  scheduleType: discussion,
  enrollmentMax: 30,
  enrollmentCurrent: 25,
  status: "Open",
  reqCode: "BEPS",
  meetingTimes: [
    { weekDays: ["F"], startTime: "13:00", endTime: "14:50", meetingType: discussion, buildingDescription: "PHY", room: "205" },
  ],
};

// --- Generated combinations ---

const baseCombos: GeneratedSchedule[] = [
  {
    id: 1,
    groups: [
      { courseId: cs061, sections: [cs061Lec1] },
      { courseId: stat008, sections: [stat008Lec2] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  },
  {
    id: 2,
    groups: [
      { courseId: cs061, sections: [cs061Lec2] },
      { courseId: stat008, sections: [stat008Lec2] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  },
  {
    id: 3,
    groups: [
      { courseId: cs061, sections: [cs061Lec3] },
      { courseId: stat008, sections: [stat008Lec3] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  },
];

// Remaining combos (4-24) reuse the same section pool in different
// groupings so "Show More Combinations" has real data to render.
const sectionPool: [Section, Section][] = [
  [cs061Lec1, stat008Lec3],
  [cs061Lec2, stat008Lec3],
  [cs061Lec3, stat008Lec2],
  [cs061Lec1, stat008Lec2],
];

const extraCombos: GeneratedSchedule[] = Array.from({ length: 21 }, (_, i) => {
  const [a, b] = sectionPool[i % sectionPool.length];
  return {
    id: i + 4,
    groups: [
      { courseId: a.courseId, sections: [a] },
      { courseId: b.courseId, sections: [b] },
      { courseId: phys002a, sections: [phys002aDis1a] },
    ],
    totalUnits: 16,
    hasConflicts: false,
  };
});

export const generatedSchedules: GeneratedSchedule[] = [...baseCombos, ...extraCombos];

// --- Course search results ---

export const searchResults: Section[] = [cs061Lec1, cs061Lec2, stat008Lec2, phys002aDis1a];

export const totalSearchResults = 134;
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add mock schedule data and requirement types"
```

---

### Task 4: App layout shell — Sidebar, Header, AppLayout, routing, placeholder pages

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/AppLayout.tsx`
- Create: `src/pages/Dashboard.tsx`
- Create: `src/pages/CourseSearchPage.tsx`
- Create: `src/pages/Combos.tsx`
- Create: `src/pages/Requirements.tsx`
- Create: `src/pages/SavedSchedules.tsx`
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create a shared placeholder page component used by the stub pages**

Create `src/pages/Dashboard.tsx`:
```tsx
export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
```

Create `src/pages/CourseSearchPage.tsx`:
```tsx
export default function CourseSearchPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Course Search</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
```

Create `src/pages/Combos.tsx`:
```tsx
export default function Combos() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Combos</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
```

Create `src/pages/Requirements.tsx`:
```tsx
export default function Requirements() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Requirements</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
```

Create `src/pages/SavedSchedules.tsx`:
```tsx
export default function SavedSchedules() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Saved Schedules</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
```

Create `src/pages/Settings.tsx`:
```tsx
export default function Settings() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the Sidebar component**

Create `src/components/layout/Sidebar.tsx`:
```tsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  Search,
  Layers,
  ClipboardList,
  Bookmark,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/schedule-builder", label: "Schedule Builder", icon: CalendarRange },
  { to: "/course-search", label: "Course Search", icon: Search },
  { to: "/combos", label: "Combos", icon: Layers },
  { to: "/requirements", label: "Requirements", icon: ClipboardList },
  { to: "/saved-schedules", label: "Saved Schedules", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen flex-col bg-[#003DA5] text-white">
      <div className="px-6 py-6">
        <div className="text-lg font-bold leading-tight">UCR</div>
        <div className="text-sm font-semibold tracking-wide text-blue-200">SCHEDULING AID</div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "bg-white text-[#003DA5]" : "text-blue-100 hover:bg-blue-900/40"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 px-3 pb-4">
        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-900/40">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>

      <div className="m-3 rounded-md bg-blue-900/40 p-3 text-xs text-blue-100">
        <div className="mb-1 flex items-center gap-2 font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          All Systems Operational
        </div>
        <div>API: Healthy</div>
        <div>Rate Limit: 56 / 100 req/min</div>
        <div>Version: 1.0.0</div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create the Header component**

Create `src/components/layout/Header.tsx`:
```tsx
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const terms = [
  { value: "202620", label: "Spring 2026" },
  { value: "202610", label: "Fall 2025" },
];

export function Header() {
  const [term, setTerm] = useState(terms[0].value);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
      <Select value={term} onValueChange={setTerm}>
        <SelectTrigger className="w-40 border-none text-lg font-semibold shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {terms.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          JA
        </div>
        <span className="text-sm font-medium text-gray-700">jonathan.a@ucr.edu</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Create the AppLayout component**

Create `src/components/layout/AppLayout.tsx`:
```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="grid h-screen grid-cols-[260px_1fr]">
      <Sidebar />
      <div className="flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire up routing in App.tsx**

Replace the contents of `src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ScheduleBuilder from "@/pages/ScheduleBuilder";
import CourseSearchPage from "@/pages/CourseSearchPage";
import Combos from "@/pages/Combos";
import Requirements from "@/pages/Requirements";
import SavedSchedules from "@/pages/SavedSchedules";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedule-builder" element={<ScheduleBuilder />} />
          <Route path="/course-search" element={<CourseSearchPage />} />
          <Route path="/combos" element={<Combos />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/saved-schedules" element={<SavedSchedules />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Create a temporary placeholder for ScheduleBuilder so the build passes**

Create `src/pages/ScheduleBuilder.tsx` (this will be fully built out in Task 8):
```tsx
export default function ScheduleBuilder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Schedule Builder</h1>
    </div>
  );
}
```

- [ ] **Step 7: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Add app shell with sidebar, header, routing, and placeholder pages"
```

---

### Task 5: StatusBanner and WeeklyCalendar components

**Files:**
- Create: `src/components/schedule/StatusBanner.tsx`
- Create: `src/components/schedule/WeeklyCalendar.tsx`

- [ ] **Step 1: Create the StatusBanner component**

Create `src/components/schedule/StatusBanner.tsx`:
```tsx
import { CheckCircle2 } from "lucide-react";

interface StatusBannerProps {
  combinationCount: number;
  generationTimeSeconds: number;
}

export function StatusBanner({ combinationCount, generationTimeSeconds }: StatusBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
      <div>
        <div className="font-semibold text-green-800">
          Found {combinationCount} compatible schedule combinations!
        </div>
        <div className="text-sm text-green-700">
          Generated in {generationTimeSeconds.toFixed(2)}s using conflict-pruned search.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the WeeklyCalendar component**

Create `src/components/schedule/WeeklyCalendar.tsx`:
```tsx
import type { Section, WeekDay } from "@/data/mockSchedule";

const days: { key: WeekDay; label: string }[] = [
  { key: "M", label: "Mon" },
  { key: "T", label: "Tue" },
  { key: "W", label: "Wed" },
  { key: "R", label: "Thu" },
  { key: "F", label: "Fri" },
];

const startHour = 8; // 8 AM
const endHour = 18; // 6 PM
const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

const colorByCourse: Record<string, string> = {
  MATH: "bg-blue-100 border-blue-400 text-blue-900",
  CS: "bg-green-100 border-green-400 text-green-900",
  ENGL: "bg-yellow-100 border-yellow-400 text-yellow-900",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface PlacedBlock {
  section: Section;
  day: WeekDay;
  startRow: number;
  rowSpan: number;
}

function placeBlocks(sections: Section[]): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  const gridStartMinutes = startHour * 60;

  for (const section of sections) {
    for (const meeting of section.meetingTimes) {
      const startMinutes = timeToMinutes(meeting.startTime) - gridStartMinutes;
      const endMinutes = timeToMinutes(meeting.endTime) - gridStartMinutes;
      // Each row represents 30 minutes; row 1 starts at startHour:00.
      const startRow = Math.floor(startMinutes / 30) + 1;
      const rowSpan = Math.max(1, Math.ceil((endMinutes - startMinutes) / 30));

      for (const day of meeting.weekDays) {
        if (days.some((d) => d.key === day)) {
          blocks.push({ section, day, startRow, rowSpan });
        }
      }
    }
  }

  return blocks;
}

interface WeeklyCalendarProps {
  sections: Section[];
}

export function WeeklyCalendar({ sections }: WeeklyCalendarProps) {
  const blocks = placeBlocks(sections);
  const rowCount = (endHour - startHour) * 2;

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <div
        className="grid min-w-[700px]"
        style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}
      >
        {/* Header row */}
        <div className="border-b border-r border-gray-200" />
        {days.map((day) => (
          <div
            key={day.key}
            className="border-b border-r border-gray-200 p-2 text-center text-sm font-semibold text-gray-700"
          >
            {day.label}
          </div>
        ))}

        {/* Time grid */}
        <div
          className="relative grid"
          style={{ gridTemplateRows: `repeat(${rowCount}, 30px)` }}
        >
          {hours.map((hour) => (
            <div
              key={hour}
              className="row-span-2 border-b border-r border-gray-200 px-2 py-1 text-right text-xs text-gray-400"
            >
              {hour <= 12 ? hour : hour - 12} {hour < 12 ? "AM" : "PM"}
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day.key}
            className="relative grid border-r border-gray-200"
            style={{ gridTemplateRows: `repeat(${rowCount}, 30px)` }}
          >
            {hours.map((hour) => (
              <div key={hour} className="row-span-2 border-b border-gray-100" />
            ))}

            {blocks
              .filter((b) => b.day === day.key)
              .map((b, i) => {
                const colorClass = colorByCourse[b.section.courseId.subject] ?? "bg-gray-100 border-gray-400 text-gray-900";
                const meeting = b.section.meetingTimes.find((m) => m.weekDays.includes(day.key))!;
                return (
                  <div
                    key={`${b.section._id}-${i}`}
                    className={`absolute inset-x-1 z-10 rounded-md border px-2 py-1 text-xs ${colorClass}`}
                    style={{
                      top: `${(b.startRow - 1) * 30}px`,
                      height: `${b.rowSpan * 30 - 4}px`,
                    }}
                  >
                    <div className="font-semibold">
                      {b.section.courseId.subject} {b.section.courseId.courseNumber}
                    </div>
                    <div>{b.section.sectionNumber}</div>
                    <div>
                      {meeting.startTime} - {meeting.endTime}
                    </div>
                    {meeting.buildingDescription && (
                      <div>
                        {meeting.buildingDescription} {meeting.room}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add StatusBanner and WeeklyCalendar components"
```

---

### Task 6: CombinationCard and CombinationsList components

**Files:**
- Create: `src/components/schedule/CombinationCard.tsx`
- Create: `src/components/schedule/CombinationsList.tsx`

- [ ] **Step 1: Create the CombinationCard component**

Create `src/components/schedule/CombinationCard.tsx`:
```tsx
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GeneratedSchedule } from "@/data/mockSchedule";

const dayLabels: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

function formatDays(days: string[]): string {
  return days.map((d) => dayLabels[d] ?? d).join("/");
}

interface CombinationCardProps {
  combo: GeneratedSchedule;
}

export function CombinationCard({ combo }: CombinationCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h3 className="font-semibold text-gray-900">Combo #{combo.id}</h3>
        <Badge variant="secondary">{combo.totalUnits} Units</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {combo.groups.map((group) =>
          group.sections.map((section) => {
            const meeting = section.meetingTimes[0];
            return (
              <div key={section._id} className="flex items-start justify-between text-sm">
                <div>
                  <div className="font-semibold text-gray-900">
                    {group.courseId.subject} {group.courseId.courseNumber}
                  </div>
                  <div className="text-gray-500">{section.sectionNumber}</div>
                </div>
                <div className="text-right text-gray-600">
                  <div>{formatDays(meeting.weekDays)}</div>
                  <div>
                    {meeting.startTime} - {meeting.endTime}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {combo.hasConflicts ? "Conflicts" : "No Conflicts"}
          </div>
          <Button size="sm">View Details</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the CombinationsList component**

Create `src/components/schedule/CombinationsList.tsx`:
```tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { CombinationCard } from "./CombinationCard";
import type { GeneratedSchedule } from "@/data/mockSchedule";

interface CombinationsListProps {
  combinations: GeneratedSchedule[];
  initialVisibleCount?: number;
}

export function CombinationsList({ combinations, initialVisibleCount = 3 }: CombinationsListProps) {
  const [expanded, setExpanded] = useState(false);

  const visible = combinations.slice(0, initialVisibleCount);
  const rest = combinations.slice(initialVisibleCount);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Generated Combinations ({combinations.length})
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {visible.map((combo) => (
          <CombinationCard key={combo.id} combo={combo} />
        ))}
      </div>

      {rest.length > 0 && (
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleContent>
            <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-3">
              {rest.map((combo) => (
                <CombinationCard key={combo.id} combo={combo} />
              ))}
            </div>
          </CollapsibleContent>

          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setExpanded((v) => !v)}
              className="gap-2"
            >
              {expanded ? "Show Fewer Combinations" : `Show ${rest.length} More Combinations`}
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </Collapsible>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add CombinationCard and CombinationsList components"
```

---

### Task 7: CourseSearchPanel and CourseResultCard components

**Files:**
- Create: `src/components/search/CourseResultCard.tsx`
- Create: `src/components/search/CourseSearchPanel.tsx`

- [ ] **Step 1: Create the CourseResultCard component**

Create `src/components/search/CourseResultCard.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import { requirementTypes } from "@/data/requirementTypes";
import type { Section } from "@/data/mockSchedule";

const dayLabels: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

function formatDays(days: string[]): string {
  return days.map((d) => dayLabels[d] ?? d).join("/");
}

function requirementLabel(reqCode?: string): string | null {
  if (!reqCode) return null;
  const req = requirementTypes.find((r) => r.code === reqCode);
  return req ? req.description.split(" - ")[0].split("-")[1] ?? req.description : reqCode;
}

interface CourseResultCardProps {
  section: Section;
}

export function CourseResultCard({ section }: CourseResultCardProps) {
  const meeting = section.meetingTimes[0];
  const label = requirementLabel(section.reqCode);

  return (
    <div className="rounded-md border border-gray-200 p-3">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-gray-900">
          {section.courseId.subject} {section.courseId.courseNumber} – {section.courseId.title}
        </div>
        {label && <Badge variant="outline">{label}</Badge>}
      </div>

      <div className="mt-1 flex items-center gap-2 text-sm">
        <span className="font-medium text-blue-600">
          {section.scheduleType.code} {section.sectionNumber}
        </span>
        <span className="text-gray-400">•</span>
        <span className="text-gray-600">
          {section.enrollmentCurrent} / {section.enrollmentMax} seats
        </span>
      </div>

      <div className="mt-1 text-sm text-gray-600">
        {formatDays(meeting.weekDays)} {meeting.startTime} - {meeting.endTime}
      </div>
      {meeting.buildingDescription && (
        <div className="text-sm text-gray-500">
          {meeting.buildingDescription} {meeting.room}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the CourseSearchPanel component**

Create `src/components/search/CourseSearchPanel.tsx`:
```tsx
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseResultCard } from "./CourseResultCard";
import { requirementTypes } from "@/data/requirementTypes";
import { searchResults, totalSearchResults, type Section } from "@/data/mockSchedule";

const ALL = "all";

const departments = [
  { value: ALL, label: "All Departments" },
  { value: "CS", label: "Computer Science" },
  { value: "STAT", label: "Statistics" },
  { value: "PHYS", label: "Physics" },
];

const levels = [
  { value: ALL, label: "All Levels" },
  { value: "lower", label: "Lower Division (1-99)" },
  { value: "upper", label: "Upper Division (100-199)" },
];

function isUpperDivision(courseNumber: string): boolean {
  const num = parseInt(courseNumber, 10);
  return num >= 100;
}

export function CourseSearchPanel() {
  const [query, setQuery] = useState("");
  const [requirementType, setRequirementType] = useState(ALL);
  const [department, setDepartment] = useState(ALL);
  const [courseLevel, setCourseLevel] = useState(ALL);
  const [onlyOpen, setOnlyOpen] = useState(true);

  const filtered = useMemo(() => {
    return searchResults.filter((section) => {
      if (onlyOpen && section.status !== "Open") return false;

      if (department !== ALL && section.courseId.subject !== department) return false;

      if (requirementType !== ALL && section.reqCode !== requirementType) return false;

      if (courseLevel !== ALL) {
        const upper = isUpperDivision(section.courseId.courseNumber);
        if (courseLevel === "upper" && !upper) return false;
        if (courseLevel === "lower" && upper) return false;
      }

      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${section.courseId.subject} ${section.courseId.courseNumber} ${section.courseId.title}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [query, requirementType, department, courseLevel, onlyOpen]);

  function clearFilters() {
    setQuery("");
    setRequirementType(ALL);
    setDepartment(ALL);
    setCourseLevel(ALL);
    setOnlyOpen(true);
  }

  return (
    <div className="flex h-full flex-col gap-4 border-l border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-900">Course Search</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search courses..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Requirement Type</label>
        <Select value={requirementType} onValueChange={setRequirementType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Requirements</SelectItem>
            {requirementTypes.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Department</label>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Course Level</label>
        <Select value={courseLevel} onValueChange={setCourseLevel}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <Checkbox checked={onlyOpen} onCheckedChange={(v) => setOnlyOpen(v === true)} />
        Only Show Open Sections
      </label>

      <div className="flex gap-2">
        <Button className="flex-1">Search</Button>
        <Button variant="outline" className="flex-1" onClick={clearFilters}>
          Clear Filters
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-2 text-sm font-semibold text-gray-700">
          Search Results
          <span className="ml-1 font-normal text-gray-400">
            {totalSearchResults} results found
          </span>
        </div>
        <div className="space-y-2">
          {filtered.map((section: Section) => (
            <CourseResultCard key={section._id} section={section} />
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No results match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add CourseSearchPanel and CourseResultCard components"
```

---

### Task 8: Assemble the Schedule Builder page

**Files:**
- Modify: `src/pages/ScheduleBuilder.tsx`

- [ ] **Step 1: Replace the placeholder ScheduleBuilder page with the full layout**

Replace the contents of `src/pages/ScheduleBuilder.tsx`:
```tsx
import { StatusBanner } from "@/components/schedule/StatusBanner";
import { WeeklyCalendar } from "@/components/schedule/WeeklyCalendar";
import { CombinationsList } from "@/components/schedule/CombinationsList";
import { CourseSearchPanel } from "@/components/search/CourseSearchPanel";
import { lockedSchedule, generatedSchedules } from "@/data/mockSchedule";

export default function ScheduleBuilder() {
  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Builder</h1>

        <StatusBanner combinationCount={generatedSchedules.length} generationTimeSeconds={1.23} />

        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Current Schedule (Locked)</h2>
          <WeeklyCalendar sections={lockedSchedule} />
        </div>

        <CombinationsList combinations={generatedSchedules} />
      </div>

      <CourseSearchPanel />
    </div>
  );
}
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: Build completes successfully with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Assemble Schedule Builder page from layout, calendar, combos, and search panel"
```

---

### Task 9: Manual smoke test of the dev server

**Files:**
- None (verification only)

- [ ] **Step 1: Start the dev server in the background**

```bash
npm run dev -- --port 5173 &
```

- [ ] **Step 2: Wait for the server to be ready and curl the page**

```bash
sleep 2 && curl -s http://localhost:5173/ | head -20
```
Expected: HTML output containing `<div id="root">` and a script tag referencing `/src/main.tsx`.

- [ ] **Step 3: Stop the dev server**

```bash
kill %1
```

- [ ] **Step 4: No commit needed for this task** (verification only)

---

### Task 10: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Status" section to README.md reflecting current progress**

After the "Features" list (ending around the line "Plan, visualize, and share their remaining quarters until graduation."), add:

```markdown

## Current Status

This project is under active development. The current frontend includes:
- A full app shell (sidebar navigation + header) built with React, TypeScript, Tailwind CSS, and shadcn/ui
- A fully built **Schedule Builder** page showing a locked weekly schedule, generated schedule combinations, and a course search panel
- Other sidebar pages (Dashboard, Course Search, Combos, Requirements, Saved Schedules, Settings) are placeholders pending future work

All data shown is currently hardcoded mock data shaped to match the planned backend API (see `backend/BACKEND_API.md`). Backend integration is not yet connected.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Update README with current frontend status"
```

---

## Self-Review Summary

- **Spec coverage:** App shell (Task 4), Schedule Builder page with StatusBanner/WeeklyCalendar/CombinationsList (Tasks 5, 6, 8), Course Search panel (Task 7), mock data shaped to backend models (Task 3), README update (Task 10) — all spec sections are covered.
- **No automated tests:** Per spec, verification is `npm run build` after each task plus a manual dev-server smoke check (Task 9).
- **Type consistency:** `Section`, `GeneratedSchedule`, `MeetingTime`, `CourseInfo`, `WeekDay`, and `requirementTypes` are defined once in Task 3 and reused with consistent names/shapes across Tasks 5-8.
