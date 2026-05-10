# TASK-252: Widget Configuration IA and Pages Widget Expansion

# FileName: TASK-252_Widget_Configuration_IA_and_Pages_Widget_Expansion.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-220, TASK-242, TASK-244
**Status:** To Do

---

## Overview

Restructure the widget configuration experience for Pages so editors can manage
powerful widgets without fighting a crowded right-side panel.

The current model is directionally correct: every widget has `Wizard`, `Visual`,
and `Advanced` modes. The product issue is the information architecture inside
those modes and around the right inspector:

- helper copy currently takes vertical space above the real controls;
- slot controls for widgets such as `section` live above the tabs even though
  they are widget structure controls;
- several widgets expose useful options but group them inconsistently;
- `section` is the clearest current model because options are grouped into
  readable sections and controls are mostly one line at a time;
- `hero` is powerful but too dense in a few large sections and needs a badge
  surface;
- `timeline` has enough controls but does not yet feel like a true timeline
  widget or provide scroll/chronology-oriented modes;
- Playwright CLI and automated agents need stable accessible labels and HTML
  metadata for each visible control.

TASK-252 is a planning and implementation umbrella. It must keep the existing
widget contract (`schema`, `defaults`, `normalize*`, render, wizard, visual,
advanced, tests, docs) and improve the IA in place rather than adding parallel
widget types.

## Business Requirements

- Keep `Wizard / Visual / Advanced` as the product model, but define final mode
  ownership:
  - `Wizard`: first-run setup, beginner choices, safe presets.
  - `Visual`: daily editing, content, variant/mode, media, typography, colors,
    structure controls that users naturally expect.
  - `Advanced`: technical layout, responsive behavior, raw diagnostics, and
    rare expert fields without duplicating core content controls.
- Replace top-of-panel instructional cards with compact information icons using
  the existing shadcn/radix tooltip stack and lucide icon package. The final
  icon should be an information affordance, not a persistent text block.
- Move widget-specific structural controls such as repeatable section slots into
  an appropriate `Visual` or `Advanced` section. The right inspector top area
  should stay compact so the controls list is visible.
- Standardize per-widget option grouping around reusable editor primitives:
  `WidgetEditorSection`, `WidgetControlRow`, `WidgetControlLabel`,
  `WidgetInfoTip`, `WidgetRepeatableSlotControls`, and clearable color/media
  field helpers when they remove real duplication.
- Add explicit accessibility and automation metadata to editor controls:
  accessible names, `aria-describedby` for helper text, stable
  `data-widget-editor`, `data-widget-editor-mode`, and
  `data-widget-control` attributes where roles/names are not enough.
- Treat every widget publishable on Pages as a product surface. Do not expand
  one widget by copying another widget's data model blindly; each editor must
  expose flexible options that match its real runtime purpose.
- Research proven React/Tailwind widget/block libraries, but do not vendor
  third-party code unless the license permits it and the copied source is
  tracked with license metadata. Premium/proprietary examples are UX references
  only.
- Treat research as required input for every Pages-publishable widget, including
  simple structural widgets. Each widget must have a `_docs/_WIDGETS/tmp/<widget>/`
  archive with at least ten credible external patterns or a documented
  `SHORTFALL.md` explaining why fewer than ten useful public references exist.
  The final editor field list must cite this research and choose only options
  that are useful, adequate, and logical for Coderso.

## Current Owner Map

- Page editor shell and panel orchestration:
  - `core/admin/ui/layouts/EditorShell.tsx`
  - `core/admin/ui/pages/PageEditor.tsx`
  - `core/admin/ui/pages/builder/BlockSettings.tsx`
  - `core/admin/ui/pages/builder/WizardPanel.tsx`
  - `core/admin/ui/pages/builder/VisualPanel.tsx`
  - `core/admin/ui/pages/builder/AdvancedPanel.tsx`
- Widget editor registry and shared editor helpers:
  - `core/admin/ui/widgets/registry.ts`
  - `core/admin/ui/widgets/editors/*.tsx`
  - `core/admin/ui/widgets/editors/ClearableFields.tsx`
  - new shared editor helper files only if they reduce real duplication.
- Widget contract and runtime:
  - `core/widgets/types.ts`
  - `core/widgets/registry.ts`
  - `core/widgets/core/index.ts`
  - `core/widgets/core/*.tsx`
  - `core/widgets/renderers/widgetRenderer.tsx`
  - `core/widgets/validator.ts`
- Widget docs:
  - `_docs/WIDGETS.md`
  - `_docs/_WIDGETS/README.md`
  - `_docs/_WIDGETS/*.md`
  - `_docs/_WIDGETS/tmp/**` for research evidence created by TASK-252-02.

## Pages Widget Inventory

Current Pages-publishable widget types are the default `page-builder` /
`widget-library` surfaces from `core/widgets/core/index.ts` and
`core/widgets/registry.ts`, excluding screen-only widgets.

- Layout and structural: `section`, `template-section`, `grid-columns`,
  `split-layout`, `tabs`, `accordion`, `toggle-block`, `spacer`, `divider`,
  `stack`.
- Marketing/content: `hero`, `feature-grid`, `testimonials`, `pricing-plans`,
  `faq-accordion`, `cta-banner`, `logo-cloud`, `gallery-mosaic`, `stats-kpi`,
  `team`, `rich-text-section`, `timeline`, `compare-timeline`.
