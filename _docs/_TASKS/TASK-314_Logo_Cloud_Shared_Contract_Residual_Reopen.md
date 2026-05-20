# TASK-314: Logo Cloud Shared Contract Residual Reopen

# FileName: TASK-314_Logo_Cloud_Shared_Contract_Residual_Reopen.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Shared Contract + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256, TASK-256-01, TASK-256-06-02
**Status:** Done (2026-05-19)

---

## Overview

Reopen the residual shared-contract rows that `TASK-274` assumes are already
landed, but that are still missing in the live Logo Cloud checkout.

This family exists to close the gap between the documented `TASK-256` closure
and the actual current code before `TASK-274` expands Logo Cloud with new
product features. It must stay strictly inside shared-contract scope:

- current editor-mode ownership for shared controls,
- current shared link-feedback truthfulness for existing link inputs,
- current runtime heading/landmark baseline for the existing section shell,
- current safe handling for `logoHeight: "none"`.

It must not absorb Logo Cloud product follow-ups that already belong to
`TASK-274`, such as eyebrow/background/header-size controls, MediaPicker and
thumbnail UX, per-logo `alt` authoring, drag-and-drop reorder, marquee/strip
product modes, tile radius/border-width, or CTA composition.

## Why This Exists

Live task/docs status says the following owners are `Done`:

- `TASK-256-01`
- `TASK-256-06-02`

But the current checkout still shows residual shared drift in Logo Cloud:

- Advanced still duplicates `logoHeight`, `gap`, and `alignment` controls that
  Visual already owns;
- Visual still lacks the shared safe-link feedback that `TASK-274-02` excludes
  from widget-local scope;
- runtime still hardcodes the section title as `<h3>` instead of using the
  shared section-heading baseline;
- `logoHeight: "none"` still leaves image height effectively unbounded.

`TASK-274` therefore cannot honestly proceed as if those prerequisites were
fully landed.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`

Live owners inspected while reopening:

- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `core/widgets/core/logoCloud.tsx`
- `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `tests/vitest/widgets/logoCloud.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_TASKS/TASK-256-01_Shared_Editor_Mode_and_Atomic_Update_Contract.md`
- `_docs/_TASKS/TASK-256-06-02_CTA_Banner_Logo_Cloud_and_Gallery_Media_Links.md`

## Scope Decision Matrix

| Finding or residual drift | TASK-314 owner | Notes |
|---|---|---|
| UX-07 duplicated Advanced controls for current shared fields | TASK-314-01 | Shared editor-mode ownership residual from `TASK-256-01`. |
| BF-10 shared link URL validation / safe feedback for existing Logo Cloud link inputs | TASK-314-01 | Shared editor truthfulness residual from `TASK-256-06-02`. Image preview/unavailable feedback remains `TASK-274-02`. |
| BUG-02 / BF-09 shared section heading semantics | TASK-314-02 | Shared runtime heading baseline residual from `TASK-256-06-02`. |
| BUG-05 `logoHeight: "none"` shared safety | TASK-314-02 | Shared current-style safety residual from `TASK-256-06-02`. |
| BUG-01 base safe href / `rel` behavior | Current-state fixed by `TASK-256-06-02` | Do not reopen. `TASK-274-05` only adds product-owned target/CTA controls through the shared helper. |
| BUG-03 fallback section naming and BUG-04 / UX-01 hoverColor truthfulness | Current-state fixed by `TASK-256-06-02` | Do not reopen unless closure evidence later proves regression. |
| Report/docs/changelog/board refresh for the reopened shared residuals | TASK-314-03 | Closure evidence must state that these are residual shared-contract repairs, not `TASK-274` product work. |

## Sub-Tasks

- [x] TASK-314-01: Logo Cloud Shared Editor Truthfulness Residuals
- [x] TASK-314-02: Logo Cloud Shared Runtime Semantics Residuals
- [x] TASK-314-03: Logo Cloud Shared Residual Closure

## Implementation Order

1. Finish `TASK-314-01` first so Logo Cloud editor mode ownership and shared
   link-input truthfulness are stable before `TASK-274-02` and `TASK-274-05`
   add product-owned authoring.
2. Finish `TASK-314-02` next so the shared section shell is honest before
   `TASK-274-01` and `TASK-274-04` expand header and layout behavior.
3. Finish `TASK-314-03` before moving `TASK-274` to implementation closure so
   the report, widget docs, board, and changelog reflect the real shared
   baseline.

## Git Scope Safeguards

- Work in this dedicated branch/worktree only.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-314*` files, Logo Cloud shared owner files/tests/docs, and
  required board/changelog files.
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
- Reject-unknown validation: only current shared-contract schema/editor/runtime
  semantics may change here; new Logo Cloud product fields remain in `TASK-274`.
- Anti-abuse: preserve shared safe-href behavior already landed; do not
  introduce raw HTML, arbitrary class names, or secret-bearing media payloads.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  `logoHeight: "none"` behavior changes
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` if any
  shared helper behavior changes
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_TASKS/TASK-314*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-2026-05-19-task-313-logo-cloud-shared-residuals.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- `TASK-274` no longer depends on missing Logo Cloud shared prerequisites in
  the live checkout.
- Shared editor/runtime rows are fixed under `TASK-314` without widening into
  `TASK-274` product scope.
- Closure evidence clearly distinguishes reopened shared repairs from new Logo
  Cloud product work.

## Completion Notes

- 2026-05-19: `TASK-314` is fully closed. The reopened Logo Cloud shared
  baseline now has:
  - `TASK-314-01` for shared editor truthfulness and Link URL feedback,
  - `TASK-314-02` for shared section-heading and `logoHeight: "none"` runtime
    semantics,
  - `TASK-314-03` for report/docs/changelog/board closure.
- Final validation:
  - `bun run lint`
  - `bun run test:bun`
  - `bun run test:vitest`
  - `bun run scan:security:strict`
  - `bun run precommit`
