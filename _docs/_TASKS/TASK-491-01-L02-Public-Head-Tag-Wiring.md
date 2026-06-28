# TASK-491-01-L02: Public `<head>` tag wiring
# FileName: TASK-491-01-L02-Public-Head-Tag-Wiring.md

**Parent Subtask:** TASK-491-01
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** TASK-491-01-L01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Thread the resolved GA head snippet (from L01) into every public,
  non-preview render so the GA4 tag appears in the live site `<head>`. Resolve it
  once per request in the orchestrator and pass it down; never resolve it inside
  the React render path.
- **Owning module(s) to create-or-extend:**
  - `core/server/publicSite.tsx` — resolve `resolvePublicAnalyticsHead()` once
    per public request (guarded by a `try/catch` that degrades to no tag) and
    pass an `analyticsHeadSnippet` option into the render calls. Only on the
    public (non-preview) request entry (`handlePublicRequest`); preview/token
    render paths pass `null`.
  - `core/site/renderPublicPage.tsx` — extend the shared `renderDocument(...)`
    head builder to accept an optional `analyticsHeadSnippet` and push it as a
    raw `<script>` head tag (via `dangerouslySetInnerHTML`) **only when present
    and `!isPreview`**. Thread the option through `renderPublicPageHtml`,
    `renderPublicPageRuntimeHtml`, and `renderPublicPageV2RuntimeHtml` option
    types.
  - `core/site/renderPublicEntry.tsx` — same head injection for
    `renderPublicEntryListHtml` / `renderPublicEntryDetailHtml`.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (public render pipeline),
  `_docs/SECURITY_SPEC.md` (client payload), `_docs/CMS_API.md`.
- **Out of scope:** Caching coupling. The GA snippet is identical for all public
  visitors and changes only when an admin edits the integration, so it may ride
  inside the existing cached HTML; do NOT add a per-request cache-busting seam.
  Invalidation on integration change is out of scope (next admin edit + normal
  TTL expiry is acceptable; note this in the closeout).

---

## Security Contract

- **Endpoint visibility:** public (the public site response).
- **Auth model:** anonymous read.
- **RBAC:** n/a.
- **CSRF:** n/a (no write).
- **Rate-limit bucket:** inherits the existing public-site path; no new bucket.
- **Validation:** the id was format-validated in L01; the renderer treats the
  snippet as opaque pre-built HTML and only gates on presence + `!isPreview`.
- **Anti-abuse:** n/a.
- **Secret handling:** ONLY the public `measurementId` reaches the client (inside
  the snippet). Assert no other integration value is serialized into the page.
  Preview renders MUST omit the tag so editors/preview tokens never trigger GA
  hits.

---

## Implementation Pseudocode

```tsx
// core/site/renderPublicPage.tsx — extend renderDocument signature + head build
const renderDocument = (
  title: string,
  body: ReactNode,
  cssHref?: string | null,
  /* ...existing params... */
  responsiveCss?: string | null,
  analyticsHeadSnippet?: string | null, // NEW (append at end of param list)
) => {
  const headTags: ReactNode[] = [ /* charset, viewport, title, ... */ ];
  // ...existing pushes (description, canonical, robots, og:image, css)...
  if (analyticsHeadSnippet && !isPreview) {
    headTags.push(
      <script
        key="ga4"
        dangerouslySetInnerHTML={{ __html: analyticsHeadSnippet }}
      />
    );
  }
  // ...
};

// Each public renderer forwards options.analyticsHeadSnippet into renderDocument.
```

```tsx
// core/server/publicSite.tsx — resolve once per public request
import { resolvePublicAnalyticsHead } from "../services/integrations/analyticsRuntime";

let analyticsHeadSnippet: string | null = null;
try {
  analyticsHeadSnippet = await resolvePublicAnalyticsHead();
} catch (error) {
  console.warn("analytics_head_resolution_failed", error); // fail closed, no tag
}
// pass { ...renderOpts, analyticsHeadSnippet } into renderPublicPage* / renderPublicEntry*
// preview/token paths pass analyticsHeadSnippet: null
```

**Data flow:** public request → resolve snippet once → pass option → renderer
appends one `<script>` head tag when present and not preview → cached HTML
includes the tag.

**Error handling:** resolver failure → `console.warn` + `null` → page renders
without GA (never errors). The snippet is built raw text from a format-validated
id, so it cannot break out of the `<script>` context.

**Regression-test shape:**

- Bun route test: configure `google-analytics.measurementId = "G-TEST123"` (seed
  the integration), GET a published public page → body contains
  `gtag/js?id=G-TEST123`. GET the same with no GA configured → no `gtag` string.
- Bun route test: preview render (preview token path) → no `gtag` string even
  when configured.
- Assert the response body contains no `slack`/`zapier`/`sentry` secret values.

---

## Testing Requirements

- Bun (`tests/integration/routes/publicSiteAnalytics.test.ts`) — server-backed
  assertions above (this is a `Bun.serve`/runtime render flow, so it stays in the
  Bun lane).
- Reuse the existing public-site test harness/seed helpers; do not add a
  production fallback just to satisfy the test.
- Lint + type-check.
