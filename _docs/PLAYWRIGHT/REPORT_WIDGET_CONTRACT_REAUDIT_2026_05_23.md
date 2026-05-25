# Widget contract re-audit - 2026-05-23

## Scope

Re-audit of the page-builder widget surface after the first Playwright report
wave and its follow-up task implementation.

- Admin tested through `playwright-cli` at `http://localhost:5173/admin`.
- Public frontend tested through `playwright-cli` at `http://localhost:3000`.
- Registry scope: 38 page-builder widgets from `core/widgets/core/index.ts`
  plus 4 screen-only widgets excluded from this pass.
- Public page coverage found: 35 published widget pages.
- Local screenshot artifacts were written to
  `.tmp/playwright-widget-audit/front-desktop/` and
  `.tmp/playwright-widget-audit/front-mobile/`. These are ignored scratch
  artifacts, not tracked evidence.
- Claude CLI and two helper agents were used as secondary review inputs. Their
  findings were treated as review input, not as executable proof.

No secrets are included in this report.

Admin editor findings below are source-backed static analysis plus partial
Playwright session evidence. Full 38-widget admin traversal was not completed
because current editor tab changes can trigger unsaved-change dialogs.

## Status and Schema of Record

This report is source evidence from the 2026-05-23 re-audit. The executable
contract of record is the `TASK-336` family, especially
`TASK-336-01_Editor_Contract_Type_and_Registry_Validator.md`.

If this report contains illustrative implementation shapes, the TASK-336
contract supersedes them. In particular:

- Use `WidgetEditorSectionRole` values from TASK-336:
  `setup`, `source`, `content`, `visual`, `layout`, `technical`,
  `diagnostics`, and `summary`.
- Use structured duplicate ownership entries:
  `allowedDuplicateWritablePaths: Array<{ path; reason; expiresWithTask }>`
  instead of a boolean duplicate flag.

Report maintenance convention: keep the original audit findings stable as
evidence. TASK-336 implementation waves should append dated status notes or
write a final superseding closure report instead of rewriting source-evidence
sections in place.

## 2026-05-23 TASK-336-03 Smoke Harness Update

The repeatable smoke lane now lives in
`scripts/playwright-widget-contract-smoke.ts`.

Tracked evidence:

- `_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json`
- `_docs/PLAYWRIGHT/widget-contract-smoke-results.json`
- `_docs/PLAYWRIGHT/widget-contract-smoke-results.md`

The harness covers the 38 page-builder widgets, explicitly excludes the four
screen-only widgets, checks each admin mode from a fresh Playwright state, and
records public CSS/fixture status separately from admin contract failures.
Credentials and browser storage state stay in environment variables and
`.tmp/playwright-widget-contract-smoke/` only.

Latest recorded run in `widget-contract-smoke-results.json`:

- 38 widgets selected.
- Admin auth succeeded.
- Admin mode failures: 17 widgets.
- Public CSS failures: 2 widgets: `testimonials`, `team`.
- Fixture gaps: 29 public/admin fixture gaps, including missing standalone
  public fixtures and empty-state-only public pages.
- Metadata gaps: 13 widgets with missing control-path ownership metadata.

## 2026-05-24 TASK-336-04/05 Ownership Update

`template-section` and `search-box` now have explicit v2 editor contracts and
mode-specific ownership:

- `template-section`: Wizard owns template setup, Visual owns presentation
  metadata, and Advanced is read-only resolved-template/runtime diagnostics.
- `search-box`: Wizard owns source/setup, Visual owns visitor copy, interaction,
  and surface, and Advanced is read-only runtime diagnostics/payload.

Targeted admin smoke evidence:

- `template-section`: `adminFailures=0`, `metadataGaps=0`
  (`.tmp/widget-smoke-template-section.json`).
- `search-box`: rerun `adminFailures=0`, `metadataGaps=0`
  (`.tmp/widget-smoke-search-box-rerun.json`).

The standalone public fixture gaps for both widgets remain assigned to
`TASK-336-15` / `TASK-336-17`; this update closes admin ownership only.

## 2026-05-24 TASK-336-06 Ownership Update

`listing-filters` now has an explicit v2 editor contract and no longer mounts
the same facet editor in Wizard, Visual, and Advanced:

- Wizard owns listing query binding plus facet structure/value setup.
- Visual owns daily copy, variant/layout, surface styling, facet labels/order,
  option/sort labels, and presentation modes.
- Advanced is read-only source/facet/runtime diagnostics plus contract summary.

Targeted smoke evidence:

- `listing-filters`: `adminFailures=0`, `metadataGaps=0`, `publicFailures=0`
  (`.tmp/widget-smoke-listing-filters.json`).

## 2026-05-24 TASK-336-07 Ownership Update

`tabs` now has an explicit v2 editor contract and no longer treats Advanced as
Visual plus diagnostics:

- Wizard owns starter tab count and default-tab setup only.
- Visual owns variant, tab content, layout, trigger style, and color controls.
- Advanced is read-only runtime diagnostics, technical IDs, normalized payload,
  and contract summary.

Targeted smoke evidence:

- `tabs`: `adminFailures=0`, `metadataGaps=0`, `publicFailures=0`
  (`.tmp/widget-smoke-tabs.json`).

## 2026-05-24 TASK-336-08 Ownership Update

`accordion` now has an explicit v2 editor contract and no longer treats
Advanced as Visual plus diagnostics:

- Wizard owns starter item count and default-open setup.
- Visual owns variant, item content, open behavior, layout, motion, typography,
  and color controls.
- Advanced is read-only runtime diagnostics, technical IDs, normalized payload,
  and contract summary.

Targeted smoke evidence:

- `accordion`: `adminFailures=0`, `metadataGaps=0`, `fixtureGaps=0`,
  `publicFailures=0` (`.tmp/widget-smoke-accordion.json`).

## 2026-05-24 TASK-336-09 Ownership Update

`posts-feed` now has an explicit v2 editor contract and no longer treats
Visual/Advanced as duplicate source editors:

- Wizard owns source mode, filters, manual post order, initial item count, and
  sort setup.
- Visual owns field visibility, section header, variant/layout/style,
  pagination presentation, and empty-state copy while keeping preview sync
  non-writable.
- Advanced is read-only resolved query, runtime status, runtime payload, and
  contract summary diagnostics.

Targeted smoke evidence:

- `posts-feed`: `adminFailures=0`, `metadataGaps=0`, `fixtureGaps=0`,
  `publicFailures=0` (`.tmp/widget-smoke-posts-feed.json`).

## 2026-05-24 TASK-336-10 Ownership Update

`form-embed` now has an explicit v2 editor contract and no longer duplicates
form selection, layout, and field-label controls across modes:

- Wizard owns only form selection and setup diagnostics.
- Visual owns public copy, layout, field-label visibility, style, multi-step
  navigation, and submit behavior.
- Advanced is read-only runtime diagnostics, submission security, redacted
  normalized payload, and contract summary diagnostics.

The draft-only fixture was published as `/ctr-form-embed-2305` so public CSS
smoke can verify the renderer instead of leaving this widget as a fixture gap.

