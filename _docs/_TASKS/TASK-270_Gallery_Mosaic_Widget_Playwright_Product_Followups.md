# TASK-270: Gallery Mosaic Widget Playwright Product Followups

# FileName: TASK-270_Gallery_Mosaic_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-02, TASK-256-08
**Status:** In Progress (2026-05-18)

---

## Overview

Create the Gallery Mosaic-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`.

This family owns only product and UX expansion that is local to
`gallery-mosaic`. Shared widget-contract repairs stay in TASK-256. Do not use
TASK-270 to duplicate the shared fixes for editor mode ownership, clear/token
semantics, safe href/media output, generic accessibility hardening, or the
existing TASK-256 Gallery Mosaic bug rows.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/galleryMosaic.tsx`
- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `tests/vitest/widgets/galleryMosaic.test.tsx`
- `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_WIDGETS/tmp/gallery-mosaic/MATRIX.md`
- `_docs/_WIDGETS/tmp/gallery-mosaic/README.md`
- `_docs/WIDGETS.md`
- `_docs/TESTING_STRATEGY.md`
- `tests/README.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-270 because
TASK-256 already owns them as shared widget-contract drift or as the existing
cross-widget media/link repair leaf.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| CODE-01, CODE-02, CODE-03, CODE-04, BUG-04 renderer/layout cleanup and feature-left one-item empty-column handling | `REPORT_GALLERY_MOSAIC_WIDGET.md:56-73,232,277-281,379` | TASK-256-06-02 | Existing shared media/link leaf already names `galleryMosaic.tsx` and this renderer cleanup. |
| CODE-05, BUG-03, BF-04 overlay alpha loss | `REPORT_GALLERY_MOSAIC_WIDGET.md:76-79,272-275,322,359,378` | TASK-256-02, TASK-256-06-02 | Shared clear/token and alpha-safe editor behavior. |
| CODE-06, UX-06, BF-08 image/video ambiguity | `REPORT_GALLERY_MOSAIC_WIDGET.md:81-84,130,307-308,326,368` | TASK-256-06-02 | Shared truthful media-control contract for current fields. |
| CODE-07, A1, A5, A6 current alt/figure/video title semantics | `REPORT_GALLERY_MOSAIC_WIDGET.md:86-89,233,239,342,346-347` | TASK-256-04, TASK-256-06-02 | Shared runtime accessibility and backward-compatible renderer semantics using current fields only. New per-item alt authoring remains TASK-270-03. |
| CODE-08, UX-07, BF-03 Wizard video media picker scope | `REPORT_GALLERY_MOSAIC_WIDGET.md:91-94,310-312,321,370` | TASK-256-06-02 | Existing TASK-256 leaf already names Wizard video picker scope. |
| BUG-05, BF-05, A2 safe external link output | `REPORT_GALLERY_MOSAIC_WIDGET.md:147,212,240,282-286,323,343,361` | TASK-256-06-02 | Shared safe href/noopener output. |
| UX-01 Advanced duplicates Visual controls | `REPORT_GALLERY_MOSAIC_WIDGET.md:153,292-293` | TASK-256-01 | Shared editor-mode ownership and Advanced scope. |
| A3 hover caption keyboard/touch access, A4 autoplay controls | `REPORT_GALLERY_MOSAIC_WIDGET.md:205,225,241-242,344-345` | TASK-256-04, TASK-256-06-02 | Shared accessibility baseline for current runtime semantics. TASK-270 may add product presentation fields only after TASK-256 lands. |
| BUG-01 and BUG-02 401 Not authenticated | `REPORT_GALLERY_MOSAIC_WIDGET.md:261-270,357-358` | Out of widget scope | Resolved system/session-limit issue, not a Gallery Mosaic implementation task. |

TASK-270 may depend on the TASK-256 result, but it must not restage those
repairs inside its own implementation leaves.

## TASK-270 Scope Matrix

| Report finding | TASK-270 owner | Notes |
|---|---|---|
| UX-02 and BF-07 thumbnail preview while editing items | TASK-270-01 | Gallery Mosaic repeated-media editor usability. |
| UX-05 and BF-02 per-item media-library picker in Visual | TASK-270-01 | Product authoring expansion after TASK-256 media safety and video scope land. |
| UX-03 and BF-06 drag-and-drop reorder | TASK-270-02 | Gallery item management with accessible button fallback. |
| UX-04 count select vs add/remove semantics | TASK-270-02 | Preserve data intentionally and make destructive behavior clear. |
| BF-09 feature-left one-item warning/guidance | TASK-270-02 | Author-facing copy/validation when `feature-left` would otherwise render only a lead tile after count/remove changes. |
| BF-01 alt text authoring, BF-11 object-position, BF-12 per-item ratio, BF-13 video poster image | TASK-270-03 | Gallery-specific persisted media authoring and presentation fields that build on TASK-256 runtime accessibility fixes. |
| BF-10 lightbox/zoom on click | TASK-270-04 | Gallery runtime presentation mode using existing safe modal/runtime patterns. |
| BF-14 entrance animation and BF-15 responsive column configuration | TASK-270-05 | Bounded presentation presets, reduced-motion safe. This leaf resolves BF-15 through approved density presets rather than arbitrary raw breakpoint maps. |
| BF-16 export/import configuration and post-TASK-256 Wizard guidance | TASK-270-06 | Low-risk authoring workflow expansion and import validation. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-270-07 | Final documentation and evidence pass. |

## Sub-Tasks

- [x] TASK-270-01: Gallery Mosaic Item Previews and Media Picker
- [x] TASK-270-02: Gallery Mosaic Reorder, Count, and Removal UX
- [x] TASK-270-03: Gallery Mosaic Per-Item Media Presentation Fields
- [x] TASK-270-04: Gallery Mosaic Lightbox and Zoom Mode
- [ ] TASK-270-05: Gallery Mosaic Responsive Columns and Motion Presets
- [ ] TASK-270-06: Gallery Mosaic Config Import Export and Wizard Guidance
- [ ] TASK-270-07: Gallery Mosaic Report, Docs, Changelog, and Closure

## Implementation Order

1. Finish or rebase over TASK-256 shared fixes first, especially TASK-256-01,
   TASK-256-02, TASK-256-04, and TASK-256-06-02. TASK-270 leaves must build on
   those contracts instead of duplicating them.
2. Complete TASK-270-01 first because item preview and picker state are the
   editor baseline for richer per-item fields.
3. Complete TASK-270-02 before later field expansion so reorder/remove tests
   exercise the final repeated-item surface.
4. Complete TASK-270-03 before lightbox or motion leaves because object
   position, per-item ratio, and video posters affect runtime media output.
5. Complete TASK-270-04 after media presentation fields are stable.
6. Complete TASK-270-05 after layout and lightbox decisions are settled.
7. Complete TASK-270-06 after editor controls are stable.
8. Complete TASK-270-07 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-270*` files, Gallery Mosaic owner files, Gallery Mosaic
  tests, Gallery Mosaic docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-270 rows/counts owned by the current commit.
- Use `git diff --cached --name-only` and `git diff --cached --check` before
  every commit.

## Security Contract

This planning family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin page/template editing and public
  runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged existing admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: any new Gallery Mosaic schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: media, link, import/export, and lightbox behavior must reuse the
  safe output contracts from TASK-256. No raw HTML/script fields, unbounded
  class names, private media tokens, or browser-stored secrets may be added.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, lightbox attributes, or shared widget rendering changes.
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts`
  when TASK-270-04 lands.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing/radius/clear adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or
  widget registry wiring changes.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/GALLERY_MOSAIC.md` when schema, editor modes, runtime
  variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Gallery Mosaic pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Gallery Mosaic report finding is either owned by TASK-256, covered by a
  TASK-270 physical leaf, resolved as out-of-widget session/runtime setup, or
  explicitly deferred by TASK-270-07 with a reason.
- TASK-270 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `gallery-mosaic`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
