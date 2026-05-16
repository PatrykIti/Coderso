# TASK-256: Widget Shared Contract Playwright Drift Repair

# FileName: TASK-256_Widget_Shared_Contract_Playwright_Drift_Repair.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI + Runtime Render + Playwright QA
**Estimated Effort:** Very Large
**Dependencies:** TASK-252, TASK-244, TASK-242
**Status:** To Do

---

## Overview

Repair shared widget-contract drift found in `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md`
after the TASK-252 widget expansion.

This is not a new widget program. It is a corrective umbrella for already
published widget surfaces that drifted from the shared contract documented in
`_docs/WIDGETS.md`:

- each widget keeps `Wizard`, `Visual`, and `Advanced` mode ownership;
- mode switches preserve the same widget data model and do not race or reset;
- `Clear` removes owner fields, while `none` remains an explicit token only for
  approved visual fields;
- nested content and slots stay editor-owned and do not leak editor placeholders
  into public runtime output;
- interactive runtime widgets generate instance-safe IDs and accessible state;
- every repaired widget has matching Vitest/Bun coverage and refreshed
  Playwright evidence.

## Business Requirements

- Fix shared-contract drifts before expanding additional widget options.
- Keep existing widget schemas backward compatible unless a leaf explicitly
  documents and tests a migration/normalizer path.
- Prefer shared helpers and owner modules over per-widget one-off patches.
- Do not add editor-only fallbacks to production renderers. If a value is valid
  only in editor preview, gate it through preview/editor context.
- Treat public widget output as a product surface: no admin-only placeholder
  copy, duplicate DOM IDs, misleading controls, missing ARIA labels, or inert
  interactive affordances.
- Keep all code comments and identifiers in English. Documentation may stay
  bilingual where it references Polish Playwright reports.

## Source Report Coverage

This umbrella covers all current reports under `_docs/PLAYWRIGHT/`:

- Layout/structural: `REPORT_SECTION_WIDGET.md`, `REPORT_GRID_COLUMNS_WIDGET.md`,
  `REPORT_SPLIT_LAYOUT_WIDGET.md`, `REPORT_STACK_WIDGET.md`,
  `REPORT_SPACER_WIDGET.md`, `REPORT_DIVIDER_WIDGET.md`,
  `REPORT_TABS_WIDGET.md`, `REPORT_ACCORDION_WIDGET.md`,
  `REPORT_TOGGLE_BLOCK_WIDGET.md`.
- Marketing/content: `REPORT_HERO_WIDGET.md`, `REPORT_TIMELINE_WIDGET.md`,
  `REPORT_FEATURE_GRID_WIDGET.md`, `REPORT_TESTIMONIALS_WIDGET.md`,
  `REPORT_PRICING_PLANS_WIDGET.md`, `REPORT_FAQ_ACCORDION_WIDGET.md`.
- Dynamic/operational: `REPORT_CONTENT_LIST_WIDGET.md`,
  `REPORT_NAVIGATION_WIDGET.md`.

## Shared Contract Baseline

- `_docs/WIDGETS.md:54-105` defines the required `Wizard`, `Visual`, and
  `Advanced` mode ownership, stable automation metadata, one-option-per-line
  inspector behavior, and slot/nested-content placement.
- `_docs/WIDGETS.md:185-205` defines valid `none` token usage and rejects
  `none` for structural choices such as variants, ratios, columns, statuses,
  and media type modes.
- `_docs/WIDGETS.md:207-227` defines `Clear` semantics as property removal,
  not serialized `transparent`/empty sentinels.

## Current Owner and Test Matrix