Targeted smoke evidence:

- `form-embed`: `adminFailures=0`, `metadataGaps=0`, `fixtureGaps=0`,
  `publicFailures=0` (`.tmp/widget-smoke-form-embed.json`).

## 2026-05-24 TASK-336-11 Ownership Update

`hero` now has an explicit v2 editor contract and no longer treats Advanced as
the second design panel:

- Wizard owns only one-time setup seeds: goal action, initial layout, headline,
  and primary CTA.
- Visual owns public copy, badges, CTA, media, layout, spacing, responsive
  media visibility, typography, appearance, colors, borders, and background.
- Advanced is read-only layout, style-token, media, and accessibility
  diagnostics, normalized runtime payload, and contract summary.
- The remaining Wizard/Visual duplicate seed paths are explicit temporary
  allowances until `TASK-336-16`.

Targeted smoke evidence:

- `hero`: `adminFailures=0`, `metadataGaps=0`, `fixtureGaps=0`,
  `publicFailures=0`
  (`_docs/PLAYWRIGHT/widget-contract-smoke-hero-2026-05-24.md`,
  `.tmp/widget-smoke-hero.json`).

## Executive Summary

The public frontend is clearly better than the first Playwright wave: all 35
published widget pages audited returned HTTP 200 on desktop and mobile, and the
interactive smoke paths for tabs, accordion, FAQ, toggle block, and booking
calendar worked. The remaining issues are mostly contract drift and fixture
quality, not broad runtime breakage.

The main unresolved problem is editor IA consistency. The shared tabs exist, but
the actual widget editors still define their own ownership rules. As a result,
some widgets follow the intended model, while others still duplicate the same
writable fields across Wizard, Visual, and Advanced.

The highest-priority fixes are:

1. Split `template-section`, `search-box`, and `listing-filters` into distinct
   Wizard / Visual / Advanced responsibilities.
2. Stop treating Advanced as "Visual plus diagnostics" in widgets such as tabs,
   accordion, posts-feed, form-embed, hero, and stats-kpi.
3. Add a machine-readable editor-section contract so Playwright and Vitest can
   assert ownership, not just rendering.
4. Replace weak public fixtures that only prove empty states for layout,
   commerce, and dynamic widgets.
5. Fix the `team` spotlight side rail so supporting cards do not collapse into
   narrow desktop columns.
6. Mark intentional horizontal overflow and add visible scroll affordance for
   `testimonials` and `pricing-plans`.

## Current Registry and Coverage

`core/widgets/core/index.ts` registers 42 core definitions. Four are
custom-screen-only widgets:

- `screen-record-header`
- `screen-field-value`
- `screen-field-group`
- `screen-two-column`

The page-builder scope is therefore 38 widgets:

| Widget | Public page coverage | Prior `_docs/PLAYWRIGHT` report | Notes |
|---|---:|---:|---|
| `section` | yes | yes | Published test page exists. |
| `template-section` | no | no | Hidden from picker in `WidgetPicker`; no direct public fixture found. |
| `grid-columns` | yes | yes | Public fixture exists but only shallow visual coverage. |
| `split-layout` | yes | yes | Public fixture is effectively empty. |
| `tabs` | yes | yes | Interaction smoke passed. |
| `accordion` | yes | yes | Interaction smoke passed. |
| `toggle-block` | yes | yes | Interaction smoke passed. |
| `spacer` | yes | yes | Public fixture only proves spacer shell. |
| `divider` | yes | yes | Public fixture exists. |
| `stack` | yes | yes | Public fixture renders empty stack. |
| `hero` | yes | yes | Public fixture exists. |
| `feature-grid` | yes | yes | Public fixture exists. |
| `testimonials` | yes | yes | Intentional slider overflow requires explicit contract. |
| `pricing-plans` | yes | yes | Comparison table uses intentional horizontal scroll. |
| `faq-accordion` | yes | yes | Interaction smoke passed. |
| `cta-banner` | yes | yes | Public fixture exists. |
| `logo-cloud` | yes | yes | Public fixture exists. |
| `gallery-mosaic` | yes | yes | Public fixture exists. |
| `stats-kpi` | yes | yes | Public fixture exists. |
| `team` | yes | yes | Spotlight side rail needs desktop layout triage. |
| `rich-text-section` | yes | yes | Public fixture exists. |
| `content-list` | yes | yes | Empty-state only. |
| `posts-feed` | yes | yes | Public fixture exists. |
| `entry-teaser` | yes | yes | Public fixture exists. |
| `product-gallery` | yes | yes | Empty-state only. |
| `product-compare` | yes | yes | Empty-state only. |
| `product-table` | yes | yes | Empty-state only. |
| `listing-filters` | yes | yes | Public fixture exists. |
| `search-box` | no | no | Present in widget templates, no standalone public page found. |
| `timeline` | yes | yes | Public fixture exists. |
| `compare-timeline` | yes | yes | Public fixture exists. |
| `newsletter` | yes | yes | Public fixture exists. |
| `booking-calendar` | yes | yes | Runtime smoke passed. |
| `appointment-form` | yes | yes | Public fixture exists. |
| `form-embed` | yes | yes | Public fixture exists at `/ctr-form-embed-2305`; TASK-336-10 smoke passed. |
| `contact` | yes | yes | Public fixture exists. |
| `navigation` | yes | yes | Public fixture exists. |
| `footer` | yes | yes | Public fixture exists. |

## Playwright Frontend Results

The public frontend smoke was run for 35 published pages at desktop
`1365x900` and mobile `390x844`.

Observed:

- 35/35 published pages returned HTTP 200 on desktop.
- 35/35 published pages returned HTTP 200 on mobile.
- No console errors or warnings were captured during the public frontend smoke
  pass.
- `tabs` selected the second tab correctly.
- `toggle-block` toggled to the secondary state correctly.
- `accordion` and `faq-accordion` opened the clicked item correctly.
- `booking-calendar` rendered date and slot controls with bound runtime state.

CSS / UX findings:

