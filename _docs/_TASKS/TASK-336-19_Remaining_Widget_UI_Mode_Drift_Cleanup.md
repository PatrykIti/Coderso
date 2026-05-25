# TASK-336-19: Remaining Widget UI Mode Drift Cleanup

# FileName: TASK-336-19_Remaining_Widget_UI_Mode_Drift_Cleanup.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract
**Estimated Effort:** Very Large
**Dependencies:** TASK-336-18
**Status:** In Progress (2026-05-24)

---

## Overview

Clean up the high/medium UI mode drift discovered while adding strict
`editorContract` metadata to the remaining page-builder widgets.

`TASK-336-18` defines the target ownership contract. This follow-up must bring
the actual editor UI into that contract so nontechnical users are not asked to
enter raw CSS tokens, JSON, HTML, IDs, or web-development-specific values in
normal Wizard/Visual flows.

## TASK-336-18 Intake Findings

Authenticated Playwright admin smoke
`widget-contract-smoke-task-336-18-admin-auth-2026-05-24.*` captured the
initial drift baseline for this cleanup:

- `adminFailures=9`, `fixtureGaps=19`, `metadataGaps=2`.
- Mode-root or visible-section failures: `feature-grid`, `pricing-plans`,
  `faq-accordion`, `cta-banner`, `gallery-mosaic`, `team`,
  `rich-text-section`, `navigation`, `footer`.
- Metadata gaps: `toggle-block` (`wizard`, `visual`, `advanced`) and
  `logo-cloud` Visual repeated-logo controls.
- Fixture/unopenable mode gaps include structural/admin-selection issues for
  `template-section`, `split-layout`, `accordion`, `spacer`, `stack`,
  `content-list`, `entry-teaser`, `product-compare`, `listing-filters`,
  `timeline`, `newsletter`, `appointment-form`, `contact`, and `footer`.
- Static/read-only audits also found writable Advanced controls and raw
  ID/JSON/HTML/CSS-token/technical URL fields across the in-scope editors.

## Claude UX Review Intake

The 2026-05-24 read-only Claude review accepted the target split: Wizard
handles one-time setup, Visual handles daily editing, and Advanced stays
read-only diagnostics. It added these concrete cleanup requirements:

- Replace editable `formId`, `menuKey`, `assetId`, and item-id fields with
  form, menu, media, and item pickers, or move them to read-only diagnostics.
- Resolve the `contact` `map.embedUrl` contradiction before closure: it cannot
  be both a Visual raw URL input and an Advanced read-only diagnostic unless
  the Visual UI is a sanitizer-gated map picker or paste flow with
  nontechnical copy.
- Ensure rich HTML paths such as testimonial quote HTML and rich feature
  descriptions render through a rich-text editor, never a raw HTML textarea.
- Move FAQ JSON-LD controls out of ordinary content editing into a clear SEO
  section or a sitewide SEO surface.
- Standardize Advanced contract-summary diagnostics across the remaining
  widgets after the UI ownership is corrected.
- Mask or omit `contact.resolved.submissionNonce` and similarly sensitive
  runtime data from any rendered Advanced diagnostic summary.

## Widgets in Scope

- Interactive/content: `toggle-block`, `faq-accordion`, `timeline`,
  `compare-timeline`, `rich-text-section`
- Marketing/trust/media: `feature-grid`, `testimonials`, `pricing-plans`,
  `cta-banner`, `logo-cloud`, `gallery-mosaic`
- Dynamic/commerce/source: `entry-teaser`, `product-gallery`,
  `product-compare`, `newsletter`, `contact`
- Site chrome: `navigation`, `footer`

## Sub-Tasks

- [x] Add missing Wizard/Advanced section DOM metadata and classify
  non-persisted custom controls as `preview` or `action` so Playwright can
  distinguish metadata drift from real editable controls.
- [ ] Remove Wizard ownership of style/layout fields that were only tolerated
  during replayable setup.
- [ ] Move daily content/style/behavior controls from Advanced into Visual or
  convert them to read-only Advanced summaries.
- [ ] Replace raw ID/JSON/HTML/URL user inputs in Wizard/Visual with pickers,
  preset controls, preview cards, or support-only diagnostics.
- [ ] Keep source IDs, query payloads, sanitizer output, runtime payloads, and
  integration metadata read-only in Advanced unless the product explicitly
  marks a support-only repair action.
