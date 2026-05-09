# TASK-190-05-03-07-02: DetailPageId Content Route Round-Trip and Matcher Metadata
# FileName: TASK-190-05-03-07-02_DetailPageId_Content_Route_Roundtrip_and_Matcher_Metadata.md

**Priority:** High
**Category:** Settings + Assistant Contracts + Runtime Routing
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-01
**Status:** Done (2026-05-08)

---

## Overview

Extend the existing `site.contentRoutes` owner seam so one content route can
link to one canonical detail-page document through `detailPageId`.

Current slice note:
- `ContentRouteSetting` now round-trips optional `detailPageId` through the
  current settings owner seam, assistant `setting.content-route.upsert`, and
  Site Settings client/form types,
- omitted/null/string semantics are now enforced in the assistant action
  contract so preserve, clear, and replace behavior stay explicit,
- `contentRouteMatcher.ts` now surfaces stored `detailPageId` metadata for
  runtime consumers without adding DB lookups or a second route registry.

This leaf is the single owner for the structural round-trip:

- settings normalization,
- `setting.content-route.upsert`,
- Site Settings client/UI,
- `contentRouteMatcher.ts` metadata.

It does not own public runtime consumption of that metadata; that stays with
`TASK-190-05-03-03`.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/services/settings/settingsService.ts`
- Update `core/services/assistant/actionPlanTypes.ts`
- Update `core/services/assistant/actionPlanSchema.ts`
- Update `core/services/assistant/actionFamilyContracts.ts` only if executable
  route-link metadata changes
- Update `core/services/assistant/actionExecutorService.ts` for
  `setting.content-route.upsert.detailPageId`
- Update `core/site/contentRouteMatcher.ts`
- Update `core/admin/services/siteSettingsClient.ts`
- Update `core/admin/ui/site/siteSettingsValidation.ts`
- Update `core/admin/ui/site/SiteRouteEditor.tsx`
- Update `core/admin/ui/site/SiteSettingsPage.tsx`
- Update `tests/unit/settings/contentRoutesValidation.test.ts`
- Add `tests/vitest/server/contentRouteMatcher.test.ts`
- Update `tests/unit/assistant/actionExecutorService.test.ts`
- Update `tests/unit/assistant/actionExecutorService.db.test.ts`
- Update `tests/vitest/assistant/action-plan-schema.test.ts`
- Update `tests/vitest/admin/siteSettingsClient.test.ts`
- Update `tests/vitest/ui/site-settings-validation.test.ts`
- Update `tests/vitest/ui/site-settings.test.tsx`
- Update `tests/vitest/ui/plugin-media-site-leaf.test.tsx`

## Round-Trip Contract

```ts
type ContentRouteSetting = {
  type: string;
  listPath: string;
  detailPath: string;
  enabled: boolean;
  detailPageId?: string | null;
};
```

Rules:

- omitted `detailPageId` preserves the current link,
- `detailPageId: null` clears the link,
- `detailPageId: "<id>"` sets or replaces the link,
- `settingsService.normalizeContentRoutes` validates only safe route shape plus
  the shared UUID-compatible `detailPageId` format contract,
- referential checks such as document existence and content-type ownership stay
  in detail-page services and runtime consumers,
- `contentRouteMatcher.ts` remains a pure matcher over normalized settings and
  surfaces stored `detailPageId` for runtime consumers without DB lookups.

## Pseudocode

```ts
export const mergeContentRoute = (currentRoute, input) => ({
  ...currentRoute,
  listPath: normalizeRoutePath(input.listPath, true),
  detailPath: normalizeRoutePath(input.detailPath, false),
  enabled: Boolean(input.enabled),
  ...(Object.prototype.hasOwnProperty.call(input, "detailPageId")
    ? { detailPageId: normalizeOptionalDetailPageId(input.detailPageId) }
    : {}),
});

export function matchContentRoute(pathname, routes) {
  const match = legacyMatchContentRoute(pathname, routes);
  if (!match) return null;
  return { ...match, detailPageId: match.route.detailPageId ?? null };
}
```

## Security Contract

- Visibility: internal settings/admin write seam plus public-read route metadata.
- Auth model: existing admin session / typed assistant execute flow.
- RBAC: existing settings/content write boundaries remain unchanged.
- CSRF: all mutating settings routes require existing admin CSRF middleware.
- Rate-limit bucket: `admin_read` / `admin_write`.
- Reject-unknown validation: settings/action payloads remain strict.
- Anti-abuse: no second route-link store, no hidden settings alias, and no
  browser-only route metadata bag.
- Secret handling: `detailPageId` is identifier-only metadata and must not pull
  document payloads into settings responses.

## Testing Requirements

- Settings round-trip preserves `detailPageId`.
- `setting.content-route.upsert` preserves, clears, and replaces
  `detailPageId` with the documented omitted/null/string semantics.
- `contentRouteMatcher` returns `detailPageId` on list/detail matches without
  adding DB lookups, and its pure matcher coverage stays in the Vitest-owned
  server-helper lane.
- Site Settings UI/client round-trips `detailPageId` through the current editor
  flow instead of a route-local shadow store.
- Runtime consumers can read the widened matcher metadata without a second route
  registry.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md`
