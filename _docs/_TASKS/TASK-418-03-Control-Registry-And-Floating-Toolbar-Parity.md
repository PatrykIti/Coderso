# TASK-418-03: Control Registry And Floating Toolbar Parity
# FileName: TASK-418-03-Control-Registry-And-Floating-Toolbar-Parity.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Admin UI / Pages / Contract
**Estimated Effort:** Very Large
**Dependencies:** TASK-418-02
**Status:** ⏳ To Do

---

## Overview

Replace hard-coded toolbar panels with a shared control registry for sections
and blocks. The registry must expose universal controls, small type-specific
atomic controls, responsive override metadata, and toolbar capabilities without
duplicating loose prop knowledge outside the Pages v2 contract owner.

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

- [ ] TASK-418-03-L01: Universal section and block control registry.
- [ ] TASK-418-03-L02: Per-type atomic block controls.
- [ ] TASK-418-03-L03: Responsive override indicators and reset UX.
- [ ] TASK-418-03-L04: Floating toolbar interactions and keyboard shortcuts.

---

## Testing Requirements

- Vitest contract tests ensuring every insertable section/block type has
  declared controls or an explicit not-insertable reason.
- Vitest UI tests for toolbar panel switching and control round-trips.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
