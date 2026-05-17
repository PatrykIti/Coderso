# TASK-256-05-04: Tabs, Accordion, and Toggle Block Structural Residuals

# FileName: TASK-256-05-04_Tabs_Accordion_and_Toggle_Block_Structural_Residuals.md

**Priority:** High
**Category:** Widgets + Layout + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-256-02, TASK-256-03, TASK-256-04, TASK-256-05
**Status:** To Do

---

## Overview

Repair the structural residuals for interactive slot widgets after the shared
placeholder and instance/accessibility contracts land.

This leaf does not own the whole interactive runtime contract. TASK-256-04 owns
the shared ID/binding/ARIA pattern. This leaf applies remaining shared
structural fixes for tabs, accordion, and toggle-block only where they are not
handled by the shared contract alone. Tabs-specific product follow-ups from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` now route to TASK-288.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:64-65,74-76,103-107,144-155,168,287`
  covers shared instance-safe IDs, runtime binding prerequisites, ARIA,
  placeholder gating, and script/runtime transport concerns that TASK-288-03
  consumes after TASK-256-04 lands.
- `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:96,106-116,138,163-170,240,286`
  covers slot labels, default-open/collapsible behavior, placeholder leakage,
  clear controls, chevron, and ARIA.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:43-52,82,111,124,149,165-166,207,248`
  covers helper-text clear drift, missing clear controls, editor ownership,
  placeholder leakage, duplicate IDs, and remaining structural cleanup.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Tabs shared structural residuals: technical slot labels, public placeholders, instance-safe ID/ARIA prerequisites, and shared runtime binding prerequisites | Consume TASK-256-03 slot/placeholder metadata and TASK-256-04 instance/ARIA/runtime helpers; this leaf only verifies Tabs-specific report closure after those prerequisites land | TASK-256-03 and TASK-256-04 shared owners; `TabsEditors.tsx`/`tabs.tsx` only adopt the shared helpers in the same dependency slice | TASK-288 consumes the final shared contract. |
| Tabs product rows: inactive text color, Wizard layout shortcut, trigger metadata, disabled tabs, vertical alignment semantics, overflow/typography/spacing, animations, visual previews, label polish, and admin-preview activation | Do not fix here | `TASK-288*` | TASK-288 owns implementation and final fixed/deferred evidence. |
| Accordion slot labels, default-open/collapsible behavior, placeholder leakage, clear controls, chevron, and ARIA gaps | TASK-256-03 owns slot labels/placeholders, TASK-256-02 owns clear controls, and TASK-256-04 owns instance IDs/ARIA. This leaf owns only Accordion default-open/collapsible and chevron behavior not covered by those shared helpers. | `AccordionEditors.tsx`, `accordion.tsx` for Accordion-only behavior; shared helpers stay with TASK-256-02, TASK-256-03, and TASK-256-04 | None |
| Toggle Block helper clear, missing clear controls, pane labels, placeholders, duplicate IDs, and ARIA/runtime root scope | TASK-256-02 owns helper clear/style clear, TASK-256-03 owns pane labels/placeholders, and TASK-256-04 owns duplicate IDs/ARIA/runtime root scope. This leaf verifies Toggle Block adoption without redefining the shared contracts. | `ToggleBlockEditors.tsx`, `toggleBlock.tsx` only for widget-local adoption and residual cleanup | None |
| Toggle Block accent-contrast, color-token picker, and reset-to-defaults correctness | Fix current TASK-256 shared-control defects through TASK-256-02 and the Toggle Block owners | `ToggleBlockEditors.tsx`, `toggleBlock.tsx` | None |
| Toggle Block weak switch/cards visual distinction, placeholder CTA, Wizard naming polish, and localized aria label | Product/UX scope in TASK-292 | `TASK-292` family | TASK-256-08 references TASK-292 instead of creating duplicate Toggle Block follow-ups |

## Sub-Tasks

- [ ] Consume TASK-256-03 user-facing slot labels/stable metadata in tabs and
  accordion editors.
- [ ] Consume TASK-256-02 clear helpers for tab/accordion style fields without
  creating widget-local clear semantics.
- [ ] Verify TASK-256-03 placeholder gating for tabs, accordion, and toggle
  panes.
- [ ] Verify TASK-256-04 instance-safe ID and ARIA adoption in widget-local
  renderers.
- [ ] Keep accordion default-open/collapsible controls consistent between editor
  and runtime.
- [ ] Apply TASK-256-02 clear/normalizer repair to toggle-block helper text,
  `borderColor`, and `accentColor`.
- [ ] Route Tabs product rows to TASK-288 and keep TASK-256-08 focused on shared
  contract closure plus any remaining Toggle Block shared/product deferrals.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | 277-302, 370-430 | Consume TASK-256-03 friendly panel labels and TASK-256-02 clear helpers; no duplicated misleading controls. |
| `core/widgets/core/tabs.tsx` | 432-505 | Adopt TASK-256-03 public placeholder gating and TASK-256-04 widget-local ARIA/ID helpers; do not define a second shared runtime pattern here. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | 272-430 | Consume TASK-256-03 friendly item labels and TASK-256-02 clear helpers; own only Accordion default-open/collapsible truthfulness in this leaf. |
| `core/widgets/core/accordion.tsx` | 361-368 and item render | Adopt TASK-256-03 public placeholder gating and TASK-256-04 ARIA/ID helpers; own only Accordion chevron/expanded semantics and default-open/collapsible runtime behavior in this leaf. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | 102-114, 209-219, 262-302, editor sections | Consume TASK-256-03 friendly pane labels and TASK-256-02 helper/color clear helpers; remaining mode ownership cleanup only. |
| `core/widgets/core/toggleBlock.tsx` | 91-104, 298-389 | Consume TASK-256-02 helper visibility, TASK-256-03 public placeholder gating, and TASK-256-04 ID/ARIA helpers; no second shared contract. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | existing suite | Add slot-label and clear-control regressions. |
| `tests/vitest/widgets/tabs.test.tsx` | existing suite | Add placeholder/ID/ARIA regressions. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | existing suite | Add item-label/default-open/clear regressions. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | existing suite | Add placeholder/default-open/ARIA regressions. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | existing suite | Add pane-label, helper-clear, and color-clear regressions. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | existing suite | Add helper visibility, placeholder/ID/ARIA regressions. |

## Implementation Pseudocode

```tsx
function createPanelLabel(index: number, title: string | undefined) {
  const trimmed = title?.trim();
  return trimmed ? `Panel ${index + 1}: ${trimmed}` : `Panel ${index + 1}`;
}

