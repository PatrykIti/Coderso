# TASK-262: Content List Widget Playwright Product Followups

# FileName: TASK-262_Content_List_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Dynamic Content + Admin UI + Runtime Render + Listings + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-07-01, TASK-256-07
**Status:** To Do

---

## Overview

Create the Content List-only follow-up family for
`_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md`.

TASK-256 owns shared widget-contract repair from the Playwright report wave.
This family deliberately keeps only the Content List widget product, editor, and
runtime scope: `core/widgets/core/contentList.tsx`,
`core/admin/ui/widgets/editors/ContentListEditors.tsx`,
`core/services/content/contentListResolver.ts`, focused Content List tests, and
Content List source-of-truth docs.

The current widget already renders legacy content-type and Listings-query data,
but the report shows product gaps around source selection, static admin-canvas
feedback, section context, pagination/navigation, layout truthfulness, item
media, metadata display, and editor clarity.

## Scope Boundary Against TASK-256

In scope for TASK-262:

- Content List source picker usability, friendly labels, de-duplication,
  searchable/filtered content type selection, taxonomy suggestions, author
  selection, and listing-mode filter feedback.
- Content List section title/description, source-aware empty state text,
  missing-source instructions, and explicit saved-data canvas guidance.
- Content List page navigation, View all/Load more action model, and bounded
  runtime page metadata.
- Content List-only layout truthfulness for cards/list/compact variants, image
  ratio/height controls, tag badge display, card-style preview, variant preview,
  and CTA fallback feedback.
- Final Content List Playwright report/docs/changelog/board closure.

Out of scope for TASK-262:

- Shared editor atomic update helpers, owned by TASK-256-01.
- Generic `Clear`, `none`, token picker, CSS-variable preservation, and
  shared color-picker contracts, owned by TASK-256-02. The `textColor` clear
  row from `REPORT_CONTENT_LIST_WIDGET.md:81` is classified there unless the
  shared helper later requires a Content List-only hook.
- Generic slot placeholder gating, owned by TASK-256-03.
- Shared instance-safe runtime binding and unrelated ARIA helpers, owned by
  TASK-256-04.
- Broad content query/listing platform changes outside the Content List widget.

If a TASK-262 leaf discovers a missing shared helper, stop and route that helper
through TASK-256 or a new shared task before continuing with Content List-only
work.

## Source Report Coverage

| Report finding | Route |
|---|---|
| E-02, E-03, E-04, E-06, E-11, T-03, T-04, T-06 | TASK-262-01 |
| B-02, E-09, T-02 canvas/preview communication, T-05, static canvas discovery | TASK-262-02 |
| B-01, B-03, runtime `resolved.runtime.page` navigation behavior | TASK-262-03 |
| B-04, B-05, B-06, E-01, E-07, E-10, T-01 | TASK-262-04 |
| E-05 and generic color-token/picker rows | TASK-256-02, not TASK-262 |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-262-05 |

## Current Owner and Test Matrix

| Leaf | Current drift evidence | Owner files | Required test lanes |
|---|---|---|---|
| TASK-262-01 | Report lines 78-82, 87, 114-122, 134-137, 153-164, 274-280, 290, 297 | `ContentListEditors.tsx`, content type/listings clients only if existing response metadata supports safer labels, Content List docs | Vitest editor wave; Bun route/service tests only if admin source APIs change |
| TASK-262-02 | Report lines 67, 85, 94, 97, 173-181, 201-203, 221-252, 270-284, 300 | `contentList.tsx`, `ContentListEditors.tsx`, public renderer tests, Content List docs | Bun widget render tests; Vitest editor wave; public renderer smoke when runtime markers/copy change |
| TASK-262-03 | Report lines 66, 68, 76, 268-276 plus existing `resolved.runtime.page` schema at `contentList.tsx` | `contentList.tsx`, `contentListResolver.ts`, public page renderer/listing runtime resolver seams | Bun content-list resolver tests, widget tests, public renderer/listing runtime tests |
| TASK-262-04 | Report lines 69-71, 77, 83, 86, 93, 128-147, 157-160, 286-289, 298-299 | `contentList.tsx`, `ContentListEditors.tsx`, Content List widget tests | Bun widget tests, Vitest editor wave, validator tests when schema expands |
| TASK-262-05 | Report lines 264-306 and every fixed/deferred row | `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md`, `_docs/_WIDGETS/CONTENT_LIST.md`, `_docs/WIDGETS.md` if product surface changes, board/changelog/docs | `git diff --check`, targeted production lanes after implementation leaves |

