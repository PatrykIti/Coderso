# TASK-539-03-L04: Prove Gallery Controls and Narrow Canvas

# FileName: TASK-539-03-L04-Prove-Gallery-Controls-And-Narrow-Canvas.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Vitest / Admin UX Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-03-L03
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Additive-only test ownership

Create and own only:

- `tests/vitest/pages/task-539-page-editor-controls.test.ts`
- `tests/vitest/ui/task-539-page-editor-flow.test.tsx`

All L01-L03 source-owner suites are read-only here. Do not re-baseline them, edit
source, or append TASK-539 cases to legacy oversized suites.

## Implementation Pseudocode

- Pin the two dedicated gallery UI kinds, all four gallery controls and all five
  divider controls (`tone`, `thickness`, `gradient`, `width`, `align`) as
  base-only, base-vs-effective `showWhen`, base-owned parallax/divider gates, and
  exact `PAGE_LAYER_Z_CLAMP` owner identity.
- Prove gallery item/media/category add-edit-remove behavior, persistent empty draft
  rows, URL-not-ID storage, `null` media clear→row `src:""`, exact
  2,048/2,049 source and 120/500/2,000 row bounds plus 48/12/587 category bounds,
  ordered uniqueness, late-request identity, accessible names, and no mount mutation
  for unmatched URLs/unlisted assignments. Prove both direct row commits and
  selected `MediaRecord.url` accept 2,048 and reject 2,049 without mutation or
  render-time truncation. Dispatch direct alt 501/caption 2,001/source 2,049 commit
  attempts beyond HTML/picker UX guards and prove each is non-mutating. Switch
  between two equal-URL parent scopes and unmount with a pending request; neither old
  completion may emit. Remove row 1 while row 2 has a pending selection and prove the
  surviving row's immutable, non-index identity keeps that completion scoped to row
  2 rather than the new index 0.
- Prove PageEditor uses the dedicated controls and never `ListItemsControl`.
- Through the real PageEditor gallery field, select 2,048- and 2,049-character media
  URLs. The first produces exactly one canonical commit/dirty/autosave transition;
  the second produces none and leaves the current document byte-identical. An
  already-displayed over-limit source stays byte-identical until explicit clear.
- Seed different tablet/mobile overrides, activate each device, and exercise every
  gallery/divider control. Prove visibility, displayed value, auxiliary fields,
  defaults, shell device, and commits all use the base target/device; no responsive
  badge/reset is exposed; the base value changes; the pre-existing responsive object
  stays byte-identical; and dirty/autosave fires exactly once per deliberate edit.
- Pin L05 placement results through PageEditor: root frame/template wrapper allows
  span controls; nested/per-column/non-default-media-split hides them. Include a
  hidden assigned root sibling to prove Admin passes
  `{includeHiddenBlocks:true}`. With no selected path, prove the one canonical
  fallback path is `[{index:0}]`: the same exact path drives registry fields,
  gallery parent scope, span placement, reset, and mutation, and is the argument
  passed to `resolvePageBlockGridPlacement` with
  `{includeHiddenBlocks:true}`. With a selected nested path, all of those use that
  path and placement resolves `"none"`. Prove the placement helper is called only
  after the chosen path resolves in both base and effective sections and is never
  called with nullable `selectedBlockPath`. An empty section or stale selected path
  exposes no block registry field/control (including media/reset), makes no placement
  call, and cannot mutate the section or another block or trigger dirty/autosave.
- In a DOM layout fixture, prove an open inspector adds no rail reservation at
  320/390/480 while normal `p-6` state remains. Pin the exact open class contract:
  retained `p-6 lg:p-8` plus both conditional
  `sm:pr-[300px] lg:pr-[300px]`, with the `lg:pr-[300px]` override ordered after
  `lg:p-8`; closing removes only the conditional tokens and restores the ordinary
  class state. Opening/closing stays usable and does not alter dirty state. Vitest
  must not claim JSDOM computed layout. TASK-539-08 Playwright owns real computed
  right-padding assertions at 640px and an `lg` viewport and the narrow-browser
  overlay/close/reopen flow.
- Pin stable facade imports for `PageEditor`, `PageSettingsSubpanel`,
  `findRecoverableAutosaveRevision`, `resolveToolbarTargetLabel`, `PageEditorProps`,
  and all ten current `PageEditorHost*`/`PageEditorHost` types, plus every split
  suite's independent discovery.

These are TASK-539 cross-contract proofs. They supplement, never replace, real
computed-geometry smoke in TASK-539-08; no Vitest/JSDOM assertion is accepted as
evidence of browser cascade or viewport geometry.

## Validation and line receipt

```bash
bun run test:vitest -- \
  tests/vitest/pages/task-539-page-editor-controls.test.ts \
  tests/vitest/ui/task-539-page-editor-flow.test.tsx \
  tests/vitest/pages/page-block-grid-placement.test.ts \
  tests/vitest/ui/page-editor-media-url-control.test.tsx \
  tests/vitest/ui/page-editor-gallery-items-control.test.tsx \
  tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Both new suites must be `<=1000` and independently runnable. Rerun a named failure
alone.
