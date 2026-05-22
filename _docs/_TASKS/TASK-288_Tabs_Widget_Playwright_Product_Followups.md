# TASK-288: Tabs Widget Playwright Product Followups

# FileName: TASK-288_Tabs_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256
**Status:** Done (2026-05-22)

---

## Overview

Create the Tabs-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md`.

TASK-256 owns the already-landed shared widget-contract drift from the
Playwright reports. This family deliberately excludes shared fixes and keeps
only product scope that belongs to the standalone `tabs` layout widget. Shared residuals extracted during implementation stay visible in `TASK-330` (Tabs accessibility / ID carryover after TASK-256) and `TASK-329` (shared runtime-script transport / dedupe):

- `core/widgets/core/tabs.tsx`
- `core/admin/ui/widgets/editors/TabsEditors.tsx`
- `tests/vitest/widgets/tabs.test.tsx`
- `tests/vitest/ui/tabs-editor-wave.test.tsx`
- `_docs/_WIDGETS/TABS.md`

Tabs is a repeatable-slot layout widget. This family must preserve the shared
slot, clear-token, and interactive accessibility contracts instead of
duplicating them locally.

## Scope Boundary Against TASK-256

TASK-288 must not re-open general widget-contract work already routed through
TASK-256:

- duplicate DOM IDs, instance-safe tab/panel relationships, and shared
  keyboard binding ownership remain historical TASK-256-04 plus TASK-256-05-04
  evidence that TASK-288 consumes but does not reimplement;
- public placeholder gating and friendly repeatable slot labels remain
  TASK-256-03 plus TASK-256-05-04;
- generic clear/none token semantics, clearable color-field helpers, and shared
  color-picker behavior remain TASK-256-02;
- report-wide fixed/deferred classification for shared rows remains TASK-256-08.

TASK-288 also must not silently absorb newly rediscovered shared-contract drift.
The current branch still lacks the final shared Tabs tablist/panel accessibility
adoption (`aria-label` + `tabIndex`) even though TASK-256 is closed, so those
rows are extracted into `TASK-330` instead of being hidden inside the Tabs
product family.

If a TASK-288 implementation leaf discovers that a desired Tabs product feature
requires a shared page-builder, slot, runtime binding, or generic editor-control
contract, split that shared piece back to TASK-256 instead of hiding it inside
this family.

## Report Classification Matrix

| Report rows | Owner | TASK-288 action |
|---|---|---|
| C2, R4 | TASK-256-04 / TASK-256-05-04 | Excluded. Instance-safe IDs and shared runtime root scoping already belong to the closed TASK-256 contract and must not be reimplemented here. |
| W4, W5, R2, R3, R6 | TASK-330 | Excluded. The shared tablist accessible-name and tabpanel keyboard-reachability residuals were rediscovered during TASK-288 audit and are now tracked as a separate shared follow-up instead of being overclaimed by TASK-288. |
| TASK-256 slot placeholder evidence around empty panels | TASK-256-03 / TASK-256-05-04 | Excluded. Public placeholder gating and technical slot-label cleanup stay shared. |
| Generic clear-token/color-picker semantics connected to Tabs colors | TASK-256-02 | Excluded. TASK-288 may consume the final helper, not reimplement it. |
| C1, U2, U7, U8 | TASK-288-01 | Add Tabs-specific Visual color parity, readable labels, section IA, and contrast guidance using the shared color-control model. |
| W2, U4, U5, U9 | TASK-288-02 | Add Wizard layout shortcuts, default-tab preview, panel-slot guidance, and safe slot-removal impact copy. |
| C3, W6, R5 | TASK-288-03 | Repair Tabs-specific admin preview activation and explicit script-type behavior locally, then route the still-shared runtime payload dedupe residue to `TASK-329` after TASK-256 finalizes the shared instance contract. |
| W1, W7, W10, U3 | TASK-288-04 | Add trigger metadata, description semantics, and disabled-tab product behavior. |
| W3, W8, W9, W12, U6, R1 | TASK-288-05 | Add Tabs-owned vertical alignment, overflow, typography, spacing, and any inner/panel width controls without duplicating shared `layout.container`. |
| W11, U1 | TASK-288-06 | Add reduced-motion-safe transitions and visual variant previews after the functional model lands. |
| Final fixed/deferred evidence, report refresh, docs/changelog/board closure | TASK-288-07 | Update report/docs/changelog/board after implementation leaves finish. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Tabs schema/defaults/normalizer/runtime | `core/widgets/core/tabs.tsx` | `tests/vitest/widgets/tabs.test.tsx`, `tests/unit/widgets/validator.test.ts` | Add schema, normalization, SSR, data marker, admin-preview, disabled, overflow, and transition assertions as fields land. |
| Tabs editors | `core/admin/ui/widgets/editors/TabsEditors.tsx` | `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add mode-specific assertions for Visual color parity, Wizard layout shortcuts, slot impact copy, trigger metadata, variant previews, and new style controls. |
| Shared builder slot controls | `core/admin/ui/pages/builder/BlockSettings.tsx` only if the existing slot-control owner is changed | `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`; `tests/vitest/pageBuilder/visualPanel.test.tsx` only if slot-control rendering changes | Do not add shared repeatable-slot helpers in TASK-288; split to TASK-256 if the existing owner must change. |
| Widget docs/report | `_docs/_WIDGETS/TABS.md`, `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` | docs diff checks | Update fixed/deferred evidence and the Tabs contract after implementation leaves land. |

