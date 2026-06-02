# Sesja audytu widgetow UI — 31-05-2026

## Cel

UI-first retest wszystkich 38 page-builder widgetow po zamknieciu TASK-343:
realne klikanie opcji w adminie, sprawdzanie efektu w podgladzie/froncie,
a dopiero potem audyt kodu dla kontrolek niedzialajacych, inertnych albo
mylacych.

## Srodowisko

- Admin: `http://localhost:5173/admin`
- Public runtime: `http://localhost:3000`
- Helper: `coderso-dev-core-host`
- Data: 2026-05-31
- Auth state lokalny: `.tmp/codex-31-05-auth-state.json` (niecommitowany)

## Przygotowanie fixture pages

Utworzono i opublikowano 38 swiezych stron audytowych:

- `/audit-31-05-section`
- `/audit-31-05-template-section`
- `/audit-31-05-grid-columns`
- `/audit-31-05-split-layout`
- `/audit-31-05-tabs`
- `/audit-31-05-accordion`
- `/audit-31-05-toggle-block`
- `/audit-31-05-spacer`
- `/audit-31-05-divider`
- `/audit-31-05-stack`
- `/audit-31-05-hero`
- `/audit-31-05-feature-grid`
- `/audit-31-05-testimonials`
- `/audit-31-05-pricing-plans`
- `/audit-31-05-faq-accordion`
- `/audit-31-05-cta-banner`
- `/audit-31-05-logo-cloud`
- `/audit-31-05-gallery-mosaic`
- `/audit-31-05-stats-kpi`
- `/audit-31-05-team`
- `/audit-31-05-rich-text-section`
- `/audit-31-05-content-list`
- `/audit-31-05-posts-feed`
- `/audit-31-05-entry-teaser`
- `/audit-31-05-product-gallery`
- `/audit-31-05-product-compare`
- `/audit-31-05-product-table`
- `/audit-31-05-listing-filters`
- `/audit-31-05-search-box`
- `/audit-31-05-timeline`
- `/audit-31-05-compare-timeline`
- `/audit-31-05-newsletter`
- `/audit-31-05-booking-calendar`
- `/audit-31-05-appointment-form`
- `/audit-31-05-form-embed`
- `/audit-31-05-contact`
- `/audit-31-05-navigation`
- `/audit-31-05-footer`

## Claude status

Attempted non-interactive Claude run for the first UI batch failed before any
browser work:

- Command mode: `claude -p --permission-mode bypassPermissions`
- Result: `401 Invalid authentication credentials`

After local Claude authentication was repaired on 2026-06-01, the audit uses
Claude as a read-only cross-check for remaining widget reports. Earlier reports
before that point remain based on `playwright-cli` plus Codex code review.

## Baseline smoke notes

- Dry-run inventory: `38/38` widgets selected.
- Admin smoke against legacy inventory pages: `adminFailures=0`,
  `metadataGaps=0`.
- Public smoke against legacy inventory paths was not useful in this helper
  topology and returned fixture gaps. Direct public checks against the new
  `/audit-31-05-*` pages return HTTP 200.

## Current reports

- `REPORT_SECTION_WIDGET.md` — completed Wizard / Visual / Advanced UI pass and
  public runtime pass with default, bleed, contained/div, invalid-payload and
  unsafe-string fixtures; heading, anchors, div/section semantics, layout,
  regions, background media, overlays, sticky-safe wrapper split and read-only
  Advanced work, with findings for unsafe style strings leaking to inline CSS,
  admin save/publish accepting invalid widget payloads, and incomplete metadata
  on shared region controls.
- `REPORT_TEMPLATE_SECTION_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass and public runtime pass with published, unresolved, missing, invalid-id,
  draft, empty and loop fixtures; runtime resolution, placeholders, stale
  resolved-block suppression, Visual metadata ownership and read-only Advanced
  diagnostics work, with findings for non-UUID `templateId` causing public HTTP
  500 and loop self-reference markers reporting an outer `ready` state.
- `REPORT_GRID_COLUMNS_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass and public runtime pass with default, rich asymmetric, masonry-lite,
  over-12 totals and unsafe fixtures; live slot truthfulness, responsive spans,
  XL/2XL widths, visibility, reverse phone order, gaps, cardized surfaces,
  per-column overrides, no-auto-balance behavior and read-only Advanced work,
  with one finding for incomplete metadata on working action controls
  (`Reapply asymmetric desktop widths` and shared Structure `Add Column`).
