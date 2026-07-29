# Schedule Builder State Persistence — Design

**Date:** 2026-07-28
**Status:** Approved, ready for implementation planning

## Problem

`ScheduleBuilder.tsx` holds `selectedCourses` and `pinnedSections` in React `useState` only. A refresh, an accidental back-button press, or navigating to another page discards everything with no warning and no recovery. Losing twenty minutes of course picking to a stray click is the kind of failure that makes people stop trusting a tool.

This is the highest-priority item in `docs/feature-wishlist.md`.

## Goal

Selected courses, pinned sections, and ranking preferences survive a page reload and navigation away from the builder. No new UI.

## Decisions

Each of these was settled during brainstorming; the rationale matters more than the choice.

### Silent restore, no new UI

State reappears as it was. No banner, no prompt, no "resume or start fresh" dialog. This matches how the term selector already behaves — `TermContext` silently restores `selectedTerm` from localStorage with no notice — so the builder restoring its own state is consistent rather than surprising.

### Generated combinations are not persisted

`ScheduleBuilder.tsx:119-122` already runs a debounced `generate` whenever courses, pins, or term change. Restoring courses and pins therefore causes results to regenerate on their own about 400ms later. Persisting `combinations` would duplicate state the app already rebuilds for free, and would risk showing results that no longer match the current catalog.

### View position and draft save name are not persisted

Restoring `selectedIndex` would be quietly wrong: it indexes into `ranked`, whose ordering depends on freshly regenerated combinations. Index 3 of the old results is not necessarily index 3 of the new ones, so restoring it can silently display a different schedule than the one the user was looking at. `generate` already resets the index to 0. The draft `saveName` is low value and equally transient.

### Ranking preferences persist globally, not per term

Preferences are not term-specific, so they live under their own key rather than being duplicated per term. Persisting them is what anyone would expect from something labeled "preferences."

### Full objects are stored, not IDs

`selectedCourses` is `CourseInfo[]` and `pinnedSections` is `Section[]`. Both are stored whole.

