# TASK-580-03-L04: Public Detail Page V2 Render Cutover
# FileName: TASK-580-03-L04-Public-Detail-Page-V2-Render-Cutover.md

**Parent Subtask:** TASK-580-03
**Priority:** High
**Category:** Runtime / Pages
**Estimated Effort:** Large
**Dependencies:** TASK-580-03-L02 (L03 recommended to land first so stored rows are already v2)
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Flip the production detail-page render path from the v1 pipeline
(`hydrateRuntimeBlocks` + `renderPublicPageRuntimeHtml`,
`core/server/publicEntryRender.tsx:326-338,466-468`) to the V2 pipeline
(`preparePageRuntimeDocument` + `renderPublicPageV2RuntimeHtml`). The entry
list/detail routing, SEO resolution, visibility gates, and preview tokens in
`publicSite.tsx` stay unchanged. After this leaf, the detail path no longer
references the v1 widget runtime (unblocking TASK-580-04) and the site cache
contract for detail pages comes from the prepared runtime cache mode.

> **L02/L04 boundary (decided; do not rediscover):** L02 keeps
> `detailPageRuntimeResolver` returning `{ document, blocks }` with a
> transitional alias over the converted v2 sections (comment
> `// transitional; removed in L04`). THIS leaf removes that alias: the
> resolver returns `{ document, sections }` and the
> `publicEntryRender.tsx:326/468` consumers switch to sections-only. This is
> the L04 half of the boundary decision recorded in both leaves.

## Sub-Tasks

- [x] `detailPageRuntimeResolver.ts`: flip the return type from
  `{ document, blocks }` to `{ document, sections }`; delete the transitional
  `blocks` alias L02 added (its comment says `// transitional; removed in
  L04`). This is the L04 half of the L02/L04 boundary decision.
- [x] `publicEntryRender.tsx` — `renderEntryDetailHtml` detail-page branch:
  - `const sections = await resolveDetailPageBlocks({ document, entry,
    contentType, contentRoutes, preview })` (already returns v2 sections
    after L02).
  - `const renderDocument = buildDetailPageRenderDocument(document, sections)`
    (envelope → `{schemaVersion: 2, breakpoints, seo, settings: {template},
    sections}`; `settings.template` = `document.settings.template`).
  - `const prepared = await preparePageRuntimeDocument(renderDocument, {
    preview, breakpoint: options?.previewDevice ?? "desktop", contentRoutes,
    runtimeSearchParams: options?.runtimeSearchParams })`.
  - `renderPublicPageV2RuntimeHtml({ title, document: prepared.document,
    runtimeDataByBlockId: prepared.runtimeDataByBlockId, templateKey,
    isPreview, previewDevice, siteShell, siteName, activePath, responsiveCss,
    renderBodyScripts (listing runtime, same pattern as
    `publicSite.tsx:165-180`), analyticsScriptHtml, metaDescription,
    canonicalUrl, robots, imageUrl, cssHref, inlineCss, devModuleScripts,
    siteLocale, themeName })`.
  - Return `{ html, cacheable: entryIsGated ? false : prepared.cacheable,
    cacheMode: prepared.cacheMode }`; delete the
    `hydrateRuntimeBlocks`/`renderPublicPageRuntimeHtml`/`blocksAllowSiteHtml
    Cache` calls for the detail path.
- [x] `renderDetailPagePreviewHtml` — same cutover (preview: true, `document
  Source: "current"`, no responsiveCss, `renderBodyScripts` when
  `needsListingRuntimeScript`).
- [x] `core/site/cache/siteCache.ts`: `blocksAllowSiteHtmlCache` loses its
  only production caller; keep the helper (retype to `unknown[]` or leave)
  for 580-04 deletion — do NOT invent new callers.
- [x] `core/server/publicSiteEntryRuntime.tsx`: keep
  `collectPrehydratedDetailBlockIds` (bindings-based; update only if the
  relatedItems prehydrate logic changes shape) — it now feeds nothing on the
  detail path unless L02 kept a prehydrate hook; if it is dead after the
  cutover, remove the call and note it for 580-04.