| Task | Drift evidence | Owner files and current line refs | Change/add code targets | Existing/new tests |
|---|---|---|---|---|
| TASK-256-01 | Timeline visual mode variant/data race (`REPORT_TIMELINE_WIDGET.md:145`), spacer Advanced fixed/responsive mismatch (`REPORT_SPACER_WIDGET.md:162-171`), divider dead Advanced variant select (`REPORT_DIVIDER_WIDGET.md:71-72`), split Advanced duplicates Visual (`REPORT_SPLIT_LAYOUT_WIDGET.md:180-182`) | `core/admin/ui/pages/builder/VisualPanel.tsx:94-99`; `core/admin/ui/pages/builder/WizardPanel.tsx:55-60`; `core/admin/ui/pages/builder/AdvancedPanel.tsx:43-48`; widget editors that own mode controls, especially `TimelineEditors.tsx`, `SpacerEditors.tsx:202-205`, `DividerEditors.tsx:118-149` | Add a shared atomic block update helper near `VisualPanel.tsx:94-99`; update editor-owned `onVariantChange` callsites to preserve current data; make Advanced controls either variant-aware or clearly read-only; remove inert no-op selects/buttons | Update `tests/vitest/pageBuilder/visualPanel.test.tsx`, `wizardPanel.test.tsx`, `advancedPanel.test.tsx`; update widget editor waves for timeline, spacer, divider, split-layout |
| TASK-256-02 | Duplicate `none`/`0` token UX (`REPORT_DIVIDER_WIDGET.md:96`, `REPORT_SPACER_WIDGET.md:150`, `REPORT_SPLIT_LAYOUT_WIDGET.md:121-125`), clear gaps (`REPORT_TABS_WIDGET.md:63`, `REPORT_ACCORDION_WIDGET.md:113`, `REPORT_CONTENT_LIST_WIDGET.md:81`, `REPORT_PRICING_PLANS_WIDGET.md:100-103`, `REPORT_FEATURE_GRID_WIDGET.md:275-276`) | `core/admin/ui/widgets/editors/ClearableFields.tsx:4-61`; `DividerEditors.tsx:61-69,179-217`; `SpacerEditors.tsx:46-52,157-197`; `TabsEditors.tsx:370-430`; `AccordionEditors.tsx:415-430`; `PricingPlansEditors.tsx:965-971`; `FeatureGridEditors.tsx:668-683` | Add shared clearable field behavior for default-preview vs configured-value state; make token pickers distinguish zero vs clearable off-state; add missing `onClear` paths; remove or re-label no-op `Custom px` rows | Update `tests/vitest/ui/clearable-fields.test.tsx`, `styleNoneTokens.test.tsx`, `clearableStyle.test.ts`, and affected widget editor/runtime tests |
| TASK-256-03 | Slot/config desync and public placeholders (`REPORT_GRID_COLUMNS_WIDGET.md:63,104,150-160,188-191`; `REPORT_SPLIT_LAYOUT_WIDGET.md:174-176,202`; `REPORT_TABS_WIDGET.md:91,96`; `REPORT_ACCORDION_WIDGET.md:106`; `REPORT_TOGGLE_BLOCK_WIDGET.md:124`) | `VisualPanel.tsx:101-162`; `GridColumnsEditors.tsx` repeatable column config; `TabsEditors.tsx:277-302`; `AccordionEditors.tsx:272-297`; public renderers `section.tsx:403-413`, `gridColumns.tsx:452-503`, `splitLayout.tsx:247-270`, `tabs.tsx:498-505`, `accordion.tsx:361-368`, `toggleBlock.tsx:357-384` | Add preview/editor-only placeholder gating; synchronize repeatable config counts with slot add/remove flows; replace technical slot-id copy with editor-friendly labels and stable metadata | Update `tests/vitest/pageBuilder/page-editor-slot-insert-flow.test.tsx`, `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`, affected widget editor waves, and widget runtime tests for no public placeholders |
| TASK-256-04 | Duplicate runtime IDs and global binding risks (`REPORT_TOGGLE_BLOCK_WIDGET.md:31,39,207`; `REPORT_TABS_WIDGET.md:168,287`), missing/incomplete ARIA across tabs/toggle/accordion/timeline/FAQ/pricing | `core/widgets/core/tabs.tsx:271-371,432-505`; `core/widgets/core/toggleBlock.tsx:141-250,298-389`; `core/widgets/core/faqAccordion.tsx:316-365`; `core/widgets/core/pricingPlans.tsx:682-727`; `core/widgets/core/timeline.tsx`; `core/widgets/core/accordion.tsx` | Generate instance-scoped root IDs and descendant IDs; bind scripts idempotently per root; add `aria-labelledby`, `aria-controls`, labels/captions, and keyboard tests where controls are interactive | Update `tests/vitest/widgets/tabs.test.tsx`, `toggleBlock.test.tsx`, `accordionWidget.test.tsx`, `faqAccordion.test.tsx`, `pricingPlans.test.tsx`, `timeline.test.tsx`; add focused DOM duplicate-ID assertions |
| TASK-256-05 | Structural widget issues: grid slot/config sync, split redundant slots/Advanced, stack pre-test option gaps, spacer fixed Advanced mismatch, divider no-op custom/Advanced, public empty placeholders | `core/widgets/core/gridColumns.tsx:452-503`; `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`; `SplitLayoutEditors.tsx`; `StackEditors.tsx`; `SpacerEditors.tsx:46-52,157-205`; `DividerEditors.tsx:61-69,179-217`; docs under `_docs/_WIDGETS/{GRID_COLUMNS,SPLIT_LAYOUT,STACK,SPACER,DIVIDER}.md` | Apply structural widget-specific fixes after shared helpers land; keep schema/default/normalizer/render/editor together for each widget | Update existing structural widget runtime tests and editor waves: grid-columns, split-layout, stack, spacer, divider |
| TASK-256-06 | Marketing/content widget issues: hero media/gradient/alt drift (`REPORT_HERO_WIDGET.md:126-159`), feature-grid columns/count drift (`REPORT_FEATURE_GRID_WIDGET.md:157-176,247-276`), testimonials slider/avatar/a11y gaps (`REPORT_TESTIMONIALS_WIDGET.md:72-160`), pricing plan-count/static toggle drift (`REPORT_PRICING_PLANS_WIDGET.md:88-117,241-244`), FAQ single-open/ARIA gaps (`REPORT_FAQ_ACCORDION_WIDGET.md:96,140-144,173-180`), timeline race/status/a11y (`REPORT_TIMELINE_WIDGET.md:145,170,192`) | `HeroEditors.tsx`, `hero.tsx`; `FeatureGridEditors.tsx:435-455,668-683`, `featureGrid.tsx:266-332`; `TestimonialsEditors.tsx`, `testimonials.tsx:38-42,155-158`; `PricingPlansEditors.tsx:596-615,965-971`, `pricingPlans.tsx:232-239,664-727`; `FaqAccordionEditors.tsx`, `faqAccordion.tsx:142-145,316-365`; `TimelineEditors.tsx`, `timeline.tsx` | Fix widget-specific contract bugs without widening into rejected feature expansion; if a report asks for a new major feature, document as separate future scope unless it is required to repair a broken existing control | Update existing marketing widget runtime/editor waves; add security/accessibility assertions for external links, image alt/lazy loading, table semantics, and billing/toggle interactions |
| TASK-256-07 | Dynamic/operational widget issues: content-list columns visible for non-card variants and textColor clear gap (`REPORT_CONTENT_LIST_WIDGET.md:77,147,160,269-280`); navigation logo href/editor validation/sticky wrapper drift (`REPORT_NAVIGATION_WIDGET.md:117-119,281,380-391,401,450`) | `ContentListEditors.tsx`; `contentList.tsx:145-156,256-267`; `NavigationEditors.tsx`; `navigation.tsx:25-32,391-405` and logo/render region around `navigation.tsx:506-516`; section/layout wrapper owners for sticky overflow | Hide/disable controls that have no runtime effect; align menu href validation with renderer hash support; render logo href safely; decide sticky ownership at wrapper level and document if layout constraints remain | Update `tests/vitest/ui/content-list-editor-wave.test.tsx`, `tests/vitest/widgets/contentList.test.tsx` if added, `tests/vitest/ui/navigation-editor-wave.test.tsx`, `tests/vitest/widgets/navigation.test.tsx`, and menu validation tests |
| TASK-256-08 | Some reports are still partial or pre-test (`REPORT_STACK_WIDGET.md:61-120`, `REPORT_FEATURE_GRID_WIDGET.md:75-140`, `REPORT_TESTIMONIALS_WIDGET.md:50-66`, `REPORT_PRICING_PLANS_WIDGET.md:221-236`) | `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md`; `_docs/_WIDGETS/*.md`; `_docs/WIDGETS.md`; `_docs/WIDGET_PACK_MATRIX.md` if readiness changes | Refresh every report with admin/frontend proof, record fixed vs deferred scope, update source-of-truth docs and final changelog | Run targeted Vitest lanes, required Bun lanes when schema/runtime registry changes, `bun --cwd core lint`, `bun --cwd core lint:types`, security/precommit before final closure |

