# TASK-256-07: Dynamic Navigation and Content Widget Findings

# FileName: TASK-256-07_Dynamic_Navigation_and_Content_Widget_Findings.md

**Priority:** High
**Category:** Widgets + Dynamic Content + Navigation + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04
**Status:** To Do

---

## Overview

Repair report drift in dynamic/operational widgets covered by the current
Playwright audit:

- `content-list`
- `navigation`
- `posts-feed`
- `entry-teaser`
- `listing-filters`

The main shared pattern is truthful controls: editor fields that are visible
must either affect runtime output or clearly explain why they are unavailable
for the active variant/source.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md:66-87,268-280` reports
  pagination/title/view-all scope, columns/gap controls visible for variants
  where they do not apply, content-type dropdown drift, and missing `textColor`
  clear behavior.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:74-84,142-151,207-214,327-333,380-406,412-414`
  reports inert `collapseOnScroll`, unimplemented `minimal` mobile mode, mobile
  menu state/CTA duplication, `logo.href` not rendered, hash href validation
  drift, external-link target/rel drift, hover-only dropdown accessibility,
  mobile focus-trap gaps, and sticky behavior blocked by section overflow.
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:129-193,236-278` reports
  source/manual/sort truthfulness gaps, hidden `textColor` despite schema
  support, unresolved image/media mapping, category copy drift, and accessibility
  findings that must be mapped to the existing content-list/posts-feed contract
  before implementation.
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md:54-116,128-136` reports
  dynamic teaser product requests plus editor/source/CTA/runtime-state
  truthfulness issues that must be separated from future feature expansion.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:67-139,159-166` reports
  listing filter product requests plus facet/editor/runtime truthfulness,
  URL-state, and accessibility findings that must be mapped to the listing
  runtime contract before implementation.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Content-list columns/gap controls visible for variants that ignore them | Fix here | `ContentListEditors.tsx` | None |
| Content-list `textColor` clear gap | Fix here through TASK-256-02 helpers | `ContentListEditors.tsx` | None |
| Content-list pagination and view-all/load-more | Future product scope because no current control promises runtime pagination/navigation | Future content-list task | TASK-256-08 creates follow-up |
| Content-list section title | Future product scope unless an existing editor control is added before implementation | Future content-list task | TASK-256-08 creates follow-up |
| Content-list duplicate/technical content-type dropdown options | Fix here if owned by widget editor option loading; otherwise create picker cleanup follow-up with owner | `ContentListEditors.tsx`, content-type option owner | TASK-256-08 creates follow-up if owner is outside widget |
| Content-list empty-state copy and disabled listing toggles | Fix here because current controls/copy can mislead editors | `ContentListEditors.tsx`, `contentList.tsx` | None |
| Content-list duplicated source mode selector and technical labels | Fix here if label/source-mode copy is widget-owned; otherwise document shared selector owner | `ContentListEditors.tsx` | TASK-256-08 creates follow-up if shared resource picker owns it |
| Content-list image height, tag badges, taxonomy autocomplete, author picker, variant/card previews, color picker, CTA fallback, and loading-state polish | Future product/editor UX scope unless a current visible control is misleading | Future content-list task or shared picker task | TASK-256-08 records deferrals |
| Content-list ignored `statusScope` and stale disabled fields in listing mode | Fix here with disabled-state copy and stale-value hiding/preservation | `ContentListEditors.tsx`, `contentList.tsx` | None |
| Content-list canvas preview communication | Fix here only if report shows stale preview for a current control | Page-builder preview owner plus content-list editor | Otherwise defer via TASK-256-08 |
| Navigation `logo.href` not rendered | Fix here with safe href normalization | `navigation.tsx`, `NavigationEditors.tsx` | None |
| Navigation hash validation differs from runtime safe href support | Fix here and menu validation tests | `NavigationEditors.tsx`, menu validation owner | None |
| Navigation external links lack target/rel ownership | Fix here through the existing widget safe-href/external-link owner | `navigation.tsx`, `NavigationEditors.tsx`, `widgetSafeHref.test.ts` | None |
| Navigation `collapseOnScroll` is an inert runtime flag | Fix here or hide/disable the control until runtime exists | `navigationRuntimeClientScript`, `NavigationEditors.tsx`, `navigation.tsx` | None |
| Navigation `minimal` mobile mode renders like drawer | Fix here or relabel/remove the mode | `navigation.tsx`, `NavigationEditors.tsx` | None |
| Navigation mobile menu open state and duplicate mobile CTA | Fix here with scoped runtime state/ARIA and non-duplicated CTA output | `navigationRuntimeClientScript`, `navigation.tsx` | None |
| Navigation hover-only dropdowns, missing `aria-expanded`, touch failure, keyboard-inaccessible submenu, and mobile focus trap | Fix or explicitly defer as navigation accessibility follow-up before closure; do not leave unclassified | `navigation.tsx`, `navigationRuntimeClientScript`, `NavigationEditors.tsx` | TASK-256-08 creates follow-up only if implementation requires broader menu behavior work |
| Navigation sticky blocked by section overflow | Fix or document with exact wrapper owner | `core/widgets/core/section.tsx:327-331`, `core/widgets/core/navigation.tsx:487` | TASK-256-08 must create follow-up if not fixed |
| Navigation broader menu IA/product requests such as icon fields, rich descriptions, drag/drop, and larger link limits | Future product scope unless needed for broken current behavior | Navigation future task | TASK-256-08 records deferral |
| Posts-feed sort visible in manual mode | Fix here as truthful-control drift because resolver ignores sort for manual order | `PostsFeedEditors.tsx`, `postsFeedResolver.ts:180-220` | None |
| Posts-feed `textColor` exists in schema/defaults but is not exposed as a clearable editor control | Fix here through TASK-256-02 shared clear semantics | `PostsFeedEditors.tsx`, `postsFeed.tsx:225-395` | None |
| Posts-feed image/thumbnail and resolver image mapping requests | Classify before implementation: fix here only if existing content-list shared media fields are already promised by the current contract; otherwise future product scope | `postsFeed.tsx`, `postsFeedResolver.ts`, `contentList.tsx` | TASK-256-08 records deferral if it requires new media feature scope |
| Posts-feed category copy suggests unsupported multi-tag behavior | Fix here as truthful-control/copy drift | `PostsFeedEditors.tsx`, `postsFeedResolver.ts` | None |
| Posts-feed pagination, view-all, author/date/tag filters, RSS/export, animation, and search-query filters | Future product scope unless an existing visible control promises the behavior | Future posts-feed task | TASK-256-08 records deferral |
| Entry-teaser source-mode jargon, duplicated source controls, split fallback controls, custom URL validation, and runtime error/missing-source state | Fix here where current controls mislead editors or runtime output; otherwise create a dynamic widget UX follow-up | `EntryTeaserEditors.tsx`, `entryTeaser.tsx`, `entryTeaserResolver.ts` | TASK-256-08 records deferral only for broader product UX |
| Entry-teaser section title, image sizing, tag-limit configurability, CTA target/style, max-width, icon/logo mode, and richer variant previews | Future product scope unless an existing visible control promises the behavior | Future entry-teaser task | TASK-256-08 records deferral |
| Listing-filters editable facet IDs, free-text fields/operators, option parsing, missing query feedback, redundant apply button, URL page reset, and facet a11y | Fix or explicitly defer through the listing runtime/filter contract; no unclassified runtime-facing drift | `ListingFiltersEditors.tsx`, `listingFilters.tsx`, `filterContract.ts`, `listingRuntimeScript.ts` | TASK-256-08 creates follow-up if implementation requires broader listing runtime work |
| Listing-filters layout variants, pagination controls, active-filter chips, taxonomy trees, range/date pickers, multi-select, collapsible facets, and max-width | Future product scope unless current controls promise the behavior | Future listing-filters task | TASK-256-08 records deferral |

## Sub-Tasks

- [ ] Hide or disable content-list layout controls that do not affect the active
  variant.
- [ ] Add missing content-list clear behavior for `textColor`.
- [ ] Fix or explicitly defer content-list content-type dropdown cleanup,
  empty-state copy, disabled listing toggles, pagination, section title, and
  view-all findings according to the scope matrix.
- [ ] Classify the remaining content-list report IDs during implementation:
  image height, tag badges, duplicated source mode, taxonomy autocomplete,
  author picker, technical labels, variant previews, color picker, hidden CTA,
  loading state, ignored status scope, and stale disabled fields.
- [ ] Align navigation editor hash validation with runtime safe-href behavior.
- [ ] Render `logo.href` safely when configured.
- [ ] Add target/rel semantics for external navigation links through the shared
  safe-link contract.
- [ ] Implement or hide `collapseOnScroll` until it has runtime behavior.
- [ ] Implement or relabel/remove `minimal` mobile mode so it no longer behaves
  identically to drawer.
- [ ] Add mobile menu open-state text/icon/ARIA and remove duplicated mobile CTA.
- [ ] Assign or defer hover/touch/keyboard dropdown accessibility and mobile
  focus-trap findings with explicit follow-up if broader menu behavior is out
  of this leaf.
- [ ] Decide sticky navigation ownership with the section/layout wrapper and
  either fix it or document the constraint.
- [ ] Hide/disable or explain posts-feed sort when manual source mode owns the
  display order.
- [ ] Add posts-feed `textColor` clearable exposure only through the shared
  clear/none-token contract.
- [ ] Classify posts-feed image/media findings against the existing
  content-list/posts-feed contract before implementing or deferring.
- [ ] Fix posts-feed category copy if it promises multi-tag behavior that the
  resolver does not support.
- [ ] Classify entry-teaser source/CTA/runtime-state findings as shared
  truthful-control or safe-link contract work before implementing.
- [ ] Defer entry-teaser product expansions such as section title, image sizing,
  tag limits, CTA style, and max-width unless a current control already promises
  the behavior.
- [ ] Classify listing-filters facet/editor/runtime findings against the
  existing listing runtime token contract before implementing.
- [ ] Defer listing-filters product expansions such as layout variants,
  pagination widgets, active-filter chips, pickers, multi-select, and collapsible
  panels unless a current control already promises the behavior.

## Files to Change

| Widget | Files and line refs | Required change |
|---|---|---|
| `content-list` | `core/widgets/core/contentList.tsx:145-156,256-267`; `core/admin/ui/widgets/editors/ContentListEditors.tsx` | Hide/disable columns and gap where variants ignore them; add `textColor` clear; keep resolved content data unchanged. |
| `navigation` | `core/widgets/core/navigation.tsx:25-32,391-405`; runtime script owner `navigationRuntimeClientScript`; dropdown/mobile render around `navigation.tsx:440-516`; `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Render normalized `logo.href`; align editor URL validation with `normalizeWidgetSafeHref`/hash support; add safe external-link target/rel; implement or hide `collapseOnScroll`; make `minimal` mobile mode truthful; add mobile menu open-state/ARIA, dropdown keyboard/touch ownership, focus-trap decision, and avoid duplicate CTA. |
| `posts-feed` | `core/admin/ui/widgets/editors/PostsFeedEditors.tsx:184-670`; `core/widgets/core/postsFeed.tsx:225-395`; `core/services/content/postsFeedResolver.ts:180-219` | Make manual-mode sort truthful; expose `textColor` only via shared clear semantics; classify image/media mapping before expanding product scope; align category copy with resolver behavior. |
| `entry-teaser` | `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx:577-932`; `core/widgets/core/entryTeaser.tsx:314-563`; `core/services/content/entryTeaserResolver.ts:84-101` | Make source/CTA/runtime-state controls truthful, preserve safe-link behavior, and classify product-only visual requests before implementation. |
| `listing-filters` | `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx:211-676`; `core/widgets/core/listingFilters.tsx:286-591`; `core/widgets/core/listingRuntimeScript.ts`; `core/services/search/filterContract.ts` | Align facet editor controls with normalized runtime tokens, expose validation/disabled-state copy where values are rejected, and classify product-only filter widgets before implementation. |
| `section/layout wrapper` | `core/widgets/core/section.tsx:327-331`; `core/widgets/core/navigation.tsx:487` | Fix or document `overflow-hidden` conflict when sticky navigation is nested inside a section. |
| `menu editor validation` | `tests/vitest/ui/menu-editor-validation.test.ts` | Ensure `#` menu links are valid where runtime permits hash links. |

