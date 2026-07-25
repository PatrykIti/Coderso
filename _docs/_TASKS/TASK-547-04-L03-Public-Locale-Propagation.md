# TASK-547-04-L03: Public Locale Propagation
# FileName: TASK-547-04-L03-Public-Locale-Propagation.md

**Parent Subtask:** TASK-547-04
**Priority:** High
**Category:** Public Runtime / Accessibility / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-547-04-L02
**Status:** 🚧 In Progress
**Validation:** The string-shell sink and current branch threading exist, but
the compatibility-safe locale policy, exact settings seam and complete
synthetic copy/persistence matrix remain open. Installed-package request and
browser evidence are downstream TASK-547-06 handoffs, not completion claims for
this leaf.

## Overview

Make the validated `site.locale` setting drive the string document shell's
`<html lang>` for both Page and dynamic-entry public renderers. Every pinned
prototype HTML document uses `<html lang="pl">`, and L02 installs
`site.locale:"pl"`; this leaf propagates that value without introducing
multilingual routing, translated authored Page/entry content or a parallel JSX
document shell. It also localizes the existing native listing/filter chrome
required to render that Polish Page coherently; this bounded site-level runtime
copy is not an authored-content translation system.

## Exact Ownership

This leaf is the sole writer for:

- `core/services/settings/siteLocale.ts`
- `core/services/settings/settingsService.ts`
- `core/services/pages/pageRuntimeBindingContract.ts`
- `core/services/pages/pageRuntimeDataPreparation.ts`
- `core/site/renderPublicPage.tsx`
- `core/site/renderPublicEntry.tsx`
- `core/site/publicDocumentShell.ts`
- `core/server/publicSite.tsx`
- `core/server/publicSiteAssets.ts`
- `core/server/publicSiteRenderContext.ts`
- `core/server/publicSiteRouteRuntime.ts`
- `core/server/publicSiteRoutePrecedence.ts`
- `core/server/publicSitePageRuntime.tsx`
- `core/server/publicSiteEntryRuntime.tsx`
- `core/widgets/core/listingFilters.tsx`
- `core/widgets/core/listingFiltersContract.ts`
- `core/widgets/core/listingFiltersRenderer.tsx`
- `tests/vitest/pages/public-page-locale.test.tsx`
- `tests/vitest/content/public-entry-locale.test.tsx`
- `tests/vitest/kits/projekty-domow-listing-locale.test.tsx`
- `tests/vitest/kits/projekty-domow-route-precedence.test.ts`
- `tests/unit/settings/settingsService.test.ts`

L02 exclusively owns the package seed/assembler assertion; L03 only consumes the
installed setting. Do not edit Page copy, package resources or multilingual
product contracts.

`core/services/settings/settingsService.ts` is already at the 1,000-line hard
limit on the current working tree. No new behavior may be appended to it: if a
corrective locale change is required, first extract the cohesive locale setting
responsibility while preserving public imports. Every production and test file
above must finish at or below 1,000 physical lines; split tests by independently
runnable contract rather than weakening or deleting assertions.

## Locale Contract

- `DEFAULT_SITE_LOCALE` remains the current safe default (`en`).
- Preserve the existing `site.locale` producer/write contract: setup, assistant
  and setting APIs may continue storing any non-blank bounded string. This leaf
  does not narrow writes or destructively rewrite existing locales.
- `siteLocale.ts::resolvePublicDocumentLanguage(value)` owns only the public
  sink policy. It canonicalizes a safe bounded ASCII BCP-47-like tag with a
  2-3-letter primary subtag and subsequent 1-8 alphanumeric subtags, including
  `pl`, `pl-PL`, `es-419` and `zh-Hant`; malformed legacy values fall back to
  `en` at the sink without changing the stored/read/list value.
- `siteLocale.ts::resolvePrimarySiteLanguage(value)` uses that same
  compatibility-safe grammar and returns the lowercase primary subtag for
  runtime chrome selection. No second locale regex is permitted.
