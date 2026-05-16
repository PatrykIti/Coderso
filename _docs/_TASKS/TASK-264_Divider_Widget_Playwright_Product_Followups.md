# TASK-264: Divider Widget Playwright Product Followups

# FileName: TASK-264_Divider_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Large
**Dependencies:** TASK-252, TASK-256-02, TASK-256-05-03
**Status:** To Do

---

## Overview

Create the Divider-specific follow-up backlog from
`_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright reports. This
family deliberately excludes shared editor-mode, token, color-picker, and
separator-accessibility repairs already routed through TASK-256. TASK-264 owns
only product and polish work that is specific to the current Divider widget
owners:

- `core/widgets/core/divider.tsx`;
- `core/admin/ui/widgets/editors/DividerEditors.tsx`;
- `tests/vitest/widgets/divider.test.tsx`;
- `tests/vitest/ui/divider-editor-wave.test.tsx`;
- `_docs/_WIDGETS/DIVIDER.md`;
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md`.

The Divider is an atomic layout widget with no slots and no public write route.
Every implementation leaf must keep that simplicity: schema-first fields,
bounded tokens, backward-compatible normalization, deterministic runtime output,
and editor controls that do not imply shared page-builder behavior.

## Scope Boundary

TASK-264 implements only Divider-specific product behavior, renderer polish, and
editor UX. It must not duplicate TASK-256 shared-contract fixes:

- Advanced no-op variant select remains TASK-256-01 and TASK-256-05-03.
- Shared `Clear`/`none`/custom-spacing semantics remain TASK-256-02 and
  TASK-256-05-03.
- CSS variable preservation in native color pickers remains TASK-256-02 and
  TASK-256-05-03.
- Divider `<hr>`/`role="separator"`/decorative `aria-hidden` baseline remains
  TASK-256-05-03.
- Shared spacing-token validation and resolved-value copy remain TASK-256-02
  unless TASK-256 exposes a helper that this family can consume.

If a TASK-264 leaf discovers it needs a reusable editor helper, global color
picker behavior, page-builder mode ownership, or shared accessibility primitive,
the leaf must stop and split that work back to TASK-256 or a new shared
contract task.

## Report Classification Matrix

| Report rows | Owner | TASK-264 action |
|---|---|---|
| C1, C2, C3, U1, U7, U8, W6, W7, R1, R2 | TASK-256-01, TASK-256-02, TASK-256-05-03 | Excluded from TASK-264. Use the final shared-contract behavior as a dependency before implementing adjacent Divider polish. |
| W1, W2, W8, W9, U2, U9, R4 | TASK-264-01 | Add Divider-owned label color, typography, nowrap, label gap, clearer label copy, and clear-label affordance. |
| W3, W4, U5 and the custom-width part of U6 | TASK-264-02 | Add Divider-owned container width, horizontal alignment, and custom-width validation feedback without changing shared spacing semantics. |
| W5, W10, W11 | TASK-264-03 | Add Divider-owned opacity/alpha, bounded dash-pattern or dotted style controls, and spacer-only visibility mode using bounded schema fields. |
| U3, U4, W12 | TASK-264-04 | Add inline Divider preview, Wizard comfort controls, and reset/normalize actions after shared token/color behavior is available. |
| R3 | TASK-264-05 | Remove or sanitize raw style-token data markers such as `data-divider-color="var(--color-border)"`. |
| Source report refresh, widget docs, changelog, task board | TASK-264-06 | Record fixed/deferred/routed evidence after implementation leaves finish. |
| Admin session expiry from section 8.1 | Not Divider scope | Excluded. This is CMS/session lifecycle work, not a Divider widget task. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Schema, defaults, normalizer, renderer | `core/widgets/core/divider.tsx` | `tests/vitest/widgets/divider.test.tsx` | Add schema/normalizer/runtime assertions for each new bounded field and DOM marker change. |
| Wizard/Visual/Advanced editors | `core/admin/ui/widgets/editors/DividerEditors.tsx` | `tests/vitest/ui/divider-editor-wave.test.tsx` | Add editor-flow assertions for new controls, inline preview, reset, validation feedback, and label clearing. |
| Shared token/color/ARIA adjacency | TASK-256 leaves | `tests/vitest/widgets/styleNoneTokens.test.tsx`, shared editor tests, Divider suites listed in TASK-256-05-03 | Do not duplicate in TASK-264. Run only when a Divider leaf consumes already-landed shared helpers. |
| Widget docs and source report | `_docs/_WIDGETS/DIVIDER.md`, `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` | docs diff checks | Update fixed/deferred/routed status and final usage contract after implementation leaves. |