| Widget | Status | Evidence | Recommendation |
|---|---|---|---|
| `testimonials` | Intentional horizontal overflow without explicit affordance | Renderer uses `overflow-x-auto snap-x snap-mandatory` and card `min-w-[18rem] shrink-0 snap-start` in `core/widgets/core/testimonials.tsx`. | Add `data-overflow-intentional="true"` or equivalent test marker, visible scroll/drag affordance, and an accessibility note/label for carousel-style layouts. |
| `pricing-plans` | Intentional mobile horizontal overflow in comparison rows | Renderer wraps the comparison table in `overflow-x-auto`; table has `min-w-[44rem]` in `core/widgets/core/pricingPlans.tsx`. | Either add a stacked mobile comparison alternative or explicitly mark and style the scroll region with visible affordance. |
| `team` | Real CSS/UX issue in `spotlight` | The desktop screenshot does not break the viewport, but the supporting cards become unnaturally narrow. Source uses a 3-column outer grid for spotlight and then can render the side rail as `lg:grid-cols-3`/`lg:grid-cols-4` again. | Change the spotlight side-rail layout or clamp supporting-card width. Add Playwright for `spotlight` with `columns=3/4`, long names, and long bios. |
| `product-gallery`, `product-compare`, `product-table`, `content-list` | Fixture gap | Pages render empty states only: "No products found", "No products to compare", "Brak produktow w katalogu", or "No items found". Source has separate non-empty grid/table/list paths, including focusable overflow wrappers for commerce tables. | Add seeded public fixtures with real items and assert `data-*-count > 0` or `data-content-list-state="ready"` so layout, media, links, filters, and table behavior are actually tested. |
| `stack`, `split-layout`, `spacer` | Weak structural fixtures, not confirmed CSS bugs | `stack` renders only neutral `Empty stack.` public output, `split-layout` is empty because public empty-pane guidance is intentionally hidden outside preview, and `spacer` is inherently screenshot-weak. | Add nested child fixtures for `stack` and `split-layout`. Test `spacer` through computed height / CSS variables rather than screenshot pixels. |
| `grid-columns` | Partial pass, fixture too shallow | Two visible blocks prove basic layout, but not asymmetric spans, 4-6 columns, overflow behavior, cardized surfaces, reverse-on-mobile, images, or long text. | Add Playwright fixtures for dense columns, long content, `reverseOnMobile`, and overflow modes; assert no public helper labels leak. |

## Admin Editor Contract Findings

Evidence caveat: this section is source-backed static analysis. It identifies
real code paths and likely UX drift, but each finding still requires the
repeatable TASK-336 Playwright admin smoke before implementation closure.

The shell-level panels are mostly aligned:

- `WidgetEditorModeRoot` emits `data-widget-editor` and
  `data-widget-editor-mode`.
- `WidgetEditorSection` emits stable section metadata when widgets use it.
- `VisualPanel` hides generic variant cards when
  `editorCapabilities.visualOwnsVariantSelection` is true.
- `AdvancedPanel` always appends shared Layout and Visibility controls after
  the widget-owned Advanced editor.

The drift is inside widget-specific editor implementations.

### P0: Mode Ownership Is Still Broken

| Widget | Finding | Impact |
|---|---|---|
| `template-section` | `TemplateSectionEditor` is reused by Wizard, Visual, and Advanced. Advanced re-renders template selection and metadata, then adds diagnostics. The same editor also contains an empty `Runtime behavior` section followed by an orphaned runtime alert. | Direct violation of the mode contract. Users see the same writable fields in every tab. |
| `search-box` | Wizard and Visual render the same `SearchMode`, `CopyAndBehavior`, and `SurfaceEditor`. Advanced repeats `CopyAndBehavior` and adds runtime/contract text. | No meaningful distinction between onboarding, daily editing, and technical mode. |
| `listing-filters` | Wizard includes source, facets, runtime behavior, diagnostics, and surface; Visual repeats query/runtime/surface/facets; Advanced still edits facets. | Same class of drift as `search-box`, but higher runtime complexity. |

### P1: Advanced Often Means "Visual Plus Extras"

| Widget | Finding | Impact |
|---|---|---|
| `tabs` | Advanced repeats variant, structure, layout, trigger style, and colors, then adds diagnostics. | Advanced duplicates daily Visual work. |
| `accordion` | Advanced repeats variant, structure, and behavior before diagnostics. | Users have two places to change the same product behavior. |
| `posts-feed` | Advanced repeats the Visual flow and appends a snapshot. | Source/display ownership remains unclear. |
| `form-embed` | Closed by TASK-336-10: Advanced is read-only and form selection is Wizard-only. | Targeted smoke has no duplicate writable paths or metadata gaps. |
| `hero` | Advanced says it owns technical layout controls, but repeats background color, gradient, media, and overlay fields from Visual. | High user-facing widget, high confusion risk. |
| `stats-kpi` | Closed by TASK-336-12: Advanced is read-only diagnostics plus confirmed repair actions, while Visual owns KPI content/style/layout and Wizard overlap is allowlisted until TASK-336-16. | Targeted smoke has no duplicate writable paths or metadata gaps. |

### P2: Old and New Editor Patterns Coexist

Examples:

- Several editor files define local `EditorSection` wrappers that derive IDs
  from title text. This makes automation IDs unstable across copy changes.
- `HeroWizardEditor` still returns raw field groups without
  `WidgetEditorSection` / `WidgetControlRow` ownership.
- `HeroVisualEditor` has migrated sections and old raw CTA controls in the same
  file; CTA fields have labels but not the shared `data-widget-control` contract.
- `SpacerWizardEditor` uses a raw top-level `div` and unsectioned controls,
  while Visual and Advanced are more structured.
- Closed by TASK-336-13 for `content-list`, `booking-calendar`,
  `appointment-form`, and `product-table`: targeted smoke now has
  `adminFailures=0` and `metadataGaps=0` for all four. Remaining public fixture
  gaps are fixture coverage issues (`content-list`, `booking-calendar`,
  `product-table`), not editor-contract ownership failures.
- `WizardPanel` renders its own header, and `BlockSettings` renders another
  selected-widget header after setup, causing double header IA when returning to
  the Wizard tab.

## Recommended Shared Contract

The contract should be explicit enough to test automatically, not just described
in prose.

### Wizard

Owns only first-run setup:

- goal/preset
- source/template selection when that is required to make the block useful
- variant/count when needed for a publishable minimum
- 3-5 critical copy fields
- one primary action where applicable

Wizard must not own:

- colors, spacing, radius, typography, shadows, or surface tokens
- diagnostics snapshots
- raw IDs beyond required source/template selection
- import/export/reset tools
- repeated item management beyond safe initial count/preset

### Visual

Owns daily editing:

- user-facing copy
- CTA labels and links
- media and alt text
- repeatable item management
- public behavior toggles
- bounded style controls: variant, tone, surface, color, typography, spacing
- preview-friendly source state where the user understands the outcome

Visual should be the only writable owner for normal content/style fields.

### Advanced

Owns technical and support work only:

- read-only runtime payload and normalization diagnostics
- raw contract fields that are not safe for Visual
- import/export tools
- reset/repair actions
- endpoint/query IDs where the user is expected to know the backend object
- widget-specific technical layout tokens only when not already covered by the
  shared `AdvancedPanel` Layout and Visibility sections

Advanced may display Visual-owned values as read-only summaries. It should not
render a second writable copy of Visual fields.

## Implementation Recommendation

Add an executable editor contract next to widget definitions or editor bundles.

Illustrative shape, superseded by the stricter TASK-336 schema of record:

```ts
type WidgetEditorSectionContract = {
  mode: "wizard" | "visual" | "advanced";
  id: string;
  role:
    | "setup"
    | "source"
    | "content"
    | "visual"
    | "layout"
    | "technical"
    | "diagnostics"
    | "summary";
  writablePaths: string[];
  readOnlyPaths?: string[];
  allowedDuplicateWritablePaths?: Array<{
    path: string;
    reason: string;
    expiresWithTask: string;
  }>;
};
```

Validation rules:

