# TASK-292: Toggle Block Widget Playwright Product Followups

# FileName: TASK-292_Toggle_Block_Widget_Playwright_Product_Followups.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render + Accessibility + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-256, TASK-256-05-04
**Status:** To Do

---

## Overview

Create the Toggle Block-specific follow-up family for
`_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md`.

TASK-256 owns shared widget-contract drift from the Playwright reports. This
family deliberately excludes those shared-contract repairs and keeps only the
Toggle Block product surface that belongs to:

- `core/widgets/core/toggleBlock.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- `tests/vitest/widgets/toggleBlock.test.tsx`
- `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `_docs/_WIDGETS/TOGGLE_BLOCK.md`

Toggle Block remains a two-pane layout widget with fixed `primary` and
`secondary` slots. If later work needs three or more states, that must be a new
product direction or a Tabs-family decision, not a hidden expansion of this
two-state widget family.

## Scope Boundary Against TASK-256

TASK-292 must not re-open general widget-contract work already routed through
TASK-256:

- duplicate DOM IDs, `aria-controls`, `aria-labelledby`, scoped runtime roots,
  and shared interactive binding remain TASK-256-04 plus TASK-256-05-04;
- Clear vs default vs `none` semantics, CSS-variable token pickers, and shared
  clearable style controls remain TASK-256-02 plus TASK-256-05-04;
- helper text clear/visibility normalization stays with TASK-256-05-04 because
  it is currently listed there with the Toggle Block normalizer owner;
- public placeholder gating and technical slot-label cleanup remain
  TASK-256-03 plus TASK-256-05-04;
- report-wide fixed/deferred classification for TASK-256 remains TASK-256-08.

TASK-292 may consume a final shared helper after TASK-256 lands, but it must not
define a weaker local replacement for a shared contract.

## Report Classification Matrix

| Report finding | Owner | TASK-292 action |
|---|---|---|
| Duplicate HTML IDs, broken cross-instance ARIA, and widget-local ID application (`2.1`, `5.1`) | TASK-256-04 and TASK-256-05-04 | Excluded. TASK-292 leaves may add tests only when they depend on the landed shared helper. |
| Global `window.__nextlessToggleBlockBound` risk (`2.2`) | TASK-256-04 unless TASK-256-08 leaves a Toggle-only residual | Excluded from initial product leaves; closure records the final TASK-256 status. |
| Helper text cannot be cleared (`2.3`, `3.1`, `4.1`, `4.2`, `5.1`, summary) | TASK-256-02 and TASK-256-05-04 | Excluded. TASK-292 must not duplicate the sentinel/normalizer repair. |
| Missing Clear controls for `borderColor` and `accentColor` (`2.4`, `4.2`, summary) | TASK-256-02 and TASK-256-05-04 | Excluded. TASK-292 may only adopt the final shared control in local UX after TASK-256 lands. |
| Hardcoded accent contrast, minimal `cards` distinction, per-pane styling (`2.5`, `2.8`, `2.9`, `4.1`, `5.1`, summary) | TASK-292-01 | Add Toggle Block-owned visual hierarchy, contrast, and independent `primary`/`secondary` pane style controls. |
| Panel transition/motion behavior (`2.7`, low-priority summary) | TASK-292-02 | Add bounded motion options without weakening hidden/ARIA state semantics. |
| Hardcoded radiogroup label and selected-state copy (`2.10`, `5.1`, medium summary) | TASK-256-04 for structural/fallback ARIA wiring; TASK-292-03 only for new persisted localization fields after that seam is settled | Do not duplicate TASK-256 ID, fallback label, scoped runtime, or structural ARIA work. Add only widget-owned localized copy fields if TASK-256 leaves product scope for them. |
| Variant previews, Wizard depth, repeated Variant section, reset defaults, active default-state preview (`3.2`, `3.3`, `3.4`, `3.6`, `3.8`) | TASK-292-04 | Improve mode-specific editor flow and reset UX. |
| Empty pane authoring CTA and explicit two-state limit (`2.6`, `3.7`, future summary) | TASK-292-05 | Add builder-facing guidance and docs; do not change public placeholder gating. |
| Color picker/token list request (`3.5`) | TASK-256-02 first; TASK-292-04 may consume the shared control | Do not implement a one-off color picker. Record final adoption status in closure. |
| Report refresh, widget docs, changelog, board closure | TASK-292-06 | Update fixed/deferred evidence after implementation leaves finish. |

## Current Owner and Test Matrix

| Area | Current owners | Current tests | New or changed tests |
|---|---|---|---|
| Toggle Block schema/defaults/normalizer/runtime | `core/widgets/core/toggleBlock.tsx` | `tests/vitest/widgets/toggleBlock.test.tsx` | Add schema, normalizer, SSR, style, contrast, motion, label, and two-state contract coverage for new fields. |
| Toggle Block editors | `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Add mode-specific tests for variant previews, reset defaults, active-state messaging, pane guidance, and any shared control adoption. |
| Widget validator/registry | `core/widgets/validator.ts`, registry through `createToggleBlockWidget()` | `tests/unit/widgets/validator.test.ts`, `tests/unit/widgets/registry.test.ts` | Run validator tests whenever schema/defaults change; registry only if definition metadata changes. |
| Page-builder pane authoring | `core/admin/ui/pages/PageEditor.tsx`, `core/admin/ui/pages/builder/BlockList.tsx`, only if a leaf adds an Insert Dialog entry point | `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx` | Touch only when the implementation reuses existing builder APIs for pane guidance. |
| Widget docs/report | `_docs/_WIDGETS/TOGGLE_BLOCK.md`, `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | docs diff checks | Update contract docs and fixed/deferred evidence after implementation leaves land. |

