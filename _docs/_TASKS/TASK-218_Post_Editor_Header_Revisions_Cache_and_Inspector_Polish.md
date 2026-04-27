# TASK-218: Post Editor Header Revisions Cache and Inspector Polish
# FileName: TASK-218_Post_Editor_Header_Revisions_Cache_and_Inspector_Polish.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Admin Cache
**Estimated Effort:** Medium
**Dependencies:** TASK-212, TASK-063-12
**Status:** Done (2026-04-27)

---

## Overview

Polish the Posts block editor header and inspector to match the current Pages
editor placement rules while preserving the Posts-specific editor shell:

- move the post lifecycle status badge out of the local editor toolbar and into
  the global admin topbar breadcrumb area;
- keep the local back-row context focused on the current post title only;
- avoid showing hidden Outline/Details panels as active while focus mode is on;
- start the right inspector on the `Post` tab and keep `Advanced` expanded;
- auto-fill canonical URL from the resolved public post route when the URL can
  be trusted;
- move post revisions onto the shared admin cache contract.

## Sub-Tasks

- [x] Header placement and focus-mode pressed-state cleanup.
- [x] Post inspector default tab, expanded Advanced section, and canonical URL
  auto-fill.
- [x] Revisions cache key/client/hook wiring with mutation patch updates.
- [x] Runtime canonical link rendering for explicit canonical URLs.
- [x] Docs, changelog, and targeted validation.

## Security Contract

- Visibility: internal admin Posts editor and internal `/admin/api/posts*`
  routes only; public runtime only receives read-only canonical metadata.
- Auth model: existing admin session/API-key path remains unchanged.
- RBAC: existing `content:read`, `content:write`, and `content:publish`
  requirements stay in place.
- CSRF: admin write routes continue to use `withCsrf: true`; no public write
  endpoint is introduced.
- Rate-limit bucket: existing admin read/write buckets and public read bucket
  remain unchanged.
- Reject-unknown validation: no payload schema widening; canonical URL still
  flows through the existing `seo.canonicalUrl` post schema.
- Anti-abuse: cache events use deterministic `posts:*` keys derived from post
  IDs and do not include secrets, tokens, cookies, or arbitrary provider text.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/postsClient.test.ts`
- `bun run test:vitest -- tests/vitest/posts/post-editor-layout-state.test.ts`
- `bun run test:vitest -- tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/post-document-inspector-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui-integration/post-editor-settings-dialog.test.tsx tests/vitest/ui/panel-leaf-wave-2.test.tsx`
- `bun test tests/unit/site/publicEntryRenderer.test.tsx`
- `bun test tests/integration/routes/postsRoutes.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/posts/posts-revisions-flow.test.ts tests/integration/posts/posts-runtime-flow.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/750-2026-04-27-task-218-post-editor-polish.md`

## Closure Notes

- Posts editor status now appears in the global admin topbar, and the local
  editor header shows only the post title beside the back button.
- Revisions use `posts:revisions:<id>` and are patched from autosave, publish,
  and restore responses instead of reloading the whole list after restore.
- Canonical URLs are auto-filled only when the public route is concrete; runtime
  rendering emits a canonical link when an explicit canonical URL is present.