1. Every widget has all three modes.
2. Every mode renders at least one `data-widget-editor-section`.
3. Every section ID is explicit and stable; no title-derived IDs.
4. A data path can be writable in only one mode unless explicitly allowlisted.
5. Advanced sections marked `diagnostics` must be read-only.
6. Wizard must not expose style token paths.
7. Visual and Advanced must not share the same section IDs.
8. Public overflow checks must allow only intentional regions with an explicit
   marker and visible affordance.

## Prioritized Follow-Up Plan

1. Create missing Playwright coverage for `template-section` and `search-box`.
2. Fix P0 editor ownership:
   `TemplateSectionEditors.tsx`, `SearchBoxEditors.tsx`,
   `ListingFiltersEditors.tsx`.
3. Fix P1 Advanced duplication in hero and stats-kpi.
4. Replace local `EditorSection` aliases with shared `WidgetEditorSection` and
   explicit IDs across editor files.
5. Migrate old raw field rows to `WidgetControlRow`, starting with Hero CTA and
   Wizard editors.
6. Add Vitest editor-contract tests and Playwright DOM smoke for all 38
   page-builder widgets.
7. Replace empty public fixtures with representative data for structural,
   commerce, and dynamic widgets.
8. Add overflow affordance/markers for testimonials and pricing comparison
   rows, then enforce body overflow checks in Playwright.

## Validation Performed

- `playwright-cli` login to admin succeeded.
- `playwright-cli` public smoke produced 70 local-only screenshots for 35
  published pages.
- Frontend desktop and mobile status checks passed for 35/35 published pages.
- Public frontend console smoke found no captured errors or warnings.
- Interactive smoke passed for tabs, toggle block, accordion, FAQ accordion, and
  booking calendar.
- Static source audit was performed for editor contracts and renderer overflow.
- Claude CLI was used as an independent review input.
- Two helper agents were spawned: one for editor-contract source review and one
  for frontend fixture/CSS review.

## TASK-336-15 Superseding Frontend Evidence (2026-05-24)

The TASK-336-15 rerun supersedes the frontend CSS/fixture gaps listed above:

- `widget-contract-smoke-task-336-15-front-rerun-2026-05-24.md` and `.json`
  covered all 38 inventory widgets with `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0`.
- `team` spotlight now keeps the supporting rail readable at high column
  counts and long member/social copy uses bounded wrapping.
- `testimonials`, `pricing-plans`, `product-compare`, and `product-table` now
  expose approved intentional horizontal-scroll regions with visible scroll
  affordances and keyboard-focusable containers.
- The Playwright overflow detector now ignores intentional overflow only when
  the marked region also matches the approved widget/region allowlist; a raw
  `data-overflow-intentional` marker alone no longer bypasses the check.
- Public fixture data was repaired for the previously empty/weak structural,
  content, commerce, search, timeline, and template-section fixture pages used
  by the smoke inventory.

## TASK-336-18 Contract Coverage Evidence (2026-05-24)

TASK-336-18 adds strict v2 editor contracts for the remaining page-builder
widgets not covered by earlier TASK-336 leaves:

- `toggle-block`, `feature-grid`, `testimonials`, `pricing-plans`,
  `faq-accordion`, `cta-banner`, `logo-cloud`, `gallery-mosaic`,
  `rich-text-section`, `entry-teaser`, `product-gallery`, `product-compare`,
  `timeline`, `compare-timeline`, `newsletter`, `contact`, `navigation`, and
  `footer` now export `editorContract.version = 2`.
- `tests/vitest/widgets/editorContract.test.ts` validates the full TASK-336-18
  set in strict mode and keeps Advanced diagnostic sections read-only in the
  declared contract.
- `widget-contract-smoke-task-336-18-full-2026-05-24.*` covered the full
  38-widget public inventory and kept frontend CSS smoke green with
  `publicFailures=0` and `fixtureGaps=0`.
- Authenticated admin smoke
  `widget-contract-smoke-task-336-18-admin-auth-2026-05-24.*` intentionally
  records the remaining actual UI/fixture/metadata drift:
  `adminFailures=9`, `fixtureGaps=19`, and `metadataGaps=2`. These findings are
  routed to `TASK-336-19` instead of being hidden behind broad duplicate
  allowlists.

Accepted UX direction from the earlier Claude review, the 2026-05-24 read-only
Claude rerun, and the TASK-336-18 helper-agent audits: Wizard is setup-only,
Visual owns daily content/style/behavior, and Advanced diagnostics stay
read-only. Rejected: treating raw CSS, JSON, HTML, source IDs, product IDs,
webhook IDs, or technical integration URLs as normal fields for nontechnical
users. The fresh Claude rerun also routed raw `formId`, `menuKey`, `assetId`,
item-id, `map.embedUrl`, rich HTML, FAQ JSON-LD, and contact nonce diagnostics
to `TASK-336-19`.

## TASK-336-19 DOM Metadata Cleanup Evidence (2026-05-24)

The first TASK-336-19 implementation family targets admin DOM metadata drift,
not the full raw-input or one-time Wizard lifecycle cleanup.

- Missing Wizard or Advanced `WidgetEditorSection` markers were added for
  `feature-grid`, `pricing-plans`, `faq-accordion`, `cta-banner`,
  `gallery-mosaic`, `team`, `rich-text-section`, `navigation`, and `footer`.
- Non-persisted custom controls in `feature-grid`, `toggle-block`, and
  `logo-cloud` are now explicitly marked as `preview` or `action`, so the smoke
  harness does not count variant previews, undo notices, drag handles, move
  buttons, or remove buttons as unowned writable controls.
- Targeted authenticated admin smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-dom-admin-*-2026-05-24.*`.
  All 11 touched widgets report `adminFailures=0` and `metadataGaps=0`.
- Fixture gaps remain in the targeted runs for the `advanced` probes of
  `pricing-plans`, `cta-banner`, `team`, `navigation`, and `toggle-block`.
  These are still TASK-336-19 work and are not hidden by this metadata cleanup.
- A full 38-widget admin smoke rerun was attempted but stopped after the
  unchanged `spacer` advanced probe hung without writing a final report.

## TASK-336-19 Raw Media URL Cleanup Evidence (2026-05-24)

The second TASK-336-19 implementation family targets nontechnical media
authoring drift, not the remaining link/page picker or one-time Wizard
lifecycle work.

- `navigation`, `cta-banner`, `testimonials`, `feature-grid`, and `logo-cloud`
  no longer expose editable raw image URL text inputs in normal Wizard/Visual
  editor flows.
- Existing external image values remain backward-compatible persisted data and
  are shown as read-only replace/clear notices. Picking a Media Library asset
  still writes the schema-owned public URL paths (`logo.value`,
  `background.media.src`, `testimonials.avatar`, `style.backgroundImage`,
  `items.image`, and `logos.image`) without adding schema churn.
- Targeted Vitest editor coverage now asserts that the legacy raw URL
  placeholders are absent and that media picker selection/clear/error paths keep
  the same runtime-safe data contract.
- Targeted authenticated Playwright admin evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-media-admin-*-2026-05-24.*`.
  `navigation`, `testimonials`, and `logo-cloud` report `adminFailures=0`,
  `fixtureGaps=0`, and `metadataGaps=0`. `cta-banner` and `feature-grid` report
  `adminFailures=0` and `metadataGaps=0`, with unchanged Advanced
  `block_select_missing` fixture gaps.
