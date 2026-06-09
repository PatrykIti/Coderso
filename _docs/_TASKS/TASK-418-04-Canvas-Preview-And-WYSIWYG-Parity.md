# TASK-418-04: Canvas Preview And WYSIWYG Parity
# FileName: TASK-418-04-Canvas-Preview-And-WYSIWYG-Parity.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Admin UI / Pages / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-418-02, TASK-418-03
**Status:** ⏳ To Do

---

## Overview

Make admin canvas feedback honest. Controls for layout, style, spacing,
background, visibility, responsive overrides, and block styling must visibly
affect the canvas and match public runtime behavior closely enough that users
trust the editor.

---

## Security Contract

- **Endpoint visibility:** no new endpoint unless preview contracts are changed;
  current work should use existing admin UI and public preview paths.
- **Auth model:** existing admin session for admin; preview token for public
  preview reads.
- **RBAC:** existing Pages permissions.
- **CSRF:** existing admin write CSRF behavior for saves.
- **Rate-limit bucket:** existing admin and preview buckets.
- **Validation:** canvas must render normalized v2 documents and must not invent
  fallback fields outside the contract.
- **Anti-abuse controls:** embed/html/media rendering in canvas must preserve
  sanitizer and trusted-source policies.

---

## Sub-Tasks

- [ ] TASK-418-04-L01: Shared admin preview renderer and style helpers.
- [ ] TASK-418-04-L02: Section layout style spacing visibility feedback.
- [ ] TASK-418-04-L03: Block style visual feedback and empty states.

---

## Testing Requirements

- Vitest UI tests for visible section/block style changes in the canvas.
- Bun runtime tests for matching public output where runtime helpers are shared.
- `coderso-dev-core-host` plus `playwright-cli` smoke after this area is usable.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` if style contracts change.
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
