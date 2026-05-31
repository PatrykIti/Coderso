# TASK-286: Stack Widget Playwright Product Followups

# FileName: TASK-286_Stack_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252-05-05, TASK-256
**Status:** Done (2026-05-22)

---

## Overview

Create the Stack-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md`.

TASK-256 owns shared widget-contract drift found across Playwright reports.
This family deliberately excludes those shared-contract repairs and keeps only
product scope that belongs to the standalone `stack` layout primitive:

- `core/widgets/core/stack.tsx`
- `core/admin/ui/widgets/editors/StackEditors.tsx`
- `tests/vitest/widgets/stack.test.tsx`
- `tests/vitest/ui/stack-editor-wave.test.tsx`
- `_docs/_WIDGETS/STACK.md`

Stack is a structural flex layout widget. It should stay beginner-safe,
schema-first, and bounded to one-dimensional flow behavior. It must not grow
into a generic arbitrary-CSS layout engine.

## Scope Boundary Against TASK-256

TASK-286 must not re-open general widget-contract work already routed through
TASK-256:

- BUG-01 variant selection not synchronizing `data.direction.*` remains
  TASK-256-05-02.
- Legacy `"0"` gap payload compatibility is preserved, but Stack controls now
  expose one canonical zero-gap option after the 2026-05-23 audit refresh.
- ISSUE-01 Wizard mobile-direction drift after variant changes remains
  TASK-256-05-02 historical evidence and is already fixed on the current branch.
- ISSUE-02 Advanced variant ownership now follows the settled shared owner model:
  Visual owns variant selection and Advanced stays token/diagnostics-only.
- Public placeholder safety for nested slots remains TASK-256-03. TASK-286 may
  add Stack-local admin guidance only after it can avoid public admin copy.

If a TASK-286 implementation leaf discovers that the desired Stack polish
requires a shared editor helper, slot renderer contract, token policy, or
page-builder runtime contract, split that shared piece back to TASK-256 instead
of hiding it inside this family.

## Report Classification Matrix

| Report finding | Owner | TASK-286 action |
|---|---|---|
| BUG-01 | TASK-256-05-02 | Excluded. Atomic variant + direction patching is shared structural drift. |
| BUG-02 | Audit refresh 2026-05-23 | Closed locally by collapsing visible Stack controls onto one canonical zero-gap option while keeping legacy `"0"` payload compatibility. |
| ISSUE-01 | TASK-256-05-02 | Excluded. Wizard direction truthfulness depends on the shared variant patch. |
| ISSUE-02 | Audit refresh 2026-05-23 | Closed by truthfulness clarification: Visual owns variant selection and Advanced intentionally stays token/diagnostics-only. |
| ISSUE-03 | TASK-286-02 | Add responsive `align` and `justify` without breaking legacy scalar payloads. |
| ISSUE-04 | TASK-286-02 | Add responsive `wrap` without changing non-Stack slot behavior. |
| ISSUE-05 | TASK-286-03 | Improve Stack Wizard layout coverage and label the all-breakpoint gap action. |
| ISSUE-06 | TASK-286-01 | Add `space-around` and `space-evenly` distribution tokens. |
| ISSUE-07 | TASK-286-01 | Add `baseline` alignment token. |
| ISSUE-08 | TASK-286-03 | Add gap scale context in Stack editor labels/help after TASK-256 resolves duplicate zero tokens. |
| ISSUE-09 | TASK-286-04 | Add Stack-local empty-slot guidance only through admin-safe surfaces. |
| ISSUE-10 | TASK-286-04 | Add visual miniatures/icons to Stack variant cards. |
| Report refresh and closure | TASK-286-05 | Update report/docs/changelog/board after implementation leaves finish. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Stack schema/defaults/normalizer/runtime | `core/widgets/core/stack.tsx` | `tests/vitest/widgets/stack.test.tsx`; `tests/unit/widgets/validator.test.ts` when schema validation changes | Add token, responsive axis, wrap, SSR class, marker, legacy payload, and placeholder assertions. |
| Stack editors | `core/admin/ui/widgets/editors/StackEditors.tsx` | `tests/vitest/ui/stack-editor-wave.test.tsx`; `tests/vitest/ui/widget-template-editor.test.tsx` for template shell smoke | Add mode-specific assertions for Wizard guidance, expanded token options, responsive axis controls, variant miniatures, and snapshot output. |
| Shared widget validation/registry | `core/widgets/validator.ts`, registry via `createStackWidget()` | `tests/unit/widgets/validator.test.ts`; `tests/unit/widgets/registry.test.ts` | Run validator tests for schema shape changes and registry tests only if definition metadata changes. |
| Widget docs/report | `_docs/_WIDGETS/STACK.md`, `_docs/WIDGETS.md`, `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` | docs diff checks | Update Stack-only behavior and fixed/deferred evidence after leaves land. |

## Sub-Tasks

- [x] TASK-286-01: Stack Flex Alignment Token Expansion
- [x] TASK-286-02: Stack Responsive Axis and Wrap Controls
- [x] TASK-286-03: Stack Wizard Gap Scale and Layout Guidance
- [x] TASK-286-04: Stack Variant Miniatures and Empty Slot Guidance
- [x] TASK-286-05: Stack Report Docs Changelog and Closure

## Implementation Order

1. Complete TASK-256-05-02 before depending on variant-driven direction state in
   TASK-286 editor leaves.
2. Complete TASK-286-01 before TASK-286-02 so the responsive model supports the
   final Stack token set.
3. Complete TASK-286-02 before TASK-286-03 so Wizard copy and controls target
   the final responsive axis/wrap model.
4. Complete TASK-286-04 after TASK-286-02. Variant miniatures and editor-side
   empty-slot guidance may land immediately; only an admin-preview-only runtime
   placeholder is gated on TASK-256-03 determining public placeholder safety.
5. Complete TASK-286-05 last with report evidence, widget docs, task-board, and
   changelog updates.

## Git Scope Safeguards

- Use a dedicated worktree for implementation because several active agents
  touch `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-286*`, Stack owners, focused Stack tests, Stack docs, the
  Stack Playwright report, and required changelog/board files.
- Do not stage unrelated TASK-256, split-layout, section, grid, or other widget
  report edits.
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
- Reject-unknown validation: every new persisted Stack field must be added to
  `stackSchema` with `additionalProperties: false` preserved and validator
  tests updated.
- Anti-abuse: no user-authored scripts, unsafe inline handlers, raw class names,
  arbitrary CSS, or admin-only slot instructions in public Stack output.
- Secret handling: no secrets, private URLs, tokens, or privileged settings in
  Stack widget JSON, browser cache, diagnostics, Playwright evidence, or
  changelog notes.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx` if
    Stack editor shell behavior changes in template editing
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata
    changes
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
    if a leaf touches none/clear/token adjacency after TASK-256
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` before family closure
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` with fixed/deferred status
  for TASK-286 rows.
- Update `_docs/_WIDGETS/STACK.md` when data, editor, runtime, placeholder, or
  visual card behavior changes.
- Update `_docs/WIDGETS.md` only if this family intentionally changes the shared
  widget token or option contract. Most TASK-286 work should stay Stack-only.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Stack readiness/completeness
  changes affect a pack contract.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-286 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md` is either routed to
  TASK-256, implemented by a TASK-286 leaf, or explicitly deferred in the
  closure leaf with a reason.
- TASK-286 leaves do not duplicate implementation already owned by TASK-256.
- Stack schema, defaults, normalizer, render, editor, tests, docs, and report
  evidence move together for every new product field.
- Public Stack output remains safe, deterministic, and free of arbitrary classes
  or admin-only slot instructions.


## Completion Notes (2026-05-22)

- Stack now ships responsive `align`, `justify`, and `wrap`, the missing Stack-owned flex tokens, clearer Wizard layout guidance, and deterministic variant miniatures without expanding into arbitrary CSS.
- Final report, widget docs, task files, board rows, and changelog now agree on the TASK-286 outcome after the 2026-05-23 truthfulness refresh closed the remaining duplicate-zero and mode-ownership doc drift.