- Remaining explicit raw-link work (`cta.href`, navigation item URLs,
  logo-cloud partner links, and page/link pickers) stays routed to TASK-336-19
  follow-up families. Contact map/social authoring is covered by the later
  Contact evidence section.

## TASK-336-19 Link Destination Cleanup Evidence (2026-05-24)

The third TASK-336-19 implementation family targets raw link/path/URL drift in
normal Wizard/Visual flows while preserving existing runtime schemas.

- `navigation`, `cta-banner`, `logo-cloud`, `testimonials`, and `feature-grid`
  now use the shared `LinkDestinationField` for normal beginner-mode
  destinations.
- The shared field loads only published CMS pages, writes back the existing
  string `href` fields, and does not introduce `pageId` schema churn.
- Legacy custom/hash/external `href` values remain backward-compatible as
  read-only replace/clear state in Wizard/Visual instead of editable raw URL or
  path inputs.
- Claude post-implementation review accepted the page-first/read-only-legacy
  approach for this slice. Its required follow-ups are included here:
  unpublished pages are filtered out of picker options, and newly added Logo
  Cloud rows no longer seed `href: "#"`.
- Targeted authenticated Playwright admin evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-link-destination-admin-*-2026-05-24.*`.
  `navigation`, `logo-cloud`, and `feature-grid` report `adminFailures=0`,
  `fixtureGaps=0`, and `metadataGaps=0`. `cta-banner` and `testimonials`
  report `adminFailures=0` and `metadataGaps=0`, with unchanged Advanced
  `block_select_missing` fixture gaps.

## TASK-336-19 Contact Map/Social Authoring Evidence (2026-05-24)

The fourth TASK-336-19 implementation family targets the explicit `contact`
`map.embedUrl` contradiction and related social-profile raw destination drift.

- `contact` Visual no longer exposes editable raw `Map embed URL` or
  `Profile URL` fields. Map setup asks for a public location/address and writes
  the existing `map.embedUrl` string through Contact-owned helpers. Known social
  platforms ask for profile names/handles and write the existing
  `contact.social[].href` strings.
- Legacy custom map/social destinations remain backward-compatible persisted
  data and are shown as replace/clear state instead of normal editable URL
  controls.
- `contact` Advanced now reports map visibility/source/runtime status as
  read-only summary rows. Normalization is a confirm-gated support action
  instead of a one-click mutation.
- Claude recommended a sanitizer-gated URL paste flow for compatibility. This
  slice intentionally chose location/profile-name authoring because the current
  user requirement is stricter: normal Wizard/Visual users should not have to
  paste developer-style URLs or embed snippets.
- Claude post-implementation review flagged three pre-commit blockers that are
  addressed here: Wizard no longer writes `form.submission.staticMessage`
  outside its declared contract, the Advanced contract no longer lists
  nonexistent `runtime.normalizedData`, and new social rows no longer start as a
  user-selectable dead-end `custom` destination.
- Targeted authenticated Playwright admin evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-contact-authoring-admin-2026-05-24.*`.
  `contact` reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0`.

## TASK-336-19 Advanced Read-Only Batch 1 Evidence (2026-05-24)

The fifth TASK-336-19 implementation family targets Advanced tabs that still
behaved as a second Visual editor despite `writablePaths: []` contracts.

- `faq-accordion` Advanced no longer edits open-state selectors, raw default
  indexes, or style tokens. It reports open-state/style diagnostics and keeps a
  two-step confirmed normalization support action. FAQ Visual search controls
  now use beginner-facing wording instead of raw `JSON-LD` terminology.
- `newsletter` Advanced no longer edits raw action URL or webhook ID fields. It
  reports transport/integration status without exposing the stored URL or
  webhook value, and keeps a two-step confirmed normalization support action.
- `navigation` Advanced no longer mutates layout or runtime behavior. Friendly
  layout width/spacing and sticky/collapse controls moved into Visual, raw menu
  keys are redacted to configured/not-configured status in Advanced, and
  nonexistent `cta.target`/`cta.enabled` paths were removed from the contract.
- Claude and helper-agent review agreed the one-time Wizard lifecycle remains a
  separate `TASK-336-16` concern. This batch closes Advanced drift only.
- Targeted authenticated Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-advanced-readonly-admin-*-2026-05-24.*`.
  `faq-accordion` and `navigation` report `adminFailures=0`,
  `publicFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`. `newsletter`
  reports `adminFailures=0`, `publicFailures=0`, and `metadataGaps=0`, with an
  unchanged `block_select_missing` admin fixture gap.

## TASK-336-16 One-Time Wizard Evidence (2026-05-24)

The one-time Wizard lifecycle is now implemented at the shared page-builder
shell instead of per widget.

- Option A is recorded for the daily tab model: completed widgets expose
  `Visual` and `Advanced` only. `Wizard` is no longer a permanent peer tab after
  setup completion.
- Completed widgets show a read-only `Setup complete` summary and a
  `Run setup again` action. Reopening setup preserves widget data and re-enters
  the existing `wizardCompleted=false` path; completion still uses
  `applyWizardSelection` to return to `Visual`.
- The Playwright mode inventory was updated so completed admin fixtures verify
  daily `visual` and `advanced` modes. Targeted Hero evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-16-one-time-wizard-hero-2026-05-24.*`
  and reports `adminFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`.
- A dedicated lifecycle smoke is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-16-one-time-wizard-lifecycle-2026-05-24.*`
  and verifies hidden Wizard peer tab, visible setup summary, daily Visual,
  Advanced diagnostics, explicit setup rerun, and return to Visual.
- 2026-05-25 follow-up: persisted legacy blocks without `editor` state now
  normalize as setup-complete `Visual` in page/detail-template editors and in
  page mutation payloads. Targeted FAQ evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-16-legacy-faq-wizard-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.

## TASK-336-19 Newsletter Visual Authoring Evidence (2026-05-24)

The sixth TASK-336-19 implementation family targets the remaining `newsletter`
Visual drift found after Advanced was made read-only.

- `newsletter` Visual no longer asks authors to type stored field-name keys,
  analytics event names, action URLs, native methods, or webhook IDs.
- Static mode shows safe default field mapping as read-only state. Forms-runtime
  mode maps Email, First name, and Consent through fields from the selected
  Coderso Form while preserving the existing persisted schema paths.
- The daily editor now shows a beginner-safe connection summary. External
  provider metadata remains read-only diagnostics in Advanced.
- Compatibility warnings now describe missing Email/First name/Consent fields
  instead of raw runtime field keys.
- Targeted Vitest evidence covers the UI contract and renderer/runtime
  compatibility:
  `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/editorContract.test.ts`
  and `bun test tests/vitest/widgets/newsletter.test.tsx`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-newsletter-visual-admin-2026-05-24.*`.
  Newsletter reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0`.
- Claude read-only UI/UX retry returned `NO BLOCKERS` for P1/P2 beginner-mode
  technical authoring drift in the current diff.

