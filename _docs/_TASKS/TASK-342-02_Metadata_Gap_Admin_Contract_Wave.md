# TASK-342-02: Metadata-Gap Admin Contract Wave

# FileName: TASK-342-02_Metadata_Gap_Admin_Contract_Wave.md

**Priority:** High
**Category:** Widgets + Admin UI + Playwright + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-342-01
**Status:** In Progress (2026-05-28)

---

## Overview

Close the four metadata-gap widgets from the 2026-05-27 report wave:

- `pricing-plans`
- `faq-accordion`
- `cta-banner`
- `contact`

These widgets are not failing because the public runtime is broken. They are
failing because strict Playwright ownership metadata does not fully match the
real Visual controls rendered in the editor.

## Source Findings

- `_docs/PLAYWRIGHT/27-05-2026/REPORT_PRICING_PLANS_WIDGET.md`
- `_docs/PLAYWRIGHT/27-05-2026/REPORT_FAQ_ACCORDION_WIDGET.md`
- `_docs/PLAYWRIGHT/27-05-2026/REPORT_CTA_BANNER_WIDGET.md`
- `_docs/PLAYWRIGHT/27-05-2026/REPORT_CONTACT_WIDGET.md`

All four reports agree on the same high-level behavior:

- admin editor root loads
- Visual/Advanced sections are visible
- public route returns `200`
- the failure is limited to `data-widget-control-path` coverage on specific
  Visual controls

## Shared Wave Boundary

In scope:

- Visual control ownership metadata
- widget-local editor wrappers
- shared editor-control helpers only if the safest fix is to unify local
  wrappers into a path-aware shared seam
- targeted Vitest editor-wave coverage
- targeted Playwright admin rerun for the touched widget

Out of scope:

- broad UI redesign
- runtime renderer feature changes unless the metadata fix unexpectedly
  reveals a real functional regression
- commerce fixture/public content work

## Gate Rule

`TASK-342-02` is a gating subtask, not a passive umbrella note.

- It must record the shared-vs-local decision for the metadata wave before
  `TASK-342-02-01`, `TASK-342-02-03`, or `TASK-342-02-04` move to
  implementation.
- If a shared helper extraction is chosen, this task must pin that decision in
  the family docs before the widget leaves start landing commits.
- `faq-accordion` may still remain widget-local even if the other three widgets
  converge on a shared color-control seam.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Add truthful persisted-path ownership for the flagged Visual controls. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Add truthful persisted-path ownership for the flagged Visual controls. |
| `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` | Add truthful persisted-path ownership for the flagged Visual controls. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add truthful persisted-path ownership for the flagged Visual controls. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if local wrappers should be collapsed into the shared path-aware color-control seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if shared swatch-summary behavior must be refactored to avoid repeated widget-local wrappers. |
| `core/admin/ui/widgets/editors/WidgetEditorControls.tsx` | Touch only if the `WidgetControlRow` contract itself needs a shared path helper. |
| `tests/vitest/ui/*editor-wave*.test.tsx` | Add or tighten path-ownership assertions in the affected widget editor suites. |
| `tests/vitest/widgets/*.test.tsx` | Keep widget-local contract/runtime behavior green if editor metadata refactors change component wiring. |

## Sub-Tasks

- [ ] TASK-342-02-01: Pricing Plans Visual Control Path Ownership
- [ ] TASK-342-02-02: FAQ Accordion Visual Control Path Ownership
- [ ] TASK-342-02-03: CTA Banner Visual Control Path Ownership
- [ ] TASK-342-02-04: Contact Visual Control Path Ownership

## Implementation Order

1. Complete this gate task first:
   - confirm whether `pricing-plans`, `cta-banner`, and `contact` should share a
     path-aware color-control repair seam
   - record the exact owner files and test updates for that choice
2. Land `pricing-plans`, `cta-banner`, and `contact` only after the gate above
   is explicitly recorded in this task.
3. Land `faq-accordion` after the shared decision above, because it is mostly a
   `WidgetControlRow path` repair rather than a full color-wrapper drift.
4. Re-run targeted admin smoke for each widget after its leaf lands.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites named by each leaf
- targeted `playwright-cli` admin replay for each touched widget

## Documentation Updates Required

- Update the affected 27-05 per-widget report(s) when a metadata-gap leaf
  closes or is superseded.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- The metadata wave records an explicit shared-vs-local repair decision before
  the widget leaves start implementation.
- Each of the four widgets finishes with `metadata-gap` removed in targeted
  rerun evidence.
- No leaf fixes the smoke result by weakening the ownership contract or hiding
  real controls from the metadata scan.
- Public runtime behavior remains unchanged unless a real regression is proven.

## Progress Notes

- 2026-05-28: shared-vs-local decision recorded for the current tree:
  - `pricing-plans`, `cta-banner`, and `contact` were repaired by adding
    truthful `path` ownership to the existing widget-local color/control
    wrappers instead of extracting a new shared helper first.
  - `faq-accordion` was repaired widget-locally by adding explicit `path`
    ownership to the remaining radius and border-width rows.
  - The branch did not need to touch `SharedColorControl.tsx`,
    `ClearableFields.tsx`, or `WidgetEditorControls.tsx` for the first fix.
  - Targeted widget smoke reruns after the patch produced `metadataGaps=0` for
    `pricing-plans`, `faq-accordion`, `cta-banner`, and `contact`.
