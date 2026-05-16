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
  Playwright report evidence.

## Shared Contract Boundary

TASK-256 is a shared-contract repair family. Per-widget report rows are evidence
slices for shared contract classes, not independent product-feature backlogs.
Each implementation leaf must first map a finding to one or more shared
contracts: editor-mode atomic updates, `Clear`/`none` token semantics,
slot/placeholder gating, instance-safe IDs/ARIA, truthful controls, safe
href/media handling, or preview/runtime parity.

Findings that do not fit one of those shared classes must stay out of the
implementation leaves until TASK-256-08 either documents an intentional deferral
or creates a future task. This keeps TASK-256 focused on the widget contract that
already exists in the repo instead of widening into per-widget feature expansion.

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
  `REPORT_PRICING_PLANS_WIDGET.md`, `REPORT_FAQ_ACCORDION_WIDGET.md`,
  `REPORT_CTA_BANNER_WIDGET.md`, `REPORT_LOGO_CLOUD_WIDGET.md`,
  `REPORT_GALLERY_MOSAIC_WIDGET.md`, `REPORT_STATS_KPI_WIDGET.md`,
  `REPORT_TEAM_WIDGET.md`, `REPORT_RICH_TEXT_SECTION_WIDGET.md`.
- Dynamic/operational: `REPORT_CONTENT_LIST_WIDGET.md`,
  `REPORT_NAVIGATION_WIDGET.md`, `REPORT_POSTS_FEED_WIDGET.md`,
  `REPORT_ENTRY_TEASER_WIDGET.md`, `REPORT_LISTING_FILTERS_WIDGET.md`.
- Commerce/store: `REPORT_PRODUCT_GALLERY_WIDGET.md`,
  `REPORT_PRODUCT_COMPARE_WIDGET.md`, `REPORT_PRODUCT_TABLE_WIDGET.md`.

## Playwright Artifact Policy