- [x] `core/services/pages/pageTemplateBoundary.ts` (narrow, S3-owned, one
  coordinated edit): remove `"detail-page"` from `legacyWidgetSurfaceKinds`
  and adjust the boundary test; if TASK-539 is active on this file, defer the
  set change to a 580-04 follow-up and keep the code path unused.
- [x] `publicSite.tsx` (S1-owned file; ONE coordinated seam, sequenced with
  S1 by the orchestrator like the 3 widget-import lines): in the
  `content-detail` branch at `:583-584`, route the cache TTL through the
  existing `resolveRenderCacheTtl` helper (`:515-520`) instead of
  `defaultStoreTtlSeconds` — e.g.
  `const detailTtlSeconds = typeof detailHtml === "string"
  ? defaultStoreTtlSeconds : resolveRenderCacheTtl(detailHtml);` then
  `setSiteCacheEntry(cacheKey, html, detailTtlSeconds)`. Otherwise the branch
  is verification-only: confirm the `content-detail` branch (`:573-586`) and
  both preview branches (`:402,418`) compile against the new
  `renderEntryDetailHtml` result type (string | `{html, cacheable, cacheMode?}`).
  No other line in this file is touched.
- [x] Kit runtime parity: `tests/vitest/kits/projekty-domow-runtime-rendering
  .test.tsx:276` switches from `renderPublicPageRuntimeHtml` to the V2
  render host (or a detail-owned render helper); assertions keep asserting
  VISIBLE content (headline bound from entry, grid columns, feature cards,
  CTA) and add `data-legacy-widget` absence for the converted kit doc.
- [x] `tests/vitest/site/publicRenderer.test.tsx` is 1008 lines today —
  BEFORE adding detail-path parity assertions, extract the existing
  detail-path suites into a NEW sibling
  `tests/vitest/site/publicRendererDetailPath.test.tsx` (shared
  fixtures/imports via a small helper module, no copied loops) so both files
  stay ≤1000 lines. This leaf's new V2 detail-render parity tests land in the
  sibling.

## Files To Change

| File | Required change |
|---|---|
| `core/server/publicEntryRender.tsx` | V2 render cutover (detail + preview branches) |
| `core/server/publicSite.tsx` | ONE coordinated cache-TTL seam in the `content-detail` branch (`:583-584`, `resolveRenderCacheTtl` at `:515-520`); S1-owned otherwise |
| `core/site/cache/siteCache.ts` | retype/leave `blocksAllowSiteHtmlCache` (no new callers) |
| `core/server/publicSiteEntryRuntime.tsx` | prehydrate helper cleanup/notes |
| `core/services/pages/pageTemplateBoundary.ts` | remove `detail-page` from legacy surface set (coordinated, narrow) |
| `tests/vitest/pages/page-template-boundary.test.ts` | update surface-kind assertions |
| `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx` | V2 render parity |
| `tests/vitest/site/publicRenderer.test.tsx` | split first: extract existing detail-path suites into the new sibling (file is 1008 lines) |
| `tests/vitest/site/publicRendererDetailPath.test.tsx` | NEW sibling: extracted detail-path suites + this leaf's V2 detail-render parity assertions |

## Implementation Pseudocode

```tsx
// core/server/publicEntryRender.tsx (detail-page branch)
if (detailPage) {
  const sections = await resolveDetailPageBlocks({ /* existing input */ });
  const renderDocument = buildDetailPageRenderDocument(detailPage.document, sections);
  const prepared = await preparePageRuntimeDocument(renderDocument, {
    preview: options?.preview ?? false,
    breakpoint: options?.previewDevice ?? "desktop",
    contentRoutes,
    runtimeSearchParams: options?.runtimeSearchParams,
  });
  const { siteShell, siteName, responsiveCss } = await resolvePublicSiteShellContext({
    document: null,
    includeResponsiveCss: !options?.previewDevice,
  });
  const renderBodyScripts = prepared.needsListingRuntimeScript
    ? buildListingRuntimeBodyScripts()
    : undefined;
  return {
    html: renderPublicPageV2RuntimeHtml({
      title: /* same SEO resolution as today */,
      document: prepared.document,
      runtimeDataByBlockId: prepared.runtimeDataByBlockId,
      templateKey: detailPage.document.settings.template,
      isPreview: options?.preview ?? false,
      previewDevice: options?.previewDevice,
      cssHref, inlineCss, devModuleScripts,
      metaDescription, canonicalUrl, robots, imageUrl,
      siteShell, siteName, activePath: options?.requestPath ?? null,
      responsiveCss, renderBodyScripts,
      analyticsScriptHtml: await buildLiveAnalyticsScriptHtml(options?.preview === true),
      siteLocale: await getSetting("site.locale"),
      themeName: options?.themeName ?? (await resolvePublicThemeName()),
    }),
    cacheable: entryIsGated ? false : prepared.cacheable,
    cacheMode: prepared.cacheMode,
  };
}
```

