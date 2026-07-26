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

L01 exclusively owns `pageRuntimeBindingContract.ts`, including its existing
optional `siteLocale` input and collection/Form prop mappers; L03 consumes those
types/mappers read-only while threading the installed setting through
`pageRuntimeDataPreparation.ts`. L02 exclusively owns the package
seed/assembler assertion. Do not edit Page copy, package resources or
multilingual product contracts.

TASK-547-02-L02 exclusively owns `settingsService.ts`, pure `siteLocale.ts` and
`settingsService.test.ts`; this leaf imports their committed exports read-only.
Every production/test file above finishes at or below 1,000 physical lines;
split owned tests by independently runnable contract rather than weakening them.

## Locale Contract

- Consume TASK-547-02-L02's `resolvePublicDocumentLanguage` and
  `resolvePrimarySiteLanguage` exactly; `DEFAULT_SITE_LOCALE` and
  `normalizePublicSiteLocale` remain owner implementation/test exports. This leaf
  neither validates stored writes nor defines a second locale regex.
- L02 preserves any non-blank stored string up to its fixed 255-UTF-16-code-unit
  bound.
  Its public resolver alone applies the safe ASCII BCP-like grammar to `pl`,
  `pl-PL`, `es-419` and `zh-Hant`; malformed raw values fall back to `en` only
  at the sink. This leaf must not canonicalize or rewrite the stored/read value.
- The selected public render branch reads `site.locale` once and threads that
  value through its Page, listing or detail renderer. The current runtime has no
  `buildPublicSiteRenderContext` locale owner; do not claim or call one unless a
  separately justified refactor introduces and tests it.
- Page `/`, listing `/projekty` and dynamic detail `/projekty/aurora` all produce
  `document.documentElement.lang === "pl"` after the L02 package is installed.
- Preview/cache/render branches use the same normalized value and do not fork a
  second locale policy.

## Settings Seam Contract

L02-owned `settingsService.ts` is the sole owner of
`normalizeSettingValueForWrite(key, value): { key: SettingKey; value:
SettingValueMap[SettingKey] }`. The result remains object-shaped and preserves
the complete settings value union, including strings, null, booleans, numbers,
arrays and objects. Callers consume `.value` (and the canonical `.key` where
needed) rather than treating the result itself as the normalized primitive.
TASK-547-02-L02 already owns validation, atomic locking/CAS, raw rollback, cache
invalidation and the absence of `applySettingsBatch`/`restoreSettingsBatchRaw`.
TASK-547-04-L03 only calls `getSetting("site.locale")` and passes that unknown
raw value to the owner resolver at the public render boundary.

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

TASK-547-03-L02 authors the package-specific Polish listing-template empty state,
and TASK-547-04-L01 authors `props.showCta:false`. This generic locale helper
owns neither value: it must preserve the resolved template empty state and Page
CTA suppression byte-for-byte, never synthesize project copy or a CTA label.

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
- authored listing-template empty state and Page `showCta` always retain normal
  presentation precedence; locale copy cannot rewrite either value;
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
// Imported read-only from L02-owned core/services/settings/siteLocale.ts:
// resolvePublicDocumentLanguage, resolvePrimarySiteLanguage

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
  all 22 copy keys/values, preservation of the TASK-547-03-L02-authored empty
  state and TASK-547-04-L01-authored `showCta:false`, absence of visible CTA
  copy, `pl`/`pl-PL` primary-language matching, every precedence branch, strict
  wrong-type/unknown/241-
  character rejection, direct-normalizer 1/240/241 behavior, idempotent round
  trip through the real validator/persistence boundary and
  absent/non-Polish/malformed legacy byte identity. This is not a DB
  install/request test and must never be reported as one.
- `tests/vitest/kits/projekty-domow-route-precedence.test.ts`: proves only static
  Page versus content-route precedence. It contains no locale input/assertion
  and is intentionally not locale evidence.
L02's independently gated `settingsService.test.ts` is prerequisite evidence for
raw locale compatibility, the object-shaped setting normalizer, representative
non-string values, cache invalidation and absence of weak installer imports.
This leaf does not edit, rerun as owner, or substitute for that suite.

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
- [ ] Consume L02's compatibility-safe public sink policy read-only and complete
  the exact 22-key/precedence/persistence render matrix.
- [ ] Hand the installed `handlePublicRequest` and browser assertions to
  TASK-547-06; they do not block this earlier leaf's own completion gate.

## Testing Requirements

- the four owned Vitest suites above, with the completed L02 settings gate as a
  read-only prerequisite;
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