## TASK-336-19 Commerce Source Authoring Evidence (2026-05-24)

The seventh TASK-336-19 implementation family targets Product Gallery and
Product Compare raw commerce authoring drift.

- `product-compare` Wizard now stays query-based. Exact compared products and
  featured-product selection live in Visual product pickers, and the temporary
  Wizard/Visual duplicate allowance for `source.productIds` was removed.
- `product-gallery` Wizard no longer asks for fallback collection IDs or
  commerce minor-unit prices. Visual owns selected-product curation and the
  more-products destination through product/page pickers. Card density moved
  from Wizard into Visual to keep the presentation contract single-owned.
  Product route prefix and saved technical behavior are summarized read-only in
  Advanced.
- Targeted Vitest evidence covers the shared commerce picker, both editor
  waves, preview behavior, widget renderer compatibility, and strict editor
  contracts:
  `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx tests/vitest/ui/commerce-widget-editor-shared.test.tsx tests/vitest/ui/product-gallery-admin-preview.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-commerce-product-gallery-2026-05-24.*`
  and
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-commerce-product-compare-2026-05-24.*`.
  Product Gallery reports `adminFailures=0`, `publicFailures=0`,
  `fixtureGaps=0`, and `metadataGaps=0`. Product Compare reports
  `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude post-implementation review flagged Product Gallery `style.columns` and
  `style.cardStyle` as a Wizard/Visual ownership blocker. The final patch moves
  those controls into Visual rather than expanding the Wizard contract.

## TASK-336-19 Preview-State Stability Evidence (2026-05-24)

The eighth TASK-336-19 implementation family hardens the shared PageEditor
preview-state bridge used by preview-capable widgets.

- PageEditor widget-preview state updates are now idempotent for empty clears
  and repeated identical states. This prevents repeated `setPreviewState(null)`
  or repeated ready-state writes from allocating a fresh preview-state map.
- Focused Vitest evidence covers PageEditor preview-state idempotence and the
  Newsletter/Product Compare/Product Gallery editor preview paths:
  `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-gallery-editor-wave.test.tsx`.
- Initial reruns still showed `block_select_missing`; debug snapshots proved
  those were stale Vite optimized dependency failures, not widget DOM failures:
  the admin body was empty and the browser console reported
  `504 Outdated Optimize Dep` for React optimized deps. After clearing
  `core/node_modules/.vite`, restarting `coderso-dev-core-host`, and using
  fresh Playwright sessions, Newsletter and Product Compare both report
  `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude read-only review for this PageEditor hardening was attempted with
  `claude -p --permission-mode plan --output-format text`, but it timed out
  after 180 seconds without output.

## TASK-336-19 Gallery Mosaic Media/Link Authoring Evidence (2026-05-24)

The ninth TASK-336-19 implementation family targets Gallery Mosaic raw
media/link authoring drift in Visual.

- Visual no longer exposes editable `Image URL`, `Video URL`, `Link URL`, or
  `Poster image URL` fields. Image/video replacement uses `MediaPicker`, video
  poster frames use an image-only `MediaPicker`, and destinations use the
  page-first `LinkDestinationField`.
- Saved legacy media/link string values stay compatible as visible
  replace-or-clear state rather than editable raw URL fields.
- New item and widget defaults no longer seed fake destinations such as
  `href: "#"`, so newly inserted/reset galleries start without a misleading
  custom destination.
- The Gallery Mosaic Wizard contract now matches actual writes:
  `header.title`, item count, image/video media, and captions. It no longer
  claims `header.description` or `items.alt`. Advanced diagnostics now list
  real read-only paths and drop the nonexistent `runtime.normalizedData`.
- Claude read-only review first flagged the Wizard contract mismatch and saved
  MediaPicker state ambiguity. The follow-up re-review returned no blockers;
  remaining copy/state suggestions were also addressed before validation.
- Targeted Vitest evidence covers the editor wave, renderer/runtime behavior,
  lightbox runtime, strict editor contract, renderer smoke, and `none` style
  compatibility:
  `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/widgets/galleryMosaicLightboxRuntime.test.ts tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-gallery-mosaic-media-link-2026-05-24.*`.
  The final rerun reports `adminFailures=0`, `publicFailures=0`,
  `fixtureGaps=0`, and `metadataGaps=0`. The first run showed
  `block_select_missing`, but browser console logs proved stale Vite optimized
  deps (`504 Outdated Optimize Dep`); clearing `core/node_modules/.vite` and
  restarting `coderso-dev-core-host` fixed the environment.

## TASK-336-19 Pricing Plans CTA Destination Evidence (2026-05-24)

The tenth TASK-336-19 implementation family targets Pricing Plans CTA and color
authoring drift.

- Wizard and Visual no longer expose raw `CTA URL` text inputs for
  `plans.ctaHref`. Both surfaces use the shared page-first
  `LinkDestinationField`, preserving older custom/hash/external destinations as
  replace-or-clear compatibility state.
- Pricing Plans defaults no longer seed fake `ctaHref: "#"`, so inserted/reset
  widgets do not start in a disabled custom-destination state.
- Pricing Plans color controls now use swatches plus clear/legacy-token
  summaries instead of visible raw token textboxes for plan surfaces and shared
  pricing colors.
- The Wizard contract no longer claims `header.description`, and Advanced
  diagnostics now include the real `header` path.
- Focused Vitest evidence covers the editor flow, renderer compatibility, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-pricing-plans-cta-destination-2026-05-24.*`.
  Pricing Plans reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0`.
- Claude read-only review was attempted for this slice, but the process exited
  with code 143 and returned no usable review output. Helper-agent review
  separately confirmed the CTA, default `#`, color-token, and contract drifts
  addressed here.

## TASK-336-19 Team Visual Destination Authoring Evidence (2026-05-24)

The eleventh TASK-336-19 implementation family targets Team Visual CTA, photo,
and social destination authoring drift.

- Team Visual no longer exposes raw `CTA URL`, direct photo URL, or social
  `https://...` inputs. CTA destination authoring uses the shared page-first
  `LinkDestinationField`, member photo authoring uses Media Library picking,
  and social authoring uses known platform choices plus profile names/handles.
- Saved custom CTA/photo/social destinations stay backward-compatible as
  replace-or-clear state instead of editable raw URL fields.
- Focused Vitest evidence covers the editor flow, renderer compatibility, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-team-authoring-2026-05-24.*`.
  Team reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude review was attempted twice for this slice. The first invocation
  exited with `Exceeded USD budget (1)`; the no-budget retry produced no output
  before being stopped with code 143. No Claude blocker output was available
  for this Team slice.

## TASK-336-19 Footer Destination Authoring Evidence (2026-05-24)

The twelfth TASK-336-19 implementation family targets Footer Wizard/Visual raw
destination authoring drift.

- Footer Wizard and Visual no longer expose raw logo URL, legal URL, column link
  URL, or social URL inputs. Brand logo authoring uses Media Library picking,
  column and legal links use the shared page-first `LinkDestinationField`, known
  social platforms use profile names/handles, and custom social links use
  page-first custom destination picking.
- Saved custom destinations stay backward-compatible as replace-or-clear state
  instead of editable raw URL fields. Newly added column/social links no longer
  seed fake `#` or `https://` destinations.
