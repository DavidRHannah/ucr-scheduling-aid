# Collapsible Sidebar — Design

## Problem

The app sidebar is a fixed 260px column on every page (`AppLayout.tsx`). On
pages with dense content — the Schedule Builder in particular, now that it
carries a calendar, ranked-result header, alternatives strip, section table,
and action bar — that's 260px permanently unavailable to the thing the user
is actually there to look at. There's no way to reclaim it.

## Goal

Let the user collapse the sidebar to a narrow icon-only rail, reclaiming
horizontal space for the main content, and have that preference persist
across reloads.

## Non-goals

- No new context or app-wide state — this is a self-contained concern of the
  sidebar and its immediate layout parent.
- No responsive/auto-collapse behavior on small screens — manual toggle only.
- No keyboard shortcut.
- No tooltips on collapsed nav icons — icons alone, matching the existing
  icon set already used for each route.

## Current state

- `AppLayout.tsx` lays out the page as a CSS Grid: `grid-cols-[260px_1fr]`,
  with `Sidebar` in the first track and `Header` + routed page content in the
  second.
- `Sidebar.tsx` is a fixed-width `<aside>` containing: a brand/logo block, four
  `NavLink` nav items (icon + label), a conditional Sign Out button, and a
  "System Active" status footer (colored dot, catalog term, version string).

## Design

### Structural change: Grid → Flexbox in `AppLayout`

`grid-template-columns` doesn't animate cleanly when a track's size needs to
change at runtime — `grid-cols-[260px_1fr]` has no natural way to interpolate
to a different first-track width without also being told about the new value
from outside. Rather than introduce cross-component state just to solve an
animation problem, `AppLayout`'s outer container changes from
`grid grid-cols-[260px_1fr]` to `flex`. This is a purely structural swap: at
the sidebar's current (expanded) width there is no visible difference, and
`Header` / routed content already use `flex-1` / `overflow` treatment that
works identically under a flex parent. No visual or behavioral change to
anything except that the sidebar's width can now be transitioned as a normal
CSS `width` property and the rest of the layout reflows automatically.

### Sidebar owns its own collapse state

`Sidebar` becomes fully self-contained:

- `isCollapsed: boolean` via `useState`, initialized by reading
  `localStorage.getItem("sidebar-collapsed")` on mount (`"true"` → collapsed;
  anything else, including absent, → expanded).
- Toggling flips the state and writes the new value back to
  `localStorage` synchronously.
- `AppLayout` needs no knowledge of this state at all — it isn't lifted,
  isn't passed as a prop, and no context is introduced.

### Width and transition

- Expanded width: unchanged, `260px` (`w-[260px]`).
- Collapsed width: `64px` (`w-16`) — enough for a centered icon with padding.
- The `<aside>` gets `transition-[width] duration-200` so toggling animates
  smoothly; flex reflow of the main content happens automatically as a side
  effect of the width change, no separate animation needed there.

### Toggle control

A chevron icon button sits in the sidebar's top row, in the same area the
brand block currently occupies:

- Expanded: chevron points left (semantically "collapse this").
- Collapsed: chevron points right ("expand this").
- Click toggles `isCollapsed` and persists it.

### Per-section collapsed treatment

| Section | Expanded | Collapsed |
|---|---|---|
| Brand/logo | "UCR" + "SCHEDULING AID" wordmark, toggle button alongside | Wordmark hidden; only the toggle button remains in that row |
| Nav items | Icon + label, left-aligned | Icon only, centered; active/hover background styling unchanged |
| Sign Out | Icon + label, left-aligned | Icon only, centered |
| Status footer | *(removed — see below)* | *(removed)* |

### Status footer: removed entirely

The "System Active" block (colored dot + catalog term + version string) is
removed from `Sidebar.tsx` outright, in both collapsed and expanded states —
not merely hidden when collapsed. It doesn't serve a real product purpose and
its removal was requested independent of the collapse feature itself, so
there's no conditional to maintain for it.

## Data flow

None beyond local component state. No API calls, no new types, no backend
involvement.

## Testing / verification

No new automated test infrastructure — consistent with the rest of the
frontend's component layer (Vitest remains scoped to the pure scoring module
per existing project convention). Verification is:

1. `npm run build` and `npm run lint` (must stay at or under the current
   lint baseline).
2. A live browser check via Playwright (now available in this environment)
   driving the actual dev server: toggle collapse/expand, confirm the layout
   reflows correctly, confirm `localStorage` persistence survives a reload,
   and screenshot both states.

## Open questions

None — all resolved during brainstorming.