- `REPORT_SPLIT_LAYOUT_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass and public runtime pass with default, rich keep, stacked phone,
  legacy-zero-gap and invalid-payload fixtures; variant cards, ratio
  preservation, phone keep/stack behavior, reverse order, gap labels,
  fixed-pane rendering, empty-pane gating and read-only Advanced work, with
  findings for misleading phone ratio summary in stacked mode and shared
  Structure showing disabled move actions for fixed panes.
- `REPORT_TABS_WIDGET.md` — completed Wizard / Visual / Advanced UI pass and
  public runtime pass with default, rich vertical, all-disabled, empty-panel,
  unsafe-style and invalid-payload fixtures; public click/keyboard activation,
  disabled fallback, legacy overflow normalization, placeholder gating,
  read-only Advanced and Visual ownership work, with findings for unsafe
  imported style strings leaking to inline CSS and incomplete shared Structure
  action metadata for repeatable panels.
- `REPORT_ACCORDION_WIDGET.md` — completed Wizard / Visual / Advanced UI pass
  and public runtime pass with default, rich multiple, custom-id default,
  locked-open, all-collapsed, unsafe-style and invalid-payload fixtures; public
  details/ARIA sync, multiple/single/collapsible behavior, Wizard slot-count
  truthfulness, Visual ownership and read-only Advanced work, with findings for
  custom item ids losing default-open state in public runtime, unsafe imported
  style strings leaking to inline CSS, and incomplete shared Structure action
  metadata for repeatable items.
- `REPORT_TOGGLE_BLOCK_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass and public runtime pass with default, rich two-instance, empty-pane,
  unsafe-style and invalid-payload fixtures; click/keyboard switching, roving
  tab index, ARIA/status sync, runtime script dedupe, fixed two-pane Structure,
  mobile overflow, Visual ownership and read-only Advanced diagnostics work,
  with one finding for unsafe imported style strings leaking to public inline
  CSS.
- `REPORT_SPACER_WIDGET.md` — completed Wizard / Visual / Advanced UI pass and
  public runtime pass with responsive, fixed, no-guide, unsafe-length and
  invalid-variant fixtures; rhythm presets, desktop/tablet/mobile height
  markers, breakpoint measurements, editor guide gating, safe custom length
  compatibility, unsafe length fallback, Visual ownership and read-only
  Advanced diagnostics work, with no new functional findings.
- `REPORT_DIVIDER_WIDGET.md` — completed Wizard / Visual / Advanced UI pass and
  public runtime pass with label-center, line, dotted custom, spacer-only,
  unsafe-style and invalid-variant fixtures; variants, label controls, line
  style, width/alignment, opacity, spacing, breakpoint overflow, Visual
  ownership and read-only Advanced diagnostics work, with one Claude-confirmed
  finding for unsafe imported `color` and `labelColor` strings leaking to public
  inline CSS.
- `REPORT_STACK_WIDGET.md` — completed Wizard / Visual / Advanced UI pass and
  public runtime pass with rich responsive, empty, legacy-scalar, CSS-probe,
  invalid-variant and invalid-data fixtures; variant cards, responsive
  direction/gap/axis/wrap, row-flow child wrappers, empty placeholder, current
  responsive CSS and read-only Advanced diagnostics work, with one
  Claude-confirmed finding for non-vertical variants losing their direction
  preset when imported non-empty data omits `direction`.
- `REPORT_HERO_WIDGET.md` — started; UI-first partial pass with one confirmed
  CTA-layout behavior issue and code owner notes.
- `REPORT_FEATURE_GRID_WIDGET.md` — completed main UI option pass; one
  Advanced color-summary wording bug found and mapped to code owner.
- `REPORT_CTA_BANNER_WIDGET.md` — completed main UI option pass; one Advanced
  background-gradient diagnostics gap found and mapped to code owner.
- `REPORT_FAQ_ACCORDION_WIDGET.md` — completed main UI option pass; public
  `aria-expanded` sync works, admin preview disclosure a11y sync gap recorded.
- `REPORT_STATS_KPI_WIDGET.md` — completed main UI option pass; no product
  defect found, one optional UX note for metric accent color overriding global
  value color.
