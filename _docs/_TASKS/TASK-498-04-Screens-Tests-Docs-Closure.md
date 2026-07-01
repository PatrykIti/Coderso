# TASK-498-04: Screens Tests, Docs + Closure
# FileName: TASK-498-04-Screens-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Custom Screens / Testing / Documentation / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-498-01, TASK-498-02, TASK-498-03
**Status:** ✅ Done
**Completed:** 2026-07-01
**Parent Task:** TASK-498

---

## Overview

Close out TASK-498: land the full test matrix for the new kinds + relation resolver + look
parity + list-view removal, document the per-kind `data` schemas and the relation-resolution
contract, run the gates + runtime smoke, optionally add the non-destructive read-path repair
for the dead `actions`/`legacy-widget` placeholders, and write the closure changelog +
board/Statistics update.

- **Goal:** every new kind validates (reject-unknown within new-kind `data`; legacy kinds
  stay permissive; allow-list intact; `schemaVersion` stays `1`/def `4`; stored V4 round-trips
  byte-stable); builder/entry/preview render correctly; the resolver is unit-covered; gates +
  runtime smoke green; docs + changelog updated; the program is closed truthfully.
- **Owning module/service:** test suites under `tests/vitest/customScreens/*`,
  `tests/vitest/admin/custom-screen-schemas.test.ts`, `tests/vitest/ui*/custom-screen*`;
  docs `_docs/CONTENT_TYPES_SPEC.md` (or a screens contract doc); `_docs/_CHANGELOG/`;
  `_docs/_TASKS/README.md`. Optional read-path repair in
  `core/services/customScreens/customScreenSchemas.ts` (`...ForRead` paths only).
- **Out of scope:** no new behavior beyond the optional read-path repair; no schema-version
  bump; no route/RBAC change.

---

## Security Contract

Tests + docs + closure only. The optional read-path repair (mapping the dead `actions` kind
and stray `legacy-widget` placeholders to the new typed kinds) is **read-path only**
(`normalizeCustomScreenDefinitionForRead` / `normalizeCustomScreenEditorViewDefinitionV4ForRead`),
**never on write**, so it cannot widen the write contract and introduces no endpoint, auth,
RBAC, CSRF, or rate-limit change. `schemaVersion` stays `1`/def `4`; no DB migration.

---

## Implementation Pseudocode

### Test matrix

```ts
// customScreenSchemas (tests/vitest/admin/custom-screen-schemas.test.ts):
//  - each new kind validates with allow-listed data;
//  - reject-unknown key WITHIN a new kind's data throws "custom_screen_definition_invalid";
//  - legacy kind with an extra data key still passes (backward-compat);
//  - binding allow-list still enforced (relation field root allowed; junk root rejected);
//  - schemaVersion stays 1, definition stays 4;
//  - round-trip read of an existing V4 screen is byte-stable (no migration).
// screenDocumentOps (tests/vitest/customScreens/screenDocumentOps.test.ts):
//  - createScreenBlock for each new kind emits expected block.data + bindings
//    (read mode for display blocks; related-list emits items binding + derived target;
//    tabs emits slots matching data.tabs; divider/text/tabs emit no bindings).
// ScreenRuntimeRenderer (dedicated suite tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx
//   [created in 498-02, extended in 498-03] + the ui-integration restyle suites):
//  - builder mode renders corner tag + {{ label }} Token (no live value, no Editable/Read badge);
//  - entry/preview render real values;
//  - related-list renders resolved rows + skeleton when unresolved;
//  - divider/tabs render without bindings; unknown type → legacy placeholder.
// Relation resolver (tests/vitest/customScreens/relatedEntryResolver.test.ts):
//  - ID[] → RelatedEntrySummary[], limit clamp, missing/empty target, empty/null ids;
//    given a readEntries stub returning the WHOLE target list in a different order, ONLY the
//    ids rows return, in the ids' stored order (not the list's), unknown id skipped, and a
//    single-value relation (bare string id) resolves to its one row (scalar coerced to [id]);
//    displayValue resolved from a schema field under row.data (EntrySummary shape); updatedAt
//    surfaced from row.updatedAt onto each RelatedEntrySummary (activity-variant time source).
// Look parity + removal (ui-integration):
//  - 9-chip BlockChip palette renders; right panel = consolidated rail body with in-panel
//    hide button + target label (Pages parity); show/hide toggle flips panelOpen;
//  - the FOUR category icons (Settings / Insert / Layers / Inspect) render — Settings
//    always-enabled and opening screenSettingsPanel (screen-level settings stay reachable),
//    Inspect disabled when no block is selected;
//  - List/Editor toggle absent; list-view canvas not rendered; definition.listView preserved
//    on load→save round-trip.
// Presentation-override look-parity/regression (TASK-496-02 surface MUST SURVIVE the restyle):
//  - the per-entry presentation-override EDITING surface (textSize / textEmphasis / tone /
//    mediaAssetId — the exact allow-list in
//    core/services/customScreens/screenEntryPresentationOverrideContract.ts) MUST STILL render
//    AND persist post-498; it MUST NOT be replaced/subsumed by the 9-chip BlockChip palette or
//    the decorative toolbar chrome (those are additive; the override controls are a distinct,
//    retained surface). Guard: tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx
//    is a MUST-STAY-UNWEAKENED test — its override-render + override-persist assertions may be
//    re-pointed at moved selectors but MUST NOT be deleted or relaxed by the 498 restyle.
// List-View editor removal — concrete file split (removed-vs-kept):
//  - tests/vitest/ui/custom-screen-list-view-canvas.test.tsx: RE-POINT the ~:195 PAGE-LEVEL
//    assertion (the "List View editor renders the shared canvas chrome" case that reaches the
//    List-View editor THROUGH `<CustomScreenEditorPage />` — that page path is removed by
//    498-01) so it no longer asserts a page-reachable List-View editor; but KEEP the ~:89
//    DIRECT-COMPONENT `<ListViewCanvas>` harness GREEN (parent 498 keeps the ListView* component
//    FILES untouched, so the component still mounts + behaves in isolation).
//  - tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx: DROP the ~:89-112
//    'List View'/'Editor View' toggle-text (+ aria-pressed toggle) assertions and the
//    'switching to the Editor View tab reveals the entry-view authoring canvas' case — both
//    exercise the List/Editor toggle removed by 498-01.
// Front/runtime: entries list + entry view render a screen containing every new block;
//  inline write-back unaffected for field/title/slug.
```

