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
- Admin mode failures: 27 widgets.
- Public CSS failures: 2 widgets: `testimonials`, `team`.
- Fixture gaps: 9 public/admin fixture gaps, including missing standalone
  public fixtures and empty-state-only public pages.
- Metadata gaps: 11 widgets with missing control-path ownership metadata.

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
| `form-embed` | draft only | yes | No published public fixture found in current page list. |
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
| `form-embed` | Advanced still exposes writable form selection repeated from Wizard/Visual. | Technical diagnostics and form source ownership are mixed. |
| `hero` | Advanced says it owns technical layout controls, but repeats background color, gradient, media, and overlay fields from Visual. | High user-facing widget, high confusion risk. |
| `stats-kpi` | Advanced repeats alignment, spacing, value color, label color, and card surface from Visual. | Token ownership is not enforceable. |

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
- Booking/form/table widgets still expose surface/style fields in Wizard.
- Some booking diagnostics are writable, including runtime-like error text.
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

1. Create missing Playwright coverage for `template-section`, `search-box`, and
   a published `form-embed` page.
2. Fix P0 editor ownership:
   `TemplateSectionEditors.tsx`, `SearchBoxEditors.tsx`,
   `ListingFiltersEditors.tsx`.
3. Fix P1 Advanced duplication in tabs, accordion, posts-feed, form-embed, hero,
   and stats-kpi.
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

## Claude and Helper Agent Review Summary

- Accepted: keep `Wizard`, `Visual`, and `Advanced` as the internal contract
  until the one-time Wizard migration is test-backed.
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
