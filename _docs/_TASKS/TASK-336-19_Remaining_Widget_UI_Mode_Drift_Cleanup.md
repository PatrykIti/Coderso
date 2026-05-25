# TASK-336-19: Remaining Widget UI Mode Drift Cleanup

# FileName: TASK-336-19_Remaining_Widget_UI_Mode_Drift_Cleanup.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract
**Estimated Effort:** Very Large
**Dependencies:** TASK-336-18
**Status:** In Progress (2026-05-25)

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
  `product-compare`, `product-table`, `newsletter`, `form-embed`, `contact`
- Site chrome: `navigation`, `footer`
- Contract residual revisits after completed leaves: `section`, `grid-columns`,
  `template-section`, `split-layout`, `tabs`, `accordion`, `spacer`, and shared
  page-builder shell controls when fresh audits find remaining mode drift.

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
- In Progress (2026-05-25): twenty-fourth implementation family targets Rich
  Text Section raw source and color authoring drift. Rich Text Section Visual
  color controls now use swatch-only authoring while preserving legacy custom
  token values as replace-or-clear saved custom color state. Advanced no longer
  edits `options.outputMode` or raw `body.html`; it reports read-only source,
  sanitizer, preview, and payload diagnostics, with normalize/reset kept as
  confirm-gated support actions. Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-rich-text-section-source-color-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
  Visual now owns `options.outputMode` through a friendly source-preference
  control, so saved `html`/`blocks` widgets are not stranded after Advanced
  becomes read-only.
- In Progress (2026-05-25): twenty-fifth implementation family targets Compare
  Timeline Advanced raw metadata and writable behavior drift. Advanced now
  renders read-only runtime layout, guide, highlight, motion/order, normalized
  track ID, axis step ID, step description, and step-count diagnostics.
  Add/remove step, guide style, raw step ID/description, and highlight target
  mutation remain in Visual instead of Advanced. Visual color fields now use
  swatch-only authoring while saved custom CSS/token values stay
  replace-or-clear compatible, and fresh defaults now use swatch-safe colors
  instead of seeded CSS variables. Visual also exposes explicit ownership
  metadata for visible daily-editing controls so Playwright evidence is no
  longer an empty-path smoke; highlight-only ownership paths are covered by the
  focused editor-wave suite because the published Playwright fixture uses the
  non-highlight Visual state. Compare payload normalization is now a
  confirm-gated support action rather than an immediate mutation. Focused
  Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/widgets/editorContract.test.ts`
  and Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-compare-timeline-advanced-readonly-2026-05-25.*`
  with `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. The smoke runner now shortens long `playwright-cli`
  session names to avoid false `auth_state_load_failed` results from CLI
  session-name limits.
- In Progress (2026-05-25): twenty-sixth implementation family targets Posts
  Feed Visual raw color and destination authoring drift. Visual color fields
  now use swatch-only controls for `style.backgroundColor`, `style.borderColor`,
  and `style.textColor`, while saved custom CSS/token values remain compatible
  as replace-or-clear state. Fresh Posts Feed defaults no longer seed CSS
  variable color values, so new widgets inherit theme colors instead of
  presenting false saved-custom colors. `pagination.viewAllHref` now uses the
  shared page-first destination picker in Visual, with legacy custom/external
  values preserved as replace-or-clear state and the empty state falling back to
  the configured posts list route. The previous read-only `source.contentType`
  metadata path was removed because it is not schema-owned; the visible
  "Content type: Posts" setup summary remains pathless. Focused Vitest and Bun
  evidence passes
  `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
  and `bun test tests/unit/widgets/postsFeedWidget.test.tsx`. Targeted
  Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-posts-feed-source-color-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Claude review after implementation found no high blockers
  and only requested doc/test tightening; a fresh helper-agent audit found the
  current metadata drift, stale `source.contentType` path, and stale Wizard
  lifecycle docs, all fixed before final validation.