The markdown reports under `_docs/PLAYWRIGHT/` are source-controlled audit
documents. PNG screenshots generated while running Playwright are temporary local
artifacts and must not be committed. Reports may keep screenshot file names as
local capture labels, but TASK-256 evidence must be textual: observed admin and
frontend state, DOM excerpts, exact report line references, owner code lines,
and test results.

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
| TASK-256-01 | Timeline visual mode variant/data race (`REPORT_TIMELINE_WIDGET.md:145`), feature-grid item count/variant desync (`REPORT_FEATURE_GRID_WIDGET.md:74-83,171-176`), split/stack variant-bound data drift (`REPORT_SPLIT_LAYOUT_WIDGET.md:95,161`; `REPORT_STACK_WIDGET.md:111`), spacer Advanced fixed/responsive mismatch (`REPORT_SPACER_WIDGET.md:162-171`), divider dead Advanced variant select (`REPORT_DIVIDER_WIDGET.md:71-72`), duplicated Advanced controls in gallery/logo/stats reports (`REPORT_GALLERY_MOSAIC_WIDGET.md:48,153,226-227`; `REPORT_LOGO_CLOUD_WIDGET.md:94-100`; `REPORT_STATS_KPI_WIDGET.md:82-89`) | `core/admin/ui/pages/builder/VisualPanel.tsx:94-99`; `core/admin/ui/pages/builder/WizardPanel.tsx:55-60`; `core/admin/ui/pages/builder/AdvancedPanel.tsx:43-48`; widget editors that own mode controls, especially `TimelineEditors.tsx`, `FeatureGridEditors.tsx:435-455`, `SplitLayoutEditors.tsx`, `StackEditors.tsx`, `SpacerEditors.tsx:202-205`, `DividerEditors.tsx:118-149`, `GalleryMosaicEditors.tsx`, `LogoCloudEditors.tsx`, `StatsKpiEditors.tsx` | Add a shared atomic block update helper near `VisualPanel.tsx:94-99`; update editor-owned `onVariantChange` callsites to preserve current data; make Advanced controls either variant-aware, a true raw-token owner, or clearly read-only; remove inert no-op selects/buttons | Update `tests/vitest/pageBuilder/visualPanel.test.tsx`, `tests/vitest/pageBuilder/wizardPanel.test.tsx`, `tests/vitest/pageBuilder/advancedPanel.test.tsx`; update widget editor waves for timeline, feature-grid, split-layout, stack, spacer, divider, gallery-mosaic, logo-cloud, and stats-kpi |
| TASK-256-02 | Duplicate `none`/`0` token UX (`REPORT_DIVIDER_WIDGET.md:96`, `REPORT_SPACER_WIDGET.md:150`, `REPORT_SPLIT_LAYOUT_WIDGET.md:121-125`), clear gaps (`REPORT_TABS_WIDGET.md:63`, `REPORT_ACCORDION_WIDGET.md:113`, `REPORT_CONTENT_LIST_WIDGET.md:81`, `REPORT_PRICING_PLANS_WIDGET.md:179-183`, `REPORT_FEATURE_GRID_WIDGET.md:275-276`, `REPORT_CTA_BANNER_WIDGET.md:155-161`, `REPORT_TOGGLE_BLOCK_WIDGET.md:43-52,149,165-166`) | `core/admin/ui/widgets/editors/ClearableFields.tsx:4-61`; `DividerEditors.tsx:61-69,179-217,433-445`; `SpacerEditors.tsx:46-52,157-197`; `TabsEditors.tsx:370-430`; `AccordionEditors.tsx:415-430`; `PricingPlansEditors.tsx:965-971`; `FeatureGridEditors.tsx:668-683`; `CtaBannerEditors.tsx:413-486`; `ToggleBlockEditors.tsx:102-114,209-219,262-302`; `toggleBlock.tsx:91-104` | Add shared clearable field behavior for default-preview vs configured-value state; make token pickers distinguish zero vs clearable off-state; add missing `onClear` paths; remove or re-label no-op `Custom px` rows; preserve intentional toggle helper hiding | Update `tests/vitest/ui/clearable-fields.test.tsx`, `tests/vitest/widgets/styleNoneTokens.test.tsx`, `tests/vitest/widgets/clearableStyle.test.ts`, `tests/vitest/ui/toggle-block-editor-wave.test.tsx`, `tests/vitest/widgets/toggleBlock.test.tsx`, and affected widget editor/runtime tests |
| TASK-256-03 | Slot/config desync and public placeholders (`REPORT_SECTION_WIDGET.md:252,270,283`; `REPORT_GRID_COLUMNS_WIDGET.md:63,104,150-160,188-191`; `REPORT_SPLIT_LAYOUT_WIDGET.md:174-176,202`; `REPORT_TABS_WIDGET.md:91,96`; `REPORT_ACCORDION_WIDGET.md:106`; `REPORT_TOGGLE_BLOCK_WIDGET.md:124`) | `VisualPanel.tsx:101-162`; `WidgetRenderer` render context in `core/widgets/renderers/widgetRenderer.tsx:194`; `GridColumnsEditors.tsx` repeatable column config; `TabsEditors.tsx:277-302`; `AccordionEditors.tsx:272-297`; public renderers `section.tsx:403-413`, `gridColumns.tsx:452-503`, `splitLayout.tsx:247-270`, `tabs.tsx:498-505`, `accordion.tsx:361-368`, `toggleBlock.tsx:357-384` | Add preview/editor-only placeholder gating through a concrete renderer context; synchronize repeatable config counts with slot add/remove flows; replace technical slot-id copy with editor-friendly labels and stable metadata | Update `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx`, affected widget editor waves, and widget runtime tests for no public placeholders |
| TASK-256-04 | Duplicate runtime IDs and global binding risks (`REPORT_TOGGLE_BLOCK_WIDGET.md:31,39,207`; `REPORT_TABS_WIDGET.md:168,287`), missing/incomplete ARIA across tabs/toggle/accordion/timeline/FAQ/pricing | `core/widgets/core/tabs.tsx:271-371,432-505`; `core/widgets/core/toggleBlock.tsx:141-250,298-389`; `core/widgets/core/faqAccordion.tsx:316-365`; `core/widgets/core/pricingPlans.tsx:682-727`; `core/widgets/core/timeline.tsx`; `core/widgets/core/accordion.tsx` | Generate instance-scoped root IDs and descendant IDs; bind scripts idempotently per root; add `aria-labelledby`, `aria-controls`, labels/captions, and keyboard tests where controls are interactive | Update `tests/vitest/widgets/tabs.test.tsx`, `tests/vitest/widgets/toggleBlock.test.tsx`, `tests/vitest/widgets/accordionWidget.test.tsx`, `tests/vitest/widgets/faqAccordion.test.tsx`, `tests/vitest/widgets/pricingPlans.test.tsx`, `tests/vitest/widgets/timeline.test.tsx`; add focused DOM duplicate-ID assertions |
| TASK-256-05 | Structural widget issues: section empty-region/normalizer/anchor/Advanced drift, grid slot/config sync, asymmetric/masonry truthfulness and public column-label leakage, split/stack variant-bound data sync, spacer/divider token and Advanced drift, tabs/accordion/toggle structural residuals | Parent plus physical child leaves `TASK-256-05-01` through `TASK-256-05-04`; owner rows live in those child files and stay disjoint by widget group | Apply structural widget-specific fixes after shared helpers land; keep schema/default/normalizer/render/editor together for each widget; do not execute this broad parent without selecting a child leaf | Update exact structural tests listed in child leaves, including `tests/vitest/ui/section-editor-wave.test.tsx`, `tests/vitest/widgets/section.test.tsx`, `tests/vitest/ui/grid-columns-editor-wave.test.tsx`, `tests/vitest/widgets/gridColumns.test.tsx`, `tests/vitest/ui/split-layout-editor-wave.test.tsx`, `tests/vitest/widgets/splitLayout.test.tsx`, `tests/vitest/ui/stack-editor-wave.test.tsx`, `tests/vitest/widgets/stack.test.tsx`, `tests/vitest/ui/spacer-editor-wave.test.tsx`, `tests/vitest/widgets/spacer.test.tsx`, `tests/vitest/ui/divider-editor-wave.test.tsx`, `tests/vitest/widgets/divider.test.tsx`, `tests/vitest/ui/tabs-editor-wave.test.tsx`, `tests/vitest/widgets/tabs.test.tsx`, `tests/vitest/ui/accordion-editor-wave.test.tsx`, `tests/vitest/widgets/accordionWidget.test.tsx`, `tests/vitest/ui/toggle-block-editor-wave.test.tsx`, and `tests/vitest/widgets/toggleBlock.test.tsx` |
| TASK-256-06 | Marketing/content widget issues: hero media/gradient/alt drift (`REPORT_HERO_WIDGET.md:126-159`), feature-grid columns/count drift and completed Playwright findings (`REPORT_FEATURE_GRID_WIDGET.md:72-83,157-176,247-276`), testimonials slider/clear/a11y gaps (`REPORT_TESTIMONIALS_WIDGET.md:136-180,291-304`), pricing plan-count/static toggle drift (`REPORT_PRICING_PLANS_WIDGET.md:167-200,241-244`), FAQ single-open/ARIA/spacing gaps (`REPORT_FAQ_ACCORDION_WIDGET.md:96-99,119,140-145,174-181,262-266,332-336`), CTA banner badge/text/focus/clear drift (`REPORT_CTA_BANNER_WIDGET.md:132-161,223-241`), logo-cloud href/header/ARIA/editor drift (`REPORT_LOGO_CLOUD_WIDGET.md:38-116,134-153`), gallery-mosaic media/overlay/alt drift (`REPORT_GALLERY_MOSAIC_WIDGET.md:54-94,195-220,226-227,274-281`), stats-kpi truthful controls/grid/ARIA drift (`REPORT_STATS_KPI_WIDGET.md:42-116,170-206`), team columns/social/ARIA/media drift (`REPORT_TEAM_WIDGET.md:42-91,210-339,365-393`), timeline race/wizard/a11y (`REPORT_TIMELINE_WIDGET.md:121,156,170,192,262-273`) | Parent plus physical child leaves `TASK-256-06-01` through `TASK-256-06-04`; owner rows live in those child files and stay disjoint by widget group. Rich Text Section is not executed by this row until TASK-256-08 finishes report classification and either maps it to an existing shared-contract leaf or creates a physical execution leaf/follow-up. | Fix widget-specific contract bugs without widening into rejected feature expansion; if a report asks for a new major feature, classify it in the child scope matrix and let TASK-256-08 create a future task before closure | Update exact marketing/content runtime/editor waves listed in child leaves; add security/accessibility assertions for external links, image alt/lazy loading, ARIA, table semantics, CTA focus state, and billing/toggle interactions |
| TASK-256-07 | Dynamic/operational widget issues: content-list columns visible for non-card variants and textColor clear gap (`REPORT_CONTENT_LIST_WIDGET.md:66-87,268-280`); navigation logo href/editor validation/a11y/sticky wrapper drift (`REPORT_NAVIGATION_WIDGET.md:74-84,142-151,207-214,327-332,380-391,397-427,450`); posts-feed source/manual/sort truthfulness, textColor exposure, image mapping, and a11y/media classification (`REPORT_POSTS_FEED_WIDGET.md:121-193,236-278`); entry-teaser source/CTA/style/runtime-state truthfulness (`REPORT_ENTRY_TEASER_WIDGET.md:70-112,130-166,181-194,214-244`); listing-filters facet/config/runtime truthfulness and accessibility (`REPORT_LISTING_FILTERS_WIDGET.md:67-139,156-202,249-262,314-363`) | `ContentListEditors.tsx`; `contentList.tsx:145-156,256-267`; `NavigationEditors.tsx`; `navigation.tsx:25-32,391-405` and logo/dropdown/mobile render region around `navigation.tsx:440-516`; `PostsFeedEditors.tsx`; `postsFeed.tsx:225-395`; `postsFeedResolver.ts:180-219`; `EntryTeaserEditors.tsx`; `entryTeaser.tsx:314-563`; `entryTeaserResolver.ts:84-101`; `ListingFiltersEditors.tsx`; `listingFilters.tsx:286-591`; `listingRuntimeScript.ts`; section/layout wrapper owners for sticky overflow | Hide/disable controls that have no runtime effect; align menu href validation with renderer hash support; render logo/external links safely; classify posts-feed/entry-teaser/listing-filters product requests through existing shared contracts before implementing; assign dropdown/mobile/facet accessibility findings; decide sticky ownership at wrapper level and document if layout constraints remain | Update `tests/vitest/ui/content-list-editor-wave.test.tsx`, `tests/unit/widgets/contentList.test.tsx`, `tests/vitest/ui/navigation-editor-wave.test.tsx`, `tests/vitest/widgets/navigation.test.tsx`, `tests/vitest/ui/posts-feed-editor-wave.test.tsx`, `tests/unit/widgets/postsFeedWidget.test.tsx`, `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`, `tests/unit/widgets/entryTeaser.test.tsx`, `tests/vitest/ui/listing-filters-editor-wave.test.tsx`, `tests/vitest/widgets/listingFilters.test.tsx`, `tests/vitest/search/listingRuntimeService.test.ts`, `tests/vitest/widgets/widgetSafeHref.test.ts`, and `tests/vitest/ui/menu-editor-validation.test.ts` |
| TASK-256-08 | Some reports are still in-progress or have constrained evidence (`REPORT_RICH_TEXT_SECTION_WIDGET.md:3`, `REPORT_SECTION_WIDGET.md:220,258`) while completed reports, including `REPORT_STATS_KPI_WIDGET.md:3`, `REPORT_GALLERY_MOSAIC_WIDGET.md:3`, `REPORT_POSTS_FEED_WIDGET.md:3`, `REPORT_ENTRY_TEASER_WIDGET.md:3`, `REPORT_PRODUCT_GALLERY_WIDGET.md:3`, `REPORT_PRODUCT_COMPARE_WIDGET.md:3`, `REPORT_PRODUCT_TABLE_WIDGET.md:3`, and `REPORT_LISTING_FILTERS_WIDGET.md:3`, need fixed/deferred status after implementation | `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md`; `_docs/_WIDGETS/*.md`; `_docs/WIDGETS.md`; `_docs/WIDGET_PACK_MATRIX.md` if readiness changes | Refresh every report with textual admin/frontend proof, record fixed vs deferred scope, update source-of-truth docs and final changelog, and keep PNG screenshots out of git. Commerce/store reports must be classified against the same shared widget contracts before any future product expansion is opened. | Run targeted Vitest lanes, required Bun lanes when schema/runtime registry changes, `bun --cwd core lint`, `bun --cwd core lint:types`, security/precommit before final closure |