- [ ] Confirm destructive normalization/reset/import actions before mutation.
- [ ] Re-run Playwright CLI smoke for the affected widgets and ensure no
  duplicate writable owners remain outside explicit temporary allowances.
- [ ] Record accepted/rejected Claude UX review feedback in the task notes.

## Status Notes

- In Progress (2026-05-24): first implementation family targets DOM metadata
  drift from the authenticated Playwright baseline. It adds missing Wizard or
  Advanced `WidgetEditorSection` markers for `feature-grid`, `pricing-plans`,
  `faq-accordion`, `cta-banner`, `gallery-mosaic`, `team`,
  `rich-text-section`, `navigation`, and `footer`, and classifies non-persisted
  custom controls in `toggle-block`, `logo-cloud`, and `feature-grid` as
  `preview` or `action`.
- In Progress (2026-05-24): fresh helper-agent refinement accepted this family
  as safe DOM metadata cleanup and separately queued raw media URL replacement
  with existing `MediaPicker` surfaces for the next family.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the 11 touched widgets now reports `adminFailures=0` and `metadataGaps=0` for
  each widget. Remaining fixture gaps are still visible for the `advanced`
  probes of `pricing-plans`, `cta-banner`, `team`, `navigation`, and
  `toggle-block`; these are not closed by the DOM metadata family.
- In Progress (2026-05-24): full 38-widget admin smoke was attempted but
  stopped after the unchanged `spacer` advanced probe hung without producing a
  report. Targeted widget evidence is recorded under
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-dom-admin-*-2026-05-24.*`.
- In Progress (2026-05-24): second implementation family removes editable raw
  image/media URL fields from normal Wizard/Visual flows in `navigation`,
  `cta-banner`, `testimonials`, `feature-grid`, and `logo-cloud`. The editors
  now use existing `MediaPicker` controls and keep legacy external image values
  as read-only replace/clear notices without changing the persisted widget
  schema. General CTA/navigation/link URL fields remain queued for a separate
  link/page-picker family.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the five raw-media cleanup widgets reports `adminFailures=0` and
  `metadataGaps=0` for every widget. `navigation`, `testimonials`, and
  `logo-cloud` have `fixtureGaps=0`; `cta-banner` and `feature-grid` still show
  unchanged Advanced fixture-selection gaps (`block_select_missing`).
- In Progress (2026-05-24): third implementation family replaces editable raw
  `href`/URL/path fields in normal Wizard/Visual flows for `navigation`,
  `cta-banner`, `logo-cloud`, `testimonials`, and `feature-grid` with the
  shared `LinkDestinationField`. The field loads published pages, writes back
  the existing string `href` contract, and preserves legacy custom/hash/external
  destinations as read-only replace/clear state. Claude read-only UI/UX review
  accepted the page-first/read-only-legacy approach for this slice and required
  filtering page options to `published` plus removing the new-logo `href: "#"`
  seed, both of which are included.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the five link-destination widgets reports `adminFailures=0`,
  `metadataGaps=0`, and authenticated admin reachability for every widget.
  `navigation`, `logo-cloud`, and `feature-grid` have `fixtureGaps=0`;
  `cta-banner` and `testimonials` still show unchanged Advanced
  fixture-selection gaps (`block_select_missing`).
- In Progress (2026-05-24): fourth implementation family resolves the explicit
  `contact` map/social authoring contradiction. Visual now asks for a public
  map location/address and known social profile names/handles, then writes the
  existing `map.embedUrl` and `contact.social[].href` string fields through
  Contact-owned helpers. Legacy custom map/social destinations remain
  backward-compatible replace/clear states instead of editable raw URL fields.
  Advanced map metadata is read-only, and Contact normalization is a
  confirm-gated support action. Claude recommended a sanitizer-gated paste
  flow; this slice intentionally uses location/profile-name authoring because
  the user requirement was stricter than paste-a-URL authoring.
- In Progress (2026-05-24): Claude post-implementation review flagged three
  pre-commit blockers, all addressed in this slice: Wizard no longer writes
  `form.submission.staticMessage` outside its declared contract, the Contact
  Advanced contract no longer lists the nonexistent `runtime.normalizedData`
  path, and new social rows start from a known platform instead of a dead-end
  `custom` choice. Full social URLs pasted into known-platform profile fields
  are parsed or rejected instead of being encoded as profile handles.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  `contact` reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0` in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-contact-authoring-admin-2026-05-24.*`.
- In Progress (2026-05-24): fifth implementation family converts Advanced
  second-editor controls in `faq-accordion`, `newsletter`, and `navigation` to
  read-only diagnostics. FAQ and Newsletter keep only two-step confirmed
  normalization support actions. Navigation layout width/spacing and
  sticky/collapse behavior move into Visual, Advanced redacts raw `menuKey` to
  configured/not-configured status, and the contract no longer declares
  nonexistent `cta.target` or `cta.enabled` paths. Claude and helper-agent
  review agreed the one-time Wizard lifecycle remains separate under
  `TASK-336-16`; this batch only addresses Advanced drift. FAQ Visual SEO copy
  now uses beginner-facing search visibility wording instead of raw `JSON-LD`
  terminology.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the Advanced read-only batch is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-advanced-readonly-admin-*-2026-05-24.*`.
  `faq-accordion` and `navigation` report `adminFailures=0`,
  `publicFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`. `newsletter`
  reports `adminFailures=0`, `publicFailures=0`, and `metadataGaps=0`, with an
  unchanged admin fixture gap (`block_select_missing`) that prevents opening
  widget modes in the harness.