- The selected public render branch reads `site.locale` once and threads that
  value through its Page, listing or detail renderer. The current runtime has no
  `buildPublicSiteRenderContext` locale owner; do not claim or call one unless a
  separately justified refactor introduces and tests it.
- Page `/`, listing `/projekty` and dynamic detail `/projekty/aurora` all produce
  `document.documentElement.lang === "pl"` after the L02 package is installed.
- Preview/cache/render branches use the same normalized value and do not fork a
  second locale policy.

## Settings Seam Contract

`settingsService.ts` remains the sole owner of
`normalizeSettingValueForWrite(key, value): string | null`. TASK-547-02-L02's
atomic batch service imports this exact pure normalizer and owns locking/CAS and
rollback; it must not duplicate setting validation. After those callers migrate,
this leaf removes or privatizes the weaker installer-facing
`applySettingsBatch` and `restoreSettingsBatchRaw` exports and proves no
installer, compensation or acceptance path imports them. General settings APIs
and non-locale values retain their existing behavior.

## Native Listing Chrome Localization Contract

For a normalized locale whose primary language subtag is `pl` (including `pl`
and `pl-PL`), `resolvePageListingRuntimeCopy` returns the following exact,
complete runtime-owned copy. Every other locale, an absent locale and a malformed
stored locale return `null` and preserve the legacy English/native path.

Filter headings and Page-authored fallbacks:

| Key | Exact Polish value |
| --- | --- |
| `title` | `Filtruj wyniki` |
| `description` | `Zawęź wyniki za pomocą dostępnych filtrów.` |
| `searchLabel` | `Szukaj` |
| `searchPlaceholder` | `Szukaj w wynikach...` |
| `applyLabel` | `Zastosuj filtry` |

The present-only `ListingFiltersCopy` shape has exactly these 22 optional keys:

| Key | Exact Polish value |
| --- | --- |
| `configurationAriaLabel` | `Konfiguracja filtrów wyników` |
| `configurationHint` | `Wybierz zapisane zapytanie, aby włączyć filtry.` |
| `activeFilterSingular` | `aktywny filtr` |
| `activeFilterPlural` | `aktywne filtry` |
| `activeRangeFromLabel` | `Od` |
| `activeRangeUpToLabel` | `Do` |
| `activeSearchLabel` | `Szukaj` |
| `clearAllLabel` | `Wyczyść wszystko` |
| `autoApplyLabel` | `Wyniki aktualizują się automatycznie.` |
| `loadingLabel` | `Aktualizowanie wyników...` |
| `errorLabel` | `Nie udało się odświeżyć wyników. Spróbuj ponownie.` |
| `rejectedLabel` | `Pominięto nieprawidłowe parametry filtrów.` |
| `drawerLabel` | `Panel filtrów` |
| `emptyOptionsLabel` | `Brak dostępnych opcji.` |
| `optionSearchTemplate` | `Szukaj w opcjach: {facet}` |
| `defaultOrderLabel` | `Domyślna kolejność` |
| `dateFromLabel` | `Od` |
| `dateToLabel` | `Do` |
| `rangeMinLabel` | `Minimum` |
| `rangeMaxLabel` | `Maksimum` |
| `rangeMinSliderLabel` | `Suwak minimum` |
| `rangeMaxSliderLabel` | `Suwak maksimum` |

FormaDom collection chrome intentionally emits no visible CTA label: the whole
card remains the semantic link, matching the pinned project cards. Empty-state
copy is exactly `emptyTitle:"Brak wyników"` and
`emptyDescription:"Zmień filtry, aby zobaczyć inne projekty."`. The native
empty state is an accepted source-absent adaptation and must be recorded by L02;
it never instructs an unauthenticated visitor to publish content.