- Focused Vitest evidence covers the editor flow, renderer compatibility, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-footer-authoring-2026-05-24.*`.
  Footer reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude read-only review was attempted for this Footer slice, but the returned
  output contained no actionable findings or blocker list.

## TASK-336-19 Compare Timeline Destination Authoring Evidence (2026-05-24)

The thirteenth TASK-336-19 implementation family targets Compare Timeline step
and segment destination authoring drift.

- Compare Timeline Visual no longer exposes raw safe-link text inputs for
  `axis.steps[].href` or highlighted segment `href` fields. Both surfaces use
  the shared page-first `LinkDestinationField`.
- Saved custom destinations stay backward-compatible as replace-or-clear state
  instead of editable raw URL fields.
- Focused Vitest evidence covers the editor flow, renderer compatibility, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-compare-timeline-authoring-2026-05-24.*`.
  Compare Timeline reports `adminFailures=0`, `publicFailures=0`,
  `fixtureGaps=0`, and `metadataGaps=0`.
- Claude read-only review was attempted for this Compare Timeline slice, but it
  returned no actionable output.

## TASK-336-19 Timeline Mode/Destination Evidence (2026-05-25)

The fourteenth TASK-336-19 implementation family targets Timeline Wizard,
Visual destination, and Advanced diagnostics drift.

- Timeline Wizard now seeds only the starter story: variant, header title,
  header description, starter step count, and starter step title/description.
  Layout, guides, status, icons, marker accents, dates, and destinations are
  no longer exposed in Wizard.
- Timeline Visual no longer exposes raw safe-link/path text inputs for step CTA
  or whole-step destinations. Both use the shared page-first
  `LinkDestinationField` while preserving saved custom/hash/external
  destinations as replace-or-clear compatibility state.
- Timeline Advanced no longer exposes editable layout controls. It renders
  read-only runtime/layout/style diagnostics plus a two-step confirmed payload
  normalization support action.
- Claude follow-up polish is included: title-hidden guidance lives in Visual
  Typography, Advanced summaries use human-readable labels, transparent
  background diagnostics display as inherited/transparent, and normalization
  review state expires when the payload changes before confirmation.
- Focused Vitest evidence covers the editor flow, renderer compatibility, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx tests/vitest/widgets/timeline.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-timeline-authoring-2026-05-25.*`.
  Timeline reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0`.
- Claude read-only review returned `NO BLOCKERS`, then `NO REMAINING ACTIONS`
  after the medium/low suggestions were addressed.

## TASK-336-19 Hero Destination Authoring Evidence (2026-05-25)

The fifteenth TASK-336-19 implementation family starts Hero cleanup with the
link-destination-only sub-slice.

- Hero Wizard and Visual no longer expose raw URL/path inputs for
  `primaryCta.href`, `secondaryCta.href`, or `badge.href`.
- Those fields now use the shared page-first `LinkDestinationField`, preserving
  saved custom/hash/external destinations as replace-or-clear compatibility
  state.
- Focused Vitest evidence covers the editor flow, SSR editor metadata,
  renderer compatibility, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Helper-agent audit accepted this as the first safe Hero sub-slice and queued
  separate follow-up sub-slices for media URL, avatar URL, rich HTML, and
  color/overlay authoring.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-link-destinations-2026-05-25.*`.
  Hero reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude read-only review was attempted for this link-only slice, but the
  process timed out before returning output.

## TASK-336-19 Hero Media Authoring Evidence (2026-05-25)

The sixteenth TASK-336-19 implementation family targets Hero media/poster raw
URL authoring drift.

- Hero Visual media and background media no longer expose normal raw URL/source
  controls for `media.src`, `media.posterSrc`, `background.media.src`, or
  `background.media.posterSrc`.
- Media and poster replacement now uses Media Library pickers while preserving
  saved external media/poster values as replace-or-clear read-only state in
  Visual.
- Runtime schema and rendering stay backward-compatible for existing external
  media values.
- Focused Vitest evidence covers the editor flow, SSR editor metadata,
  renderer compatibility, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-media-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude read-only media review returned `NO BLOCKERS` before the final
  legacy-state refinements. A final `claude -p --permission-mode plan
  --output-format text` confirmation attempt timed out after 240 seconds
  without new output.

## TASK-336-19 Hero Avatar Authoring Evidence (2026-05-25)

The seventeenth TASK-336-19 implementation family targets Hero social proof
avatar raw URL authoring drift.

- Hero Visual avatar rows no longer expose normal raw URL inputs for
  `socialProof.avatars.*.src`.
- Avatar replacement now uses image-only Media Library pickers with additive
  `source`/`assetId` metadata while preserving `src` as the runtime render
  field.
- Saved `src`-only avatar values remain runtime-compatible and appear as
  replace-or-clear read-only state in Visual.
- Focused Vitest evidence covers the editor flow, SSR editor metadata,
  renderer normalization compatibility, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-avatar-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Helper-agent review flagged source/assetId and partial asset save edge cases;
  those were addressed before validation. Claude read-only review for this
  avatar-only slice timed out after 240 seconds without output.

## TASK-336-19 Hero Rich Copy Authoring Evidence (2026-05-25)

The eighteenth TASK-336-19 implementation family targets Hero rich copy raw
HTML authoring drift.

- Hero Visual no longer exposes raw `Rich headline HTML` or `Rich body HTML`
  textareas for `richHeadline` and `richBody`.
- Styled headline/body authoring now uses the shared `PostRichTextAdapter`
  toolbar while preserving the existing sanitized runtime fields.
- Focused Vitest evidence covers the editor flow, SSR editor metadata,
  renderer compatibility, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-rich-copy-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude read-only review flagged aria linkage, empty-rich fallback, and
  silent sanitizer drift; those findings were addressed before the final
  Playwright rerun. A final Claude confirmation attempt timed out after 180
  seconds without new output.

## TASK-336-19 Hero Overlay Authoring Evidence (2026-05-25)

The nineteenth TASK-336-19 implementation family targets Hero media overlay raw
CSS color authoring drift.

- Hero Visual no longer exposes raw `rgba(...)` text inputs for `media.overlay`
  or `background.media.overlay`.
- Overlay authoring now uses color and strength controls while preserving the
  stored overlay string contract for runtime rendering.
- Focused Vitest evidence covers the editor flow, renderer compatibility, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-overlay-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Claude read-only review timed out after 180 seconds without output.

## TASK-336-19 Hero Color Authoring Evidence (2026-05-25)

The twentieth TASK-336-19 implementation family targets Hero raw color/CSS
token authoring drift.

- Hero Visual no longer exposes normal raw CSS/token text inputs for style and
  background color fields.
- Color authoring now uses swatch/color-picker controls plus explicit
  transparent and clear actions while preserving the string runtime contract
  for existing `var(...)`, `rgba(...)`, and `transparent` values.
- Focused Vitest evidence covers the editor flow, SSR editor metadata,
  renderer compatibility, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-hero-color-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Helper-agent review found no high drift and flagged missing clear-path
  coverage plus docs/evidence synchronization; those findings were addressed
  before validation. Claude read-only review timed out after 240 seconds
  without output.

## TASK-336-19 FAQ Color Authoring Evidence (2026-05-25)

The twenty-first TASK-336-19 implementation family targets FAQ Accordion raw
color/CSS token authoring drift.

- FAQ Visual no longer exposes raw CSS/token text inputs for style color
  fields.
- Color authoring now uses swatch-only controls plus explicit clear actions,
  while preserving the string runtime contract for existing theme tokens,
  rgba values, and custom strings as replace-or-clear saved custom color state.
- All seven style color fields clear through `normalizeFaqAccordionData`:
  `surface`, `border`, `divider`, `questionTextColor`, `answerTextColor`,
  `headerTitleColor`, and `headerDescriptionColor`.
- Focused Vitest evidence covers the editor flow, SSR editor metadata,
  normalization, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-faq-color-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Helper-agent audits first found stale expectations, incomplete clear-path
  coverage, and stale docs; those findings were addressed before final review,
  which reported no high/medium/low drift. Claude read-only review timed out
  after 240 seconds without output.

## TASK-336-19 CTA Banner Color/Advanced Evidence (2026-05-25)

The twenty-second TASK-336-19 implementation family targets CTA Banner raw
color/CSS token authoring and writable Advanced style-token drift.

- CTA Banner Visual no longer exposes raw CSS/token text inputs for style and
  background color fields.
- Color authoring now uses swatch-only controls plus explicit clear actions,
  while preserving the string runtime contract for existing theme tokens,
  transparent values, and custom color strings as replace-or-clear saved custom
  color state.
- CTA Banner Advanced no longer edits raw style tokens. It shows read-only
  style diagnostics and keeps normalize/reset as confirmed support actions.
- Focused Vitest evidence covers the shared swatch-only color helper, CTA
  editor flow, SSR editor metadata, and strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-cta-color-advanced-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- Helper-agent triage ranked CTA Banner as the next high-priority slice. Claude
  independently ranked `stats-kpi` color authoring as the next color slice;
  the next section closes that slice.

## TASK-336-19 Stats KPI Color Authoring Evidence (2026-05-25)

The twenty-third TASK-336-19 implementation family targets Stats KPI raw
color/CSS token authoring drift in Visual.

- Stats KPI Visual no longer exposes raw CSS/token text inputs for metric
  accents, typography colors, card/icon surfaces, or section background.
- Color authoring now uses swatch-only controls plus explicit clear actions on
  clearable fields, while preserving existing theme tokens, CSS variables, and
  custom color strings as saved custom color state.
- New Stats KPI defaults leave colors un-authored and rely on runtime theme
  fallbacks, so a fresh editor starts from `Theme default` instead of saved
  custom color state.
- Stats KPI Advanced remains read-only diagnostics with no writable paths.
- Focused Vitest evidence covers raw-token input absence, saved-custom replace
  behavior, fresh-default `Theme default` state, SSR editor metadata, and strict
  editor contracts:
  `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx tests/vitest/widgets/statsKpi.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-stats-kpi-color-authoring-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.