## Sub-Tasks

- [ ] TASK-256-01: Shared Editor Mode and Atomic Update Contract
- [ ] TASK-256-02: Clear, None Token, and Design Token Controls
- [ ] TASK-256-03: Slot Nested Content and Public Placeholder Safety
- [ ] TASK-256-04: Interactive Runtime Instance and Accessibility Contract
- [ ] TASK-256-05: Structural Widget Report Findings
- [ ] TASK-256-06: Marketing Widget Report Findings
- [ ] TASK-256-07: Dynamic Navigation and Content Widget Findings
- [ ] TASK-256-08: Playwright Report Completion and Closure

## Implementation Order

1. Complete TASK-256-01 and TASK-256-02 first because they define shared helper
   behavior used by many widget leaves.
2. Complete TASK-256-03 before widget-specific placeholder fixes so public
   runtime gating is consistent.
3. Complete TASK-256-04 before marketing/dynamic leaves that add or repair
   interactive behavior.
4. Complete TASK-256-05, TASK-256-06, and TASK-256-07 in parallel only if file
   ownership stays disjoint.
5. Complete TASK-256-08 last after code, tests, reports, docs, changelog, and
   task-board closure are synchronized.

## Security Contract

This umbrella does not add API routes.

- Endpoint visibility: none.
- Auth model: unchanged admin UI and public runtime widget rendering.
- RBAC: unchanged.
- CSRF: unchanged because no write routes are introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: preserve existing widget schema
  `additionalProperties: false` behavior and add tests when schemas change.