`ListingFiltersCopy` is a generic strict widget contract, not a Page document
key. Its object is optional/present-only, rejects unknown properties and
wrong-type values, and each string has schema maximum 240 characters. The
direct normalizer defensively trims known strings, omits blanks and slices an
overlong normalized string to 240; widget payload schema validation still
rejects an overlong or unknown external value before persistence. Omitting the
object emits no key and preserves legacy normalized data and rendered bytes.
Normalization is idempotent and retains the exact 22-key allowlist order.

Precedence is frozen:

- filter `title` and `description` use the locale-owned native chrome;
- a non-blank Page-authored `searchLabel`, `searchPlaceholder` or `applyLabel`
  wins, otherwise the locale value above is used;
- the 22 state/accessibility labels come from the locale map as one present-only
  object; facets, aliases, resolved metrics and query state are unchanged;
- FormaDom suppresses native/template CTA text while preserving the whole-card
  link; listing-template empty-state title/description win localized
  empty-state copy when present, otherwise localized copy wins the native/Page
  fallback;
- without Polish locale, `mapPage*` data is returned without a `copy` key and
  no locale branch may rewrite authored or template values.

## String-Shell And Security Contract

No endpoint is added. The public runtime already owns a string HTML document
shell; locale must be inserted only through
`core/site/publicDocumentShell.ts::buildPublicDocumentShell`. Do not create a
React `<html>` wrapper.

Normalize first, escape exactly once for the quoted `lang="..."` attribute sink,
and interpolate only the escaped result. Raw setting data must never reach HTML,
CSS, scripts, debug payloads, browser storage or cache keys. Invalid/missing
values resolve to the default rather than throwing a public 500. The same helper
is used by Page and entry shells so security and output bytes cannot drift.

## Security Contract

- **Visibility:** public-read only; this leaf changes no endpoint and adds no
  endpoint.
- **Authentication:** none, matching the existing public render path.
- **Authorization/RBAC:** none; no role, permission or privilege changes.
- **CSRF:** not applicable to reads; this leaf introduces no mutation.
- **Rate limiting and anti-abuse:** no public write exists, so no write
  rate-limit bucket, nonce, signature/HMAC or CAPTCHA policy applies.
- **Validation:** strict settings/document normalization and reject-unknown
  boundaries remain in force. Invalid or unknown data must fail closed before
  reaching the public renderer.
- **HTML sink:** normalize the locale first, then escape exactly once for the
  quoted `lang="..."` attribute. No raw settings/document value reaches HTML.

## Implementation Pseudocode

```ts
export const resolvePublicDocumentLanguage = (value: unknown): string =>
  normalizePublicSiteLocale(value) ?? DEFAULT_SITE_LOCALE;

export const resolvePageListingRuntimeCopy = (
  siteLocale: unknown,
): PageListingRuntimeCopy | null => {
  return resolvePrimarySiteLanguage(siteLocale) === "pl"
    ? POLISH_PAGE_LISTING_RUNTIME_COPY
    : null;
};

export function buildPublicDocumentShell(input: {
  language: unknown;
  headHtml: string;
  bodyHtml: string;
}): string {
  const language = escapeHtmlAttribute(
    resolvePublicDocumentLanguage(input.language),
  );
  return `<!doctype html><html lang="${language}">...`;
}

// Existing branch-local helpers; handlePublicRequest selects exactly one.
const renderPublicPageHtmlInternal = async (page: PublicPageData) => {
  const siteLocale = await getSetting("site.locale");
  return renderPublicPageV2RuntimeHtml({
    // existing prepared Page render arguments
    siteLocale,
  });
};

const renderEntryListHtml = async (typeSlug: string) =>
  renderPublicEntryListHtml({
    // existing prepared list arguments
    siteLocale: await getSetting("site.locale"),
  });

const renderEntryDetailHtml = async (typeSlug: string, routeValue: string) =>
  renderPublicEntryDetailHtml({
    // existing prepared detail arguments
    siteLocale: await getSetting("site.locale"),
  });
```

