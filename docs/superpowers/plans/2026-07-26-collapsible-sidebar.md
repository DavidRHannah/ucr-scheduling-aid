# Collapsible Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the sidebar collapse to a 64px icon-only rail (toggled by a
chevron button at its top), with the collapsed/expanded preference persisted
across reloads via `localStorage`, and remove the "System Active" status
footer block entirely.

**Architecture:** `AppLayout.tsx`'s outer container changes from CSS Grid to
Flexbox so the main content reflows automatically as the sidebar's width
changes — no cross-component state needed. `Sidebar.tsx` becomes fully
self-contained: it owns its own `isCollapsed` state (initialized from and
persisted to `localStorage`), renders a chevron toggle button, and swaps
between icon+label and icon-only rendering for its nav items and sign-out
button based on that state.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, lucide-react icons
(already a dependency — `ChevronLeft`/`ChevronRight` are part of the same
icon set already used elsewhere in this codebase).

## Global Constraints

- No emojis anywhere in code, comments, commit messages, or documentation.
- Use the `@/` path alias for imports; it maps to `./src/`.
- No backend changes.
- Do not modify anything in `frontend/src/components/ui/`.
- `npm run lint` (run from `frontend/`) must not exceed the current baseline
  of 22 problems (19 errors, 3 warnings). Neither task should introduce a new
  rule category.
- No new automated test infrastructure — this project deliberately scopes
  Vitest to the pure scoring module only (`frontend/src/lib/scheduleRanking.test.ts`).
  Verification for both tasks is `npm run build` + `npm run lint` plus a live
  browser check (a headless Chromium via Playwright is already installed in
  this environment from a prior debugging session — reuse it rather than
  reinstalling).
- All `npm` commands run from `frontend/`; all `git` commands run from the
  repo root.

---

### Task 1: Switch AppLayout from Grid to Flexbox

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Interfaces:**
- Consumes: `Sidebar` (`@/components/layout/Sidebar`), `Header`
  (`@/components/layout/Header`) — both unchanged by this task.
- Produces: no new exports. This task only changes the CSS layout mechanism
  of the existing `AppLayout` component; its own export signature
  (`export function AppLayout()`, no props) is unchanged.

This task exists on its own because it's a mechanical, behavior-preserving
change that should look visually identical at the sidebar's current width —
it's worth being able to verify and commit in isolation before Task 2 makes
the sidebar's width actually change. `grid-template-columns` can't
interpolate to an externally-driven new value without either lifting state
into `AppLayout` or introducing a CSS custom property; switching to Flexbox
sidesteps that entirely, since a flex child's `width` is a normal animatable
CSS property and flex siblings reflow automatically as it changes.

- [ ] **Step 1: Replace the grid container with a flex container**

Current content of `frontend/src/components/layout/AppLayout.tsx`:

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

Replace the outer `<div>`'s className so the file reads:

```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

The only two changes: `grid grid-cols-[260px_1fr]` becomes `flex`, and the
inner wrapper div gains `flex-1` (a flex item needs an explicit
`flex-1` to claim the remaining space the way the grid's `1fr` track did
implicitly — without it, the inner div would only be as wide as its content,
and `Header`/`main` would collapse to their intrinsic width instead of
filling the page). Nothing else in the file changes.

- [ ] **Step 2: Verify the build and lint**

Run (from `frontend/`): `npm run build && npm run lint`

Expected: build PASSES with no errors. Lint stays at or below the 22-problem
baseline (19 errors, 3 warnings) — this change touches no logic, so it should
introduce zero new lint findings.

- [ ] **Step 3: Verify no visual regression in a live browser**

The dev server should already be running at `http://localhost:5173` (backend
at `http://localhost:3000`) — check with
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173` first; if it
isn't running, start it with `npm run dev` from `frontend/` (`run_in_background`).

Write a small throwaway Playwright script (Playwright is already installed
under a scratch directory from a prior session — check
`find / -maxdepth 6 -iname "playwright" -path "*node_modules*" 2>/dev/null`
first, or `npm install playwright` fresh into a scratch directory and
`npx playwright install chromium` if not found) that navigates to
`http://localhost:5173/`, waits for network idle, and takes a full-page
screenshot. Confirm visually: the sidebar is still 260px wide, still flush
against the left edge, nav items and the (still-present at this point,
removed in Task 2) status footer render exactly as before. There should be
no layout shift, no horizontal scrollbar, no overlap.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "Switch AppLayout to flexbox so the sidebar width can animate"
```

---

### Task 2: Collapsible sidebar with persisted state

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `useAuth` (`@/context/AuthContext`, unchanged), `NavLink` (from
  `react-router-dom`, unchanged), `CalendarRange`, `Search`, `Bookmark`,
  `Settings as SettingsIcon`, `LogOut` (from `lucide-react`, unchanged), plus
  two new icon imports from the same package: `ChevronLeft`, `ChevronRight`.
- Produces: `Sidebar()` — same zero-prop export signature as before. No new
  exports; `isCollapsed` state is fully internal to this component and is
  not exposed to `AppLayout` or anywhere else.

**Depends on:** Task 1 (needs the flex parent in place for the width
transition to reflow the rest of the page correctly).

- [ ] **Step 1: Replace the file contents**

Current content of `frontend/src/components/layout/Sidebar.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import {
  CalendarRange,
  Search,
  Bookmark,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Schedule Builder", icon: CalendarRange },
  { to: "/course-search", label: "Course Search", icon: Search },
  { to: "/saved-schedules", label: "Saved Schedules", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const { user, logout } = useAuth();

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

      {user && (
        <div className="space-y-1 px-3 pb-4">
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-blue-100 hover:bg-blue-900/40 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}

      <div className="m-3 rounded-md bg-blue-900/40 p-3 text-xs text-blue-100">
        <div className="mb-1 flex items-center gap-2 font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          System Active
        </div>
        <div>UCR Spring 2026 Catalog</div>
        <div>Version 1.0.0</div>
      </div>
    </aside>
  );
}
```

Replace the entire file with:

```tsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarRange,
  Search,
  Bookmark,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { to: "/", label: "Schedule Builder", icon: CalendarRange },
  { to: "/course-search", label: "Course Search", icon: Search },
  { to: "/saved-schedules", label: "Saved Schedules", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(
    () => window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true",
  );

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  return (
    <aside
      className={`flex h-screen flex-col bg-[#003DA5] text-white transition-[width] duration-200 ${
        isCollapsed ? "w-16" : "w-[260px]"
      }`}
    >
      <div
        className={`flex items-center px-3 py-6 ${isCollapsed ? "justify-center" : "justify-between"}`}
      >
        {!isCollapsed && (
          <div>
            <div className="text-lg font-bold leading-tight">UCR</div>
            <div className="text-sm font-semibold tracking-wide text-blue-200">
              SCHEDULING AID
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 flex-shrink-0 cursor-pointer items-center justify-center rounded-md text-blue-100 hover:bg-blue-900/40"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center rounded-md py-2 text-sm font-medium transition-colors ${
                isCollapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${isActive ? "bg-white text-[#003DA5]" : "text-blue-100 hover:bg-blue-900/40"}`
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && label}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="space-y-1 px-3 pb-4">
          <button
            type="button"
            onClick={logout}
            className={`flex w-full items-center rounded-md py-2 text-sm font-medium text-blue-100 hover:bg-blue-900/40 cursor-pointer ${
              isCollapsed ? "justify-center px-2" : "gap-3 px-3"
            }`}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      )}
    </aside>
  );
}
```

What changed, precisely:

- Added `useEffect`/`useState` import, and `ChevronLeft`/`ChevronRight` from
  `lucide-react`.
- Added `COLLAPSED_STORAGE_KEY` and `isCollapsed` state, initialized via a
  lazy `useState` initializer that reads `localStorage` once on mount, with a
  `useEffect` that writes the value back on every change.
- The `<aside>`'s width class is now conditional (`w-16` vs `w-[260px]`) with
  a `transition-[width] duration-200`; everything else about its className
  (`flex h-screen flex-col bg-[#003DA5] text-white`) is unchanged.
- The brand row now conditionally renders the wordmark (`!isCollapsed &&
  (...)`) and always renders the new chevron toggle button, which flips
  `isCollapsed` and swaps its icon/aria-label accordingly.
- Nav items and the Sign Out button both conditionally render their label
  text (`{!isCollapsed && label}` / `{!isCollapsed && "Sign Out"}`) and swap
  their horizontal alignment/padding classes (`justify-center px-2` when
  collapsed vs `gap-3 px-3` when expanded) so the icon centers in the narrow
  rail instead of sitting at its old left-aligned position. Icons gain
  `flex-shrink-0` so they never compress when the flex row narrows.
- The "System Active" status footer block (the `<div className="m-3
  rounded-md bg-blue-900/40 ...">` at the bottom) is deleted outright — not
  conditionally hidden, removed from the file entirely, in both collapsed
  and expanded states.

- [ ] **Step 2: Verify the build and lint**

Run (from `frontend/`): `npm run build && npm run lint`

Expected: build PASSES. Lint stays at or below the 22-problem baseline (19
errors, 3 warnings) — this file only adds typed React state and JSX
conditionals, nothing that should trip a new lint rule.

- [ ] **Step 3: Verify collapse/expand behavior and persistence in a live browser**

Using the same Playwright setup as Task 1 (dev server at
`http://localhost:5173`), drive the app through this sequence and assert on
each step:

1. Navigate to `http://localhost:5173/`. Confirm the sidebar renders at its
   full width with the "UCR SCHEDULING AID" wordmark, all four nav item
   labels, the Sign Out row (if a token happens to be present in
   `localStorage` from prior testing — otherwise it's absent, which is
   correct/unchanged behavior), and — critically — confirm the "System
   Active" block is gone.
2. Click the chevron toggle button (`aria-label="Collapse sidebar"`).
   Confirm: the sidebar animates down to a narrow rail, the wordmark and all
   nav labels disappear, only icons remain (centered), and the chevron now
   points right with `aria-label="Expand sidebar"`. Confirm the main content
   area visibly gained width (screenshot both states and compare).
3. Evaluate `window.localStorage.getItem("sidebar-collapsed")` in the page
   context — confirm it now reads `"true"`.
4. Reload the page (`page.reload({ waitUntil: "networkidle" })`). Confirm the
   sidebar loads directly into the collapsed rail state (no flash of the
   expanded state first) — this is the persistence requirement.
5. Click the chevron again (`aria-label="Expand sidebar"`). Confirm it
   returns to the full 260px width with all labels visible, and
   `localStorage`'s `sidebar-collapsed` key now reads `"false"`.
6. Confirm zero console errors and zero uncaught page exceptions across the
   whole sequence (same `page.on('console', ...)` / `page.on('pageerror',
   ...)` listener pattern as any other Playwright check in this project).

Take at least one full-page screenshot of the expanded state and one of the
collapsed state for the record.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "Add collapsible sidebar with persisted state"
```

---