## Implementation Pseudocode

```tsx
function ContentListStyleControls({ variant, value, onChange }: Props) {
  const supportsGridLayout = variant === "cards";

  return (
    <WidgetEditorSection id="content-list.style" title="Style">
      {supportsGridLayout ? (
        <ColumnsAndGapControls value={value} onChange={onChange} />
      ) : (
        <ReadOnlyControlHint control="Columns" reason="List and compact variants use one column." />
      )}
      <ClearableInputField
        label="Text color"
        value={value.style?.textColor}
        onChange={(textColor) => updateStyle({ textColor })}
        onClear={() => clearStyleField("textColor")}
      />
    </WidgetEditorSection>
  );
}
```

Navigation logo shape:

```tsx
function renderNavigationLogo(logo: NavigationLogo) {
  const content = logo.type === "image" ? <img src={logo.value} alt={logo.alt ?? ""} /> : <span>{logo.value}</span>;
  const href = normalizeNavigationHref(logo.href);

  if (!href) return content;

  return (
    <a href={href} aria-label={logo.alt ?? logo.value}>
      {content}
    </a>
  );
}
```

Error handling:

- Do not break existing pages where content-list style values are saved for
  non-card variants; preserve the payload but hide/disable irrelevant controls.
- Navigation hash links must match the same safe-href policy in editor and
  runtime.
