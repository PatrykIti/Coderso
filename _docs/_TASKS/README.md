# Kanban Tasks - Coderso

Task board for project work. Keep task files and this board in sync.

## Workflow
1. Create a task file in `_docs/_TASKS/` using the format below.
2. Add the task to the **To Do** table and update **Statistics**.
3. Move to **In Progress** when work starts; update the task file status.
4. When complete, move to **Done**, update the task file status, and add a changelog entry.
5. Update any impacted docs after each task.

## Task file format
- File name: `TASK-XXX_Short_Title.md` (see `EXAMPLE_TASK.md`).
- Header lines:
  - `# TASK-XXX: Title`
  - `# FileName: TASK-XXX_Short_Title.md`
- Required fields: Priority, Category, Estimated Effort, Dependencies, Status.
- Required sections: Overview, Sub-Tasks, Testing Requirements, Documentation Updates Required.
- For API-related tasks/subtasks add mandatory section: `Security Contract` (visibility: `internal/public`, auth path, rate-limit bucket, nonce/signature/HMAC expectations, optional reCAPTCHA, internal mode via session/API key where applicable).
- Optional sections: Architecture, Implementation Order, New Files to Create.
- Detail level: match `EXAMPLE_TASK.md` (explicit files/paths, example code or payloads, testing checklist with unit tests, and planned docs/changelog).

## Status rules
- Use: To Do, In Progress, Done.
- Include dates for In Progress/Done in the task file.
- Update **Statistics** and the appropriate table on every status change.

## Changelog link
- Every completed task must have a matching entry in `_docs/_CHANGELOG/` and list the task ID there.

- **To Do:** 180 tasks
- **In Progress:** 5 tasks
- **Done:** 1816 tasks

---

## To Do

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-292 | Toggle Block Widget Playwright Product Followups | High | Very Large | Toggle Block-only follow-up family for `REPORT_TOGGLE_BLOCK_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-292-01 | Toggle Block Variant Visual Hierarchy, Contrast, and Pane Styling | High | Large | Add Toggle Block-owned cards distinction, active contrast, and bounded pane style controls after TASK-256 shared style semantics |
| TASK-292-02 | Toggle Block Motion and Pane Transition Contract | Medium | Medium | Add bounded fade/slide/no-motion options without weakening TASK-256 interactive runtime semantics |
| TASK-292-03 | Toggle Block Accessible Label Localization and Status Copy | High | Medium | Add widget-owned localized radiogroup and selected-state copy while TASK-256 owns structural ARIA/ID repairs |
| TASK-292-04 | Toggle Block Editor Mode Flow, Variant Previews, and Reset UX | High | Large | Add variant thumbnails, clearer Wizard/Visual/Advanced ownership, reset defaults, and active default-state messaging |
| TASK-292-05 | Toggle Block Pane Authoring Guidance and Two-State Documentation | Medium | Medium | Add builder-facing pane guidance and document the intentional two-state Toggle Block boundary |
| TASK-292-06 | Toggle Block Report Docs Changelog and Closure | Medium | Medium | Refresh Toggle Block report/docs/changelog/board and final validation evidence |
| TASK-291 | Timeline Widget Playwright Product Followups | High | Very Large | Timeline-only follow-up family for `REPORT_TIMELINE_WIDGET.md`, excluding shared TASK-256 mechanisms |
| TASK-291-01 | Timeline Wizard Step Authoring and Status UX | High | Large | Expand Wizard all-step editing, status authoring, icon/accent controls, remove UX, and hidden-title warning after shared atomic updates |
| TASK-291-02 | Timeline Editor Mode Preview Date Guidance and Reorder UX | High | Large | Add mode preview cards, date validation/help, Visual no-status UX, grouped marker controls, spacing guidance, and drag reorder with button fallback |
| TASK-291-03 | Timeline Renderer Accessibility Axis and Responsive Correctness | High | Large | Repair Timeline-only ARIA, mobile dates, chronology/milestone responsiveness, connector sizing, line-style semantics, and short-timeline density |
| TASK-291-04 | Timeline Marker Accent Numbering and Step Link Model | Medium | Large | Add global accent inheritance, numbered/icon markers, per-step label-position decisions, and safe whole-step links |
| TASK-291-05 | Timeline Layout Typography Header and Container Controls | Medium | Large | Add title weight, bounded padding/max-width/min-height, header title/description, and dated milestone composition |
| TASK-291-06 | Timeline Motion Presets and Reduced-Motion Policy | Low | Medium | Decide CSS-safe Timeline motion presets or keep W8 static with exact shared-runtime follow-up if needed |
| TASK-291-07 | Timeline Report Docs Changelog and Closure | Medium | Medium | Refresh Timeline report/docs/changelog/board and final validation evidence |
| TASK-281-04 | Product Table Product Links and Action Column | High | Large | Add safe product navigation and optional action column without public admin actions |
| TASK-281-05 | Product Table Accessibility and Runtime Semantics | High | Medium | Add Product Table captions/scopes, alert/live semantics, and section/table labels |
| TASK-281-06 | Product Table Media Excerpt and Section Header Context | High | Large | Add optional thumbnails, excerpts, and section header fields from runtime-safe product data |
| TASK-281-07 | Product Table Pagination Search Filter and Sorting UX | High | Very Large | Add bounded public query controls with explicit route/security policy |
| TASK-281-08 | Product Table Variants Density Layout and Sticky Header | Medium | Large | Add compact/striped variants, density, zebra/hover, width, typography, and sticky header controls |
| TASK-281-09 | Product Table Export Currency and Advanced Diagnostics | Medium | Large | Add safe visible-row export, locale-aware money formatting, and read-only runtime diagnostics |
| TASK-281-10 | Product Table Report Docs Changelog and Closure | Medium | Medium | Refresh Product Table report/docs/changelog/board and final validation evidence |
| TASK-290 | Testimonials Widget Playwright Product Followups | High | Very Large | Testimonials-only follow-up family for `REPORT_TESTIMONIALS_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-290-01 | Testimonials Wizard Header and Social Proof Authoring | High | Large | Expand Wizard header and social-proof fields after TASK-256 variant/count updates are stable |
| TASK-290-02 | Testimonials Destructive Item Management and Spotlight Pin | High | Large | Add safer removal and explicit spotlight selection without duplicating shared editor update fixes |
| TASK-290-03 | Testimonials Avatar Media Picker and URL Validation | High | Large | Add avatar Media Library picking and safe URL feedback while TASK-256 owns lazy/alt baseline |
| TASK-290-04 | Testimonials Slider Navigation and Rating Semantics | High | Large | Add Testimonials-only slider product controls and rating-zero semantics after TASK-256 slider baseline |
| TASK-290-05 | Testimonials Section Surface Typography and Card Styles | Medium | Large | Add bounded section background, header typography, card radius/border width, and contrast guidance |
| TASK-290-06 | Testimonials CTA and Rich Quote Content | Medium | Large | Add a safe CTA and bounded rich quote formatting for Testimonials sections |
| TASK-290-07 | Testimonials Large Set Import Export and Pagination | Low | Very Large | Decide large-set policy and add safe local import/export or pagination without external provider connectors |
| TASK-290-08 | Testimonials Report Docs Changelog and Closure | Medium | Medium | Refresh Testimonials report/docs/changelog/board and final validation evidence |
| TASK-289 | Team Widget Playwright Product Followups | High | Very Large | Team-only follow-up family for `REPORT_TEAM_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-289-01 | Team Member Editor IA and Destructive Edit UX | High | Large | Colocate member social links, add recoverable/confirmed removals, and add efficient top member actions after TASK-256 safety |
| TASK-289-02 | Team Spotlight Lead and Variant Guidance | Medium | Large | Add stable spotlight lead selection after TASK-256 resolves spotlight count/columns truthfulness |
| TASK-289-03 | Team Photo Authoring and Media Picker | High | Large | Add Team photo picker, preview, and clear behavior while keeping URL validation/media safety in TASK-256 |
| TASK-289-04 | Team Header Surface Typography and CTA Controls | Medium | Very Large | Add Team section background, eyebrow, typography, CTA, border-width, and contrast feedback after TASK-256 baselines |
| TASK-289-05 | Team Large Team and Compact Mobile Presentation | Low | Large | Decide and implement or explicitly defer bounded large-team and compact-mobile presentation behavior |
| TASK-289-06 | Team Report Docs Changelog and Closure | Medium | Medium | Refresh Team report/docs/changelog/board and final validation evidence |
| TASK-288 | Tabs Widget Playwright Product Followups | High | Very Large | Tabs-only follow-up family for `REPORT_TABS_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-288-01 | Tabs Visual Color Parity and Editor IA | High | Large | Add inactive text color, readable labels, section IA, and contrast guidance through shared color-control policy |
| TASK-288-02 | Tabs Wizard Layout, Default Tab, and Slot Guidance | High | Large | Add Wizard layout shortcuts, default-tab preview, panel-slot guidance, and safe tab-count impact copy |
| TASK-288-03 | Tabs Admin Preview and Runtime Activation | High | Large | Make admin preview switch panels and prevent duplicate Tabs runtime payload after TASK-256 instance-safe selectors |
| TASK-288-04 | Tabs Trigger Metadata and Disabled Tab Model | High | Large | Add bounded trigger icon/description semantics and disabled-tab behavior with schema/editor/runtime/tests |
| TASK-288-05 | Tabs Layout Overflow Typography and Spacing | High | Very Large | Add vertical alignment fix plus bounded overflow, typography, spacing, padding, and inner/panel width controls |
| TASK-288-06 | Tabs Motion Variant Previews and Polish | Medium | Large | Add reduced-motion-safe transitions and visual variant previews after activation/layout leaves land |
| TASK-288-07 | Tabs Report Docs and Closure | Medium | Medium | Refresh Tabs report/docs/changelog/board and final validation evidence |
| TASK-287 | Stats KPI Widget Playwright Product Followups | High | Very Large | Stats KPI-only follow-up family for `REPORT_STATS_KPI_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-287-01 | Stats KPI Value Typography and Metric Semantics | High | Large | Add value-size, description color, prefix/suffix, per-metric accent, and static trend fields after TASK-256 shared safety |
| TASK-287-02 | Stats KPI Section Surface Layout and Icon Styling | Medium | Large | Add inner section surface, max-width, padding, sparse density, icon styling, and optional divider intensity after TASK-256 truthfulness |
| TASK-287-03 | Stats KPI Wizard Variant Cards and Guidance | High | Medium | Add Wizard visual variant cards, header clear/guidance, icon guidance, and spacing help after TASK-256 baseline content fields land |
| TASK-287-04 | Stats KPI Metric Links and Safe Click Semantics | Medium | Large | Add optional safe per-metric links using shared safe-href behavior without public-write or action scope |
| TASK-287-05 | Stats KPI Metric Management and Editor IA Polish | Medium | Large | Add efficient reorder, merge-safe removal recovery, and Visual IA grouping after content/style/link fields settle |
| TASK-287-06 | Stats KPI Report Docs Changelog and Closure | Medium | Medium | Refresh Stats KPI report/docs/changelog/board and final validation evidence |
| TASK-286 | Stack Widget Playwright Product Followups | High | Very Large | Stack-only follow-up family for `REPORT_STACK_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-286-01 | Stack Flex Alignment Token Expansion | Medium | Medium | Add Stack-owned `baseline`, `space-around`, and `space-evenly` tokens with schema/editor/runtime/tests/docs coverage |
| TASK-286-02 | Stack Responsive Axis and Wrap Controls | High | Large | Add responsive align/justify/wrap controls while preserving legacy scalar payload compatibility |
| TASK-286-03 | Stack Wizard Gap Scale and Layout Guidance | Medium | Medium | Improve Wizard layout controls, all-breakpoint gap copy, and gap scale context after TASK-256 token cleanup |
| TASK-286-04 | Stack Variant Miniatures and Empty Slot Guidance | Low | Medium | Add variant miniatures and admin-safe empty-slot guidance without leaking public admin CTAs |
| TASK-286-05 | Stack Report Docs Changelog and Closure | Medium | Medium | Refresh Stack report/docs/changelog/board and final validation evidence |
| TASK-285 | Split Layout Widget Playwright Product Followups | High | Very Large | Split Layout-only follow-up family for `REPORT_SPLIT_LAYOUT_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-285-01 | Split Layout Mobile Ratio and Reverse Behavior | High | Large | Add Split Layout-owned mobile ratio/reverse behavior clarity after TASK-256 shared variant sync |
| TASK-285-02 | Split Layout Variant Card Preview and Ratio Disclosure | Medium | Medium | Add ratio miniatures and effective breakpoint disclosure without duplicating TASK-256 atomic variant updates |
| TASK-285-03 | Split Layout Pane Slot Guidance and Empty State | Medium | Medium | Replace redundant slot copy and add preview-only empty-pane guidance through TASK-256 placeholder gating |
| TASK-285-04 | Split Layout Advanced Diagnostics and Mode Ownership | Medium | Medium | Make Advanced useful through Split Layout responsive diagnostics after shared mode rules land |
| TASK-285-05 | Split Layout Gap Labels and Spacing Context | Low | Medium | Add Split Layout gap scale labels/help after TASK-256 resolves none/zero token semantics |
| TASK-285-06 | Split Layout Report Docs and Closure | Medium | Medium | Refresh Split Layout report/docs/changelog/board and final validation evidence |
| TASK-283 | Section Widget Playwright Product Followups | High | Very Large | Section-only follow-up family for `REPORT_SECTION_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-283-01 | Section Layout Height and Region Flow Controls | High | Very Large | Add bounded min-height/fullscreen, region row/grid flow, heading gap, and region gap controls after TASK-256 structural repairs |
| TASK-283-02 | Section Background Media and Layering Model | High | Very Large | Add safe decorative background media and bounded overlay/content layer controls without generic media or token-picker scope |
| TASK-283-03 | Section Heading Typography Alignment and Wizard UX | High | Large | Add Section-owned heading typography/alignment and Wizard label after TASK-256 heading baseline repair |
| TASK-283-04 | Section Presets Variant Guidance and Width Copy | Medium | Large | Add local Section presets, friendlier width labels, variant UI consistency, and gradient/background guidance |
| TASK-283-05 | Section Surface Shadow Motion and Preview Controls | Medium | Large | Add bounded shadows, reduced-motion-safe effects, sliders, and gradient/overlay preview after TASK-256 control cleanup |
| TASK-283-06 | Section Responsive Spacing and Mobile Density | Medium | Large | Add mobile/desktop spacing overrides and density presets through bounded Section layout tokens |
| TASK-283-07 | Section Custom Region Labels and Structure UX | Medium | Large | Add editor-only custom region labels while preserving `region:<id>` slot storage and public placeholder boundaries |
| TASK-283-08 | Section Report Docs Changelog and Closure | Medium | Medium | Refresh Section report/docs/changelog/board and final validation evidence |
| TASK-284 | Spacer Widget Playwright Product Followups | High | Very Large | Spacer-only follow-up family for `REPORT_SPACER_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-284-01 | Spacer Editor Guidance and Input Accessibility | High | Medium | Add fixed-mode guidance, breakpoint copy, custom numeric input help, and explicit height-field accessibility after TASK-256 token work |
| TASK-284-02 | Spacer Viewport and Fluid Length Units | Medium | Large | Add bounded viewport and fluid length grammar without arbitrary CSS passthrough |
| TASK-284-03 | Spacer Named Rhythm Presets | Medium | Medium | Add named vertical rhythm presets that map to safe height values without global style-manager scope |
| TASK-284-04 | Spacer Horizontal Orientation Contract | Low | Large | Decide and implement or explicitly defer horizontal Spacer behavior without flex-filler or page-builder rewrite scope |
| TASK-284-05 | Spacer Report Docs Changelog and Closure | Medium | Medium | Refresh Spacer report/docs/changelog/board and final validation evidence |
| TASK-282 | Rich Text Section Widget Playwright Product Followups | High | Very Large | Rich Text Section-only follow-up family for `REPORT_RICH_TEXT_SECTION_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-282-01 | Rich Text Output Mode and Wizard Ownership | High | Large | Make HTML/blocks source ownership truthful, prevent silent Wizard outputMode resets, and add mode-aware editor feedback |
| TASK-282-02 | Rich Text WYSIWYG HTML Body and Sanitizer Feedback | High | Very Large | Replace raw HTML-first beginner editing with safe rich-text authoring and explicit sanitizer feedback for dropped tags |
| TASK-282-03 | Rich Text Structured Blocks Rich Content and Scale UX | High | Large | Add rich block content, safe heading hierarchy, recoverable destructive actions, and scalable 20-block editing |
| TASK-282-04 | Rich Text Article Width Title and TOC Accessibility | High | Large | Repair article max-width, heading-level semantics, section labeling, and visible TOC focus states |
| TASK-282-05 | Rich Text Inline Media and Safe Content Model | High | Very Large | Add bounded inline image support using existing media ownership without claiming attachment/embed closure |
| TASK-282-06 | Rich Text Editor Mode IA and Reader Guidance | Medium | Medium | Align Wizard/Visual/Advanced mode IA, variant controls, dropcap guidance, and technical token duplication |
| TASK-282-07 | Rich Text Report Docs Changelog and Closure | Medium | Medium | Refresh Rich Text Section report/docs/changelog/board and final validation evidence |
| TASK-282-08 | Rich Text Attachments and Safe Embed Policy | High | Large | Complete KOD-13 beyond images with bounded attachment cards and safe video/embed decisions |
| TASK-282-09 | Rich Text Text Color Clear Adoption | Medium | Medium | Give KOD-10 a physical Rich Text Section owner for `textColor` clear behavior after shared helper support |
| TASK-267 | Feature Grid Widget Playwright Product Followups | High | Very Large | Feature Grid-only follow-up family for `REPORT_FEATURE_GRID_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-267-01 | Feature Grid Variant Preview and Responsive Cards-4 Layout | High | Medium | Add variant preview affordances, repair cards-4 responsive product behavior, and keep columns truthfulness in TASK-256 |
| TASK-267-02 | Feature Grid Card Reorder, Remove, and Item Management | High | Medium | Add drag reorder plus recoverable remove flow while preserving keyboard move fallback |
| TASK-267-03 | Feature Grid Media Picker, Emoji Picker, and Image Priority UX | High | Large | Add media-library card image picking, bounded emoji presets, and image-over-icon guidance |
| TASK-267-04 | Feature Grid Card Layout, Density, and Alignment Controls | High | Large | Add bounded card layout, padding, alignment, media-size, horizontal, and hero-card decisions |
| TASK-267-05 | Feature Grid Section Typography, Container, and Hover Controls | Medium | Large | Add Feature Grid-local section background, max-width, typography, and hover controls |
| TASK-267-06 | Feature Grid CTA Enablement, Target, and Rich Description Authoring | Medium | Large | Add explicit CTA enablement, safe target choice, and bounded rich description authoring after TASK-256 link safety |
| TASK-267-07 | Feature Grid Wizard Guidance and Editor Entry Flow | Medium | Medium | Add Wizard scope guidance and decide first-open flow after Visual expansion |
| TASK-267-08 | Feature Grid Report, Docs, Changelog, and Closure | Medium | Medium | Refresh Feature Grid report/docs/changelog/board and final validation evidence |
| TASK-266 | FAQ Accordion Widget Playwright Product Followups | High | Very Large | FAQ-only follow-up family for `REPORT_FAQ_ACCORDION_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-266-01 | FAQ Accordion Layout Typography and Motion Controls | High | Large | Add FAQ-owned max-width, alignment, padding, text colors, radius, border-width, title size, and motion controls |
| TASK-266-02 | FAQ Accordion Rich Answers and Item Icon Model | High | Large | Add safe bounded rich-answer formatting, per-item icons, and plain-text extraction for SEO |
| TASK-266-03 | FAQ Accordion SEO Structured Data Contract | High | Medium | Add optional FAQPage JSON-LD output derived from normalized safe FAQ data |
| TASK-266-04 | FAQ Accordion Wizard and Open State Editor UX | Medium | Medium | Add Wizard description, item counters, question-aware open labels, and clearer all-collapsed Advanced UX |
| TASK-266-05 | FAQ Accordion Item Management and Variant Preview Polish | Medium | Large | Add safer removal flow, compact accessible item actions, variant miniatures, and bounded reorder/bulk decisions |
| TASK-266-06 | FAQ Accordion Report Docs and Closure | Medium | Medium | Refresh FAQ report/docs/changelog/board and final validation for the TASK-266 family |
| TASK-265 | Entry Teaser Widget Playwright Product Followups | High | Very Large | Widget-specific follow-up family for `REPORT_ENTRY_TEASER_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-265-01 | Entry Teaser Source Resolution and Admin Preview | High | Large | Add resolved admin preview, source picker recovery, content-type dedupe, compact status labels, and listing source semantics |
| TASK-265-02 | Entry Teaser Editor IA, Fallback, and Variant Preview | High | Large | Repair source labels/ownership, variant thumbnails, fallback grouping, field preview hints, Auto URL help, and snapshot copy |
| TASK-265-03 | Entry Teaser CTA Link and URL Feedback | High | Medium | Add custom URL validation, empty-input behavior, new-tab safe rel, and fixed CTA style variants |
| TASK-265-04 | Entry Teaser Layout, Media, Tags, and Heading Controls | High | Large | Add section heading, media sizing, tag limits, max-width, optional icon/logo mode, image dimensions, and heading controls |
| TASK-265-06 | Entry Teaser Shared Color Control Adoption | Medium | Medium | Adopt the TASK-256-02 shared color-control hook for Entry Teaser surface/border fields without duplicating generic picker behavior |
| TASK-265-05 | Entry Teaser Report, Docs, and Closure | Medium | Medium | Refresh Entry Teaser report/docs/changelog/board and final validation for the TASK-265 family |
| TASK-264 | Divider Widget Playwright Product Followups | High | Large | Divider-specific follow-up family for `REPORT_DIVIDER_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-264-01 | Divider Label Color Typography and Gap Controls | High | Medium | Add label-center color, typography, nowrap, gap, truthful labels, and clear-label UX |
| TASK-264-02 | Divider Width Alignment and Custom Validation | High | Medium | Add container width, left/center/right alignment, and custom-width validation feedback |
| TASK-264-03 | Divider Line Style Opacity and Spacer Only Mode | Medium | Medium | Add bounded opacity, dotted/dashed style polish, and spacer-only visibility mode |
| TASK-264-04 | Divider Editor Preview Reset and Wizard UX | Medium | Medium | Add inline preview, compact Wizard controls, and reset/normalize actions after shared fixes land |
| TASK-264-05 | Divider Runtime DOM Marker Hygiene | Medium | Small | Remove or sanitize raw Divider style-token data markers from public DOM output |
| TASK-264-06 | Divider Report Docs and Closure | Medium | Medium | Refresh Divider report/docs/changelog/board and final validation for the TASK-264 family |
| TASK-263 | CTA Banner Widget Playwright Product Followups | High | Very Large | CTA Banner-only follow-up family for `REPORT_CTA_BANNER_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-263-01 | CTA Banner Runtime Semantics and Accessibility | High | Large | Repair CTA-local empty badge, description color, border semantics, resolver defaults, section/action labels, and focus-visible output |
| TASK-263-02 | CTA Banner Wizard and Action Editing UX | High | Large | Add Wizard CTA URL/secondary controls, variant cards, explicit action labels, invalid URL feedback, and secondary toggle |
| TASK-263-03 | CTA Banner Visual Style and Button Controls | High | Large | Add CTA visual button border controls, optional TASK-256-02 Clear hook, and button radius/size options |
| TASK-263-04 | CTA Banner Link Target and Conversion Options | Medium | Large | Add safe target/rel policy, icon enums, tertiary CTA, and description visibility controls |
| TASK-263-05 | CTA Banner Layout Media and Motion Options | Medium | Large | Add CTA-local width, gradient, background media, and bounded motion options where page layout does not already own them |
| TASK-263-06 | CTA Banner Report Docs and Closure | Medium | Medium | Refresh CTA report/docs/changelog/board and final validation for the TASK-263 family |
| TASK-262 | Content List Widget Playwright Product Followups | High | Very Large | Content List-only follow-up family for `REPORT_CONTENT_LIST_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-262-01 | Content List Source Picker and Filter Editor IA | High | Large | Repair source picker labels/deduplication/search, taxonomy/author editor barriers, and listing-mode filter feedback |
| TASK-262-02 | Content List Section Empty State and Static Canvas Guidance | High | Large | Add section heading, source-aware empty copy, missing-source guidance, and saved-data canvas messaging |
| TASK-262-03 | Content List Pagination and View All Navigation | High | Very Large | Add bounded page navigation and View all/Load more behavior without public-write or arbitrary endpoint scope |
| TASK-262-04 | Content List Layout Media Tags and Card Preview Controls | High | Large | Repair Content List-local layout truthfulness, image ratio controls, tag badges, CTA fallback, and card/variant previews |
| TASK-262-05 | Content List Report Docs and Closure | Medium | Medium | Refresh report/docs/changelog/board and final validation for the TASK-262 family |
| TASK-261 | Contact Widget Playwright Product Followups | High | Very Large | Contact-only follow-up family for `REPORT_CONTACT_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-261-01 | Contact Header, Details Links, and Semantic Output | High | Large | Add Contact section headings, panel headings, semantic details, and safe tel/mailto output |
| TASK-261-02 | Contact Form Field Metadata and Public Submission Bridge | High | Very Large | Add field names/ids/autocomplete/custom labels and route active submits through existing Forms runtime hardening |
| TASK-261-02-01 | Contact Field Metadata and Accessible HTML | High | Large | Add Contact-owned field labels/placeholders, names, ids, autocomplete, and layout metadata |
| TASK-261-02-02 | Contact Static Form State and No-GET Safety | High | Medium | Prevent presentational Contact forms from native GET submission before Forms binding is enabled |
| TASK-261-02-03 | Contact Forms Runtime Bridge and Public-Write Hardening | High | Large | Bind Contact to existing Forms records with strict field mapping, runtime hydration, nonce, and route/security proof |
| TASK-261-03 | Contact Editor Mode Parity and Minimal Variant UX | High | Large | Repair Contact Wizard/Visual/Advanced UX, Wizard hours, minimal form controls, hints, and normalization feedback |
| TASK-261-04 | Contact Map Validation, Fallback, and Display Controls | Medium | Medium | Add map title/description, validation, height, fullscreen, and fallback behavior |
| TASK-261-05 | Contact Layout, Social Links, and Normalizer Polish | Medium | Medium | Add max-width, padding, bounded social links, and explicit default enum normalization |
| TASK-261-06 | Contact Report, Docs, Changelog, and Closure | Medium | Medium | Refresh Contact report evidence, docs, changelog, board, and final validation |
| TASK-260 | Compare Timeline Widget Playwright Product Followups | High | Very Large | Widget-specific follow-up family for `REPORT_COMPARE_TIMELINE_WIDGET.md`, excluding TASK-256 shared-contract scope |
| TASK-260-01 | Compare Timeline Renderer Truthfulness and Accessibility | High | Large | Repair Compare Timeline-local renderer grid, guide, semantic, fallback, min-height, and overflow findings |
| TASK-260-02 | Compare Timeline Segment Editing and Highlight Model | High | Large | Expand both-track segment editing, Wizard segment setup, preserved segment messaging, range feedback, and friendly track labels |
| TASK-260-03 | Compare Timeline Axis Steps and Content Controls | High | Large | Add Visual step buttons, step descriptions, bounded range decisions, optional icons, and safe step/segment links |
| TASK-260-04 | Compare Timeline Layout Typography and Visual Polish | Medium | Large | Add Compare Timeline-owned heading, width, padding, typography, motion, order, background, marker, preview, and spacing help |
| TASK-260-05 | Compare Timeline Report Docs and Closure | Medium | Medium | Refresh report/docs/changelog/board and final validation for the TASK-260 family |
| TASK-259 | Booking Calendar Widget Playwright Product Followups | High | Very Large | Widget-specific follow-up family for `REPORT_BOOKING_CALENDAR_WIDGET.md`, excluding TASK-256 shared-contract and TASK-258 Appointment Form scope |
| TASK-259-01 | Booking Calendar Admin Preview Runtime Catalog Parity | High | Large | Hydrate admin canvas/editor preview with booking services/resources without persisting preview-only tokens |
| TASK-259-02 | Booking Calendar Date Defaults, Range, and Past-Date Safety | High | Large | Add default/min/max date config and enforce public slots past-date policy |
| TASK-259-03 | Booking Calendar Service Context and Timezone Copy | High | Large | Show price, duration, description, timezone, and user-facing empty-state copy |
| TASK-259-04 | Booking Calendar Loading, Concurrency, and Selection UX | High | Large | Add refresh busy state, skeleton, AbortController, stale-response guard, and clear selection |
| TASK-259-05 | Booking Calendar Availability Calendar and Slot Density | High | Very Large | Add visual date availability signals and non-overlapping slot density mode |
| TASK-259-06 | Booking Calendar Layout Variants and Mobile Styling | Medium | Large | Add compact/inline/horizontal layouts, mobile control density, and selected-slot style controls |
| TASK-259-07 | Booking Calendar Default Pickers and Diagnostics | Medium | Medium | Replace raw default IDs with catalog-aware pickers and truthful diagnostics |
| TASK-259-08 | Booking Calendar Report, Docs, and Closure | Medium | Medium | Refresh report/docs/changelog/board and final validation for the TASK-259 family |
| TASK-258 | Appointment Form Widget Playwright Follow-Up | High | Very Large | Widget-specific follow-up for `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`; excludes shared TASK-256 contract repairs |
| TASK-258-01 | Runtime State, Admin Preview, and Submission Feedback | High | Large | Repair no-slot disabled parity, stale errors, loading copy, and post-success slot clearing |
| TASK-258-02 | Field Validation, Visibility, and Accessibility | High | Large | Add truthful field toggles, required controls, split name, validation attributes, autocomplete, and form labels |
| TASK-258-03 | Flow Pairing, Slot Context, Locale, and Redirect | High | Large | Add flow-key pairing feedback, service/resource slot summary context, locale formatting, and safe success redirect |
| TASK-258-04 | Consent, Custom Fields, and Public Write Hardening | High | Large | Add bounded custom fields, consent controls, and backend-owned CAPTCHA bridge for booking submissions |
| TASK-258-05 | Style, Variants, and Advanced Diagnostics | High | Large | Add Appointment Form variants, submit text color, inherited-style indicators, and read-only runtime diagnostics |
| TASK-258-06 | Playwright Report, Docs, and Closure | Medium | Medium | Refresh report evidence, widget docs, changelog, board, and validation matrix after implementation |
| TASK-257 | Accordion Widget Playwright Product Followups | High | Large | Widget-specific follow-up family for `REPORT_ACCORDION_WIDGET.md`, excluding TASK-256 shared-contract and FAQ scope |
| TASK-257-01 | Accordion Initial Open State Product Options | High | Medium | Add intentional all-collapsed initial state after shared default-open/collapsible fixes land |
| TASK-257-02 | Accordion Style Layout and Typography Controls | High | Large | Add Accordion-owned body color, padding, radius, max-width, typography, and color-picker controls |
| TASK-257-03 | Accordion Item Content and Management UX | High | Large | Add item icon/copy/add/reorder UX only where nested slot content stays synchronized |
| TASK-257-04 | Accordion Motion and Variant Preview Polish | Medium | Medium | Add Accordion-specific motion tokens and visual variant preview cards |
| TASK-257-05 | Accordion Report Docs and Closure | Medium | Medium | Refresh report/docs/changelog/board and final validation for the TASK-257 family |
| TASK-239 | Coderso Membership and Client Portal Umbrella | High | Very Large | Execution-ready portal/member auth/access-rule program superseding TASK-054-20 |
| TASK-240 | Coderso Multilingual and i18n Umbrella | High | Very Large | Execution-ready locale/translation/runtime routing program superseding TASK-054-21 |
| TASK-105-08 | Final Per-File 100% Gap Closure | High | Large | Close final file-level line/branch/function gaps |
| TASK-105-09 | QA, Docs, Changelog, and Closure | Medium | Medium | Final metrics, docs, board, and changelog closure |
| TASK-105-11-03-05 | Server Cluster Bun Ownership Freeze | Medium | Medium | Document and freeze remaining `tests/unit/server/*` Bun ownership so future migrations do not reopen runner ambiguity |
| TASK-021 | Store Backend Core | High | Large | Public API + signing |
| TASK-022 | Store Publish Pipeline and Security Scans | High | Large | Publish validation + scans |
| TASK-023 | Store Auth and Publisher Accounts | Medium | Medium | Authors + tokens |
---

## In Progress

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-105 | Real Vitest 100% Coverage Program | High | Large | In progress: fresh 2026-03-15 baseline is `74.04%` lines with `61.35%` branches; `ThemeTemplateDrawer` and `UserList` are now line-closed, `UsersRolesPage` jumped into the high 80s, and the remaining backlog is increasingly broader low-line admin page/drawer tail |
| TASK-105-04 | Themes, Booking, Listings, and Forms Wave | High | Large | In progress: booking leaf tabs, `ListingListPage`, `FormCanvas`, and `ThemeTemplateDrawer` are now line-closed; the wave tail is mostly branch-only theme/page-shell cleanup |
| TASK-105-05 | Entries, Pages, and Posts Editor Wave | High | Large | In progress: `PageEditor` jumped above `82%` branches, and the next ROI is concentrated in smaller editor shell/media/async residue rather than broad component gaps |
| TASK-105-06 | Widget Editor New Tests Wave | High | Large | In progress: widget editors are now 100% lines in the full-lane report; remaining work is branch-only hardening plus barrel import ownership noise |
| TASK-281 | Product Table Widget Playwright Product Followups | High | Very Large | In progress (2026-05-21): three Product Table leaves are landed on dedicated worktrees, and the family remains active for links, accessibility, front-end controls, layout variants, diagnostics, and final closure sync |
---

## Done

| ID | Title | Priority | Effort | Notes |
|----|-------|----------|--------|-------|
| TASK-281-03 | Product Table Status Stock and Row State Presentation | High | Large | Done (2026-05-21): Product Table now renders fixed status badges, bounded draft/archived row tones, removes duplicated title suffixes when Status is visible, and optionally appends stock quantity through a gated control |
| TASK-281-02 | Product Table Column Labels and Visibility Model | High | Large | Done (2026-05-21): Product Table now drives renderer and Visual editor columns from one shared registry, exposes all seven label inputs, and guards Product/Price visibility against unusable empty column pairs |
| TASK-281-01 | Product Table Admin Preview Resolver Parity | High | Large | Done (2026-05-21): Product Table admin preview now hydrates through an internal widget preview route, keeps runtime diagnostics read-only, and ignores stale async responses without persisting preview-only rows |
| TASK-325 | Grid Columns Shared Structural Truthfulness Follow-up | High | Large | Done (2026-05-21): Grid Columns shared truthfulness is closed with asymmetric preset state, current span totals, CSS-token color coverage, cardize gating, and an explicit no-runtime-guard decision |
| TASK-325-06 | Grid Columns Report Docs Changelog and Closure | Medium | Medium | Done (2026-05-21): report/docs/board/changelog now reflect the shipped shared Grid Columns closure and final runtime decision |
| TASK-325-05 | Grid Columns Overflow Guard Decision | Medium | Medium | Done (2026-05-21): `gridColumnsOverflowDecision` now records an explicit `no-runtime-guard` rejection after the editor truthfulness pass landed |
| TASK-325-04 | Grid Columns Cardize Control Gating | Medium | Medium | Done (2026-05-21): cardize-only controls now hide/disable truthfully when inactive, and masonry-lite keeps the lock reason explicit |
| TASK-325-03 | Grid Columns CSS Variable Picker Truthfulness | Medium | Medium | Done (2026-05-21): Grid Columns now closes this residual through widget-local coverage of the already-landed shared token-aware color control contract |
| TASK-325-02 | Grid Columns Span Total Feedback and Invalid Layout Guidance | High | Medium | Done (2026-05-21): current totals now explain one-row fit, multi-row wrapping, and unused width without implying runtime auto-balance |
| TASK-325-01 | Grid Columns Asymmetric Variant Truthfulness | High | Medium | Done (2026-05-21): selecting asymmetric now reapplies the current desktop preset, while saved drift shows explicit state and reapply guidance |
| TASK-319 | Newsletter Per-Breakpoint Variant Overrides | Low | Large | Done (2026-05-21): BF-15 is closed as current-state sufficient; Newsletter keeps a scalar variant contract without a breakpoint-owned override field |
| TASK-319-03 | Newsletter Responsive Variant Docs and Closure | Medium | Medium | Done (2026-05-21): report/docs/board/changelog now reflect the explicit current-state-sufficient BF-15 outcome |
| TASK-319-02 | Newsletter Bounded Mobile Variant Implementation | Low | Large | Done (2026-05-21): closed not applicable after TASK-319-01 confirmed the shipped scalar variants already cover the cited mobile behavior |
| TASK-319-01 | Newsletter Responsive Variant Audit and Product Decision | Medium | Medium | Done (2026-05-21): audit confirmed `inline` and `minimal` already stack on mobile and only switch to a row from `sm` |
| TASK-322 | Admin Session and CSRF Expiry Resilience for Long-Lived Editors | High | Very Large | Done (2026-05-21): shared admin session expiry is now classified in the API client and adopted by PageEditor plus Posts Feed picker/preview consumers |
| TASK-322-04 | Session Expiry Docs, Changelog, and Closure | Medium | Medium | Done (2026-05-21): report/docs/board/changelog now reflect the landed shared session-expiry family |
| TASK-322-03 | Posts Feed and Shared Picker Consumer Session-Expiry Adoption | High | Large | Done (2026-05-21): Posts Feed picker and preview-resource consumers now render shared expired-session guidance instead of raw auth errors |
| TASK-322-02 | Page Editor Session Expiry Feedback and Dirty-State Preservation | High | Large | Done (2026-05-21): PageEditor now preserves unsaved work and surfaces actionable shared expired-session guidance for save/publish/settings flows |
| TASK-322-01 | Admin API Client Session Classification and Bounded CSRF Retry | High | Large | Done (2026-05-21): shared admin API requests now distinguish csrf-refreshable failures from session-expired auth failures through one client owner |
| TASK-317 | Widget Editor Live Preview Surface and Preview-State Contract | High | Large | Done (2026-05-21): BlockSettings now renders a shared live preview row through WidgetRenderer with transient previewState data patches |
| TASK-321 | Shared Clear Action Undo and Feedback Contract | Medium | Large | Done (2026-05-21): shared clearable inputs now emit recoverable undo feedback through the common clear helper contract |
| TASK-318 | Section Surface Overflow and Sticky Child Containment Contract | High | Large | Done (2026-05-21): Section now keeps clipping in a decorative inset layer so slotted sticky children are no longer blocked by the live surface wrapper |
| TASK-323 | Content List Load More and View All Pagination Truthfulness Residuals | High | Large | Done (2026-05-21): legacy `content-list` now treats `load-more` cumulatively and ignores stale block page params for `view-all` |
| TASK-320 | Content List Shared Date and CTA Accessibility Residuals | High | Large | Done (2026-05-21): shared `ContentListBlock` now emits semantic date markup and contextual CTA accessible names for both `content-list` and `posts-feed` |
| TASK-313 | Shared Commerce Widget Money Minor-Unit Parity | High | Medium | Done (2026-05-19): shared `formatCommerceMoney()` now follows the commerce admin minor-unit contract and Product Gallery / Product Compare / Product Table expectations were updated together. |
| TASK-280 | Product Gallery Widget Playwright Product Followups | High | Very Large | Done (2026-05-19): Product Gallery now ships media, safe links, bounded preview refresh, manual curation, view-all navigation, and closure docs aligned with the shared TASK-313 split. |
| TASK-280-01 | Product Gallery Media Link and CTA Cards | High | Large | Done (2026-05-19): cards now render backend-resolved media, safe links, bounded CTA styles, and accessible alt fallback. |
| TASK-280-02 | Product Gallery Compact Variant Surface and Price Display | High | Large | Done (2026-05-19): compact layout, dead fallback cleanup, minimal-border truthfulness, and compare-at guards are live; shared money parity moved to TASK-313. |
| TASK-280-03 | Product Gallery Admin Preview Runtime Status and Loading | High | Large | Done (2026-05-19): Product Gallery uses the shared widget preview-state seam with a bounded Advanced refresh flow, stale/empty/ready/error cues, and a dedicated admin preview route. |
| TASK-280-04 | Product Gallery Editor Mode Empty State and Technical Hints | High | Large | Done (2026-05-19): surfaces moved to Visual, blank empty-state descriptions persist, columns preview is visible, and media IDs stay in editor-only diagnostics. |
| TASK-280-05 | Product Gallery Source Collections and Filter Controls | Medium | Large | Done (2026-05-19): source input now normalizes once, Product Gallery adds bounded price filters, and collection guidance stays explicit without rewriting the shared picker contract. |
| TASK-280-06 | Product Gallery Section Header Metadata and Accessibility | Medium | Large | Done (2026-05-19): section header fields, status badges, stock text labels, and block-local accessible card names are covered in the runtime and tests. |
| TASK-280-07 | Product Gallery Pagination Manual Curation and Query Extensions | Medium | Very Large | Done (2026-05-19): Product Gallery ships manual curated ordering and a bounded view-all path instead of a broader public load-more surface. |
| TASK-280-08 | Product Gallery Report Docs Changelog and Closure | Medium | Medium | Done (2026-05-19): report/docs/task board/changelog now map every Product Gallery finding and capture the scoped validation closeout. |
| TASK-324 | Shared Commerce Source Fields Widget Bounds and Copy Contract | High | Large | Done (2026-05-19): shared `CommerceSourceFields` / `normalizeSourceForEditor` now support widget-specific bounds and helper copy without local Product Compare forks |
| TASK-279 | Product Compare Widget Playwright Product Followups | High | Very Large | Done (2026-05-20): Product Compare now ships curated product selection, preview parity, row/media/layout/accessibility follow-ups, and synchronized report/docs closure |
| TASK-279-08 | Product Compare Report Docs Changelog and Closure | Medium | Medium | Done (2026-05-20): Product Compare report/docs/changelog/board now reflect the landed widget/runtime/admin behavior and validation evidence |
| TASK-279-07 | Product Compare Editor IA and Source Guidance | Medium | Medium | Done (2026-05-19): Wizard no longer owns advanced surfaces, dense guidance is reactive, and Product Compare consumes the shared source-field contract |
| TASK-279-06 | Product Compare Admin Preview Resolve and Diagnostics | High | Very Large | Done (2026-05-19): Product Compare now refreshes admin preview data through a backend-owned widget preview route and read-only runtime diagnostics |
| TASK-279-05 | Product Compare Section Header and Table Accessibility | High | Large | Done (2026-05-19): Product Compare now renders section copy, caption/scoped headers, named sections, alert semantics, and keyboard-focusable scroll |
| TASK-279-04 | Product Compare Featured Column and Responsive Layouts | Medium | Large | Done (2026-05-19): Product Compare now supports featured-product highlighting, sticky headers, and compact/cards variants |
| TASK-279-03 | Product Compare Column Media Links and CTAs | High | Large | Done (2026-05-19): Product Compare headers can render backend-resolved media, safe product links, and bounded read-only CTAs |
| TASK-279-02 | Product Compare Attribute Rows Labels and Formatting | High | Large | Done (2026-05-19): Product Compare now owns row visibility, labels, excerpt support, locale-aware money formatting, and bounded quantity/stock copy |
| TASK-279-01 | Product Compare Source Selection and Limit Contract | High | Large | Done (2026-05-19): Product Compare now supports exact curated `productIds`, truthful limit bounds, source-edit stability, and admin-route proof |
| TASK-278 | Pricing Plans Widget Playwright Product Followups | High | Very Large | Done (2026-05-20): Pricing Plans now closes its Playwright-local product backlog with richer plan hierarchy, truthful static billing value semantics, bounded comparison/layout controls, a `two-plans` variant, and synchronized report/docs/changelog evidence |
| TASK-278-08 | Pricing Plans Report, Docs, Changelog, and Closure | Medium | Medium | Done (2026-05-20): report findings, widget docs, board rows, changelog, and validation notes are synchronized to the live TASK-278 closure state |
| TASK-278-07 | Pricing Plans Two-Plan Variant and Pack Docs | Medium | Medium | Done (2026-05-19): Pricing Plans exposes a dedicated `two-plans` variant end-to-end and the widget docs now describe the final variant/layout contract |
| TASK-278-06 | Pricing Plans Section Layout Typography and Notes | Medium | Large | Done (2026-05-19): Pricing Plans now exposes bounded max-width, typography presets, and plain-text footer notes without widening into generic slot content |
| TASK-278-05 | Pricing Plans Comparison Rows Product Table | High | Large | Done (2026-05-19): comparison rows now support sticky headers plus badge/CTA hierarchy directly in the table header on top of the shared accessibility baseline |
| TASK-278-04 | Pricing Plans Feature Marker and Feature Metadata | Medium | Large | Done (2026-05-19): feature rows now support bounded status/icon metadata with a legacy string adapter and no placeholder diamond marker |
| TASK-278-03 | Pricing Plans Billing Value Copy and Price Semantics | High | Large | Done (2026-05-19): Pricing Plans now owns structured/free/custom price modes, annual savings copy, clamped numeric amounts, and truthful static billing labels |
| TASK-278-02 | Pricing Plans Content Wizard and Destructive Edit UX | High | Large | Done (2026-05-19): Wizard now covers publishable minimum pricing content while Visual/Advanced tighten destructive actions, highlighted affordances, disabled billing labels, and feature autofocus |
| TASK-278-01 | Pricing Plans Card Visual Hierarchy and CTA Styles | High | Large | Done (2026-05-19): plan descriptions, per-plan surfaces, badge tones, highlight banners, and CTA styles now exist in the schema/editor/runtime contract |
| TASK-311 | Forms Field Model Expansion for Choice File and Typed Controls | High | Very Large | Done: Forms owners now cover `radio`, `number`, `time`, `range`, `rating`, and trusted `hidden`, while `file` remains explicitly unsupported by the current public-write contract |
| TASK-311-03 | Forms Hidden and File Field Public-Write Contract | High | Large | Done: hidden fields now submit trusted fixed values end-to-end, and file fields remain explicit unsupported scope until a safe upload/storage seam exists |
| TASK-311-02 | Forms Numeric, Temporal, Range, and Rating Field Expansion | Medium | Large | Done: typed controls now exist in validation, builder/admin preview, runtime preview, and Form Embed |
| TASK-311-01 | Forms Choice Field Expansion for Radio and Grouped Options | High | Large | Done: radio fields now exist end-to-end in Forms owners and Form Embed; grouped choice semantics remain explicit non-current-contract scope |
| TASK-316 | Shared Listing Query Picker Hook and Session-Settling Retry | High | Medium | Done: listing-query pickers now share the `useListingQueries()` owner with bounded auth-shaped retry and manual refresh coverage across Listing Filters and Search Box |
| TASK-315 | Shared Listing Runtime Refresh and Block Replacement Contract | High | Large | Done: shared listing runtime refresh now uses scoped busy/error hooks, stale-response protection, cross-block replacement, and explicit post-replacement rebinding proof without immediate redirect fallback |
| TASK-273 | Listing Filters Widget Playwright Product Followups | High | Very Large | Done (2026-05-20): the Listing Filters family is closed with picker/draft recovery, practical facet controls, active-summary UX, bounded layout variants, and landed shared-owner runtime/picker follow-ups |
| TASK-273-08 | Report, Docs, Changelog, and Closure | Medium | Medium | Done (2026-05-20): report evidence, widget docs, task board, changelog, and final validation are synchronized for TASK-273 |
| TASK-273-07 | Wizard, Diagnostics, and Mode Onboarding | Medium | Medium | Done (2026-05-19): Wizard facet onboarding, cross-mode diagnostics, and Advanced contract linkage are aligned with the live editor flow |
| TASK-273-06 | Layout Variants, Collapsible Facets, and Width Controls | High | Very Large | Done (2026-05-19): Listing Filters now ships bounded `horizontal`/`sidebar`/`drawer` variants, width controls, sticky sidebar option, and native collapsible facet behavior |
| TASK-273-05 | Pagination, Page Reset, Loading, and Error State | High | Large | Done (2026-05-19): local loading/error anchors landed, shared pagination ownership stayed externalized, and current-state report corrections document the live `__page` contract |
| TASK-273-04 | Active Filters, Clear All, Counts, and Auto Apply State | High | Large | Done (2026-05-19): runtime active summary, `Clear all`, truthful unloaded-count handling, and non-contradictory auto-apply UX now exist end-to-end |
| TASK-273-03 | Range, Date, Taxonomy, and Searchable Option Controls | High | Very Large | Done (2026-05-19): Listing Filters now supports practical range/date controls, taxonomy parent hierarchy, and searchable option mode through schema, editor, runtime, and tests |
| TASK-273-02 | Facet Field, Operator, Options, and Preview Editors | High | Large | Done (2026-05-19): facet authoring now uses query-aware field suggestions, kind-scoped operators, structured rows, validation, and preview |
| TASK-273-01 | Admin Canvas, Facet Draft State, and Query Loading | High | Large | Done (2026-05-19): canvas fallback, durable draft facets, duplicate-id feedback, and picker-local setup guidance are closed |
| TASK-310 | Shared Color Picker CSS Variable and Border Clear Regression | High | Large | Done: remaining widget editors now consume the landed shared color seams instead of local swatch/text clones |
| TASK-310-04 | Shared Color Picker Team and Testimonials Editor Adoption | Medium | Medium | Done: Team and Testimonials now consume shared color controls with focused editor-wave coverage |
| TASK-310-03 | Shared Color Picker Shell and Forms-Adjacent Editor Adoption | Medium | Large | Done: Contact, Footer, Navigation, Newsletter, and Pricing Plans now consume shared color controls |
| TASK-310-02 | Shared Color Picker Content and Marketing Editor Adoption | High | Large | Done: Content List, CTA Banner, Feature Grid, Hero, Rich Text Section, and Stats KPI now consume shared color controls |
| TASK-310-01 | Shared Color Picker Layout and Interactive Editor Adoption | High | Large | Done: Accordion, Compare Timeline, Divider, FAQ Accordion, Grid Columns, Section, and Timeline now consume shared color controls |
| TASK-309 | Footer Market Utility Expansion | Low | Very Large | Done: footer utility wave now has bounded newsletter composition, read-only address/contact surface, and anchor-based back-to-top policy |
| TASK-309-03 | Footer Back-to-Top Runtime Policy | Low | Medium | Done: Footer now exposes a bounded anchor-based back-to-top action with deterministic labeling |
| TASK-309-02 | Footer Address and Contact Utility Surface | Low | Medium | Done: Footer now supports bounded read-only address/contact presentation with safe tel/mailto rendering |
| TASK-309-01 | Footer Newsletter Composition and Submission Contract | Medium | Large | Done: Footer newsletter is composition-only and reuses the existing hardened Newsletter/Forms contract |
| TASK-308 | Footer Column Reorder and Slot Cohesion | Medium | Large | Done: Footer column reorder now remaps visible columns and slot payloads atomically through the live block patch path |
| TASK-277 | Posts Feed Widget Playwright Product Followups | High | Very Large | Done (2026-05-20): Posts Feed source truthfulness, media/tag/runtime owners, manual picker UX, admin preview bridge, section chrome, pagination filters, docs closure, and dedicated shared follow-up routing are synchronized |
| TASK-277-01 | Posts Feed Source Mode, Route, and Filter Truthfulness | High | Large | Done (2026-05-19): manual Sort truthfulness, single-keyword category copy, and no-route CTA suppression are synchronized with the extracted runtime owner |
| TASK-277-02 | Posts Feed Media, Tags, and Card Metadata | High | Large | Done (2026-05-19): show-image, shared media resolution, expanded post image candidates, bounded tags, and preview/runtime coverage are aligned |
| TASK-277-03 | Posts Feed Manual Picker Search, Reorder, and Accessibility | High | Large | Done (2026-05-19): manual picker search, ordering controls, retry/auth guidance, and `aria-live` feedback are covered |
| TASK-277-04 | Posts Feed Admin Preview and Runtime Status | High | Large | Done (2026-05-19): real PageEditor preview-state plumbing, transient resolved data patches, and readable sync status are covered |
| TASK-277-05 | Posts Feed Section Header, View All, and Editorial Chrome | Medium | Large | Done (2026-05-19): shared title/description/View All fields and bounded motion presets are synchronized with Posts Feed runtime output |
| TASK-277-06 | Posts Feed Editor Flow, Variant Previews, and Style Controls | Medium | Large | Done (2026-05-19): progressive Wizard flow, visual variant cards, text-color clear control, and shared image-aspect exposure are landed |
| TASK-277-07 | Posts Feed Pagination, Author, Date, and Featured-First Filters | Medium | Very Large | Done (2026-05-19): author/date filters, real-calendar normalization, cumulative load-more, stable view-all semantics, and SSR query handoff proof are covered |
| TASK-277-08 | Posts Feed Report, Docs, Changelog, and Closure | Medium | Medium | Done (2026-05-20): report matrix, widget docs, board sync, changelog, and scoped validation evidence are recorded with user-approved closeout scope |
| TASK-304 | Entry Teaser Listing Manual Picker | Medium | Medium | Done: listing mode now supports deterministic manual row selection without breaking legacy manual/latest/featured entry behavior |
| TASK-301 | Forms Public Runtime Nonce Cache Freshness | High | Large | Done: site HTML cache now skips nonce-bearing public pages/detail pages across Form Embed, Contact, and Appointment Form |
| TASK-300 | Compare Timeline Motion Presets and Reduced Motion Policy | Low | Medium | Done: Compare Timeline now exposes bounded motion presets with motion-safe and reduced-motion-aware runtime output |
| TASK-299 | Shared Widget Contrast Guidance and Validation | Medium | Large | Done: shared editor contrast advisories now cover Compare Timeline and Timeline color surfaces |
| TASK-298 | Booking Admin Availability Row Draft and Save UX | Medium | Medium | Done: Booking availability draft rows are explicit, resettable, and no longer silently ignored on save |
| TASK-297 | Shared Widget Color Picker Residual Controls | Medium | Large | Done: Booking Calendar frame fields now consume the landed shared color control seam |
| TASK-296 | Shared Interactive Widget Accessibility Residuals | High | Large | Done: Booking Calendar now has explicit region/list semantics, live status announcements, and selected-state accessibility wiring |
| TASK-295 | Appointment Form Custom Field Product Surface | Medium | Large | Done: Appointment Form now supports bounded custom-field authoring, render, and `metadata.customFields` submission mapping |
| TASK-294 | Booking Flow Editor Context Surface Plumbing | High | Large | Done: builder surfaces now expose same-surface booking flow summaries through shared `WidgetEditorContext.bookingFlows` |
| TASK-293 | Shared Repeatable Slot Metadata Sync and Instance Reorder | High | Large | Done: repeatable-slot add/remove/reorder now keeps slot order and widget metadata aligned through a shared builder-owned seam |
| TASK-312 | Gallery Mosaic Shared Contract Residual Reopen | High | Large | Done: reopened Gallery Mosaic shared prerequisites were closed under TASK-312, and the later TASK-270 product rollout is now also landed in the live checkout |
| TASK-312-03 | Gallery Mosaic Shared Residual Closure | Medium | Medium | Done: report/docs/changelog/board closure captured the shared reopen, while the later TASK-270 product rollout is now independently closed in the live checkout |
| TASK-312-02 | Gallery Mosaic Shared Runtime Semantics Residuals | High | Large | Done: Gallery Mosaic runtime now uses explicit resolver branches, semantic figure/figcaption output, and current video controls without widening into TASK-270 product fields |
| TASK-312-01 | Gallery Mosaic Shared Editor Truthfulness Residuals | High | Large | Done: Advanced is diagnostic-only, Wizard current-contract media selection now accepts image/video assets, and Visual exposes explicit current-media ownership copy |
| TASK-271 | Grid Columns Widget Playwright Product Followups | High | Very Large | Done (2026-05-19): Grid Columns follow-up scope is shipped end-to-end in the task worktree, with shared residual truthfulness intentionally routed to TASK-325 and the unrelated broad Bun assistant DB failure recorded separately in closure notes |
| TASK-271-07 | Grid Columns Report, Docs, Changelog, and Closure | Medium | Medium | Done (2026-05-19): report, widget docs, board, changelog, and exact validation evidence are synchronized, including the unrelated broad `bun run test:bun` blocker outside Grid Columns scope |
| TASK-271-06 | Grid Columns Gap Tokens and Density Controls | Medium | Medium | Done (2026-05-19): Grid Columns now supports the expanded bounded gap token set and readable scale labels while keeping separate `gapX` / `gapY` ownership |
| TASK-271-05 | Grid Columns Height and Cross-Axis Alignment | Medium | Large | Done (2026-05-19): Grid Columns now owns bounded min-height/mobile-min-height tokens and per-column `alignSelf` overrides without breaking the wrapper alignment default |
| TASK-271-04 | Grid Columns Per-Column Surface and Overflow | Medium | Large | Done (2026-05-19): Grid Columns now owns bounded per-column surface overrides, overflow control, and strict override validation without raw class strings |
| TASK-271-03 | Grid Columns Responsive Order, Visibility, and Wide Breakpoints | High | Very Large | Done (2026-05-19): Grid Columns now owns reverse-on-mobile, per-column visibility, and optional `xl` / `2xl` spans end-to-end |
| TASK-271-02 | Grid Columns Reorder and Column Management | High | Large | Done (2026-05-19): Grid Columns reorder now keeps column metadata and repeatable slot payloads aligned through the live block patch seam |
| TASK-271-01 | Grid Columns Wizard, Presets, and Editor Guidance | High | Large | Done (2026-05-19): Wizard now covers all column labels, bounded same-count presets, clearer count copy, and variant miniatures |
| TASK-270 | Gallery Mosaic Widget Playwright Product Followups | High | Very Large | Done: all Gallery Mosaic report findings are now mapped to shared fixes, TASK-270 leaves, session/setup resolution, or an explicit defer reason, and the final report/docs/changelog closure is synchronized |
| TASK-270-07 | Gallery Mosaic Report Docs Changelog and Closure | Medium | Medium | Done: the final closure pass mapped every report finding, synchronized widget/task/changelog docs, and hardened hover-caption keyboard access |
| TASK-270-06 | Gallery Mosaic Config Import Export and Wizard Guidance | Low | Medium | Done: Wizard now points to the final authoring flow, and Advanced owns bounded JSON import/export with machine-readable validation errors |
| TASK-270-05 | Gallery Mosaic Responsive Columns and Motion Presets | Medium | Large | Done: Gallery Mosaic now uses bounded responsive density presets and reduced-motion-safe `fade` / `slide-up` entrances instead of raw breakpoint maps |
| TASK-270-04 | Gallery Mosaic Lightbox and Zoom Mode | Medium | Large | Done: Gallery Mosaic now has opt-in widget-local lightbox/zoom with instance-scoped ids, href precedence guidance, and happy-dom runtime coverage |
| TASK-270-03 | Gallery Mosaic Per-Item Media Presentation Fields | Medium | Large | Done: per-item `alt`, focus point, ratio override, and video poster fields now exist end-to-end through schema, editor, and runtime output |
| TASK-270-02 | Gallery Mosaic Reorder, Count, and Removal UX | High | Large | Done: Visual supports drag reorder with keyboard fallback, confirms destructive count/remove changes, and warns when `feature-left` is left with one item |
| TASK-270-01 | Gallery Mosaic Item Previews and Media Picker | High | Large | Done: Visual item cards now show local preview state and a per-item MediaPicker with non-destructive asset lookup failures |
| TASK-307 | Feature Grid Shared Contract Residuals | High | Medium | Done: invalid image/CTA feedback, safe image fallback, emoji ARIA, and Advanced diagnostics-only cleanup are now closed as shared follow-up work discovered during TASK-267 |
| TASK-272 | Hero Widget Playwright Product Followups | High | Very Large | Done (2026-05-19): Hero runtime/editor/report/docs closure is synchronized, responsive-image variants remain explicitly deferred, and unrelated full Bun test noise was isolated from Hero proof |
| TASK-272-01 | Hero Centered Media Control and CTA Placeholder Polish | High | Medium | Done (2026-05-19): centered keeps media authoring while hiding centered-only inline frame styling, and CTA placeholders are aligned in Wizard/Visual mode |
| TASK-272-02 | Hero Video Poster and Media Metadata | High | Large | Done (2026-05-19): Hero video now supports poster/title/description plus safe image↔video source resets across editor/runtime/presets |
| TASK-272-03 | Hero Preset Delete Confirmation and Library Management | High | Large | Done (2026-05-19): Hero presets now support confirm-delete, search/sort, JSON import/export, visible normalization warnings, and correct single-CTA round-trips |
| TASK-272-04 | Hero Layout Height Full Bleed and Media Center Variant | High | Very Large | Done (2026-05-19): Hero now supports bounded height/bleed controls and the `media-center` variant end-to-end |
| TASK-272-05 | Hero Shadow, Typography, Font, and Motion Controls | Medium | Large | Done (2026-05-19): Hero now exposes bounded shadow, font-family, weight, and reduced-motion-safe motion tokens |
| TASK-272-06 | Hero Color Palettes and Contrast Guidance | High | Large | Done (2026-05-19): Hero now ships palette presets and shared contrast advisories with explicit `unknown` handling for non-solid surfaces |
| TASK-272-07 | Hero Rich Copy and Social Proof Composition | Medium | Very Large | Done (2026-05-19): Hero now supports sanitized rich copy and a bounded social-proof row without widening shared safety scope |
| TASK-272-08 | Hero Responsive Images and LCP Priority | Medium | Large | Done (2026-05-19): Hero now uses deterministic loading/fetch-priority/sizes policy while true `srcset` variants remain explicitly deferred |
| TASK-272-09 | Hero Report Docs Changelog and Closure | Medium | Medium | Done (2026-05-19): Hero report/docs/board/changelog are synchronized with validation evidence and the explicit BF-07 deferral note |
| TASK-268 | Footer Widget Playwright Product Followups | High | Very Large | Done: footer runtime/editor/docs/report closure is synchronized, while deferred utility and column-reorder backlog now have explicit follow-up tasks |
| TASK-268-01 | Footer Social Icons and External Link Safety | High | Large | Done: footer social links now use icon buttons, accessible naming, modern platform options, and external-link hardening |
| TASK-268-02 | Footer Legal, Brand, and Landmark Semantics | High | Large | Done: footer legal labels are configurable, brand/logo/tagline landed, and landmark/heading semantics are explicit |
| TASK-268-03 | Footer Minimal Variant and Visibility Controls | High | Medium | Done: minimal footer is a dedicated compact layout and legal/social visibility is non-destructive |
| TASK-268-04 | Footer Editor Mode IA and Link Management | High | Large | Done: footer controls are labeled, section padding has one owner, wizard guidance is truthful, and link/social reorder is available |
| TASK-268-05 | Footer Layout, Typography, and Interactive Style Controls | Medium | Large | Done: footer now supports bounded padding, breakpoint, hover, link typography, target controls, and local shared color-picker adoption |
| TASK-268-06 | Footer Report, Docs, Changelog, and Closure | Medium | Medium | Done: footer report/docs/board/changelog are synchronized with validation evidence and named deferred follow-up owners |
| TASK-267 | Feature Grid Widget Playwright Product Followups | High | Very Large | Done: Feature Grid report-driven follow-ups now cover variant previews, drag/remove UX, media picker + alt authoring, bounded layout/style controls, safe CTA/rich descriptions, Wizard guidance, and final closure sync |
| TASK-267-01 | Feature Grid Variant Preview and Responsive Cards-4 Layout | High | Medium | Done: Variant cards now show visual miniatures and cards-4 reaches its four-column desktop baseline at `lg` |
| TASK-267-02 | Feature Grid Card Reorder, Remove, and Item Management | High | Medium | Done: Card rows now support drag-handle reorder, button fallback, and confirm-remove UX |
| TASK-267-03 | Feature Grid Media Picker, Emoji Picker, and Image Priority UX | High | Large | Done: Cards now support media-library picking, bounded emoji presets, explicit `imageAlt`, and image-over-icon guidance |
| TASK-267-04 | Feature Grid Card Layout, Density, and Alignment Controls | High | Large | Done: Added bounded card alignment, padding, media sizing, and horizontal layout controls; hero-top remains explicitly deferred |
| TASK-267-05 | Feature Grid Section Typography, Container, and Hover Controls | Medium | Large | Done: Added section background, width, header/card title sizing, and hover controls with fixed maps |
| TASK-267-06 | Feature Grid CTA Enablement, Target, and Rich Description Authoring | Medium | Large | Done: Added explicit CTA enablement, safe target selection, and sanitized rich description authoring |
| TASK-267-07 | Feature Grid Wizard Guidance and Editor Entry Flow | Medium | Medium | Done: Wizard now explicitly routes richer editing to Visual; first-open mode remains a shared builder decision |
| TASK-267-08 | Feature Grid Report, Docs, Changelog, and Closure | Medium | Medium | Done: Feature Grid report, widget doc, task board, changelog, and final validation evidence are synchronized |
| TASK-305 | Shared Color Control Text and Swatch Contract | High | Medium | Done: the shared swatch-plus-text color contract now exists and Entry Teaser consumes it through widget-local adoption and tests |
| TASK-303 | Divider and Spacer Residual Shared Token Control Adoption | High | Medium | Done: Divider/Spacer shared token-custom controls now collapse duplicate off-states, enter explicit custom mode, and preserve Divider CSS-variable color tokens |
| TASK-265 | Entry Teaser Widget Playwright Product Followups | High | Very Large | Done: admin preview hydration, editor IA cleanup, CTA safety, layout/media controls, shared color adoption, docs closure, validation evidence, and later manual listing-row picking via TASK-304 are synchronized |
| TASK-265-06 | Entry Teaser Shared Color Control Adoption | Medium | Medium | Done: Entry Teaser surface and border fields now use the shared swatch-plus-text control with widget-local adoption coverage |
| TASK-265-05 | Entry Teaser Report, Docs, and Closure | Medium | Medium | Done: report matrix, widget docs, task board, changelog, and final validation evidence are synchronized for the TASK-265 family |
| TASK-265-04 | Entry Teaser Layout, Media, Tags, and Heading Controls | High | Large | Done: section heading, heading levels, media mode/aspect/height/fit, tag limits, max-width, and deterministic image dimensions are shipped and tested |
| TASK-265-03 | Entry Teaser CTA Link and URL Feedback | High | Medium | Done: CTA new-tab safety, CTA style variants, empty custom URLs, and inline URL validation are synchronized across schema, editor, and runtime |
| TASK-265-02 | Entry Teaser Editor IA, Fallback, and Variant Preview | High | Large | Done: source ownership moved to Wizard, variant thumbnails landed, fallback settings are grouped, field previews are visible, and runtime snapshots are copyable |
| TASK-265-01 | Entry Teaser Source Resolution and Admin Preview | High | Large | Done: admin preview resolves real teaser data, source pickers recover from auth/loading failures, listing featured semantics are explicit, and compact entry status labels remain visible |
| TASK-264 | Divider Widget Playwright Product Followups | High | Large | Done: Divider label styling, width/alignment, transparency, spacer-only mode, preview/reset UX, DOM marker hygiene, and closure evidence are synchronized |
| TASK-264-01 | Divider Label Color Typography and Gap Controls | High | Medium | Done: `label-center` now supports separate label color, bounded typography, nowrap, configurable gap, and clear-label UX |
| TASK-264-02 | Divider Width Alignment and Custom Validation | High | Medium | Done: container width is tokenized, non-full dividers align left/center/right, and custom-width drafts keep visible validation feedback |
| TASK-264-03 | Divider Line Style Opacity and Spacer Only Mode | Medium | Medium | Done: Divider exposes bounded transparency, dotted/dashed dash-pattern choices, and spacer-only visibility without new raw CSS surfaces |
| TASK-264-04 | Divider Editor Preview Reset and Wizard UX | Medium | Medium | Done: Wizard/Visual/Advanced now render live preview, Wizard owns compact color/width/spacing controls, and reset actions stay data-only |
| TASK-264-05 | Divider Runtime DOM Marker Hygiene | Medium | Small | Done: public Divider DOM now emits bounded marker kinds instead of raw color/width/margin strings |
| TASK-264-06 | Divider Report Docs and Closure | Medium | Medium | Done: Divider report, widget doc, changelog, board, and validation evidence now reflect the final shipped contract |
| TASK-275 | Navigation Widget Playwright Product Followups | High | Very Large | Done (2026-05-19): Navigation logo links, mobile modes, dropdown/runtime accessibility, truthful menu previews, bounded style/brand controls, and closure docs landed; live preview now lands through TASK-317 and the former sticky frontend blocker was closed by TASK-318 |
| TASK-275-01 | Navigation Logo and Safe Link Parity | High | Medium | Done (2026-05-19): the logo now renders as a safe link, Wizard/Visual logo fields are labelled, and editor hash URL feedback matches runtime normalization |
| TASK-275-02 | Navigation Mobile Drawer and Minimal Mode | High | Large | Done (2026-05-19): drawer owns toggle icon/state/focus/CTA behavior, while minimal now renders a true reduced mobile header without the drawer panel |
| TASK-275-03 | Navigation Dropdown and Rich Link Metadata | High | Large | Done (2026-05-19): submenu disclosure buttons, root nav labelling, plain-text icon/badge/description output, and touch/keyboard dropdown state are synchronized |
| TASK-275-04 | Navigation Link Management UX | Medium | Large | Done (2026-05-19): move controls, limit feedback, child-link grouping, Wizard overflow summary, and truthful synced menu previews landed in the Visual/Wizard editors |
| TASK-275-05 | Navigation Optional Style and Product Controls | Medium | Very Large | Done (2026-05-19): the optional Navigation backlog shipped through the physical child leaves for collapse, active links/targets, visual tokens, and brand/CTA controls |
| TASK-275-05-01 | Navigation Collapse Runtime Contract | Medium | Medium | Done (2026-05-19): `collapseOnScroll` now toggles root-scoped collapsed state without claiming the shared Section sticky blocker routed to TASK-318 |
| TASK-275-05-02 | Navigation Active Links and Safe Targets | Medium | Medium | Done (2026-05-19): manual links support bounded self/new-tab targets and client-side active-link modes while keeping one semantic current link per root and leaving menu/pages sources same-tab |
| TASK-275-05-03 | Navigation Visual Style Tokens | Medium | Large | Done (2026-05-19): hover/active colors, underline, letter spacing, shadow, blur, dropdown direction, motion, and live color feedback are synchronized |
| TASK-275-05-04 | Navigation Brand CTA and Logo Controls | Medium | Medium | Done (2026-05-19): logo size, CTA radius/separator, Wizard CTA copy, and the explicit Right Actions secondary-action policy are documented and tested |
| TASK-275-06 | Navigation Report Docs Changelog and Closure | Medium | Medium | Done (2026-05-19): the report, widget docs, changelog, board rows, and scope-local validation evidence are synchronized for the TASK-275 family |
| TASK-302 | Content List Block Shared Renderer and Color Control Residuals | High | Large | Done: shared `ContentListBlock` / `PostsFeedBlock` truthfulness, image/CTA renderer residuals, and Content List text-color clear/picker adoption are synchronized and validated |
| TASK-276 | Newsletter Widget Playwright Product Followups | High | Very Large | Done (2026-05-19): Newsletter report findings now map to bounded widget/runtime/editor owners, shared Forms runtime reuse, final docs closure, and one explicit deferred responsive follow-up (`TASK-319`) |
| TASK-276-01 | Newsletter Form Semantics, Consent, and Accessibility | High | Large | Done (2026-05-19): email/consent semantics now use stable names, ids, labels, autocomplete, and safe non-submitting fallback behavior |
| TASK-276-02 | Newsletter Submission States and Public Write Hardening | High | Very Large | Done (2026-05-19): Forms-runtime submit now reuses shared loading/success/error/nonce/CAPTCHA behavior with truthful redirect and analytics diagnostics |
| TASK-276-03 | Newsletter Integration Validation and Transport Diagnostics | High | Large | Done (2026-05-19): action URLs are validated, static `/forms/:id/submissions` misuse is blocked, and Advanced transport diagnostics are explicit |
| TASK-276-04 | Newsletter Editor Mode Ownership and Variant Guidance | High | Medium | Done (2026-05-19): Visual is the single variant owner, minimal/mobile/consent guidance is explicit, and success preview is local-only |
| TASK-276-05 | Newsletter Field Expansion and Double Opt-In Model | Medium | Large | Done (2026-05-19): Newsletter now supports bounded first-name metadata and provider-owned double opt-in copy without inventing a fake backend owner |
| TASK-276-06 | Newsletter Visual Style, Width, and Contrast Controls | Medium | Large | Done (2026-05-19): Newsletter now supports bounded width/text/button styling, transparent background guidance, contrast advisories, and explicit spacing handling |
| TASK-276-07 | Newsletter Report, Docs, Changelog, and Closure | Medium | Medium | Done (2026-05-19): report/docs/board/changelog are synchronized with focused evidence and the deferred BF-15 follow-up is now a physical task |
| TASK-263 | CTA Banner Widget Playwright Product Followups | High | Very Large | Done: CTA runtime, Wizard/Visual UX, button styling, safe CTA conversion options, shared-layout full-width parity, background/media/motion controls, report/docs sync, and closure validation are complete |
| TASK-263-01 | CTA Banner Runtime Semantics and Accessibility | High | Large | Done: empty badge suppression, section labelling, focus-visible CTA links, truthful description color, and border-width semantics are covered |
| TASK-263-02 | CTA Banner Wizard and Action Editing UX | High | Large | Done: Wizard variant cards, primary/secondary URLs, labelled action fields, invalid URL feedback, and intentional secondary visibility landed |
| TASK-263-03 | CTA Banner Visual Style and Button Controls | High | Large | Done: CTA text/button clear adoption, button border controls, and independent button radius/size controls landed in Visual mode |
| TASK-263-04 | CTA Banner Link Target and Conversion Options | Medium | Large | Done: safe new-tab link attrs, icon enums, tertiary CTA, and description visibility are synchronized across runtime and editor |
| TASK-263-05 | CTA Banner Layout Media and Motion Options | Medium | Large | Done: CTA wrapper cleanup now honors shared block full-width, while CTA-owned gradient, background media, and CSS-safe motion controls are documented and tested |
| TASK-263-06 | CTA Banner Report Docs and Closure | Medium | Medium | Done: CTA report matrix, widget docs, changelog, board rows, and final validation evidence are synchronized |
| TASK-262 | Content List Widget Playwright Product Followups | High | Very Large | Done: source/filter IA, section context, saved-data canvas guidance, bounded pagination actions, tag badges, preview cards, report refresh, board sync, and changelog closure are aligned |
| TASK-262-01 | Content List Source Picker and Filter Editor IA | High | Large | Done: source labels are friendly, content types are searchable/deduplicated, taxonomy suggestions use the taxonomy overview seam, and author filtering uses a picker/search flow |
| TASK-262-02 | Content List Section Empty State and Static Canvas Guidance | High | Large | Done: Content List owns section heading/description, source-aware empty copy, and editor-side saved-data canvas guidance |
| TASK-262-03 | Content List Pagination and View All Navigation | High | Very Large | Done: bounded `paged` / `load-more` / `view-all` actions land across schema, resolver, public output, and editor controls without introducing a second listing parser |
| TASK-262-04 | Content List Layout Media Tags and Card Preview Controls | High | Large | Done: tag badges plus variant/card-style preview cards are local to Content List after shared renderer residuals moved to TASK-302 |
| TASK-262-05 | Content List Report Docs and Closure | Medium | Medium | Done: the report, widget docs, task board, changelog, and final validation evidence are synchronized for TASK-262 and TASK-302 |
| TASK-261 | Contact Widget Playwright Product Followups | High | Very Large | Done: Contact header/detail semantics, static-safe form behavior, Forms runtime bridge, editor parity, map/layout/social options, docs, and closure evidence are synchronized |
| TASK-261-01 | Contact Header, Details Links, and Semantic Output | High | Large | Done: Contact exposes section/panel headings, semantic detail markup, bounded icons, and safe tel/mailto links |
| TASK-261-02 | Contact Form Field Metadata and Public Submission Bridge | High | Very Large | Done: Contact field metadata, static no-GET safety, and Forms runtime bridge landed through the physical child leaves |
| TASK-261-02-01 | Contact Field Metadata and Accessible HTML | High | Large | Done: Contact fields emit stable ids/names/autocomplete plus schema-owned labels, placeholders, and layout spans |
| TASK-261-02-02 | Contact Static Form State and No-GET Safety | High | Medium | Done: presentational Contact forms no longer native-GET the current page and now show explicit static state copy |
| TASK-261-02-03 | Contact Forms Runtime Bridge and Public-Write Hardening | High | Large | Done: Contact can bind to existing Forms records with strict type-safe mapping, public-only runtime gating, nonce hydration, and route/security proof |
| TASK-261-03 | Contact Editor Mode Parity and Minimal Variant UX | High | Large | Done: Wizard/Visual/Advanced mode ownership is clearer, minimal-form UX is truthful, and diagnostics/normalization feedback are synchronized |
| TASK-261-04 | Contact Map Validation, Fallback, and Display Controls | Medium | Medium | Done: Contact map title/description, height, validation, fullscreen, and fallback behavior are landed |
| TASK-261-05 | Contact Layout, Social Links, and Normalizer Polish | Medium | Medium | Done: bounded width/padding/social controls and explicit default normalizer handling are synchronized |
| TASK-261-06 | Contact Report, Docs, Changelog, and Closure | Medium | Medium | Done: Contact report status matrix, widget docs, board/changelog sync, and final validation evidence are recorded |
| TASK-260 | Compare Timeline Widget Playwright Product Followups | High | Very Large | Done: Compare Timeline renderer, editor, schema, report, docs, and closure evidence are synchronized; W7/W8 now route to exact follow-up owners `TASK-299` and `TASK-300` |
| TASK-260-01 | Compare Timeline Renderer Truthfulness and Accessibility | High | Large | Done: responsive grid truthfulness, guide-off behavior, static ARIA labels, fallback highlight fill, and overflow/min-height safety are covered |
| TASK-260-02 | Compare Timeline Segment Editing and Highlight Model | High | Large | Done: both-track highlight targets, Wizard/Visual segment editing, preserved hidden-segment copy, range feedback, and friendly target labels are landed |
| TASK-260-03 | Compare Timeline Axis Steps and Content Controls | High | Large | Done: Visual add/remove controls, Wizard/Visual step descriptions, `3-10` axis range, step icons, and safe step/segment links are synchronized |
| TASK-260-04 | Compare Timeline Layout Typography and Visual Polish | Medium | Large | Done: heading, width, padding, font weights, track order/background, marker shapes, variant previews, shared clear adoption, and layout mode cleanup are synchronized |
| TASK-260-05 | Compare Timeline Report Docs and Closure | Medium | Medium | Done: report/widget docs/changelog/board/status closure is synchronized with focused validation and exact deferred owner tasks |
| TASK-259 | Booking Calendar Widget Playwright Product Followups | High | Very Large | Done: admin preview parity, signed date policy, service context, loading/abort/clear selection, week picker, variants, default pickers, and the later shared/admin rows are now also landed |
| TASK-259-01 | Booking Calendar Admin Preview Runtime Catalog Parity | High | Large | Done: page-builder preview hydrates booking catalog data into BlockList/editor context without persisting preview-only `resolved` payloads |
| TASK-259-02 | Booking Calendar Date Defaults, Range, and Past-Date Safety | High | Large | Done: widget-owned date defaults/range render, signed slots-token claims, and public route/service past-date enforcement are synchronized |
| TASK-259-03 | Booking Calendar Service Context and Timezone Copy | High | Large | Done: service price/duration/description, timezone copy, summary locale/date style, and user-facing empty-state copy are product-owned and covered |
| TASK-259-04 | Booking Calendar Loading, Concurrency, and Selection UX | High | Large | Done: runtime loading skeleton, abort/stale-response guard, refresh busy state, and clear-selection flow are synchronized |
| TASK-259-05 | Booking Calendar Availability Calendar and Slot Density | High | Very Large | Done: bounded week picker availability signals and slot-density interval modes are synchronized without widening into a new public summary route |
| TASK-259-06 | Booking Calendar Layout Variants and Mobile Styling | Medium | Large | Done: compact/inline/horizontal variants, mobile control layout, and selected/hover slot styling are widget-owned and tested |
| TASK-259-07 | Booking Calendar Default Pickers and Diagnostics | Medium | Medium | Done: admin preview catalog data now powers default service/resource pickers and truthful runtime diagnostics |
| TASK-259-08 | Booking Calendar Report, Docs, and Closure | Medium | Medium | Done: report/docs/changelog/board and final validation evidence are synchronized for the TASK-259 family |
| TASK-258 | Appointment Form Widget Playwright Follow-Up | High | Very Large | Done: runtime/editor/public-write follow-up is synchronized with focused validation, report closure, landed shared booking-flow context, landed custom-field surface, and changelog evidence |
| TASK-258-01 | Runtime State, Admin Preview, and Submission Feedback | High | Large | Done: disabled parity, loading copy, stale-error reset, and selection clearing are landed with the runtime DOM suite |
| TASK-258-02 | Field Validation, Visibility, and Accessibility | High | Large | Done: truthful field toggles, split-name mode, required flags, phone pattern, notes bounds, autocomplete, and form naming are landed |
| TASK-258-03 | Flow Pairing, Slot Context, Locale, and Redirect | High | Large | Done: summary context, locale formatting, safe redirect, and shared same-surface booking-flow editor context are landed |
| TASK-258-04 | Consent, Custom Fields, and Public Write Hardening | High | Large | Done: consent UI, public CAPTCHA bridge, bounded metadata schema, runtime hydration, and the later custom-field surface are landed |
| TASK-258-05 | Style, Variants, and Advanced Diagnostics | High | Large | Done: local variants, submit text color, and read-only diagnostics are landed; shared clearable-state indicators stay routed to `TASK-256-02` |
| TASK-258-06 | Playwright Report, Docs, and Closure | Medium | Medium | Done: widget docs, report closure matrix, changelog, board sync, and final validation evidence are synchronized |
| TASK-257 | Accordion Widget Playwright Product Followups | High | Large | Done: Accordion-specific product follow-ups are closed with explicit all-collapsed state, local style/typography/motion controls, icon/copy polish, and the landed shared repeatable-slot seam |
| TASK-257-01 | Accordion Initial Open State Product Options | High | Medium | Done: Accordion now preserves intentional all-collapsed initial state when all-closed behavior is allowed |
| TASK-257-02 | Accordion Style Layout and Typography Controls | High | Large | Done: Accordion now ships body color, max-width, padding, radius, title typography, and color-picker parity controls |
| TASK-257-03 | Accordion Item Content and Management UX | High | Large | Done: Accordion item icons and clearer all-closed copy landed; shared add/reorder now lands through TASK-293 |
| TASK-257-04 | Accordion Motion and Variant Preview Polish | Medium | Medium | Done: Accordion now exposes bounded motion presets and visual variant preview cards |
| TASK-257-05 | Accordion Report Docs and Closure | Medium | Medium | Done: report/docs/board/changelog are synchronized with final fixed/deferred ownership and validation evidence |
| TASK-306 | FAQ Accordion Shared Contract Residuals | High | Large | Done: FAQ chevron/ARIA, spacing guard/border collapse, and border/divider clear adoption are now repaired as a dedicated shared follow-up outside TASK-266 |
| TASK-266 | FAQ Accordion Widget Playwright Product Followups | High | Very Large | Done: FAQ-local layout, rich answers, JSON-LD, editor UX, item management, docs, and closure evidence are synchronized |
| TASK-266-01 | FAQ Accordion Layout Typography and Motion Controls | High | Large | Done: FAQ now exposes bounded width, alignment, padding, typography, radius, border-width, and motion controls across schema, editor, runtime, and tests |
| TASK-266-02 | FAQ Accordion Rich Answers and Item Icon Model | High | Large | Done: FAQ answers support a bounded markdown subset, per-item icons, and shared safe-href link handling with plain-text extraction for SEO |
| TASK-266-03 | FAQ Accordion SEO Structured Data Contract | High | Medium | Done: FAQ now emits opt-in safe `FAQPage` JSON-LD from normalized question and answer text |
| TASK-266-04 | FAQ Accordion Wizard and Open State Editor UX | Medium | Medium | Done: Wizard/Visual/Advanced now cover description, item counts, question-aware open labels, and clearer all-collapsed guidance |
| TASK-266-05 | FAQ Accordion Item Management and Variant Preview Polish | Medium | Large | Done: FAQ item editing now includes remove confirmation, compact actions, variant miniatures, native drag/drop reorder, and bounded bulk delete |
| TASK-266-06 | FAQ Accordion Report Docs and Closure | Medium | Medium | Done: FAQ report, widget docs, changelog, board state, and final validation evidence are synchronized |
| TASK-256 | Widget Shared Contract Playwright Drift Repair | High | Very Large | Done: shared builder patching, placeholder gating, interactive runtime IDs, structural shared fixes, marketing truthfulness repairs, report routing, and closure evidence are synchronized |
| TASK-256-01 | Shared Editor Mode and Atomic Update Contract | High | Large | Done: builder hosts and shared panels use atomic block patching, and variant/data sync regressions are covered across the affected widget editors |
| TASK-256-02 | Clear, None Token, and Design Token Controls | High | Large | Done: shared clear/token semantics are synchronized with the implemented widget surfaces and validated through the focused clear/token suites |
| TASK-256-03 | Slot Nested Content and Public Placeholder Safety | High | Large | Done: public placeholder leakage now fails closed through shared render context while editor-preview keeps structural affordances |
| TASK-256-04 | Interactive Runtime Instance and Accessibility Contract | High | Large | Done: interactive widgets use scoped runtime IDs/selectors and shared accessibility relationships instead of page-global collisions |
| TASK-256-05 | Structural Widget Report Findings | High | Very Large | Done: the structural shared-contract slices landed across section/grid, split/stack, spacer/divider, and tabs/accordion/toggle |
| TASK-256-05-01 | Section and Grid Columns Structural Findings | High | Medium | Done: section anchors and heading baseline are hardened, grid public technical labels are hidden, and structure drift is surfaced truthfully in the editor |
| TASK-256-05-02 | Split Layout and Stack Variant Data Sync | High | Medium | Done: split-layout and stack variant changes now keep persisted data aligned with the selected variant |
| TASK-256-05-03 | Spacer and Divider Token Control Findings | High | Medium | Done: spacer fixed/responsive behavior is truthful, divider advanced controls are no longer inert, and runtime separator semantics are covered |
| TASK-256-05-04 | Tabs, Accordion, and Toggle Block Structural Residuals | High | Medium | Done: interactive structural placeholders, slot labels, and scoped runtime relationships are aligned with shared TASK-256 contracts |
| TASK-256-06 | Marketing Widget Report Findings | High | Very Large | Done: shared marketing/content contract repairs landed across the covered child leaves without widening into widget-specific product backlogs |
| TASK-256-06-01 | Feature Grid and Stats KPI Truthful Controls | High | Medium | Done: feature-grid and stats-kpi controls now match runtime behavior, including variant/count, divider, grid, and accessibility truthfulness |
| TASK-256-06-02 | CTA Banner, Logo Cloud, and Gallery Media Links | High | Large | Done: shared safe-link/media semantics now cover logo-cloud and gallery-mosaic while CTA-specific product scope stays routed to TASK-263 |
| TASK-256-06-03 | Hero, Timeline, Pricing, FAQ, and Testimonials Accessibility | High | Large | Done: shared Hero/Pricing/FAQ/Testimonials closure evidence is synchronized while Timeline-specific implementation remains routed to TASK-291 |
| TASK-256-06-04 | Team Profile Links and Accessibility | High | Medium | Done: current shared Team accessibility baseline is synchronized and richer team product scope remains routed to TASK-289 |
| TASK-256-07 | Cross-Report Shared Contract Classification | High | Medium | Done: late report groups are routed to executable TASK-256 shared slices or existing widget-specific follow-up families instead of widening the umbrella |
| TASK-256-08 | Playwright Report Completion and Closure | Medium | Medium | Done: report status sections and closure evidence are synchronized after the post-close Team/Accordion/Toggle/Testimonial fixes, while Form Embed remains explicit `needs-refresh` scope under TASK-269 rather than fixed shared implementation |
| TASK-314 | Logo Cloud Shared Contract Residual Reopen | High | Large | Done: reopened Logo Cloud shared prerequisites were closed before `TASK-274`, covering shared Link URL feedback, shared heading semantics, and safe `logoHeight: "none"` output |
| TASK-314-03 | Logo Cloud Shared Residual Closure | Medium | Medium | Done: report/docs/changelog/board closure captured the Logo Cloud shared reopen before widget-local product work continues |
| TASK-314-02 | Logo Cloud Shared Runtime Semantics Residuals | High | Large | Done: Logo Cloud now uses the shared `<h2>` section-heading shell, fallback region naming, and bounded `logoHeight: "none"` runtime output |
| TASK-314-01 | Logo Cloud Shared Editor Truthfulness Residuals | High | Large | Done: Advanced is diagnostics-only for shared tokens, and Visual `Link URL` inputs now show truthful shared safe-link feedback |
| TASK-274-01 | Logo Cloud Header Background and Typography | High | Large | Done (2026-05-19): Logo Cloud now exposes widget-owned eyebrow, section background, and bounded header alignment/size across schema, editor, runtime, and focused tests |
| TASK-274-02 | Logo Cloud Logo Asset Authoring and Previews | High | Large | Done (2026-05-19): Wizard and Visual now own logo image/alt/link authoring, Media Library picking, bounded previews, async media failure handling, and runtime alt fallback proof |
| TASK-274-03 | Logo Cloud Item Management and Reorder | High | Large | Done (2026-05-19): Visual now supports drag-handle reorder, inline Undo after remove, stale-drop guards, and retained Move up / Move down fallback controls |
| TASK-274-04 | Logo Cloud Dense Strip and Marquee Layouts | Medium | Large | Done (2026-05-19): Dense now eases smaller breakpoints, Strip supports single-row overflow, and marquee runs through shared admin/runtime style owners with reduced-motion-safe pause behavior |
| TASK-274-05 | Logo Cloud Tile Link and CTA Controls | Medium | Large | Done (2026-05-19): Logo Cloud now owns bounded tile radius/border-width controls, a global new-tab link toggle, and a safe optional CTA below the logo list |
| TASK-274-06 | Logo Cloud Report Docs and Closure | Medium | Medium | Done (2026-05-19): report/docs/changelog/board now record the final owner matrix and family-scoped validation evidence for all Logo Cloud follow-up findings |
| TASK-274 | Logo Cloud Widget Playwright Product Followups | High | Very Large | Done (2026-05-19): shared TASK-314 prerequisites plus product-owned leaves `274-01`..`274-05` and final closure now fully resolve the Logo Cloud Playwright follow-up family |
| TASK-269 | Form Embed Widget Playwright Product Followups | High | Very Large | Done: Form Embed renderer, runtime script, safe captcha bridge, editor-mode diagnostics, docs, report status matrix, and targeted validation are synchronized |
| TASK-269-01 | Form Selection, Editor Modes, and Admin Diagnostics | High | Large | Done: Wizard/Visual/Advanced are split and selected-form diagnostics now cover status, field count/types, multi-step, resolver errors, and no-form CTA states |
| TASK-269-02 | Field Type Rendering and Field Accessibility | High | Large | Done: current supported field types render with stable ids, helper linkage, required semantics, and unsupported-type diagnostics for out-of-model payloads |
| TASK-269-03 | Variants, Layout, and Form Surface Styling | High | Large | Done: the current variant contract is truthful and Form Embed now owns section padding, field gap, heading, title, helper, and submit-button styling controls |
| TASK-269-04 | Multi-Step Controls and Stored Progress | High | Large | Done: Back/Next labels, progress indicator, and saved-progress TTL are implemented in runtime and surfaced in the editor |
| TASK-269-05 | Submission Runtime Feedback and Public Write Projection | High | Large | Done: busy state, success behaviors, redirect handling, live regions, nonce projection, and safe captcha-site-key bridging are aligned to the existing Forms policy |
| TASK-269-06 | Form Embed Report, Docs, and Closure | Medium | Medium | Done: report rows have final owners/statuses, widget docs are updated, and board/changelog/validation closure is synchronized |
| TASK-255 | Admin Breadcrumb Renderer and Workspace Resource Links | High | Medium | Done: TopBar renders clickable shorthand/structured breadcrumbs, existing admin pages use label arrays, and collection workspace cards link to their owner surfaces |
| TASK-254 | Detail Template Workspace Create Delete Actions | High | Medium | Done: content-type editor links to collection workspace, which can create, route-link, open, confirm-delete, and unlink canonical detail templates with shared admin notifications |
| TASK-253 | Detail Template Content Field Bindings | High | Medium | Done: detail template editor exposes Data bindings for selected blocks so widget copy stays fallback while public detail runtime overlays linked entry values |
| TASK-252 | Widget Configuration IA and Pages Widget Expansion | High | Very Large | Done: research archive, shared inspector IA, per-widget owner-model updates, proof matrix, docs, board sync, and full closure validation are complete |
| TASK-252-08 | QA, Docs, Changelog, and Board Closure | Medium | Medium | Done: proof matrix, board/changelog sync, and full lint/Bun/Vitest/security strict validation are landed |
| TASK-252-07 | Dynamic and Operational Widget Editor Expansion | High | Large | Done: dynamic and operational widget editors are aligned to shared inspector IA, focused docs, and runtime-safe ownership |
| TASK-252-07-15 | Footer Columns Brand Legal and Social Links | High | Medium | Done: footer legal/social links use shared safe-href normalization with focused runtime coverage |
| TASK-252-07-14 | Navigation Source Links Mobile Menu and CTA | High | Large | Done: navigation safe-href normalization, mobile toggle/panel runtime, docs, and focused tests are synchronized |
| TASK-252-07-13 | Contact Form Info State Copy and Security Boundaries | High | Large | Done: contact widget contract, docs, research proof, and focused validation remain synchronized under existing security boundaries |
| TASK-252-07-12 | Form Embed Form Picker Fields and State Copy | High | Large | Done: form-embed widget contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-11 | Appointment Form Fields Validation Copy and States | High | Large | Done: appointment form copy/state contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-10 | Booking Calendar Provider Event Modes and Availability | High | Large | Done: booking calendar provider/mode contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-09 | Newsletter Fields Consent Copy and States | High | Large | Done: newsletter field, consent, and submit-state contract remains synchronized with focused widget coverage |
| TASK-252-07-08 | Search Box Copy Target Route Query Param and Display Mode | High | Medium | Done: route-submit mode, target route, query param, display mode, docs, and focused tests are landed |
| TASK-252-07-07 | Listing Filters Facets Ranges Apply and Reset | High | Large | Done: listing filters contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-06 | Product Table Columns Sort Filter and Pagination | High | Large | Done: product table contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-05 | Product Compare Selected Products Attributes and Highlight | High | Large | Done: product compare contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-04 | Product Gallery Source Media Modes Thumbnails and Empty State | High | Large | Done: product gallery contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-03 | Entry Teaser Selected Entry Fallback and Field Toggles | High | Medium | Done: entry teaser editor shared-section parity and CTA safe-href normalization are landed with focused tests |
| TASK-252-07-02 | Posts Feed Source Density Author Date and Category | High | Medium | Done: posts-feed contract, docs, research proof, and focused validation are synchronized |
| TASK-252-07-01 | Content List Source Display Field Visibility and Empty States | High | Large | Done: content-list contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06 | Content and Marketing Widget Editor Expansion | High | Large | Done: content widget editors are aligned to shared inspector IA, focused docs, and runtime-safe ownership |
| TASK-252-06-11 | Compare Timeline Two Track Segments Status and Highlight | High | Medium | Done: compare-timeline contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-10 | Rich Text Section Prose Presets Width Badge and CTA | High | Medium | Done: rich-text-section contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-09 | Team Members Photo Shape Socials and Fallbacks | Medium | Medium | Done: team widget contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-08 | Stats KPI Values Icons and Display Modes | Medium | Medium | Done: stats-kpi contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-07 | Gallery Mosaic Layout Captions and Alt Text | High | Medium | Done: gallery-mosaic contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-06 | Logo Cloud Grid Tone Rows and Accessibility | Medium | Medium | Done: logo-cloud contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-05 | CTA Banner Compact Split Badge and Icon | High | Medium | Done: CTA banner shared-section parity, safe CTA href normalization, docs, and focused tests are landed |
| TASK-252-06-04 | FAQ Accordion Support CTA Icon Placement and Defaults | High | Medium | Done: FAQ accordion contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-03 | Pricing Plans Tiers Billing Toggle and Highlight | High | Large | Done: billing toggle, per-cycle prices, feature marker, docs, and focused tests are landed |
| TASK-252-06-02 | Testimonials Grid Spotlight Rating and Attribution | High | Medium | Done: testimonials contract, docs, research proof, and focused validation are synchronized |
| TASK-252-06-01 | Feature Grid Icon Cards Rows and Links | High | Medium | Done: feature-grid shared-section parity, safe CTA href normalization, docs, and focused tests are landed |
| TASK-252-05 | Layout and Structural Widget Editor Parity | High | Large | Done: structural widget editors now use shared inspector IA with aligned owner/runtime/docs proof |
| TASK-252-05-10 | Toggle Block State Switch and Accessible Content Swap | High | Medium | Done: toggle-block radiogroup runtime semantics, editor metadata, docs, and focused tests are landed |
| TASK-252-05-09 | Accordion Disclosure Default Open and Accessibility | High | Medium | Done: accordion open-mode/default-open/collapsible contract, docs, and focused tests are landed |
| TASK-252-05-08 | Tabs Accessible Panels Default Tab and Surface | High | Medium | Done: tabs orientation/default-tab contract, aria wiring, keyboard sync path, docs, and focused tests are landed |
| TASK-252-05-07 | Divider Orientation Style Tone and Spacing | Medium | Small | Done: divider owner/runtime surface, shared inspector sections, docs, and focused validation are synchronized |
| TASK-252-05-06 | Spacer Size Tokens Custom Height and Canvas Affordance | Medium | Small | Done: spacer owner/runtime surface, shared inspector sections, docs, and focused validation are synchronized |
| TASK-252-05-05 | Stack Direction Gap Alignment and Responsive Flow | High | Medium | Done: stack owner/runtime surface, shared inspector sections, docs, and focused validation are synchronized |
| TASK-252-05-04 | Split Layout Slot Order and Mobile Stack | High | Medium | Done: split-layout owner/runtime surface, shared inspector sections, docs, and focused validation are synchronized |
| TASK-252-05-03 | Grid Columns Presets Gaps and Mobile Stack | High | Medium | Done: grid-columns owner/runtime surface, shared inspector sections, docs, and focused validation are synchronized |
| TASK-252-05-02 | Template Section Metadata Preview and Sync | High | Medium | Done: template metadata/preview seams, shared inspector sections, docs, and focused tests are landed |
| TASK-252-05-01 | Section Regions Semantics and Spacing | High | Large | Done: section layout width/padding owner fields, visual regions placement, docs, and focused tests are landed |
| TASK-252-04 | Timeline Chronology and Editor IA | High | Large | Done: timeline chronology/status/date/CTA owner-model work, docs, and focused validation are complete |
| TASK-252-04-01 | Timeline Chronology Modes and Editor IA | High | Large | Done: mode/date/status/CTA runtime contract, shared editor parity, docs, and focused tests are landed |
| TASK-252-03 | Hero Editor Mode and Badge Expansion | High | Large | Done: hero badge/runtime safe-href work, shared inspector migration, docs, and focused validation are complete |
| TASK-252-03-01 | Hero Badge Announcement and Editor IA | High | Large | Done: hero badge schema/render/safe-href slice, shared editor parity, docs, and focused tests are landed |
| TASK-252-01 | Widget Inspector IA and Shared Option Architecture | High | Large | Done: compact selected-widget header, shared section/control primitives, automation metadata, and builder-owned Visual slot placement are landed |
| TASK-252-02 | Widget Research Archive and Variant Model | High | Medium | Done: 38 Pages-publishable widgets now have license-safe `_docs/_WIDGETS/tmp/<widget>/` research cards and Keep/Adapt/Reject matrices |
| TASK-190-08-04 | Live Provider Matrix Approval and Rerun | High | Small | Done: user-approved opt-in live provider rerun fixed live CMS harness trust-flag drift and passed route/CMS OpenAI/OpenRouter gates |
| TASK-190 | Blueprint Composer Foundation | High | Very Large | Done: capability manifests, candidate planning, graph/conflict policy, schema/listing/page/admin/detail-page composition, collection workspace/editor context, no-duplicate reuse, review metadata, fixture/live matrices, diagnostics, docs, and closure gates are complete; second-pass live rerun passed in TASK-190-08-04 |
| TASK-190-08 | Evaluation, Docs, and Closure | High | Large | Done: deterministic fixture/red-team corpus, live-provider composition matrix, authoring guide, redacted diagnostics serialization, source-of-truth docs, changelog, board closure, and second-pass live rerun are synchronized |
| TASK-190-08-02 | Docs, Changelog, and Closure | High | Medium | Done: final docs, changelog, task board, security notes, validation evidence, and second-pass live rerun are synchronized for TASK-190 closure |
| TASK-190-08-03 | Capability Authoring Guide and Observability | High | Medium | Done: `_docs/BLUEPRINT_COMPOSER.md`, docs index updates, architecture/testing/site-builder references, and redacted composition diagnostics serialization are landed |
| TASK-190-08-01 | Composition Fixture Matrix and Red-Team Corpus | High | Medium | Done: single-pack regressions, mixed-capability composition, gated booking/checkout, Mabudo-like tier-A parity, catalog reuse, provider red-team safety, media safety, LLM-unavailable gate, and live-provider composition matrix are covered |
| TASK-190-05 | Page Section and Widget Composer | High | Large | Done: section alias/slot vocabulary, deterministic widget/pack mapping, page-upsert collection-link persistence, detail-page storage/schema/bindings/runtime/preview/admin/API/cache/fixture acceptance, and generic detail-page resource integration are landed |
| TASK-190-05-03 | Detail Page Composition and Content Route Sections | High | Very Large | Done: persisted detail-page documents/revisions, route linkage, runtime/preview/cache, typed `detail-page.upsert`, admin route/client/cache parity, fixture/runtime acceptance, and generic policy/provider/target-resolver integration are landed |
| TASK-190-05-03-08 | Detail Page Generic Assistant Resource Integration | High | Medium | Done: `detail-page` is in the strict generic resource vocabulary, provider packages bounded summaries, target resolution accepts trusted catalog/content-type/active-surface matches only, and generic mutations stay gated |
| TASK-190-07 | Action Assembly, Execution, and No-Duplicate Safety | High | Large | Done: typed composition assembly, conflict needs-input/gated routing, listing projection widening, catalog-backed existing-resource reuse, DB-backed no-duplicate proof, and strict review metadata are landed |
| TASK-190-07-03 | Composition Review Metadata and Diagnostics | High | Medium | Done: `metadata.blueprintComposition` explains primary/adjunct/gated choices, merged resources, reuse matches, conflicts, and candidate scores in a strict redacted schema |
| TASK-190-07-02 | No-Duplicate Idempotency and Existing Resource Reuse | High | Large | Done: bounded detail-page catalog summaries, `blueprintExistingResourceMatcher.ts`, page/detail/custom-screen/media reuse safeguards, ambiguous-name conflicts, and DB-backed no-duplicate proof are landed |
| TASK-190-07-01 | Composition Action Assembler | High | Large | Done: current fragments assemble deterministically through existing typed actions, supported mixed setup requests stay on the composed path, and blocking conflicts produce typed needs-input/gated plans |
| TASK-190-06 | Admin Surface Composer | High | Large | Done: admin-screen layout composition, binding/metadata safety, collection workspace route/read/cache/UI, detail-template editor, and assistant workspace/detail-page follow-up context are landed |
| TASK-190-06-03 | Collection Workspace and Template Editor | High | Large | Done: collection workspace route/read model/canonical resolution/cache/UI, detail-template editor, and assistant workspace/detail-page context are landed |
| TASK-190-06-03-03 | Collection Workspace Assistant Context and Follow-Up Integration | High | Medium | Done: workspace route hints, `detail-page` active surface publishing, strict schema boundary, server-side workspace/detail-page hydration, provider packaging, and route permission parity are landed |
| TASK-190-06-03-02 | Detail Template Editor Surface and Shared Builder Seams | High | Large | Done: detail-page editor route, shared page-builder surface, sample-entry preview picker, detail-page lifecycle/revision actions, and Engine prefetch are landed |
| TASK-190-06-03-01 | Collection Workspace Route, Read Model, and Canonical Resource Linking | High | Medium | Done: route/read model, canonical resolution, cached client helpers, Engine prefetch, and first workspace shell are landed for current route/detail/list/listing/admin-screen owner seams |
| TASK-190-06-03-01-03 | Collection Workspace Client Cache, Prefetch, and UI Shell | High | Medium | Done: `contentTypes:collectionWorkspace:<contentTypeId>` cache helpers, specific Engine prefetch, and route-local workspace shell are landed |
| TASK-190-06-03-01-02 | Collection Workspace Canonical Resolution and Read Permissions | High | Medium | Done: workspace canonical route/detail/list/listing/admin-screen links now resolve from owner seams with unresolved candidates and owner-read redaction |
| TASK-190-06-03-01-01 | Collection Workspace Route and Server Read Model | High | Medium | Done: internal `GET /content-types/:id/collection-workspace` and `/advanced/engine/:contentTypeId/collection` route landing now expose a bounded server-owned workspace summary |
| TASK-190-06-02 | Admin Bindings, Routes, and Permission Safety | High | Medium | Done: safe custom-screen binding composition plus persisted `collectionRole` / `compositionKey` metadata now round-trip through schema, service, client, assistant actions, and DB migration |
| TASK-190-06-01 | Admin Screen Layout Composer | High | Medium | Done: shared admin-surface composer now merges custom-screen field groups into deterministic `screen-*` blocks, validates schema fields, rejects secret-like references, and keeps generated blocks inside `custom-screen-builder` |
| TASK-190-02-03 | Composer Candidate Shadow Mode and Deferred Routing Cutover | High | Large | Done: candidate shadow now compares current plan routing to capability candidates behind an env-gated debug surface while keeping user-visible routing unchanged |
| TASK-190-02-02 | Provider Context and Structured Composition Draft | High | Medium | Done: provider prompt packaging now includes bounded blueprint capability context and a strict capability-id draft schema without replacing `cms_operation_draft` |
| TASK-190-02 | Intent to Blueprint Candidate Planning | High | Large | Done: current prompt candidate extraction, provider capability context, and shadow diagnostics are landed for the pre-cutover planner stage |
| TASK-190-03 | Composition Graph and Conflict Policy | High | Large | Done: deterministic graph fragments plus typed route/resource/field/media/permission conflicts now feed the closed needs-input/gated contract before action assembly |
| TASK-190-03-01 | Composition Graph Contract and Deterministic Order | High | Medium | Done: current capability fragments now build deterministic graph nodes and fragments over existing typed plans |
| TASK-190-03-02 | Conflict Resolver, Stable Keys, and Needs Input | High | Large | Done: duplicate-action merge keys classify route/resource/field conflicts, media missing/ambiguous/upload/delete gates, and permission gaps into typed conflict questions without producing partial executable plans |
| TASK-190-02-01 | Prompt Candidate Extraction and Ranking | High | Large | Done: prompt signals now rank current primary, adjunct, and gated blueprint capabilities for mixed setup prompts |
| TASK-190-01 | Blueprint Capability Manifest and Registry | High | Large | Done: current blueprint packs and adjunct/gated modules now have a strict manifest/registry layer with latent detail-page metadata |
| TASK-190-01-02 | Migrate Current Blueprints to Capability Registry | High | Medium | Done: current pack builders are registered as capabilities without changing their single-pack plan output |
| TASK-190-01-01 | Capability Types, Normalizer, and Invariants | High | Medium | Done: strict capability schema rejects unsafe keys, duplicate ids, raw media payload metadata, and secret-like defaults |
| TASK-190-04-01 | Content Schema Field Merge Engine | High | Large | Done: compatible `content-type.upsert` fragments now merge through validator-backed schema ownership, while incompatible field types and secret-like defaults still fail closed |
| TASK-190-04 | Field, Facet, and Card Merge Foundation | High | Large | Done: content schema plus listing facet/card merge now land through schema-backed owner seams and widen query projection fields for required runtime data |
| TASK-190-04-02 | Listing Facet and Card Config Merge Engine | High | Large | Done: compatible listing facet/card fragments now merge deterministically, validate source fields against the composed content schema, and fail closed through typed `facet_field_missing` drift |
| TASK-190-05-01 | Page Section Library and Composition Slots | High | Medium | Done: assistant-facing section aliases and merge slots now resolve deterministically to existing page-builder widgets and module pack coverage, while unsupported aliases stay gated |
| TASK-190-05-02 | Page Upsert Composition Adapter | High | Large | Done: catalog page sections now compose through the existing widget owner, supporting-page execute paths resolve reviewed collection locators into persisted `PageData.settings.collectionLink` ids, and cross-collection mismatches fail closed through the page owner seam |
| TASK-190-05-03-01 | Detail Page Model and Schema Contract | High | Large | Done: strict detail-page document/revision storage, deterministic UUID-compatible ids, and the blocking `content_type_has_detail_pages` dependency now exist under the content-domain owner seam |
| TASK-190-05-03-02 | Detail Page Bindings and Field Resolver | High | Large | Done: detail-page blocks now resolve strict entry-field/meta/computed bindings through shared safe dot-path helpers, bounded form runtime context, and the existing collection/listing runtime seams |
| TASK-190-05-03-03 | Detail Page Runtime Renderer and Route Resolution | High | Large | Done: published content routes with linked `detailPageId` now resolve composed detail-page blocks through the existing page runtime shell, while unlinked routes stay on the legacy entry-detail renderer |
| TASK-190-05-03-04 | Detail Page Preview, Cache, and Invalidation | High | Medium | Done: preview tokens now carry strict detail-page sample-entry context, public preview distinguishes expired vs missing tokens, dedicated `type=detail-page` preview reads `current_document`, and canonical content-route writes invalidate cached list/detail HTML through one shared seam |
| TASK-190-05-03-05 | Detail Page Action Schema and Executor Adapter | High | Large | Done: `detail-page.upsert` now flows through the strict action registry/schema/executor path, persists via the content-domain document service, refreshes canonical `contentTypeSlug`, and keeps publish state owned by `DetailPageDocument.status` |
| TASK-190-05-03-06 | Detail Page Composer Fixtures and Runtime Acceptance | High | Medium | Done: local deterministic detail-page fixtures cover house projects, products, services, and portfolio cases plus negative provider/binding/route/gated contracts, with DB-backed public runtime, preview, draft-hidden, and legacy fallback acceptance |
| TASK-190-05-03-07-01-01 | Detail Page CRUD and Read Route Family | High | Medium | Done: internal list/detail/create/update/delete routes now use a dedicated detail-page route/service boundary, keep route document validation aligned with `DetailPageDocument.related`, filter by stable `contentTypeId`, refresh canonical `contentTypeSlug` on write, and block delete while `site.contentRoutes.detailPageId` still points at the document |
| TASK-190-05-03-07-01-02 | Detail Page Preview, Publish, and Autosave Lifecycle Routes | High | Medium | Done: internal lifecycle routes now issue dedicated `type=detail-page` preview tokens, store `sampleEntryId` in `preview_tokens.context`, write publish/autosave revisions through the detail-page owner seam, and keep route linkage outside the lifecycle boundary |
| TASK-190-05-03-07-01-03 | Detail Page Revisions and Restore Route Flow | High | Medium | Done: revisions now list newest-first through a dedicated revision owner seam, restore rewrites only `current_document`, and revision delete is limited to autosave snapshots through `detail_page_revision_delete_forbidden` |
| TASK-190-05-03-07-02 | DetailPageId Content Route Round-Trip and Matcher Metadata | High | Medium | Done: canonical content routes now round-trip optional `detailPageId` through settings, assistant actions, Site Settings client/form types, and matcher metadata without adding a second route registry |
| TASK-190-05-03-07-03 | Detail Page Admin Client, Cache, and Delete Conflict Parity | High | Medium | Done: detail-page admin client/cache helpers now cover list/detail, mutations, lifecycle, revisions, scoped list cache keys, and assistant `detail-page.upsert` cache events |
| TASK-190-05-03-07-01 | Detail Page Internal CRUD, Revisions, and Preview Routes | High | Large | Done: the internal detail-page CRUD/read, lifecycle preview/publish/autosave, and revisions/restore/discard route families are all landed through the shared detail-page route and service seams |
| TASK-190-05-03-07 | Detail Page Route Linking and Internal Admin API | High | Large | Done: detail-page route-linking, internal CRUD/lifecycle/revision routes, and admin client/cache parity now land through the shared detail-page owner seams |
| TASK-251 | Custom Screens Workspace Preview and Builder Interaction Hardening | High | Large | Done: preview is record-backed and cache-aware, list canvas reorders in-header, and Data uses widget-owned prop contracts |
| TASK-251-01 | Workspace Preview Parity and Record-Backed Editor Preview | High | Large | Done: builder canvas and preview dialog now share cached-first first-record ownership plus a wider Pages-like preview shell |
| TASK-251-01-02 | First-Record Preview Data for Editor View Canvas | High | Medium | Done: builder/editor preview now hydrates from `entries:list:<typeSlug>` with explicit fallback notes for no-record and read-failed states |
| TASK-251-01-01 | Preview Dialog Shell Width and Device Framing Parity | High | Medium | Done: preview modal now opens from a roomy shell and defaults Editor View to desktop framing |
| TASK-251-02 | List View Canvas Column Interaction Alignment | High | Medium | Done: visible column selection and reordering now live in the header, with a hidden-column tray below the table |
| TASK-251-02-01 | Inline Table-Header Column Reordering | High | Medium | Done: left/right moves now swap visible columns in-header without hidden-column drift |
| TASK-251-03 | Binding Panel Prop Coverage and Prop-Centric Cards | High | Large | Done: Data now renders widget-owned prop cards, compatibility rows, and write capability from one shared contract |
| TASK-251-03-01 | Widget-Owned Bindable Prop Targets and Data-Tab Cards | High | Large | Done: screen widget registries now own bindable targets and only `screen-field-value.value` counts as write-capable end-to-end |
| TASK-251-04 | QA, Docs, and Closure | Medium | Medium | Done: targeted validation, widget/cache/docs updates, board sync, and changelog landed with the builder hardening family |
| TASK-250 | Custom Screens Widget Parity and Editor Flow Completion | High | Very Large | Done: screen widgets now use mode-specific editors, binding-aware controls, canonical read-only rendering, nested selected-element ownership, and broader parity coverage |
| TASK-250-02 | Screen Layout Widget Surface Expansion | High | Large | Done: layout editor surface work is paired with nested selected-element rail ownership in the record editor |
| TASK-250-02-02 | Selected Element Interaction and Element-Scoped Editing Flow | High | Large | Done: nested child selection now hydrates the right-side rail correctly and survives refresh without snapping back to the parent |
| TASK-250-03 | Runtime and Registry Unification | High | Large | Done: preview and record-editor read paths now reuse the canonical renderer contract, with stronger registry coverage for `admin-editor-view` |
| TASK-250-03-01 | Canonical Widget Renderer Reuse in the Dedicated Record Editor | High | Large | Done: `ScreenWidgetReadOnlyBlock` is now a thin `WidgetRenderer` pass-through while writable `screen-field-value` stays screen-owned |
| TASK-250-03-02 | `admin-editor-view` Registry, Picker, and Surface Contract Coverage | High | Medium | Done: runtime-registry assertions now cover concrete `screen-*` surfaces/data-access and the picker remains screen-widget-only |
| TASK-250-04 | QA, Docs, and Closure | Medium | Medium | Done: docs, board, changelog, targeted tests, and `gates:coderso` are synchronized for the finished parity follow-up |
| TASK-250-04-01 | Screen Widget Editor/Runtime Test Matrix and Documentation Closure | Medium | Medium | Done: closure notes now reflect the final renderer path, nested element flow, widget docs, and validation matrix |
| TASK-250-01 | Screen Widget Editor Architecture and Mode Parity | High | Large | Done: screen widget editors no longer alias one form; `wizard`, `visual`, and `advanced` now have distinct responsibilities |
| TASK-250-01-01 | Distinct Wizard, Visual, and Advanced Flows for `screen-*` | High | Large | Done: each screen widget now exposes separate onboarding, day-to-day editing, and expert-control surfaces |
| TASK-250-01-02 | Binding-Aware Editor Controls for `screen-record-header` and `screen-field-value` | High | Large | Done: header/value editors now expose binding-state hints and `Data` tab shortcuts without duplicating binding ownership |
| TASK-250-02-01 | `screen-field-group` and `screen-two-column` Configuration Parity | High | Medium | Done: layout shells now document slot guidance, gap control, and clearable chrome closer to mature shared widget editors |
| TASK-249 | Custom Screens Workspace V3 Legacy Path Removal | High | Very Large | Done: Custom Screens now use a workspace-first V3 contract, table-canvas List View, screen-owned editor runtime, sidebar readiness gating, and no active classic-editor or drawer fallback |
| TASK-249-01 | Workspace V3 Contract, Routes, and Legacy Path Removal | High | Large | Done: V3 read/write contract, canonical workspace routing, sidebar shortcut gate, and assistant route parsing were hard-cut away from legacy active-path branches |
| TASK-249-01-01 | Definition Schema, Read Migration, and Persistence Hard Cutover | High | Large | Done: `schemaVersion: 3` is active, V1/V2 reads migrate safely, explicit V2 write payloads are rejected, and legacy rows no longer auto-promote to writable editors |
| TASK-249-01-02 | Routes, Clients, Cache, Nav, and Assistant Canonicalization | High | Large | Done: workspace paths, client normalization, sidebar shortcuts, prefetch, and assistant create-route parsing now follow the canonical records workflow |
| TASK-249-02 | Builder IA and List View Canvas Realignment | High | Large | Done: the builder shell now uses `Preview`, `List View`, `Editor View`, and `Save`, while list building moved to a canvas plus inspector model |
| TASK-249-02-01 | Topbar Mode Switch, Preview Action, and Inspector Ownership | High | Medium | Done: `Open records`, `Builder`, and center-canvas settings were removed; screen settings now live only in the right inspector |
| TASK-249-02-02 | List View Table Canvas and Column Inspector | High | Large | Done: left-panel list element library, center table preview canvas, and selected-column inspector now own the records-list builder flow |
| TASK-249-03 | Interactive Editor View and Entry Runtime | High | Very Large | Done: the record route now uses a screen-owned inline canvas and no longer offers active classic-editor or drawer fallback paths |
| TASK-249-03-01 | Admin Editor Widgets and Inline Editable Screen Components | High | Large | Done: existing `screen-*` widgets were extended into the active inline editor surface instead of introducing a parallel widget platform |
| TASK-249-03-02 | Entry Create/Edit Runtime, Error UX, and No-Legacy Fallback | High | Large | Done: records/new and row edit always route through the screen-owned editor, inline errors map from shared entry routes, and `EntryCreateDrawer` is gone from the active path |
| TASK-249-04 | QA, Docs, and Closure | Medium | Medium | Done: docs, board, changelog, and targeted validation were synchronized for the V3 cutover |
| TASK-249-04-01 | Replay, Validation Matrix, Docs, Board, and Changelog Closure | Medium | Medium | Done: targeted validation and docs closure landed; local Playwright replay remained unavailable and is recorded separately |
| TASK-248 | Custom Screens Workspace Builder V2 | High | Very Large | Done: Custom Screens now persist V2 `definition`, expose `List View` and `Editor View` builder surfaces, and reuse existing entry routes/cache contracts |
| TASK-248-01 | Custom Screen Definition V2 and Workspace Routing | High | Large | Done: V2 definition storage, V1 read migration, workspace route helpers, and prefetch contract landed |
| TASK-248-01-01 | Definition Schema, Normalizer, and V1 Migration | High | Medium | Done: strict V2 normalizer, default list view generation, V1 migration, migration artifacts, and service projections shipped |
| TASK-248-01-02 | Workspace Routes, Client Cache, and Entry Error Mapping | High | Medium | Done: workspace helpers, custom screen client normalization, prefetch warmup, and centralized content-entry error mapping shipped |
| TASK-248-02 | Custom Screen List View Builder and Records Table | High | Large | Done: `List View` designer, persisted table config, row routing, and existing entry action reuse shipped |
| TASK-248-02-01 | List View Designer and Persisted Configuration | High | Medium | Done: schema-bound column/filter/sort/create-mode controls save through `definition.listView` |
| TASK-248-02-02 | Records Table Renderer, Actions, and Cache Behavior | High | Medium | Done: records table renders from `definition.listView`, keeps entries cache behavior, and routes rows/create by V2 config |
| TASK-248-03 | Custom Screen Editor View Canvas and Entry Create Mode | High | Very Large | Done: `Editor View` owns schema-bound entry create/edit canvases without a parallel custom-screen entries API |
| TASK-248-03-01 | Editor View Designer and Admin Field Widget Controls | High | Medium | Done: editor designer adds field widgets/bindings through existing screen widget contracts |
| TASK-248-03-02 | Editor View Create Mode Draft, Save, and Validation | High | Medium | Done: `entries/new` create mode builds schema defaults and submits normalized entry data through existing create route |
| TASK-248-03-03 | Editor View Edit Mode Hydration, Save, and Dirty State | High | Medium | Done: edit mode hydrates typed data, preserves unrelated fields on save, and keeps cache/dirty semantics |
| TASK-248-04 | Admin Widget Registry, QA, Docs, and Closure | Medium | Large | Done: admin widget surfaces/data access, focused tests, gates, docs, changelog 782, and board closure synced |
| TASK-248-04-01 | Admin Widget Registry Surface Split | High | Medium | Done: `admin-list-view` and `admin-editor-view` surfaces with data-access filtering landed |
| TASK-248-04-02 | Playwright Replay, Docs, Changelog, and Board Closure | Medium | Small | Done: docs/changelog/board closure completed; Playwright and DB replay blockers recorded with targeted replacement validation |
| TASK-244 | Widget Visual Surface Clear Controls | High | Very Large | Done: `Clear` controls now remove configured surface/background/overlay style keys across widget runtime and editor contracts without transparent or empty-string sentinels |
| TASK-244-01 | Widget Surface Inventory and Clear Semantics | High | Medium | Done: clear-required surfaces, exclusions, and clear-as-removal semantics were locked before rollout |
| TASK-244-01-01 | Widget Surface Background Inventory | High | Medium | Done: every rendered widget surface was classified as clear-required, already-clearable, intentional-state, or excluded |
| TASK-244-01-02 | Clear Semantics and Backward Compatibility | High | Small | Done: shared helpers preserve deliberate `transparent` values while cleared fields remain absent |
| TASK-244-02 | Hero, Shared Color Fields, and Background Clear Controls | High | Large | Done: Hero, shared clear helpers, and Section background clear behavior shipped with focused tests |
| TASK-244-02-01 | Hero Gradient, Background, and Media Overlay Clear | High | Medium | Done: Hero gradient, background color, media overlay, and CTA background clear actions remove nested keys |
| TASK-244-02-02 | Shared Clear Field Controls and Section No-Regression | High | Medium | Done: reusable clear field helpers cover repeated editor controls and preserve Section gradient/overlay behavior |
| TASK-244-02-03 | Section Background Color Clear | High | Small | Done: Section background color clear removes `style.backgroundColor` without materializing `transparent` |
| TASK-244-03 | Custom Screen and Operational Widget Surface Clear | High | Large | Done: screen, booking, listing, search, and commerce widget frames can clear configured surfaces |
| TASK-244-03-01 | Custom Screen Widget Frame Surface Clear | High | Medium | Done: screen-record-header, screen-field-value, screen-field-group, and screen-two-column frame style keys can be cleared |
| TASK-244-03-02 | Booking, Listing, Search, and Commerce Frame Surface Clear | High | Large | Done: operational shells, cards, tables, and action backgrounds clear without changing semantic state colors |
| TASK-244-04 | Composite, Content, Form, and Shell Widget Surface Clear | High | Large | Done: marketing, content, form, shell, and primitive panel surfaces now use real clear semantics |
| TASK-244-04-01 | Marketing and Content Surface and Overlay Clear | High | Large | Done: overlays, cards, panels, tiles, CTA surfaces, and content-list/posts-feed mappings clear by key removal |
| TASK-244-04-02 | Form, Navigation, Footer, and Primitive Panel Color Clear | High | Large | Done: form backgrounds, global shell colors, and accordion/tabs/toggle panel surfaces clear while preserving behavior modes |
| TASK-244-05 | Validation, Docs, Changelog, and Board Closure | Medium | Medium | Done: targeted matrix, docs, changelog 781, and task board closure are synchronized |
| TASK-244-05-01 | Widget Surface Clear Test Matrix and Docs Closure | Medium | Small | Done: closure notes record validation commands, intentional exclusions, skipped broad gates, and no-transparent-sentinel evidence |
| TASK-247 | Media Always-On Selection and Upload Copy | High | Small | Done: Media multi-select is always active, header `Select` was removed, and the upload CTA now reads `Upload` while preserving the existing dropzone file-input path |
| TASK-246 | Menus Drop Intent and Indicator Stability | High | Small | Done: Menus row top/middle/bottom drop zones are stable, before/after indicators no longer shift layout, and the grip is centered with fixed height |
| TASK-245 | Menus Drag Handle Hit Target Fix | High | Small | Done: Menus grip handle now owns a wider full-lane drag target, prevents SVG pointer interception, and keeps row content non-draggable |
| TASK-243 | Menus Editor Action, Location, and Drag Parity | High | Large | Done: Menus editor header actions, lifecycle publish/draft, Location guidance, and handle-based drag/drop parity shipped |
| TASK-243-01 | Menus Editor Header Actions and Lifecycle Publish | High | Medium | Done: editor header owns Discard, Save changes, Publish, and Move to Draft with lifecycle-safe persistence |
| TASK-243-02 | Menus Location Contract and Editor Guidance | High | Medium | Done: Theme location guidance explains nullable slot behavior and runtime published-menu dependency |
| TASK-243-03 | Menu Item Drag Handle and Nesting Drop Contract | High | Large | Done: grip-only drag, before/after/child intents, drop markers, keyboard reorder actions, and cycle guards shipped |
| TASK-243-04 | Menus Editor Validation, Docs, and Closure | Medium | Medium | Done: targeted tests, docs, changelog 777, and board closure synced |
| TASK-242 | Widget Style Token None Options | High | Large | Done: `none` off switches now cover approved visual tokens across widget schemas, render maps, admin selects, focused runtime/UI tests, docs, and changelog 776 |
| TASK-242-01 | Widget Token Audit and None Semantics | High | Medium | Done: token inventory and semantic boundaries were used to scope the implementation |
| TASK-242-01-01 | Widget Config Token Inventory | High | Small | Done: visual, legacy-zero, already-none, and structural fields were classified before rollout |
| TASK-242-01-02 | None Token Semantics and Compatibility Helpers | High | Small | Done: `none` maps to fixed zero/empty output while legacy zero tokens remain compatible |
| TASK-242-02 | Layout, Spacing, Gap, Padding, and Radius None Rollout | High | Large | Done: layout, spacing, padding, and radius runtime contracts accept `none` where approved |
| TASK-242-02-01 | Flow Layout and Container Widget None Tokens | High | Medium | Done: stack, split layout, divider, spacer, grid columns, hero, navigation, footer, and screen gap tokens support `none` |
| TASK-242-02-02 | Content, Form, Timeline, and Composite Widget None Tokens | High | Large | Done: content, form, timeline, rich text, logo, and marketing widget spacing/radius tokens support `none` |
| TASK-242-03 | Typography, Size, Width, and Editor UI None Rollout | High | Medium | Done: typography, width, logo/input/button size, and editor select contracts expose `None` |
| TASK-242-03-01 | Widget Editor Select Option Regressions | High | Medium | Done: editor-wave tests assert `None` visibility across changed widget editors |
| TASK-242-03-02 | Typography, Size, Width Runtime None Tokens | High | Medium | Done: runtime/schema support for typography, width, logo height, input, and button `none` tokens landed |
| TASK-242-04 | Validation, Docs, Changelog, and Board Closure | Medium | Medium | Done: validation, widget docs, changelog 776, and board sync completed |
| TASK-242-04-01 | Widget None Token Test Matrix and Docs Closure | Medium | Small | Done: focused test matrix and widget docs were added for the `none` token rollout |
| TASK-241 | Pages Published Preview Draft Sync | High | Small | Done: published Pages hide Save draft, Preview silently syncs unsaved editor data to currentData before token generation, and public visitors keep seeing publishedData until Publish |
| TASK-238 | GitHub CodeQL Security Findings Remediation | High | Large | Done: CodeQL remediation was renumbered from TASK-237 to TASK-238, local scanner/lint/type/test validation passed, GitHub CodeQL open alerts are 0, secret scanning open alerts are 0, and Dependabot remains disabled/403 |
| TASK-238-01 | Workflow Least-Privilege Permissions | High | Small | Done: explicit PR-gate workflow permissions and scoped SARIF write permissions are covered by regression tests |
| TASK-238-02 | Listing Query Path Hardening | High | Small | Done: listing projection path guards reject unsafe prototype-pollution segments with Bun regression coverage |
| TASK-238-03 | Video Embed Host Validation | High | Medium | Done: runtime and editor preview share exact YouTube host/subdomain validation with lookalike-host coverage |
| TASK-238-04 | Rich Text Sanitizer and Entity Hardening | High | Large | Done: shared rich-text utilities replaced broad sanitizer/tag/entity handling and focused Vitest coverage passed |
| TASK-238-05 | CodeQL Verification, Docs, and Closure | High | Medium | Done: GitHub CodeQL and secret-scanning re-query is clean, Dependabot disabled state is documented, and changelog 770 closes the family |
| TASK-220 | ESLint 9 React Hooks Compiler Cleanup | High | Large | Done: the original 113 React Hooks/Compiler findings are reduced to 0 with the full preset enabled, lint/type gates and DB-backed blocker rerun passed |
| TASK-220-01 | Baseline, Rule Policy, and Contributor Guardrails | High | Medium | Done: baseline inventory, rule ownership, and contributor guidance remain documented |
| TASK-220-01-01 | Lint Inventory and Rule Ownership | High | Small | Done: reproducible inventory assigned each finding to implementation leaves |
| TASK-220-01-02 | React Hooks Compiler Remediation Patterns and AGENTS Guidance | High | Small | Done: AGENTS guidance keeps compiler findings as implementation issues rather than suppressions |
| TASK-220-02 | Admin Bootstrap and Read-Only Loader Effects | High | Large | Done: bootstrap/read-loader effect findings were remediated without weakening cache or route behavior |
| TASK-220-02-01 | AdminApp Auth, Settings, and Theme Bootstrap Effects | High | Medium | Done: auth/settings/theme bootstrap cleanup is covered by the final lint gate |
| TASK-220-02-02 | Read-Only Dashboard, Audit, Security, and Settings Loaders | High | Large | Done: read-only loader cleanup preserves loading/error behavior |
| TASK-220-02-03 | Analytics Memoization and KPI Derived State | High | Medium | Done: analytics loader and KPI memoization findings were cleared |
| TASK-220-03 | Cache Hydration Hooks and List Mount Refresh | High | Large | Done: cache hydration/list refresh findings were cleared while preserving background revalidation |
| TASK-220-03-01 | Shared Cached List Hooks Mount Refresh | High | Large | Done: shared cached list hook findings are clear under `bun --cwd core lint` |
| TASK-220-03-02 | Admin List Page Mount Refresh and Selection Trim | High | Large | Done: visible selection trim/list refresh findings are clear under `bun --cwd core lint` |
| TASK-220-03-03 | Cached Detail and Editor Hydration | High | Large | Done: cached detail/editor hydration findings are clear under `bun --cwd core lint` |
| TASK-220-04 | Form, Drawer, Dialog, and Derived Field State | High | Large | Done: derived state findings were remediated without changing backend validation ownership |
| TASK-220-04-01 | Create Drawers Auto Slug and Reset State | High | Medium | Done: create drawer slug/reset patterns no longer trip compiler lint |
| TASK-220-04-02 | Dialog Preview Picker and Slot Derived State | High | Large | Done: dialog/picker/slot derived state findings are clear under final lint |
| TASK-220-04-03 | Settings Form Snapshots and Profile Route State | High | Large | Done: settings/profile route-derived state findings were cleared without exposing secrets |
| TASK-220-05 | Editor Dirty-State, Refs, and Autosave Safety | High | Large | Done: editor ref/autosave/dirty-state findings were remediated and validated |
| TASK-220-05-01 | Post Editor Ref and Autosave Signature Cleanup | High | Large | Done: render-time ref findings and post autosave signatures are compiler-clean |
| TASK-220-05-02 | Page Editor Route, Cache, Revisions, and Template Loaders | High | Large | Done: PageEditor route/cache/revision/template loader findings are compiler-clean |
| TASK-220-05-03 | Entry Content Type and Relation Editor State | High | Large | Done: Entry/content-type relation and memoization findings are compiler-clean |
| TASK-220-06 | Widget, Commerce, Listings, and Resource-Specific Loaders | High | Large | Done: remaining widget/resource loader findings were cleared |
| TASK-220-06-01 | Widget Library, Template Category, and Editor Loaders | High | Large | Done: widget template/category/editor loader findings are compiler-clean |
| TASK-220-06-02 | Commerce, Listings, Forms, Menus, and Posts Resource Lists | High | Large | Done: resource list loader findings are compiler-clean |
| TASK-220-06-03 | Widget Hero and Navigation Editor Async Loaders | Medium | Medium | Done: widget async loader findings are compiler-clean |
| TASK-220-07 | Validation, Docs, and Closure | Medium | Medium | Done: final lint/type/DB-backed targeted validation, docs, changelog 771, and board sync are complete |
| TASK-220-07-01 | React Hooks Compiler Regression Matrix | Medium | Medium | Done: validation log records green lint/type gates and DB-backed `entryService` blocker rerun |
| TASK-220-07-02 | Docs, Changelog, Board, and Lint Gate Closure | Medium | Small | Done: task statuses, board stats, and changelog entry 771 are synchronized |
| TASK-054 | Coderso Modular Admin IA | High | Large | Done: historical Coderso IA umbrella is closed around the delivered Advanced module group, canonical `/admin/advanced/*` routes, compatibility aliases, and docs sync |
| TASK-054-20 | Coderso Membership and Client Portal Suite | High | Large | Done: closed as superseded by execution-ready umbrella TASK-239 |
| TASK-054-21 | Coderso Multilingual and i18n Suite | High | Large | Done: closed as superseded by execution-ready umbrella TASK-240 |
| TASK-237 | GHCR Docker Image Lowercase Tag Normalization | High | Small | Done: release workflow now lowercases GHCR owner/image before Docker build-push so mixed-case GitHub owners do not create invalid image tags |
| TASK-236 | Semantic Release Node Runtime Pin | High | Small | Done: release workflow now installs Node 22.14.0 before semantic-release and has regression coverage for the runtime contract |
| TASK-235 | Security Gate Gitleaks Action v2 Contract | High | Small | Done: Gitleaks Action v2 now uses env-based config, gets `GITHUB_TOKEN` for PR scans, and no longer passes unsupported inputs |
| TASK-234 | Security Gate Trivy SARIF and Blocking Output | High | Small | Done: Trivy now uploads severity-limited SARIF without failing early, then runs a separate table-output blocking gate for HIGH/CRITICAL findings |
| TASK-233 | Root README Marketing and Agents Index | Medium | Small | Done: repository index moved to `AGENTS.md` and root `README.md` is now an English Coderso marketing overview |
| TASK-232 | Reliability Gate Slow DB Timeout Hardening | High | Small | Done: solution kit install reliability tests now use remote-DB-safe test and cleanup timeouts |
| TASK-231 | CI Security and Release Gate Fixes | High | Small | Done: security gate SARIF upload now has `actions: read` and CodeQL upload v4, while DB-backed public booking smoke tests use a remote-DB-safe timeout |
| TASK-230 | Bun Testing Lane Workflow Contract | High | Small | Done: testing workflow now exposes `bun-lane`, runs curated Bun tests before Bun coverage, and keeps optional DB route suites secret-gated |
| TASK-229 | Coderso Release Gates Optional DB Checks | High | Small | Done: pure release gates now run without `DATABASE_URL`, DB-backed commands are explicit skips when the secret is absent, and CI still uses the secret when configured |
| TASK-228 | Security Gate Trivy Action Pin Repair | High | Small | Done: security gate now uses the documented `aquasecurity/trivy-action@v0.36.0` pin and the config test asserts the resolvable action reference |
| TASK-227 | Semantic Release GitHub App Authentication | High | Small | Done: semantic-release checkout/API auth now uses the bypass-approved GitHub App token from repository secrets, while GHCR publish remains package-scoped to the workflow token |
| TASK-226 | Coderso Rebrand and Advanced Admin IA | High | Very Large | Done: product surfaces now use Coderso, Advanced is the canonical admin module group/route namespace, legacy aliases/storage/header compatibility is preserved, docs, changelog 757, gates, and residual allowlist are synchronized |
| TASK-226-00 | Exhaustive Nextless Occurrence Inventory and Scope Lock | High | Small | Done: baseline and final residual scans were captured, with residual matches classified as compatibility or historical evidence |
| TASK-226-00-01 | Rebrand Occurrence Coverage Table | High | Small | Done: coverage table remains the TASK-226 scan evidence source and excludes itself from residual counts |
| TASK-226-01 | Product Brand Rename Inventory | High | Large | Done: package metadata, runtime defaults, admin copy, widget defaults, assistant copy, tests, and fixtures now use Coderso |
| TASK-226-01-01 | Package, Runtime Defaults, and Integration Headers | High | Medium | Done: workspace package names, runtime defaults, email/forms fallbacks, webhook Coderso headers, and legacy migration keys are covered |
| TASK-226-01-02 | Admin UI, Widgets, Docs, and Fixture Copy | High | Large | Done: visible admin/auth/setup/settings/pages/widget/assistant copy and fixtures now use Coderso with intentional legacy selector allowlist |
| TASK-226-02 | Advanced Admin IA and Route Compatibility | High | Very Large | Done: Advanced owns the module group, `/admin/advanced/*` is canonical, Posts remains top-level, and `/admin/coderso/*` aliases stay functional |
| TASK-226-02-01 | Navigation Registry and Group Label Contract | High | Large | Done: `advancedModules.ts`, Advanced feature flags, sidebar group label, custom screen shortcuts, and solution-kit narrowing are aligned |
| TASK-226-02-02 | Canonical Advanced Routes, Prefetch, and Aliases | High | Large | Done: route table, admin path aliases, prefetch/cache warmups, media usage hrefs, and route docs use canonical Advanced paths |
| TASK-226-02-03 | Assistant Surface and Module Context Rename | High | Large | Done: assistant runtime snapshot schema v2 uses `advancedModule`, while strict schema validation still accepts legacy v1 `codersoModule` payloads |
| TASK-226-03 | Validation, Docs, and Closure | Medium | Medium | Done: validation matrix, source docs, residual scans, changelog, task statuses, and board stats are synchronized |
| TASK-226-03-01 | Rebrand and IA Regression Matrix | Medium | Medium | Done: lint/typecheck, targeted Vitest, Bun route/service/perf tests, and `gates:coderso` pass |
| TASK-226-03-02 | Source Docs, Changelog, Board, and Residual Inventory Closure | Medium | Small | Done: source docs, changelog, board, and residual compatibility/historical allowlist are updated |
| TASK-225 | Page Editor Status Badge and Action Locking | High | Small | Done: editor `Published` badge now matches the Pages table emerald styling and save/publish mutations cannot start concurrently |
| TASK-224 | Page Editor Preview Action Consolidation | High | Small | Done: Pages editor toolbar now exposes `Preview` directly before `Save draft`, while device selection stays inside the runtime preview dialog |
| TASK-223 | Semantic Release and Docker Image Workflow | High | Medium | Done: semantic-release now parses categorized PR release notes into root CHANGELOG.md, syncs generated versions, and builds/pushes nextless-core Docker images with the release tag |
| TASK-222 | Public Homepage Runtime Settings Route | High | Small | Done: public `/` now renders the published page selected by `site.homepageId`, with DB-backed Bun runtime regression coverage |
| TASK-221 | Entries Metadata Panel Scroll Containment | High | Small | Done: right Entries metadata panel now has one bounded scroll container, no nested desktop/sheet scroll wrappers, and Vitest regression coverage |
| TASK-219 | Dependency CVE Remediation | High | Medium | Done: dependency CVEs remediated without scanner allowlists; `happy-dom`, Vite, Vitest, ESLint 9, TypeScript ESLint, React Hooks plugin, Rollup/Picomatch/Flatted/Minimatch graph, docs, changelog 751, SBOM, and strict security scan closure completed |
| TASK-219-01 | Direct Test and Build Tooling Bumps | High | Medium | Done: root Vitest/happy-dom and core Vite/Tailwind build tooling moved to fixed compatible versions |
| TASK-219-01-01 | Happy DOM Vitest Runtime Upgrade | High | Medium | Done: root `happy-dom` resolves to `20.9.0`; full Vitest and focused post-editor Vitest suites pass |
| TASK-219-01-02 | Vite Core Build Tool Upgrade | High | Medium | Done: core Vite resolves to `8.0.10`; stale nested Vite install issue documented; admin and site builds pass |
| TASK-219-02 | Transitive Lockfile CVE Remediation | High | Medium | Done: vulnerable Rollup/Picomatch/Flatted/Minimatch lockfile rows removed without broad incompatible overrides |
| TASK-219-02-01 | Rollup and Picomatch Lockfile Closure | High | Medium | Done: Vite 8 graph removes vulnerable Rollup row and Picomatch resolves to `4.0.4` |
| TASK-219-02-02 | ESLint Flatted and Minimatch Closure | High | Medium | Done: ESLint 9 compatible stack resolves Flatted `3.4.2` and removes vulnerable Minimatch `3.1.2`; full React Hooks preset cleanup is tracked by TASK-220 |
| TASK-219-03 | Scanner Validation and Closure | High | Medium | Done: Bun audit, Trivy CVE/config/secret, Semgrep, Gitleaks history/worktree, SBOM, docs, and board closure completed |
| TASK-219-03-01 | Strict Security Scan CVE Closure | High | Medium | Done: `bun run scan:security:strict` and `bun run scan:sbom` completed cleanly |
| TASK-219-03-02 | Docs, Changelog, and Board Closure | Medium | Small | Done: TASK-219 docs, board, changelog 751, and scanner evidence synchronized |
| TASK-218 | Post Editor Header Revisions Cache and Inspector Polish | High | Medium | Done: Posts editor status moved to the global topbar, local back row shows only the post title, focus-mode panel state is no longer misleading, Post inspector defaults/Advanced/canonical URL behavior were polished, revisions now use the shared cache, runtime canonical links render explicitly, docs, changelog 750, and validation |
| TASK-217 | Security Scan Baseline Hardening | High | Medium | Done: local scanner matrix now covers SAST, Bun audit, Trivy CVE/misconfig/secrets, Gitleaks history/worktree, optional image scan, docs, CI strict behavior, and changelog 749 |
| TASK-216 | Coderso Commerce Catalog List Parity With Pages | High | Very Large | Done: `/admin/coderso/commerce` now follows the Pages list contract with product filters, collection enrichment, checkbox table, visible selection, shared pagination, row/bulk lifecycle actions, confirmations, shared toasts, cache hydration, docs, changelog 748, and validation |
| TASK-216-01 | Commerce Catalog Route Shell and Cache Hydration | High | Large | Done: product and collection caches hydrate independently, cache-bus events refresh in the background, shell width/header New/prefetch stay aligned with Pages |
| TASK-216-01-01 | Product and Collection Cache Hydration | High | Medium | Done: `useCommerceCatalog` uses shared mount refresh options, separate hydration refs, and background cache-event refresh |
| TASK-216-01-02 | Commerce Shell, Header New, and Prefetch Contract | High | Medium | Done: compact `New` routes through `/coderso/commerce/new`, max width is Pages-style, and `/coderso/commerce` prefetch remains cached-list-only |
| TASK-216-02 | Commerce Filters, Table, Selection, and Pagination | High | Large | Done: search/status/collection/stock filters, collection enrichment, checkbox table, shared pagination, and visible selection shipped |
| TASK-216-02-01 | Commerce Filter Model and Collection Enrichment | High | Medium | Done: pure filter/enrichment helpers cover title/slug/excerpt, status, collection, stock, and missing collection labels |
| TASK-216-02-02 | Product Table Selection and Commerce Columns | High | Medium | Done: table renders select-all/per-row checkboxes, selected rows, product/status/price/stock/collections/updated/actions columns |
| TASK-216-02-03 | Shared Pagination and Visible Selection | High | Medium | Done: `useListPagination`, `ListPaginationFooter`, visible ids, and selection trimming scope bulk actions to visible products |
| TASK-216-03 | Commerce Row Lifecycle Actions and Confirmations | High | Large | Done: row Edit/Publish/Move to draft/Archive/Delete actions use existing Commerce product writes and confirmed destructive delete |
| TASK-216-03-01 | Product Row Lifecycle Menu Contract | High | Medium | Done: Commerce row menu excludes unsupported duplicate/preview/copy flows and keeps lifecycle actions status-aware |
| TASK-216-03-02 | Product Delete Confirmation Contract | High | Medium | Done: row delete opens `ConfirmActionDialog`; mutation runs only after confirmation and emits shared feedback |
| TASK-216-04 | Commerce Bulk Actions, Toasts, and Error Mapping | High | Large | Done: visible-scope bulk publish/draft/archive/delete, partial failure recovery, Commerce toasts, and mapper coverage landed |
| TASK-216-04-01 | Product Bulk Action Bar and Visible Selection | High | Medium | Done: inline Commerce bulk bar appears beside `New` and operates only on visible selected products |
| TASK-216-04-02 | Bulk Mutation Execution and Partial Failures | High | Medium | Done: `Promise.allSettled` lifecycle/delete execution keeps failed products selected and recoverable |
| TASK-216-04-03 | Commerce List Toast Adapter and Route Error Mapping | High | Medium | Done: `commerceActionToasts` covers product lifecycle/delete/bulk copy and route mapper tests cover list-visible errors |
| TASK-216-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: validation matrix, Commerce catalog/cache/docs, source report split, changelog, task statuses, and board sync are complete |
| TASK-216-05-01 | Commerce Parity Test Matrix | Medium | Small | Done: Commerce UI/admin/cache/prefetch/toast/pagination/route coverage is mapped and validated |
| TASK-216-05-02 | Commerce Docs, Changelog, and Board Closure | Medium | Small | Done: Commerce docs, Content List UX, Admin Cache docs, SUMMARY-COMMERCE notes, changelog 748, and board stats are synchronized |
| TASK-215 | Coderso Widgets Pages-Style Library Parity | High | Very Large | Done: `/admin/coderso/widgets` now uses a Pages-style table-first shell with section dropdown, shared pagination, selectable grid cards, source-aware actions, favorites/template bulk flows, docs, changelog 747, and validation |
| TASK-215-01 | Widget Library Shell, Section Selector, and Cache Hydration | High | Large | Done: left rail is replaced by one filter-bar section dropdown while existing catalog/category/page cache hydration and prefetch contracts are preserved |
| TASK-215-01-01 | Pages-Style Shell and Section Dropdown | High | Medium | Done: All Items/Favorites/Templates/All Widgets/category choices moved into the section dropdown and All Items opens by default |
| TASK-215-01-02 | Widget Library Cache Hydration and State Ownership | High | Medium | Done: shell owns section/view/action state and continues cache-present background refresh plus cache-bus refresh for widget data |
| TASK-215-02 | Widget Library Filter Bar, Table, and Grid Model | High | Large | Done: one section-aware model drives filters, counts, table/grid rows, pagination, and visible-row selection |
| TASK-215-02-01 | Section-Aware Filter Model and Counts | High | Medium | Done: `widgetLibraryUtils` owns section normalization, section filtering/counts, and selection trimming |
| TASK-215-02-02 | Table View Selection and Pagination | High | Medium | Done: default table view uses checkbox selection, source/category/details columns, action menus, and `ListPaginationFooter` |
| TASK-215-02-03 | Grid View Selection and Drawer Parity | High | Medium | Done: grid renders the same paginated rows with selectable cards, action menus, and core-widget drawer click behavior |
| TASK-215-03 | All Items and Core Widget Actions | High | Large | Done: core widgets expose Preview placeholder, Configure, Insert, favorite toggle, and bulk favorite operations through shared menus |
| TASK-215-03-01 | All Items Row Actions and Preview Placeholder | High | Medium | Done: row/card action menus are source-aware and Preview is a bounded non-mutating placeholder |
| TASK-215-03-02 | Core Widget Drawer and Insert Dialog Flow | High | Medium | Done: Configure opens `WidgetDetailsDrawer` and Insert reuses `WidgetInsertDialog` for page/template targets |
| TASK-215-03-03 | Catalog Favorite Bulk Actions | High | Medium | Done: visible selected catalog rows can be added to or removed from `widgets.favorites` while preserving max-50 feedback |
| TASK-215-04 | Favorites and Template Resource Actions | High | Large | Done: Favorites and Templates have separate action surfaces with visible-scope favorite/remove flows and template management |
| TASK-215-04-01 | Favorites Section Actions and User Settings | High | Medium | Done: Favorites supports source-aware row/card actions plus single and bulk removal from favorites |
| TASK-215-04-02 | Template Table/Grid Actions and Category Management | High | Medium | Done: Templates keeps edit, duplicate, delete, category filter, category drawer, and three-dot actions after rail removal |
| TASK-215-04-03 | Template Bulk Actions, Confirmations, and Toasts | High | Medium | Done: template bulk delete uses `ConfirmActionDialog`, `Promise.allSettled`, partial-failure feedback, and cache refresh |
| TASK-215-04-04 | Widget Action Error Mapping and Toast Adapter | High | Medium | Done: Widget library action feedback stays bounded through existing admin error mapping and no route contract changes were needed |
| TASK-215-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: validation matrix, Widgets/list/cache docs, task statuses, board stats, and changelog are synchronized |
| TASK-215-05-01 | Widgets Pages-Parity Test Matrix | Medium | Small | Done: shell, section model, table/grid, selection, actions, pagination, and cache/client checks are mapped to Vitest/lint/typecheck |
| TASK-215-05-02 | Widgets Docs, Changelog, and Board Closure | Medium | Small | Done: WIDGETS, CONTENT_LIST_UX, ADMIN_CACHE, ADMIN_CACHE_MAP, changelog 747, and TASK-215 board closure are complete |
| TASK-214 | Coderso Listings Tabbed List Parity With Pages | High | Very Large | Done: `/admin/coderso/listings` now follows Pages list behavior while preserving tab-scoped Queries/Templates resources, active-tab New, visible selection, confirmations, toasts, cache hydration, docs, changelog 746, and validation |
| TASK-214-01 | Listings Route, Tab Shell, and Cache Hydration | High | Large | Done: shell owns active tab state, header New routing, query/template cache hydration, and shared prefetch compatibility |
| TASK-214-01-01 | Query and Template Cache Hydration | High | Medium | Done: query/template hooks hydrate cache immediately and refresh in the background when cache exists |
| TASK-214-01-02 | Tab State, Header New Action, and Prefetch | High | Medium | Done: controlled Queries/Templates tabs drive compact active-tab `New` behavior and preserve `/coderso/listings` prefetch |
| TASK-214-02 | Listings Queries Tab Table, Filters, and Pagination | High | Large | Done: Queries tab has resource filters, checkbox table, shared pagination, visible selection, and query-only row actions |
| TASK-214-02-01 | Query Filter Model and View Component | High | Medium | Done: query search/source filters reset pagination and trim hidden selection |
| TASK-214-02-02 | Query Table Selection, Source, and Updated Columns | High | Medium | Done: query table uses Pages-style selection while preserving Query/Source/Updated/Actions and editor links |
| TASK-214-02-03 | Query Pagination and Visible Selection | High | Medium | Done: Queries uses `ListPaginationFooter` and only current visible query ids can be selected for bulk actions |
| TASK-214-03 | Listings Templates Tab Table, Filters, and Pagination | High | Large | Done: Templates tab has resource filters, checkbox table, shared pagination, visible selection, and template-only row actions |
| TASK-214-03-01 | Template Filter Model and View Component | High | Medium | Done: template search/layout filters reset pagination and trim hidden selection through shell-owned state |
| TASK-214-03-02 | Template Table Selection, Layout, and Binding Summary | High | Medium | Done: template table shows layout, slug, binding count, updated date, and controlled row actions |
| TASK-214-03-03 | Template Pagination and Visible Selection | High | Medium | Done: Templates uses `ListPaginationFooter` and only current visible template ids can be selected for bulk actions |
| TASK-214-04 | Tab-Scoped Actions, Confirmations, and Toasts | High | Large | Done: active tab owns New, row actions, bulk delete, confirmations, shared toasts, and inline errors |
| TASK-214-04-01 | Active Tab New Flow and Query Save Toasts | High | Medium | Done: Queries New navigates through admin router and query create/update save emits shared feedback |
| TASK-214-04-02 | Query Row and Bulk Delete Confirmations | High | Medium | Done: query row/bulk delete uses `ConfirmActionDialog`, visible ids, partial-failure feedback, and query toasts |
| TASK-214-04-03 | Template Create, Edit, and Delete Confirmations | High | Medium | Done: Templates New/edit/save/delete flows are shell controlled with shared feedback and confirmed deletes |
| TASK-214-04-04 | Listings Error Mapping and Toast Adapter | High | Medium | Done: Listings query/template toast adapters and route error mapping coverage are in place |
| TASK-214-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: validation matrix, docs, source report split, changelog, task statuses, and board sync are complete |
| TASK-214-05-01 | Listings Parity Test Matrix | Medium | Small | Done: active-tab New, filters, table, bulk, confirmation, toast, cache, prefetch, and route mapping coverage is mapped to suites |
| TASK-214-05-02 | Docs, Changelog, and Board Closure | Medium | Small | Done: Content List UX/Admin Cache docs, source report, changelog 746, task family statuses, and board statistics are synchronized |
| TASK-213 | Widget Library Playwright QA Follow-ups | High | Very Large | Done: SUMMARY-WIDGETS findings closed across insert feedback, Form Embed crash, listing-query states, a11y/filter IA, template lifecycle, wizard consistency, picker upgrades, docs, changelog 745, and validation |
| TASK-213-01 | Widget Editor Stability and Data Loading | High | Large | Done: Form Embed sentinel and Listing Filters/Search Box loading/empty/error/ready states are fixed |
| TASK-213-01-01 | Form Embed Select Sentinel and Crash Regression | High | Small | Done: empty Radix Select value replaced with UI-only sentinel and covered by Form Embed Vitest/runtime suites |
| TASK-213-01-02 | Listing Query Empty State for Filter Widgets | High | Medium | Done: Listing Filters and Search Box selectors show truthful loading, empty, ready, and error states |
| TASK-213-02 | Widget Insert Flow and User Feedback | High | Large | Done: insert mutations are awaited, failures stay visible, and success toasts link to the target editor |
| TASK-213-02-01 | Insert Widget Toasts and Editor Deep Links | High | Medium | Done: shared Admin UI insert feedback and editor deep-link action landed |
| TASK-213-02-02 | Widget Card Drawer Entry Point Consolidation | Medium | Medium | Done: cards are configuration-first and insert mutation is owned by the drawer/dialog flow |
| TASK-213-03 | Widget Library A11y and Filter IA | High | Large | Done: favorite/view controls, advanced helper, module copy, category-aware counts, and rail hierarchy are tightened |
| TASK-213-03-01 | Favorites and View Toggle A11y Feedback | High | Small | Done: dynamic labels, pressed states, titles, keyboard activation, and bounded feedback landed |
| TASK-213-03-02 | Advanced Mode Module Readiness and Tab Counts | Medium | Medium | Done: user-facing readiness copy and filtered Recommended/All counts are covered |
| TASK-213-03-03 | Widget Filter Hierarchy and Favorites Rail Simplification | Medium | Medium | Done: duplicate Favorites signals were removed and filter ownership clarified |
| TASK-213-04 | Widget Template Lifecycle and Category Management | Medium | Large | Done: template save toasts, primary CTA, row/bulk actions, duplicate/name guards, and category mode clarity shipped |
| TASK-213-04-01 | Template Save Toasts and Primary CTA | Medium | Medium | Done: create/update toasts and primary `New Template` action are in place |
| TASK-213-04-02 | Template Category Inline Mode Visual Contract | Medium | Small | Done: category edit/delete modes keep row context and accessible action labels |
| TASK-213-04-03 | Template Row and Bulk Cleanup Actions | Medium | Medium | Done: Edit/Duplicate/Delete, confirmed visible-scope bulk delete, partial-failure feedback, and cache updates landed |
| TASK-213-04-04 | Template Duplicate and Name Guard Contract | Medium | Medium | Done: service-owned duplicate, case-insensitive name conflict, strict route schema, and client cache proof landed |
| TASK-213-05 | Widget Wizard Consistency and Repeatable Fields | Medium | Large | Done: wizard count rows, paired labels, and beginner helper copy were aligned across audited widgets |
| TASK-213-05-01 | Repeatable Count Field Sync Matrix | Medium | Medium | Done: Stats KPI, Logo Cloud, FAQ, Rich Text and peer widget count behavior is fixed or current-state verified |
| TASK-213-05-02 | Paired Input Labels and Beginner Helper Text | Medium | Medium | Done: Navigation/Footer/FAQ paired fields and technical helper copy have explicit labels/context |
| TASK-213-06 | Widget Editor Control Unification and Picker Upgrades | Medium | Large | Done: product Radix controls, collection/media pickers, rich text blocks, and helper controls were upgraded |
| TASK-213-06-01 | Commerce Product Radix Select and Collection Picker | Medium | Large | Done: product widgets use shared selects plus cached collection picker with ID fallback |
| TASK-213-06-02 | Gallery Mosaic Media Picker Quick Setup | Medium | Medium | Done: Gallery Mosaic uses shared MediaPicker/media cache and persists public-runtime-safe schema data |
| TASK-213-06-03 | Rich Text Section Quick Editor | Medium | Medium | Done: routine wizard editing uses structured blocks and `outputMode: "blocks"` |
| TASK-213-06-04 | Dynamic Content Source Quick Setup | Medium | Medium | Done: dynamic source widgets were current-state verified against existing owner controls |
| TASK-213-06-05 | CTA and Compare Timeline Quick Fields | Medium | Medium | Done: existing CTA/Compare public-copy controls were current-state verified without new runtime fields |
| TASK-213-06-06 | Layout Navigation Helper Controls | Medium | Medium | Done: navigation source helper, quick-link labels, footer link/social labels, and social count handling landed |
| TASK-213-07 | QA Docs and Widget Source Report Closure | Medium | Medium | Done: source report, product/API/cache docs, changelog, task statuses, and board counts are synchronized |
| TASK-213-07-01 | Widget Playwright and Vitest Regression Matrix | Medium | Small | Done: every SUMMARY-WIDGETS finding has owner/status/evidence and full Vitest plus DB-backed Bun proof passed |
| TASK-213-07-02 | Widgets Docs Changelog and Board Closure | Medium | Small | Done: widget docs, changelog 745/index, TASK-213 files, and README statistics are synchronized |
| TASK-212 | Posts Playwright Retest Follow-ups | High | Large | Done: Posts publish/update feedback uses the shared action-toast adapter, Create New Post drawer has a bound SheetDescription, Video/Gallery/Audio/File blocks ship end-to-end, changelog 744, and targeted validation passed |
| TASK-212-01 | Post Editor Mutation Wrapper Parity | High | Medium | Done: existing Publish/Update actions emit shared success/error toasts without direct Sonner calls or swallowed failures |
| TASK-212-01-01 | Post Editor Action Toast Adapter Wiring | High | Small | Done: `PostBlockEditorShell` routes publish/update through `createAdminActionToastAdapter` |
| TASK-212-01-02 | Post Publish Update Live Toast Proof | High | Small | Done: 2026-04-26 live toast proof preserved and bounded failure coverage added in Vitest |
| TASK-212-02 | Create Post Drawer A11y Description | Medium | Small | Done: Create New Post uses `SheetDescription` and no longer has a missing description target |
| TASK-212-02-01 | Create Post Drawer SheetDescription Wiring | Medium | Small | Done: drawer subtitle is programmatically associated with the sheet dialog |
| TASK-212-02-02 | Post Dialog A11y Regression Matrix | Medium | Small | Done: focused a11y test covers Create New Post and Revisions dialog description wiring |
| TASK-212-03 | Post Media Block Capability Expansion | Medium | Large | Done: Video, Gallery, Audio, and File are real media block capabilities, not catalog-only labels |
| TASK-212-03-01 | Media Block Schema Defaults and Normalization | Medium | Medium | Done: new media block types have deterministic defaults and normalized attrs/content |
| TASK-212-03-02 | Media Block Editor Inspector and Runtime Rendering | Medium | Large | Done: inserter, canvas, inspector, media picker, mapper, and renderer support all accepted media blocks |
| TASK-212-04 | QA Docs and Playwright Source Closure | Medium | Medium | Done: SUMMARY-POSTS, product/API docs, changelog, and task board synced with validation evidence |
| TASK-212-04-01 | Posts Retest Validation Matrix | Medium | Small | Done: lint, typecheck, and targeted Vitest matrix recorded; manual Playwright was not rerun in this code pass |
| TASK-212-04-02 | Docs Changelog and Source Report Update | Medium | Small | Done: TASK-212 closure notes, changelog 744, and board counts are synchronized |
| TASK-210 | Coderso Forms List Parity With Pages | High | Very Large | Done: `/admin/coderso/forms` now follows the Pages list contract with canonical routes, cache hydration, filters, pagination, row/bulk lifecycle actions, create drawer preference, shared toasts, retained-history delete conflicts, changelog 743, and targeted validation |
| TASK-210-01 | Forms List Route, Shell, and Cache Hydration | High | Medium | Done: canonical `/admin/coderso/forms` active href, canonical builder/action-log navigation, prefetch warmup, and cache-present/background mount policy landed |
| TASK-210-02 | Forms Filters, Table, and Shared Pagination | High | Large | Done: search/status/access filters, Pages-style checkbox table, submission-access column, shared pagination footer, and visible-selection trimming shipped |
| TASK-210-03 | Forms Row Lifecycle Actions and Confirmations | High | Medium | Done: row Edit/Action logs/Publish/Move-to-draft/Archive/Delete actions use existing Forms status writes and ConfirmActionDialog-gated deletes |
| TASK-210-04 | Forms Bulk Selection and Action Parity | High | Medium | Done: visible-scope bulk publish/draft/archive/delete uses inline header controls, Promise.allSettled summaries, and confirmed destructive flow |
| TASK-210-05 | Forms Create Drawer and Open After Create | High | Medium | Done: compact `New`, drawer reset key, SheetDescription, list payload guard, null-create fallback, and typed `forms.openAfterCreate` preference landed |
| TASK-210-06 | Forms List Toasts and Error Mapping | High | Large | Done: Forms list mutations use shared list toasts, strict status schema, pure status constants, centralized `mapFormError`, and `form_delete_restricted` retained-history conflict mapping |
| TASK-210-07 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: targeted Vitest, lint/typecheck, DB-backed Bun tests outside sandbox, public submission hardening smoke, docs, source report, changelog, and board sync recorded |
| TASK-210-01-01 | Forms Canonical Route and Prefetch Warmup | High | Small | Done: legacy `/admin/forms` remains an alias while active hrefs and new links use `/admin/coderso/forms`; prefetch uses `listFormsCached({ force: false })` |
| TASK-210-01-02 | Forms Cache Hydration Hook Parity | High | Medium | Done: `useForms` hydrates valid cache immediately and refreshes cache-present mounts/background events without foreground loading |
| TASK-210-02-01 | Forms Filter Model and View Component | High | Medium | Done: Forms-specific search, status, and submission-access filter strip landed |
| TASK-210-02-02 | Forms Table Selection and Access Column | High | Medium | Done: table renders checkbox selection, selected-row styling, canonical links, status/access badges, updated date, and row actions |
| TASK-210-02-03 | Forms Shared Pagination and Selection Trim | High | Medium | Done: shared footer slices filtered rows and selection is trimmed to current visible page |
| TASK-210-03-01 | Forms Row Lifecycle Menu Contract | High | Medium | Done: extracted row menu exposes only Forms contract actions and routes Action logs canonically |
| TASK-210-03-02 | Forms Row Delete Confirmation Contract | High | Medium | Done: row delete is blocked behind `ConfirmActionDialog`; retained-history failures keep the row recoverable |
| TASK-210-04-01 | Forms Bulk Action Bar and Visible Selection | High | Medium | Done: selected rows render inline bulk controls beside `New` and only visible ids are mutable |
| TASK-210-04-02 | Forms Bulk Mutation Execution and Partial Failures | High | Medium | Done: bulk mutations use `Promise.allSettled`; partial failures show inline/toast copy and keep failed ids selected |
| TASK-210-05-01 | Forms Create Drawer Reset and Payload Guard | High | Medium | Done: drawer reset, compact trigger, accessible description, and list-to-client payload boundary are covered |
| TASK-210-05-02 | Forms Open After Create User Setting Contract | High | Medium | Done: `forms.openAfterCreate` has admin-client type, server default, boolean validation, cache update, and tests |
| TASK-210-06-01 | Forms List Toast Adapter Wiring | High | Medium | Done: create/lifecycle/delete/bulk success and failure feedback uses the shared list toast adapter |
| TASK-210-06-02 | Forms Route Error Mapping and Strict Schemas | High | Medium | Done: Forms schemas reject unknown statuses/top-level field keys and route mapping returns stable known API errors |
| TASK-210-07-01 | Forms Parity Test Matrix | Medium | Small | Done: Vitest Forms/UI/admin matrix, lint, typecheck, DB-backed Bun routes/services/settings, and submission hardening checks passed |
| TASK-210-07-02 | Forms Docs, Changelog, and Board Closure | Medium | Small | Done: Content List/Admin Cache/API/Architecture/admin Forms docs, SUMMARY-FORMS notes, changelog 743, task statuses, and board stats synced |
| TASK-211 | Pages Editor UX Followups | High | Large | Done: preview probe metadata, shared editor Sonner toasts, viewport-safe inserted-block scroll, Page History draft-version copy, docs, changelog 742, and targeted validation shipped; BUG-6 remains separate |
| TASK-209 | Coderso Custom Screens List Parity With Pages | High | Very Large | Done: `/admin/coderso/custom-screens` now matches Pages list structure with cached labels, filters, pagination, create drawer, shared toasts, confirmed row/bulk delete, changelog 740, and targeted validation |
| TASK-209-01 | Custom Screens List Data, Cache, and Enrichment | High | Large | Done: TTL-backed Custom Screens/content-type caches, mount/background refresh, prefetch warmup, and label projection landed |
| TASK-209-01-01 | Custom Screens Mount Refresh and Prefetch Parity | High | Medium | Done: cache-present/background and cache-missing/foreground refresh plus screens/content-types prefetch are covered |
| TASK-209-01-02 | Content Type Label Enrichment and List View Model | High | Medium | Done: list-local view model enriches labels, modes, and sidebar shortcut state without mutating API records |
| TASK-209-02 | Custom Screens Table, Filters, and Pagination | High | Large | Done: Pages-style shell, filters, table, pagination footer, and visible-row selection shipped |
| TASK-209-02-01 | Custom Screen List Shell and Create Entry Point | High | Medium | Done: compact `New` opens the list-owned create drawer with typed `customScreens.openAfterCreate` preference |
| TASK-209-02-02 | Custom Screen Filters for Search, Status, and Content Type | High | Medium | Done: search/status/content-type filters reset pagination and trim hidden selection |
| TASK-209-02-03 | Custom Screen Table, Pagination, and Visible Selection | High | Medium | Done: extracted table preserves builder/records links, row order, selected-row state, and shared footer behavior |
| TASK-209-03 | Custom Screens Actions, Toasts, and Confirmations | High | Large | Done: row lifecycle actions, shared list toasts, and confirmed single/bulk destructive flows shipped |
| TASK-209-03-01 | Custom Screen List Action Toast Adapter | High | Small | Done: create/activate/move-to-draft/delete copy uses the shared list-action toast helper |
| TASK-209-03-02 | Custom Screen Row Lifecycle and Status Actions | High | Medium | Done: Records/Edit/Activate/Move-to-draft/Delete actions use existing PATCH/DELETE contracts without Preview/Duplicate |
| TASK-209-03-03 | Custom Screen Bulk Actions and Delete Confirmations | High | Medium | Done: visible-scope bulk activate/draft/delete uses partial-failure summaries and ConfirmActionDialog gating |
| TASK-209-04 | QA, Docs, and Closure | Medium | Medium | Done: Content List UX/Admin Cache/CMS API docs, task board, changelog 740, and targeted validation evidence synced |
| TASK-211-05 | QA, Docs, and Source Report Closure | Medium | Medium | Done: targeted validation, preview/CMS docs, SUMMARY-PAGES closure, changelog, and board sync recorded |
| TASK-211-05-02 | Docs Changelog and Playwright Report Closure | Medium | Small | Done: PREVIEW/CMS docs, changelog 742, task board counts, and source report status synced |
| TASK-211-05-01 | Pages Editor Followup Test Matrix | Medium | Small | Done: Vitest UI/client matrix plus DB-backed Bun preview route/service/validation suites passed |
| TASK-211-04 | Page History Draft Copy Cleanup | Medium | Small | Done: Page History user-facing autosave copy now reads draft version while API/domain kind stays `autosave` |
| TASK-211-04-01 | Page Revision Drawer User-Facing Copy | Medium | Small | Done: drawer description, badge/label, restore dialog, and discard dialog use draft-version wording |
| TASK-211-03 | Inserted Block Viewport Alignment | Medium | Medium | Done: inserted blocks scroll with start alignment and keep selection/highlight/focus proof |
| TASK-211-03-01 | Inserted Block Scroll Target and Test Proof | Medium | Small | Done: regression proof asserts selected inserted block, highlight lifecycle, and `block: start` scroll alignment |
| TASK-211-02 | Page Editor Shared Toast Feedback | High | Medium | Done: editor save/publish success and failure use the central Sonner host through a shared action-toast adapter |
| TASK-211-02-02 | Page Editor Save Publish Toast Wiring | High | Medium | Done: PageEditor emits save/publish success/error toasts after awaited mutations while preserving inline context |
| TASK-211-02-01 | Admin Action Toast Adapter for Editor Mutations | High | Small | Done: shared non-list action toast helper added and list toast error normalization delegates to it |
| TASK-211-01 | Runtime Preview Probe and Failure State | High | Large | Done: Pages preview can request bounded probe metadata and RuntimePreviewDialog renders probe failures before iframe load |
| TASK-211-01-02 | Runtime Preview Dialog Error State | High | Medium | Done: optional probe prop preserves legacy no-probe callers while failed probes win over iframe load |
| TASK-211-01-01 | Preview Probe Security and Service Contract | High | Medium | Done: generated preview URL probe uses approved origins, timeout, redirect blocking, token redaction, and strict payload validation |
| TASK-208 | Admin List Action Toasts and Theme Tokens | High | Large | Done: token-backed shared Admin UI toasts and list action feedback parity shipped across Pages, Posts, Menus, Engine, and Entries |
| TASK-208-06 | Docs, Changelog, and Closure | Medium | Medium | Done: source docs, changelog 738, task board, and validation evidence synced |
| TASK-208-06-02 | Validation Changelog and Task Board Closure | Medium | Small | Done: targeted Vitest, lint, typecheck, changelog, and board closure recorded |
| TASK-208-06-01 | Content List and Design Token Docs | Medium | Small | Done: content list UX and design token docs describe shared list toasts and Sonner token mapping |
| TASK-208-05 | Entries List Toast Parity | High | Medium | Done: Entries create, bulk lifecycle, and confirmed delete feedback route through shared toast helpers |
| TASK-208-05-02 | Entry Bulk Delete Toast Audit and Tests | High | Medium | Done: Entries bulk/update/delete toast timing and partial failures covered |
| TASK-208-05-01 | Entry Create Toasts | High | Small | Done: Entry create success/error toasts are list-scoped without changing reusable drawer behavior |
| TASK-208-04 | Engine Content Type List Toast Parity | High | Medium | Done: Content Type create-error, row delete, and bulk lifecycle toast gaps closed |
| TASK-208-04-02 | Content Type Bulk Toasts and Regression Tests | High | Medium | Done: Content Type bulk publish/draft/delete toasts and partial-failure coverage landed |
| TASK-208-04-01 | Content Type Create Error Toasts | High | Small | Done: real drawer create mutation failure keeps local feedback and emits list-scoped callback toast |
| TASK-208-03 | Menus List Toast Parity | High | Medium | Done: Menus create, row lifecycle, bulk, and confirmed delete actions emit shared top-right toasts |
| TASK-208-03-02 | Menus Bulk Toasts and Regression Tests | High | Medium | Done: Menus bulk publish/unpublish/delete toasts and regression coverage landed |
| TASK-208-03-01 | Menus Create Row Lifecycle Toasts | High | Medium | Done: Menus create/publish/unpublish/delete success and error feedback uses shared helper |
| TASK-208-02 | Pages and Posts List Toast Parity | High | Large | Done: Pages and Posts list create, publish, unpublish, delete, and bulk feedback uses shared helper |
| TASK-208-02-03 | Pages Posts Toast Regression Tests | High | Medium | Done: Pages/Posts create, lifecycle, bulk, failure, and delete-confirm toast timing covered |
| TASK-208-02-02 | Posts List Mutation Toasts | High | Medium | Done: Posts list success/error toasts preserve inline feedback and delete confirmation order |
| TASK-208-02-01 | Pages List Mutation Toasts | High | Medium | Done: Pages list success/error toasts preserve inline feedback and delete confirmation order |
| TASK-208-01 | Shared Sonner Token Contract | High | Medium | Done: shared Admin UI toaster host and state styles use Admin UI Theme tokens |
| TASK-208-01-03 | Shared Toaster Token Regression Tests | High | Small | Done: AdminApp and Sonner wrapper tests cover richColors and token-backed state variables |
| TASK-208-01-02 | Sonner State Token Style Mapping | High | Medium | Done: normal, success, error, warning, and info rich-color variables map to Admin UI Theme variables |
| TASK-208-01-01 | AdminApp Toaster Host and Rich Color Token Ownership | High | Small | Done: AdminApp keeps one richColors toaster while wrapper owns visible token mapping |
| TASK-207 | Coderso Entries List Parity and Cross-Type Filtering | High | Very Large | Done: Entries first-screen parity shipped with all-entries read model, content-type column/link, advanced filters, shared pagination, and token-backed actions |
| TASK-207-05 | QA, Docs, and Closure | Medium | Medium | Done: targeted validation, docs, changelog 737, and board closure synced |
| TASK-207-04-03 | Entries Create/Action Popup Theme Token Audit | Medium | Medium | Done: create drawer, row actions, alerts, and action popups stay on shared theme primitives |
| TASK-207-04-02 | Entry Row/Bulk Delete Dialog Token Compliance | High | Medium | Done: row and bulk delete use shared confirmation dialog instead of native confirms |
| TASK-207-04-01 | Entries Inline Bulk Actions and Partial-Failure Feedback | High | Medium | Done: inline bulk controls execute visible selected refs and retain partial-failure feedback |
| TASK-207-04 | Entries Bulk Actions, Popups, and Token Compliance | High | Large | Done: inline bulk actions, partial-failure feedback, and token-backed confirmations landed |
| TASK-207-03-03 | Filter State, Selection Trim, and Empty States | Medium | Medium | Done: filter/page changes trim hidden selections and preserve truthful empty/loading states |
| TASK-207-03-02 | Advanced Content Type, Author, and Date Filters | High | Medium | Done: advanced filters cover content type, author, and updated-date range |
| TASK-207-03-01 | Basic Search, Status, and Filter Reset Contract | High | Small | Done: basic search/status and reset contract shipped |
| TASK-207-03 | Entries Filter Model - Basic and Advanced | High | Large | Done: compact search/status filters plus collapsible advanced filters shipped |
| TASK-207-02-03 | Shared Pagination and Visible-Scope Selection | High | Medium | Done: shared footer and visible-page `{ id, typeSlug }` selection model landed |
| TASK-207-02-02 | Entry Table Content Type Column and Engine Links | High | Medium | Done: rows show owning content type and link to Engine editor |
| TASK-207-02-01 | Entry List AdminShell, PageHeader, and Action Layout | High | Medium | Done: list uses shared shell, header, max-width, and compact `New` action |
| TASK-207-02 | Entries List Shell Parity With Admin Lists | High | Large | Done: `/admin/coderso/entries` now follows Pages/Posts/Menus/Content Types list pattern |
| TASK-207-01-02 | Entries Client Cache, Prefetch, and Cache Map | High | Medium | Done: `entries:list:all` cache, prefetch, mutation invalidation, assistant events, and docs shipped |
| TASK-207-01-01 | Entry List Read Model Service and Route Contract | High | Medium | Done: joined all-entries service and `GET /content-entries` route with strict query schema landed |
| TASK-207-01 | Entries Cross-Type Read Model and Cache Contract | High | Large | Done: internal all-entries read model plus cache/prefetch/docs alignment shipped |
| TASK-206 | Media Admin Cache Lifecycle and Partial List Updates | High | Large | Done: shared TTL-aware list cache, Media mount/picker cache reuse, partial media mutation updates, upload row response, docs, and validation shipped |
| TASK-206-03 | Regression Proof, Prefetch, Docs, and Closure | Medium | Medium | Done: regression matrix, docs, changelog 736, board closure, and validation evidence synced |
| TASK-206-03-02 | Docs, Changelog, and Board Closure | Medium | Small | Done: ADMIN_CACHE, cache map, CMS API, changelog, task statuses, and validation notes synced |
| TASK-206-03-01 | Media Cache and Prefetch Regression Matrix | Medium | Medium | Done: request-level Vitest coverage proves cached Media navigation, picker reuse, mutation updates, upload upsert, and TTL behavior |
| TASK-206-02 | Partial Media Mutation Cache Updates | High | Large | Done: media updates, recovery, replace, delete, and upload patch `media:list` without full-list invalidation |
| TASK-206-02-02 | Upload Response Row Contract and Cache Upsert | High | Medium | Done: upload service returns the authoritative media row so the admin client can upsert it |
| TASK-206-02-01 | Media Client Patch Helpers and Same-Tab Event Semantics | High | Medium | Done: patched same-tab cache events hydrate from cache before falling back to full reload |
| TASK-206-01 | Media Mount Hydration and Picker Cache Policy | High | Medium | Done: Media Library and MediaPicker reuse fresh `media:list` and avoid forced reload on ordinary entry |
| TASK-206-01-02 | Media Picker Cache Reuse and Shared Policy Helper | Medium | Medium | Done: picker resolves selected and opened states from cache before foreground fetch |
| TASK-206-01-01 | Media Library Mount Refresh Policy | High | Medium | Done: `/admin/media` uses cache-present/background and cache-missing/foreground mount options |
| TASK-206-00 | Admin Cache In-Memory TTL Contract | High | Medium | Done: shared memory-backed storage cache applies TTL to module memory and storage envelopes |
| TASK-205 | Admin List Pagination, Popup Tokens, and Content Type Parity | High | Very Large | Done: shared list pagination, token-backed confirmations, content type JSON scroll containment, and Content Types bulk parity shipped |
| TASK-205-05 | QA, Docs, and Closure | Medium | Medium | Done: TASK-205 docs, changelog 735, board closure, and validation evidence synced |
| TASK-205-04 | Content Type List Selection and Bulk Actions | High | Large | Done: Content Types visible-page selection plus bulk publish, draft, and delete reuse existing client/write contracts |
| TASK-205-03-03 | Pagination Regression Matrix and Docs | Medium | Medium | Done: shared pagination regression matrix and list UX docs updated |
| TASK-205-03-02 | Admin List Resource Adapters | High | Large | Done: Content Types, Pages, Posts, and Menus consume the shared pagination hook/footer after filtering and sorting |
| TASK-205-03-01 | Shared Pagination Hook and Footer | High | Medium | Done: resource-agnostic pagination hook/footer, page-size options, range metadata, and focused tests added |
| TASK-205-03 | Shared Admin List Pagination Contract | Medium | Large | Done: one shared client-side pagination contract now backs Content Types, Pages, Posts, and Menus |
| TASK-205-02 | Admin Popup Token Compliance for Content Types, Pages, Posts, and Menus | High | Large | Done: targeted hard-coded/native confirmations replaced with token-backed shared Admin UI surfaces |
| TASK-205-01 | Content Type JSON Preview Scroll Containment | High | Medium | Done: desktop and mobile content type JSON preview scroll containment repaired |
| TASK-202 | Engine Admin QA Recovery and Content Type Governance | High | Large | Done: Engine/content type UX, lifecycle, destructive safety, schema controls, and QA closure from SUMMARY-ENGINE |
| TASK-202-05 | Save, Publish, Status, and QA Closure | High | Large | Done: real content type status, save/publish feedback, source report closure, and existing dirty-record inventory |
| TASK-202-05-03 | QA Docs, Changelog, and Playwright Source Closure | Medium | Medium | Done: replayed SUMMARY-ENGINE, synced docs/changelog/board, and recorded validation |
| TASK-202-05-02 | Save Draft, Publish Feedback, Badge, and Shared Toaster | High | Medium | Done: save/publish toasts and status badge updates use the shared admin toaster |
| TASK-202-05-01 | Content Type Draft Published Status Model and Migration | High | Medium | Done: content types now persist draft/published status with migration artifacts |
| TASK-202-04 | Field Authoring and Schema Metadata Controls | High | Large | Done: label/key generation, readable labels, select builder, and number constraints shipped |
| TASK-202-04-04 | Number Field Constraints, Format, and Step Schema Mapping | Medium | Medium | Done: min/max/integer/decimal/step controls round-trip through JSON Schema |
| TASK-202-04-03 | Select Options Builder and Multi Select Schema Contract | High | Medium | Done: option rows, label/value pairs, multi-select, and entry rendering are covered |
| TASK-202-04-02 | Human Readable Label Backfill and Display Normalization | Medium | Small | Done: existing machine labels render with readable fallback labels without destructive rewrites |
| TASK-202-04-01 | Label to Field Name Autogeneration and Manual Lock | High | Medium | Done: new field keys derive from label until manually edited |
| TASK-202-03 | Destructive Change Safety for Content Types and Fields | High | Large | Done: guarded content type delete, confirmation UI, and field remove recovery shipped |
| TASK-202-03-03 | Field Remove Confirmation, Undo, and Schema Selection Recovery | High | Medium | Done: field removal is confirmed, undoable locally, and keeps selection stable |
| TASK-202-03-02 | Delete Type Danger Zone and List Confirmation UI | High | Medium | Done: editor/list delete confirmations include exact target context and shared feedback |
| TASK-202-03-01 | Content Type Delete Service Guard, Route Mapping, and Cache Invalidation | High | Medium | Done: delete guard blocks entries/screens/taxonomies/routes/listings and maps API errors |
| TASK-202-02 | Create, Duplicate, and Row Action Flows | High | Large | Done: create validation, create-to-editor navigation, duplicate flow, and lifecycle actions shipped |
| TASK-202-02-03 | Row Action Menu and Editor Lifecycle Entry Points | Medium | Small | Done: accessible Edit/Duplicate/Delete entry points use the existing table/editor surfaces |
| TASK-202-02-02 | Duplicate Content Type Action and Clone Contract | Medium | Medium | Done: schema-only duplicate creates unique draft copies with cache updates |
| TASK-202-02-01 | Create Drawer Duplicate Validation and Create-to-Editor Flow | High | Medium | Done: duplicate create guard, success feedback, and editor navigation shipped |
| TASK-202-01 | Engine List Discovery and Content Type Identity | High | Large | Done: search/sort/filter list, duplicate-name context, relation labels, and screen UUID guard shipped |
| TASK-202-01-03 | Screen UUID Name Hygiene and Generator Guard | Medium | Medium | Done: content-type writers use shared name normalization and reject generated Screen UUID names |
| TASK-202-01-02 | Duplicate Name Visibility and Relation Target Labels | High | Medium | Done: duplicate badges and relation labels include slug context |
| TASK-202-01-01 | Content Type List Search, Sort, and Status Filters | High | Medium | Done: list search, deterministic sort, and real status filter are wired |
| TASK-203 | Entries Admin QA Metadata, Rich Text, and Editor UX | High | Large | Done: Entries QA family from `_docs/PLAYWRIGHT/SUMMARY-ENTRIES.md` closed with metadata feedback, rich text, preview recovery, row actions, sidebar, SEO/taxonomy, docs, and tests |
| TASK-203-05 | QA, Docs, and Closure | Medium | Medium | Done: validation, Playwright finding map, docs, changelog 731, and board closure synced |
| TASK-203-04-02 | Metadata Panel SEO URL, Taxonomy Link, and Collapsible Help | Medium | Medium | Done: SEO preview now uses site content routes, taxonomy disabled state links to Engine, and help is collapsible |
| TASK-203-04-01 | Content Type Sidebar Grouping, Counts, and Hide Empty Types | Medium | Medium | Done: Entries sidebar groups populated and empty types, supports hide-empty, and disambiguates duplicate names with slugs |
| TASK-203-04 | Content Type Sidebar, SEO, Taxonomy, and Help Guidance | Medium | Large | Done: sidebar scanability and metadata guidance cleanup landed |
| TASK-203-03-02 | Duplicate Entry Route, Client, and List Feedback | High | Medium | Done: duplicate route/service/client/list action is real, CSRF-backed, and cache-safe |
| TASK-203-03-01 | Delete Confirmation, List/Bulk, and Editor Danger Zone | High | Medium | Done: row, bulk, and editor deletion use app dialogs and exact target context |
| TASK-203-03 | Row Actions, Delete, Duplicate, and Danger Zone | High | Large | Done: native confirms are removed, editor danger zone is present, and duplicate works end to end |
| TASK-203-02-02 | Entry Runtime Preview Parity and 404 Recovery | Medium | Medium | Done: generic content preview bypasses the Posts storage branch for `post`/`posts` content type slugs |
| TASK-203-02-01 | Rich Text Field Renderer Contract and Editor Surface | High | Large | Done: Engine `richtext` fields now reuse the rich text adapter/serializer instead of textarea-only editing |
| TASK-203-02 | Schema-Driven Rich Text and Runtime Preview | High | Large | Done: rich text rendering and content preview recovery shipped |
| TASK-203-01-03 | Status, Save Action Consolidation, and Metadata Dirty Guard | Medium | Medium | Done: duplicate Save draft surfaces are removed and metadata changes keep their own dirty state |
| TASK-203-01-02 | Editor Save, Update, Metadata Feedback, and Dirty State | High | Medium | Done: save/update/metadata/delete flows now show success/failure toast feedback and preserve dirty-state guards |
| TASK-203-01-01 | Metadata Route, Service Error Mapping, and API Client State | High | Medium | Done: metadata route maps bounded errors, publish transitions require `content:publish`, and failed client writes do not mutate cache |
| TASK-203-01 | Metadata Save, Status, and Feedback Contract | High | Large | Done: metadata route/client errors, save feedback, status dirty state, and action clarity are aligned |
| TASK-201 | Media Library QA Recovery and Asset Management UX | High | Large | Done: Media QA report closed with metadata/copy feedback, dimensions, empty states, real usage navigation, bulk actions, upload separation, replace action, docs, and changelog 729 |
| TASK-201-06 | QA Docs and Closure | Medium | Medium | Done: source Playwright closure, docs, changelog 729, and targeted validation recorded |
| TASK-201-05-03 | Replace Action Owner and Details Actions | Medium | Medium | Done: details Replace calls the existing media service/client owner and keeps the same media ID |
| TASK-201-05-02 | Upload Zone Separation and Open Details Preference Placement | Medium | Medium | Done: upload surface is separated from the asset list and `media.openAfterUpload` stays on the existing user-setting key |
| TASK-201-05-01 | Multi Select Bulk Delete and Download | Medium | Medium | Done: visible-scope selection, bulk download anchors, and confirmed per-asset bulk delete shipped |
| TASK-201-05 | Bulk Asset Actions and Upload Surface Clarity | Medium | Large | Done: library asset-management actions now have real owner callbacks and visible states |
| TASK-201-04-02 | Usage Entry Navigation and Affordance Fallback | Medium | Medium | Done: usage entries use canonical `AdminLink` hrefs for pages, entries, posts, and commerce products |
| TASK-201-04-01 | Media Usage Read Model | High | Medium | Done: bounded media usage summaries read existing page, entry, post, and commerce references |
| TASK-201-04 | Usage Navigation and Reference Contracts | High | Large | Done: hard-coded usage examples were replaced with a route/client/service usage contract |
| TASK-201-03-03 | Grid List View Mode Parity | Medium | Small | Done: toolbar view state now renders distinct grid and list presentations through `MediaGrid` |
| TASK-201-03-02 | Pagination Has-More Contract and Loaded Counts | Medium | Medium | Done: inert Load More was removed for the current full-list contract and loaded counts are shown |
| TASK-201-03-01 | Empty State Copy and Upload Recovery CTA | Medium | Small | Done: empty list/filter/search states render a bounded empty message instead of a blank grid |
| TASK-201-03 | Filter Empty States and Load More Truth | High | Medium | Done: list truthfulness now matches the checked-out full-list media API |
| TASK-201-02-02 | Legacy Dimension Backfill and Details Rendering | Medium | Medium | Done: selected image rows without dimensions trigger service-backed recovery and truthful unknown/non-image rendering |
| TASK-201-02-01 | Image Dimension Extraction and Persistence | High | Medium | Done: upload/replace persist dimensions using the media service dimension parser |
| TASK-201-02 | Image Dimensions and File Information | High | Large | Done: image dimensions are persisted/recovered through the media service contract and rendered in details |
| TASK-201-01-02 | Human Readable Naming and Missing Alt Signals | High | Medium | Done: media display helpers prefer title/original name and image assets expose missing-alt warnings |
| TASK-201-01-01 | Metadata Autosave Status and Copy URL Feedback | High | Medium | Done: drawer autosave and Copy URL use real async success/failure feedback |
| TASK-201-01 | Metadata Save Feedback and Asset Identity | High | Large | Done: metadata confidence and asset identity gaps from the media QA report are closed |
| TASK-204 | Posts QA Follow-up - Toasts, Revisions, Taxonomy, and Block Inserter | High | Large | Done: shared toast a11y config, revision fallback metadata, taxonomy/settings/autosave safe route errors, category retry, scoped inserter search, source-report closure, and explicit media capability gap owners landed |
| TASK-204-04-01 | Runtime Console Error Triage Settings and Autosave | High | Medium | Done: settings and autosave unexpected failures map to bounded browser-facing API errors while preserving truthful failure state |
| TASK-204-04 | QA Docs and Playwright Source Closure | Medium | Medium | Done: TASK-204 source report map, docs, changelog 728, board sync, and validation evidence recorded |
| TASK-204-03-02 | Media Block Capability Contract for Video Gallery Audio File | Medium | Large | Done: Video/Gallery/Audio/File remain explicitly open capability work with schema/defaults/normalizer/editor/runtime owners, avoiding catalog-only labels |
| TASK-204-03-01 | Category Scoped Search Copy and Regression Proof | Medium | Small | Done: block inserter search placeholder and aria label now follow the active category, with category-intersection tests |
| TASK-204-03 | Block Inserter Search and Media Capability Follow-up | Medium | Large | Done: scoped search closure shipped and media capability gap was classified without fake surface labels |
| TASK-204-02-02 | Category Selector Friendly Error and Retry State | High | Small | Done: Posts inspector renders safe category load copy with retry instead of raw query text |
| TASK-204-02-01 | Taxonomy Overview Route Error Mapping and Client Sanitization | High | Medium | Done: taxonomy overview route maps unexpected errors to bounded `taxonomy_unexpected_error` responses |
| TASK-204-02 | Taxonomy Terms Error Boundary and Category Retry | High | Medium | Done: taxonomy route boundary and Posts category selector failure recovery are covered |
| TASK-204-01-02 | Revision Drawer A11y and Empty Preview Fallback | High | Small | Done: revisions sheet description and useful bounded fallback metadata landed |
| TASK-204-01-01 | Publish Update Toast Delivery and A11y Proof | High | Small | Done: shared admin toaster config exposes accessible notification behavior and close/duration settings |
| TASK-204-01 | Post Feedback and Revision Drawer Reliability | High | Medium | Done: publish/update feedback and revision drawer reliability hardening shipped |
| TASK-200 | Menus List Parity With Pages and Posts | High | Large | Done: Menus list now matches Pages/Posts with filters, visible-row selection, inline bulk actions, row three-dot lifecycle/delete actions, and published-only runtime navigation |
| TASK-199 | Posts List Header Bulk Actions | Medium | Small | Done: Posts bulk controls now appear inline in the header actions beside `New`, matching Pages without pushing the table down |
| TASK-198 | Page List Header Bulk Actions | Medium | Small | Done: Pages bulk controls now appear inline in the header actions beside `New`, so row selection no longer pushes the table down |
| TASK-197 | Pages Builder Library Panel Scroll Containment | Medium | Small | Done: the Pages builder left rail now keeps its tab/search chrome fixed and scrolls widgets/templates/forms inside the active list viewport on desktop and mobile |
| TASK-196 | Menus Admin IA, Reliability, and Editor Clarity | High | Large | Done: Menus now starts from a list screen, edits one chosen menu per route, confirms item delete in UI, and ships docs/test closure |
| TASK-196-04 | QA, Docs, and Closure | Medium | Medium | Done: targeted Menus Vitest matrix, docs source-of-truth sync, changelog, and board closure landed |
| TASK-196-03 | Editor Feedback and Field Guidance | Medium | Medium | Done: explicit save toast plus clearer `Location` and `Icon Name` guidance without changing stored contracts |
| TASK-196-03-02 | Location and Icon Guidance Without Contract Expansion | Medium | Small | Done: create/editor location help and icon-token guidance now explain current contracts more clearly |
| TASK-196-03-01 | Save Feedback and Dirty-State Visibility | Medium | Medium | Done: successful menu save now shows visible confirmation while preserving existing dirty-state cues |
| TASK-196-02 | Menu Item Deletion Safety and Tree Readability | High | Medium | Done: delete confirm, nested hierarchy hints, and clearer tree affordances landed on the existing Menus editor |
| TASK-196-02-02 | Nested Tree Indentation and Row Affordance Clarity | High | Medium | Done: child-item hints, drag target messaging, and explicit row action labels now clarify hierarchy editing |
| TASK-196-02-01 | Delete Confirmation Dialog and Descendant Context | High | Medium | Done: destructive menu-item removal now goes through a branded dialog with child-impact context |
| TASK-196-01 | Menus List Screen and Single-Editor Routing | High | Large | Done: Menus split into `/menus` list and `/menus/:id` editor with route-scoped detail ownership |
| TASK-196-01-02 | Single-Menu Editor Route, Back Navigation, and Cache Scope | High | Medium | Done: editor now loads one route-selected menu, keeps back navigation visible, and drops cross-menu switching |
| TASK-196-01-01 | Menus List Page, Table, and Create Flow | High | Medium | Done: Menus list page now owns selection and creation before users enter the editor |
| TASK-195 | Posts Admin QA Recovery and Authoring UX Polish | High | Large | Done: Posts list bulk actions, editor confidence, inspector affordances, and writing-surface clarity aligned with the QA report |
| TASK-195-05 | QA, Docs, and Closure | Medium | Medium | Done: final targeted validation, docs parity, changelog, and board closure synced for TASK-195 |
| TASK-195-04-02 | Block Inserter Media Grouping and Category Search Regression | Medium | Medium | Done: `Embed` moved to Media, `Separator` moved to Text, and category-scoped search stayed deterministic |
| TASK-195-04-01 | Typography Control Affordance and Disabled-State Clarity | Medium | Small | Done: typography helper copy now matches the current toolbar contract and disabled-state behavior |
| TASK-195-04 | Writing Toolbar and Block Inserter Clarity | Medium | Medium | Done: toolbar helper copy and block inserter grouping/search are clearer and regression-covered |
| TASK-195-03-02 | SEO Visibility and Slug URL Context | Medium | Small | Done: collapsed SEO summary plus slug URL/route hint context shipped for create and edit flows |
| TASK-195-03-01 | Category and Featured Image Picker Surfaces | High | Medium | Done: category selection and image-only featured image picking replaced raw ID entry |
| TASK-195-03 | Post Inspector Taxonomy, Media, and SEO Affordances | High | Medium | Done: picker-backed inspector controls and clearer SEO/slug affordances shipped |
| TASK-195-02-03 | Revision Preview Before Restore | Medium | Medium | Done: revision drawer now shows bounded preview before restore |
| TASK-195-02-02 | Publish Update Feedback and Autosave Failure Surfacing | High | Medium | Done: publish/update success toasts and actionable autosave retry surfacing shipped |
| TASK-195-02-01 | Inspector Discoverability and Toolbar Action Semantics | High | Medium | Done: Details semantics and shell discoverability are explicit without forking layout state |
| TASK-195-02 | Post Editor Shell Discoverability, Feedback, and Revision Confidence | High | Large | Done: shell confidence and revision preview gaps from QA are closed |
| TASK-195-01-02 | Bulk Apply Flow and Shared Filter Copy | High | Medium | Done: bulk publish/unpublish/delete flow and Posts-specific filter copy are live |
| TASK-195-01-01 | Posts Table Selection State and Bulk Toolbar | High | Medium | Done: controlled selection and filtered-scope bulk toolbar shipped for posts table |
| TASK-195-01 | Posts List Bulk Actions and Filter Terminology | High | Large | Done: Posts list now supports visible-scope selection, bulk apply flow, and correct shared filter wording |
| TASK-194 | Pages Admin UX Reliability and Polish | High | Large | Done: Pages list/cache, drawer accessibility, editor feedback, preview recovery, and builder discoverability are aligned with the QA report |
| TASK-194-05 | QA Docs and Closure | Medium | Medium | Done: final Pages admin UX validation, docs parity, Playwright summary refresh, changelog, and board closure |
| TASK-194-04-02 | Wizard Transition Slot Guidance and Widget Category Groups | High | Medium | Done: wizard handoff is explicit, empty slots route into the existing widget library surface, and builder widgets are grouped by category |
| TASK-194-04-01 | Block Toolbar Accessibility Labels and Action Hints | High | Small | Done: block toolbar actions expose labels/tooltips and delete affordance is explicit |
| TASK-194-04 | Builder Accessibility and Widget Discoverability | High | Medium | Done: Pages builder toolbar, wizard handoff, empty-slot guidance, and widget picker discoverability are repaired |
| TASK-194-03-02 | New Block Insertion Focus and Scroll | Medium | Small | Done: newly inserted blocks are selected, scrolled into view, and briefly highlighted |
| TASK-194-03-01 | Save Publish Success Feedback and Runtime Preview Failure State | High | Medium | Done: editor feedback is visible and runtime preview failures are actionable on the existing dialog surface |
| TASK-194-03 | Page Editor Feedback and Runtime Preview Recovery | High | Medium | Done: save/publish confidence, preview recovery, and post-insert viewport behavior are fixed |
| TASK-194-02-02 | Create Drawer Validation, Dialog Accessibility, and Settings Microcopy | Medium | Small | Done: disabled create/max-width states are explained and drawer descriptions use user-facing copy |
| TASK-194-02-01 | Template Options Loading Lifecycle and Settings Status Copy | High | Medium | Done: usable template choices no longer sit under permanent blocking loading copy and failure has retry |
| TASK-194-02 | Page Settings and Create Flow Clarity | High | Medium | Done: settings/create flows use truthful loading, descriptions, and disabled-state guidance |
| TASK-194-01-03 | Create Path Author Hydration and List Cache Correctness | High | Medium | Done: Pages list cache preserves authoritative author state and no longer shows stale `Unknown` after create/duplicate/detail mutations |
| TASK-194-01-02 | Page Bulk Action Execution and Cache Refresh | High | Medium | Done: bulk publish/unpublish/delete refresh the list and handle partial failures cleanly |
| TASK-194-01-01 | Page Table Selection State and Bulk Bar | High | Medium | Done: controlled row/header selection and selected-count bulk toolbar are wired on visible rows |
| TASK-194-01 | Page List Bulk Actions and Author Consistency | High | Large | Done: Pages list behaves like the repo bulk-action contract and author presentation is cache-safe |
| TASK-193 | Pages Bun Route Timeout Stabilization | Medium | Small | Done: DB-backed Pages route lifecycle coverage now uses an explicit Bun test timeout without changing route behavior |
| TASK-192 | Assistant Admin Menu Resource Catalog Repair | High | Medium | Done: assistant catalog exposes posts, entries, full menus, media, commerce, solution kits, and screens for read-only inspection |
| TASK-191 | Pages Test Coverage Hardening | High | Large | Done: Pages route/runtime/client/cache/builder coverage hardened with final QA and coverage validation |
| TASK-191-05 | QA, Docs, Changelog, and Closure | Medium | Small | Done: final targeted Bun/Vitest matrices, full Vitest coverage, lint/typecheck, board, and changelog synced |
| TASK-191-04 | Page Builder Branch Coverage Closure | Medium | Medium | Done: helper no-op/fallback branches and AdvancedPanel missing-state fallbacks covered |
| TASK-191-03 | Pages Admin Client Cache Coverage | High | Medium | Done: `pagesClient` list/detail cache, mutation broadcasts, noop handling, and template options coverage expanded |
| TASK-191-02 | Public Page Runtime and Preview Coverage | High | Medium | Done: public runtime renders published data, preview renders current draft data, and unsafe preview/page states are covered |
| TASK-191-01 | Pages Admin Route Contract and Security Coverage | High | Medium | Done: route permissions, validation, auth-required, lifecycle, audit, and error-path coverage added for `/pages*` |
| TASK-189 | Assistant Policy Engine Audit Remediation | High | Large | Done: provider action arrays removed, exact policy identity fixed, provider-side parallel heuristics collapsed |
| TASK-189-05 | Final Operation Policy Planner Hardening | High | Large | Done: planner-owned CMS/admin branches and provider repair fallback removed; policy path is enforced |
| TASK-189-04 | Docs, Tests, and Closure | High | Medium | Done: docs, changelog, targeted Vitest, lint/typecheck, and live assistant matrix synced |
| TASK-189-03 | Remove Parallel Planner Heuristics | High | Large | Done: provider-side local-first one-offs replaced by one policy-backed operation path |
| TASK-189-02 | Fix Policy Resource Identity and Settings Collisions | High | Large | Done: shared-kind settings/admin resources keep exact policy keys through draft/resolver/guidance |
| TASK-189-01 | Remove Provider Action Array Fallback | High | Medium | Done: provider `actions[]` no longer adapt into executable plans |
| TASK-188 | Assistant Operation Policy Engine | High | Large | Done: operation policy is source of truth for provider guidance, resolver/filtering, mapping/safety, follow-up, and coverage |
| TASK-188-10 | Docs, Changelog, and Closure | High | Medium | Done: final docs, changelog, board, and OpenAI/OpenRouter live validation synced |
| TASK-188-09 | Policy Engine Cutover and Heuristic Removal | High | Large | Done: legacy CMS registry and remaining duplicated planner count/resource guards removed |
| TASK-188-08 | LangGraph Orchestration Evaluation | Medium | Medium | Done: ADR defers LangGraph adoption; no dependency added before policy cutover |
| TASK-188-07 | Navigation Coverage and Live Matrix From Policy | High | Medium | Done: live coverage matrix and admin navigation route coverage are validated from operation policy |
| TASK-188-06 | Planning State and Follow-Up Policy | High | Medium | Done: follow-up pronouns/counts and candidate selection now use policy-backed planning state rules |
| TASK-188-05 | Action Mapping and Safety Rules From Policy | High | Large | Done: generic action mapper and provider safety guards now use policy-backed action/field/safety metadata |
| TASK-188-04 | Resolver and Filtering From Policy | High | Large | Done: CMS target resolver now uses policy-backed resource aliases, filters, counts, matching, and surface fallback |
| TASK-188-03 | Provider Guidance and JSON Schema From Policy | High | Medium | Done: provider registry, guidance, prompt policy JSON, and draft schema enums are derived from policy |
| TASK-188-02 | Policy Migration for Current CMS Resources | High | Large | Done: current CMS/admin/settings/Coderso routes are represented in operation policy metadata |
| TASK-188-02-04 | Coderso Planned and Gated Modules Policy Migration | High | Medium | Done: Coderso preview/planned modules and remaining gated routes are represented in policy |
| TASK-188-02-03 | Admin Settings Security Tools Policy Migration | High | Medium | Done: admin/settings/security/tools policy entries are gated/read-only with redacted secret surfaces |
| TASK-188-02-02 | Content Screens Widgets Media Policy Migration | High | Medium | Done: operation policy entries cover content types, entries, screens, widget templates, and media |
| TASK-188-02-01 | Pages Forms Listings Policy Migration | High | Medium | Done: first operation policy entries cover pages, forms, listing queries, and listing templates |
| TASK-188-01 | Policy Schema and Resource Contract | High | Medium | Done: added strict operation policy types, schema normalizer, and lookup helpers |
| TASK-187 | Assistant Filtered All Delete and Je Follow-Up | High | Small | Done: `usun je` and filtered-all published page deletes map to reviewed actions |
| TASK-186 | Assistant Follow-Up All Candidates Delete | High | Small | Done: no-query multi-candidate follow-ups target exact prior candidates instead of first-label prefix |
| TASK-185 | Assistant Read-Only Status Question Guard | High | Small | Done: live provider status/visibility questions stay read-only before model inference |
| TASK-184-17 | Docs, Commands, and Closure | High | Medium | Done: live CMS command family, docs, changelog, and final validation synced |
| TASK-184 | Assistant Live CMS Operation Matrix | High | Large | Done: OpenAI/OpenRouter full Admin UI live matrix, coverage map, and commands completed |
| TASK-184-16 | Navigation Coverage Map and Planned Modules | High | Medium | Done: live coverage matrix covers sidebar, Coderso modules, settings routes, and planned modules |
| TASK-184-15 | Settings Live Matrix | High | Large | Done: OpenAI/OpenRouter live matrix verifies settings/security prompts stay non-executable and redacted |
| TASK-184-14 | Admin Users, Roles, Audit, and Access Logs Live Matrix | High | Medium | Done: OpenAI/OpenRouter live matrix verifies admin/security prompts stay non-executable and redacted |
| TASK-184-13 | Tools, Redirects, Backups, and Import Export Live Matrix | High | Medium | Done: OpenAI/OpenRouter live matrix verifies Tools/Redirects/Backups/Import-Export prompts stay non-executable without typed contracts |
| TASK-184-12 | Store, Themes, Dashboard, and Analytics Live Matrix | High | Medium | Done: OpenAI/OpenRouter live matrix verifies dashboard/store/theme/analytics stay non-executable without typed contracts |
| TASK-184-11 | Coderso Operations Modules Live Matrix | High | Large | Done: OpenAI/OpenRouter live matrix verifies unsupported operation modules stay non-executable/gated |
| TASK-184-10 | Posts, Media, and Admin Search Live Matrix | High | Medium | Done: OpenAI/OpenRouter live matrix gates post/media upload mutations and verifies Admin Search media fixture coverage |
| TASK-184-09 | Bulk Follow-Up and Safety Live Matrix | High | Medium | Done: OpenAI/OpenRouter live matrix covers follow-up deletion, count mismatch, broad destructive guard, and counted update |
| TASK-184-08 | Menus, SEO, and Media Live CMS Operation Matrix | High | Medium | Done: OpenAI/OpenRouter DB-backed live matrix covers menu items, SEO documents, and media references |
| TASK-184-07 | Widget Templates Live CMS Operation Matrix | High | Medium | Done: OpenAI/OpenRouter DB-backed live matrix covers widget template search, update, block patch, delete, and safety |
| TASK-184-06 | Listings Live CMS Operation Matrix | High | Medium | Done: OpenAI/OpenRouter DB-backed live matrix covers listing query/template search, update, delete, and safety |
| TASK-184-05 | Forms Live CMS Operation Matrix | High | Medium | Done: OpenAI/OpenRouter DB-backed live matrix covers form create/search/update/archive/delete and broad-delete safety |
| TASK-184-04 | Custom Screens Live CMS Operation Matrix | High | Medium | Done: OpenAI/OpenRouter DB-backed live matrix covers screen search, update, delete, and safety |
| TASK-184-03 | Content Types and Entries Live CMS Operation Matrix | High | Large | Done: OpenAI/OpenRouter DB-backed live matrix covers content type and active entry operations |
| TASK-184-02 | Pages Live CMS Operation Matrix | High | Medium | Done: OpenAI/OpenRouter DB-backed live matrix covers page create/search/update/delete/safety |
| TASK-184-01 | Live CMS Matrix Harness and Fixture Isolation | High | Large | Done: shared live provider harness, disposable prefixes, lazy dry-run/execute wrappers, and cleanup stack |
| TASK-183 | Assistant Page Title Search Filtering | High | Small | Done: LLM Guide page title searches now return only matching pages, including live OpenAI/OpenRouter coverage |
| TASK-182 | Assistant Chat Mode Control Removal | Medium | Small | Done: floating assistant chat keeps readiness badge, removes mode selector, and adds a New conversation button |
| TASK-181 | Assistant Follow-Up Target Selection With Live Provider | High | Small | Done: provider path now prefers bounded planning-state follow-up target selection |
| TASK-180-01-01 | Execution Result to Cache Event Matrix | High | Medium | Done: successful assistant action results now map to known admin cache keys |
| TASK-180-01-02 | Admin Cache Subscribers and Clear Helpers | High | Medium | Done: existing subscribers were verified and SEO now consumes cache bus events |
| TASK-180-01 | Assistant Execution Cache Consistency | High | Large | Done: assistant execute invalidates CMS admin cache families beyond pages/custom screens |
| TASK-180-02-01 | Counted Delete and Archive Target Planning | High | Medium | Done: counted destructive planning covers non-page CMS families with unsafe cases blocked |
| TASK-180-02-02 | Multi Update and Create Planning Boundaries | High | Large | Done: counted multi-update and explicit multi-create map through strict typed actions |
| TASK-180-02 | Assistant CMS Multi-Target Planning | High | Large | Done: generic CMS resolver/mapper handles safe counted and explicit bulk plans |
| TASK-180-03 | Docs, Gates, and Closure | High | Medium | Done: TASK-180 docs, changelog, board, and validation synced |
| TASK-180 | Assistant CMS Bulk Operations and Cache Consistency | High | Large | Done: assistant bulk CMS operations and admin cache refresh are consistent across supported families |
| TASK-179-01 | Surface Hint and Filter Operation Draft Contract | High | Medium | Done: CMS operation drafts support surfaceHint and allowlisted filters |
| TASK-179-02 | Provider Prompt and Structured Output Surface Hints | High | Medium | Done: provider guidance covers CMS-wide surface hints and target query separation |
| TASK-179-03 | Surface-Aware Target Resolver and Filtering | High | Large | Done: resolver applies surface hints and active/visible filters per resource family |
| TASK-179-04 | Read-Only Inspection UI Copy and State | High | Medium | Done: inspection UI is read-only and no longer renders planned-action copy |
| TASK-179-05 | Natural Prompt Fixtures and Live Provider Regression | High | Large | Done: OpenAI/OpenRouter live matrix covers Screens, Pages, Engine/content types, and Forms |
| TASK-179-07 | Assistant Action Admin Cache and Sidebar Refresh | High | Medium | Done: assistant custom-screen mutations invalidate list/detail cache and sidebar shortcuts |
| TASK-179-08 | Assistant Conversation State Persistence | High | Medium | Done: assistant transcript and safe plan context persist across close/remount |
| TASK-179-06 | Docs, Changelog, and Closure | High | Small | Done: docs, matrix, changelog, and targeted gates closed TASK-179 |
| TASK-179 | LLM Guide Surface Hints, Filters, and Inspection UX | High | Large | Done: natural surface hints, filters, inspection UX, cache refresh, persistence, and live tests completed |
| TASK-178-03 | Provider-First Planner Context and Draft Contract | High | Large | Done: provider-first operation drafts, response kinds, and safety fixtures shipped |
| TASK-178-03-01 | LLM Guide Mode Planning Route Contract | High | Medium | Done: LLM Guide mode routes through action planning without frontend keyword gating |
| TASK-178-03-02 | Provider Operation Draft Prompt and Response Schema | High | Large | Done: provider prompt package and draft adapter now support strict CMS operation drafts |
| TASK-178-03-03 | Model-First Planner Orchestration and Fallbacks | High | Large | Done: provider-aware planner wrapper is wired into the default action plan route with fallback |
| TASK-178-03-04 | Planner Response Kinds for Docs, Inspection, Action, and Needs Input | High | Medium | Done: strict responseKind metadata drives docs/inspection/action/needs-input UI behavior |
| TASK-178-03-05 | Provider Safety Evaluation and Route Coverage | High | Medium | Done: fake-provider fixtures cover malformed, unsafe, broad, and valid operation drafts |
| TASK-178-05 | Generic Mutation Planning and Action Mapping | High | Large | Done: generic CMS operation drafts map to existing typed actions for supported resources |
| TASK-178-06 | Conversation State and Follow-Up Target Memory | High | Medium | Done: bounded inspection candidate state supports safe follow-up target selection |
| TASK-178-07 | Evaluation Fixture Matrix and Red-Team Corpus | High | Large | Done: CMS operation fixtures, provider safety, structured output strategy, and live smokes covered |
| TASK-178-07-01 | OpenRouter Live Planner Smoke | High | Small | Done: opt-in live OpenRouter planner smoke uses test-only env vars |
| TASK-178-07-02 | Model Capability Driven Structured Output Strategy | High | Medium | Done: provider/model-family structured output strategy drives CMS operation draft requests |
| TASK-178-08 | Review UX, Docs, Gates, and Closure | High | Medium | Done: final UI/docs/gate closure confirmed the single extensible LLM Guide flow |
| TASK-178 | LLM Guide Generic CMS Reasoning and Plan Orchestration | High | Large | Done: generic CMS reasoning, provider strategy, mapping, memory, fixtures, and closure completed |
| TASK-178-01 | Intent Operation Taxonomy and Planner Contract | High | Medium | Done: strict CMS operation draft schema and planner integration foundation shipped |
| TASK-178-02 | CMS Resource Registry and Target Resolver | High | Large | Done: registry aliases, page summaries, and target resolution outcomes shipped |
| TASK-178-04 | Generic Read, Inspect, and Candidate Plans | High | Medium | Done: read-only inspection plans render CMS candidates without execution controls |
| TASK-170-01 | Action Family Contract and Permission Model | High | Medium | Done: non-executable action family contract registry and permission model added |
| TASK-170-01-01 | Entry Action Contracts | High | Medium | Done: entry contracts documented; `entry.upsert-draft` was later promoted by TASK-170-03-01 |
| TASK-170-01-02 | Menu, SEO, and Media Action Contracts | High | Medium | Done: menu/SEO/media contracts documented; menu item and SEO were later promoted by TASK-170-03-02 leaves |
| TASK-170-01-03 | Form, Page, and Listing Expansion Contracts | High | Medium | Done: form automation and page/listing patch contracts stay contract-only |
| TASK-170-02 | Registry, Diff, and Preview Metadata Expansion | High | Medium | Done: preview metadata redaction and contract-only conflict/dependency helpers added |
| TASK-170-03-01 | Entry Draft Action Executor Adapters | High | Medium | Done: `entry.upsert-draft` executes draft create/update through existing entry services |
| TASK-170-03-02 | Menu, SEO, and Media Action Executor Adapters | High | Large | Done: menu item, SEO document, and entry media-reference adapters execute through existing services |
| TASK-170-03-02-01 | Menu Item Upsert Executor Adapter | High | Medium | Done: `menu.item.upsert` executes through existing menu services and rejects unsafe hrefs |
| TASK-170-03-02-02 | SEO Document Upsert Executor Adapter | High | Medium | Done: `seo.document.upsert` executes through existing SEO service for page/entry targets |
| TASK-170-03-02-03 | Media Reference Attach Executor Adapter | High | Large | Done: `media.reference.attach` attaches existing media to entry targets only |
| TASK-170-03-02-04 | Menu, SEO, and Media Adapters Docs, Tests, and Closure | High | Small | Done: docs, board, and changelog synced for menu/SEO/media adapter wave |
| TASK-170-03-03-01 | Listing Query Filters Patch Executor Adapter | High | Medium | Done: `listing-query.filters.patch` updates query filters through existing listing query service |
| TASK-170-03-03-02 | Listing Template Card Patch Executor Adapter | High | Medium | Done: `listing-template.card.patch` updates card config through existing listing template service |
| TASK-170-03-03-03 | Page Widget Patch Executor Adapter | High | Large | Done: `page.widget.patch` upserts one validated top-level widget block while preserving unrelated blocks |
| TASK-170-03-03-04 | Form Automation Upsert Executor Adapter | High | Large | Done: `form.automation.upsert` upserts safe non-webhook actions through existing form action services |
| TASK-170-03-03 | Form, Page, and Listing Patch Executor Adapters | High | Large | Done: listing, page, and safe form automation patch adapters shipped |
| TASK-170-03-03-05 | Form, Page, and Listing Patch Adapters Docs, Tests, and Closure | High | Medium | Done: docs, board, and changelog synced for patch adapter wave |
| TASK-170-03 | Executor Adapters and Domain Service Reuse | High | Large | Done: executor adapters and route-level per-action permission enforcement shipped |
| TASK-170-03-04 | Executor Adapter Docs, Tests, and Closure | High | Medium | Done: route permission tests, docs, board, and changelog synced for executor adapter wave |
| TASK-170-04 | Admin Review UI for Expanded Actions | Medium | Medium | Done: review/result UI renders action labels, targets, conflicts, and dependencies |
| TASK-170-05 | Route Security, Tests, Docs, and Closure | High | Medium | Done: final route/security/docs closure completed for expanded action families |
| TASK-170 | LLM Guide Action Family Expansion | High | Large | Done: expanded typed action families shipped with contracts, adapters, UI, route permissions, docs, and tests |
| TASK-171-01 | Provider Prompt Context Packaging and Redaction | High | Medium | Done: bounded/redacted provider planning prompt package helper added |
| TASK-171-01-01 | Docs and Runtime Context Budgeting | High | Medium | Done: docs/runtime/resource budgets are deterministic and test-covered |
| TASK-171-01-02 | Secret Redaction and Audit-Safe Payloads | High | Medium | Done: provider package redaction covers nested secrets and signed URL metadata |
| TASK-171-02 | Provider Draft Execution and Fallback Control | High | Large | Done: fake-provider draft helper maps through strict adapter and falls back deterministically |
| TASK-171-03 | Schema Repair and Clarification Questions | High | Medium | Done: safe draft repair keeps typed provider questions when strict schema fails |
| TASK-171-04 | Plan Confidence, Assumptions, and UX Explanation | Medium | Medium | Done: review UI distinguishes provider draft plans from local planner plans |
| TASK-171-05 | Provider Planner Evaluation Fixtures and Route Coverage | High | Medium | Done: fake-provider fixtures cover success, unsafe draft, provider error, and unavailable fallback |
| TASK-171 | LLM Guide Provider Planner Intelligence | High | Large | Done: provider prompt package, draft helper, schema repair, review metadata, and fixtures shipped without live network dependency |
| TASK-172-01 | Blueprint Pack Contract and Shared Builder Expansion | High | Medium | Done: shared business blueprint pack contract wraps existing catalog presets |
| TASK-172-02 | Lead Capture Site Pack | High | Large | Done: lead capture prompts create a public inquiry form and simple landing page |
| TASK-172-03 | Booking Service Business Pack | High | Large | Done: booking prompts return gated needs-input until booking action adapters land |
| TASK-172-04 | Product Inquiry and Ecommerce Starter Pack | High | Large | Done: product inquiry catalog is executable; checkout/payment prompts stay gated |
| TASK-172-05 | Portfolio Case Study Pack | Medium | Medium | Done: portfolio pack includes case-study result and testimonial fields |
| TASK-172-06 | Editorial Content Hub Pack | Medium | Large | Done: editorial hub page uses posts-feed widget without mutating post records |
| TASK-172-07 | Solution Kit Refinement Packs and No-Reinstall Flow | High | Large | Done: refinements gated until server-derived installed-kit context exists |
| TASK-172-08 | Runtime Acceptance, Docs, and Widget Pack Matrix Closure | High | Medium | Done: planner/executor/public runtime coverage and docs closure completed |
| TASK-172 | LLM Guide Business Blueprint Packs | High | Large | Done: executable and gated business blueprint packs shipped with docs and validation |
| TASK-173-01 | Acceptance Matrix and Flow Inventory | High | Medium | Done: `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md` maps capabilities to Vitest/Bun ownership |
| TASK-173-01-01 | Docs-Only Cannot Mutate Regression | High | Small | Done: docs-only mutation prompts stay read-only and do not call provider |
| TASK-173-01-02 | Action Family Route Error Matrix | High | Medium | Done: unsupported action route error and permission matrix coverage recorded |
| TASK-173-02 | Partial Success and Recovery UX | Medium | Medium | Done: execution result UI shows failed action reasons and retry guidance |
| TASK-173-03 | Idempotency Replay Diagnostics and Support Metadata | High | Medium | Done: execute results expose actor/plan/hash replay diagnostics without leaking payloads |
| TASK-173-04 | Security and Performance Gates for Action Endpoints | High | Medium | Done: security/perf gates and assistant rate-limit route checks revalidated |
| TASK-173-05 | Observability, Audit, and Admin Diagnostics | Medium | Medium | Done: assistant metrics aggregate action execution, failures, and replay counts |
| TASK-173-06 | Docs Corpus Capability Limits and Closure | High | Medium | Done: docs/corpus now state LLM Guide supported capabilities, gated gaps, and read-only docs-only behavior |
| TASK-173 | LLM Guide Production Readiness and Acceptance | High | Large | Done: readiness matrix, recovery UX, idempotency diagnostics, gates, metrics, and docs closure completed for the declared capability set |
| TASK-174-01 | Provenance Undo Manifest and Persistence | High | Large | Done: assistant executions persist sanitized undo manifest items with DB migration artifacts |
| TASK-174-02 | Active Admin Surface Context and Inspection | High | Large | Done: bounded active page/template/custom-screen context and server hydration shipped |
| TASK-174-03-01 | Custom Screen Delete Action | High | Medium | Done: `custom-screen.delete` supports reviewed deletion of server-catalog resolved screens |
| TASK-174-02-01 | Active Page Canvas Context | High | Medium | Done: Assistant context includes active page id, selected block, bounded canvas blocks, and template-section refs |
| TASK-174-02-02 | Active Widget Template Context | High | Medium | Done: Assistant context includes active widget template id, settings summary, selected block, and block refs |
| TASK-174-02-03 | Active Custom Screen Context | High | Medium | Done: Assistant context includes active custom screen id, bindings, capabilities, selected block, and selected entry |
| TASK-174-02-04 | Server-Side Context Hydration and Redaction | High | Medium | Done: plan route rehydrates active page/template/screen identity and provider packages include redacted active surface summaries |
| TASK-174-03-02 | Page Delete Action | High | Medium | Done: `page.delete` deletes active-context pages through reviewed typed action flow |
| TASK-174-03-03 | Widget Template Delete Action | High | Medium | Done: `widget-template.delete` deletes active-context reusable templates with blast-radius warnings |
| TASK-174-03-04 | Content Type and Entry Delete Actions | High | Large | Done: `entry.delete` and guarded `content-type.delete` use reviewed typed action flow |
| TASK-174-03-05 | Listing Query and Template Delete Actions | High | Medium | Done: `listing-query.delete` and `listing-template.delete` use reviewed typed action flow with reference checks |
| TASK-174-03-06 | Form Delete or Archive Action | High | Medium | Done: `form.delete` handles zero-submission forms and `form.archive` preserves submission history |
| TASK-174-03-07 | Menu and SEO Delete Actions | Medium | Medium | Done: `menu.item.delete` and `seo.document.delete` use reviewed typed action flow |
| TASK-174-03 | Resource Delete Adapters | High | Large | Done: delete/archive adapters use reviewed typed actions and domain services |
| TASK-174-04-01 | Page Metadata and Settings Edit Actions | High | Medium | Done: `page.update` edits active page metadata/settings while preserving page data |
| TASK-174-04-02 | Page Widget Block Patch Actions | High | Large | Done: `page.widget.patch` edits selected block data paths and preserves unrelated blocks |
| TASK-174-04-03 | Widget Template Edit Actions | High | Large | Done: `widget-template.update` and `widget-template.block.patch` edit reusable templates |
| TASK-174-04-04 | Custom Screen Edit Actions | High | Medium | Done: `custom-screen.update` and `custom-screen.widget.patch` edit custom screens |
| TASK-174-04-05 | Content, Form, Listing, Menu, and SEO Edit Actions | High | Large | Done: remaining entry/form/listing/menu/SEO update actions use domain services |
| TASK-174-04 | Resource Edit and Widget Patch Adapters | High | Large | Done: edit/patch adapters cover supported pages/widgets/templates/screens/domain resources |
| TASK-174-05-01 | Template Section Reference Inspection | High | Medium | Done: page `template-section` refs are deduped and hydrated with redacted referenced widget template summaries |
| TASK-174-05-02 | Page Instance vs Template Target Resolution | High | Medium | Done: ambiguous template-backed page edits ask for target confirmation and explicit prompts route to page/template patch targets |
| TASK-174-05 | Widget Template and Page Canvas Context Bridge | High | Large | Done: referenced widget template inspection and page-instance vs reusable-template target resolution shipped |
| TASK-174-06-01 | Resource Operation Review UI States | High | Medium | Done: review/result UI renders operation badges, destructive/blocked states, partial counts, and redacted dynamic text |
| TASK-174-06 | Admin Resource Operations Review UI | High | Large | Done: assistant review UI treats edit/delete/archive-style operations as reviewed resource mutations |
| TASK-174-07 | Security Gates, Docs, and Closure | High | Medium | Done: route/security/perf/UI validation and docs/changelog/board closure completed; local scanners remain CI-only |
| TASK-174 | LLM Guide Resource Operations and Active Context | High | Large | Done: active context, resource edit/delete adapters, template bridge, review UI, and closure gates completed |
| TASK-175 | Solution Kit Module Focus and Screens Convergence | High | Medium | Done: active kit focus keeps Screens visible and expands module dependencies from the registry |
| TASK-176-01 | Dockerfile Non-Root Runtime User | High | Small | Done: production Docker runner now uses non-root `bun` user |
| TASK-176-02 | AES-GCM Tag Length Hardening | High | Medium | Done: email and secret decrypt paths use explicit 16-byte AES-GCM auth tag length |
| TASK-176-03 | Post HTML Rendering Sanitization Audit | High | Large | Done: post editor/runtime rich text renders sanitized React nodes without raw HTML injection |
| TASK-176-04 | CORS Origin Validation Hardening | High | Medium | Done: CORS origin headers are emitted from trusted configured origins or literal wildcard |
| TASK-176-05 | Runtime Dependency CVE Upgrades | High | Medium | Done: runtime dependency CVEs remediated; Trivy reports 0 bun.lock vulnerabilities |
| TASK-176-06 | Scanner Strict Mode and Baseline Policy | High | Medium | Done: strict scanner scripts pass with Semgrep 0, Trivy 0, and Gitleaks clean |
| TASK-176 | Security Scanner Baseline Remediation | High | Large | Done: scanner baseline remediated and strict security scan is actionable |
| TASK-177-01 | Identify Happy-DOM Navigation Noise Sources | High | Medium | Done: iframe preview navigation in post editor canvas identified as reproducible noise source |
| TASK-177-02 | Test Harness Unhandled Browser Error Guard | High | Medium | Done: Vitest setup fails unexpected browser/console errors and waits for happy-dom async tasks |
| TASK-177-03 | Component Test Navigation and Fetch Mocks | High | Large | Done: component-test browser-managed HTTP(S) requests are intercepted without real localhost fetches |
| TASK-177-04 | Full Vitest Log-Clean Closure | High | Medium | Done: full Vitest lane passes log-clean with 494 files and 1968 tests |
| TASK-177 | Vitest Happy-DOM Async Navigation Noise Cleanup | High | Large | Done: happy-dom async navigation/fetch noise removed and guarded |
| TASK-101-09 | Assistant Action Engine (LLM Guide + Typed Actions) | High | Large | Done: docs-only vs LLM Guide split, context snapshots, planner/schema, actions, registry, idempotency, and tests are complete for the shipped scope |
| TASK-101-09-01 | Assistant Mode Split and Runtime Contracts | High | Medium | Done: canonical transport/settings/client mode is `llm-guide`; legacy `llm-rag` is normalized as input alias only |
| TASK-101-09-01-01 | Docs Assistant Mode Guardrails and Backward Compatibility | High | Small | Done: docs-only remains read-only and legacy `llm-rag` input is normalized into `llm-guide` |
| TASK-101-09-04 | Typed Action Registry, Dry-Run, and Execution Pipeline | High | Large | Done: registry dispatch, preview conflict/dependency arrays, DB-backed idempotency, and adapter audit are complete |
| TASK-101-09-04-03 | Existing Service Adapters and Installer Extraction | High | Medium | Done: site-kit convergence remained done; no additional safe helper extraction was identified beyond registry/idempotency cleanup |
| TASK-101-09-04-02 | Execution, Idempotency, Revisions, and Audit Hooks | High | Medium | Done: execute uses persistent idempotency storage with actor/plan/hash conflict checks and DB migration artifacts |
| TASK-101-09-04-01 | Action Registry, Dry-Run Diff, and Conflict Model | High | Medium | Done: formal action registry replaces central switch dispatch and preview changes expose conflicts/dependencies arrays |
| TASK-101-09-03 | LLM Guide Planner and Typed Plan Schema | High | Large | Done: strict nested schema, context heuristics, provider draft adapter, and planner regression coverage are shipped |
| TASK-101-09-03-04 | Planner Test, Docs, and Closure | Medium | Small | Done: planner schema/heuristics/provider tests, docs, changelog, and board sync are complete |
| TASK-101-09-03-03 | Provider Draft Plan Adapter and Malformed Output Recovery | High | Medium | Done: untrusted mocked provider drafts map through local strict schema or recover to typed questions |
| TASK-101-09-03-02 | Local Heuristics, Plan Repair, and Missing Context Questions | High | Medium | Done: prompt/context heuristics are split into a pure module and use resource/runtime context for refinement routing |
| TASK-101-09-03-01 | Prompt Normalization, Intent Extraction, and Strict Plan Schema | High | Medium | Done: strict nested action plan schema validates per-action input and planner output |
| TASK-101-09-02 | Admin Context Snapshot and Safe Surface Observers | High | Large | Done: route/module, resource catalog, runtime snapshot, selected resource, and advisory permission/action hints are available to LLM Guide planning |
| TASK-101-09-02-01 | Admin Runtime Context Snapshot and Permission Affordances | High | Large | Done: AssistantPanel now sends route-derived runtime snapshot and server normalization keeps it advisory-only |
| TASK-101-09-02-01-03 | Runtime Context Test, Docs, and Closure | Medium | Small | Done: runtime context validation, docs, changelog, and board sync are complete |
| TASK-101-09-02-01-02 | Server Context Permission Affordance Normalization | High | Medium | Done: advisory action/permission hints are normalized and unsafe hints are dropped server-side |
| TASK-101-09-02-01-01 | Admin UI Runtime Snapshot Hook | High | Medium | Done: AdminRouter/AdminShell feed route, selected entity, and visible action hints into LLM Guide context |
| TASK-101-09-02-02 | Resource Schema, Widget, and Surface Catalog Context | High | Large | Done: `/assistant/actions/plan` can attach bounded, redacted admin resource catalogs for LLM Guide planning |
| TASK-101-09-02-02-04 | Resource Catalog Test, Docs, and Closure | Medium | Small | Done: validation, docs, changelog, and board sync for resource catalog context |
| TASK-101-09-02-02-03 | Action Plan Context Enrichment and Route Contract | High | Medium | Done: `includeResourceCatalog` enriches the existing action planning route without accepting client-supplied catalogs |
| TASK-101-09-02-02-02 | Resource Catalog Builder and Lazy Default Deps | High | Medium | Done: injected-deps builder and lazy default deps aggregate content, screen, listing, form, and widget summaries |
| TASK-101-09-02-02-01 | Resource Catalog Types and Pure Normalizers | High | Medium | Done: pure snapshot types, redaction, clamping, and deterministic normalization are covered in Vitest |
| TASK-101-09-01-03 | Site Builder Contract Convergence and Legacy Route Retirement | High | Medium | Done: AI Site Wizard/site-kit work now uses `/assistant/actions/*`; `/assistant/site-builder/*` route/client surface is retired |
| TASK-101-09-06 | Assistant UI, API, Security, Tests, and Closure | High | Large | Done: action endpoints, review/confirm UI, security docs, and targeted test matrix are shipped for the current guide action engine |
| TASK-101-09-06-03 | Unit, Integration, UI Test Matrix, and Docs Closure | Medium | Medium | Done: planner/UI/client coverage lives in Vitest, while executor/routes/DB/public runtime coverage lives in Bun |
| TASK-101-09-06-02 | Action Routes, Security Contract, and Error Mapping | High | Medium | Done: `/assistant/actions/*` endpoints, validation, RBAC/CSRF route wiring, and action error mapping are shipped |
| TASK-101-09-06-01 | Review, Confirm UX, and Partial Success States | High | Medium | Done: action plan review and execution result components are shipped and covered by assistant panel interaction tests |
| TASK-101-09-05-03 | House Projects Catalog End-to-End Acceptance Flow | High | Medium | Done: house-projects prompt has plan/dry-run/execute plus DB-backed and public runtime acceptance coverage |
| TASK-101-09-05-02 | Generated Admin Surfaces, Listings, and Beginner-Safe Follow-Ups | High | Medium | Done: generated catalog plans now compose content types, custom screens, listings, pages, and follow-up form/filter refinements through existing Coderso surfaces |
| TASK-101-09-05-01 | Projects Catalog Blueprint and Default Content Model | High | Medium | Done: house-projects catalog content model exists as a preset in the generic catalog family blueprint engine |
| TASK-101-09-05 | Generated Catalog Blueprints and Admin Surface Composition | High | Large | Done: generic catalog blueprint engine and multiple catalog presets generate typed Coderso surfaces without assistant-only write paths |
| TASK-101-09-01-02 | LLM Guide Mode Settings and Mode Switch UX | Medium | Small | Done: assistant/settings UI now uses `LLM Guide` user-facing language while preserving `llm-rag` transport compatibility |
| TASK-101-09-07 | Generic LLM Guide Intent Families and State-Aware Planning | High | Large | Done: generic prompt families, catalog blueprint engine, multi-family presets, and state-aware house-projects refinements are now implemented and tested |
| TASK-101-09-07-04 | State-Aware Follow-Up Refinement and No-Duplicate Setups | High | Large | Done: house-projects follow-ups now add filters and inquiry forms, and refinements can reuse listing resources from existing page state to avoid duplicate setup creation |
| TASK-101-09-07-03 | Service Directory, Portfolio, and Product Family Presets | High | Large | Done: planner now returns ready plans for product, portfolio, and services-directory business prompts through the shared catalog-family builder |
| TASK-101-09-07-02 | Generic Catalog Family Blueprint Engine | High | Large | Done: shared catalog blueprint builder now powers the house-projects flow and produces generic product/portfolio presets without changing the executor contract |
| TASK-101-09-07-01 | Intent Family Classification and Prompt-to-Blueprint Routing | High | Medium | Done: planner now classifies docs/setup/refinement prompts and routes them into explicit intent families while keeping the house-projects preset backward-compatible |
| TASK-101-09-06-04 | Deep Interaction, DB Parity, and Runtime Acceptance Test Wave | High | Large | Done: the shipped house-projects slice now has interactive UI flow coverage, DB-backed parity checks, and public runtime acceptance coverage |
| TASK-169 | Assistant Widget Template Medium and Decision Guide Polish | Medium | Small | Done: medium and decision-guide widget-template follow-ups now read as Hero-specific guidance instead of flattened workflow/fallback text |
| TASK-168 | Assistant Widget Template Medium-Detail Polish | Medium | Small | Done: medium-detail widget-template guidance now explains the practical Hero-details path more concretely |
| TASK-167 | Assistant Guide-Mode Follow-Up Specificity | High | Small | Done: dedicated helper-mode sections now render without redundant fallback mixing and Hero follow-ups stay more specific |
| TASK-166 | Assistant Widgets Hero Color Guidance Recovery | High | Small | Done: canonical widget template docs now carry explicit Hero color guidance and retrieval coverage against competing Widget Library hits |
| TASK-165 | Assistant Reindex Deletes Removed DB Docs | High | Small | Done: assistant DB ingest now prunes removed official docs so stale combined articles do not survive reindex |
| TASK-164 | Assistant Coderso Split Reference Cleanup | Medium | Small | Done: aligned stale pre-split `docs/coderso/*` references in assistant tests and `_docs` with the current canonical docs |
| TASK-163 | Historical Assistant Task Reference Cleanup | Low | Small | Done: replaced dead historical task references to deleted combined screen docs with the current canonical split docs |
| TASK-162 | Obsolete Combined Assistant Screen Docs Cleanup | Medium | Small | Done: removed old combined screen docs that were no longer referenced by the coverage matrix after the route-by-route split |
| TASK-161 | Authentication and Account Recovery Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the auth flow doc against the live login, 2FA, reset, and reset-confirm screens |
| TASK-160 | Dashboard Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote Dashboard against the live stat-card/recent-edits/health workflow |
| TASK-159 | Roles Matrix Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Roles Matrix out of the old users/roles doc and rewrote it against the live permissions workflow |
| TASK-158 | Users Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Users out of the old users/roles doc and rewrote it against the live list/details/invite workflow |
| TASK-157 | Integrations Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Integrations out of the old integrations doc and rewrote it against the live catalog/drawer workflow |
| TASK-156 | Storage Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Storage Settings out of the old integrations doc and rewrote it against the live provider/upload workflow |
| TASK-155 | Email Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Email Settings out of the old integrations doc and rewrote it against the live SMTP/test-email workflow |
| TASK-154 | Webhooks Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Webhooks out of the old integrations doc and rewrote it against the live delivery/drawer workflow |
| TASK-153 | API Keys Admin UI Assistant Documentation Refresh | Medium | Small | Done: split API Keys out of the old integrations doc and rewrote it against the live key-management workflow |
| TASK-152 | Login Alerts Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Login Alerts out of the broader Security Settings doc and rewrote it against the live alert-policy workflow |
| TASK-151 | Sessions Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Sessions out of the broader Security Settings doc and rewrote it against the live active-session workflow |
| TASK-150 | IP Allowlist Admin UI Assistant Documentation Refresh | Medium | Small | Done: split IP Allowlist out of the broader Security Settings doc and rewrote it against the live restrictions/drawer workflow |
| TASK-149 | Security Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote Security Settings against the live section-based hardening workflow and kept related subroutes for later dedicated refreshes |
| TASK-148 | Assistant Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Assistant Settings out of the old combined settings doc and rewrote it against the live runtime/reindex workflow |
| TASK-147 | Site Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Site Settings out of the old combined settings doc and rewrote it against the live URL/preview/routes workflow |
| TASK-134 | Popups Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Popups assistant doc against the live popup list/editor workflow and synced the route coverage |
| TASK-133 | Commerce Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Commerce into catalog and product-editor assistant docs and synced the route coverage |
| TASK-146 | General Settings Admin UI Assistant Documentation Refresh | Medium | Small | Done: split General Settings out of the old combined settings doc and rewrote it against the live identity/branding workflow |
| TASK-145 | Access Logs Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Access Logs out of the old combined operations doc and rewrote it against the live filter/table/details/export workflow |
| TASK-144 | Import Export Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Import / Export out of the old combined operations doc and rewrote it against the live export/import workspace |
| TASK-143 | Backups Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Backups out of the old combined operations doc and rewrote it against the live schedule/table/dialog workflow |
| TASK-142 | Audit Logs Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Audit Logs out of the old combined operations doc and rewrote it against the live filter/table/details/export workflow |
| TASK-141 | Analytics Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Analytics out of the old combined operations doc and rewrote it against the live KPI/chart/top-content workflow |
| TASK-140 | Redirects Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Redirects out of the old SEO/Redirects assistant doc and rewrote it against the live empty/create flow and source-verified table actions |
| TASK-139 | SEO Manager Admin UI Assistant Documentation Refresh | Medium | Small | Done: split SEO Manager out of the old combined SEO/Redirects assistant doc and rewrote it against the live audit and quick-edit workflow |
| TASK-138 | Search Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the global Admin Search assistant doc against the live search shell, recent searches, filters, and grouped-results contract |
| TASK-137 | Admin UI Theme Assistant Documentation Refresh | Medium | Small | Done: rewrote the Admin UI Theme assistant doc against the live templates/profiles workflow and synced the task board/changelog |
| TASK-136 | Plugin Store Admin UI Assistant Documentation Refresh | Medium | Small | Done: split Plugin Store into catalog and plugin-details assistant docs and synced the coverage matrix/task board/changelog |
| TASK-135 | Solution Kits Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Solution Kits assistant doc against the live kit cards, wizard, and selected-kit details flow |
| TASK-132 | Reviews Admin UI Assistant Documentation Refresh | Medium | Small | Done: separated Reviews moderation from the old combined engagement doc and moved `/coderso/reviews` to its own canonical assistant guide |
| TASK-131 | Booking Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Booking assistant doc against the tabbed resources/services/availability/reservations/slot-preview workflow |
| TASK-130 | Filters and Search Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined discovery assistant doc into dedicated Filters and Search preview guides |
| TASK-129 | Listings Admin UI Assistant Documentation Refresh | Medium | Small | Done: carved Listings out of the old shared doc and moved `/coderso/listings*` to its own canonical assistant guide |
| TASK-128 | Forms Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Forms assistant doc into route-aligned builder and action logs guides |
| TASK-127 | Widgets Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Widgets assistant doc into route-aligned library and template editor guides |
| TASK-126 | Custom Screens Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Custom Screens assistant doc into route-aligned builder and records workflow docs |
| TASK-125 | Entries Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Entries assistant doc into route-aligned list/create and editor/metadata docs |
| TASK-124 | Engine Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Engine assistant doc into route-aligned list/create and editor/schema docs |
| TASK-123 | Media Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Media assistant doc to match upload, filters, access settings, and asset-detail workflow |
| TASK-122 | Menus Admin UI Assistant Documentation Refresh | Medium | Small | Done: rewrote the Menus assistant doc to match the builder, create dialog, hierarchy workflow, and item settings |
| TASK-121 | Posts Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Posts assistant doc into route-aligned list/create and editor/revisions/preview docs |
| TASK-120 | Pages Admin UI Assistant Documentation Refresh | Medium | Small | Done: split the old combined Pages assistant doc into route-aligned list/create and editor/settings/history docs |
| TASK-119-05 | Assistant Multi-Level QA, Docs, Changelog, and Closure | Medium | Small | Done: validation and docs/task board/changelog synchronization completed for the multi-level assistant rollout |
| TASK-119-04 | Assistant Progressive Follow-Up Flow and Mode Prompts | Medium | Medium | Done: depth/mode fields and follow-up chips now drive deterministic multi-turn assistant flow |
| TASK-119-03 | Assistant Corpus Enrichment for Multi-Level Answers | High | Large | Done: key high-traffic assistant docs now expose Basic/Medium/Instruction/Advanced plus helper sections |
| TASK-119-02 | Assistant Depth-Aware Retrieval and Composer Contract | High | Medium | Done: retriever/composer/service now support detail level, guide mode, and follow-up options |
| TASK-119-01 | Assistant Docs Authoring Contract for Basic/Medium/Instruction/Advanced | High | Medium | Done: template/readme/ingest contract now support the multi-level docs model with compatibility aliases |
| TASK-119 | Assistant Multi-Level Docs Contract and Progressive-Depth Answers | High | Large | Done: multi-level docs-only answer model and progressive follow-up UX shipped end-to-end |
| TASK-118-03 | Assistant Widgets and Engine Corpus Enrichment, QA, and Closure | Medium | Small | Done: canonical docs now include Hero visual settings and a clearer Engine usage path, with validation/docs/changelog synced |
| TASK-118-02 | Assistant Procedural How/Use Ranking and Section Selection | High | Small | Done: procedural questions now bias toward Step By Step and avoid low-signal `When To Use` dominance |
| TASK-118-01 | Assistant Doc Metadata Propagation and Surface Label Fix | High | Small | Done: docs-only answers now label the canonical document/module instead of the selected section |
| TASK-118 | Assistant Surface Labels, Procedural Guidance, and Corpus Specificity Follow-Up | High | Medium | Done: fixed surface labels, procedural guidance routing, and weak widgets/engine corpus coverage |
| TASK-117 | Assistant Clarifying Questions and Section-Aware Docs Answers | High | Medium | Done: docs-only assistant now asks clarifying questions when ambiguous and composes answers from the right doc sections |
| TASK-116 | Assistant Final Answer from Chunk Content, not Preview Snippet | Medium | Small | Done: final answer now uses chunk content with sentence-aware truncation instead of preview snippets |
| TASK-115-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: validation and docs/changelog sync were rerun after the ranking regression follow-up |
| TASK-115-03 | Assistant UI Answer-First Rendering and Hidden Default Sources | Medium | Small | Done: main answer is primary content and default Sources rendering is hidden |
| TASK-115-02 | Ranking and Evidence Selection Tuned for Product Support Questions | High | Medium | Done: metadata-aware ranking, cross-area penalties, and confidence calibration now keep product questions on the right docs |
| TASK-115-01 | Assistant Answer Contract and Content-First Composer Model | High | Medium | Done: assistant now composes actual answer text from article content instead of doc-location lists |
| TASK-115 | Assistant Product Answer Composer and Evidence UX Simplification | High | Large | Done: content-first answers shipped and default evidence UI was simplified |
| TASK-114-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: runtime/settings/UI validation plus docs, board, and changelog synchronization completed |
| TASK-114-03 | Admin Settings UX Cleanup Removing Legacy Assistant Docs Mode Choices | Medium | Small | Done: assistant settings now describe only the DB-seeded `docs/` model |
| TASK-114-02 | Runtime and API Enforcement for DB-Only Assistant Docs | High | Medium | Done: assistant runtime/status/reindex now operate as DB-only official docs flow |
| TASK-114-01 | Legacy Assistant Settings and Data Migration to DB-Only docs | High | Medium | Done: saved legacy `_docs/filesystem` assistant settings are normalized into the new `docs/db` model |
| TASK-114 | Assistant Legacy Docs Runtime Removal and DB-Only Enforcement | High | Medium | Done: legacy `_docs/filesystem` support removed from active official assistant runtime |
| TASK-113 | Assistant Transcript Scroll Containment | Medium | Small | Done: transcript/window overscroll containment prevents background page scrolling while wheeling over chat |
| TASK-112 | Assistant Conversation Window Overflow and Width Handling | Medium | Small | Done: message wrapping, vertical transcript scroll, composer separation, and safe width resize added |
| TASK-111 | Assistant Reindex Action Decoupled from Settings Save | Medium | Small | Done: `Run reindex` now seeds docs without implicit save-first behavior |
| TASK-110 | Assistant Settings Run Reindex Action | Medium | Small | Done: added `Run reindex` CTA in Assistant Settings with save-first and result states |
| TASK-109-06 | QA, Docs Index, Changelog, and Closure | Medium | Medium | Done: ingest/runtime validation, docs corpus structure verification, board, and changelog synchronization completed |
| TASK-109-05 | Solution Kits, Applied Examples, and Non-Kit Playbooks Corpus | High | Medium | Done: per-kit docs plus applied playbooks for lead gen, booking, commerce, editorial, and manual setup |
| TASK-109-04 | Official Documentation Corpus for Coderso Modules and Screen Workflows | High | Large | Done: canonical English docs added for Coderso modules, screens, workflows, examples, and pitfalls |
| TASK-109-03 | Official Documentation Corpus for Core Admin Screens and Settings Surfaces | High | Large | Done: canonical English docs added for core admin screens, settings surfaces, and workflows |
| TASK-109-02 | Assistant Ingest Runtime Migration from _docs/_internal to root docs and DB Seeding | High | Medium | Done: official assistant source root moved to `docs/` with DB-seeded readiness and no official filesystem fallback |
| TASK-109-01 | root docs Information Architecture, Authoring Contract, and Coverage Matrix | High | Medium | Done: root `docs/` IA, authoring template, and route coverage matrix created |
| TASK-109 | Official Assistant Documentation Corpus in root docs and DB Seeding | High | Large | Done: official English `docs/` corpus, DB-seeding contract, and screen/kit/playbook coverage shipped |
| TASK-108-03 | QA, Docs, Changelog, and Closure | Medium | Small | Done: lint/types/Vitest validation plus docs, board, and changelog synchronization completed |
| TASK-108-02 | Anchored Conversation Window Replacing Right-Side Modal | High | Small | Done: conversation now opens as an anchored floating panel instead of a full right sheet |
| TASK-108-01 | Assistant Launcher Idle and Hover Visual Contract Polish | Medium | Small | Done: launcher idle/active affordance was corrected so the primary icon stays visible without hover |
| TASK-108 | Assistant Launcher Visual Polish and Anchored Conversation Window | High | Small | Done: launcher visual contract and anchored conversation behavior were finalized after the first floating rollout |
| TASK-107-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: lint/types/Vitest/Bun validation plus docs, board, and changelog synchronization completed |
| TASK-107-06 | Avatar-Backed Assistant Launcher Surface | Medium | Small | Done: floating launcher now switches from message bubble to avatar surface via global settings |
| TASK-107-05 | Floating Draggable Assistant Launcher | High | Medium | Done: shell-level floating launcher added with drag, viewport clamp, and persisted position |
| TASK-107-03 | Assistant Unavailable and Docs-Not-Ready Minimal State Handling | Medium | Small | Done: minimal runtime copy replaced settings-like status surfaces |
| TASK-107-02 | Minimal Conversation Drawer Contract and Rendering Cleanup | High | Medium | Done: conversation window reduced to prompts, transcript, composer, and minimal status states |
| TASK-107-01 | Assistant Topbar Removal and Global Visibility Gating | High | Medium | Done: topbar button removed and launcher visibility now follows global assistant settings |
| TASK-107 | Assistant Floating Launcher, Visibility Gating, and Minimal Conversation Window | High | Medium | Done: floating launcher, global gating, avatar-backed trigger, and minimal conversation window shipped |
| TASK-106-04 | QA, Docs, Changelog, and Closure | Medium | Small | Done: lint/types/targeted UI suites plus docs, board, and changelog synchronization completed |
| TASK-106-03 | Assistant Configuration Separation and Settings Entry Points | High | Medium | Done: preferences hidden behind explicit action and canonical settings entrypoint added |
| TASK-106-02 | Assistant Drawer Loading, Empty, Disabled, and Docs-Not-Ready Rendering | High | Medium | Done: prompt/composer gating fixed and docs-not-ready got its own runtime state |
| TASK-106-01 | Assistant Drawer UX Contract and Render-State Matrix | High | Small | Done: explicit runtime/render-state matrix frozen and reflected in docs/tests |
| TASK-106 | Assistant Drawer Runtime UX and Configuration Separation | High | Medium | Done: conversation-first drawer contract shipped without post-hydration config takeover |
| TASK-054-30-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: Bun/Vitest validation, docs source-of-truth, board, and changelog synced |
| TASK-054-30-04 | Solution Kit Module Visibility UX | Medium | Medium | Done: kit details and AI wizard now explain module scope and selected-kit sidebar impact |
| TASK-054-30-03 | Solution Kit Module Audit and Catalog Corrections | High | Medium | Done: recommended module lists were audited and corrected against actual blueprint capabilities |
| TASK-054-30-02 | Coderso Sidebar Gating from Active Kit Modules | High | Medium | Done: active solution kit now narrows the Coderso sidebar through derived feature flags |
| TASK-054-30-01 | Active Solution Kit Preference and Selection Persistence | High | Medium | Done: selected solution kit is now persisted in admin UI and shared across relevant surfaces |
| TASK-054-30 | Solution Kits Module Audit and Sidebar Gating | High | Medium | Done: active kit preference, nav gating, module audit, and visibility UX delivered |
| TASK-054-29 | Widget Template Builder Toolbar and Mobile Panel UX Fixes | Medium | Small | Done: toolbar consolidated to single full-width row, responsive on mobile, settings grid overflow fixed, Dialog replaced with Sheet for mobile panel |
| TASK-054-28 | Widget Template Builder Settings, Details, and Canvas Action Parity | Medium | Medium | Done: template metadata moved into right-side `Settings`, block options stayed in `Details`, and actions moved into sticky canvas area |
| TASK-054-27 | Custom Screen Builder Canvas Action Parity | Medium | Small | Done: primary screen-builder actions moved from shell header into the sticky canvas action bar |
| TASK-054-26 | Widget Library CTA Clarity and Template-Only Authoring | Medium | Small | Done: removed misleading `Create Widget` CTA and documented template-only authoring in admin UI |
| TASK-054-25 | Widget Library Default Tab and Count Alignment | Medium | Small | Done: `All widgets` is now default and category counts follow the same filter basis as the grid |
| TASK-054-24 | Widget Template Builder Page Builder Card Parity | Medium | Small | Done: template builder now reuses the same widget picker/card pattern as page builder |
| TASK-054-23-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint, types, targeted Bun/Vitest suites, docs, changelog, and board sync |
| TASK-054-23-04 | Record Workflow Gating and Copy Clarification | High | Medium | Done: collection-only/dashboard/editor routing and workflow copy clarified |
| TASK-054-23-03 | Screen Preview and Builder Diagnostics | High | Medium | Done: builder preview now diagnoses missing content type, missing screen widgets, and collection-only setups |
| TASK-054-23-02 | Dedicated Screen Widget Pack and Surface Scoping | High | Large | Done: screen-only widgets and surface-scoped registry selectors delivered |
| TASK-054-23-01 | Screen Contract, Mode Model, and Gating | High | Medium | Done: derived custom screen capabilities now drive admin UI behavior |
| TASK-054-23 | Coderso Screens Admin UI Separation and Preview Recovery | High | Large | Done: dedicated screen widgets, preview recovery, and mode-based record workflow shipped |
| TASK-105-10 | Coverage Gap Rebaseline and Lane Backlog | High | Medium | Done: 2026-03-08 Vitest snapshot, lane split, and concrete remaining test backlog documented |
| TASK-105-11-04 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: full Vitest lane green, Bun-owned smoke revalidated, and ownership docs/board/changelog synchronized |
| TASK-105-11 | Legacy Bun-Free Test Migration Cleanup | High | Large | Done: Bun-free legacy suites migrated or explicitly frozen by ownership, leaving only intentional Bun cases and deeper refactor candidates |
| TASK-105-11-03 | Refactor-First Cluster Ownership Audit | High | Medium | Done: split delivered for validation, assistant, pure posts, pure forms, pure server helpers, and pure search logic; only explicit Bun-owned or deeper mixed cases remain |
| TASK-105-11-03-05 | Server Cluster Bun Ownership Freeze | Medium | Medium | Done: explicit Bun ownership documented for the remaining server unit cluster |
| TASK-105-11-03-07 | Server Settings-Bound Helper Suites Move to Vitest | Medium | Medium | Done: moved `hostPolicy`, `publicBaseUrl`, and `previewUrls` to Vitest after lazy settings-import refactor |
| TASK-105-11-03-06 | Server Pure Helper Suites Move to Vitest | Medium | Medium | Done: moved pure server helper suites to Vitest and left boundary/server contract suites in Bun |
| TASK-105-11-03-04 | Forms Pure Contracts and Helper Suites Move to Vitest | High | Medium | Done: moved Bun-free forms contract/helper suites to Vitest and left DB/runtime-coupled cases in Bun |
| TASK-105-11-03-03 | Posts Pure Editor Model Suites Move to Vitest | High | Large | Done: moved pure posts editor/model suites to Vitest and left DB/runtime-coupled cases in Bun |
| TASK-105-11-03-02 | Assistant Pure Service Suites Move to Vitest | High | Medium | Done: moved Bun-free assistant metrics/quota/redaction/provider/planner suites into Vitest |
| TASK-105-11-03-01 | Validation and Search Pure Suites Move to Vitest | High | Medium | Done: moved validation and pure search logic suites to Vitest and left DB search history in Bun |
| TASK-105-11-02 | Custom Screens and Pure Domain Legacy Suites Move to Vitest | High | Medium | Done: moved `bindingResolver` to Vitest and removed legacy Bun `customScreens` duplicates |
| TASK-105-11-01 | UI, Admin, and SDK Duplicate Legacy Suites Move to Vitest | High | Medium | Done: removed Bun-free duplicate suites after confirming Vitest-owned replacements |
| TASK-105-12 | Mixed Module Product Refactors for Runner Eligibility | High | Large | Done: assistant/docs, forms runtime/nonce, forms automation runner, posts runtime-media seams, and guardrails are now shipped |
| TASK-105-12-05 | Guardrails, Docs, and Closure | Medium | Medium | Done: import-boundary rule added to AGENTS and testing docs |
| TASK-105-12-04 | Posts Runtime Renderer Media Lookup Seam | Medium | Medium | Done: runtime media lookup is lazy-loaded and runtime renderer test moved to Vitest |
| TASK-105-12-03 | Forms Automation Runner Dependency Split | High | Large | Done: `formAutomationRunnerCore` extracted, orchestration suite moved to Vitest, and runtime wrapper left lazy |
| TASK-105-12-02 | Forms Runtime Resolver and Nonce Boundary Seams | High | Medium | Done: runtime resolver lazy-loaded and nonce/runtime resolver tests moved to Vitest |
| TASK-105-12-01 | Assistant Provider and Docs Lazy Dependency Seams | High | Medium | Done: lazy deps added for provider/docs helpers and matching assistant docs suites moved to Vitest |
| TASK-105-07 | SDK Plugin Manifest and Custom Screens Service Wave | Medium | Medium | Done: plugin manifest, SDK client/server, and custom screen service gained direct Vitest coverage |
| TASK-105-03 | Small UI and Support Component Wave | Medium | Medium | Done: block library, redirects/page leafs, form canvas, media details panel, plugin filters, theme routes/tokens, and related page leafs covered |
| TASK-105-02 | Admin Services Zero Coverage Wave | High | Medium | Done: api keys, email, integrations, taxonomy, webhooks, and session cache now have direct Vitest tests |
| TASK-105-01 | Vitest Coverage Matrix and Invariants | High | Medium | Done: live snapshots re-baselined and used to drive zero-first execution order |
| TASK-104 | Bun Coverage Remediation and Runner Ownership Program | High | Large | Done: ownership matrix, large Vitest migration waves, curated Bun baseline, docs, and closure synced |
| TASK-104-08 | QA, Docs, Board, and Closure | Medium | Medium | Done: board, docs, runner ownership notes, and changelog closure synchronized |
| TASK-104-07 | Widget and Editor Coverage Waves | High | Large | Done: widget/editor suites migrated to Vitest ownership and verified there |
| TASK-104-06 | Bun Baseline Purity and Runtime Coverage Hardening | High | Large | Done: Bun baseline now uses curated self-filtering route/plugin/perf coverage command |
| TASK-104-05 | Refactor-First Domain and Posts Eligibility | Medium | Large | Done: refactor-first clusters marked and runtime-coupled suites returned to Bun |
| TASK-104-04 | SDK and Shared Contracts Move to Vitest | High | Medium | Done: Bun-free shared contract suites moved while plugin manifest stayed in Bun |
| TASK-104-03 | Admin UI SSR and DOM Move to Vitest | High | Large | Done: broad unit and integration UI suites moved into Vitest lanes including ui-dom |
| TASK-104-02 | Admin Clients and Utils Move to Vitest | High | Large | Done: large admin client/utils suite moved out of Bun into Vitest |
| TASK-104-01 | Coverage Audit and Runner Ownership Matrix | High | Medium | Done: hotspot and ownership matrix published from live Bun coverage data |
| TASK-102-06 | Custom Screens and Admin Nav Vitest Migration | Medium | Medium | Done: Bun-free custom screen and admin nav suites moved to tests/vitest while DB/route coverage stayed in Bun |
| TASK-054-22-07 | Custom Screens Admin Sidebar Shortcuts | High | Medium | Done: active screens can opt into left-menu shortcuts rendered after the Coderso group |
| TASK-102 | Hybrid Testing Strategy and Coverage Architecture | High | Large | Done: hybrid Bun/Vitest lanes, Bun baseline/full coverage commands, CI workflow, docs, and guardrails shipped |
| TASK-102-05 | Docs, CI Rollout, and Adoption Guardrails | Medium | Medium | Done: repo docs, tests README, CI workflow, task board, and changelog closure synchronized |
| TASK-102-04 | Test Utilities, Fixtures, and Migration Wave 1 | Medium | Large | Done: shared Vitest setup and additive Bun-free wave across admin, UI, DOM, and SDK |
| TASK-102-03 | Coverage Reports, Gates, and Command Surface | High | Medium | Done: lane-specific coverage commands, Bun baseline/full split, and testing-lanes workflow |
| TASK-102-02 | Vitest Workspace for Pure TS, Admin, and SDK | High | Large | Done: shipped Vitest config, aliasing, happy-dom support, and Bun-free suites under tests/vitest |
| TASK-102-01 | Runtime Kernel Test Boundaries and Bun Suite Ownership | High | Medium | Done: Bun ownership documented for runtime, perf, security, plugin lifecycle, and broader integration suites |
| TASK-053 | Page Editor Templates Mode | High | Large | Done: templates mode, settings usability, preview UX, retention policy, FOUC reduction, and settings autosave/history are fully closed |
| TASK-053-06 | Page Settings Autosave + History | Medium | Large | Done: autosave-on-close, history drawer, restore/discard flow, revision kind model, and page API/client wiring shipped |
| TASK-103 | Agent Guidelines Hardening and Contribution Guardrails | Medium | Small | Done: AGENTS rules hardened against repo contracts and delivered via dedicated worktree flow |
| TASK-054-22 | Coderso Custom Screens From Widgets | High | Large | Done: schema, admin routes, builder UI, field bindings, dedicated records workflow, and closure shipped |
| TASK-054-22-06 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint, typecheck, full test suite, docs, changelog, and task board sync |
| TASK-054-22-05 | Data Entry Screens and Collection Workflow | High | Large | Done: dedicated records list/editor routes with bound field editing and classic Entries fallback |
| TASK-054-22-04 | Field Binding Engine and Preview | High | Large | Done: binding resolver, selected-widget binding UI, and bound preview canvas delivered |
| TASK-054-22-03 | Screen Builder UI and Widget Composition | High | Large | Done: custom screens list/editor UI + widget canvas + tests |
| TASK-054-22-03-02 | Custom Screens List and Editor UI | High | Large | Done: list/editor screens, builder canvas, and UI tests |
| TASK-054-22-03-01 | Custom Screens Admin UI Plumbing | High | Medium | Done: client/cache/nav/routes/prefetch wiring |
| TASK-054-22-01 | Screen Definition Contract and Schema | High | Medium | Done: custom screens schema/service foundation + docs/tests |
| TASK-054-22-02 | Admin Routes and RBAC | High | Medium | Done: custom screens admin API routes, validation, and docs |
| TASK-061-08 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: full regression, docs sync, changelog, kanban closure |
| TASK-061 | Post Editor Writing Canvas and Smart Paste | High | Large | Done: writing-canvas rollout fully closed (061-01..09) |
| TASK-054-19 | Coderso QA, Performance, and Security Gates | High | Medium | Done: release gates + security gate closure |
| TASK-054-199 | Security Gate (SAST, SCA, Secrets, CVE) | High | Medium | Done: CI security gate wired with SARIF reporting |
| TASK-063 | Gutenberg Parity Post Editor Rearchitecture | High | Large | Done: details, shortcuts, focus, QA, docs, and final closure complete |
| TASK-063-09-02 | Docs Changelog and Kanban Closure | High | Medium | Done: docs/changelog/board synchronized after final regression |
| TASK-063-09-01 | Regression Test Execution Plan | High | Medium | Done: lint/types/tests executed with QA rollout report |
| TASK-063-09 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: quality gates + docs/changelog closure |
| TASK-063-08-03 | ARIA Landmarks and Accessibility Labels | High | Small | Done: editor landmarks and aria labels standardized |
| TASK-063-08-02 | Focus Return and Escape Contracts | High | Small | Done: focus return on close and Escape panel close |
| TASK-063-08-01 | Shortcut Registry and Keymaps | High | Small | Done: centralized post editor shortcut registry |
| TASK-063-08 | Keyboard, A11y, and Focus Management | High | Medium | Done: keyboard shortcuts + focus + aria coverage |
| TASK-063-07-03 | Details Preferences Persistence | High | Medium | Done: preferences hook + user settings sync |
| TASK-063-07-02 | Inspector Refactor Document vs Block | High | Medium | Done: shared inspector sections + validated inputs |
| TASK-063-07-01 | Tabbed Details Sidebar Shell | High | Small | Done: details sidebar isolated in PostDetailsSidebar |
| TASK-063-07 | Details Inspector Tabs and Preferences | High | Medium | Done: Post/Block tabs + persistence contracts |
| TASK-063-16-23 | Section Formatting Regression Fixes | Medium | Small | Done: preview formatting parity, inline code caret fixes, clear formatting cleanup |
| TASK-063-16-22 | Section Empty Placeholder Preview | Medium | Small | Done: empty section previews show the writing-canvas placeholder |
| TASK-063-16-21 | Post Editor Settings Dialog Scroll | Medium | Small | Done: editor settings dialog height clamped with scrollable content |
| TASK-063-16-20 | Section Toolbar Type Heading Icon | Medium | Small | Done: generic Heading icon used in Type dropdown |
| TASK-063-16-19 | Section Toolbar Type Profiles | High | Medium | Done: Type converts section blocks and paragraph/heading toolbars are narrowed with inline align/clear |
| TASK-063-16-18 | Section Toolbar Type Control | High | Medium | Done: type dropdown added, block-type transforms wired for text blocks, list controls kept as separate group |
| TASK-063-16-17 | Section Toolbar Typography Row | High | Small | Done: typography controls moved to secondary row with info + right-aligned formatting toggle |
| TASK-063-16-16 | Section Inline Typography List Selection | High | Small | Done: list markers follow inline typography selection |
| TASK-063-16-15 | Section Inline Typography Preview Persistence | High | Small | Done: inline typography spans persist in writing-canvas preview/front |
| TASK-063-16-14 | Section Inline Typography Selection | High | Small | Done: font family/size apply to selection when highlighted |
| TASK-063-16-13 | Section Alignment Visual Styles | High | Small | Done: align left/center/right visuals for section richtext |
| TASK-063-16-12 | Section Inline Code Visual Styles | High | Small | Done: inline code visuals for admin canvas + runtime preview/front |
| TASK-063-16-11 | Section Inline Code Caret Wrap | High | Small | Done: inline code/highlight wrap word at caret when selection is collapsed |
| TASK-063-16-10 | Section List Strike Code and Clear Formatting | High | Small | Done: list/strike/code-block visuals + clear formatting reset |
| TASK-063-16-09 | Section Heading Icons and H6 Style | Medium | Small | Done: H5/H6 heading badges aligned with icon style + no H6 uppercase |
| TASK-063-16-08 | Runtime Heading and Quote Styles | High | Small | Done: runtime H1-H6 + blockquote styling for preview/public |
| TASK-063-16-07 | Section Heading Visual Styles | High | Small | Done: explicit H1-H6 styling for section canvas and preview |
| TASK-063-16-06 | Section Paragraph Quote Visual Styles | High | Small | Done: blockquote styling added for section canvas + preview surface |
| TASK-063-16-05 | Section Paragraph Quote Div Alias Normalization | High | Small | Done: div block aliases normalized to paragraph semantics for section commands |
| TASK-063-16 | Post Editor Section Paragraph Quote Node Boundary Commands | High | Large | Done: deterministic `paragraph/quote` node-boundary behavior in section with stable roundtrip persistence and QA/docs/changelog closure |
| TASK-063-16-04 | QA Docs Changelog and Closure | Medium | Medium | Done: lint/types/full regression green; board/docs/parity/changelog synchronized |
| TASK-063-16-03 | Section Paragraph Quote Roundtrip Normalizer and Runtime Parity | High | Medium | Done: section `paragraph/quote` node type preserved through html-nodes-html roundtrip contract |
| TASK-063-16-02 | Section Paragraph Quote Command Engine and Adapter Wiring | High | Large | Done: engine/adapter fallback path stabilizes paragraph/quote commands when section root has no block wrappers |
| TASK-063-16-01 | Section Paragraph Quote Node Command Contract and Target Behavior | High | Medium | Done: collapsed/range/multiline paragraph-quote behavior contract finalized |
| TASK-063-15 | Post Editor Section Writing Canvas Caret Command Parity and Grouped Toolbar | High | Large | Done: writing-canvas caret/Enter stability, command persistence parity, grouped toolbar controls, and full QA/docs/changelog closure |
| TASK-063-15-05 | QA Docs Changelog and Closure | Medium | Medium | Done: lint/types/full regression green; board/docs/parity/changelog synchronized |
| TASK-063-15-04 | Section Toolbar Grouping Heading List Code and A11y | High | Medium | Done: grouped `Headings`, `List`, `Code` controls with profile-aware rendering and integration coverage |
| TASK-063-15-03 | Section Command Persistence Paragraph Headings List Align Clear Code | High | Large | Done: persistence for heading/list/align/clear/code semantics across writing-canvas roundtrip/runtime |
| TASK-063-15-02 | Section Enter Semantics and Empty Paragraph Preservation | High | Medium | Done: intentional empty paragraph preservation for stable `Enter`/`Enter+Enter` behavior |
| TASK-063-15-01 | Section Input Pipeline and Caret Stability | High | Medium | Done: draft HTML input pipeline removed per-keystroke lossy rewrite and stabilized caret |
| TASK-063-14 | Post Editor RichText Command Reliability and Contextual Formatting Model | High | Large | Done: deterministic command engine, contextual toolbar profiles, deduplicated inspector ownership, and full QA/docs/changelog closure |
| TASK-063-14-06 | QA Docs Changelog and Closure | Medium | Medium | Done: lint/types/full regression green; board/docs/changelog synchronized |
| TASK-063-14-05 | Contextual Toolbar Profiles and Block Inspector Dedup | High | Medium | Done: profile routing + toolbar/inspector ownership split finalized and tested |
| TASK-063-14-04 | Text Alignment and List Command Engine Stabilization | High | Medium | Done: alignment/list semantics stabilized with deterministic multi-block behavior |
| TASK-063-14-03 | Inline Formatting and Multiline Highlight Stability | High | Medium | Done: multiline selection behavior stabilized without block structure regressions |
| TASK-063-14-02 | Block Level Formatting Commands H1 H6 Paragraph Quote List | High | Large | Done: block-level command contract (`H1..H6`, `paragraph`, `quote`, `list`) implemented and covered by tests |
| TASK-063-14-01 | Command Capability Matrix and Expected Behavior Contract | High | Medium | Done: command profile matrix and expected behavior contract captured for implementation/testing |
| TASK-063-13 | Post Editor Block Authoring Stability and Parity Hardening | High | Large | Done: authoring UX parity hardening delivered (caret/newline/list/image picker/toolbar inheritance/interactive preview/link output) with docs and QA |
| TASK-063-13-08 | RichText Command Output Link Rendering Fixes QA Docs Closure | High | Medium | Done: browser alias tags (`b/i/div`) normalized, link command output stabilized, targeted QA/tests/docs/changelog completed |
| TASK-063-13-07 | Canvas Preview Parity for Button Embed and Image | High | Medium | Done: runtime-like canvas previews for button/embed/image with provider/aspect handling and media resolution |
| TASK-063-13-06 | NonText Block Quick Toolbars and Block Inspector DeMock | High | Large | Done: selected-block quick toolbars wired to real attrs and normalized inspector/runtime parity attrs |
| TASK-063-13-05 | Text Toolbar Font Controls and Global Typography Inheritance | High | Large | Done: typography controls (font/scale) added to toolbar and inherited across text-capable blocks via document meta |
| TASK-063-13-04 | Image Block Click to Select Media Flow | High | Medium | Done: image placeholder now opens media picker dialog and writes mediaId/alt/caption back to block attrs |
| TASK-063-13-03 | List Block Multiline Editing and State Model | High | Medium | Done: multiline list editing moved to draft-on-focus commit-on-blur flow without line-loss on typing |
| TASK-063-13-02 | RichText Input Caret Stability and Enter Semantics | High | Large | Done: typing pipeline split from paste, focused value sync guard, and deterministic Enter paragraph semantics |
| TASK-063-13-01 | Block by Block Defect Analysis and Fix Contract | High | Medium | Done: block-by-block defect matrix translated into implemented fixes and test contracts |
| TASK-063-12 | Post Editor Reference Parity with 46 Template | High | Large | Done: final parity pass completed for `_docs/UI/admin_panel/46-post-editor/code.html`, including inspector/settings/responsive contracts and closure gates |
| TASK-063-12-08 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint + lint:types + full unit/integration/perf/security suites green, docs/changelog/task board synchronized |
| TASK-063-12-07 | Responsive Parity, Focus Mode, and Sheets | High | Medium | Done: focus mode snapshot restore, stable desktop/mobile panel behavior, and responsive regression coverage |
| TASK-063-12-06 | Gear Settings Modal Upgrade and Preferences Contract | High | Medium | Done: upgraded settings modal, preferences `v2` migration, and dual persistence (localStorage + `posts.editor.preferences` user setting) |
| TASK-063-12-05 | Right Inspector Parity Post/Block with Progressive Disclosure | High | Medium | Done: post inspector flow parity (`Publishing -> Categories/Tags -> Featured image -> Danger zone -> Advanced`) + collapsed block advanced controls |
| TASK-063-12-04 | Canvas Geometry, Typography, and Block Surface Parity | High | Medium | Done: center canvas width/rhythm/title/placeholder parity aligned to template contract |
| TASK-063-12-03 | Left Outline Parity with Optional List Tab | High | Medium | Done: outline-first left rail parity with optional list-view deviation retained |
| TASK-063-12-02 | Header Parity and Action Hierarchy | High | Medium | Done: header composition and primary action hierarchy aligned with reference |
| TASK-063-12-01 | Reference Contract Freeze and Delta Matrix | High | Small | Done: parity matrix locked with must-match vs allowed deviations |
| TASK-063-11 | Post Editor Strict HTML Parity and Unified Article Canvas | High | Large | Done: strict shell parity, outline `+` insert, unified canvas flow, Post/Block tabs, header gear settings |
| TASK-063-11-06 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint/types/full-suite tests + docs/changelog/kanban sync |
| TASK-063-11-05 | Header Preview Publish Gear and Editor Settings Dialog | High | Medium | Done: right-side preview/publish/gear actions + persisted editor settings modal |
| TASK-063-11-04 | Right Sidebar Post/Block Tabs and Context | High | Medium | Done: tabs renamed to Post/Block with selection-driven context switching |
| TASK-063-11-03 | Unified Borderless Canvas and Media Placeholders | High | Large | Done: single article-flow canvas without per-block cards + clickable media placeholders |
| TASK-063-11-02 | Left Outline Primary Insert Flow | High | Medium | Done: Document Outline `+` insert entrypoint wired to shared insert resolver (`outline-plus`) |
| TASK-063-11-01 | Visual Parity Shell and Tokens | High | Medium | Done: shell/header/rails parity cleanup aligned with reference template |
| TASK-063-06 | Writing Canvas Appender and Smart Paste Parity | High | Large | Done: inline canvas appender points + shared insert orchestration + Word paste hardening |
| TASK-063-06-03 | Smart Paste Hardening and TOC Directives | High | Large | Done: heading fidelity hardening + TOC link cleanup + dynamic TOC directive parity |
| TASK-063-06-02 | Unified Inserter Slash Appender Flow | High | Medium | Done: `resolvePostInsertMutation` shared across sidebar/slash/appender insert sources |
| TASK-063-06-01 | Inline Appender Insert Points | High | Medium | Done: in-canvas appender between blocks/end + inserted block focus contract |
| TASK-063-10 | Post Editor Stitch Template Migration and Focus Mode | High | Large | Done: stitch-inspired shell, floating appender plus, and persisted focus mode |
| TASK-063-10-05 | QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint/types/full-suite tests + docs/changelog/kanban sync |
| TASK-063-10-04 | Focus Mode Full Width Toggle and Persistence | High | Medium | Done: header focus toggle, full-width canvas mode, and local preference restore |
| TASK-063-10-03 | Floating Appender Plus and Insert Flow | High | Medium | Done: floating `+` appender style wired to shared insert resolver |
| TASK-063-10-02 | Shell Layout Migration to Stitch Reference | High | Large | Done: three-region stitch-like shell composition (left outline, canvas, right details) |
| TASK-063-10-01 | Template Contract Mapping and Component Inventory | High | Medium | Done: reference template mapped to existing React regions/components |
| TASK-063-05 | List View, Outline, and Document Stats | High | Large | Done: document overview sidebar with tabs, outline warnings, and live stats selectors |
| TASK-063-05-03 | ListView and Outline Sidebar UI | High | Medium | Done: `PostListViewSidebar` with List/Outline tabs and block/heading navigation |
| TASK-063-05-02 | Outline Builder and Validation Rules | High | Medium | Done: heading outline model with empty/skipped/multiple-H1 validation and stable anchors |
| TASK-063-05-01 | Document Stats Selectors | High | Small | Done: deterministic words/chars/read-time/headings/paragraphs/blocks selectors |
| TASK-063-04 | Inserter Sidebar and Block Library Parity | High | Medium | Done: dedicated inserter sidebar shell, searchable/category block library, and focus-return/a11y contracts |
| TASK-063-04-03 | Inserter Focus and A11y Contracts | High | Small | Done: escape-close contract, focus return hook, and sidebar ARIA dialog semantics |
| TASK-063-04-02 | Block Library Search and Categories | High | Medium | Done: catalog search helpers, category filtering, and optional most-used section |
| TASK-063-04-01 | Inserter Sidebar Shell | High | Small | Done: `PostInserterSidebar` with close controls and layout integration |
| TASK-063-03 | Header, DocumentTools, and Save/Publish Parity | High | Large | Done: modular post editor header with document tools, revisions/details controls, and save-preview-publish cluster |
| TASK-063-03-03 | Header Integration and Regression Guards | High | Small | Done: composed `PostEditorHeader` integrated into shell with regression coverage |
| TASK-063-03-02 | Save Preview Publish Cluster | High | Medium | Done: dedicated action cluster with status/sync badges and save/preview/publish parity |
| TASK-063-03-01 | Document Tools Cluster | High | Medium | Done: Add/Undo/Redo/Document overview controls with a11y labels and shortcut hints |
| TASK-063-02 | Editor Shell Composition and Regions | High | Large | Done: centralized layout state, region components, responsive desktop/mobile sidebar behavior |
| TASK-063-02-03 | Responsive Region Behavior | High | Medium | Done: desktop sidebars + mobile sheet fallback with shared region state |
| TASK-063-02-02 | Region Components and Composition | High | Medium | Done: `PostEditorLayout` + region wrappers (`header/content/secondary/sidebar/footer`) |
| TASK-063-02-01 | Layout State Model and Hooks | High | Medium | Done: dedicated `usePostEditorLayout` reducer and panel actions for list/inserter/details |
| TASK-062 | Posts Dynamic Table of Contents (TOC) | High | Large | Done: dynamic TOC block contract + runtime heading index + Word TOC replacement + closure/docs |
| TASK-062-04 | TOC QA, Docs, Changelog, and Closure | Medium | Medium | Done: lint/types/tests + architecture/API/changelog/task board sync |
| TASK-062-03 | Replace Pasted Word TOC with Dynamic TOC | High | Large | Done: smart paste detects `#_Toc...`, strips static TOC, emits dynamic TOC directive and idempotent insertion |
| TASK-062-02 | Stable Heading Anchor IDs and Linking | High | Medium | Done: stable anchor generation/dedupe + custom anchors for heading block and writing-canvas heading nodes |
| TASK-062-01 | Dynamic TOC Generation from Post Headings | High | Medium | Done: `toc` block available in editor and mapped in runtime from live heading index |
| TASK-063-01 | Gutenberg Reference Audit and Gap Matrix | High | Medium | Done: reference audit, current-state inventory, and migration gap matrix published |
| TASK-063-01-03 | Gap Prioritization and Migration Plan | High | Medium | Done: Must/Should/Out matrix with owner subtasks and execution slices |
| TASK-063-01-02 | Nextless Current-State Inventory | High | Small | Done: posts editor component/state/data-flow baseline documented |
| TASK-063-01-01 | Gutenberg Component Inventory | High | Small | Done: core Gutenberg editor component responsibilities and UX contracts mapped |
| TASK-061-09 | Post Editor Silent Save and Preview Without Hydrate Reload | High | Medium | Done: autosave i save-before-preview korzystaja z silent sync bez hydrate resetu canvasu |
| TASK-061-07 | Runtime Renderer Parity and Backward Compatibility | High | Medium | Done: writing-canvas runtime mapper/renderer parity, legacy read-path adapter (non-destructive), and runtime warning diagnostics |
| TASK-061-06 | Editor UI Integration (Ribbon + Canvas + List View) | High | Large | Done: writing-first editor integration (default writing-canvas, ribbon quick actions, logical outline labels, and inline canvas/details context) |
| TASK-061-05 | Image Wrap Controls and Layout Semantics | High | Medium | Done: shared image wrap layout contract, inspector/rich-text controls, runtime+canvas CSS parity, and mobile fallback |
| TASK-061-04 | Clipboard Image Upload and Inline Media Insertion | High | Medium | Done: clipboard image detection, internal media upload, inline image insertion, and sanitizer/schema updates |
| TASK-061-03 | Smart Paste (Word/Docs/HTML) Parsing and Sanitization | High | Large | Done: deterministic paste normalizer, Office artifact stripping, adapter paste integration, and tests |
| TASK-061-02 | Writing Canvas Block Contract and Normalization | High | Large | Done: `writing-canvas` type + normalization + compatibility hooks for legacy/runtime text extraction |
| TASK-061-01 | Writing Canvas UX Contract and User Flows | High | Medium | Done: writing-first UX contract, flow boundaries, and editor anchors documented |
| TASK-060-06 | Regression Tests, Docs, Changelog, and Closure | Medium | Medium | Full lint/types/full-tests + docs/changelog/kanban closure for TASK-060 |
| TASK-060 | Post Editor Unified Canvas and Ribbon UX | High | Large | Closed: unified shared canvas + ribbon controls + compact outline + contextual details flow |
| TASK-060-05 | Details Panel and Responsive Behavior | High | Medium | Details opened on-demand from ribbon with contextual tab mode and responsive sheet behavior |
| TASK-060-04 | Compact List View Layout and Navigation | High | Medium | Outline compact ratio (`220-320px`) with labels-only rows and selection/scroll sync |
| TASK-060-03 | Ribbon Toolbar and Block Inserter Migration | High | Large | Persistent left inserter removed; insert/actions moved to ribbon with Add block trigger |
| TASK-060-02 | Shared Canvas Rendering and Inline Editing | High | Large | Shared canvas renders all blocks with inline editing and block-level actions |
| TASK-060-01 | Unified Canvas UX Contract and Interaction Model | High | Medium | Finalized UX contract for ribbon, outline, details, and selection focus model |
| TASK-059-08 | Posts Decoupling QA, Docs, and Closure | Medium | Medium | Full lint/types/tests regression + final docs/changelog/kanban sync |
| TASK-059 | Posts Domain Decoupling From Entries | High | Large | Closed: posts domain fully decoupled from entries (schema/service/API/UI/runtime/backfill/widget) |
| TASK-059-07 | Posts Embed Widget and Page Integration | High | Medium | Added `posts-feed` widget (latest/featured/category/manual) + SSR runtime resolver + page builder integration |
| TASK-059-06 | Posts Data Backfill and Cutover | High | Medium | Idempotent backfill (`entries -> posts`) + shadow-read parity report + internal trigger endpoint |
| TASK-059-05 | Posts Runtime, Listings, and Search Source Cutover | High | Medium | Runtime/listings/search source `posts` przepiety na dedykowany storage (`posts`), bez `entries` dependency |
| TASK-059-04 | Posts Admin UI Decoupling From Entries | High | Large | `PostEditorPage` classic fallback przeniesiony do `PostClassicEditorShell`; `EntryEditor` uproszczony do entries-only |
| TASK-059-03 | Posts Admin API Decoupling | High | Medium | `/admin/api/posts*` domkniete na post-native kontrakcie (bez `entry_*` fallbackow) + route RBAC/error mapping tests |
| TASK-059-02 | Posts Domain Service Extraction | High | Large | `postsService` refactored to `posts*` tables with post-native metadata/revisions/autosave |
| TASK-059-01 | Posts DB Schema and Migration Foundation | High | Medium | Added dedicated `posts*` tables + migration `0045_posts_decoupled` + DB contract tests |
| TASK-058 | Admin Cache, Prefetch, and Request Stability | High | Large | Completed closure: request instrumentation + dedupe cache + hydration/prefetch policy + shell read minimization + full regression/docs sync |
| TASK-058-06 | Regression Tests, Docs, Changelog, and Closure | Medium | Medium | Final lint/types/full-tests green + docs/changelog/kanban closure for TASK-058 |
| TASK-058-05 | Admin Shell Global Request Minimization | High | Large | Single-shot auth bootstrap + assistant lazy-load runtime + cached theme switcher and narrowed theme:update refresh scope |
| TASK-058-04 | Admin Prefetch Policy Rework and Request Budgeting | High | Medium | Prefetch switched to force:false warmup with active-route skip, fresh/cooldown throttling, queue concurrency, and budget tests |
| TASK-058-03 | Pages and Menus Hydration and Force Refresh Policy | High | Large | Mount hydration policy fixed for pages/menus with explicit-only force refresh and no redundant active-menu reload |
| TASK-058-02 | Shared Dedupe Cache for Global Admin Reads | High | Large | Shared read-through cache for global admin reads + invalidation + tests |
| TASK-058-01 | Request Storm Instrumentation and Baseline | High | Medium | apiClient request metrics + baseline perf gate + docs sync |
| TASK-057 | Gutenberg-Like Posts Block Editor | High | Large | Full WordPress-like block editor rollout complete with fallback and runtime parity |
| TASK-057-08 | Post Editor QA, Docs, Changelog, and Rollout | Medium | Medium | Full lint/types/tests validation + docs/changelog + rollout fallback mode |
| TASK-057-03 | Rich Text Engine and Text Formatting Capabilities | High | Large | Rich text adapter/toolbars/serializer/sanitizer integrated in post block editor |
| TASK-057-07 | Post Block Runtime Renderer and Public Parity | High | Medium | Post block runtime renderer with legacy fallback and preview/published parity |
| TASK-057-06 | Post Autosave, Revisions, Preview, and Publish Flow | High | Large | Autosave endpoint + revisions restore UI + post editor status lifecycle |
| TASK-057-05 | Document and Block Inspector Panels | High | Medium | Document/Block inspector split with full metadata/block options and user-friendly hints |
| TASK-057-04 | Block Inserter, Slash Command, List View, and Transforms | High | Large | Inserter with search/categories + slash menu + list view DnD/keyboard + transforms |
| TASK-057-02 | Post Editor Shell and State Architecture | High | Large | Modular post editor shell + state store + preview workflow route integration |
| TASK-057-01 | Post Block Document Contract and Backward Compatibility | High | Medium | Versioned post block document + strict normalization + legacy adapter |
| TASK-055 | Posts Screen and Editor for Widget/Template Runtime | High | Large | Dedicated posts module (`/admin/coderso/posts`) delivered |
| TASK-055-06 | Posts Tests, Migrations, and Documentation | Medium | Medium | Lint/types/tests + docs/changelog/kanban closure |
| TASK-055-05 | Posts Public Routes and Rendering | High | Medium | Posts preview/runtime contract documented and aligned with entry pipeline |
| TASK-055-04 | Posts Widget/Template Binding and Query Controls | High | Medium | Listings/search/widget source contract confirmed for posts |
| TASK-055-03 | Post Editor Workflow and Metadata Panels | High | Large | Post editor route/context parity with entries/pages workflow |
| TASK-055-02 | Posts List Screen (WordPress-Like Table) | High | Medium | Dedicated posts list with row actions and title navigation |
| TASK-055-01 | Posts Domain Model and API Contract | High | Medium | Reserved `post` type + `/admin/api/posts*` aliases |
| TASK-056 | Forms Editor Logic, Style, Runtime Preview, and Action Logs | High | Medium | Forms editor parity: logic/style tabs + runtime test flow + action logs clarity |
| TASK-056-06 | Forms QA, Docs, Changelog, and Closure | Medium | Medium | Lint/types/full tests + docs/changelog/task board sync |
| TASK-056-05 | Form Submission Access Adjustments for Admin Testing | Medium | Small | Authenticated admin can test public forms without captcha friction |
| TASK-056-04 | Form Runtime Preview and Action Logs Test Flow | High | Medium | Interactive runtime preview dialog with test submit and logs CTA |
| TASK-056-03 | Form Editor Logic/Style UI | High | Medium | Real controls for field logic/style tabs and canvas parity |
| TASK-056-02 | Form Field Style Contract and Runtime Rendering | High | Medium | Typed style contract + runtime width/label-position rendering |
| TASK-056-01 | Form Field Logic Contract and Normalization | High | Medium | Typed logic contract + normalization + evaluator |
| TASK-054-19-04 | Docs, Changelog, and Kanban Closure | Medium | Medium | Release gates docs/spec/changelog/task sync (parent pending 054-199) |
| TASK-054-19-03 | Gate Runner and CI Pipeline Wiring | High | Medium | Gate runner script + package scripts + CI workflow |
| TASK-054-19-02 | Performance and Security Gate Test Suites | High | Medium | Dedicated `tests/perf` and `tests/security` suites |
| TASK-054-19-01 | Release Gates Contract and Runbook | High | Medium | Mandatory gate matrix + budgets + execution contract |
| TASK-054-18 | Coderso AI Assistant Guided Builder Workflow | High | Large | Full guided executor (`plan/actions/execute/validate`) + assistant routes + modular wizard UX |
| TASK-054-18-04 | QA, Docs, Changelog, and Closure | Medium | Medium | Lint/types/tests + assistant site-builder docs/changelog/kanban sync |
| TASK-054-18-03 | AI Wizard UI Modularization and Explainable Execution | High | Large | `AiSiteWizard` orchestration split + action map + validation UI |
| TASK-054-18-02 | Assistant Site Builder Routes and Client Contract | High | Medium | Internal assistant routes + schemas + typed client + rate-limit bucket mapping |
| TASK-054-18-01 | Site Builder Executor Domain and Schemas | High | Medium | Typed executor service with deterministic action mapping and validation checks |
| TASK-054-17 | Coderso Presets, Templates, and Kits Contract | High | Large | Manifest contract + template installer orchestration + kits UI exposure |
| TASK-054-17-04 | QA, Docs, Changelog, and Closure | Medium | Medium | Lint/types/tests + docs/changelog/kanban closure |
| TASK-054-17-03 | Solution Kits API and Admin UX Contract | High | Medium | Manifest payload exposure + kits detail UI checklist |
| TASK-054-17-02 | Template and Preset Installer Service | High | Large | Deterministic template install/rollback + kit orchestration |
| TASK-054-17-01 | Kit Manifest Contract and Normalization | High | Medium | `SolutionKitManifest` builder + catalog normalization |
| TASK-054-16 | Coderso Module Widget Pack Matrix | High | Medium | Pack matrix contract + strict/advisory validation + pack-aware widget module UX |
| TASK-054-16-04 | Pack Matrix QA, Docs, and Closure | Medium | Medium | Lint/types/tests + docs/changelog/board closure |
| TASK-054-16-03 | Widget Library Pack-Aware Module UX | Medium | Medium | Module option ordering/labels driven by pack readiness |
| TASK-054-16-02 | Registry Pack Validator and Coverage Report | High | Medium | `listModulePackStatus` + `validateModulePackMatrix` |
| TASK-054-16-01 | Matrix Contract and Module Pack Definitions | High | Medium | Static pack matrix + enforcement profile contract |
| TASK-054-15 | Coderso Plugin Contract and Package Manifest | High | Large | Strict manifest contract + runtime/plugin route guardrails |
| TASK-054-15-04 | Plugin Contract QA, Docs, and Closure | Medium | Medium | Lint/types/tests + docs/changelog/board closure |
| TASK-054-15-03 | Plugin Routes Hardening and Internal Plugins API | High | Medium | Internal plugin routes + route scope/permission hardening |
| TASK-054-15-02 | Core Runtime Manifest Validator and Module Registrar | High | Large | strict manifest validation + contributions registry + dependency checks |
| TASK-054-15-01 | SDK Manifest Contract and Normalization | High | Medium | `@core/sdk/pluginManifest` contract + alias normalization |
| TASK-054-14 | Coderso Composite-First Widget Strategy | High | Large | Metadata contract + composite-first widget library flow |
| TASK-054-13 | Coderso Solution Kits and AI Wizard | High | Large | Vertical kits + guided AI setup |
| TASK-054-13-07 | Solution Kits QA, Docs, and Closure | Medium | Medium | Full regression matrix + docs/changelog closure |
| TASK-054-13-06 | Solution Kits Content Packs and Installers | High | Large | Expanded per-kit packs: taxonomy/forms/pages/menu/seo installer |
| TASK-054-13-05 | AI Site Wizard Guided Flow | High | Large | Guided multi-step solution-kit flow with editable plan and execute timeline |
| TASK-054-13-05-04 | Wizard Tests, Docs, Changelog, and Closure | Medium | Medium | Unit/integration coverage + docs/changelog/board sync |
| TASK-054-13-05-03 | Wizard Execute Timeline, Rerun, Rollback, and Clone | High | Medium | Apply/dry-run timeline with rerun/rollback/clone-as-draft actions |
| TASK-054-13-05-02 | AiSiteWizard Step Flow and Review Editor | High | Medium | Guided steps with plan review and pre-apply editing |
| TASK-054-13-05-01 | Wizard Apply Contract and Planner Step Selection | High | Medium | Typed apply plan payload + blueprint filtering + run options metadata |
| TASK-054-13-04 | Solution Kits Admin UI, Cache, and Prefetch | High | Medium | Install actions + run history UI + cache/prefetch + docs sync |
| TASK-054-13-03 | Solution Kits Internal API and RBAC | High | Medium | Full kits internal API + RBAC split + schema/error mapping tests |
| TASK-054-13-02 | Solution Kits Install Engine, Idempotency, and Rollback | High | Large | Install run DB model + idempotent apply/rollback service + audit trace |
| TASK-054-13-01 | Solution Kits Domain, Catalog, and Planner | High | Medium | Typed catalog + planner + internal routes + admin foundation |
| TASK-054-12 | Coderso Menu, Popup, Reviews, Engagement Suite | Medium | Medium | Mega menu metadata + popups/reviews modules + utility widgets + QA/docs closure |
| TASK-054-12-06 | Engagement QA, Docs, and Closure | Medium | Medium | Full QA matrix + docs sync + changelog/kanban closure |
| TASK-054-12-05 | Mega Menu Extensions and Utility Widgets | Medium | Medium | Menu metadata UX/runtime + tabs/accordion/toggle-block widgets |
| TASK-054-12-04 | Admin UI for Popups and Reviews Modules | High | Medium | Popups list/editor + reviews moderation UI with cache/prefetch/nav wiring |
| TASK-054-12-03 | Popup and Reviews API Routes and RBAC | High | Medium | Internal `/popups` + `/reviews` routes, RBAC scopes, and error mapping tests |
| TASK-054-12-02 | Popup and Reviews Services and Validation | High | Medium | popup/review domain services + mega-menu settings normalization |
| TASK-054-12-01 | Engagement Domain and DB Schema | High | Medium | menu metadata + popups/reviews tables + migration 0043 |
| TASK-054-11 | Coderso Commerce Suite | Medium | Large | Product templates, compare, wishlist, tables |
| TASK-054-11-08 | Commerce QA, Docs, and Changelog Closure | Medium | Medium | Regression matrix + docs/changelog closure |
| TASK-054-11-07 | Checkout/Cart Adapter Contract | Medium | Medium | Pluggable checkout adapter contract with registry + plugin hook bridge |
| TASK-054-11-07-03 | Checkout Adapter Tests, Docs, and Closure | Medium | Medium | Unit coverage + lint/types + docs/changelog sync |
| TASK-054-11-07-02 | Checkout Adapter Registry and Plugin Hook Bridge | High | Medium | Registry resolution + plugin filter extension point |
| TASK-054-11-07-01 | Checkout Adapter Domain Contract and Default Behavior | High | Medium | Typed add-to-cart/checkout contract + internal noop adapter |
| TASK-054-11-06 | Commerce Runtime Widgets (Gallery/Compare/Table) | High | Large | Runtime product widgets + resolver integration |
| TASK-054-11-05 | Commerce Admin UI Catalog and Editor | High | Large | Product list/editor UX with cache/prefetch patterns |
| TASK-054-11-04 | Commerce Admin API Routes and RBAC | High | Medium | Internal `/commerce/*` routes + RBAC + error mapping tests |
| TASK-054-11-03 | Commerce Service and Query Engine | High | Large | Product/collection services + deterministic query engine + runtime payload resolver |
| TASK-054-11-02 | Commerce DB Schema and Migrations | High | Medium | `commerce_*` tables + migration metadata + DB constraint tests |
| TASK-054-11-01 | Commerce Domain Contract and Schemas | High | Medium | Commerce types + normalization helpers + schema validation tests |
| TASK-054-10-07 | Booking QA, Docs, and Closure | Medium | Medium | Regression matrix complete + docs/changelog closure |
| TASK-054-10 | Coderso Booking and Appointment Suite | High | Large | Domain, API, admin UI, runtime widgets, access modes, and QA closure delivered |
| TASK-054-10-09-03 | Media Access Tests and Docs | Medium | Medium | Coverage + docs/changelog closure for media delivery access |
| TASK-054-10-09-02 | Media Runtime Access Enforcement | High | Medium | `/media/*` gate requires session or `media.read` API key in internal mode |
| TASK-054-10-09-01 | Storage Settings Delivery Access Model and UI | High | Medium | `delivery.accessMode` in model/API/UI |
| TASK-054-10-09 | Media Delivery Access Modes | High | Medium | Global media runtime access mode for public/internal delivery |
| TASK-054-10-08-03 | Booking Access Mode Tests and Docs | Medium | Medium | Booking access tests + docs/changelog closure |
| TASK-054-10-08-02 | Booking Public API Access Enforcement | High | Medium | Service-level runtime access checks for slots/reservations |
| TASK-054-10-08-01 | Booking Access Mode Model and Admin UI | High | Medium | Per-service submission access in booking settings/UI |
| TASK-054-10-08 | Booking Runtime Access Modes and Internal Portal | High | Medium | `public` vs `internal` booking runtime behavior |
| TASK-054-10-06-04 | Booking Runtime Widgets QA and Docs | Medium | Medium | Widgets/runtime API tests + architecture/API docs + changelog |
| TASK-054-10-06-03 | Appointment Form Widget + Runtime Script | High | Large | Shared `flowId` runtime sync + booking submit UX |
| TASK-054-10-06-02 | Booking Calendar Widget | High | Medium | Runtime slot picker widget + editors |
| TASK-054-10-06-01 | Booking Runtime API and Resolver | High | Medium | Public booking endpoints + nonce/bot protection + runtime resolver |
| TASK-054-10-06 | Booking Runtime Widgets | High | Large | `booking-calendar` + `appointment-form` runtime flow delivered |
| TASK-054-10-05-01 | Booking Admin UI Modularization | High | Medium | Split booking page into tabs + shared helpers/types |
| TASK-054-10-05 | Booking Admin UI | High | Large | Coderso booking screen with resources/services/availability/reservations/slot preview |
| TASK-054-09 | Coderso Forms and Automation Suite | High | Large | Form actions, automation logs, multi-step runtime, presets, progress save |
| TASK-054-08 | Coderso Filters and Search Suite | High | Large | Faceted runtime filters + scoped public search + widgets/UI/API |
| TASK-054-07-08 | Coderso Listings QA, Tests, and Documentation | High | Medium | Regression matrix + docs/contracts + changelog |
| TASK-054-07 | Coderso Dynamic Data and Listing Suite | High | Large | Query/listing templates/runtime integration with QA closure |
| TASK-054-07-07 | Coderso Conditional Visibility and Dynamic Field Binding | Medium | Medium | Row-based visibility ops + template binding editor + runtime hide/show |
| TASK-054-07-06 | Coderso Runtime Widget Integration for Listings | High | Large | `contentList` + `entryTeaser` listing mode with query/template runtime binding |
| TASK-054-07-05 | Coderso Listings Admin UI Query Builder and Template Manager | High | Large | Listings table/editor/template manager + coderso nav beta exposure |
| TASK-054-07-04 | Coderso Listings API and Routes | High | Medium | Listings queries/templates routes + preview + persistence |
| TASK-054-07-03 | Coderso Listing Templates Model and Service | High | Medium | listing_templates DB model + normalized CRUD/config validation |
| TASK-054-07-02 | Coderso Listing Query Execution Service and Safety | High | Large | Source adapters + allowlisted filters/sort + deterministic pagination |
| TASK-054-07-01 | Coderso Listing Query Contract and Validation | High | Medium | Query schema + semantic parser + deterministic validation codes |
| TASK-054-06 | Coderso Module Catalog and Tiers | High | Medium | Full module registry + release tiers |
| TASK-054-05 | Coderso Docs and Regression Tests | Medium | Medium | Navigation docs + tests |
| TASK-054-04 | Coderso Module Shell and Responsive Behavior | Medium | Medium | Desktop/mobile shell consistency |
| TASK-054-03 | Coderso Routes and Backward Compatibility | High | Medium | Canonical coderso paths + legacy aliases |
| TASK-054-02 | Coderso Sidebar Navigation and Permissions | High | Medium | Collapsible nav + RBAC visibility |
| TASK-054-01 | Coderso Information Architecture and Naming | High | Medium | Naming contract and module boundaries |
| TASK-053-08 | Admin SPA Navigation and Prefetch | High | Large | SPA route transitions + optional hover/focus prefetch |
| TASK-053-08-01 | Admin Router Core | High | Medium | History-based admin router context |
| TASK-053-08-02 | Admin Links and Redirects | High | Medium | Internal `AdminLink` + hard-redirect exceptions |
| TASK-053-08-03 | Route Prefetch Strategy | Medium | Medium | Optional list prefetch on intent |
| TASK-053-08-04 | Tests and Docs | Medium | Medium | Router/link/prefetch tests + docs updates |
| TASK-053-07 | Admin Cache Layer | High | Large | WordPress-like cache with cross-tab refresh |
| TASK-053-01 | Page Builder Templates Mode | High | Large | Templates tab + template sections |
| TASK-053-05 | Runtime Preview FOUC Reduction | Medium | Medium | CSS preload + preview hide |
| TASK-053-04 | Page Revisions Retention Policy | Medium | Medium | Per-page retention + pruning |
| TASK-053-03 | Runtime Preview Dialog UX + Device Sync | Medium | Medium | Single close + device sync |
| TASK-053-02 | Page Settings Drawer Usability | High | Medium | Scroll + retention input |
| TASK-052 | Page Template and Navigation Runtime Parity | High | Large | 052-01..05 complete |
| TASK-052-05 | Regression Tests and Documentation Parity | Medium | Medium | QA matrix + docs/contracts sync |
| TASK-052-04 | Admin UI Template and Navigation Source Wiring | High | Medium | Dynamic template options + navigation source UX |
| TASK-052-03 | Navigation Runtime Pages Source and ShowInNav | High | Large | `linksSource=pages` + runtime resolver + fallback rules |
| TASK-052-02 | Page Runtime Template Wiring | High | Medium | Public + preview page render use resolved page templates |
| TASK-052-01 | Page Template Contract and Resolver | High | Medium | Normalize template key + resolver + fallback |
| TASK-099 | Dashboard Data Wiring (Functional) | Medium | Medium | 099-01/02/03 complete |
| TASK-099-03 | Dashboard UI Wiring | Medium | Medium | Dashboard page wired to API + loading/error states |
| TASK-099-02 | Dashboard API | Medium | Medium | GET /dashboard route + registration + test |
| TASK-099-01 | Dashboard Service | Medium | Medium | Dashboard aggregate service + DTO + tests |
| TASK-050 | Widget Templates Preview + Revisions | Medium | Medium | 050-01..15 complete |
| TASK-050-05 | Hero Widget Expansion + Slots | High | Medium | 050-05-01/02 complete |
| TASK-050-04 | Widget Slot System (Core) | High | Large | Slot model + insert UI + rendering complete |
| TASK-101 | Doc Navigator Assistant + Optional LLM Connector | High | Large | 101-01/02/03/04/05/06/07/08 complete |
| TASK-101-07 | Assistant Security, Quotas, Observability and Hardening | High | Medium | Quota enforcement + assistant metrics + audit redaction hardening |
| TASK-100 | Runtime Base URL + Auth TTL + Setup Wizard | High | Large | 100-01/02/03/04/05 complete |
| TASK-101-06 | Assistant Avatar Rendering and Preferences | Medium | Medium | Optional avatar layer + user preferences + 2D fallback |
| TASK-101-05 | Admin UI Assistant Chat and Modes | High | Large | Global assistant drawer in AdminShell + mode persistence + sources/fallback UX |
| TASK-101-04 | LLM Provider Abstraction and OpenRouter Adapter | Medium | Medium | Provider abstraction + OpenRouter adapter + llm-rag fallback path |
| TASK-101-08 | Internal Docs KB Schema, Ingest, and DB Retrieval | High | Large | DB KB tables + `_docs/_internal` ingest + DB retriever + runtime fallback |
| TASK-100-05 | First-Run Setup Wizard and Gating | High | Medium | Setup wizard + authenticated gate + setup.completed flow |
| TASK-100-04 | Admin UI Runtime URL and Auth TTL Wiring | High | Medium | General/Security UI fields + runtime settings payload wiring |
| TASK-100-03 | Auth TTL Runtime Sources | High | Medium | Session/reset TTL precedence + auth runtime settings source |
| TASK-100-02 | Public Base URL Resolver and Consumers | High | Medium | Unified resolver + request fallback for preview URLs |
| TASK-100-01 | Settings Keys and Runtime Validation | High | Medium | New runtime/auth settings keys + alias + validation |
| TASK-049 | Widget Library — Core + Templates + Favorites | High | Large | 049-01/02/03/04/05/06 complete |
| TASK-049-06 | Widget Template Editor UI | Medium | Medium | Template editor route + builder reuse + DnD wiring |
| TASK-049-05 | Widget Library UI Wiring | High | Large | Catalog API wiring + insert + details/favorites UX |
| TASK-049-04 | Widget Favorites (User Settings) | Medium | Small | `widgets.favorites` persistence + validation |
| TASK-049-03 | Widget Catalog + API Routes | High | Medium | `/widgets` + template CRUD aliases |
| TASK-049-02 | Widget Templates Service | High | Medium | Service CRUD + structural block validation |
| TASK-049-01 | Widget Templates DB Schema | High | Medium | `widget_templates` schema + migration |
| TASK-101-03 | Assistant API (Doc Navigator Runtime) | High | Medium | `/assistant/status` + `/assistant/chat` + `/assistant/reindex` docs-only runtime |
| TASK-101-02 | Documentation Index and Retrieval Engine | High | Large | Docs parser/chunking + in-memory BM25 retriever + deterministic answer composer |
| TASK-101-01 | Assistant Settings and Data Model | High | Medium | Global/user assistant settings + validation + General Settings UI |
| TASK-048 | Content Types & Content UX Expansion | Medium | Large | 048-01..09 complete |
| TASK-048-04 | Taxonomy System & Terms | Medium | Large | Categories/tags model + terms + assignments |
| TASK-048-03 | Media Field UX & Storage Integration | Medium | Medium | Media picker + schema/meta + entry validation |
| TASK-048-02 | Relation Field UX & Data Model | Medium | Medium | Relation config (single/multi) + picker UX |
| TASK-048-01 | Field Types & Schema Meta | Medium | Medium | `xFieldConfig` schema meta and strict validation |
| TASK-050-15 | Layout Primitives Widgets Pack | High | Large | 050-15-01/02/03/04/05/06/07 complete |
| TASK-050-15-07 | Divider Widget | Medium | Small | Visual separator primitive |
| TASK-050-15-06 | Spacer Widget | Medium | Small | Responsive spacing primitive |
| TASK-050-15-05 | Split Layout Widget | Medium | Medium | Two-pane layout with ratio controls |
| TASK-050-15-04 | Stack Layout Widget | Medium | Medium | Vertical/horizontal flow container |
| TASK-050-15-03 | Grid/Columns Layout Widget | High | Large | Dynamic columns with per-breakpoint sizing |
| TASK-050-15-02 | Section Layout Widget | High | Medium | Section wrapper + semantic regions + repeatable slots |
| TASK-050-15-01 | Repeatable Slots Core for Layout Widgets | High | Large | Slot kind contract + repeatable slot normalization + insertion flow |
| TASK-050-14-02 | Entry Teaser Widget | High | Medium | Dynamic entry teaser widget + runtime resolver + Wizard/Visual/Advanced |
| TASK-050-14 | Dynamic Content Widgets Pack | High | Large | 050-14-01/02 complete |
| TASK-050-14-01 | Content List Widget | High | Large | Dynamic content list widget + runtime resolver + Wizard/Visual/Advanced |
| TASK-050-13-05 | Rich Text Section Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13 | Trust and Content Widgets Pack | Medium | Large | 050-13-01/02/03/04/05 complete |
| TASK-050-13-04 | Team Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13-03 | Stats KPI Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13-02 | Gallery Mosaic Widget | Medium | Large | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-13-01 | Logo Cloud Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12 | Conversion Widgets Pack | High | Large | 050-12-01/02/03/04/05 complete |
| TASK-050-12-05 | CTA Banner Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-04 | FAQ Accordion Widget | Medium | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-03 | Pricing Plans Widget | High | Large | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-02 | Testimonials Widget | High | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-12-01 | Feature Grid Widget | High | Medium | Schema + renderer + Wizard/Visual/Advanced + tests complete |
| TASK-050-11 | Contact Widget Expansion | Medium | Medium | 050-11-01/02 complete |
| TASK-050-11-02 | Contact Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first IA + advanced technical cleanup |
| TASK-050-11-01 | Contact Widget Bugfixes and UX Hardening | Medium | Medium | Model/schema parity + renderer/wizard hardening |
| TASK-050-10 | Newsletter Widget Expansion | Medium | Medium | 050-10-01/02 complete |
| TASK-050-10-02 | Newsletter Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first IA + advanced technical cleanup |
| TASK-050-10-01 | Newsletter Widget Bugfixes and UX Hardening | Medium | Medium | Model/schema parity + wizard hardening + baseline tests |
| TASK-050-09 | Compare Timeline Widget Expansion | Medium | Medium | 050-09-01/02 complete |
| TASK-050-09-02 | Compare Timeline Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first IA + advanced technical cleanup |
| TASK-050-09-01 | Compare Timeline Widget Bugfixes and UX Hardening | Medium | Medium | Model/schema parity + normalized markers/segments + editor hardening |
| TASK-050-08 | Timeline Widget Expansion | Medium | Medium | 050-08-01/02 complete |
| TASK-050-08-02 | Timeline Widget Visual Rebuild and Advanced Cleanup | Medium | Large | Visual-first timeline IA + advanced technical cleanup |
| TASK-050-08-01 | Timeline Widget Bugfixes and UX Hardening | Medium | Medium | Data model + renderer parity + wizard hardening |
| TASK-050-07 | Footer Widget Expansion + Slots | High | Medium | 050-07-01/02 complete |
| TASK-050-07-02 | Footer Widget Visual Rebuild and Advanced Cleanup | High | Large | Visual-first Footer IA + advanced technical scope |
| TASK-050-07-01 | Footer Widget Bugfixes and UX Hardening | High | Medium | Footer slots MVP + editor hardening + baseline tests |
| TASK-050-06 | Navigation Widget Expansion + Slots | High | Medium | 050-06-01/02 complete |
| TASK-050-06-02 | Navigation Widget Visual Rebuild and Advanced Cleanup | High | Large | Visual IA rebuild + advanced technical cleanup |
| TASK-050-06-01 | Navigation Widget Bugfixes and UX Hardening | High | Medium | Wizard/visual hardening + behavior parity + right slot MVP |
| TASK-051 | Page Wrapper & Layout Settings | High | Large | 051-01/02/03 complete |
| TASK-051-03 | Admin UI — Page Layout Settings | High | Medium | Page settings drawer + shared runtime preview UX |
| TASK-051-02 | Page Wrapper Rendering + Inheritance | High | Medium | Runtime wrapper + inherit + preview parity |
| TASK-051-01 | Page Layout Model + Validation | High | Medium | Normalized settings.layout + strict schema |
| TASK-050-05-02 | Hero Widget Visual Rebuild and Advanced Cleanup | High | Large | Visual-first IA + presets modal + advanced scope cleanup |
| TASK-050-05-01 | Hero Widget Bugfixes and UX Hardening | High | Medium | Wizard media stability + centered media clarity + slot copy |
| TASK-048-06 | Content Modeling Docs & Examples | Medium | Medium | Cookbook + docs |
| TASK-048-05 | Content Editor Help & Tooltips | Low | Small | UI guidance |
| TASK-048-07 | Field Layout & Grouping UX | Medium | Medium | Sections + display |
| TASK-048-08 | Entry Workflow & Validation UX | Medium | Medium | Checklist + required |
| TASK-048-09 | Entry List UX & Bulk Actions | Medium | Medium | Filters + bulk |
| TASK-050-01 | Widget Template Preview | Medium | Medium | Preview modal + API |
| TASK-050-02 | Widget Template Revision History | Medium | Medium | Revisions table + restore |
| TASK-050-03 | Widget Nesting (Insert Into Existing Block) | Medium | Large | Nested blocks support |
| TASK-044 | Public Pages Rendering and Preview | High | Medium | Public site + preview |
| TASK-045 | Public Site Themes | High | Large | Public themes system + CSS pipeline |
| TASK-045-01 | Site Theme DB Schema | High | Medium | theme_profiles + theme_routes |
| TASK-045-02 | Site Theme Service + Resolver | High | Medium | Active theme + css vars |
| TASK-045-03 | Public CSS Build Pipeline | High | Medium | dist/site css build |
| TASK-045-04 | Admin UI — Site Themes | High | Large | Theme editor + preview |
| TASK-045-05 | Site Themes API Routes | High | Medium | /themes + profiles |
| TASK-046-01 | Site Settings Model | High | Medium | baseUrl + homepage |
| TASK-046-02 | Public Routes & Preview | High | Medium | content routes |
| TASK-046-03 | Content Entry Rendering | High | Large | list + detail templates |
| TASK-046-04 | SSR Cache & Revalidation | High | Medium | cache + invalidation |
| TASK-046-05 | Admin UI — Site Settings | High | Large | site settings UI |
| TASK-046 | Public Site Runtime | High | Large | Index for TASK-046-01..05 |
| TASK-047 | Admin/Public Base URLs (Routing Policy) | High | Medium | split admin/public hosts |
| TASK-047-01 | Admin/Public Base URL Settings | High | Small | settings keys |
| TASK-047-02 | Routing Policy Middleware | High | Medium | host-based routing |
| TASK-047-03 | Admin UI — Base URL Settings | High | Small | general settings fields |
| TASK-043 | Content Entry Metadata Integration | High | Large | Index for TASK-043-01..04 |
| TASK-043-01 | Entry Metadata DB + Schema | High | Medium | tags + scheduled_at |
| TASK-043-02 | Entry Metadata Services | High | Medium | tags + seo + author |
| TASK-043-03 | Entry Metadata API + Validation | High | Medium | /metadata endpoint |
| TASK-043-04 | Entry Metadata UI Wiring | High | Medium | Admin UI metadata panel |
| TASK-020 | Security Middleware and Request Pipeline | High | Medium | Request pipeline security |
| TASK-020-01 | Security Settings Model and Defaults | High | Medium | DB-backed security config |
| TASK-020-02 | Security Settings API and Validation | High | Medium | /settings/security |
| TASK-020-03 | Request Context and Request ID | High | Medium | requestId + context |
| TASK-020-04 | CSRF Protection Middleware | High | Medium | CSRF enforcement |
| TASK-020-05 | CORS Policy Middleware | High | Medium | allowlist + preflight |
| TASK-020-06 | Rate Limiting Middleware | High | Medium | auth/admin buckets |
| TASK-020-07 | Security Headers Middleware | Medium | Small | CSP/HSTS/etc |
| TASK-020-08 | Input Validation Middleware | Medium | Medium | AJV validate helper |
| TASK-020-09 | Security Settings UI Wiring | High | Medium | Admin UI config |
| TASK-020-10 | Session Limits in Security Settings | High | Medium | TTL + max sessions per user |
| TASK-020-11 | Security Hardening + Settings UX | High | Large | Done: auth/public/admin hardening aligned with user-friendly security settings presets |
| TASK-020-11-01 | Rate Limit Buckets + Keying | High | Medium | Done: explicit buckets and shared-IP-aware keying strategy added |
| TASK-020-11-02 | Auth Hardening + Bot Protection | High | Medium | Done: login/reset throttling and reCAPTCHA v3 protection added |
| TASK-020-11-03 | Public Endpoint Protection | High | Medium | Done: public endpoint policy, preview token protection, and abuse guardrails aligned |
| TASK-020-11-04 | Security Settings Model + API | High | Medium | Done: per-bucket security settings model, validation, and API expansion shipped |
| TASK-020-11-05 | Security Settings UI + Presets | High | Large | Done: Security settings sections, presets, and explanatory tooltips delivered |
| TASK-020-11-06 | PII Email Encryption | Medium | Large | Done: email-at-rest protection implemented with hash plus encrypted storage |
| TASK-028 | Analytics Core and UI | Medium | Large | KPIs + top content |
| TASK-028-01 | Analytics Service | Medium | Medium | aggregate metrics |
| TASK-028-02 | Analytics API Routes | Medium | Medium | /analytics endpoints |
| TASK-028-03 | Analytics UI Wiring | Medium | Medium | UI -> API |
| TASK-029 | Backups Core and UI | Medium | Large | backup registry |
| TASK-029-01 | Backups DB and Service | Medium | Medium | backups + schedule |
| TASK-029-02 | Backups API Routes | Medium | Medium | /backups endpoints |
| TASK-029-03 | Backups UI Wiring | Medium | Medium | UI -> API |
| TASK-030 | Import / Export Core and UI | Medium | Large | config bundles |
| TASK-030-01 | Import / Export Service | Medium | Medium | export/import |
| TASK-030-02 | Import / Export API Routes | Medium | Medium | /tools/export |
| TASK-030-03 | Import / Export UI Wiring | Medium | Medium | UI -> API |
| TASK-031 | Redirects Core and UI | Medium | Large | redirect CRUD |
| TASK-031-01 | Redirects DB and Service | Medium | Medium | redirects table |
| TASK-031-02 | Redirects API Routes | Medium | Medium | /redirects endpoints |
| TASK-031-03 | Redirects UI Wiring | Medium | Medium | UI -> API |
| TASK-033 | Security Sessions Core and UI | Medium | Medium | sessions list + revoke |
| TASK-033-01 | Sessions Service and API | Medium | Medium | /sessions endpoints |
| TASK-033-02 | Sessions UI Wiring | Medium | Medium | UI -> API |
| TASK-034 | Audit Logs UI Wiring | Medium | Medium | audit list + details |
| TASK-035 | Access Logs Core and UI | Medium | Large | request access logs |
| TASK-035-01 | Access Logs DB and Service | Medium | Medium | access_logs table |
| TASK-035-02 | Access Logs API Routes | Medium | Medium | /access-logs |
| TASK-035-03 | Access Logs UI Wiring | Medium | Medium | UI -> API |
| TASK-036 | IP Allowlist Core and UI | Medium | Large | allowlist + enforcement |
| TASK-036-01 | IP Allowlist Service | Medium | Medium | CRUD + CIDR |
| TASK-036-02 | IP Allowlist API and Middleware | Medium | Medium | /ip-allowlist |
| TASK-036-03 | IP Allowlist UI Wiring | Medium | Medium | UI -> API |
| TASK-037 | Login Alerts Core and UI | Medium | Medium | settings + alerts |
| TASK-037-01 | Login Alerts Settings | Medium | Medium | security settings |
| TASK-037-02 | Login Alerts UI Wiring | Medium | Medium | UI -> API |
| TASK-038 | Forms Core and UI | Medium | Large | Forms CRUD + submissions |
| TASK-038-01 | Forms DB Schema | Medium | Medium | forms + fields + submissions |
| TASK-038-02 | Forms Service and Validation | Medium | Medium | CRUD + validation |
| TASK-038-03 | Forms API Routes | Medium | Medium | /forms endpoints |
| TASK-038-04 | Forms UI Wiring | Medium | Medium | UI -> API |
| TASK-038-05 | Forms List and Editor Split | High | Large | list + /forms/:id editor |
| TASK-038-06 | Form Embed Widget + Page Editor Tab | Medium | Large | form widget + page editor integration |
| TASK-038-07 | Form Submission Access Modes | Medium | Medium | per-form public vs internal submissions |
| TASK-039 | API Keys Core and UI | Medium | Medium | keys + scopes |
| TASK-039-01 | API Keys DB and Service | Medium | Medium | api_keys table |
| TASK-039-02 | API Keys API Routes | Medium | Medium | /settings/api-keys |
| TASK-039-03 | API Keys UI Wiring | Medium | Medium | UI -> API |
| TASK-040 | Webhooks Core and UI | Medium | Large | webhooks + delivery |
| TASK-040-01 | Webhooks DB and Service | Medium | Medium | webhooks tables |
| TASK-040-02 | Webhooks Delivery and Retry | Medium | Medium | worker + signing |
| TASK-040-03 | Webhooks API Routes | Medium | Medium | /settings/webhooks |
| TASK-040-04 | Webhooks UI Wiring | Medium | Medium | UI -> API |
| TASK-041 | Email Settings Core and UI | Medium | Medium | SMTP + logs |
| TASK-041-01 | Email Settings Service | Medium | Medium | config + test |
| TASK-041-02 | Email API Routes | Medium | Medium | /settings/email |
| TASK-041-03 | Email UI Wiring | Medium | Medium | UI -> API |
| TASK-042 | Integrations Core and UI | Medium | Medium | registry + configs |
| TASK-042-01 | Integrations Service and Registry | Medium | Medium | tables + catalog |
| TASK-042-02 | Integrations API Routes | Medium | Medium | /settings/integrations |
| TASK-042-03 | Integrations UI Wiring | Medium | Medium | UI -> API |
| TASK-002 | Pages, Revisions, and Preview (Index) | High | Medium | Index for TASK-002-01..05 |
| TASK-002-01 | Page DB Schema & Migrations | High | Medium | Pages tables + revisions + preview tokens |
| TASK-002-02 | Page Services & Revisions | High | Medium | CRUD + publish + restore |
| TASK-002-03 | Preview Tokens & TTL | High | Medium | Secure preview links |
| TASK-002-04 | Pages Admin API & Validation | High | Medium | REST endpoints + schemas |
| TASK-002-05 | Pages UI Wiring (Admin) | High | Medium | Replace mocks with API |
| TASK-003 | Content Types Engine (Index) | High | Large | Index for TASK-003-01..06 |
| TASK-003-01 | Content DB Schema | High | Medium | Tables + indexes |
| TASK-003-02 | Content Schema Validation | High | Medium | AJV + strict schema |
| TASK-003-03 | Content Services and Revisions | High | Large | CRUD + publish + revisions |
| TASK-003-04 | Content Admin API | High | Medium | REST endpoints + guards |
| TASK-003-05 | Content Preview Tokens | Medium | Medium | Preview links for entries |
| TASK-003-06 | Content UI Wiring (Admin) | High | Medium | Replace mocks with API |
| TASK-006-14 | API Keys UI (Visual) | Medium | Medium | Settings API keys |
| TASK-006-15 | Audit Logs UI (Visual) | Medium | Medium | Filters + details drawer |
| TASK-006-16 | Content Entries List UI (Visual) | High | Medium | Entries list + sidebar |
| TASK-006-17 | Content Entry Editor UI (Visual) | High | Large | Entry editor layout |
| TASK-006-18 | Settings Security UI (Visual) | Medium | Medium | Security settings |
| TASK-006-19 | Webhooks UI (Visual) | Medium | Medium | Webhooks list + drawer |
| TASK-006-20 | Analytics UI (Visual) | Medium | Medium | KPIs + charts |
| TASK-006-21 | Backups UI (Visual) | Medium | Medium | Backups list + schedule |
| TASK-006-22 | Global Search UI (Visual) | Medium | Medium | Search results page |
| TASK-006-23 | Media Details UI (Visual) | Medium | Medium | Media details drawer |
| TASK-006-24 | Permissions Matrix UI (Visual) | Medium | Medium | RBAC matrix |
| TASK-006-25 | Plugin Details UI (Visual) | Medium | Medium | Plugin detail tabs |
| TASK-006-26 | SEO Manager UI (Visual) | Medium | Medium | SEO table + drawer |
| TASK-006-27 | Themes UI (Visual) | Medium | Medium | Themes list |
| TASK-006-28 | Theme Editor UI (Visual) | Medium | Large | Theme editor layout |
| TASK-006-29 | Widget Library UI (Visual) | High | Medium | Widget library grid |
| TASK-006-30 | Access Logs UI (Visual) | Medium | Medium | Access logs table |
| TASK-006-31 | Email Settings UI (Visual) | Medium | Medium | SMTP settings |
| TASK-006-33 | General Settings UI (Visual) | Medium | Medium | General settings |
| TASK-006-34 | Integrations UI (Visual) | Medium | Medium | Integrations cards |
| TASK-006-35 | Invite Users UI (Visual) | Medium | Medium | Invite modal |
| TASK-006-36 | IP Allowlist UI (Visual) | Medium | Medium | IP allowlist |
| TASK-006-37 | Redirects UI (Visual) | Medium | Medium | Redirects list |
| TASK-006-38 | Security Sessions UI (Visual) | Medium | Medium | Active sessions |
| TASK-006-39 | Storage Settings UI (Visual) | Medium | Medium | Storage config |
| TASK-006-40 | Import & Export UI (Visual) | Medium | Medium | Import/export |
| TASK-006-41 | Login Alerts UI (Visual) | Medium | Medium | Login alerts |
| TASK-006-42 | Admin UI Integration | High | Medium | Routing + navigation |
| TASK-009 | Widget Registry and Core Widgets | High | Large | Core widgets + schema |
| TASK-009-01 | Widget Registry | High | Medium | Registry contract |
| TASK-009-02 | Widget Schema Validation | High | Medium | AJV validate + defaults |
| TASK-009-03 | Core Widget: Hero | High | Medium | Schema + editor + render |
| TASK-009-04 | Core Widget: Timeline | High | Medium | Schema + editor + render |
| TASK-009-05 | Core Widget: Compare Timeline | High | Medium | Schema + editor + render |
| TASK-009-06 | Core Widget: Newsletter | Medium | Small | Schema + editor + render |
| TASK-009-07 | Core Widget: Contact | Medium | Medium | Schema + editor + render |
| TASK-009-08 | Core Widget: Navigation | Medium | Medium | Menu integration |
| TASK-009-09 | Core Widget: Footer | Medium | Medium | Columns + contact |
| TASK-009-10 | Widget Renderer Pipeline | Medium | Medium | normalize + render |
| TASK-009-11 | Widgets UI Wiring | High | Medium | Page builder integration |
| TASK-001 | ORM Foundation and Auth Tables | High | Medium | Drizzle + auth tables |
| TASK-004 | Auth, RBAC, and Admin API Base (Index) | High | Large | Index for TASK-004-01..07 |
| TASK-004-03 | Password Hashing and Sessions | High | Medium | argon2 + sessions |
| TASK-004-04 | Auth Middleware | High | Medium | attachUser + requireAuth |
| TASK-004-05 | RBAC Middleware | High | Medium | requirePermission |
| TASK-006 | Menus and Navigation | Medium | Medium | Menu CRUD + admin UI |
| TASK-007 | Settings and Design Tokens | Medium | Medium | Index for TASK-007-01..04 |
| TASK-007-01 | Settings Model and Service | Medium | Medium | Settings table + service |
| TASK-007-02 | Settings Admin API and Validation | Medium | Medium | Endpoints + schemas |
| TASK-007-03 | Design Token Pipeline | Medium | Medium | Merge + CSS vars |
| TASK-007-04 | Settings UI and Tokens UI | Medium | Medium | Settings pages + tokens |
| TASK-007-05 | Settings UI Wiring | Medium | Medium | Admin UI -> settings API |
| TASK-008 | Themes and Theme Profiles | Medium | Large | Theme registry + profiles |
| TASK-008-01 | Theme Registry and Loader | Medium | Medium | Scan /themes + theme.json |
| TASK-008-02 | Theme Profiles and Routes | Medium | Medium | DB + routes + active profile |
| TASK-008-03 | Template Resolution and Rendering | Medium | Medium | Resolver order + fallback |
| TASK-008-04 | Themes Admin API | Medium | Medium | /themes + profiles endpoints |
| TASK-008-05 | Themes Admin UI Wiring | Medium | Medium | Wire themes UI to API |
| TASK-008-06 | Admin UI Theme Templates | High | Large | UI-only templates + profiles split |
| TASK-008-07 | Admin UI Theme Tokens Tabs | Medium | Medium | Tabs + per-section previews |
| TASK-024 | Shadcn UI and Tailwind v4 Setup | High | Medium | Admin UI base |
| TASK-006-09 | Login UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-10 | Two Factor UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-11 | Reset Password UI (Visual) | Medium | Small | HTML -> shadcn conversion |
| TASK-006-12 | Set Password UI (Visual) | Medium | Small | HTML -> shadcn conversion |
| TASK-006-01 | Dashboard UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-02 | Menu Editor UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-03 | Media Library UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-04 | Schema Builder UI (Visual) | High | Large | HTML -> shadcn conversion |
| TASK-006-05 | Plugin Store UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-06 | Page List UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-07 | Page Editor UI (Visual) | High | Large | HTML -> shadcn conversion |
| TASK-006-08 | Design Tokens UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-13 | Users and Roles UI (Visual) | Medium | Medium | HTML -> shadcn conversion |
| TASK-006-32 | Form Builder UI (Visual) | High | Large | Form builder layout |
| TASK-010 | Page Builder UI (Functional) | High | Large | Wizard/Visual/Advanced |
| TASK-011 | Content Types Admin UI (Functional) | High | Large | Schema builder + entries |
| TASK-012 | Media Library Admin UI (Functional) | Medium | Medium | Uploads + metadata UI |
| TASK-013 | Search and Indexing | Medium | Medium | Admin search + DB indexes |
| TASK-014 | Audit Logs | Medium | Medium | Audit events + UI |
| TASK-015 | Plugin Runtime Loader and Registry | High | Large | Runtime load + safe mode |
| TASK-016 | SDK Package and Plugin API | High | Large | @core/sdk package |
| TASK-017 | Store Client and Update Policy | High | Large | Signatures + updates |
| TASK-018 | Plugin Store Admin UI (Functional) | Medium | Medium | Store browse + install |
| TASK-019 | Users and Roles Admin UI (Functional) | Medium | Medium | Users + roles UI |
| TASK-025 | Auth UI Wiring (Functional) | High | Medium | Login + 2FA + reset wiring |
| TASK-004-01 | Core HTTP Server and Admin UI Bootstrap | High | Large | Bun server + admin entry |
| TASK-004-06 | Auth Routes and Base API Layer | High | Medium | login/logout/me base |
| TASK-004-07 | Auth UI Wiring (Functional) | High | Medium | Login + 2FA + reset wiring |
| TASK-004-02 | Auth Advanced Endpoints (CSRF/OTP/Reset) | High | Medium | CSRF + reset + OTP |
| TASK-005 | Media Storage and Uploads (Index) | Medium | Medium | Index for TASK-005-01..08 |
| TASK-005-01 | Media DB Schema | Medium | Small | Table + migration |
| TASK-005-02 | Storage Adapter Interface | Medium | Small | Adapter contract + resolver |
| TASK-005-03 | Local Storage Adapter | Medium | Small | Local file storage |
| TASK-005-04 | S3 Storage Adapter | Medium | Medium | AWS S3 integration |
| TASK-005-05 | Azure Storage Adapter | Medium | Medium | Azure Blob integration |
| TASK-005-06 | Media Service + Validation | Medium | Medium | Upload metadata + validation |
| TASK-005-07 | Media API Routes | Medium | Medium | Upload + CRUD endpoints |
| TASK-005-08 | Media UI Wiring (Admin) | Medium | Medium | Admin upload + metadata UI |
| TASK-005-09 | Storage Settings Runtime Config | High | Medium | DB config + encryption + UI |
| TASK-026 | Search UI Wiring | Medium | Medium | Wire global search to /search |
| TASK-027 | SEO Manager Core and UI | High | Large | SEO data + audit + UI |
| TASK-027-01 | SEO DB Schema | High | Medium | seo_documents |
| TASK-027-02 | SEO Service and Audit Runner | High | Medium | audit scoring |
| TASK-027-03 | SEO API Routes | High | Medium | /seo endpoints |
| TASK-027-04 | SEO UI Wiring | High | Medium | UI -> API |
