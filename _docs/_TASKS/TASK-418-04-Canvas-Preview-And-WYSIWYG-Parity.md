# TASK-418-04: Canvas Preview And WYSIWYG Parity
# FileName: TASK-418-04-Canvas-Preview-And-WYSIWYG-Parity.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** Admin UI / Pages / Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-418-02, TASK-418-03
**Status:** ✅ Done
**Started:** 2026-06-09
**Completed:** 2026-06-10

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

- [x] TASK-418-04-L01: Shared admin preview renderer and style helpers.
- [x] TASK-418-04-L02: Section layout style spacing visibility feedback.
- [x] TASK-418-04-L03: Block style visual feedback and empty states.
- [x] TASK-418-04-L04: Section type variant layout templates.

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

---

## Progress Notes

- 2026-06-09: L01 shared renderer extraction is complete. Public runtime and
  admin canvas now consume `core/services/pages/pageRendererV2.tsx`; remaining
  leaves own visible section/block style feedback and section variant templates.
- 2026-06-09: L02 started to wire registry-owned section controls and make
  section layout/style/spacing/visibility feedback visible in the admin canvas.
- 2026-06-09: L02 completed section registry controls, supplemental visibility/
  background fields, canvas-device column classes, and hidden section ghost
  state. Remaining leaves cover block style feedback and section variants.
- 2026-06-10: L03 started to make block style controls, selection, hidden
  states, and empty placeholders visibly affect the admin canvas.
- 2026-06-10: L03 completed shared block render props, public hidden-block
  omission, admin hidden-block ghost chrome, and canvas-visible block style
  feedback. Remaining work in this parent is section type/variant templates.
- 2026-06-10: L04 started to make supported section type/variant pairs drive
  shared renderer templates and type-scoped variant controls.
- 2026-06-10: L04 completed the section template matrix, shared renderer
  variant templates, type-scoped base-only variant controls, and
  capability-derived section insertion. TASK-418-04 is closed with all leaves
  done.
