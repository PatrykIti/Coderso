# TASK-442-01-L01: Empty List Persistence Ordered Toggle And Shared Editing Surface
# FileName: TASK-442-01-L01-Empty-List-Persistence-Ordered-Toggle-And-Shared-Editing-Surface.md

**Parent Subtask:** TASK-442-01
**Priority:** High
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-442-01
**Status:** ⏳ To Do

---

## Overview

Preserve a freshly inserted List block through save/publish even when it is
still empty, adopt the shared editing/toggle surfaces for items and ordered
state, and close the remaining shared dedicated-control drift from the audit for
layout/style/background/visibility through the shared `TASK-421` surface work.
The audited empty-list drop is **not** reproducible at the pure schema layer
at HEAD `ae9dcc44` (the write/read/publish normalizers preserve `items: []`),
so the persistence fix is gated on the TASK-442-01 reproduction locating the
live-path layer (save/autosave payload, stale-CSRF save-failure + cache-event
rehydration at `PageEditor.tsx:1520-1554`, or publish flow) or recording that
the drop no longer reproduces at HEAD; without a fresh failing reproduction
this leaf lands only the regression pins and surface adoption below.
Inline-edit entry/commit machinery is owned by TASK-422
(`core/services/pages/pageInlineEditContract.ts` targets map + shared canvas
contenteditable flow); this leaf only registers the list `items` targets in
`inlineEditableTargets` and verifies behavior.

---

## Sub-Tasks

- [ ] Reproduce the empty-list drop in the live admin flow (including the
      stale-CSRF save-failure + cache-rehydration path) and record the first
      layer that drops the block, or record that it no longer reproduces at
      HEAD (hard gate for the persistence fix).
- [ ] Implement the scoped owner-file changes described below.
- [ ] Add or update the targeted regression coverage for this leaf.
- [ ] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Round-trip pin (passes today at the schema layer — pins current behavior):
const block = createDefaultListBlock();
expect(roundTrip(block)).toContain("list");

// Items coercion pin (pageDocumentV2.ts:1344): non-array `items` coerce
// silently to []; array entries pass through cloned, without per-item
// validation. This leaf documents and pins that contract:
expect(roundTripProps({ items: "not-an-array" }).items).toEqual([]);

// Ordered toggle: verify the list panel renders the shared TASK-421 toggle
// widget through getPageEditorControlsForTarget
// (core/services/pages/pageEditorControlRegistry.ts:508) and
// RegistryControlField (core/admin/ui/pages/PageEditor.tsx ~2524) — widget
// implementation is owned by TASK-421; this leaf verifies adoption.

// Inline items editing: register the list `items` targets in
// inlineEditableTargets (core/services/pages/pageInlineEditContract.ts —
// new module, created by TASK-422-01-L01) and verify the shared flow.
```

Owner files:

- `core/admin/ui/pages/PageEditor.tsx`
- `core/services/pages/pageEditorControlRegistry.ts`
- `core/services/pages/pageRendererV2.tsx`
- `core/services/pages/pageDocumentV2.ts`

Validation commands:

- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Expected data flow:

- Empty default lists remain persisted draft/published state until the author
  decides otherwise (already true at the schema layer; the live-path
  reproduction owns proving it end to end).
- Ordered already persists as a boolean owner field; the audited drift is
  widget-only — verify the panel renders the shared TASK-421 toggle instead
  of the native yes/no select.
- List items use the shared editing surface without breaking runtime markup.

Error handling:

- The schema layer does not prune empty item collections (verified green at
  HEAD `ae9dcc44`); the TASK-442-01 live-path reproduction owns locating any
  layer that still empties the page, and the persistence fix is gated on it.
- Items normalization contract (`pageDocumentV2.ts:1344`): non-array `items`
  payloads coerce silently to `[]`, and array entries pass through clone-only
  without per-item validation. Decision: this leaf keeps and documents the
  current coercion behavior and pins it with a regression test; tightening
  (write-mode rejection or per-item validation) is explicitly out of scope
  here and would need its own task.

Regression-test shape:

- Vitest coverage for empty/populated list round-trip (passes today at the
  schema layer — kept as a regression pin), a pin for the non-array `items`
  → `[]` coercion contract, and UI coverage for the ordered toggle/editing
  surface. The catalog-wide all-insertable-types round-trip guard is owned
  by TASK-449-02-L01; this leaf owns only the list-specific coverage.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session on downstream saves.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only schema-owned List fields may persist; note the current
  owner contract coerces non-array `items` to `[]` and passes array entries
  through clone-only (`pageDocumentV2.ts:1344`) — documented and pinned, not
  silently widened.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- List runtime/render coverage as needed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.