**Data flow:** detail doc (v2) → binding resolver writes entry values into
block props → synthetic PageDocumentV2 → `preparePageRuntimeDocument` resolves
collection/form/filters/embed runtime data (with breakpoint pruning) →
`renderPublicPageV2RuntimeHtml` normalizes + renders through
`DefaultRuntimePageShellV2` + site shell. Cache: `cacheMode` full/short-ttl/
none from the prepared runtime; gated entries stay uncacheable.

**Error handling:** binding errors keep mapping to `null` → 404 exactly as
today (`detail_page_binding_*`); `preparePageRuntimeDocument` never throws on
bad stored data (per-block fail-closed resolution); render normalization is
stored-read lenient; no v1 registry call remains reachable from this path.

**Regression-test shape:**

```tsx
describe("detail page v2 render", () => {
  it("renders a converted FormaDom-shaped doc via the V2 pipeline with bound values", async () => {
    const result = await renderEntryDetailHtml("projekty-domow", "sample-slug", {});
    const html = typeof result === "string" ? result : result.html;
    expect(html).toContain("Entry title");            // hero heading bound from entry
    expect(html).toContain('data-block-id="project-hero-heading"');
    expect(html).not.toContain("widget_unknown_type");
  });
  it("renders legacy-widget placeholders without their data", ...);
  it("reports cacheMode full / none for form-bearing / gated variants", ...);
  it("keeps preview token render on the V2 path (current document)", ...);
});
```

**Validation commands:**

- `bun --cwd core lint:types` + `bun --cwd core lint`
- `bun test tests/unit/content/detailPageRuntimeResolver.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/content/detailPageBindingResolver.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx tests/vitest/site/publicRenderer.test.tsx tests/vitest/site/publicRendererDetailPath.test.tsx tests/vitest/pages/page-template-boundary.test.ts`
- `bun run gates:coderso` (runtime gate family is touched)
- `git diff --check`

## Security Contract

- **Endpoint visibility:** public detail-page render + preview tokens —
  behavior unchanged; no new endpoints.
- **Auth model:** anonymous public read with existing entry visibility gates
  (password/gating/unlock context logic untouched).
- **RBAC / CSRF / rate limits:** unchanged.
- **Validation:** render input normalized through the v2 stored-read path;
  `legacy-widget` data never rendered; listing/form runtime data resolves
  through the existing scoped, nonce-hardened contracts.
- **Secret handling:** no secrets in render fixtures; cache keys unchanged
  (route-based); no auth/private data cached (gated entries stay
  `cacheable:false`).

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` — detail-page V2 runtime path (with L07).
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` — verify only (no key
  changes expected).

## Acceptance Criteria

1. `hydrateRuntimeBlocks` and `renderPublicPageRuntimeHtml` have ZERO call
   sites on the detail-page path.
2. Public detail pages and previews render through `preparePageRuntimeDocument`
   + `renderPublicPageV2RuntimeHtml` with bound entry values and correct
   per-block runtime data.
3. Cache flags come from `PreparedPageRuntimeDocument`; gated entries remain
   uncacheable; `blocksAllowSiteHtmlCache` has no production callers.
4. Kit runtime tests render the converted document via V2 with visible
   content assertions (no v1 renderer import).