- Anti-abuse: public runtime output must keep safe href/media normalization and
  must not introduce untrusted script execution or public write paths.
- Secret handling: no secrets in widget data, browser cache, diagnostics, or
  Playwright reports.

## Testing Requirements

- For docs-only task creation: run `git diff --check`.
- For implementation leaves:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - relevant Vitest UI/editor suites for touched admin components;
  - relevant Vitest widget runtime suites for touched renderers;
  - Bun widget registry/validator suites when schemas, defaults, or runtime
    registration change;
  - `bun run gates:coderso` plus targeted security/performance/reliability
    lanes when a leaf changes release-gated behavior;
  - `bun run scan:security:strict` and `bun run precommit` before final closure.

## Documentation Updates Required

- Update each touched `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` with fixed/deferred
  evidence and concrete admin/frontend results.
- Update `_docs/WIDGETS.md` if shared clear/mode/slot/runtime contracts change.
- Update touched `_docs/_WIDGETS/*.md` files when widget data, editor, or
  runtime behavior changes.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness/completeness
  changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  umbrella is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Acceptance Criteria

- Every report drift assigned in the matrix is either fixed with tests or
  explicitly deferred to a new follow-up task with a documented reason.
- Shared editor mode updates preserve current widget data and do not re-open the
  timeline-style race in any widget with editor-owned variant selection.
- `Clear` and `none` semantics are consistent with `_docs/WIDGETS.md:185-227`.
- Public runtime pages no longer render admin-only empty-slot placeholders.
- Interactive widget instances do not produce duplicate DOM IDs and expose
  accessible names/state.
- All targeted widget/editor tests and required repo gates pass before closure.
