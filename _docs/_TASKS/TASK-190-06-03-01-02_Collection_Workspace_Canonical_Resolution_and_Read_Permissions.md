# TASK-190-06-03-01-02: Collection Workspace Canonical Resolution and Read Permissions
# FileName: TASK-190-06-03-01-02_Collection_Workspace_Canonical_Resolution_and_Read_Permissions.md

**Priority:** High
**Category:** Collections + Resolution Policy + RBAC
**Estimated Effort:** Medium
**Dependencies:** TASK-190-06-03-01-01
**Status:** Done (2026-05-10)

---

## Overview

Define the deterministic canonical-resolution algorithm and owner-read redaction
rules for the server-owned collection workspace summary.

Done: the collection workspace summary now resolves canonical content route,
route-linked detail template, explicit canonical list page, page-linked listing
query/template, and canonical admin screen from current owner seams. Missing or
ambiguous links stay in `unresolved` with bounded `candidates`, and
`settings:read` gates route-derived canonical data.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/services/content/collectionWorkspaceService.ts`
- Update `tests/integration/routes/contentTypes.test.ts`
- Add `tests/vitest/content/collectionWorkspaceService.test.ts` only if the
  service stays Bun-free; otherwise keep coverage in the current Bun route lane

## Resolution Contract

- canonical route comes from `site.contentRoutes`,
- canonical detail template comes from `site.contentRoutes.detailPageId`,
- canonical list page and listing refs prefer explicit
  `PageData.settings.collectionLink`,
- admin screen prefers explicit custom-screen metadata from `TASK-190-06-02`,
- unresolved or ambiguous resources return bounded `candidates` instead of
  slug/title guessing,
- owner-read parity is enforced per slice: missing `settings:read`,
  `forms:read`, `media:read`, or other owner read hides or redacts that slice.

## Pseudocode

```ts
export const resolveCollectionWorkspaceSummary = async (contentTypeId, actor, deps) => {
  const route = await deps.findCanonicalContentRoute(contentTypeId);
  const detailPage = route?.detailPageId ? await deps.findDetailPage(route.detailPageId) : null;
  const listPage = await deps.resolveCanonicalListPage(contentTypeId, route);

  return redactByOwnerReads(
    {
      canonical: { route, detailPage, listPage },
      unresolved: collectUnresolved(route, detailPage, listPage),
      candidates: collectBoundedCandidates(contentTypeId),
    },
    actor
  );
};
```

## Security Contract

- Visibility: internal admin read model only.
- Auth model: authenticated admin session.
- RBAC: workspace host route requires `content:read`; linked slices must enforce
  owner-read parity before inclusion.
- CSRF: not applicable to read-only requests.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: canonical and candidate payloads stay strict.
- Anti-abuse: no fuzzy promotion of candidates to canonical state; candidate
  lists remain bounded and redacted.
- Secret handling: no raw uploads, signed URLs, preview tokens, or secret-like
  settings fields in candidates.

## Testing Requirements

- canonical route/detail/list resources resolve deterministically from existing
  owner seams,
- ambiguous matches return `unresolved` plus bounded candidates,
- page/listing/detail/custom-screen/media/form slices respect owner-read
  redaction rules,
- no browser-only metadata becomes canonical ownership.

## Validation

- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test --parallel=1 tests/integration/routes/contentTypes.test.ts`
  - sandbox lane: 4 passed / 7 skipped because the sandbox could not reach the
    configured DB
  - outside sandbox: 11 passed

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
