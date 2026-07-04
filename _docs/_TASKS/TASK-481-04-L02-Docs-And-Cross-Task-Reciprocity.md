# TASK-481-04-L02: Docs + TASK-479 Cross-Task Reciprocity

# FileName: TASK-481-04-L02-Docs-And-Cross-Task-Reciprocity.md

**Parent Subtask:** TASK-481-04
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Design Tokens / Docs
**Estimated Effort:** Small
**Dependencies:** TASK-481-04-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

**Goal:** Document the brand-WYSIWYG canvas model in `_docs/DESIGN_TOKENS.md` and add
the reciprocal coordination note that TASK-481 owns the canvas brand-emission change
and DID NOT edit the `globals.css @theme` block — keeping the boundary with
TASK-479-05-L03 (`@theme` / dark-mode owner) and TASK-479-08-L02 (canvas-frame
restyle owner) explicit, as the umbrella's "Cross-task coordination" section promised.

**Owning module(s) to create-or-extend:**
- `_docs/DESIGN_TOKENS.md` — extend the "Pages v2 color-token authoring" / canvas
  section with the brand-vs-neutral canvas split.
- The reciprocity note: record it in `_docs/DESIGN_TOKENS.md` (and reference the two
  TASK-479 leaf files). Do NOT edit the TASK-479 files (they are not TASK-481-owned;
  they already carry their own reciprocal note per the umbrella).

**Source-of-truth docs (the targets):**
- `_docs/DESIGN_TOKENS.md`, `_docs/THEMES_SPEC.md`, `_docs/PAGE_MODEL.md`.

**Out-of-scope:** Editing `globals.css`; editing any `TASK-479-*` file or any file
not prefixed `TASK-481`; changelog entries; `_docs/_TASKS/README.md` (orchestrator
syncs the board).

## Security Contract

Not a route/auth/data leaf — N/A (docs-only). No endpoint/auth/RBAC/CSRF/rate-limit
surface; no validation-owner change; no secrets/PII.

## Implementation Pseudocode

Add to `_docs/DESIGN_TOKENS.md` (under the Pages v2 color/canvas section) prose
capturing:

```
### Page editor canvas: brand vs neutral token resolution (TASK-481)

- The page editor canvas is split into a CHROME layer (selection outline/ring,
  badges, ghost insert tiles) and a CONTENT scope (`data-page-editor-content`)
  holding the rendered page content + its brand-consuming inline style.
- NEUTRAL site vars (`--color-bg/-surface/-text`) are emitted on the canvas FRAME
  (`toPageCanvasColorCssVariableMap`, TASK-477-02) — chrome does not consume them.
- BRAND site vars (`--color-primary/-secondary/-accent/-border`) are emitted ONLY on
  the content scope (`toPageCanvasBrandColorCssVariableMap`, TASK-481-02), so block/
  inline brand colors render the SAME value as the front (WYSIWYG).
- Chrome RE-ASSERTS the admin brand (`adminBrandColorCssVariableMap`:
  `--color-primary: var(--primary)`, …) on the section/block frame, so chrome — even
  nested inside an ancestor content scope — keeps the admin theme.
- Stored values are unchanged and still validated by the page-color sanitizer
  allowlist (`authoringColorTokenNames`); this is display-only token threading.

Cross-task boundary: TASK-481 did NOT edit `core/admin/styles/globals.css` `@theme {`.
The `@theme` brand `--color-*` mapping + dark layer remain owned by TASK-479-05-L03;
the `data-page-editor-canvas-frame` chrome restyle remains owned by TASK-479-08-L02.
TASK-481 only added the content-scope brand emission + admin re-assertion in
`core/ui/theme/tokenCss.ts` and `core/admin/ui/pages/**`.
```

Notes for the implementer:
- Verify, before writing the closure note, that no `globals.css` diff is attributable
  to TASK-481 (the boundary claim must be true): `git diff --name-only` for the task's
  branch must not list `core/admin/styles/globals.css`.
- Keep wording consistent with the existing `DESIGN_TOKENS.md` style (it mixes PL/EN;
  follow the surrounding section's tone).
- **Error handling:** none — docs only.

## Testing Requirements

- No automated test (docs-only). Verification = manual doc review + the
  `git diff` boundary check above (globals.css untouched by TASK-481).
- No Bun/Vitest lane; no DB migration artifacts.