The alternative — storing IDs and refetching on mount — is always fresh but pays a real cost on every page load: N `getCourseDetails` calls, a loading state the builder does not currently have, a flash of empty UI, and for pinned sections a reconstruction path that does not exist today (there is no fetch-section-by-ID endpoint; you would fetch each course's sections and match IDs).

Storing objects makes restore synchronous and free. The tradeoff is staleness: if the catalog is re-seeded and a pinned section disappears, the stored object describes something that no longer exists. That failure is mild and self-healing — the generator receives the dead ID in `lockedSectionIds`, finds no valid combination, and the existing `NoResultsPanel` renders. Unpinning fixes it. Given catalog data is manually seeded via `npm run seed:raw` and changes rarely, the staleness window this would protect against is largely theoretical today.

### Stored payloads are versioned

Every payload carries a `version` field. Anything that does not match the current version is discarded and treated as absent. Without this, a future change to the shape of `CourseInfo` or `Section` would leave stale localStorage entries that throw on read and break the builder on load — a genuinely painful bug to trace back to its cause.

## Architecture

### New module: `frontend/src/lib/builderStorage.ts`

The project's vitest runs with `environment: "node"` (see `vitest.config.ts`), where `localStorage` does not exist. The module is therefore split so its logic is testable without a DOM, following the precedent set by `calendarLayout.ts`:

**Pure, fully unit-tested:**
- `serializeBuilderState(state: BuilderState): string`
- `parseBuilderState(raw: string | null): BuilderState | null` — returns `null` for absent, malformed, or version-mismatched input. Never throws.
- `serializePreferences(preferences: RankingPreferences): string`
- `parsePreferences(raw: string | null): RankingPreferences | null` — same contract.

**Thin storage wrappers, not unit-tested:**
- `loadBuilderState(termCode: string): BuilderState | null`
- `saveBuilderState(termCode: string, state: BuilderState): void`
- `loadPreferences(): RankingPreferences | null`
- `savePreferences(preferences: RankingPreferences): void`

### Storage keys and payloads

| Key | Stored JSON |
|---|---|
| `builderState:<termCode>` | `{ version: 1, courses: CourseInfo[], pins: Section[] }` |
| `builderPreferences` | `{ version: 1, preferences: RankingPreferences }` |

`version` is a serialization detail, not part of the in-memory type. `BuilderState` is `{ courses: CourseInfo[]; pins: Section[] }`; `serializeBuilderState` adds the version on write and `parseBuilderState` verifies then strips it on read, returning the bare `BuilderState`. Likewise `parsePreferences` returns a bare `RankingPreferences`, not the wrapper. Callers never see or handle the version.

The version lives inside the payload rather than in the key, so a version bump does not require a key migration. Orphaned entries from an older version are discarded on read and are not actively cleaned up; the volume is negligible.

### Component integration in `ScheduleBuilder.tsx`

**Restore happens in lazy `useState` initializers**, not in an effect:

```
const [selectedCourses, setSelectedCourses] = useState<CourseInfo[]>(
  () => loadBuilderState(termCode)?.courses ?? [],
);
```

All three restored values use this pattern: `selectedCourses` and `pinnedSections` from `loadBuilderState(termCode)`, and `preferences` from `loadPreferences() ?? DEFAULT_PREFERENCES`.

This ordering is load-bearing. If restore ran inside an effect, the save effect would execute in the same commit while its closure still held the initial empty arrays, writing empty over the user's saved data before the restore committed. Initializing synchronously eliminates that window rather than papering over it.

**The existing term effect is repurposed, not guarded away.** `ScheduleBuilder.tsx:124-135` currently clears all builder state whenever `termCode` changes. It becomes *load this term's state*:

- `selectedCourses` and `pinnedSections` are loaded from storage for the new term (empty if nothing is stored).
- `combinations`, `nearMisses`, `selectedIndex`, `hasGenerated`, `saveSuccess`, `saveError`, and `detailCourse` still reset, exactly as today — they are derived or transient.
- `requestIdRef` is still bumped to invalidate any in-flight generation.

The effect is ref-guarded to skip its first run, since the lazy initializers already handled mount.

This produces a deliberate behavior change beyond pure persistence: switching Fall to Winter and back restores the Fall work rather than destroying it. This was explicitly approved.

**Two write effects:**
- on `[termCode, selectedCourses, pinnedSections]` — writes the per-term payload
- on `[preferences]` — writes the preferences payload

**The per-term write is guarded by an ownership ref.** Without a guard, switching terms corrupts the destination term's stored state. When `termCode` changes, React renders with the new term but the previous `selectedCourses`, because the load effect's `setState` has not flushed yet. Effects then run in declaration order: the load effect requests the new term's state, but the write effect executes in that same commit with the new `termCode` and the *old* courses still in its closure, writing the previous term's selection under the new term's key.

That does self-correct on the following commit, but depending on "the wrong value is overwritten a few milliseconds later" is the same fragility the lazy initializers were chosen to avoid on mount, and it breaks outright if anything reads storage inside that window.

The guard is a ref holding the term that the in-memory state belongs to:

- Initialized to the mount-time `termCode`, alongside the lazy initializers.
- The load effect sets it to the new term at the same time it loads that term's state.
- The write effect writes only when `stateTermRef.current === termCode`, and skips otherwise.

The invariant this enforces, stated plainly: never persist builder state under a term it did not come from.

### Error handling

- All localStorage writes are wrapped in try/catch and fail silently. localStorage throws in private browsing and when quota is exhausted; failing to persist must never break the builder, because persistence is a convenience rather than core functionality.
- All reads go through the parse functions, which return `null` rather than throwing on absent, malformed, or version-mismatched data.

## Testing

**Automated (vitest, node environment):** `frontend/src/lib/builderStorage.test.ts` covering the pure functions — round-trip serialize/parse, `null` for absent input, `null` for malformed JSON, `null` for a version mismatch, and `null` for structurally wrong payloads (for example a payload whose `courses` is not an array).

**Manual:** the component wiring has no automated coverage. This project has no jsdom and no React Testing Library, and adding them is out of scope (a deliberate standing decision, not an oversight). The following require a browser pass:

1. Add courses and pins, reload the page — both reappear, and results regenerate on their own.
2. Navigate away to another page and back — state is still there.
3. Switch term, add different courses, switch back — each term retains its own selection.
4. With nothing stored, the builder opens empty as it does today.
5. Preferences set in the Preferences tab survive a reload.
6. Remove all courses, reload — the builder stays empty rather than resurrecting the cleared selection.
7. Add courses under Fall, switch to Winter, and immediately reload while still on Winter — Winter must be empty. This is the check that the ownership ref actually holds; without it, Fall's courses leak into Winter's stored state.

## Out of Scope

- **Schedule staleness indicators.** Showing users whether a saved schedule still reflects current catalog data is a good idea and was raised during this discussion, but it is a separate technical problem tied to catalog sync, not to builder persistence. Revisit alongside the MVP's data-freshness work once live API access exists.
- **Storing IDs and refetching.** See the decision above.
- **Persisting generated combinations, view position, or draft save name.** See the decisions above.
- **Per-user scoping of stored state.** localStorage is per-browser, and the existing `selectedTerm` key is not user-scoped either. Consistent with current behavior; revisit only if shared-device use becomes a real complaint.
- **Adding a component testing stack.** Standing decision for this codebase.
