# TASK-252: Widget Configuration IA and Pages Widget Expansion

# FileName: TASK-252_Widget_Configuration_IA_and_Pages_Widget_Expansion.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-220, TASK-242, TASK-244
**Status:** In Progress
**Started:** 2026-05-10

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
  widget or provide chronology-oriented modes; scroll/reveal behavior remains
  Adapt-only until the dedicated implementation moves schema, render, editor,
  reduced-motion fallback, and tests together;
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

## Per-Widget Leaf Map

Use these physical execution leaves instead of broad batch edits. Each leaf owns one widget surface and must keep schema, defaults, normalizer, render, editor, tests, and docs together when the data model changes.

### Hero and Timeline

- `TASK-252-03-01` - `hero`: Hero Badge Announcement and Editor IA.
- `TASK-252-04-01` - `timeline`: Timeline Chronology Modes and Editor IA.

### Layout and Structural

- `TASK-252-05-01` - `section`: Section Regions Semantics and Spacing.
- `TASK-252-05-02` - `template-section`: Template Section Metadata Preview and Sync.
- `TASK-252-05-03` - `grid-columns`: Grid Columns Presets Gaps and Mobile Stack.
- `TASK-252-05-04` - `split-layout`: Split Layout Slot Order and Mobile Stack.
- `TASK-252-05-05` - `stack`: Stack Direction Gap Alignment and Responsive Flow.
- `TASK-252-05-06` - `spacer`: Spacer Size Tokens Custom Height and Canvas Affordance.
- `TASK-252-05-07` - `divider`: Divider Orientation Style Tone and Label.
- `TASK-252-05-08` - `tabs`: Tabs Accessible Panels Default Tab and Surface.
- `TASK-252-05-09` - `accordion`: Accordion Disclosure Default Open and Accessibility.
- `TASK-252-05-10` - `toggle-block`: Toggle Block State Switch and Accessible Content Swap.

### Content and Marketing

- `TASK-252-06-01` - `feature-grid`: Feature Grid Icon Cards Rows and Links.
- `TASK-252-06-02` - `testimonials`: Testimonials Grid Spotlight Rating and Attribution.
- `TASK-252-06-03` - `pricing-plans`: Pricing Plans Tiers Toggle and Comparison Mode.
- `TASK-252-06-04` - `faq-accordion`: FAQ Accordion Support CTA Icon Placement and Defaults.
- `TASK-252-06-05` - `cta-banner`: CTA Banner Compact Split Badge and Icon.
- `TASK-252-06-06` - `logo-cloud`: Logo Cloud Grid Tone Rows and Accessibility.
- `TASK-252-06-07` - `gallery-mosaic`: Gallery Mosaic Layout Captions and Alt Text.
- `TASK-252-06-08` - `stats-kpi`: Stats KPI Values Icons and Display Modes.
- `TASK-252-06-09` - `team`: Team Members Photo Shape Socials and Spotlight.
- `TASK-252-06-10` - `rich-text-section`: Rich Text Section Prose Presets Width Badge and CTA.
- `TASK-252-06-11` - `compare-timeline`: Compare Timeline Two Track Segments Status and Highlight.

### Dynamic and Operational

- `TASK-252-07-01` - `content-list`: Content List Source Display Field Visibility and Empty States.
- `TASK-252-07-02` - `posts-feed`: Posts Feed Source Density Author Date and Category.
- `TASK-252-07-03` - `entry-teaser`: Entry Teaser Selected Entry Fallback and Field Toggles.
- `TASK-252-07-04` - `product-gallery`: Product Gallery Source Media Modes Thumbnails and Empty State.
- `TASK-252-07-05` - `product-compare`: Product Compare Selected Products Attributes and Highlight.
- `TASK-252-07-06` - `product-table`: Product Table Columns Sort Filter and Pagination.
- `TASK-252-07-07` - `listing-filters`: Listing Filters Facets Ranges Apply and Reset.
- `TASK-252-07-08` - `search-box`: Search Box Copy Target Route Query Param and Display Mode.
- `TASK-252-07-09` - `newsletter`: Newsletter Fields Consent Copy and States.
- `TASK-252-07-10` - `booking-calendar`: Booking Calendar Provider Event Modes and Availability.
- `TASK-252-07-11` - `appointment-form`: Appointment Form Fields Validation Copy and States.
- `TASK-252-07-12` - `form-embed`: Form Embed Form Picker Fields and Raw Embed Rejection.
- `TASK-252-07-13` - `contact`: Contact Form Info State Copy and Security Boundaries.
- `TASK-252-07-14` - `navigation`: Navigation Source Links Mobile Menu and CTA.
- `TASK-252-07-15` - `footer`: Footer Columns Brand Legal and Social Links.

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
- [x] TASK-252-02: Widget Research Archive and Variant Model
- [ ] TASK-252-03: Hero Editor Mode and Badge Expansion
  - [ ] TASK-252-03-01: Hero Badge Announcement and Editor IA
- [ ] TASK-252-04: Timeline Chronology and Editor IA
  - [ ] TASK-252-04-01: Timeline Chronology Modes and Editor IA
