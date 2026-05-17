# TASK-266: FAQ Accordion Widget Playwright Product Followups

# FileName: TASK-266_FAQ_Accordion_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Content + Admin UI + Runtime Render + SEO + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-06-04, TASK-256, TASK-293
**Status:** Done (2026-05-17)

---

## Overview

Create the FAQ Accordion-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright reports. This
family deliberately excludes shared-contract repairs and keeps only product
scope that belongs to the standalone `faq-accordion` content widget:

- `core/widgets/core/faqAccordion.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `tests/vitest/widgets/faqAccordion.test.tsx`
- `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `_docs/_WIDGETS/FAQ.md`

FAQ Accordion is not the layout `accordion` slot widget. TASK-257 owns
`accordion`; this family owns only `faq-accordion` rows from the dedicated FAQ
report.

## Scope Boundary Against TASK-256

TASK-266 must not re-open general widget-contract work already routed through
TASK-256:

- `allowMultipleOpen=false` single-open runtime enforcement remains
  TASK-256-06-03 plus the shared runtime/ARIA contract in TASK-256-04;
- summary IDs and single-open runtime behavior remain closed by TASK-256, while
  the still-live FAQ chevron/ARIA residuals are repaired in TASK-293 before
  the FAQ product leaves land;
- clear controls for `border`/`divider`, FAQ token-picker truthfulness, and the
  still-live FAQ spacing residuals now route through TASK-293 instead of being
  hidden inside TASK-266 leaves;
- report-wide fixed/deferred classification for TASK-256 remains TASK-256-08.

If a TASK-266 implementation leaf discovers that a desired FAQ product feature
requires a shared helper, generic editor control, or cross-widget runtime
contract, split that shared piece back to TASK-256 instead of hiding it inside
this family.

## Report Classification Matrix