- In Progress (2026-05-25): twenty-seventh implementation family returns to
  Footer to close the remaining Advanced/layout and color-authoring drift.
  Footer-specific layout controls (`layout.align`, `layout.legalAlign`,
  `layout.maxWidth`, `layout.columnGap`, `layout.paddingX`,
  `layout.columnBreakpoint`, and `layout.sectionPaddingY`) now live in Visual
  `Layout and spacing`, while Advanced renders read-only runtime, layout,
  style, and support diagnostics only. Footer Visual color fields now use
  swatch-only controls with clear actions instead of raw CSS/token text inputs;
  saved legacy custom values remain replace-or-clear compatible, and fresh
  defaults no longer seed CSS variable surface/border colors. Footer Visual
  sections now emit explicit `WidgetEditorSection` metadata, and visible
  controls/actions emit ownership metadata so Playwright no longer relies on
  an empty-path smoke. The temporary Wizard/Visual duplicate allowances now
  point at `TASK-336-19` instead of the closed `TASK-336-16`; this records that
  the overlap is a setup-only compatibility allowance until the shared contract
  gains first-class setup-only duplicate semantics. Claude and a fresh
  helper-agent audit both identified writable
  Advanced layout controls as the high-priority blocker; the current slice
  accepts that finding and rejects keeping layout in Advanced because it
  duplicates the Visual daily-editing contract. Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-footer-visual-advanced-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0` after clearing the stale Vite optimized dependency cache and
  restarting `coderso-dev-core-host`.
- In Progress (2026-05-25): twenty-eighth implementation family targets Toggle
  Block Advanced and color-authoring drift. Accessibility announcement fields
  (`labels.ariaLabel`, `labels.selectedSuffix`) and per-pane card styling now
  live in Visual, matching the declared `toggle-block.visual.structure-copy`
  and `toggle-block.visual.theme-panes` ownership. Advanced no longer receives
  `onChange`; it renders read-only runtime, style, and support summaries only,
  with no inputs, selects, buttons, reset action, or raw JSON payload preview.
  Toggle Block Visual colors are now swatch-only, and fresh root color defaults
  no longer seed CSS variable strings into persisted data; runtime keeps theme
  fallbacks when colors are omitted. The temporary Wizard/Visual duplicate
  allowances now point at the open `TASK-336` umbrella instead of the closed
  `TASK-336-16`.
  Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-toggle-block-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. Fresh post-implementation helper-agent and Claude reviews
  found only section metadata and docs/contract-section alignment drift; those
  findings were fixed before the final targeted Vitest, Playwright, lint,
  typecheck, and `gates:coderso` reruns.
- In Progress (2026-05-25): twenty-ninth implementation family targets Entry
  Teaser source/presentation ownership, custom destination authoring, and
  Advanced diagnostics drift. Wizard is now source setup only and no longer
  writes `variant`; Visual owns variant, content fields, tag density, media,
  layout, style, fallback copy, and CTA behavior. Visual custom CTA authoring
  uses the shared page-first `LinkDestinationField`, preserving saved custom,
  hash, and external hrefs as replace-or-clear compatibility state. Visual
  surface/border colors are swatch-only, saved custom CSS/token colors remain
  replace-or-clear compatible, and fresh defaults no longer persist CSS
  variable strings for `style.surface`/`style.border`. Advanced no longer
  receives `onChange`; it renders read-only source, presentation, and runtime
  summary rows only, with no editable inputs/selects/textareas or raw preview
  JSON. CTA/fallback copy now has bounded editor and normalizer limits. A fresh
  helper-agent audit and Claude read-only audit both identified the stale
  writable Advanced layout/style block, raw URL field, raw color text field,
  and stale Wizard/Visual duplicate allowance as the primary drifts; those
  findings are implemented in this slice. Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx tests/vitest/widgets/entryTeaser.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Focused Bun evidence passes
  `bun test tests/unit/widgets/entryTeaser.test.tsx tests/integration/routes/entryTeaserPreview.test.ts tests/integration/routes/widgets.test.ts`.
  `bun --cwd core lint` and `bun --cwd core lint:types` pass. Targeted
  Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-entry-teaser-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`; the rerun after ownership metadata hardening shows Visual
  writable paths for variant, headings, field toggles, media, layout, style,
  CTA, and fallback while Advanced stays empty. `bun run gates:coderso`
  passes after the final metadata patch. Fresh post-implementation helper-agent
  review found a medium metadata coverage gap and no high issues; the metadata
  gap was fixed and the agent was closed. Final Claude read-only UI/UX review
  returned PASS with only a low informational note that Playwright validates
  the daily Visual/Advanced path while Wizard source-only ownership remains
  covered by focused Vitest/source review.