- [ ] TASK-252-05: Layout and Structural Widget Editor Parity
  - [ ] TASK-252-05-01: Section Regions Semantics and Spacing
  - [ ] TASK-252-05-02: Template Section Metadata Preview and Sync
  - [ ] TASK-252-05-03: Grid Columns Presets Gaps and Mobile Stack
  - [ ] TASK-252-05-04: Split Layout Slot Order and Mobile Stack
  - [ ] TASK-252-05-05: Stack Direction Gap Alignment and Responsive Flow
  - [ ] TASK-252-05-06: Spacer Size Tokens Custom Height and Canvas Affordance
  - [ ] TASK-252-05-07: Divider Orientation Style Tone and Label
  - [ ] TASK-252-05-08: Tabs Accessible Panels Default Tab and Surface
  - [ ] TASK-252-05-09: Accordion Disclosure Default Open and Accessibility
  - [ ] TASK-252-05-10: Toggle Block State Switch and Accessible Content Swap
- [ ] TASK-252-06: Content and Marketing Widget Editor Expansion
  - [ ] TASK-252-06-01: Feature Grid Icon Cards Rows and Links
  - [ ] TASK-252-06-02: Testimonials Grid Spotlight Rating and Attribution
  - [ ] TASK-252-06-03: Pricing Plans Tiers Toggle and Comparison Mode
  - [ ] TASK-252-06-04: FAQ Accordion Support CTA Icon Placement and Defaults
  - [ ] TASK-252-06-05: CTA Banner Compact Split Badge and Icon
  - [ ] TASK-252-06-06: Logo Cloud Grid Tone Rows and Accessibility
  - [ ] TASK-252-06-07: Gallery Mosaic Layout Captions and Alt Text
  - [ ] TASK-252-06-08: Stats KPI Values Icons and Display Modes
  - [ ] TASK-252-06-09: Team Members Photo Shape Socials and Spotlight
  - [ ] TASK-252-06-10: Rich Text Section Prose Presets Width Badge and CTA
  - [ ] TASK-252-06-11: Compare Timeline Two Track Segments Status and Highlight
- [ ] TASK-252-07: Dynamic and Operational Widget Editor Expansion
  - [ ] TASK-252-07-01: Content List Source Display Field Visibility and Empty States
  - [ ] TASK-252-07-02: Posts Feed Source Density Author Date and Category
  - [ ] TASK-252-07-03: Entry Teaser Selected Entry Fallback and Field Toggles
  - [ ] TASK-252-07-04: Product Gallery Source Media Modes Thumbnails and Empty State
  - [ ] TASK-252-07-05: Product Compare Selected Products Attributes and Highlight
  - [ ] TASK-252-07-06: Product Table Columns Sort Filter and Pagination
  - [ ] TASK-252-07-07: Listing Filters Facets Ranges Apply and Reset
  - [ ] TASK-252-07-08: Search Box Copy Target Route Query Param and Display Mode
  - [ ] TASK-252-07-09: Newsletter Fields Consent Copy and States
  - [ ] TASK-252-07-10: Booking Calendar Provider Event Modes and Availability
  - [ ] TASK-252-07-11: Appointment Form Fields Validation Copy and States
  - [ ] TASK-252-07-12: Form Embed Form Picker Fields and Raw Embed Rejection
  - [ ] TASK-252-07-13: Contact Form Info State Copy and Security Boundaries
  - [ ] TASK-252-07-14: Navigation Source Links Mobile Menu and CTA
  - [ ] TASK-252-07-15: Footer Columns Brand Legal and Social Links
- [ ] TASK-252-08: QA, Docs, Changelog, and Board Closure

## Implementation Order

1. Finish TASK-252-01 so the shared inspector IA, info icon pattern, control
   metadata, and slot-control placement are stable before per-widget edits.
2. Treat TASK-252-02 as the completed research archive and use each
   `_docs/_WIDGETS/tmp/<widget>/MATRIX.md` as the binding Keep/Adapt/Reject
   source for the matching leaf.
3. Implement `TASK-252-03-01` and `TASK-252-04-01` first because Hero and
   Timeline are the most visible and contain explicit product gaps.
4. Complete layout/structural leaves `TASK-252-05-01` through `TASK-252-05-10`,
   then marketing/content leaves `TASK-252-06-01` through `TASK-252-06-11`,
   then dynamic/operational leaves `TASK-252-07-01` through `TASK-252-07-15`.
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
  - presentational/external form widgets must not be described as already
    nonce/HMAC protected unless they use a Coderso-owned public-write endpoint;
  - any TASK-252-07 leaf that adds or changes a Coderso-owned public-write
    endpoint must keep the endpoint-specific nonce + signature/HMAC owner
    (`core/services/booking/bookingSubmissionNonce.ts` for booking/
    appointment reservations, `core/services/forms/submissionNonce.ts` for
    forms), optional reCAPTCHA policy, existing public rate-limit buckets,
    strict reject-unknown validation, and endpoint/security tests.
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
  - `bun test tests/unit/widgets/registry.test.ts`
  - `bun test tests/unit/widgets/runtimeRegistry.test.ts`
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun test tests/unit/widgets/modulePackMatrix.test.ts`
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
- Timeline supports true timeline modes and date-capable steps; scroll/reveal
  behavior is present only when the Adapt slice is explicitly implemented with
  reduced-motion-safe tests.
- Every Pages-publishable widget has a research-backed editor IA and contract.
- Missing `_docs/_WIDGETS` pages are created for the ten uncovered widgets.
- Playwright CLI can identify controls by accessible name or stable
  `data-widget-*` metadata.