| Report rows | Owner | TASK-266 action |
|---|---|---|
| C1, W13 | TASK-256-06-03 / TASK-256-04 | Excluded. Single-open enforcement is a shared interactive runtime contract. |
| C2, A1-A5 | TASK-293 | Excluded. Live chevron and FAQ ARIA residuals stay in the dedicated shared follow-up task. |
| C3, W15 | TASK-293 | Excluded. Live FAQ spacing guard and double-border residuals stay in the dedicated shared follow-up task. |
| U2, U3 | TASK-293 | Excluded. Live FAQ clear/token adoption residuals stay in the dedicated shared follow-up task. |
| W1, W2, W3, W4, W5, W6, W7, W8, W12, W14 | TASK-266-01 | Add FAQ-owned layout, typography, color, radius, border-width, and motion options. |
| W10, W11 | TASK-266-02 | Add safe rich answer formatting and optional item icon data. |
| W9 | TASK-266-03 | Add safe FAQPage JSON-LD output and editor control. |
| U4, U6, U8, U9 | TASK-266-04 | Improve Wizard coverage, item counts, question-aware open-state labels, and Advanced guidance. |
| U1, U5, U7, U10, U11 | TASK-266-05 | Add safer item-management UX, action density polish, variant previews, drag/drop, and bounded bulk actions. |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-266-06 | Update report/docs/changelog/board after implementation leaves finish. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| FAQ schema/defaults/normalizer/runtime | `core/widgets/core/faqAccordion.tsx` | `tests/vitest/widgets/faqAccordion.test.tsx`, `tests/vitest/widgets/styleNoneTokens.test.tsx` | Add focused schema, normalization, SSR, JSON-LD, sanitized content, icon, layout/style, and motion assertions. |
| FAQ editors | `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Add mode-specific assertions for Wizard description, open-state labels, counters, item workflow, variant preview, and new style/content controls. |
| Widget validator/registry | `core/widgets/validator.ts`, registry via `createFaqAccordionWidget()` | `tests/unit/widgets/validator.test.ts`, `tests/unit/widgets/registry.test.ts` | Run validator tests whenever TASK-266 adds schema fields; registry only if definition metadata changes. |
| Widget docs/report | `_docs/_WIDGETS/FAQ.md`, `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` | docs diff checks | Update contract docs and fixed/deferred evidence after implementation leaves land. |

## Sub-Tasks

- [ ] TASK-266-01: FAQ Accordion Layout Typography and Motion Controls
- [ ] TASK-266-02: FAQ Accordion Rich Answers and Item Icon Model
- [ ] TASK-266-03: FAQ Accordion SEO Structured Data Contract
- [ ] TASK-266-04: FAQ Accordion Wizard and Open State Editor UX
- [ ] TASK-266-05: FAQ Accordion Item Management and Variant Preview Polish
- [ ] TASK-266-06: FAQ Accordion Report Docs and Closure

## Implementation Order

1. Complete TASK-293 before implementing FAQ-local product leaves so the still
   live shared FAQ residuals are repaired outside the widget-specific family.
2. Complete TASK-266-01 first because layout, typography, and motion fields
   define the style model used by later preview and docs work.
3. Complete TASK-266-02 before TASK-266-03 so JSON-LD can extract plain text
   from the final rich-answer model without duplicating parsing rules.
4. Complete TASK-266-03 after rich-answer normalization is stable.
5. Complete TASK-266-04 before TASK-266-05 so item-management controls use the
   final open-state copy and item labels.
6. Complete TASK-266-05 after the style/content/editor primitives are stable.
7. Complete TASK-266-06 last with report evidence, widget docs, task-board, and
   changelog updates.

## Git Scope Safeguards

- Use a dedicated worktree for implementation because several active agents
  touch `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-266*`, FAQ Accordion owners, focused FAQ tests, FAQ docs,
  the FAQ Playwright report, and required changelog/board files.
- Do not stage unrelated TASK-256, TASK-257, or other widget report edits.
- If `_docs/_TASKS/README.md` conflicts with another agent's task rows, merge
  by preserving both task families and recomputing statistics instead of
  replacing the table from either side.

## Security Contract

This umbrella does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged admin UI editing and public runtime widget rendering.
- RBAC: unchanged page/template/widget editing permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new FAQ persisted field must be added to
  `faqAccordionSchema` with `additionalProperties: false` preserved and
  validator tests updated.
- Anti-abuse: no user-authored scripts, unsafe inline handlers, raw HTML, or
  third-party embeds in FAQ widget data. Rich answers must pass through a safe
  bounded renderer.
- Secret handling: no secrets, private URLs, tokens, or privileged settings in
  widget JSON, browser cache, diagnostics, Playwright evidence, or changelog
  notes.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun test tests/unit/widgets/registry.test.ts` if widget definition
    metadata changes
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit` before any manual commit that includes the family

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` with fixed/deferred
  status for TASK-266 rows.
- Update `_docs/_WIDGETS/FAQ.md` when data, editor, runtime, SEO, or rich
  answer behavior changes.
- Update `_docs/WIDGETS.md` only if this family intentionally changes the
  shared widget contract. Most TASK-266 work should stay FAQ-only.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if FAQ readiness/completeness
  changes affect a pack contract.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-266 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md` is either
  routed to TASK-256, implemented by a TASK-266 leaf, or explicitly deferred in
  the closure leaf with a reason.
- TASK-266 leaves do not duplicate implementation already owned by TASK-256.
- FAQ Accordion schema, defaults, normalizer, render, editor, tests, docs, and
  report evidence move together for every new product field.
- Public runtime output remains safe, accessible, and free of user-authored
  script execution.

## Completion Notes

- TASK-266 landed end-to-end after TASK-293 repaired the still-live shared FAQ
  residuals outside the widget-specific family.
- Validation evidence:
  - `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts`
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun run lint`
  - `bun run gates:coderso`
  - `bun run precommit`
- `bun run scan:security:strict` remains environment-blocked in this worktree
  because local Semgrep fails with `ca-certs: empty trust anchors` and
  `bun audit` returns `ConnectionRefused`.
