# TASK-349-01: SEO Public Runtime Metadata Parity
# FileName: TASK-349-01_SEO_Public_Runtime_Metadata_Parity.md

**Priority:** High
**Category:** SEO + Public Runtime + API + QA
**Estimated Effort:** Large
**Dependencies:** TASK-349
**Status:** To Do

---

## Overview

Wire SEO Manager saves to public page output. The report shows a unique Meta
Title and Meta Description persisted to `seoDocuments`, while loading the public
page returned HTML without those values.

This leaf must choose one deterministic model:

- Public render resolves SEO metadata from `seoDocuments`, or
- SEO Manager writes/synchronizes the page/entry SEO data that public rendering
  already consumes.

Do not keep two divergent sources of truth.

## Sub-Tasks

- Add a public-safe SEO resolver for page and entry targets.
- Decide precedence between `seoDocuments`, page published SEO data, entry SEO
  data, root page `publishedData.seo`, and detail-page SEO rules.
- Render title, meta description, canonical URL, robots, and social image only
  when backed by published/public-safe data.
- Invalidate or bypass the server-side public HTML cache when SEO Manager
  changes public output.
- Add admin-save -> public-render regression coverage.

## Files To Change

| File | Required change |
|---|---|
| `core/services/seo/seoService.ts` | Add `getPublicSeoForTarget` or equivalent resolver that returns public-safe metadata by target type/id/slug. |
| `core/server/routes/seoRoutes.ts` | Trigger server-side site cache invalidation after SEO mutations that can affect public HTML. |
| `core/server/publicSite.tsx` | Resolve SEO metadata before `renderPublicPageRuntimeHtml` for published pages and relevant entry/detail routes. |
| `core/site/renderPublicPage.tsx` | Ensure title/meta/canonical/robots props render safely and are escaped. |
| `core/site/cache/siteCache.ts` | Use `invalidateSiteCachePath`, `invalidateContentEntryCache`, or `clearSiteCache`; do not rely on browser `cacheBus` for server HTML cache invalidation. |
| `tests/unit/seo/seoService.test.ts` | Cover resolver precedence and missing-target behavior. |
| `tests/integration/routes/seo.test.ts` | Cover route-level save and returned row shape. |
| `tests/integration/runtime/` | Add or extend Bun runtime test for public HTML after SEO save. |

## Implementation Pseudocode

```ts
export type PublicSeoMetadata = {
  title?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  robots?: string | null;
};

export async function resolvePublicSeoMetadata(input: {
  targetType: "page" | "entry";
  targetId?: string;
  slug?: string | null;
  fallback?: PublicSeoMetadata;
}): Promise<PublicSeoMetadata> {
  const document = await findSeoDocumentByTargetOrSlug(input);
  return {
    title: document?.title?.trim() || input.fallback?.title || null,
    description: document?.description?.trim() || input.fallback?.description || null,
    canonicalUrl: document?.canonicalUrl?.trim() || input.fallback?.canonicalUrl || null,
    robots: document?.robots?.trim() || input.fallback?.robots || null,
  };
}
```

Data flow:

- Admin drawer saves `seoDocuments`.
- Server mutation path invalidates the relevant public cache key before the next
  public request.
- Public request loads the published page/entry.
- Public render calls the SEO resolver using target type/id/slug.
- Render receives one merged metadata object and emits HTML tags.

Error handling:

- If a `seoDocuments` row references a deleted target, public rendering must
  ignore it and continue with existing page/entry fallback.
- If canonical/robots values are invalid, fail closed by omitting the tag and
  record a machine-readable issue during audit.
- Do not use current/draft page data for public non-preview requests.
- Cached public HTML must not continue serving old metadata after a successful
  SEO save.

Regression-test shape:

- Create a published page fixture.
- Run SEO audit or ensure document exists.
- PATCH title/description through `/admin/api/seo/:id`.
- Prime public HTML cache before the patch, if cache is enabled in the test
  harness.
- Request the public slug.
- Assert `<title>` contains the saved title and
  `<meta name="description">` contains the saved description.
- Request the public slug again and assert the cached response has the updated
  metadata.
- Assert a draft-only SEO value does not leak into public output.

## Security Contract

- Endpoint visibility: admin SEO writes remain internal; public SEO rendering is
  public read only.
- Auth model: admin PATCH uses session cookie.
- RBAC: `content:write` for SEO updates, `content:read` for document lookup.
- CSRF: required for PATCH through existing API client.
- Rate-limit bucket: `admin_write` for update, `public_read` for page render.
- Reject-unknown validation: no broad payload widening; any new metadata fields
  must be schema-owned.
- Anti-abuse: no public write.
- Data exposure: resolver must read only published/public-safe target metadata
  during public requests.

## Testing Requirements

- `bun test tests/unit/seo/seoService.test.ts`
- `bun test tests/integration/routes/seo.test.ts`
- Targeted Bun runtime public page test for SEO HTML
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update SEO Manager report with chosen source-of-truth and public parity proof.
- Update `_docs/CMS_API.md` and `_docs/PAGE_MODEL.md` with SEO precedence and
  cache invalidation behavior.
- Update SEO guide if public precedence changes.

## Acceptance Criteria

- Saved SEO Manager metadata appears in public HTML for a published page.
- Public preview and public published requests do not leak draft-only metadata.
- The implementation has a single documented precedence order.
- Site cache behavior cannot keep serving stale SEO metadata after an admin save.