- `REPORT_TESTIMONIALS_WIDGET.md` — completed main UI option pass; confirmed
  rich quote clear bug where `<br>` keeps HTML mode and hides plain quote
  fallback.
- `REPORT_PRICING_PLANS_WIDGET.md` — completed main UI option pass; no hard
  product defect found, with billing documented as a static public status rather
  than a visitor-side toggle.
- `REPORT_LOGO_CLOUD_WIDGET.md` — completed main UI option pass; no hard product
  defect found. TASK-378 added deterministic Logo Cloud media seeding plus a
  smoke `mediaProof` that selects the seeded asset through MediaPicker,
  publishes the fixture, and verifies public `<img>` alt/grayscale/hover output
  when the live Playwright environment is available.
- `REPORT_GALLERY_MOSAIC_WIDGET.md` — completed main UI option pass. TASK-379
  closed the Advanced lightbox eligibility summary, per-item Remove dialog, and
  deterministic media/public-lightbox smoke gaps.
- `REPORT_TEAM_WIDGET.md` — completed main UI option pass. TASK-380 closed the
  member-count native confirm UX debt and deterministic Team photo MediaPicker
  smoke gap.
- `REPORT_RICH_TEXT_SECTION_WIDGET.md` — completed main UI option pass. TASK-381
  closed the Advanced sanitizer diagnostics loss, pristine default
  HTML-vs-block drift, and deterministic image/document plus paste/link
  sanitizer smoke fixture gaps.
- `REPORT_CONTENT_LIST_WIDGET.md` — completed Wizard / Visual / Advanced UI pass;
  found one hidden-state issue where `filters.taxonomy` survives `legacy ->
  listing` even though listing mode hides legacy filters and Advanced still
  reports the stale taxonomy.
- `REPORT_POSTS_FEED_WIDGET.md` — completed Wizard / Visual / Advanced UI pass;
  found one Advanced diagnostics issue where an inactive category filter is
  reported as active after switching from Category/tag filter back to Latest
  posts.
- `REPORT_ENTRY_TEASER_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass; no hard widget-owned defect found. TASK-384 closed the populated
  fixture gap by bootstrapping content type, manual/featured/fallback entries,
  detail route, listing queries/templates, audited page data, and console-error
  proof into the widget smoke harness.
- `REPORT_PRODUCT_GALLERY_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass; renderer/source/link states work. TASK-385 closed the Advanced
  diagnostics issue for inactive manual selections and added deterministic
  media/card-link/view-all Product Gallery smoke proof.
- `REPORT_PRODUCT_COMPARE_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass; renderer/query/manual-selection behavior works. TASK-386 closed the
  Advanced selected-products diagnostics issue and added deterministic Product
  Compare image/title-link/CTA smoke fixture proof.
- `REPORT_PRODUCT_TABLE_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass; renderer/source/public controls/export behavior works. TASK-387 closed
  the saved-vs-visible visitor filter diagnostics issue and added deterministic
  Product Table image/title-link/action smoke fixture proof.
- `REPORT_LISTING_FILTERS_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass using a temporary listing query; renderer/facet/layout behavior works.
  TASK-388 closed the Visual truthfulness issue by marking saved Action
  background inactive while Auto apply hides the manual action button.
- `REPORT_SEARCH_BOX_WIDGET.md` — completed Wizard / Visual / Advanced UI pass
  using a temporary listing query; listing/global/route-submit runtime shells
  and controls work. TASK-389 closed the Advanced diagnostics issue by showing
  active routing per mode and reserving route-submit rows for route-submit mode.
- `REPORT_TIMELINE_WIDGET.md` — completed Wizard / Visual / Advanced UI pass;
  baseline axis/process/alternating rendering, step editing, guides, markers,
  colors, typography, width diagnostics and Advanced summaries work. TASK-390
  closed hidden process/compact CTA links, incomplete Visual control metadata,
  and process-mode variant card truthfulness.
- `REPORT_COMPARE_TIMELINE_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass; variant switching, axis/track editing, segment links/ranges, guides,
  colors, clear states, marker shape, layout/order/motion, Advanced read-only
  and public SSR baseline work. TASK-391 closed misleading label-size copy by
  treating `none` as inherited/no explicit size, applied step label sizing to
  axis rows, and made Advanced mark saved highlight targets dormant in
  `dual-track`.