- In Progress (2026-05-25): next family targets `testimonials` editor-mode
  drift. Advanced no longer receives `onChange` and now renders read-only
  runtime/display/content-health summaries only. Load-more pagination moved to
  Visual, color authoring is swatch-only without raw CSS token text boxes, rich
  quote copy no longer says HTML, fresh defaults no longer persist
  `var(--color-*)` style strings, and Wizard/Visual duplicate allowances now
  target the umbrella `TASK-336` one-time starter social-proof setup fields.
  Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx tests/vitest/widgets/testimonials.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Focused smoke-helper evidence passes
  `bun test tests/unit/playwright-widget-contract-smoke.test.ts` after the
  duplicate detector was corrected to compare path ownership across modes, not
  repeated controls inside the same mode.
  Pre-implementation fresh helper-agent audit found writable Advanced controls,
  undeclared Wizard fields, raw CSS color text inputs, stale duplicate
  allowance task IDs, and incomplete Playwright ownership metadata; Claude
  read-only review agreed Advanced pagination/import/export/normalization was
  the main blocker and recommended moving pagination to Visual. Post-follow-up
  agent audit found one medium mismatch where Visual reorder metadata used the
  broad `testimonials` path while the source contract omitted it; this was
  fixed by making `testimonials` Visual-owned and removing the broad Wizard
  owner. A final fresh helper-agent audit returned no findings, and Claude
  read-only UI/UX review returned PASS. Targeted Playwright strict smoke is
  stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-testimonials-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. `bun --cwd core lint` and
  `bun --cwd core lint:types` pass after the final ownership correction.
  `bun run gates:coderso` passes with functional, UX, performance, security,
  and reliability gates green.
- In Progress (2026-05-25): next family targets `section` editor-mode drift.
  Wizard is now one-time setup only for starter variant and heading copy, with
  surface and spacing deferred to Visual. Visual color authoring is swatch-only
  and preserves saved custom CSS/token colors as replace-or-clear state instead
  of raw text input. Background image/video and poster authoring now use Media
  Library pickers; saved external media remains runtime-compatible as
  read-only replace-or-clear compatibility state. Visual `Section link and
  accessibility` replaces raw "Anchor ID" wording with beginner-facing link
  and accessibility labels while still sanitizing the stored anchor. Advanced
  no longer receives `onChange`, hidden inputs, buttons, or raw JSON snapshots
  and now renders read-only layout, surface, semantics, heading, media, and
  visual-effect summaries. Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/section.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  `bun --cwd core lint` and `bun --cwd core lint:types` pass. Claude
  post-implementation review returned PASS. A fresh helper-agent audit found
  Visual preset contract, media affected-path metadata, sparse media source,
  docs/changelog, and Wizard preset-copy follow-ups; those findings were fixed
  before final Playwright rerun. Completed fixture smoke intentionally validates
  only `Visual` and `Advanced` because `TASK-336-16` hides Wizard from daily
  tabs after setup completion; the Section Wizard remains covered by the
  exported editor contract and one-time lifecycle tests. Targeted Playwright
  mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-section-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
  and `bun run gates:coderso` pass. A final fresh helper-agent audit found no
  high findings; the remaining medium findings around Wizard preset truthfulness,
  Wizard preset metadata, stale report evidence, validation notes, and Wizard
  setup copy were fixed.