function renderAccordionPanel(
  panel: AccordionPanel,
  context: WidgetRenderContext,
  blockId: string
) {
  const instanceId = createWidgetInstanceId("accordion", blockId, panel.id);
  const summaryId = scopedId(instanceId, `summary-${panel.id}`);
  const contentId = scopedId(instanceId, `content-${panel.id}`);

  return (
    <details open={panel.defaultOpen}>
      <summary id={summaryId} aria-controls={contentId}>
        {panel.title}
      </summary>
      <div id={contentId} aria-labelledby={summaryId}>
        {renderSlotOrPreviewPlaceholder(panel.slotId, context)}
      </div>
    </details>
  );
}
```

Error handling:

- Missing panel titles fall back to user-facing numbering, not technical slot IDs.
- Placeholder helper defaults to public `null` when render context is missing.
- Accordion data that references invalid default-open indices is clamped through
  the accordion normalizer.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: no duplicate DOM IDs, unsafe inline scripts, or public admin copy.
- Secret handling: no secrets in DOM IDs, dataset attributes, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- Run duplicate-ID assertions from TASK-256-04 when renderers change.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.
- Run `bun run gates:coderso` for the completed implementation leaf.
- Run `bun run scan:security:strict`.
- Run `bun run precommit` before any manual commit or task closure commit.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md`,
  `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md`, and
  `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md`.
- Update `_docs/_WIDGETS/TABS.md`, `_docs/_WIDGETS/ACCORDION.md`, and
  `_docs/_WIDGETS/TOGGLE_BLOCK.md` when behavior changes.
- Update `_docs/WIDGETS.md` only if shared interactive/placeholder contracts
  change.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Editors no longer expose technical slot IDs as user-facing copy.
- Public runtime has no admin placeholder text for empty interactive slots.
- Accordion default-open/collapsible controls match runtime behavior.
- Tabs, accordion, and toggle block keep instance-safe IDs and accessible
  relationships.