- In Progress (2026-05-24): sixth implementation family removes remaining
  Newsletter Visual raw technical authoring. Field-name text inputs are
  replaced by default/read-only mapping in static mode and selected Form field
  pickers in Forms-runtime mode. Visual no longer edits analytics event names,
  action URLs, native methods, or webhook IDs; it shows a beginner-safe
  connection summary while Advanced remains the read-only transport diagnostics
  surface. Compatibility warnings now describe missing Email/First name/Consent
  fields rather than raw runtime field keys.
- In Progress (2026-05-24): targeted Newsletter validation passed
  `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
  and `bun test tests/vitest/widgets/newsletter.test.tsx`. Targeted
  Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-newsletter-visual-admin-2026-05-24.*`;
  the rerun reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0`.
  Claude read-only UI/UX retry returned `NO BLOCKERS` for P1/P2 beginner-mode
  technical authoring drift in the current diff.
- In Progress (2026-05-24): seventh implementation family targets commerce
  source/curation authoring in `product-gallery` and `product-compare`.
  Product Compare now keeps Wizard query-based and moves curated product order
  plus featured-product selection to Visual product pickers, removing the
  temporary `source.productIds` duplicate allowance. Product Gallery hides
  collection fallback IDs, uses shopper-facing price fields, moves selected
  products, card density, and more-products destination into Visual pickers,
  and keeps route prefix/behavior summaries read-only in Advanced.
- In Progress (2026-05-24): targeted commerce validation passed
  `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/commerce-widget-editor-shared.test.tsx tests/vitest/ui/product-gallery-admin-preview.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/editorContract.test.ts`,
  `bun --cwd core lint`, and `bun --cwd core lint:types`. Playwright evidence
  is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-commerce-product-gallery-2026-05-24.*`
  and
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-commerce-product-compare-2026-05-24.*`.
  Product Gallery reports `adminFailures=0`, `publicFailures=0`,
  `fixtureGaps=0`, and `metadataGaps=0`. Product Compare reports
  `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude post-implementation review later flagged Product
  Gallery card density as a Wizard/Visual ownership blocker; the controls were
  moved into Visual instead of broadening the Wizard contract.
- In Progress (2026-05-24): eighth implementation family hardens the shared
  PageEditor widget-preview state setter so repeated `setPreviewState(null)`
  calls and identical ready states are idempotent. This reduces preview-capable
  widget churn for `newsletter`, `product-compare`, `product-gallery`, and
  related widgets. During Playwright validation, stale Vite optimized
  dependency cache produced false `block_select_missing` gaps with empty admin
  snapshots and `504 Outdated Optimize Dep` console errors; clearing
  `core/node_modules/.vite` and rerunning with fresh Playwright sessions
  produced clean Newsletter and Product Compare admin smoke. Claude read-only
  review for this PageEditor hardening timed out after 180 seconds without
  returning output.