## Sub-Tasks

- [ ] TASK-256-01: Shared Editor Mode and Atomic Update Contract
- [ ] TASK-256-02: Clear, None Token, and Design Token Controls
- [ ] TASK-256-03: Slot Nested Content and Public Placeholder Safety
- [ ] TASK-256-04: Interactive Runtime Instance and Accessibility Contract
- [ ] TASK-256-05: Structural Widget Report Findings
  - [ ] TASK-256-05-01: Section and Grid Columns Structural Findings
  - [ ] TASK-256-05-02: Split Layout and Stack Variant Data Sync
  - [ ] TASK-256-05-03: Spacer and Divider Token Control Findings
  - [ ] TASK-256-05-04: Tabs, Accordion, and Toggle Block Structural Residuals
- [ ] TASK-256-06: Marketing Widget Report Findings
  - [ ] TASK-256-06-01: Feature Grid and Stats KPI Truthful Controls
  - [ ] TASK-256-06-02: CTA Banner, Logo Cloud, and Gallery Media Links
  - [ ] TASK-256-06-03: Hero, Timeline, Pricing, FAQ, and Testimonials Accessibility
  - [ ] TASK-256-06-04: Team Profile Links and Accessibility
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

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

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

- Update each touched `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` with textual
  fixed/deferred evidence and concrete admin/frontend results. Do not commit
  Playwright PNG screenshots.
- Update `_docs/WIDGETS.md` if shared clear/mode/slot/runtime contracts change.
- Update touched `_docs/_WIDGETS/*.md` files when widget data, editor, or
  runtime behavior changes.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness/completeness
  changes.
- Add a final changelog entry and update `_docs/_CHANGELOG/README.md` when this
  umbrella is completed.
- Keep `_docs/_TASKS/README.md` in sync on every status transition.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

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