- Sticky behavior should not be faked if the wrapper prevents CSS sticky from
  working.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve content-list/navigation schemas.
- Listing runtime visibility: public/anonymous runtime rendering may issue
  listing refresh requests only through the existing public listing runtime
  contract; this leaf must not add admin-only endpoints or require admin auth
  for public filter interaction.
- Listing runtime auth/RBAC: no admin session, RBAC role, or privileged listing
  diagnostics may be exposed to the browser. Runtime responses must stay scoped
  to the public listing query output already allowed for the page.
- Listing runtime CSRF: filter interactions are read-only URL/query refreshes,
  not writes. Do not introduce CSRF-exempt mutation routes or public write
  behavior.
- Listing runtime rate/cache: preserve existing public runtime caching and
  refresh behavior. If a leaf changes AJAX refresh frequency, add a
  rate-limit/cache owner note and a targeted regression test.
- Listing token validation: all URL tokens, facet IDs, operators, rejected
  tokens, search values, and sort values must normalize through the existing
  listing filter contract; unknown or invalid tokens must be rejected or ignored
  deterministically instead of reflected into DOM/script output.
- Anti-abuse: navigation/logo/CTA hrefs must use existing safe-href
  normalization and must not allow script/data URL injection. Listing runtime
  scripts must remain static or explicitly escaped; no user-authored facet,
  query, or token value may become executable JavaScript.
