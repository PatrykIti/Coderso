# TASK-449-02: Columns Persistence And Slot Round-Trip Implementation
# FileName: TASK-449-02-Columns-Persistence-And-Slot-Round-Trip-Implementation.md

**Parent Task:** TASK-449
**Priority:** High
**Category:** Pages / Page Editor V2 / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-449-01
**Status:** ⏳ To Do

---

## Overview

Fix the root cause that drops `columns` on save, in the layer identified by
TASK-449-01, and make the slot contract round-trip safely across insert, save,
reopen, publish, and nested-child edits. **Hard gate:** this fix contract may
only be written against the layer TASK-449-01 records; a fresh failing live
reproduction (or an explicit "not reproducible at HEAD" record, in which case
only the regression guard lands) is a precondition. The pure schema layer is
verified green at HEAD `ae9dcc44`: `normalizeBlockSlots` already preserves
empty slot arrays and overflow children, so this subtask must not rewrite that
behavior. It also adds the all-insertable-block regression guard — green
today, pinning current behavior — so no sibling block silently vanishes in
the same way.

---

## Sub-Tasks

- [ ] TASK-449-02-L01: Preserve empty column slots, nested children, and round-trip coverage.

## Implementation Pseudocode

```ts
// Verified current behavior at HEAD ae9dcc44 (do NOT re-implement it):
// normalizeBlockSlots (core/services/pages/pageDocumentV2.ts:1425-1503)
// already keeps empty slot arrays, accepts the static columns slot key list
// independent of props.count, preserves overflow children, and never drops
// the block; getPageBlockActiveSlotKeys (pageDocumentV2.ts:459-466) only
// clamps active-slot exposure.
//
// Fix contract: target ONLY the layer recorded by TASK-449-01 (candidates:
// editor save/autosave payload at PageEditor.tsx:1537/:1550, stale-CSRF
// save failure + cache-event rehydration around PageEditor.tsx:1520-1554,
// publish flow). If TASK-449-01 records "not reproducible at HEAD", this
// subtask lands only the regression guard below.

test("every editor-insertable block survives round-trip", () => {
  for (const type of editorInsertableBlockTypes) {
    expect(roundTrip(type)).toContain(type); // green today — permanent pin
  }
});
```

Expected data flow:

- Empty column slot arrays remain valid persisted state (current behavior,
  pinned by the guard).
- Nested child blocks in `column:N` slots survive read/write normalization
  (current behavior, pinned by the guard).
- Count changes clamp active slot exposure without destructive child loss
  (current behavior, pinned by the guard).
- The live save → reopen → publish flow keeps the columns block end to end
  once the layer identified by TASK-449-01 is fixed.

Error handling:

- Unknown slot keys remain rejected unless explicitly mapped.
- Editor defaults must never require production-only fallbacks.

Regression-test shape:

- Vitest for populated `column:1` / `column:2` children and all-insertable
  block round-trip coverage.
- Bun runtime proof that published HTML contains `data-page-block="columns"`.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** slot normalization stays schema-first and reject-unknown.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- New Vitest round-trip suite and relevant Bun page-render tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`

