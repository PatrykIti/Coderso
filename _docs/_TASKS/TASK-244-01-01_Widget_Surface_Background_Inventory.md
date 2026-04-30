# TASK-244-01-01: Widget Surface Background Inventory

# FileName: TASK-244-01-01_Widget_Surface_Background_Inventory.md

**Priority:** High
**Category:** Widgets + Inventory
**Estimated Effort:** Medium
**Dependencies:** TASK-244-01
**Status:** To Do

---

## Overview

Create the execution inventory for all widget backgrounds, gradients, overlays,
and visual surfaces that cannot currently be cleared in a product-facing way.
Use current code as the source of truth.

## Sub-Tasks

- None. This is an execution leaf.

## Inventory Owners

| Owner group | Files to inspect |
|---|---|
| Core definitions | `core/widgets/core/*.tsx` |
| Admin editors | `core/admin/ui/widgets/editors/*.tsx` |
| UI tests | `tests/vitest/ui/*editor-wave.test.tsx` |
| Widget render tests | `tests/vitest/widgets/*.test.tsx`; existing `tests/unit/widgets/*.test.tsx` only where current coverage already lives |
| Docs | `_docs/WIDGETS.md`, `_docs/_WIDGETS/*.md` |

## Required Classification

Each finding must be classified as one of:

- `clear-required`: rendered public/widget output forces a gradient, background,
  overlay, card surface, or framed shell and no clear affordance exists;
- `already-clearable`: user can already remove the visual surface without
  storing a fake `transparent` sentinel;
- `intentional-state`: state color is part of validation, empty, warning,
  success, destructive, stock, or lifecycle semantics and is not a style surface;
- `exclude-admin-only`: admin chrome, preview thumbnail, library card, skeleton,
  or drawer styling that is not rendered widget output.

## Initial Findings

Refresh line references before implementation. The seed list below is based on
the 2026-04-30 scan.