## Sub-Tasks

- [ ] TASK-264-01: Divider Label Color Typography and Gap Controls
- [ ] TASK-264-02: Divider Width Alignment and Custom Validation
- [ ] TASK-264-03: Divider Line Style Opacity and Spacer Only Mode
- [ ] TASK-264-04: Divider Editor Preview Reset and Wizard UX
- [ ] TASK-264-05: Divider Runtime DOM Marker Hygiene
- [ ] TASK-264-06: Divider Report Docs and Closure

## Implementation Order

1. Complete TASK-256-02 and TASK-256-05-03 first, or verify that the selected
   TASK-264 leaf is not touching shared token/color/ARIA behavior.
2. Complete TASK-264-01 before preview/editor polish so the preview can reflect
   final label behavior.
3. Complete TASK-264-02 before broad layout preview polish because width and
   alignment affect every preview surface.
4. Complete TASK-264-03 after shared color preservation exists, so opacity and
   line-style fields do not hide the CSS variable picker fix.
5. Complete TASK-264-04 after functional schema fields land.
6. Complete TASK-264-05 before report closure so runtime evidence does not
   retain stale raw-style markers.
7. Complete TASK-264-06 last with report evidence, widget docs, changelog, board
   sync, and final validation.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Worktree note: `_docs/_TASKS/README.md` is a shared hotspot while multiple
  agents are drafting widget task families. Re-read it immediately before
  patching and add only the TASK-264 rows/stat change.
- Stage only selected TASK-264 files plus required Divider docs, report,
  changelog, and task-board rows.
- Verify `git diff --cached --name-only` before every commit so TASK-261,
  TASK-262, TASK-263, TASK-256, or unrelated Playwright work does not enter
  this scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged page/template/widget-template write permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new persisted Divider field must be added to
  `dividerSchema`, normalized in `normalizeDividerData()`, and covered by
  validator/runtime tests.
- Anti-abuse: optional style fields must be bounded token/color/length values
  only; no raw HTML, scripts, inline event handlers, unbounded class names, or
  privileged data may enter widget payloads, DOM markers, diagnostics, or
  Playwright evidence.
- Secret handling: no secrets in Divider data, browser storage, reports, or
  changelog entries.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when shared
    SSR renderer output changes
  - `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` only
    when a leaf consumes or extends landed TASK-256 token semantics
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` plus targeted release-gate suites when a leaf
    changes accessibility or public runtime output
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md` with fixed, deferred, or
  TASK-256-routed status for every Divider report row.
- Update `_docs/_WIDGETS/DIVIDER.md` when data, editor, runtime, or
  user-facing behavior changes.
- Update `_docs/WIDGETS.md` only if a source-of-truth widget contract changes;
  Divider-only field additions belong in the widget doc.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness/completeness
  changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  family is completed.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-264-06 may create the final
  umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every finding in `REPORT_DIVIDER_WIDGET.md` is implemented by a TASK-264 leaf,
  routed to TASK-256 shared-contract scope, explicitly excluded as non-Divider
  scope, or deferred with a reason in TASK-264-06.
- Divider schema, defaults, normalizer, renderer, editors, tests, and docs stay
  synchronized for every new product field.
- TASK-264 leaves do not weaken or duplicate shared TASK-256 contracts.
- Admin preview and frontend rendering have textual Playwright evidence after
  implementation closure.
