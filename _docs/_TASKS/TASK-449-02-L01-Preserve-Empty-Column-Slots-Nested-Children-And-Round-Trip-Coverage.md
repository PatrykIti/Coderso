# TASK-449-02-L01: Preserve Empty Column Slots Nested Children And Round Trip Coverage
# FileName: TASK-449-02-L01-Preserve-Empty-Column-Slots-Nested-Children-And-Round-Trip-Coverage.md

**Parent Subtask:** TASK-449-02
**Priority:** High
**Category:** Pages / Page Editor V2 / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-449-02, TASK-449-01-L01
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement the persistence fix for `columns` in the layer identified by
TASK-449-01-L01 (hard gate: a fresh failing live reproduction is a
precondition). The schema layer already preserves empty slot arrays and
nested children at HEAD `ae9dcc44`, so this leaf must not rewrite
`normalizeBlockSlots`; if the reproduction records "not reproducible at
HEAD", this leaf lands only the all-insertable-block round-trip guard
requested by the audit (the guard passes today and pins current behavior).

---

## Sub-Tasks

- [x] Implement the scoped owner-file changes described below.
- [x] Add or update the targeted regression coverage for this leaf.
- [x] Verify lint/types and the lane-owned commands before handing off to the closure task.

## Implementation Pseudocode

```ts
// Schema layer verified green at HEAD ae9dcc44: normalizeBlockSlots
// (core/services/pages/pageDocumentV2.ts:1425-1503) keeps empty slot arrays
// and preserves overflow children; do not rewrite it. Implement the fix only
// in the layer recorded by TASK-449-01-L01 (editor save/autosave payload at
// PageEditor.tsx:1537/:1550, stale-CSRF save failure + cache-event
// rehydration around PageEditor.tsx:1520-1554, or publish flow); if no layer
// reproduces the drop, land only the guard below.

test("all insertable blocks survive round-trip", () => {
  // green today — permanent pin of current schema-layer behavior
  for (const type of editorInsertableBlockTypes) expect(roundTrip(type)).toContain(type);
});
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

- Empty column slots remain persisted state (current behavior, pinned).
- Nested child blocks survive write/read/publish (current behavior, pinned).
- Count changes clamp active slots non-destructively (current behavior,
  pinned).
- The live save → reopen → publish flow keeps the columns block once the
  layer identified by TASK-449-01-L01 is fixed.

Error handling:

- Unknown slot keys remain rejected unless explicitly mapped.
- No production-only fallbacks are added for tests.

Regression-test shape:

- Vitest round-trip coverage for default/populated columns and all insertable
  block types, plus Bun runtime HTML proof.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** slot handling stays inside `pageDocumentV2.ts` reject-unknown
  semantics.

---

## Testing Requirements

- Relevant Vitest round-trip suites and Bun runtime page tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`



## Documentation Updates Required

- None beyond the parent family docs unless this leaf changes the owning contract; parent closure task owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11: monotonic freshness guard implemented in the
rehydration effect (`PageEditor.tsx`), all-insertable-block round-trip guard
suite landed at `tests/vitest/pages/page-document-v2-block-roundtrip.test.ts`
(14-type pin + columns empty-slot/children/overflow pins + list pins), UI
regression tests added. Validation: targeted Vitest suites green (113 tests
across ui flow + pages), `bun --cwd core lint` and `lint:types` clean,
`git diff --check` clean, live playwright-cli verification PASS.