- In Progress (2026-05-25): next family targets `grid-columns` editor-mode
  drift. Wizard is now one-time setup only for the starter layout variant and
  no longer owns labels, count, presets, spans, spacing, surface, color, or
  per-column behavior. Visual is the daily owner for variant, alignment,
  responsive widths, visibility, content-area labels/count guidance,
  same-count presets, spacing, cardized surfaces, swatch-only color
  replacement, and per-column overrides. Advanced no longer receives
  `onChange`; it renders read-only layout, column override, and content-area
  diagnostics only, without inputs/selects/buttons, hidden mutating controls,
  raw JSON, or visible `var(...)` token strings for nontechnical authors. A
  fresh helper-agent audit found hidden fake metadata, undeclared Visual
  variant side effects, raw Advanced token copy, and stale docs; those findings
  were fixed before validation. A final fresh audit then found coarse Visual
  metadata, `XL`/`2XL` option jargon, raw Advanced surface token summaries, and
  stale report wording; those findings were also fixed. A fresh follow-up audit
  then found raw Advanced variant/alignment/gap token labels, which were mapped
  to user-facing variant, vertical-alignment, and spacing summaries before the
  final reruns.
  Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-grid-columns-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0` after clearing the stale Vite optimized dependency cache and
  restarting `coderso-dev-core-host`.
- In Progress (2026-05-25): next family targets `template-section`
  editor-mode and runtime drift. Wizard remains one-time template setup, Visual
  owns daily presentation metadata only, and Advanced now renders read-only
  human summaries instead of raw template ids, resolver error codes, or JSON
  payload previews. Template selection/clear now explicitly drops stale
  `resolved` payloads, and runtime prioritizes resolver errors over stale
  `resolved.blocks` so draft/missing/looped templates render safe placeholders.
  A fresh helper-agent audit found stale resolved-payload retention, raw
  Advanced diagnostics, error-with-blocks runtime rendering, stale `.tmp`
  evidence, and stale docs; those findings are fixed. Focused Vitest evidence
  passes
  `bun run test:vitest -- tests/vitest/ui/template-section-editor-wave.test.tsx tests/vitest/widgets/templateSection.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-template-section-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- In Progress (2026-05-25): next family targets `split-layout`
  Wizard/Visual/Advanced drift. Wizard is now one-time starter split setup
  only and no longer edits phone behavior or pane spacing. Visual emits
  explicit ownership metadata for the real daily controls: base layout,
  desktop/tablet ratios, phone layout, phone split when visible, phone order,
  pane spacing, and content-height alignment. Advanced no longer renders raw
  developer-facing saved-data snapshots, implementation labels, or developer
  copy; it shows read-only human summaries for device layout, phone order,
  spacing, and alignment. Fresh helper-agent audits found the false Wizard
  contract, missing control-path metadata, developer-facing Advanced output,
  and stale docs; those findings are fixed. Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx tests/vitest/widgets/splitLayout.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-split-layout-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- In Progress (2026-05-25): next family returns to `tabs` to close residual
  Visual color, Advanced diagnostics, public overflow, and repeatable contract
  path drift. Visual color controls now use swatch-only authoring instead of
  raw CSS/token text fields. Advanced no longer exposes raw normalized JSON,
  technical IDs, trigger/panel suffixes, or raw token values; it renders
  read-only behavior, saved-tabs, display, and contract summaries. Tabs no
  longer expose the unapproved horizontal-scroll option and saved legacy
  `triggerOverflow: "scroll"` normalizes to wrapping so public runtime stays
  within the shared overflow contract. The editor contract validator now
  accepts safe wildcard path segments such as `items.*.label`, and Tabs uses
  those paths for repeatable item ownership. Focused Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx tests/vitest/widgets/tabs.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Fresh post-implementation agent review found a shared page-builder shell
  blocker: `AdvancedPanel` still appended writable block layout and visibility
  controls that the Tabs editor itself did not own. That blocker is fixed by
  moving shared `layout.*` and `visibility.devices.*` controls into Visual with
  explicit ownership metadata and rendering only read-only layout/visibility
  summaries in Advanced.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-tabs-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- In Progress (2026-05-25): next family targets Accordion residual drift found
  by fresh helper-agent and Claude read-only reviews. Accordion Visual no
  longer rewrites Wizard-owned `options.defaultOpenIds` when changing open
  mode, preserving intentional all-collapsed one-time setup. Accordion Visual
  colors now use swatch-only controls with replace/clear saved custom state
  instead of visible raw CSS/token value inputs. Accordion Advanced renders
  behavior, saved item, and saved display summaries only, removing raw JSON
  payload and technical DOM id suffix diagnostics from the normal editor
  surface. Fresh helper-agent post-review also found that the Visual default
  open summary still displayed raw item IDs; it now resolves saved item titles
  instead. Focused Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-accordion-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso` pass for this slice.
- In Progress (2026-05-25): Spacer residual drift is superseded under this
  task. Fresh helper-agent read-only review found that Advanced still exposed
  hidden writable height controls and a raw JSON payload snapshot, while
  Wizard/Visual metadata under-reported real writable paths. Spacer Advanced is
  now a read-only runtime/support summary with no raw payload snapshot or
  hidden mutators. Wizard and Visual controls now expose truthful
  `WidgetControlRow` ownership metadata, and beginner-facing height controls
  show friendly rhythm labels or saved-custom compatibility state instead of
  CSS length examples. Because the shared `TokenOrPixelField` wording changed,
  the Divider editor wave is included in this slice's regression evidence to
  prove the shared copy stays generic outside Spacer. Targeted Vitest evidence
  currently passes
  `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/spacer.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/divider.test.tsx`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-spacer-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. `bun test tests/unit/playwright-widget-contract-smoke.test.ts`,
  `git diff --check`, `jq empty _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-spacer-advanced-readonly-2026-05-25.json`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso` pass for this slice.
