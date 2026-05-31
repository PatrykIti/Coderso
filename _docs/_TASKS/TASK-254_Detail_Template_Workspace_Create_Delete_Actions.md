# TASK-254: Detail Template Workspace Create Delete Actions

# FileName: TASK-254_Detail_Template_Workspace_Create_Delete_Actions.md

**Priority:** High
**Category:** CMS Content + Admin UI + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-190 detail pages, TASK-253 detail template bindings
**Status:** Done
**Started:** 2026-05-12
**Completed:** 2026-05-12

---

## Overview

The collection workspace showed the canonical route-linked detail template only
after one already existed. When a content type had no route-linked detail
template, the `Detail page` card stayed read-only as `Missing`, forcing admins
to leave the workspace and reason about route/settings ownership manually.

This task adds a Pages/Widget-template-style workspace action for creating and
deleting the canonical detail template directly from the collection workspace.
The editor itself remains the existing shared builder-style detail template
editor under the Engine collection route.

## Sub-Tasks

- Add a default draft `DetailPageDocument` factory for manual admin create.
- Add a content-type editor entry point into the collection workspace.
- Add create/delete actions to the collection workspace canonical detail-page
  card.
- Link created detail templates through `site.contentRoutes.detailPageId`.
- Clear the route link before deleting a canonical detail template, preserving
  the backend route-conflict guard.
- Add success/error notifications through the shared list-action toast adapter.
- Cover create/link and unlink/delete behavior with admin UI Vitest tests.

## Files Changed

- `core/admin/ui/content-types/CollectionWorkspacePage.tsx`
- `core/admin/ui/content-types/CollectionOverview.tsx`
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
- `core/admin/ui/content-types/detailTemplateEditorModel.ts`
- `tests/vitest/ui/collection-workspace.test.tsx`
- `tests/vitest/ui/content-type-editor.test.tsx`
- `tests/vitest/ui-integration/contentTypes.test.tsx`
- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/843-2026-05-12-detail-template-workspace-actions.md`
- `_docs/_CHANGELOG/README.md`

## Implementation Pseudocode

```tsx
function createWorkspaceDetailTemplate(summary) {
  const document = buildDefaultDetailTemplateDocument(summary.contentType);
  const created = await createDetailPage(document);
  const settings = await getSiteSettings();
  const routes = upsertRoute(settings.contentRoutes, {
    type: summary.contentType.slug,
    detailPageId: created.id,
  });
  await updateSiteSettings({ contentRoutes: routes });
  toast.success("created");
  await refreshWorkspace({ force: true });
  navigate(buildDetailTemplateEditorHref(summary.contentType.id, created.id));
}

function deleteWorkspaceDetailTemplate(summary, detailPage) {
  const settings = await getSiteSettings();
  const routes = clearMatchingDetailPageId(
    settings.contentRoutes,
    summary.contentType.slug,
    detailPage.id
  );
  await updateSiteSettings({ contentRoutes: routes });
  await deleteDetailPage(detailPage.id, { contentTypeId: summary.contentType.id });
  toast.success("deleted");
  await refreshWorkspace({ force: true });
}
```

Error handling:

- If route linking fails after create, the newly created draft is deleted as a
  best-effort cleanup and the create error remains visible.
- If delete fails after route unlinking, the previous route array is restored as
  a best-effort rollback and the delete error remains visible.
- Workspace refresh preserves cached summary while loading and reports API
  errors through the existing page alert.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session.
- RBAC: unchanged detail-page `content:write` and settings write permissions
  enforced by existing `/detail-pages` and `/settings` routes.
- CSRF: unchanged admin write CSRF enforcement on `POST /detail-pages`,
  `DELETE /detail-pages/:id`, and `PATCH /settings`.
- Rate-limit bucket: unchanged admin write buckets for detail pages and
  settings.
- Reject-unknown validation: unchanged `DetailPageDocument` and Site Settings
  validators own the persisted payloads.
- Anti-abuse: no public write endpoint is introduced; nonce, HMAC, signatures,
  and reCAPTCHA are not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/collection-workspace.test.tsx tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui-integration/contentTypes.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Validation Evidence

- `bun run test:vitest -- tests/vitest/ui/collection-workspace.test.tsx tests/vitest/ui/content-type-editor.test.tsx tests/vitest/ui-integration/contentTypes.test.tsx` -
  passed, 3 files / 8 tests.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run scan:security:strict` - passed after rerun outside sandbox; the
  sandboxed attempt failed on Semgrep trust-store and Bun audit connectivity,
  not on findings.
- `bun run precommit` - passed.
- `git diff --check` - passed.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/843-2026-05-12-detail-template-workspace-actions.md`

## Acceptance Criteria

- Missing canonical detail template can be created from the collection
  workspace without leaving the workspace.
- The content-type editor exposes a visible `Collection workspace` action so
  admins can reach the canonical resource card from
  `/admin/advanced/engine/:id`.
- Create writes a draft detail template, links it to the content type route,
  shows a success notification, refreshes workspace state, and opens the
  detail-template editor.
- Existing canonical detail template can be deleted from the workspace after a
  confirmation dialog.
- Delete clears the matching route link before deleting the document and shows a
  success notification.
- Tests, docs, task board, and changelog are synchronized.
