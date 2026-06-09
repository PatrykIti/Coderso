# TASK-417-04-L02: Public Site Preview And Cache Parity
# FileName: TASK-417-04-L02-Public-Site-Preview-And-Cache-Parity.md

**Parent Subtask:** TASK-417-04
**Priority:** High
**Category:** Pages / Runtime / Preview
**Estimated Effort:** Large
**Dependencies:** TASK-417-04-L01
**Status:** ✅ Done

---

## Overview

Wire public site rendering, preview rendering, cacheability, homepage, 404, and
template resolution to the Pages v2 runtime while preserving the existing
preview token security model.

---

## Security Contract

- **Endpoint visibility:** public read-only site routes and public `/preview`
  token route.
- **Auth model:** published pages are anonymous; preview requires a valid token.
- **RBAC:** not applicable to public read paths.
- **CSRF:** not applicable to public read paths.
- **Rate-limit bucket:** existing public and preview buckets.
- **Validation:** source `currentData`/`publishedData` is normalized through the
  Pages v2 owner before render.
- **Anti-abuse controls:** preview token TTL, hashed storage, target type checks,
  and sanitized probe metadata remain unchanged.

---

## Sub-Tasks

- [x] Update `core/server/publicSite.tsx` Page orchestration to read v2
  documents.
- [x] Update `core/site/renderPublicPage.tsx` so Page runtime rendering uses
  v2 document props while widget runtime rendering remains available for
  non-Page callers.
- [x] Guard the existing `renderWidgetTemplatePreviewHtml` path in
  `core/server/publicSite.tsx`.
- [x] Keep preview using `currentData` and public rendering using
  `publishedData`.
- [x] Preserve cache invalidation and `cacheable` decisions.
- [x] Cover homepage and 404 render paths.

---

## Implementation Pseudocode

```ts
const sourceData = options.preview ? page.currentData : page.publishedData;
const { document, diagnostics } = normalizeStoredPageDocumentV2ForRead(sourceData);

return {
  html: await renderPublicPageRuntimeHtmlV2({
    title: resolvedSeo.title ?? page.title ?? "Page",
    document,
    isPreview: options.preview ?? false,
    previewDevice: options.previewDevice,
    templateKey: document.settings.template,
  }),
  cacheable: pageDocumentAllowsSiteHtmlCache(document),
};
```

Expected data flow:

- SEO still resolves from SEO Manager then Page data fallback.
- Preview probes never include token/device values in returned diagnostics.
- Runtime search params remain bounded and do not mutate Page data.
- `core/site/renderPublicPage.tsx` owns the reusable document shell boundary;
  `core/server/publicSite.tsx` stays orchestration.
- Legacy reset diagnostics are out-of-band; they may be logged or used for
  non-public admin diagnostics but are not part of the Page document passed to
  templates.

Error handling:

- Missing published data still returns not-found behavior.
- Legacy Page data resets to empty v2.
- Invalid preview token behavior remains unchanged.

Regression-test shape:

- Bun runtime tests cover published vs preview data, preview device cascade,
  sanitized probe metadata, homepage, 404, and cache invalidation after publish.

---

## Testing Requirements

- `set -a && source .env && set +a` before DB-backed runtime tests when
  `DATABASE_URL` is available.
- Targeted Bun runtime and preview tests.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md`