- Dynamic/operational: `content-list`, `posts-feed`, `entry-teaser`,
  `product-gallery`, `product-compare`, `product-table`, `listing-filters`,
  `search-box`, `newsletter`, `booking-calendar`, `appointment-form`,
  `form-embed`, `contact`, `navigation`, `footer`.

Missing `_docs/_WIDGETS` contract docs must be closed as part of this program
for: `tabs`, `accordion`, `toggle-block`, `product-gallery`,
`product-compare`, `product-table`, `listing-filters`, `search-box`,
`booking-calendar`, and `appointment-form`.

## Research Sources To Evaluate

Use these as current research seeds, not as unlicensed source imports:

- `https://flowbite-react.com/docs/components/timeline`
- `https://flowbite.com/docs/components/timeline/`
- `https://mui.com/material-ui/react-timeline/`
- `https://chakra-ui.com/docs/components/timeline`
- `https://ui.aceternity.com/components/timeline`
- `https://www.shadcn.io/blocks`
- `https://www.shadcn.io/blocks/hero-timeline`
- `https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes`
- `https://frameium.com/`
- `https://www.uilib.co/`
- `https://www.layoutblocks.dev/docs/introduction`
- `https://ruixen.com/`
- `https://reui.io/`

## Sub-Tasks

- [ ] TASK-252-01: Widget Inspector IA and Shared Option Architecture
- [ ] TASK-252-02: Widget Research Archive and Variant Model
- [ ] TASK-252-03: Hero Editor Mode and Badge Expansion
- [ ] TASK-252-04: Timeline Editor Motion and Chronology Expansion
- [ ] TASK-252-05: Layout and Structural Widget Editor Parity
- [ ] TASK-252-06: Content and Marketing Widget Editor Expansion
- [ ] TASK-252-07: Dynamic and Operational Widget Editor Expansion
- [ ] TASK-252-08: QA, Docs, Changelog, and Board Closure

## Implementation Order

1. Finish TASK-252-01 so the shared inspector IA, info icon pattern, control
   metadata, and slot-control placement are stable before per-widget edits.
2. Finish TASK-252-02 enough to produce a research matrix for every
   Pages-publishable widget before per-widget schema/editor expansion is
   finalized.
3. Implement Hero and Timeline first because they are the most visible and
   contain the explicit product gaps.
4. Apply the shared IA to layout/structural widgets, then marketing/content,
   then dynamic/operational widgets.
5. Close missing widget docs and run the validation matrix in TASK-252-08.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered widget output remains public page/runtime output.
- Auth model:
  - no new public endpoint is introduced by the umbrella;
  - widget edits continue through existing authenticated admin page/template
    save flows.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin CSRF handling for page/template writes.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - every widget schema changed by this program must keep strict validation and
    normalize unknown/legacy fields through the widget owner module.
- Anti-abuse:
  - no public write surface is added by the shared editor IA;
  - widgets that already submit public forms or booking requests must preserve
    existing nonce/captcha/rate-limit contracts if their runtime contract is
    touched by TASK-252-07.
- Third-party research:
  - do not copy third-party code into `_docs/_WIDGETS/tmp/**` or runtime source
    unless the license permits it and the source/license are recorded.

## Testing Requirements

- Always run after code changes:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Shared editor IA:
  - `tests/vitest/ui/page-editor.test.tsx`
  - `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - `tests/vitest/ui/widget-editors-wave-1.test.tsx`
  - focused `tests/vitest/ui/*-editor-wave.test.tsx` suites for touched
    widgets.
- Widget runtime/normalizer:
  - `tests/vitest/widgets/<widget>.test.tsx` for each touched widget.
  - `tests/vitest/widgets/styleNoneTokens.test.tsx` when token/clear adjacency
    is affected.
  - `tests/vitest/widgets/renderer.test.tsx` when renderer/slot output changes.
- Registry/contract:
  - `tests/unit/widgets/registry.test.ts`
  - `tests/unit/widgets/runtimeRegistry.test.ts`
  - `tests/unit/widgets/validator.test.ts`
  - `tests/unit/widgets/modulePackMatrix.test.ts`
- Dynamic/runtime widgets:
  - existing Bun-owned suites named in TASK-252-07 where content, posts,
    commerce, booking, forms, listing, or search runtime behavior is touched.
- Run `bun run gates:coderso` during final closure or record why it cannot run.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- `_docs/_WIDGETS/*.md` for each changed widget.
- `_docs/_WIDGETS/tmp/<widget>/**` research folders for every
  Pages-publishable widget, including Keep/Adapt/Reject decisions that justify
  the final option set.
- New `_docs/_WIDGETS/*.md` files for the ten Pages widgets that currently lack
  contract docs.
- `_docs/_WIDGETS/tmp/**` research archive only after TASK-252-02 performs the
  license-safe research pass.
- `_docs/_TASKS/TASK-252*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a new changelog entry when the implementation
  is completed.

## Acceptance Criteria

- The right widget inspector uses compact info icons and stable control metadata
  instead of persistent top-of-panel instructional cards.
- Slot controls are placed inside the relevant editor mode/section and do not
  consume the permanent top area of the right panel.
- Hero supports a badge/announcement surface and exposes it through schema,
  defaults, normalizer, renderer, editor, tests, and docs.
- Timeline supports true timeline modes, date-capable steps, and an accessible
  scroll/reveal behavior with reduced-motion support.
- Every Pages-publishable widget has a research-backed editor IA and contract.
- Missing `_docs/_WIDGETS` pages are created for the ten uncovered widgets.
- Playwright CLI can identify controls by accessible name or stable
  `data-widget-*` metadata.