- In Progress (2026-05-24): ninth implementation family removes Gallery Mosaic
  raw Visual URL authoring for image, video, link, and poster fields. Visual now
  uses media pickers for image/video replacement and video poster frames, a
  page-first `LinkDestinationField` for destinations, explicit saved-asset
  compatibility copy for older URL values, and clear actions for media/poster
  state. Gallery Mosaic defaults no longer seed `href: "#"`, and the Wizard
  contract now matches actual writes (`header.title`, item count, image/video
  media, and captions) instead of claiming `header.description` or `items.alt`.
  The Advanced diagnostics contract also drops the nonexistent
  `runtime.normalizedData` path. Claude read-only re-review reported no
  blockers after these fixes. Targeted validation passed
  `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso`. Initial Playwright smoke hit the known stale Vite
  optimized dependency failure; after clearing `core/node_modules/.vite` and
  restarting `coderso-dev-core-host`, the rerun stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-gallery-mosaic-media-link-2026-05-24.*`
  reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- In Progress (2026-05-24): tenth implementation family targets Pricing Plans
  CTA destination authoring. Wizard and Visual no longer render raw `CTA URL`
  text inputs for `plans.ctaHref`; both use the shared page-first
  `LinkDestinationField` while preserving saved custom/hash/external
  destinations as replace-or-clear compatibility state. Pricing Plans defaults
  no longer seed fake `ctaHref: "#"`, so new/reset widgets do not start with
  disabled custom destination rows. Pricing Plans color controls now use
  swatches plus clear/legacy-token summaries instead of visible raw token
  textboxes. The Wizard contract no longer claims `header.description`, and
  Advanced read-only diagnostics now include real `header` data. Focused
  Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso` also pass.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-pricing-plans-cta-destination-2026-05-24.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude read-only review was attempted for this slice, but
  the process exited with code 143 and produced no review output.
- In Progress (2026-05-24): eleventh implementation family targets Team Visual
  CTA, photo, and social destination authoring. Team CTA now uses the shared
  page-first `LinkDestinationField`, member photos are managed through the
  Media Library with saved-photo replace/clear compatibility state, and member
  social links use known platform choices plus profile names/handles instead
  of visible raw URL fields. Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-team-authoring-2026-05-24.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude review was attempted twice; the budget-limited
  invocation exited with `Exceeded USD budget (1)`, and the no-budget retry
  produced no output before being stopped with code 143.
