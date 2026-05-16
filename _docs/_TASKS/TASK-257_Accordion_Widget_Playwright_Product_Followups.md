# TASK-257: Accordion Widget Playwright Product Followups

# FileName: TASK-257_Accordion_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Large
**Dependencies:** TASK-252, TASK-256
**Status:** To Do

---

## Overview

Create the widget-specific follow-up backlog for the layout `accordion` widget
from `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright reports. This
family deliberately excludes those shared-contract repairs and keeps only the
Accordion product surface that is specific to `core/widgets/core/accordion.tsx`
and `core/admin/ui/widgets/editors/AccordionEditors.tsx`.

The report also mentions `faq-accordion`, but that is a separate content widget
with its own report (`_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md`) and
TASK-256-06-03 coverage. FAQ rows from the Accordion report are classified here
only to keep ownership explicit; they are not implemented in TASK-257.

## Scope Boundary

TASK-257 implements only Accordion-specific product behavior and editor polish.
It must not re-open the shared contract work already routed through TASK-256:

- shared clear/none behavior remains TASK-256-02;
- slot placeholder and technical slot label cleanup remain TASK-256-03 and
  TASK-256-05-04;
- instance-safe IDs, ARIA relationships, chevrons, and interactive runtime
  state remain TASK-256-04 and TASK-256-05-04;
- FAQ Accordion rows remain TASK-256-06-03 or a future FAQ-specific family.

If an implementation leaf discovers that a requested Accordion UX requires a
shared page-builder contract change, the leaf must stop and split that shared
change out instead of hiding it inside TASK-257.

## Report Classification Matrix

| Report rows | Owner | TASK-257 action |
|---|---|---|
| C1, C3, C4, U1, U2, U7, U10, R1-R7 | TASK-256-02/03/04 and TASK-256-05-04 | Excluded from TASK-257; reuse the final shared-contract result as a dependency. |
| C2, W4, W8, W9, W10, W13, W14, U9, R5, FAQ parts of C4/R2-R4 | TASK-256-06-03 or future FAQ task | Excluded from TASK-257 because they target `faq-accordion`. |
| W11 | TASK-257-01 | Add an explicit Accordion all-collapsed initial state after TASK-256 fixes default-open truthfulness. |
| W3, W5, W6, W7, W12, U8 | TASK-257-02 | Add Accordion-owned style/layout/typography controls and consistent color-picking UX. |
| W2, U3, U5, U6 | TASK-257-03 | Add Accordion item content affordances and item-management UX where it can be done without a shared slot-contract change. |
| W1, U4 | TASK-257-04 | Add Accordion-specific motion and variant preview polish after the functional product controls land. |
| Report refresh and docs closure | TASK-257-05 | Update report/docs/changelog/board with fixed/deferred evidence after implementation leaves finish. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Accordion schema/defaults/normalizer | `core/widgets/core/accordion.tsx` | `tests/vitest/widgets/accordionWidget.test.tsx` | Add schema/normalizer/runtime coverage for new option/style fields. |
| Accordion editors | `core/admin/ui/widgets/editors/AccordionEditors.tsx` | `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add mode-specific editor assertions for new controls and UX copy. |
| Repeatable slot item controls | `core/admin/ui/pages/builder/BlockSettings.tsx`, `VisualPanel.tsx`, `blockUtils.ts` | `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`, `tests/vitest/pageBuilder/blockList.test.tsx` | Only touch if the leaf can remain Accordion-scoped; otherwise split shared slot work first. |
| Widget docs/report | `_docs/_WIDGETS/ACCORDION.md`, `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` | docs diff checks | Update fixed/deferred evidence and new contract docs. |

## Sub-Tasks

- [ ] TASK-257-01: Accordion Initial Open State Product Options
- [ ] TASK-257-02: Accordion Style Layout and Typography Controls
- [ ] TASK-257-03: Accordion Item Content and Management UX
- [ ] TASK-257-04: Accordion Motion and Variant Preview Polish
- [ ] TASK-257-05: Accordion Report Docs and Closure

## Implementation Order

1. Complete TASK-256 shared-contract leaves that touch Accordion before
   implementing TASK-257 leaves.
2. Complete TASK-257-01 first so later editor leaves can target the final open
   state model.
3. Complete TASK-257-02 before visual preview polish because preview cards must
   reflect the final style token model.
4. Complete TASK-257-03 after verifying whether item-management requests can be
   implemented without a shared slot-order helper.
5. Complete TASK-257-04 after functional controls land.
6. Complete TASK-257-05 last with report evidence, widget docs, task-board, and
   changelog updates.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only the selected TASK-257 leaf files plus required docs/report/changelog
  files.
- Do not stage TASK-256 implementation files unless the selected TASK-257 leaf
  explicitly depends on already-landed TASK-256 behavior and the user asked to
  combine the work.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: update the Accordion widget schema and validator
  tests whenever new persisted fields are added.
- Anti-abuse: no user-authored scripts, unsafe inline event handlers, or secrets
  in widget data, DOM attributes, diagnostics, or Playwright evidence.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
  - `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
    only if a leaf touches page-builder slot controls
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` with fixed/deferred
  status for TASK-257 rows.
- Update `_docs/_WIDGETS/ACCORDION.md` when data, editor, or runtime behavior
  changes.
- Update `_docs/WIDGETS.md` only if a TASK-257 leaf intentionally changes a
  source-of-truth widget contract, not for Accordion-only field additions.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  family is completed.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-257-05 may create the final
  umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every Accordion-specific report row is either implemented by a TASK-257 leaf,
  explicitly excluded as TASK-256 shared-contract scope, explicitly routed to
  FAQ scope, or deferred with a documented reason.
- Accordion schema, defaults, normalizer, render, editor, tests, and docs stay
  synchronized for every new product field.
- No TASK-257 leaf weakens shared slot, accessibility, clear/none, or runtime
  contracts owned by TASK-256.