## Sub-Tasks

- [ ] TASK-292-01: Toggle Block Variant Visual Hierarchy, Contrast, and Pane Styling
- [ ] TASK-292-02: Toggle Block Motion and Pane Transition Contract
- [ ] TASK-292-03: Toggle Block Accessible Label Localization and Status Copy
- [ ] TASK-292-04: Toggle Block Editor Mode Flow, Variant Previews, and Reset UX
- [ ] TASK-292-05: Toggle Block Pane Authoring Guidance and Two-State Documentation
- [ ] TASK-292-06: Toggle Block Report Docs Changelog and Closure

## Implementation Order

1. Complete TASK-256 shared Toggle Block repairs before implementing leaves that
   depend on the final clear/helper/ID/placeholder contracts.
2. Complete TASK-292-01 first because style fields define the visual model used
   by previews and docs.
3. Complete TASK-292-02 after TASK-292-01 so transition tokens can use the final
   pane classes and style shape.
4. Complete TASK-292-03 after TASK-256-04 lands so localized labels do not
   fight the final instance-safe ID and ARIA wiring.
5. Complete TASK-292-04 after shared clear/color controls land where it consumes
   those controls, and after TASK-292-01 if variant previews must mirror final
   cards styling.
6. Complete TASK-292-05 after the editor flow is stable so authoring guidance is
   not duplicated across modes.
7. Complete TASK-292-06 last with report evidence, widget docs, task-board, and
   changelog updates.

## Implementation Pseudocode

```ts
type ToggleBlockReportOwner =
  | "task-256-shared-contract"
  | "task-292-product-leaf"
  | "intentional-two-state-boundary"
  | "future-product-scope";

function routeToggleBlockFinding(finding: ToggleBlockReportFinding): ToggleBlockReportOwner {
  if (finding.kind === "duplicate-id" || finding.kind === "shared-clear") {
    return "task-256-shared-contract";
  }
  if (finding.kind === "three-plus-states") {
    return "intentional-two-state-boundary";
  }
  if (toggleBlockProductFindings.has(finding.kind)) {
    return "task-292-product-leaf";
  }
  return "future-product-scope";
}

function assertTask292Coverage(findings: ToggleBlockReportFinding[]) {
  const uncovered = findings.filter((finding) => !routeToggleBlockFinding(finding));
  if (uncovered.length > 0) {
    throw new Error(`Uncovered Toggle Block findings: ${uncovered.length}`);
  }
}
```

Data flow:

1. Start every implementation leaf from the source report row and current owner
   file.
2. Route shared rows back to TASK-256 before changing code.
3. Add or update schema/defaults/normalizers before editor/runtime consumers.
4. Add focused Vitest/validator coverage before docs/report closure.
5. Use TASK-292-06 to prove every source-report row has one final status.

## Git Scope Safeguards

- Use a dedicated worktree because several active agents touch
  `_docs/_TASKS/README.md`.
- Run `git status --short --branch` before implementation, before staging, and
  before closure.
- Stage only `TASK-292*`, Toggle Block owners, focused Toggle Block tests,
  Toggle Block docs, the Toggle Block Playwright report, and required
  changelog/board files.
- Do not stage TASK-256 implementation files unless the selected TASK-292 leaf
  explicitly depends on already-landed TASK-256 behavior and the user asked to
  combine the work.
- If `_docs/_TASKS/README.md` conflicts with another agent's task rows, preserve
  both task families and recompute statistics instead of replacing the table
  from either side.

## Security Contract

This umbrella does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged admin UI editing and public runtime widget rendering.
- RBAC: unchanged page/template/widget editing permissions.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: every new Toggle Block persisted field must be
  added to `toggleBlockSchema` with `additionalProperties: false` preserved and
  validator tests updated.
- Anti-abuse: no user-authored scripts, unsafe inline handlers, raw HTML, or
  third-party embeds in Toggle Block widget data, DOM attributes, diagnostics,
  or Playwright evidence.
- Secret handling: no secrets, private URLs, tokens, or privileged settings in
  widget JSON, browser cache, diagnostics, reports, or changelog notes.

## Testing Requirements

- For docs-only task planning: run `git diff --check`.
- For implementation leaves:
  - `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
  - `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata
    changes
  - `bun run test:vitest -- tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`
    only if a leaf touches page-builder slot insertion
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` before family closure
  - `bun run scan:security:strict` and `bun run precommit` before final closure

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` with fixed/deferred
  status for TASK-292 rows.
- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` when data, editor, runtime, motion,
  accessibility copy, or pane authoring behavior changes.
- Update `_docs/WIDGETS.md` only if this family intentionally changes the
  shared widget contract. Most TASK-292 work should stay Toggle Block-only.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if Toggle Block readiness or pack
  completeness changes affect a pack contract.
- Keep `_docs/_TASKS/README.md` synchronized on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and
  `_docs/_CHANGELOG/README.md` is updated.
- Leaves may share one final TASK-292 changelog entry if the implementation is
  landed as one family; otherwise each completed leaf must be listed.

## Acceptance Criteria

- Every finding in `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` is either
  routed to TASK-256, implemented by a TASK-292 leaf, explicitly documented as
  the intentional two-state product boundary, or deferred in the closure leaf
  with a reason.
- TASK-292 leaves do not duplicate implementation already owned by TASK-256.
- Toggle Block schema, defaults, normalizer, render, editor, tests, docs, and
  report evidence move together for every new product field.
- Public runtime output remains safe, accessible, and free of user-authored
  script execution.