- Secret handling: no secrets in navigation/content-list payloads or debug
  reports. Listing runtime diagnostics must not expose private query internals,
  provider keys, unpublished admin metadata, or privileged URLs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
- `bun test tests/unit/widgets/contentList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  navigation external-link semantics change.
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx` if sticky
  wrapper behavior changes.
- `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- `bun test tests/unit/widgets/entryTeaser.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/search/listingRuntimeService.test.ts`
- `bun run test:vitest -- tests/vitest/ui/menu-editor-validation.test.ts`
  covering `href="#"` where applicable.
- Update `tests/unit/widgets/validator.test.ts`,
  `tests/unit/widgets/registry.test.ts`, or
  `tests/unit/widgets/runtimeRegistry.test.ts` if schema/default/registration
  behavior changes.
- Add a focused sticky-wrapper regression test if section wrapper behavior
  changes.
- Run targeted Vitest suites, `bun --cwd core lint`, and
  `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTENT_LIST.md`, `_docs/_WIDGETS/NAVIGATION.md`,
  `_docs/_WIDGETS/POSTS_FEED.md`, `_docs/_WIDGETS/ENTRY_TEASER.md`, and
  `_docs/_WIDGETS/LISTING_FILTERS.md` if editor/runtime behavior changes.
- Update Playwright reports with fixed/deferred evidence.
- Update `_docs/WIDGETS.md` only if a shared href/control-visibility contract
  changes.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Content-list controls are truthful for the active variant.
- `textColor` clear behavior matches shared clear semantics.
- Navigation logo links render when configured and remain safe.
- Editor hash validation matches runtime hash support.
- Sticky navigation is either fixed with tests or documented as a layout
  ownership constraint with a follow-up task.
- Posts-feed manual/source controls are truthful, `textColor` follows shared
  clear semantics, and product-scope image/media requests are fixed only if
  they already belong to the shared posts-feed/content-list contract.
- Entry-teaser and listing-filters findings are either mapped to existing shared
  dynamic-widget contracts with tests or deferred as future product scope by
  TASK-256-08.
