# TASK-287: Stats KPI Widget Playwright Product Followups

# FileName: TASK-287_Stats_KPI_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Stats KPI + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-06-08, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-01, TASK-256-06-02, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright report. This
family owns only Stats KPI product and editor improvements that remain after the
shared divider/grid/ARIA/color-control baseline is fixed. Do not use TASK-287 to
duplicate shared fixes for truthful controls, generic color-picker behavior,
interactive/accessibility baseline, or Advanced-mode ownership.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/statsKpi.tsx`
- `core/admin/ui/widgets/editors/StatsKpiEditors.tsx`
- `tests/vitest/widgets/statsKpi.test.tsx`
- `tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `tests/unit/widgets/validator.test.ts`
- `tests/unit/widgets/registry.test.ts`
- `_docs/_WIDGETS/STATS_KPI.md`
- `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md`
- `_docs/_WIDGETS/tmp/stats-kpi/README.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-287 because
TASK-256 already owns them as shared widget-contract drift.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| C1 divider toggle persists without effect outside `inline` | `REPORT_STATS_KPI_WIDGET.md:53-56,126-141,269-282` | TASK-256-06-01 | Shared truthful-control repair for visible controls that do not affect runtime. |
| C2/R5 cards grid holes from fixed `lg:grid-cols-4` | `REPORT_STATS_KPI_WIDGET.md:56,143-152,252-253,284-298` | TASK-256-06-01 | Shared truthful renderer/control baseline already routes Stats KPI grid behavior. |
| W11/R6 split-highlight secondary grid imbalance | `REPORT_STATS_KPI_WIDGET.md:73,154-163,242,284-298` | TASK-256-06-01 | Shared renderer truthfulness for existing split-highlight layout. |
| R1/R2/R3/R4 section, article, icon, and heading semantics | `REPORT_STATS_KPI_WIDGET.md:94-99,165-175,200-226,300-315` | TASK-256-04, TASK-256-06-01 | Baseline runtime accessibility belongs to the shared widget contract. |
| U2 CSS-variable color picker fallback | `REPORT_STATS_KPI_WIDGET.md:81,177-183,258` | TASK-256-02 | Generic color/token editor semantics must be fixed once for all widgets. |
| U3 divider switch context | `REPORT_STATS_KPI_WIDGET.md:82,137-139,259` | TASK-256-06-01 | Divider visibility/disablement is the same truthful-control bug as C1. |
| C3 baseline Wizard content fields | `REPORT_STATS_KPI_WIDGET.md:57,115-124,254,317-321`; `TASK-256-06-01_Feature_Grid_and_Stats_KPI_Truthful_Controls.md:25-29,68,72` | TASK-256-06-01 | The shared truthful setup leaf owns adding the missing Wizard header/metric content fields. |
| U6 Advanced duplicate-control policy | `REPORT_STATS_KPI_WIDGET.md:43-45,85,185-188`; `TASK-256-01_Shared_Editor_Mode_and_Atomic_Update_Contract.md:41-44,61-64,88` | TASK-256-01 | Shared editor-mode ownership decides whether Stats KPI Advanced controls become raw-token controls, read-only diagnostics, or are removed. |

TASK-287 implementation may touch the same Stats KPI files after TASK-256 lands,
but only for product fields and local editor UX. If a TASK-287 leaf needs a
shared helper, generic editor control, or cross-widget renderer contract, split
that part back to TASK-256 instead of hiding it in this family.

## TASK-287 Scope Matrix

| Report finding | TASK-287 owner | Notes |
|---|---|---|
| W1 value size control | TASK-287-01 | Stats KPI-local value typography presets. |
| W2 description color | TASK-287-01 | Add description color as a schema-owned KPI text style. |
| W3 prefix/suffix per metric | TASK-287-01 | Matches `_docs/_WIDGETS/tmp/stats-kpi/MATRIX.md:6`. |
| W8 per-metric accent color | TASK-287-01 | Add bounded metric accent overrides without raw class names. |
| W10 trend indicator | TASK-287-01 | Add static trend text/direction only, no live analytics semantics. |
| W4/W5/W6 section background, max-width, and padding | TASK-287-02 | Stats KPI-local inner section layout controls; do not duplicate page-shell controls. |
| W7 icon surface/border/size | TASK-287-02 | Add bounded icon presentation fields. |
| R7 min-height for sparse KPI sections | TASK-287-02 | Add bounded min-height or density behavior with mobile-safe defaults. |
| R8 divider intensity | TASK-287-02 | Optional Stats KPI-local divider intensity only after TASK-256 divider semantics are truthful. |
| U1 Wizard variant cards | TASK-287-03 | Stats KPI-local onboarding polish after TASK-256 adds the missing Wizard content fields. |
| U4/U5/U9 header clear, icon guidance, spacing help | TASK-287-03 | Stats KPI-local guidance and affordances for fields owned by TASK-256/TASK-287-01. |
| W9 per-metric CTA/link | TASK-287-04 | Add safe per-metric link semantics using existing safe-href ownership. |
| U7 drag/drop reorder | TASK-287-05 | Improve repeated metric management while preserving keyboard move controls. |
| U8 mixed color/surface editor grouping | TASK-287-05 | Split Stats KPI Visual IA into text, card surface, and layout groups. |
| W12 count-up animation | TASK-287-06 | No implementation by default; closure must record reject/defer unless a later perf/accessibility task approves it. |
| Report fixed/deferred evidence, widget docs, changelog, board closure | TASK-287-06 | Final documentation and validation pass. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Stats KPI schema/defaults/normalizer/runtime | `core/widgets/core/statsKpi.tsx:6-502` | `tests/vitest/widgets/statsKpi.test.tsx`, `tests/vitest/widgets/renderer.test.tsx`, `tests/vitest/widgets/styleNoneTokens.test.tsx` | Add schema, normalization, SSR, data-marker, safe-link, layout, typography, trend, and icon presentation assertions. |
| Stats KPI editors | `core/admin/ui/widgets/editors/StatsKpiEditors.tsx:33-724` | `tests/vitest/ui/stats-kpi-editor-wave.test.tsx` | Add Wizard variant-card/guidance, header clear, repeated-item management, and Visual IA grouping assertions. C3 baseline Wizard content and Advanced cleanup remain TASK-256-owned. |
| Widget validator/registry | `core/widgets/validator.ts`, registry via `createStatsKpiWidget()` | `tests/unit/widgets/validator.test.ts`, `tests/unit/widgets/registry.test.ts` | Run validator tests whenever persisted fields are added; registry only if definition metadata or variants change. |
| Widget docs/report | `_docs/_WIDGETS/STATS_KPI.md`, `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` | docs diff checks | Update fixed/deferred evidence after implementation leaves land. |

## Sub-Tasks

- [ ] TASK-287-01: Stats KPI Value Typography and Metric Semantics
- [ ] TASK-287-02: Stats KPI Section Surface Layout and Icon Styling
- [ ] TASK-287-03: Stats KPI Wizard Variant Cards and Guidance
- [ ] TASK-287-04: Stats KPI Metric Links and Safe Click Semantics
- [ ] TASK-287-05: Stats KPI Metric Management and Editor IA Polish
- [ ] TASK-287-06: Stats KPI Report Docs Changelog and Closure

## Implementation Order

1. Rebase over TASK-256 shared fixes first. TASK-287 leaves must build on the
   final divider/grid/ARIA/color/editor-mode baseline instead of duplicating it.
2. Complete TASK-287-01 first because value semantics, trend data, and metric
   accent fields define the item model used by editor and link work.
3. Complete TASK-287-02 after the core item model is stable so section and icon
   presentation fields can reuse the same bounded token maps.
4. Complete TASK-287-03 after TASK-256-06-01 lands the baseline Wizard content
   fields, then add only Stats KPI-local variant cards and guidance affordances.
5. Complete TASK-287-04 after TASK-256-06-02 exposes the final safe-link helper
   shape and after item semantics from TASK-287-01 are stable.
6. Complete TASK-287-05 after content/style/link fields settle so repeated-item
   management and Visual IA do not churn.
7. Complete TASK-287-06 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree because several active agents touch
  `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-287*` files, Stats KPI owner files, focused Stats KPI tests,
  Stats KPI docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-287 rows/counts owned by the current commit.
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
- Reject-unknown validation: every new Stats KPI field must be added to
  `statsKpiSchema` with `additionalProperties: false` preserved and validator
  tests updated.
- Anti-abuse: metric links must use the existing safe-href helper contract.
  Icons, colors, trends, typography, surfaces, and layout fields must be
  schema-bound and must not accept raw HTML, script, unbounded class names,
  inline handlers, or browser-stored secrets.
- Secret handling: no secrets, private URLs, tokens, provider keys, or
  privileged settings in widget JSON, browser cache, diagnostics, Playwright
  evidence, or changelog notes.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/statsKpi.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when renderer
  output markers, variant rendering, or shared widget rendering changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  spacing, clearable surface, or token adjacency changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults/normalizer
  fields change.
- `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata or
  variants change.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/STATS_KPI.md` when schema, editor modes, runtime
  variants, safe links, typography, surfaces, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Stats KPI pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md` is either owned
  by TASK-256, covered by a TASK-287 physical leaf, or explicitly deferred by
  TASK-287-06 with a reason.
- TASK-287 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `stats-kpi`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
