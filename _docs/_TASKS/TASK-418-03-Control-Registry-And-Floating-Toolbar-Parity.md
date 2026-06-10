# TASK-418-03: Control Registry And Floating Toolbar Parity
# FileName: TASK-418-03-Control-Registry-And-Floating-Toolbar-Parity.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Admin UI / Pages / Contract
**Estimated Effort:** Very Large
**Dependencies:** TASK-418-02
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09

---

## Overview

Replace hard-coded toolbar panels with a shared control registry for sections
and blocks. The registry must expose universal controls, small type-specific
atomic controls, responsive override metadata, and toolbar capabilities without
duplicating loose prop knowledge outside the Pages v2 contract owner.
`pageDocumentV2` must export the option arrays and section/block capability
metadata consumed by the registry, so UI controls do not duplicate enum or
insertability knowledge.

---

## Security Contract

- **Endpoint visibility:** existing internal Pages writes only.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** registry controls must write only fields accepted by
  `pageDocumentV2` and must not weaken strict unknown-field rejection.
- **Anti-abuse controls:** no public write endpoint; no secrets in UI state.

---

## Sub-Tasks

- [x] TASK-418-03-L01: Universal section and block control registry.
- [x] TASK-418-03-L02: Per-type atomic block controls.
- [x] TASK-418-03-L03: Responsive override indicators and reset UX.
- [x] TASK-418-03-L04: Floating toolbar interactions and keyboard shortcuts.

---

## Testing Requirements

- Vitest contract tests ensuring every insertable section/block type has
  declared controls or an explicit not-insertable reason.
- Vitest owner metadata tests covering section capabilities and exported option
  arrays used by controls.
- Vitest UI tests for toolbar panel switching and control round-trips.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`

---

## Closeout

- Universal section/block control registry, per-type atomic block controls,
  responsive override indicators/reset UX, and floating-toolbar shortcut
  behavior are complete.
- Known follow-up: `TASK-418-04-L02` completes section-toolbar adoption of the
  registry for remaining section fields such as `justify`, `shadow`, and
  `authOnly` while wiring visible section canvas feedback.
- Delete actions now use shared destructive confirmation before draft mutation,
  and keyboard shortcuts are guarded while users type in editable fields.
- Covered by changelog `1148`.

## Validation

- `bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor-v2-flow.test.tsx` (40 tests)
- `bun --cwd core lint:types`
- `bun --cwd core lint`
