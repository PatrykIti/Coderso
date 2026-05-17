# TASK-293: Gallery Mosaic Shared Contract Residual Reopen

# FileName: TASK-293_Gallery_Mosaic_Shared_Contract_Residual_Reopen.md

**Priority:** High
**Category:** Widgets + Gallery Mosaic + Shared Contract + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-01, TASK-256-04, TASK-256-06-02, TASK-270
**Status:** In Progress (2026-05-17)

---

## Overview

Reopen the residual shared-contract rows that `TASK-270` assumes are already
landed, but that are still missing in the live Gallery Mosaic checkout.

This family exists to close the gap between the documented `TASK-256` closure
and the actual current code before `TASK-270` expands Gallery Mosaic with new
product features. It must stay strictly inside shared-contract scope: current
editor mode ownership, current media-type truthfulness, Wizard current-contract
video handling, current runtime accessibility/semantic behavior, and shared
resolver/runtime cleanup. It must not absorb Gallery-local product follow-ups
that already belong to `TASK-270`, such as per-item MediaPicker, drag-and-drop,
dedicated `alt` authoring, poster images, lightbox, motion presets, or
import/export.

## Why This Exists

Live task/docs status says the following owners are `Done`:

- `TASK-256-01`
- `TASK-256-04`
- `TASK-256-06-02`

But the current checkout still shows residual shared drift in Gallery Mosaic:

- duplicated Advanced controls still mirror Visual instead of exposing a clear
  shared owner decision;
- Wizard media picker remains image-only for the current contract;
- Visual still exposes ambiguous image/video truthfulness for current fields;
- runtime media semantics still miss the shared figure/video-control cleanup.

`TASK-270` therefore cannot honestly proceed as if those prerequisites were
fully landed.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`

Live owners inspected while reopening:

- `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx`
- `core/widgets/core/galleryMosaic.tsx`
- `tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `tests/vitest/widgets/galleryMosaic.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_TASKS/TASK-256-01_Shared_Editor_Mode_and_Atomic_Update_Contract.md`
- `_docs/_TASKS/TASK-256-04_Interactive_Runtime_Instance_and_Accessibility_Contract.md`
- `_docs/_TASKS/TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md`

## Scope Decision Matrix

| Finding or residual drift | TASK-293 owner | Notes |
|---|---|---|
| UX-01 duplicated Advanced controls for current shared fields | TASK-293-01 | Shared editor-mode ownership residual from TASK-256-01. |
| UX-06 current media-type ambiguity for existing image/video fields | TASK-293-01 | Shared truthful-current-controls residual from TASK-256-06-02. |
| UX-07 Wizard current-contract video handling | TASK-293-01 | Shared Wizard current-contract fix from TASK-256-06-02. |
| CODE-01, CODE-02, CODE-03 current resolver/runtime cleanup | TASK-293-02 | Shared runtime cleanup still missing in the live owner. |
| A3, A4, A5, A6 current runtime accessibility and semantic cleanup using existing fields | TASK-293-02 | Shared runtime semantics residual from TASK-256-04/TASK-256-06-02. |
| Report/docs/changelog/board refresh for the reopened shared residuals | TASK-293-03 | Closure evidence must state that these are residual shared-contract repairs, not new TASK-270 product work. |

Out of scope:

- `TASK-270-01`: per-item preview and Visual per-item MediaPicker.
- `TASK-270-02`: drag-and-drop reorder, item-count/remove UX, `feature-left`
  one-item author warning.
- `TASK-270-03`: dedicated per-item `alt` authoring, poster image, per-item
  ratio, object position.
- `TASK-270-04` to `TASK-270-06`: lightbox, motion/density presets, and
  import/export.

## Sub-Tasks

- [x] TASK-293-01: Gallery Mosaic Shared Editor Truthfulness Residuals
- [ ] TASK-293-02: Gallery Mosaic Shared Runtime Semantics Residuals
- [ ] TASK-293-03: Gallery Mosaic Shared Residual Closure

## Implementation Order

1. Finish `TASK-293-01` first so current editor-mode ownership and current
   media truthfulness are stable before runtime/product follow-ups touch the
   widget again.
2. Finish `TASK-293-02` next so current runtime semantics match the settled
   shared contract before `TASK-270-03` adds new media fields.
3. Finish `TASK-293-03` before reopening `TASK-270` implementation work so the
   report, widget docs, board, and changelog reflect the real shared baseline.

## Git Scope Safeguards

- Work in this dedicated branch/worktree only.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-293*` files, Gallery Mosaic shared owner files/tests/docs,
  and required board/changelog files.
- Re-read `_docs/_TASKS/README.md` immediately before staging because shared
  board rows can drift under parallel work.

## Security Contract

This reopening family does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged authenticated admin editing plus unchanged public
  runtime read-only rendering.
- RBAC: unchanged page/template/widget write permission.
- CSRF: unchanged admin write route protection.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: only current shared-contract schema/runtime
  semantics may change here; new product fields remain in `TASK-270`.
- Anti-abuse: preserve shared safe-media and safe-link behavior already landed;
  do not introduce raw HTML, arbitrary class names, or secret-bearing media
  payloads.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/galleryMosaic.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if any
  shared href helper behavior changes
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md`
- `_docs/_WIDGETS/GALLERY_MOSAIC.md`
- `_docs/_TASKS/TASK-293*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-05-17-task-293-gallery-mosaic-shared-residuals.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- `TASK-270` no longer depends on missing Gallery Mosaic shared prerequisites in
  the live checkout.
- Shared current-contract editor/runtime rows are fixed under `TASK-293`
  without widening into `TASK-270` product scope.
- Closure evidence clearly distinguishes reopened shared repairs from new
  Gallery Mosaic product work.
