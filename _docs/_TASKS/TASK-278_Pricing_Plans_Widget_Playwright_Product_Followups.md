# TASK-278: Pricing Plans Widget Playwright Product Followups

# FileName: TASK-278_Pricing_Plans_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Pricing Plans + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06-03, TASK-256-08
**Status:** To Do

---

## Overview

Create the widget-specific Pricing Plans follow-up family for
`_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`.

This family owns only product and UX improvements that are local to
`pricing-plans`. Shared widget-contract repairs stay in TASK-256. Do not use
TASK-278 to duplicate the shared fixes for atomic editor updates, clear/none
semantics, static-vs-interactive runtime contracts, baseline accessibility, or
Advanced-mode ownership.

## Source Report Boundary

Source report:

- `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md`

Live owners inspected while drafting:

- `core/widgets/core/pricingPlans.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `tests/vitest/widgets/pricingPlans.test.tsx`
- `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx`
- `tests/unit/widgets/validator.test.ts`
- `_docs/_WIDGETS/PRICING_PLANS.md`
- `_docs/_WIDGETS/tmp/pricing-plans/MATRIX.md`
- `_docs/_WIDGETS/tmp/pricing-plans/README.md`
- `_docs/WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md`

## TASK-256 Exclusion Matrix

The following report findings are intentionally excluded from TASK-278 because
TASK-256 already owns them as shared widget-contract drift.

| Report finding | Evidence | Owner task | Reason |
|---|---|---|---|
| BUG-01 billing default resolver clarity | `REPORT_PRICING_PLANS_WIDGET.md:141-152` | TASK-256-06-03 | Shared normalizer/default guard cleanup. |
| BUG-02 explicit spacing/radius resolver values | `REPORT_PRICING_PLANS_WIDGET.md:154-165` | TASK-256-06-03 | Shared token resolver truthfulness. |
| BUG-03 variant changes truncate hidden plans without warning | `REPORT_PRICING_PLANS_WIDGET.md:167-171,331-339` | TASK-256-01, TASK-256-06-03 | Shared atomic variant/update and hidden-data preservation contract. |
| BUG-04 / UX-02 plan count selector desync | `REPORT_PRICING_PLANS_WIDGET.md:173-177,210-212,319-327` | TASK-256-01, TASK-256-06-03 | Shared truthful editor control contract. |
| BUG-05 missing `highlightRing` clear | `REPORT_PRICING_PLANS_WIDGET.md:179-183,349-351` | TASK-256-02, TASK-256-06-03 | Shared clear-control semantics. |
| BUG-08 / BF-01 static billing toggle click behavior | `REPORT_PRICING_PLANS_WIDGET.md:196-200,242-243,304-315,408-419` | TASK-256-04, TASK-256-06-03 | Shared interactive runtime instance contract. |
| UX-01 Advanced duplicates Visual token controls | `REPORT_PRICING_PLANS_WIDGET.md:206-208,372-374` | TASK-256-01 | Shared editor-mode ownership and Advanced scope. |
| A3/A5/A6/A7/A8/A9 baseline pricing ARIA/table semantics | `REPORT_PRICING_PLANS_WIDGET.md:292-298,425-433` | TASK-256-04, TASK-256-06-03 | Shared runtime accessibility baseline. |

TASK-278 may depend on the TASK-256 result, but it must not restage these
repairs inside its own implementation leaves. If an implementation leaf touches
the same file, it must build on the TASK-256 contract and keep the diff limited
to Pricing Plans product fields, copy, and layout behavior.

## TASK-278 Scope Matrix

| Report finding | TASK-278 owner | Notes |
|---|---|---|
| BUG-06 all badges use `highlightRing` | TASK-278-01 | Pricing Plans card hierarchy and badge tone. |
| BF-02 per-plan background color | TASK-278-01 | Plan-level card style, normalized as product fields. |
| BF-03 per-plan CTA button style | TASK-278-01 | Plan-level CTA hierarchy; safe href remains TASK-256. |
| BF-07 "Most popular" top banner | TASK-278-01 | Highlighted-card product treatment. |
| UX-04 Wizard lacks badge, CTA, features, period | TASK-278-02 | Pricing Plans onboarding/editor flow. |
| UX-06 remove plan without confirmation or undo | TASK-278-02 | Pricing Plans repeated-plan destructive edit UX. |
| UX-07 missing highlighted indicator in plan list | TASK-278-02 | Editor list affordance. |
| UX-08 billing labels visible while toggle disabled | TASK-278-02 | Local billing editor copy/visibility only; toggle runtime is TASK-256. |
| Observation: added feature does not focus new field | TASK-278-02 | Pricing Plans editor efficiency. |
| BF-04 annual savings badge | TASK-278-03 | Billing value copy after TASK-256 runtime toggle works. |
| BF-13 currency and price format support | TASK-278-03 | Schema-first price semantics with legacy string compatibility. |
| BF-14 Free plan / `$0` graceful handling | TASK-278-03 | Price display policy. |
| UX-03 icon marker renders a hardcoded diamond placeholder | TASK-278-04 | Pricing Plans feature-marker contract. |
| BF-06 custom feature icons and per-feature status | TASK-278-04 | Feature metadata expansion without raw icon HTML. |
| BUG-07 comparison header lacks badge/CTA hierarchy | TASK-278-05 | Pricing comparison product table. |
| BF-11 sticky header in comparison rows | TASK-278-05 | Product behavior after TASK-256 table ARIA baseline. |
| BF-08 typography controls | TASK-278-06 | Pricing section/card typography presets. |
| BF-09 footer notes / FAQ notes below table | TASK-278-06 | Pricing-specific footer copy, not a generic slot system. |
| BF-12 configurable max-width | TASK-278-06 | Pricing section layout width. |
| BF-10 two-plans variant | TASK-278-07 | New Pricing Plans product variant and pack docs. |
| Report fixed/deferred notes, widget docs, changelog, board closure | TASK-278-08 | Final documentation and evidence pass. |

## Sub-Tasks

- [ ] TASK-278-01: Pricing Plans Card Visual Hierarchy and CTA Styles
- [ ] TASK-278-02: Pricing Plans Content Wizard and Destructive Edit UX
- [ ] TASK-278-03: Pricing Plans Billing Value Copy and Price Semantics
- [ ] TASK-278-04: Pricing Plans Feature Marker and Feature Metadata
- [ ] TASK-278-05: Pricing Plans Comparison Rows Product Table
- [ ] TASK-278-06: Pricing Plans Section Layout Typography and Notes
- [ ] TASK-278-07: Pricing Plans Two-Plan Variant and Pack Docs
- [ ] TASK-278-08: Pricing Plans Report, Docs, Changelog, and Closure

## Implementation Order

1. Rebase over TASK-256 shared fixes first. TASK-278 leaves must build on the
   shared variant, clear, runtime-interactivity, and ARIA baselines instead of
   duplicating them.
2. Complete TASK-278-01 before broad card style work. It defines plan-level
   visual hierarchy and CTA schema fields used by later leaves.
3. Complete TASK-278-02 before adding more plan fields so destructive-edit and
   Wizard coverage protect the expanded repeated item model.
4. Complete TASK-278-03 after TASK-256 billing toggle interactivity lands. This
   leaf only adds value copy and price semantics around the working toggle.
5. Complete TASK-278-04 independently from price semantics, but do not add raw
   icon payloads or unbounded class names.
6. Complete TASK-278-05 after TASK-256 table ARIA work, then add comparison
   product hierarchy and sticky behavior.
7. Complete TASK-278-06 after the card and comparison surfaces stabilize.
8. Complete TASK-278-07 after the plan-preservation and count contracts from
   TASK-256 are in place.
9. Complete TASK-278-08 last after code, tests, report evidence, widget docs,
   changelog, and board state are synchronized.

## Git Scope Safeguards

- Work in a dedicated branch/worktree for implementation.
- Run `git status --short --branch` before implementation, staging, commit, and
  merge-back.
- Stage only `TASK-278*` files, Pricing Plans owner files, Pricing Plans tests,
  Pricing Plans docs/report files, and required changelog/board files.
- Because `_docs/_TASKS/README.md` is a shared board touched by parallel agents,
  re-read it immediately before staging and verify the cached diff contains only
  the TASK-278 rows/counts owned by the current commit.
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
- Reject-unknown validation: any new Pricing Plans schema fields must keep
  `additionalProperties: false`, normalize legacy payloads, and add validator
  tests when schema/defaults change.
- Anti-abuse: CTA and link fields must keep TASK-256 safe-href behavior. Icon,
  color, typography, and notes fields must be schema-bound and must not accept
  raw HTML, script, unbounded class names, or browser-stored secrets.

## Testing Requirements

Docs-only task creation:

- `git diff --check`
- `bun run precommit` before the manual commit, unless the configured hook runs
  it automatically and the committer records that proof.

Implementation leaves:

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/pricingPlans.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
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

- Update `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md` with textual
  fixed/deferred evidence for each implemented leaf. Do not commit PNG files.
- Update `_docs/_WIDGETS/PRICING_PLANS.md` when schema, editor modes, runtime
  variants, or behavior changes.
- Update `_docs/WIDGETS.md` only if a global widget contract changes. Prefer
  TASK-256 for shared contract text.
- Update `_docs/WIDGET_PACK_MATRIX.md` if Pricing Plans pack readiness or
  completeness changes.
- Add a changelog entry under `_docs/_CHANGELOG/` and update
  `_docs/_CHANGELOG/README.md` when the family is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every Pricing Plans report finding is either owned by TASK-256, covered by a
  TASK-278 physical leaf, or explicitly deferred by TASK-278-08 with a reason.
- TASK-278 task docs do not duplicate TASK-256 shared-contract implementation
  scope.
- Each implementation leaf names concrete files, data flow, error handling,
  regression tests, documentation updates, and validation commands.
- Runtime changes preserve backward compatibility for existing `pricing-plans`
  payloads unless the leaf documents and tests a migration/normalizer path.
- Final closure records report evidence, task status updates, changelog, and the
  exact validation output.
