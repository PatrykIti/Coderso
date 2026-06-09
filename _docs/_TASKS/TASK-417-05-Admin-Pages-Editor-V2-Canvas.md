# TASK-417-05: Admin Pages Editor V2 Canvas
# FileName: TASK-417-05-Admin-Pages-Editor-V2-Canvas.md

**Parent Task:** TASK-417
**Priority:** High
**Category:** Admin UI / Pages
**Estimated Effort:** Very Large
**Dependencies:** TASK-417-02, TASK-417-03, TASK-417-04
**Status:** ⏳ To Do

---

## Overview

Replace the current left-library/right-settings widget editor with the new
canvas-first Pages editor: breakpoint switcher, inline section insertion,
floating contextual toolbar, command palette, layers overlay, and responsive
override editing.

---

## Security Contract

- **Endpoint visibility:** uses existing internal `/admin/api/pages*` client
  calls; no new endpoint in this child.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions from route layer.
- **CSRF:** existing admin write CSRF behavior through shared client.
- **Rate-limit bucket:** existing admin bucket.
- **Validation:** UI submits v2 documents only; server remains authoritative and
  rejects unknown fields.
- **Anti-abuse controls:** no public write endpoint is introduced; browser state
  must not store secrets or privileged payloads.

---

## Sub-Tasks

- [ ] TASK-417-05-L01: Editor state reducer and canvas selection.
- [ ] TASK-417-05-L02: Command palette, layers, and floating toolbar.
- [ ] TASK-417-05-L03: Responsive overrides, save, preview, and history.

---

## Testing Requirements

- Vitest UI tests for cache hydration, dirty-state protection, canvas
  selection, command palette insertion, floating toolbar panels, responsive
  overrides, settings, preview, and revisions.
- React Hooks lint/compiler compliance.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md` if the
  implemented UX intentionally diverges from the reference.
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior
  changes.