## Sub-Tasks

- [x] TASK-288-01: Tabs Visual Color Parity and Editor IA
- [x] TASK-288-02: Tabs Wizard Layout, Default Tab, and Slot Guidance
- [x] TASK-288-03: Tabs Admin Preview and Runtime Activation
- [x] TASK-288-04: Tabs Trigger Metadata and Disabled Tab Model
- [x] TASK-288-05: Tabs Layout Overflow Typography and Spacing
- [x] TASK-288-06: Tabs Motion Variant Previews and Polish
- [x] TASK-288-07: Tabs Report Docs and Closure

## Implementation Order

1. Complete or consume the relevant TASK-256 shared-contract fixes before
   implementing TASK-288 leaves that depend on final ID, ARIA, slot placeholder,
   or clear-control behavior.
2. Complete TASK-288-01 first so the color/editor model is honest before
   style-heavy leaves add more controls.
3. Complete TASK-288-02 before trigger metadata and layout leaves so editor
   guidance explains the final panel-slot model.
4. Complete TASK-288-03 after TASK-256 instance-safe IDs land, because admin
   preview activation must not hard-code the old duplicate-ID selectors.
5. Complete TASK-288-04 after the basic editor guidance is stable, because
   trigger metadata and disabled-state behavior expand persisted item data.
6. Complete TASK-288-05 after TASK-288-01 so new layout/style controls use the
   same token and label conventions.
7. Complete TASK-288-06 after the final trigger/runtime/layout model is stable.
8. Complete TASK-288-07 last with report evidence, widget docs, task-board, and
   changelog updates.

## Git Scope Safeguards

- Use a dedicated worktree for implementation because several active agents
  touch `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-288*`, Tabs owners, focused Tabs tests, Tabs docs, the Tabs
  Playwright report, and required changelog/board files.
- Do not stage unrelated TASK-256, TASK-257, TASK-266, or other widget report
  edits.
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
- Reject-unknown validation: every new Tabs persisted field must be added to
  `tabsSchema` with `additionalProperties: false` preserved and validator tests
  updated.
- Anti-abuse: no user-authored scripts, unsafe inline handlers, raw HTML, or
  arbitrary third-party code in Tabs data, runtime scripts, diagnostics, or
  Playwright evidence.
- Secret handling: no secrets, private URLs, tokens, or privileged settings in
  widget JSON, browser cache, diagnostics, reports, or changelog notes.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
    only if a leaf touches shared page-builder slot controls
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` before family closure
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` with fixed/deferred status for
  TASK-288 rows.
- Update `_docs/_WIDGETS/TABS.md` when data, editor, runtime, or visual behavior
  changes.
- Update `_docs/WIDGETS.md` only if this family intentionally changes a shared
  widget contract. Most TASK-288 work should stay Tabs-only.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Tabs readiness/completeness
  changes affect a pack contract.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-288 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` is either routed to
  TASK-256 historical evidence, routed to TASK-330 shared residual follow-up,
  implemented by a TASK-288 leaf, or explicitly deferred in the closure leaf
  with a reason.
- TASK-288 leaves do not duplicate implementation already owned by TASK-256.
- Tabs schema, defaults, normalizer, render, editor, tests, docs, and report
  evidence move together for every new product field.
- Public runtime output remains safe, accessible, deterministic, and free of
  user-authored script execution.
