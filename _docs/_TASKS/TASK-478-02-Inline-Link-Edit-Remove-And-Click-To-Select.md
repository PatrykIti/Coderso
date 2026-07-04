# TASK-478-02: Inline Link Edit, Remove, And Click-To-Select
# FileName: TASK-478-02-Inline-Link-Edit-Remove-And-Click-To-Select.md

**Parent Task:** TASK-478
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-478-01, TASK-476-01 (mark replace/toggle)
**Status:** ⏳ To Do

---

## Overview

Let the author edit and remove an inline link, and stop a linked fragment from
hijacking selection in the editor. Today there is no unlink control, the URL field
cannot clear a link, it does not load an existing link's href, and clicking a
linked fragment on the canvas navigates (beforeunload) instead of selecting it.

## Current State (verified live 2026-06-27)

- `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`: the mark toolbar has bold,
  italic, color/highlight swatches, and a single **"Apply link"** button
  (`data-page-editor-text-mark-button="link"`, `:566-572`) with a URL `<input>`
  (`:557-565`). The Apply button is `disabled={!selectionRange ||
  linkHref.trim().length === 0}` — so an empty URL cannot be applied to clear a
  link, and there is **no remove/unlink button**.
- The URL `<input value={linkHref}>` is driven by local `linkHref` state and is
  **not seeded** from the selected fragment's existing href, so the author cannot
  see/edit the current link.
- Removal is technically possible only by re-typing the exact same href and
  re-applying (value-aware toggle in `applyBlockTextMark`, TASK-476-01) — entirely
  undiscoverable.
- On the canvas the linked fragment is a live `<a href>`; clicking it **navigates**
  (fires the beforeunload confirm) rather than placing the caret / selecting, so
  the author cannot click-to-edit a link.

## Implementation sketch

1. **Remove/unlink:** add an explicit "Remove link" control (enabled when the
   selection overlaps a link mark), wired to drop the `link` mark over the range
   via the existing mark path (a dedicated remove, not the same-href toggle). Keep
   `applyBlockTextMark` value-aware behavior intact.
2. **Edit existing:** when the selection is inside/over a link mark, seed the URL
   `<input>` with that mark's href so Apply edits it; applying a new href replaces
   it (TASK-476-01 replace semantics already cover same-range different-value).
3. **Click-to-select, not navigate:** while the block is in inline edit (or
   selected), suppress link navigation so a click places the caret / selects the
   fragment instead of opening the URL. Options: render the editor-only anchor with
   `onClick` preventDefault while editing, or paint links as non-navigating spans
   in edit mode and only as real `<a>` on the front / preview. Must not break the
   front behavior (real navigable links) or TASK-476-02 in-edit painting.

## Error handling / invariants

- href continues through the neutral authoring href sanitizer; reject-unknown and
  `rel="nofollow noreferrer"` preserved on the front.
- Removing a link must not disturb overlapping color/highlight/bold marks on the
  same range.

## Regression-test shape

- Vitest (`page-authoring-canvas` / `page-document-v2`): remove-link drops only the
  `link` mark over the range and retains other marks; selecting a linked range
  seeds the URL field; an editor-mode click on a linked fragment does not navigate
  (assert the anchor's click is prevented while editing).

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`, relevant Vitest suites; live
  smoke: add a link, see it, edit it, remove it, and click a linked fragment to
  re-select without navigating.
