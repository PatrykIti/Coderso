# TASK-547-04-L03: Public Locale Propagation
# FileName: TASK-547-04-L03-Public-Locale-Propagation.md

**Parent Subtask:** TASK-547-04
**Priority:** High
**Category:** Public Runtime / Accessibility / SEO
**Estimated Effort:** Large
**Dependencies:** TASK-547-04-L02
**Status:** ⏳ To Do

## Overview

Make validated `site.locale` drive `<html lang>` for both Page and dynamic-entry
public renderers, consuming the `site.locale:"pl"` FormaDom seed owned by L02.

**Exact ownership:** new pure `core/services/settings/siteLocale.ts`,
`core/services/settings/settingsService.ts` locale validation branch,
`core/site/renderPublicPage.tsx`, `core/site/renderPublicEntry.tsx`,
`core/server/publicSite.tsx`, cohesive extractions
`publicSiteRenderContext.ts`, `publicSitePageRuntime.tsx` and
`publicSiteEntryRuntime.tsx`, plus the two focused locale tests. L02 exclusively
owns the package seed/assembler test; L03 only consumes the installed setting.
Do not introduce multilingual routing/content.

Because `publicSite.tsx` already exceeds 1,000 lines, split it by the cohesive
Page/entry/request-context responsibilities above and leave the compatibility
orchestrator below 1,000 lines before closing this leaf.

## Security Contract

No endpoint. Normalize the existing setting through its owned locale policy before
the escaped React attribute. Invalid/missing values fail closed to the current
default; no raw attribute interpolation.

## Implementation Pseudocode

```ts
export const resolvePublicDocumentLanguage = (value: unknown) =>
  normalizeSiteLocale(value) ?? DEFAULT_SITE_LOCALE;

// Both Page and entry shells:
<html lang={resolvePublicDocumentLanguage(siteLocale)}>{children}</html>
```

Data flow: request boundary reads `site.locale` once → pure bounded BCP-47-like
normalizer → Page/list/detail render options → escaped React `lang`.
Invalid/missing locale falls back without failing a public request.

Regression tests:
`tests/vitest/pages/public-page-locale.test.tsx` and
`tests/vitest/content/public-entry-locale.test.tsx` prove Polish output/default/
invalid behavior. Smoke asserts `document.documentElement.lang === "pl"` on `/`
and `/projekty/aurora`; rollback restores prior locale.

Also own `tests/unit/settings/settingsService.test.ts` locale cases: accept
`pl`/`pl-PL` under the frozen canonicalization policy, reject invalid direct and
bulk writes, and fail closed for legacy invalid stored read/list values.

## Sub-Tasks

- [ ] Thread locale through Page and entry render boundaries.
- [ ] Split the touched legacy public-site module into the named cohesive modules.
- [ ] Add bounded locale policy, focused tests and smoke assertions.

## Testing Requirements

Named Vitest tests plus `tests/unit/settings/settingsService.test.ts`; relevant
Bun public Page/list/detail/preview/cache suites; core
lint/types; `wc -l` on every touched/extracted production/test file.

## Documentation Updates Required

Send locale behavior/scope notes to TASK-547-06.