| Widget | Current problem | Owner |
|---|---|---|
| `hero` | `background.gradient` renders when set, but editor `GradientField` has no clear control; background color and media overlay also need clear affordances | TASK-244-02-01 |
| `section` | runtime already omits gradients when endpoints are empty; needs only shared helper/no-regression coverage if touched | TASK-244-02-02 |
| `screen-record-header` | `card` variant hard-codes `bg-gradient-to-br from-background via-background to-muted/30`; compact hard-codes `bg-background/70` | TASK-244-03-01 |
| `screen-field-group` | `subtle` and default variants hard-code `bg-muted/20` / `bg-background/80` frame surfaces | TASK-244-03-01 |
| `screen-field-value` | inline and stacked variants hard-code `bg-background/60` / `bg-background/70` | TASK-244-03-01 |
| `screen-two-column` | columns and empty drop areas hard-code `bg-background/60` / `bg-background/50` | TASK-244-03-01 |
| `booking-calendar` | root frame hard-codes `bg-[var(--color-bg)]/95` and primary action background is not clearable | TASK-244-03-02 |
| `appointment-form` | root frame and selected-slot panel hard-code `bg-[var(--color-bg)]/95` / `/70` | TASK-244-03-02 |
| `listing-filters` | filter shell hard-codes `bg-[var(--color-bg)]/80`; action background is not style-clearable | TASK-244-03-02 |
| `search-box` | listing/global search shells hard-code `bg-[var(--color-bg)]/80`; action background is not style-clearable | TASK-244-03-02 |
| `product-gallery` | product cards and empty states force `bg-[var(--color-bg)]` / `/70`; minimal card still forces a background | TASK-244-03-02 |
| `product-table` | table wrapper and header force `bg-[var(--color-bg)]` / `/80` | TASK-244-03-02 |
| `product-compare` | table wrapper, header, and empty state force `bg-[var(--color-bg)]` / `/80` | TASK-244-03-02 |
| `gallery-mosaic` | caption overlay defaults to `rgba(15, 23, 42, 0.35)`; editor has raw/color input but no clear action | TASK-244-04-01 |
| `feature-grid` | `surfaceColor` defaults to `var(--color-bg)` and card backgrounds cannot be cleared semantically | TASK-244-04-01 |
| `faq-accordion` | `surface` defaults to `var(--color-bg)` for panels without clear semantics | TASK-244-04-01 |
| `pricing-plans` | `cardSurface`, highlighted badge/ring backgrounds, and table surface need clear affordances where style-owned | TASK-244-04-01 |
| `testimonials` | `cardSurface` defaults to `var(--color-bg)` and cannot be cleared semantically | TASK-244-04-01 |
| `team` | `cardSurface` defaults to `var(--color-bg)` and cannot be cleared semantically | TASK-244-04-01 |
| `stats-kpi` | card surfaces force `bg-[var(--color-bg)]` classes | TASK-244-04-01 |
| `content-list` | card `backgroundColor` defaults to `var(--color-bg)`; minimal style is the only implicit escape hatch | TASK-244-04-01 |
| `posts-feed` | maps to content-list background defaults and inherits the same surface problem | TASK-244-04-01 |
| `entry-teaser` | `surface` defaults to `var(--color-bg)` and cannot be cleared semantically | TASK-244-04-01 |
| `cta-banner` | container `background`, badge, and button backgrounds have color fields but no clear affordance | TASK-244-04-01 |
| `logo-cloud` | logo tiles force `bg-[var(--color-bg)]` with no clearable tile surface | TASK-244-04-01 |
| `rich-text-section` | `background` can be set but needs clear affordance and no transparent sentinel | TASK-244-04-01 |
| `timeline` | background is optional, but marker/line/card surfaces need audit before adding clear controls | TASK-244-04-01 |
| `compare-timeline` | highlight/marker/background values need clear audit and output omission tests | TASK-244-04-01 |
| `contact` | root `background` and card `surfaceColor` have raw fields but no clear affordance | TASK-244-04-02 |
| `newsletter` | root `background` has no clear affordance | TASK-244-04-02 |
| `form-embed` | root `background`, surface, button backgrounds, and inputs need clear semantics | TASK-244-04-02 |
| `navigation` | shell surface can be transparent through behavior, but CTA/background style fields need clear semantics | TASK-244-04-02 |
| `footer` | footer surface/background style needs clear affordance and output omission tests | TASK-244-04-02 |
| `accordion` | `surfaceColor` defaults to `var(--color-surface)` and is not clearable | TASK-244-04-02 |
| `tabs` | surface, active background, and panel background defaults are not clearable | TASK-244-04-02 |
| `toggle-block` | surface/accent backgrounds are not clearable | TASK-244-04-02 |

## Explicit Exclusions

Do not promote these to implementation unless a leaf verifies they are product
surface bugs:

- admin-only widget library cards, previews, drawers, and skeletons;
- empty/error/success/destructive/warning state colors;
- form validation and status message colors;
- media placeholder backgrounds shown only when content is missing;
- `section` gradient runtime, because empty endpoints already remove the
  gradient;
- TASK-242 token controls such as spacing, width, radius, typography, and size.

## Pseudocode

Use a simple scanner during implementation review.

```sh
rg -n "gradient|backgroundImage|background(Color)?|bg-gradient|bg-\\[var\\(--color|bg-background|bg-muted|overlay|surface" core/widgets/core
rg -n "Background|Surface|Overlay|ColorField|GradientField|Clear" core/admin/ui/widgets/editors
```

Then map every finding to exactly one leaf owner. Do not leave a broad
"composite widgets" bucket without naming the runtime and editor files.

## Testing Requirements

- Documentation-only validation:
  - `git diff --check`
- No runtime tests are required in this inventory leaf unless it is implemented
  together with code changes.

## Documentation Updates Required

- This inventory file.
- `_docs/_TASKS/README.md` status only when this leaf moves state.

## Acceptance Criteria

1. Inventory covers every widget listed in `createCoreWidgetDefinitions`.
2. Every finding has one classification and one owner leaf.
3. Exclusions are explicit and not used to hide real user-facing surfaces.
4. Current test owners are listed before implementation begins.