- In Progress (2026-05-25): Divider residual drift is superseded under this
  task. Fresh helper-agent read-only review found that Advanced still exposed
  hidden writable editor groups, raw JSON payload diagnostics, stale section
  names, and incomplete Wizard/Visual control metadata. Divider Wizard is now
  narrowed to one-time style/label setup, Visual owns daily line/width/color
  and spacing controls, and Advanced renders read-only runtime/support
  summaries without raw payload snapshots or hidden mutators. Beginner-facing
  width, spacing, thickness, and opacity controls use friendly labels or
  saved-custom compatibility state instead of raw CSS/token values. Targeted
  Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-divider-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. `bun test tests/unit/playwright-widget-contract-smoke.test.ts`,
  `git diff --check`,
  `jq empty _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-divider-advanced-readonly-2026-05-25.json`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso` pass for this slice.
- In Progress (2026-05-25): Stack residual drift is superseded under this
  task. Fresh helper-agent and Claude read-only UX reviews found that Wizard
  still exposed daily responsive layout controls, Advanced still rendered
  hidden writable direction/gap/axis controls plus a raw JSON payload snapshot,
  and the editor contract did not match real Visual sections. Stack Wizard is
  now narrowed to one-time preset setup plus slot guidance, Visual owns daily
  responsive flow, spacing, alignment, distribution, and wrapping controls with
  truthful `WidgetControlRow` metadata, and Advanced renders read-only runtime
  stack/support summaries without raw payload snapshots or hidden mutators.
  Beginner-facing labels replace raw gap/token and row/column authoring copy in
  normal editor controls. Targeted Vitest evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/widgets/stack.test.tsx tests/vitest/widgets/editorContract.test.ts`.
  Targeted Playwright strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-stack-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0` after restarting `coderso-dev-core-host` twice to refresh
  the admin bundle. Because existing Stack fixtures are post-setup and the
  standard smoke only covers Visual/Advanced, a focused Playwright `Run setup
  again` Wizard probe is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-stack-wizard-2026-05-25.*`
  and reports one visible Wizard root, one writable preset control, no metadata
  gaps, preset side-effect copy present, and no raw payload output.
  `bun test tests/unit/playwright-widget-contract-smoke.test.ts`,
  `git diff --check`,
  `jq empty _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-stack-advanced-readonly-2026-05-25.json`,
  `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run gates:coderso` pass for this slice.
- In Progress (2026-05-25): Content List residual drift is superseded under
  this task. Fresh helper-agent and Claude read-only UX reviews found that
  Advanced still rendered a raw JSON runtime snapshot, Visual still asked for
  a raw `View all` path, helper search inputs claimed persisted paths, and
  Wizard/Visual controls lacked complete truthful metadata. Content List now
  keeps Wizard as source setup, Visual as daily filters/presentation/pagination
  authoring, and Advanced as read-only human runtime/support summaries without
  raw JSON, internal IDs, raw CSS/token inputs, or raw path guidance. Visual
  `View all` uses the shared page-first `LinkDestinationField`, color controls
  remain swatch-only, helper search rows are preview-only, and picker button
  groups are programmatically associated with their control rows. Targeted
  Vitest/Bun evidence currently passes
  `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/widgets/listingRuntimeScript.test.ts`
  and `bun test tests/unit/widgets/contentList.test.tsx`. Targeted Playwright
  strict smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-content-list-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0` after restarting `coderso-dev-core-host` twice to refresh
  the admin bundle. A focused Playwright probe stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-content-list-focused-2026-05-25.*`
  opens Wizard via `Run setup again` and conditionally reveals Visual
  `View all page`, reporting `wizardPassed=true`, `viewAllPassed=true`,
  missing metadata `0`, and raw path inputs `0`. Claude final read-only audit
  returned `PASS`; helper-agent final audit found no blocking code drift and
  the focused probe closes its artifact-coverage note.
