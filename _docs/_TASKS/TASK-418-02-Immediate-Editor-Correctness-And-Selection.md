# TASK-418-02: Immediate Editor Correctness And Selection
# FileName: TASK-418-02-Immediate-Editor-Correctness-And-Selection.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-01
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-09

---

## Overview

Fix the correctness issues that make the current editor feel broken: block
selection is missing, toolbar patches target the first block, generic block
patching can produce invalid documents, autosave failures are hidden, and block
actions are not available as first-class canvas operations.

---

## Security Contract

- **Endpoint visibility:** uses existing internal `/admin/api/pages*` writes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions enforced by routes.
- **CSRF:** existing admin write CSRF behavior.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** UI patch helpers must only create documents accepted by
  `pageDocumentV2`; server remains authoritative.
- **Anti-abuse controls:** no public write endpoint; no secrets in browser
  cache, localStorage, assistant context, or debug payloads.

---

## Sub-Tasks

- [x] TASK-418-02-L04: Block style and responsive model substrate.
- [x] TASK-418-02-L01: Type-safe block patching and autosave errors.
- [x] TASK-418-02-L02: Block selection model and layers tree.
- [x] TASK-418-02-L03: Block insert, reorder, duplicate, and delete actions.

---

## Testing Requirements

- Vitest UI tests for selected block editing, save failure surfacing,
  block-aware layers, and block actions.
- React Hooks lint/compiler compliance.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if behavior
  intentionally differs from the reference.

---

## Closeout

- Closed the immediate correctness wave after landing the block style/responsive
  substrate, type-safe breakpoint-aware content patching, visible autosave
  errors, block selection/layers, assistant selected-block context, and
  selected-block insert/move/duplicate/delete actions.
- Remaining PageEditor v2 remediation continues under `TASK-418-03` and later
  runtime/assistant/template parity leaves.

Validation:

- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts`
  - Passed: 13 tests for the substrate leaf.
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - Passed: 12 tests after the L03 closeout.
- `bun --cwd core lint:types`
  - Passed after L01, L02, and L03 edits.
- `bun --cwd core lint`
  - Passed after L01, L02, and L03 edits.