## TASK-336-19 Rich Text Section Source/Color Evidence (2026-05-25)

The twenty-fourth TASK-336-19 implementation family targets Rich Text Section
raw source authoring in Advanced and raw color-token inputs in Visual.

- Rich Text Section Visual no longer exposes raw CSS/token text inputs for text
  or background color authoring. Existing theme tokens, transparent values, and
  custom color strings remain compatible as saved custom color state that can
  be replaced with a swatch or cleared.
- Rich Text Section Advanced no longer edits `options.outputMode` or raw
  `body.html`. It reports read-only output/source, sanitizer, sanitized
  preview, and payload diagnostics.
- Visual owns `options.outputMode` through a friendly source-preference control
  so saved `html`/`blocks` widgets can still change rendered source without
  using Advanced.
- Normalize and reset remain available only as confirm-gated support actions.
- Focused Vitest evidence covers raw-token input absence, read-only Advanced
  source diagnostics, confirm-gated support actions, SSR editor metadata, and
  strict editor contracts:
  `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/rich-text-section-editor-wave.test.tsx tests/vitest/widgets/richTextSection.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-rich-text-section-source-color-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.

## TASK-336-19 Compare Timeline Advanced Diagnostics Evidence (2026-05-25)

The twenty-fifth TASK-336-19 implementation family targets Compare Timeline
Advanced raw metadata and writable behavior drift.

- Compare Timeline Advanced no longer exposes editable Add/Remove step, guide
  style, raw step ID, raw step description, or highlight target controls.
- Advanced now reports read-only runtime layout, guide, highlight,
  motion/order, normalized track ID, axis step ID, description, and step-count
  diagnostics.
- Compare Timeline Visual color fields now use swatch-only authoring. Saved
  custom token/CSS values stay compatible as replace-or-clear state instead of
  editable raw text fields, and fresh defaults now use swatch-safe color values
  instead of seeded CSS variables.
- Compare Timeline Visual now exposes explicit `data-widget-control-path`
  ownership metadata for the visible daily-editing controls, so targeted smoke
  evidence no longer reports an empty Visual path set. The published fixture
  covers the non-highlight Visual state; the focused editor-wave suite covers
  highlight-only Visual ownership paths.
- Payload normalization remains available only as a confirm-gated support
  action, so opening Advanced or clicking the initial normalize button does not
  mutate widget data.
- Focused Vitest evidence covers read-only Advanced
  diagnostics, confirm-gated normalization, SSR editor metadata, and strict
  editor contracts:
  `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx tests/vitest/widgets/compareTimeline.test.tsx tests/vitest/widgets/editorContract.test.ts`.
- Targeted Playwright mode/public smoke evidence is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-compare-timeline-advanced-readonly-2026-05-25.*`
  and reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`, and
  `metadataGaps=0`.
- The smoke runner now normalizes long `playwright-cli` session names before
  opening browser sessions; this avoids false `auth_state_load_failed` results
  when descriptive task names exceed the CLI session-name limit.

## Claude and Helper Agent Review Summary

- Accepted: keep `Wizard`, `Visual`, and `Advanced` as the internal widget
  contract roles, but expose `Wizard` only as an initial/reopened setup flow in
  the page-builder shell after TASK-336-16.
- Accepted: add a soft validator before strict 38-widget enforcement so current
  widgets can migrate in dependency order.
- Accepted: treat Advanced as read-only diagnostics for Visual-owned values
  unless a path is explicitly technical-only.
- Rejected: using Claude or helper-agent findings as executable proof without
  local code/test/Playwright validation.

## Validation Not Performed

- Full admin dynamic traversal for all 38 widgets was not completed. Changing
  editor tabs mutates editor state and triggered unsaved-change dialogs in the
  current admin session, so admin mode findings above are source-backed rather
  than claimed as complete browser traversal.
- No production code was changed.
- No lint/typecheck/test lanes were run for this report-only audit.