- In Progress (2026-05-25): Search Box residual drift is superseded under this
  task after fresh helper-agent audit found no blocking code drift in the new
  direction but required stronger compatibility tests and stored Playwright
  evidence before closure. Search Box now keeps Wizard source setup
  beginner-safe by removing raw endpoint/query-param text fields, uses the
  shared page-first destination picker for route-submit results pages, keeps
  legacy custom provider/query values support-owned without displaying raw
  values to ordinary authors, converts Visual color controls to swatch-only
  controls, and replaces the Advanced raw runtime payload textarea with human
  read-only runtime/source summaries. Targeted Vitest evidence currently
  passes `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/editorContract.test.ts`
  with 30/30 tests, including legacy provider/query preservation without raw
  author fields. Strict Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-search-box-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. A focused Playwright probe stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-search-box-focused-2026-05-25.*`
  opens Wizard via `Run setup again`, switches through Listing, Global, and
  Route-submit setup, reports `wizardPassed=true`, missing metadata `0`, raw
  endpoint/query/CSS inputs `0`, and route-submit page picker `1`. Claude
  read-only review is pending retry because the local Claude session limit was
  reached before reset.
- In Progress (2026-05-25): Listing Filters residual drift is superseded under
  this task after helper-agent audit flagged raw Advanced JSON payload, Visual
  CSS/token inputs, Wizard raw facet IDs/field paths/option values/sort values,
  stale tests, and missing TASK-336-19 Playwright evidence. Listing Filters now
  generates support keys instead of asking authors for facet IDs, uses listing
  query field pickers for facet and sort field bindings, generates sort keys
  from field/direction, keeps option data-match values and taxonomy hierarchy
  keys support-owned, converts Visual surface colors to swatch-only controls,
  and replaces the Advanced raw runtime payload textarea with human source,
  runtime, and metric summaries. Targeted Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/listingRuntimeScript.test.ts`
  with 47/47 tests. Claude read-only UX review found no high blockers and
  flagged two medium follow-ups, both fixed before closure: legacy
  support-owned custom field bindings can no longer be cleared through the
  placeholder, and the sort empty state no longer mentions pipe-delimited config
  lines. Strict Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-listing-filters-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. A focused Playwright probe stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-listing-filters-focused-2026-05-25.*`
  opens Wizard via `Run setup again`, reports `wizardPassed=true`, missing
  metadata `0`, raw technical inputs `0`, and no support-owned option/value
  paths writable in Wizard.
- In Progress (2026-05-25): Product Table residual drift is superseded under
  this task after helper-agent and Claude audits flagged false-empty writable
  metadata, raw Advanced query JSON, missing Wizard preview-section metadata,
  and missing TASK-336-19 Playwright evidence. Shared commerce controls and
  Product Table controls now emit `data-widget-control-path` for source,
  layout/style, columns, labels, visitor controls, export, links, empty state,
  and surfaces. Wizard preview status is wrapped in the declared
  `product-table.wizard.preview-summary` section, Visual preview status is an
  explicit diagnostics section, and Advanced replaces raw query JSON with
  human source/runtime summaries. Targeted Vitest evidence passes
  `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/editorContract.test.ts`
  with 46/46 tests. Strict Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-product-table-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. A focused Playwright probe stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-product-table-focused-2026-05-25.*`
  opens Wizard via `Run setup again`, reports `wizardPassed=true`, missing
  metadata `0`, raw technical inputs `0`, and all source writable paths
  present.
- In Progress (2026-05-25): Form Embed residual drift is superseded under this
  task after helper-agent and Claude audits flagged Visual raw CSS/token color
  inputs, Advanced normalized payload JSON, technical diagnostics copy, stale
  tests that blessed the drift, and missing TASK-336-19 Playwright evidence.
  Form Embed now keeps Wizard as one-time form selection and setup summary,
  Visual as daily copy/layout/field/navigation/submit authoring with swatch-only
  color controls and an author-facing `Form preview` summary, and Advanced as
  read-only runtime, submission-security, authoring, and contract summaries
  without normalized JSON, raw endpoints, raw form IDs, nonce values, public
  site keys, API-scope copy, or raw CSS/token inputs. Targeted Vitest evidence
  passes `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/editorContract.test.ts`
  with 41/41 tests. Strict Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-form-embed-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`. A focused Playwright probe stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-form-embed-focused-2026-05-25.*`
  inspects Visual, Advanced, and `Run setup again` Wizard, reporting
  `passed=true`, Visual style raw inputs `0`, Advanced writable paths `0`,
  Advanced raw technical controls `0`, and Wizard writable paths limited to
  `formId`.

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