- In Progress (2026-05-24): twelfth implementation family targets Footer
  Wizard/Visual raw destination authoring. Footer brand logo authoring now uses
  Media Library picking, visible column/legal links use the shared page-first
  `LinkDestinationField`, social links use known platform profile
  names/handles, and custom social destinations use page picking with saved
  custom replace/clear compatibility state. Focused Vitest evidence currently
  passes
  `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-footer-authoring-2026-05-24.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude read-only review was attempted for this slice, but
  the returned output contained no actionable findings or blocker list.
- In Progress (2026-05-24): thirteenth implementation family targets Compare
  Timeline step/segment destination authoring. Visual no longer exposes raw
  safe-link text inputs for `axis.steps[].href` or track segment `href`; both
  use the shared page-first `LinkDestinationField` while preserving saved
  custom destinations as replace-or-clear compatibility state. Focused Vitest
  evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-compare-timeline-authoring-2026-05-24.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude read-only review was attempted for this slice, but
  it returned no actionable output.
- In Progress (2026-05-25): fourteenth implementation family targets Timeline
  Wizard ownership, Visual destination authoring, and Advanced writable-layout
  drift. Wizard now seeds only the starter story (`variant`, header title,
  header description, starter step count, and starter step title/description)
  and no longer exposes timeline mode, layout, guides, status, icons, marker
  accents, dates, or destinations. Visual step CTA and whole-step destinations
  now use the shared page-first `LinkDestinationField` while saved
  custom/hash/external destinations stay replace-or-clear compatible. Advanced
  now renders read-only runtime/layout/style diagnostics plus a two-step
  confirmed normalization support action instead of editable layout controls.
  Claude follow-up polish moved the title-hidden warning into Visual
  Typography, made Advanced summaries use human-readable labels, displays
  transparent background diagnostics as inherited/transparent, and makes the
  normalization review state auto-expire when the payload changes before
  confirmation.
  Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-timeline-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude returned `NO BLOCKERS` after the first review,
  then `NO REMAINING ACTIONS` after the low suggestions were addressed.
- In Progress (2026-05-25): fifteenth implementation family starts the Hero
  cleanup with Wizard/Visual destination authoring only. Hero primary CTA,
  secondary CTA, and badge destinations now use the shared page-first
  `LinkDestinationField` instead of visible raw URL/path fields while saved
  custom/hash/external destinations stay replace-or-clear compatible. Focused
  Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-link-destinations-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
  Helper-agent audit accepted this as the first safe Hero sub-slice and queued
  separate follow-up sub-slices for media URL, avatar URL, rich HTML, and
  color/overlay authoring. Claude review for this link-only slice timed out
  before returning output.
- In Progress (2026-05-25): sixteenth implementation family continues Hero
  cleanup with media/poster authoring. Hero Visual media and background media
  now use Media Library pickers for `media.src`, `media.posterSrc`,
  `background.media.src`, and `background.media.posterSrc` instead of visible
  raw URL/source controls. Saved external media/poster values remain
  runtime-compatible and appear as replace-or-clear read-only state in Visual.
  Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-media-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude read-only media review returned `NO BLOCKERS`
  before the final legacy-state refinements; a final `claude -p
  --permission-mode plan --output-format text` confirmation attempt timed out
  after 240 seconds without new output.
- In Progress (2026-05-25): seventeenth implementation family continues Hero
  cleanup with social proof avatar authoring. Hero Visual avatar rows now use
  Media Library image pickers with additive `source`/`assetId` metadata while
  preserving `src` as the runtime field. Existing `src`-only avatars remain
  runtime-compatible and appear as replace-or-clear saved avatar state instead
  of editable raw URL inputs. Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-avatar-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Helper-agent review flagged source/assetId and partial
  asset save edge cases; those were addressed before validation. Claude
  read-only review for this avatar-only slice timed out after 240 seconds
  without output.
- In Progress (2026-05-25): eighteenth implementation family continues Hero
  cleanup with rich copy authoring. Hero Visual `richHeadline` and `richBody`
  now use the shared rich-text toolbar instead of raw HTML textareas while
  preserving the existing sanitized runtime fields. Focused Vitest evidence
  currently passes
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-rich-copy-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude read-only review flagged aria linkage, empty-rich
  fallback, and silent sanitizer drift; those findings were addressed before
  the final Playwright rerun. A final Claude confirmation attempt timed out
  after 180 seconds without new output.
- In Progress (2026-05-25): nineteenth implementation family continues Hero
  cleanup with media overlay authoring. Hero Visual `media.overlay` and
  `background.media.overlay` now use overlay color plus strength controls
  instead of raw `rgba(...)` text inputs while preserving the stored overlay
  string contract. Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-overlay-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude read-only review timed out after 180 seconds
  without output.
- In Progress (2026-05-25): twentieth implementation family continues Hero
  cleanup with color authoring. Hero Visual style and background color controls
  now use swatch/color-picker, transparent, and clear actions instead of raw
  CSS/token text inputs. Existing `var(...)`, `rgba(...)`, and `transparent`
  values remain runtime-compatible and appear as replace-or-clear saved custom
  state for nontechnical authors. Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-color-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Helper-agent review found no high drift and flagged missing
  clear-path coverage plus docs/evidence synchronization; those findings were
  addressed before validation. Claude read-only review timed out after 240
  seconds without output.
- In Progress (2026-05-25): twenty-first implementation family starts FAQ
  Accordion color authoring cleanup. FAQ Visual color fields now use
  swatch-only controls plus clear actions instead of raw CSS/token text inputs,
  while existing theme tokens, rgba values, and custom strings remain
  compatible as saved custom color state that can be replaced or cleared by
  nontechnical authors. All seven style color fields now share the same
  clearable normalization contract in `normalizeFaqAccordionData`. Focused
  Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-faq-color-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Helper-agent audits first found stale expectations,
  incomplete clear coverage, and stale docs; those findings were fixed before
  final review, which reported no high/medium/low drift. Claude read-only
  review timed out after 240 seconds without output.
- In Progress (2026-05-25): twenty-second implementation family targets CTA
  Banner color and Advanced drift. CTA Banner Visual style/background color
  fields now use swatch-only controls plus clear actions instead of raw
  CSS/token text inputs. Existing theme tokens, transparent values, and custom
  color strings remain compatible as saved custom color state that can be
  replaced or cleared without asking nontechnical authors to type CSS.
  Advanced no longer edits raw style tokens; it shows read-only style
  diagnostics and keeps normalize/reset as confirmed support actions. Focused
  Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-cta-color-advanced-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Helper-agent triage ranked this as the next high-priority
  slice; Claude independently ranked `stats-kpi` color authoring as the next
  color slice, which the next implementation family closes.
- In Progress (2026-05-25): twenty-third implementation family targets Stats
  KPI color authoring drift. Stats KPI Visual metric accents, typography
  colors, card/icon surfaces, and section background now use swatch-only
  controls, with clear actions on clearable fields, instead of raw CSS/token
  text inputs. Existing theme tokens, CSS variables, and custom color strings
  remain compatible as saved custom color state that can be replaced with a
  swatch or cleared where the field is clearable. New defaults now leave color
  values un-authored and apply theme colors at render time, so fresh widgets do
  not start as misleading saved-custom colors. Advanced remains read-only
  diagnostics. Focused Vitest evidence covers raw-token input absence,
  saved-custom replace behavior, fresh-default `Theme default` state, SSR
  editor metadata, and strict editor contracts; it currently passes
  `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-stats-kpi-color-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/*Editors.tsx` | Align actual controls with the `TASK-336-18` contract. |
| `core/widgets/core/*` | Remove temporary duplicate allowances after UI ownership is corrected. |
| `tests/vitest/widgets/*test.tsx` | Add focused widget contract tests where ownership changed. |
| `tests/vitest/ui/*editor-wave.test.tsx` | Add/extend editor wave coverage for mode-specific UI. |
| `_docs/_WIDGETS/*` | Document final mode ownership and support-only diagnostics. |
| `_docs/PLAYWRIGHT/*` | Store final smoke evidence. |

## Implementation Pseudocode

```ts
for (const widgetType of task33619WidgetTypes) {
  const editor = loadEditor(widgetType);
  moveControls({
    from: "wizard",
    to: "visual",
    paths: contract.visualWritablePaths.filter(isStyleOrLayoutPath),
  });
  convertAdvancedControls({
    writableControls: editor.advanced.controls,
    policy: "readonly-summary-or-confirmed-support-action",
  });
  replaceRawInputs({
    rawKinds: ["css-token", "json", "html", "id-list", "webhook-id"],
    replacement: "picker-or-readonly-diagnostic",
  });
  assertStrictContract(widgetType);
}
```

Data flow:

- The source of truth is the widget's exported `editorContract`.
- Visual remains the daily owner for content, presentation, behavior, and safe
  pickers.
- Advanced shows normalized/runtime diagnostics and confirmed support actions.

Error handling:

- Do not add broad duplicate allowlists to make tests pass.
- Do not expose raw IDs as editable fields for a nontechnical user.
- Destructive imports/resets must be confirm-gated and tested.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve existing widget schemas.
- Anti-abuse: no raw script, unsafe URL, public write, nonce, captcha, or HMAC
  changes.
- Secret handling: integration IDs, webhook IDs, source IDs, and runtime
  diagnostics must not expose secrets or privileged provider settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Focused editor wave tests for every touched editor family.
- Focused widget tests for changed render/source behavior.
- Playwright CLI smoke for all touched widgets.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

Regression-test shape:

- Advanced diagnostics sections stay read-only.
- Wizard does not own style/layout paths.
- Raw JSON/HTML/ID/CSS-token fields are not visible as normal Wizard/Visual
  controls.
- Temporary duplicate allowances added in `TASK-336-18` are removed or reduced
  to the true one-time Wizard lifecycle.

## Documentation Updates Required

- Update affected `_docs/_WIDGETS/*` mode ownership sections.
- Update `_docs/WIDGETS.md` if the shared Wizard/Visual/Advanced contract
  changes.
- Add Playwright evidence under `_docs/PLAYWRIGHT/`.
- Add a changelog entry and synchronize `_docs/_TASKS/README.md` on closure.

## Acceptance Criteria

- Remaining widget editors match the strict ownership model from
  `TASK-336-18`.
- Nontechnical users do not see raw CSS, JSON, HTML, IDs, or integration
  tokens as normal editing controls.
- Playwright admin smoke has zero duplicate-owner and metadata-gap findings for
  the touched widgets.
- Temporary duplicate allowances from `TASK-336-18` are either removed or tied
  only to the completed one-time Wizard lifecycle.