**Data flow:** selected request branch → one setting read → Page/list/detail
render option → strict locale normalizer/default → optional present-only native
listing chrome plus the shared escaped string shell. Raw settings data reaches
only normalizer-owned `unknown` inputs and never an unescaped document sink.

**Error handling:** preserve compatible stored writes; sanitize/fallback invalid
legacy values only at the public sink; never fail an otherwise renderable public
page because locale is absent or bad.
Route precedence still selects static Pages before content-route matching and
must not regress while the legacy `publicSite.tsx` orchestrator is split.
Reject unknown/wrong-type/overlong external filter-copy fields; the direct
normalizer trims, blank-omits and defensively bounds known values.

## Regression Tests

- `tests/vitest/pages/public-page-locale.test.tsx`: explicit Polish, absent
  default, malformed fallback and escaped string-shell output for a Page.
- `tests/vitest/content/public-entry-locale.test.tsx`: the same contract for
  listing/detail entry rendering.
- `tests/vitest/kits/projekty-domow-listing-locale.test.tsx`: synthetic FormaDom
  Page/listing fixtures prove the pure runtime-preparation and string-render
  seams use Polish visitor copy and `lang`; pin the exact five filter headings,
  all 22 copy keys/values, both collection empty-state strings, absence of
  visible CTA copy, `pl`/`pl-PL` primary-language matching, every precedence
  branch, strict wrong-type/unknown/241-
  character rejection, direct-normalizer 1/240/241 behavior, idempotent round
  trip through the real validator/persistence boundary and
  absent/non-Polish/malformed legacy byte identity. This is not a DB
  install/request test and must never be reported as one.
- `tests/vitest/kits/projekty-domow-route-precedence.test.ts`: proves only static
  Page versus content-route precedence. It contains no locale input/assertion
  and is intentionally not locale evidence.
- `tests/unit/settings/settingsService.test.ts`: preserve non-blank stored locale
  compatibility, including `es-419` and `zh-Hant`; prove malformed values fall
  back only at the HTML/runtime-copy sink; pin the exact exported setting
  normalizer and absence of weaker installer/compensation imports.

Named suites must assert the emitted `<html lang>` string/DOM value, not merely a
helper return. Each remains independently runnable and below 1,000 lines.

Downstream handoff: TASK-547-06's scoped DB/Bun installed-site lane must call the real
`handlePublicRequest` after applying the package and assert `<html lang="pl">`
for `/`, static `/projekty` and dynamic `/projekty/aurora`. It then rolls the run
back and proves the previous locale was restored. The final browser smoke repeats
the DOM assertion on `/` and `/projekty/aurora`; neither acceptance layer may be
replaced by the synthetic Vitest fixture.

## Sub-Tasks

- [x] Thread locale through the current Page and entry render branches.
- [x] Split the touched legacy public-site module into cohesive bounded modules.
- [ ] Replace the narrowing write/read policy with the compatibility-safe public
  sink policy and complete the exact 22-key/precedence/persistence matrix.
- [ ] Freeze the exported setting normalizer seam and remove weaker installer
  batch/raw-restore imports after TASK-547-02-L02 migration.
- [ ] Hand the installed `handlePublicRequest` and browser assertions to
  TASK-547-06; they do not block this earlier leaf's own completion gate.

## Testing Requirements

- the five named unit/Vitest suites above;
- relevant Bun public Page/list/detail/preview/cache and route suites; every
  DB-targeted command/test uses at least `360000ms` timeout under the shared
  Render database policy;
- `bun --cwd core lint`, `bun --cwd core lint:types`;
- `wc -l` over every owned production/test file, treating >1,000 as a failed
  gate;
- a downstream TASK-547-06 handoff for visible DOM language and rollback smoke,
  not a smoke requirement executed by this leaf.

## Documentation Updates Required

Send the validated locale/default/string-shell behavior and test evidence to
TASK-547-06; do not edit shared docs, board or changelog from this leaf.