## Sub-Tasks

- [ ] TASK-262-01: Content List Source Picker and Filter Editor IA
- [ ] TASK-262-02: Content List Section Empty State and Static Canvas Guidance
- [ ] TASK-262-03: Content List Pagination and View All Navigation
- [ ] TASK-262-04: Content List Layout Media Tags and Card Preview Controls
- [ ] TASK-262-05: Content List Report Docs and Closure

## Implementation Order

1. Complete TASK-262-01 first so source-mode copy, picker behavior, and filter
   ownership are stable before runtime navigation work adds more source-aware
   controls.
2. Complete TASK-262-02 next because section/empty/canvas copy gives editors
   truthful feedback while later leaves change runtime behavior.
3. Complete TASK-262-03 after source and empty-state semantics are stable so
   pagination and View all copy can reuse the final source labels.
4. Complete TASK-262-04 after pagination and section decisions settle, because
   layout/image/tag/card previews may require schema additions and renderer
   assertions.
5. Complete TASK-262-05 last after code, tests, Playwright report evidence,
   docs, changelog, and board rows are synchronized.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Prefer a dedicated worktree for implementation because this family touches
  shared board indexes and widget/runtime/editor owners that other agents may
  also inspect.
- Stage only `TASK-262*`, Content List owners, explicitly required tests,
  Content List docs/report files, changelog, and board files.
- Do not stage unrelated TASK-256, TASK-257, TASK-258, TASK-259, TASK-260,
  TASK-261, or other Playwright report changes.
- `_docs/_TASKS/README.md` is shared by many active agents. Keep edits
  row-scoped and count-scoped; before commit, rerun
  `git diff -- _docs/_TASKS/README.md` and reconcile only the visible
  TASK-262 rows/statistics.

## Security Contract

This umbrella does not add API routes.

- Endpoint visibility: public runtime rendering and internal admin editing stay
  on existing page/widget/listing routes.
- Auth/RBAC/CSRF: unchanged unless a leaf explicitly modifies an existing
  internal admin source endpoint; no public write routes are introduced.
- Rate-limit bucket: unchanged because runtime pagination/View all is public
  GET/read-only behavior.
- Reject-unknown validation: Content List schema must keep
  `additionalProperties: false`; new fields require schema, defaults,
  normalizer, renderer, editor, and validator coverage.
- Anti-abuse: pagination/search params must remain bounded and routed through
  existing listing/runtime parsers; no arbitrary endpoint URLs, scripts, or
  untrusted HTML in widget JSON.
- Secret handling: no raw private source payloads, query secrets, provider
  keys, nonce values, or privileged URLs in widget JSON, reports, docs, or
  changelog notes.

## Testing Requirements

- Docs-only task creation: `git diff --check`.
- Implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/widgets/contentList.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/site/publicRenderer.test.tsx` when
    public rendering, runtime markers, or output copy change.
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change.
  - `bun test tests/unit/content/listingRuntimeResolver.test.ts` and focused
    resolver tests when pagination/search/runtime query handling changes.
  - `bun run gates:coderso`, `bun run scan:security:strict`, and
    `bun run precommit` before final family closure.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md`
- `_docs/_WIDGETS/CONTENT_LIST.md`
- `_docs/WIDGETS.md` only if this family changes general widget wording.
- `_docs/WIDGET_PACK_MATRIX.md` only if Content List readiness/completeness
  changes.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when leaves or umbrella
  move to `Done`.

## Changelog Policy

- This task must not move to `Done` until a changelog entry lists TASK-262 and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-262 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md` is fixed,
  explicitly excluded as TASK-256 shared scope, or deferred to a named future
  task with a reason.
- Content List schema, defaults, normalizer, render, editor, tests, and docs
  move together for every new user-facing option.
- Admin canvas, preview dialog, and public frontend present truthful source,
  empty-state, pagination, CTA, and layout feedback.
- Runtime pagination and source navigation remain bounded public read behavior
  and do not introduce public write, arbitrary endpoint, or unsafe script scope.
- Widget docs, Playwright report evidence, task board, changelog, and targeted
  validation evidence are synchronized before closure.