- `REPORT_NEWSLETTER_WIDGET.md` — completed Wizard / Visual / Advanced UI pass;
  static disconnected shell, variants, copy, semantic fields, consent, double
  opt-in, state copy, colors, spacing and public SSR baseline work. TASK-392
  closed Forms runtime admin preview field projection, inactive legacy webhook
  diagnostics, public Forms runtime nonce gating, and read-only variant cards
  without `onVariantChange`.
- `REPORT_BOOKING_CALENDAR_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass with an active booking fixture; flow, interval, defaults, date policy,
  variants, copy, service context, locale, interval mode, colors, Advanced
  diagnostics and public slot runtime work. TASK-393 closed runtime
  `innerHTML` copy injection risk, bounded week date duplication, empty
  tokenless admin week shell behavior, and admin/public preview catalog parity
  drift.
- `REPORT_APPOINTMENT_FORM_WIDGET.md` — completed Wizard / Visual / Advanced UI
  pass with an active booking fixture; pairing, variants, locale, redirect
  picker, copy, split name, required fields, phone presets, notes, custom
  fields, consent, colors, Advanced diagnostics and public submit runtime work,
  and TASK-394 closed public calendar/form binding order, public API
  server-generated slot trust, mixed public/internal CAPTCHA scoping, widget
  success-copy precedence, and client/API field-bound drift.
- `REPORT_FORM_EMBED_WIDGET.md` — completed Wizard / Visual / Advanced UI pass
  with a multi-step public form fixture; selection diagnostics, copy/layout/style
  controls, read-only Advanced, public field rendering, progress, conditional
  logic, save-progress and duplicate/internal runtime probes worked far enough to
  expose the TASK-395 finding set. TASK-395 closed public submit route
  mounting, duplicate-widget binding, internal-only public rendering, checkbox
  payload mismatch, saved-progress step drift, overloaded field `step`,
  success/redirect policy, runtime nonce persistence risk, and static admin
  canvas ambiguity.
- `REPORT_CONTACT_WIDGET.md` — completed Wizard / Visual / Advanced UI pass with
  public/internal Forms fixtures; static fallback, minimal layout, semantic
  contact links, social links, map/fallback rendering, read-only Wizard/Advanced,
  and public Forms runtime hydration work far enough to expose findings for
  missing public submit route mounting, stuck submit label after failure,
  duplicate-widget binding, missing Contact CAPTCHA projection, static admin
  canvas hydration, misleading configured/effective runtime metadata, legacy map
  and social URL permissiveness, and incomplete Visual path metadata outside the
  recently fixed style rows. TASK-396 closed the full finding set with shared
  Forms submit dispatch, runtime label/CAPTCHA projection, explicit boundary
  metadata, safe URL/CSS policy, and complete Visual metadata coverage.
- `REPORT_NAVIGATION_WIDGET.md` — completed Wizard / Visual / Advanced UI pass
  and public runtime pass with rich/drawer/minimal/double/empty/unsafe fixtures;
  linked logo, submenu, drawer, metadata, target/rel, image fallback, multiple
  instances, active state, collapse data toggles and read-only diagnostics work,
  with findings for empty-link public schema mismatch, unsafe-href resolver
  drift to `#`, drawer `aria-current` clone semantics, incomplete Visual path
  metadata, public `data-menu-key`, and unbounded persisted color strings.
  TASK-397 closed the finding set with static-safe empty links, fail-closed
  hrefs, truthful drawer clone semantics, redacted public metadata, Visual path
  coverage, and bounded colors.
- `REPORT_FOOTER_WIDGET.md` — completed Wizard / Visual / Advanced UI pass and
  public runtime pass with columns/minimal/unsafe fixtures; columns, legal,
  social icons, contact links, back-to-top, style/layout tokens, brand landmark
  semantics and read-only Advanced work, with findings for minimal utility
  contact/back-to-top omission, unsafe column links degrading to `#`, raw unsafe
  logo preview in Visual, Wizard variant ownership drift, and imprecise
  slot/destination control metadata. TASK-398 closed the finding set with
  minimal utility rendering, unsafe link/logo fail-closed behavior, Visual-only
  variant ownership, and precise slot/destination metadata.
