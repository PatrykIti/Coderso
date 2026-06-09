# TASK-418-02: Immediate Editor Correctness And Selection
# FileName: TASK-418-02-Immediate-Editor-Correctness-And-Selection.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-418-01
**Status:** ⏳ To Do

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

- [ ] TASK-418-02-L01: Type-safe block patching and autosave errors.
- [ ] TASK-418-02-L02: Block selection model and layers tree.
- [ ] TASK-418-02-L03: Block insert, reorder, duplicate, and delete actions.

---

## Testing Requirements

- Vitest UI tests for selected block editing, save failure surfacing,
  block-aware layers, and block actions.
- React Hooks lint/compiler compliance.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_GAP_AUDIT.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if behavior
  intentionally differs from the reference.
