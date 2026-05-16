# TASK-267: Feature Grid Widget Playwright Product Followups

# FileName: TASK-267_Feature_Grid_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Feature Grid + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-01, TASK-256-06-02, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific Feature Grid follow-up family for
`_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`.

This family owns only product and UX improvements that are local to
`feature-grid`. Shared widget-contract repairs stay in TASK-256. Do not use
TASK-267 to duplicate the shared fixes for atomic editor updates, truthful
generic controls, clear semantics, safe href/media hardening, ARIA baseline, or
Advanced-mode duplication.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/featureGrid.tsx`
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx`
- `tests/vitest/widgets/featureGrid.test.tsx`
- `tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `_docs/_WIDGETS/FEATURE_GRID.md`
- `_docs/_WIDGETS/tmp/feature-grid/MATRIX.md`
- `_docs/WIDGETS.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-267 because
TASK-256 already owns them as shared widget-contract drift.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-01 / UX-01 / KOD-01 columns control has no effect | `REPORT_FEATURE_GRID_WIDGET.md:179-183,210-212,254-273` | TASK-256-06-01 | Shared truthful-control contract. |
| BUG-02 / UX-04 / KOD-02 variant and item-count desync | `REPORT_FEATURE_GRID_WIDGET.md:185-189,222-224,275-278` | TASK-256-01, TASK-256-06-01 | Shared atomic editor-mode update contract. |
| BUG-03 / BF-14 invalid image URL feedback | `REPORT_FEATURE_GRID_WIDGET.md:191-194,333-334` | TASK-256-06-01 | Shared safe media/input feedback contract. |
| BUG-04 missing `borderColor` clear | `REPORT_FEATURE_GRID_WIDGET.md:196-199` | TASK-256-02, TASK-256-06-01 | Shared Clear semantics. |
| UX-08 blocked CTA URL feedback | `REPORT_FEATURE_GRID_WIDGET.md:238-240` | TASK-256-06-01 | Shared safe href feedback. |
| UX-09 Advanced duplicates Visual tokens | `REPORT_FEATURE_GRID_WIDGET.md:242-244` | TASK-256-01 | Shared mode ownership and Advanced scope. |
| A1/A7 CTA external link rel/noopener safety | `REPORT_FEATURE_GRID_WIDGET.md:169,348,354` | TASK-256-06-02 | Shared safe link renderer behavior. |
| A2 image alt fallback, A3 emoji ARIA, A4/A5 heading hierarchy, A6 image lazy loading | `REPORT_FEATURE_GRID_WIDGET.md:348-354` | TASK-256-04, TASK-256-06-01 | Shared runtime accessibility and performance baseline. |

TASK-267 may depend on the TASK-256 result, but it must not restage those
repairs inside its own implementation leaves.

## TASK-267 Scope Matrix

| Report finding | TASK-267 owner | Notes |
|---|---|---|
| BUG-05 cards-4 uses two columns until `xl` | TASK-267-01 | Feature Grid variant product behavior, after TASK-256 truthful columns work. |
| UX-02 visual variant previews | TASK-267-01 | Feature Grid selector affordance. |
| KOD-03 / KOD-04 / KOD-05 resolver explicit default readability | TASK-267-01 | Local cleanup only when touching the renderer for layout. |
| UX-03 drag-and-drop card reorder | TASK-267-02 | Feature Grid repeated-card management. |
| UX-06 remove card without confirm/undo | TASK-267-02 | Feature Grid repeated-card destructive action. |
| UX-07 icon/image priority explanation | TASK-267-03 | Feature Grid item media semantics. |
| BF-15 emoji picker | TASK-267-03 | Feature Grid icon authoring. |
| BF-16 media library integration | TASK-267-03 | Feature Grid card image authoring through existing media picker. |
| BF-01 text alignment, BF-03 card padding, BF-04 icon/image size, BF-05 horizontal card layout, BF-02 hero-card-above-grid variant | TASK-267-04 | Feature Grid card layout expansion. |
| BF-06 header typography, BF-07 card title typography, BF-09 section background, BF-11 hover effects, BF-12 max-width | TASK-267-05 | Feature Grid section/card visual expansion. |
| BF-08 explicit CTA enable, BF-10 user-facing target option, BF-13 rich description authoring | TASK-267-06 | Feature Grid card content/action authoring; rel safety remains TASK-256. |
| UX-05 Wizard scope notice, UX-10 first editor mode decision | TASK-267-07 | Feature Grid onboarding and entry-flow UX. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-267-08 | Final documentation and evidence pass. |

## Sub-Tasks

- [ ] TASK-267-01: Feature Grid Variant Preview and Responsive Cards-4 Layout
- [ ] TASK-267-02: Feature Grid Card Reorder, Remove, and Item Management
- [ ] TASK-267-03: Feature Grid Media Picker, Emoji Picker, and Image Priority UX
- [ ] TASK-267-04: Feature Grid Card Layout, Density, and Alignment Controls
- [ ] TASK-267-05: Feature Grid Section Typography, Container, and Hover Controls
- [ ] TASK-267-06: Feature Grid CTA Enablement, Target, and Rich Description Authoring
- [ ] TASK-267-07: Feature Grid Wizard Guidance and Editor Entry Flow
- [ ] TASK-267-08: Feature Grid Report, Docs, Changelog, and Closure

## Implementation Order

1. Finish or rebase over the TASK-256 shared fixes first. TASK-267 leaves must
   build on those contracts instead of duplicating them.
2. Complete TASK-267-01 first because variant preview and responsive `cards-4`
   behavior define the visual baseline for later layout work.
3. Complete TASK-267-02 before adding richer card fields so reorder/remove tests
   cover the final repeated-card interaction shape.
4. Complete TASK-267-03 before card-layout and CTA leaves because media/icon
   ownership affects card previews and image-first layouts.
5. Complete TASK-267-04, TASK-267-05, and TASK-267-06 in sequence. They touch the
   same Feature Grid schema, renderer, and editor files; do not parallelize them
   in separate branches without an explicit merge owner.
6. Complete TASK-267-07 after the editor surface stabilizes.
7. Complete TASK-267-08 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-267*` files, Feature Grid owner files, Feature Grid tests,
  Feature Grid docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-267 rows/counts owned by the current commit.
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
- Reject-unknown validation: any new Feature Grid schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: CTA and media fields must keep TASK-256 safe-href and safe-media
  behavior. No raw HTML/script fields, unbounded class names, or browser-stored
  secrets may be introduced.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, variant rendering, or shared widget rendering changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing/radius/clear adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant registration or widget
  registry wiring changes.
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/FEATURE_GRID.md` when schema, editor modes, runtime
  variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Feature Grid pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Feature Grid report finding is either owned by TASK-256, covered by a
  TASK-267 physical leaf, or explicitly deferred by TASK-267-08 with a reason.
- TASK-267 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data-flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `feature-grid`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
