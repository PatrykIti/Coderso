# TASK-195-03-02: SEO Visibility and Slug URL Context
# FileName: TASK-195-03-02_SEO_Visibility_and_Slug_URL_Context.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + UX
**Estimated Effort:** Small
**Dependencies:** TASK-195-03
**Status:** To Do

---

## Overview

Expose SEO state and slug context without changing the stored slug contract.

Current inspector behavior:

- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:168-255`
  collapses the whole advanced/SEO surface by default.
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:205-209`
  computes SEO completion count, but only inside the collapsed section.
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:191-194`
  renders slug as a raw field with no public URL context.

This leaf should keep slug persistence backward compatible and make SEO status
visible even when the advanced controls are collapsed.

Owner boundary:

- `DocumentInspector` owns the visible SEO summary and slug field presentation
  only; it should stay a props-driven presenter.
- `PostBlockEditorShell` owns reading existing admin settings data, deriving the
  display URL context from existing contracts, and threading that context into
  the inspector props.
- `PostDetailsSidebar` remains a pass-through seam for document props; it should
  not start fetching settings on its own.
- `siteSettingsClient.getSiteSettings()` is the existing admin read owner for
  `publicBaseUrl` and `contentRoutes`.
- `site.contentRoutes` remains the canonical route owner for posts detail-path
  configuration.
- `core/services/content/postsFeedResolver.ts` is only a current consumer that
  reflects the existing fallback contract (`/post/:slug`); this leaf must not
  couple the admin editor directly to widget-resolver code.
- If a reusable route-prefix helper is needed, extract it from current route
  consumers into a Bun-free helper instead of hardcoding `/blog`,
  `nextless.cms`, or introducing a Posts-only settings source.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
  - load/reuse the current settings read path and pass a display-only slug URL
    context into the details inspector props.
- `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx`
  only if the document prop surface needs to widen for slug URL context
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx:168-255`
- `core/admin/services/siteSettingsClient.ts`
  only if a thin read helper or memoized loader is needed for the inspector path
- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
- `tests/vitest/ui/post-details-sidebar-wave.test.tsx`
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
- `tests/vitest/admin/siteSettingsClient.test.ts` only if site settings helper
  usage changes

## Implementation Notes

- Do not fetch admin settings inside `DocumentInspector`.
- Keep slug persistence ownership where it already lives; this leaf changes only
  the display context around the existing raw slug value.
- If route-prefix derivation needs reuse, extract one Bun-free helper from the
  current settings/runtime consumers and call it from the shell path instead of
  duplicating route guessing logic in the inspector.

## Security Contract

- Visibility: internal admin metadata editor only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - do not rewrite stored slugs behind the user’s back,
  - any displayed URL prefix must come from trusted existing settings/runtime
    context only,
  - collapsed-summary badges must not imply SEO completeness when required
    fields are still empty,
  - the URL context path must reuse the existing site settings plus posts route
    contract rather than a hardcoded admin-only approximation.

## Testing Requirements

- `tests/vitest/ui-integration/post-document-inspector.test.tsx`
  - collapsed SEO summary/badge stays visible,
  - slug field shows URL context without changing the raw value contract.
- `tests/vitest/ui/post-document-inspector-wave.test.tsx`
  - the direct inspector surface shows the slug context on the actual
    `DocumentInspector` seam.
- `tests/vitest/ui/post-details-sidebar-wave.test.tsx`
  - the widened document prop contract threads slug URL context through the
    existing sidebar shell without introducing a second settings-fetch path.
- `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - slug normalization and save payload remain backward compatible.
- `tests/vitest/admin/siteSettingsClient.test.ts` only if site settings helper
  usage changes
  - `publicBaseUrl` / `contentRoutes` normalization remains backward
    compatible.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. SEO completion is visible before the advanced section is expanded.
2. Slug editing shows the runtime URL context derived from the existing site
   settings and posts route contract.
3. Persisted slug values remain backward compatible with current posts data.
4. The slug URL context is derived once on the existing shell/settings path and
   passed into `DocumentInspector`; this leaf does not add a second settings
   fetch or a hardcoded admin-only route guess.