### Optional non-destructive read-path repair

```ts
// READ PATH ONLY (customScreenSchemas ...ForRead): map a stored `actions` block → `button`
// and a stray `legacy-widget` placeholder → its typed kind where unambiguous, so old screens
// upgrade visually on read without a write/migration. Never apply on the write path
// (normalizeCustomScreenDefinitionForWrite / normalizeScreenBlock). Guard behind the existing
// try/catch read-repair fallbacks. Add a test that a stored `actions` block reads back as a
// usable button and that the write path still treats unknown-but-typed kinds per 498-02.
```

### Docs

- Extend `_docs/CONTENT_TYPES_SPEC.md` (or add a dedicated screens contract doc) with: the
  per-kind `data` schema table (allow-listed keys + enums per kind), the
  schema-first/reject-unknown/no-version-bump statement, and the Related-list relation
  resolution contract (`RelatedEntrySummary`, host-precomputed `relatedEntries`, read-only +
  reuses entries-read auth/RBAC).
- Cross-link from `_docs/_TASKS/README.md` board + **Statistics**.

### Gates + smoke

- `gates:coderso` (expect 5/5), full `vitest`, `test:bun` (expect the config-wizard reset per
  MEMORY — click through), runtime smoke via `coderso-dev-core-host` + `playwright-cli` on
  `http://coderso-a.localhost:5173/admin/`.

**Data flow / error handling:** N/A beyond the suites above; the read-path repair returns the
repaired document or falls through to the existing legacy-read fallback on any throw.

**Regression-test shape:** the suites enumerated above; assert all pre-existing
`tests/vitest/customScreens/*` + `tests/vitest/ui*/custom-screen*` assertions stay green and
were re-pointed (not weakened) where they referenced the removed List/Editor toggle. Concrete
removed-vs-kept split:

- KEEP UNWEAKENED — `tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx`
  (presentation-override render + persist for textSize/textEmphasis/tone/mediaAssetId; selectors
  may move, assertions may NOT be dropped/relaxed) and the `~:89` direct-component
  `<ListViewCanvas>` harness in `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx` (the
  ListView* component files stay, so it stays green as-is).
- RE-POINT — the `~:195` page-level case in
  `tests/vitest/ui/custom-screen-list-view-canvas.test.tsx` that reached the List-View editor
  through `<CustomScreenEditorPage />` (page path removed by 498-01) → no longer asserts a
  page-reachable List-View editor.
- REMOVE — the `~:89-112` 'List View'/'Editor View' toggle-text (+ `aria-pressed`) assertions
  and the 'switching to the Editor View tab reveals the entry-view authoring canvas' case in
  `tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx` (List/Editor toggle removed
  by 498-01).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/customScreens tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/ui tests/vitest/ui-integration`
- Full `vitest` + `test:bun` green; `gates:coderso` 5/5.
- Runtime smoke (`coderso-dev-core-host` + `playwright-cli` per MEMORY): a screen with every
  new kind renders in the builder (tokens), entry view (values + resolved related-list), and
  the published entries list.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + **Statistics** when this leaf and the parent close.
- Finalize the per-kind `data` schema + relation-resolution contract docs (above).
- Add the closure `_docs/_CHANGELOG/` entry linking **TASK-498** + all four subtasks, stating
  explicitly: no `ScreenDocumentV1` schema-version bump, no definition version bump, no DB
  migration, no route/RBAC change (except the read-only relation resolver reusing existing
  entries-read auth); List-view editor surface removed non-destructively (model/runtime
  retained); right rail brought to Pages parity.
