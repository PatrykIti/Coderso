# TASK-255: Admin Breadcrumb Renderer and Workspace Resource Links

# FileName: TASK-255_Admin_Breadcrumb_Renderer_and_Workspace_Resource_Links.md

**Priority:** High
**Category:** CMS Content + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-190 collection workspace, TASK-254 detail template workspace actions
**Status:** Done
**Started:** 2026-05-13
**Completed:** 2026-05-13

---

## Overview

Admin breadcrumbs were assembled locally in page JSX and rendered by `TopBar`
as opaque React nodes, so common breadcrumb labels such as `Advanced / Engine /
Collection` were not consistently clickable. The collection workspace also only
offered direct actions for the canonical detail template, while the other
canonical resources required admins to leave the workspace and find the owning
surface manually.

This task adds a shared admin breadcrumb renderer, migrates existing admin page
shells to the label-array shorthand, and adds resource-owner links in the
collection workspace. Detail template create/delete stays workspace-owned; page,
listing query, listing template, admin screen, and route editing link to their
existing owner screens.

## Sub-Tasks

- Add `AdminBreadcrumbs` with label-shorthand, structured item support, and
  legacy local JSX extraction.
- Update `TopBar` and `AdminShell` to accept structured breadcrumb items.
- Move the collection workspace breadcrumbs to structured data.
- Migrate existing admin page/editor shells to label-array breadcrumbs and move
  editor status badges into `topbarActions` where old breadcrumb headers mixed
  navigation with document state.
- Add collection workspace action links for canonical page, listing query,
  listing template, admin screen, and route settings owners.
- Allow Listings to open directly on the templates tab via
  `/advanced/listings?tab=templates`.
- Pre-fill the new listing query editor from
  `/advanced/listings/new?contentTypeId=...`.
- Add Vitest coverage for shared breadcrumb rendering and collection workspace
  resource links.

## Files Changed

- `core/admin/ui/shared/AdminBreadcrumbs.tsx`
- `core/admin/ui/shared/TopBar.tsx`
- `core/admin/ui/layouts/AdminShell.tsx`
- `core/admin/ui/content-types/CollectionOverview.tsx`
- `core/admin/ui/content-types/CollectionWorkspacePage.tsx`
- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingEditorPage.tsx`
- `core/admin/ui/listings/defaults.ts`
- Existing admin page/editor shells under `core/admin/ui/**`
- `tests/vitest/ui/admin-breadcrumbs.test.tsx`
- `tests/vitest/ui/collection-workspace.test.tsx`
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/post-classic-editor-shell-wave.test.tsx`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/844-2026-05-13-admin-breadcrumbs-and-workspace-links.md`
- `_docs/_CHANGELOG/README.md`

## Implementation Pseudocode

```tsx
function TopBar({ breadcrumbs }) {
  if (isAdminBreadcrumbItems(breadcrumbs)) {
    return <AdminBreadcrumbs items={breadcrumbs} />;
  }
  const legacyItems = buildAdminBreadcrumbItemsFromNode(breadcrumbs);
  return legacyItems ? <AdminBreadcrumbs items={legacyItems} /> : breadcrumbs;
}

// Static/known sections can stay terse:
<AdminShell breadcrumbs={["Advanced", "Engine", "Collection"]} />

// Use an explicit href only when a crumb must override inferred routing:
<AdminShell breadcrumbs={["Pages", { label: pageTitle, href: `/pages/${pageId}` }]} />

// Dynamic leaf labels can stay as plain strings:
<AdminShell breadcrumbs={["Content", typeLabel, entryTitle]} />

function CollectionOverview({ summary }) {
  return canonicalResources.map((resource) => ({
    ...resource,
    actionHref: resolveOwnerHref(resource, summary.contentType.id),
  }));
}
```

Error handling:

- Legacy breadcrumbs that cannot be parsed still render unchanged.
- Missing canonical resources link to the owning list/create surface instead of
  inventing a second workspace-owned flow.
- Listing query create defaults only pre-fill the content type when a trimmed
  `contentTypeId` query parameter is present.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged owner surfaces enforce their existing read/write permissions.
- CSRF: no new write endpoint is introduced.
- Rate-limit bucket: unchanged existing admin route buckets.
- Reject-unknown validation: unchanged owner routes and schemas validate any
  later writes.
- Anti-abuse: no public write endpoint is introduced; nonce, HMAC, signatures,
  and reCAPTCHA are not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/admin-breadcrumbs.test.tsx tests/vitest/ui/collection-workspace.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/post-classic-editor-shell-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Validation Evidence

- `bun run test:vitest -- tests/vitest/ui/admin-breadcrumbs.test.tsx tests/vitest/ui/collection-workspace.test.tsx tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/entry-editor-shell-wave.test.tsx tests/vitest/ui/post-classic-editor-shell-wave.test.tsx` -
  passed, 5 files / 19 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run scan:security:strict` - passed after rerun outside sandbox; the
  sandboxed attempt failed on Semgrep trust-store, Bun audit connectivity, and
  Trivy DB credential access, not on findings.
- `bun run precommit` - passed after rerun outside sandbox; the sandboxed
  attempt failed while updating `.git/index.lock` after formatting staged files.
- `git diff --check` - passed.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/844-2026-05-13-admin-breadcrumbs-and-workspace-links.md`

## Acceptance Criteria

- Existing locally assembled breadcrumbs become clickable through the shared
  `TopBar` renderer where labels can be resolved.
- New pages can pass shorthand label arrays instead of building local JSX; hrefs
  remain optional for known static labels and explicit for dynamic labels.
- Existing admin page/editor shells use the shorthand label-array contract
  instead of local `div` breadcrumb markup.
- The collection workspace exposes links to Pages, Listings, Listing Templates,
  Custom Screens, and Site Settings owner surfaces.
- Listing templates can be opened directly from the workspace through the
  templates tab.
- Missing listing query links open a create route pre-filled with the current
  content type ID.
