# TASK-195: Posts Admin QA Recovery and Authoring UX Polish
# FileName: TASK-195_Posts_Admin_QA_Recovery_and_Authoring_UX_Polish.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-059, TASK-060, TASK-061, TASK-063
**Status:** To Do

---

## Overview

Address the Posts admin defects and UX gaps captured in
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md` without redesigning the product surface.
This family is a correctness and polish wave for the already-shipped Posts list
and writing-first editor.

The report findings that still need explicit owner tracking are:

### Bugs

- Critical: `Select all posts` does not select rows and no bulk toolbar appears.
- Medium: shared search copy still says `Search pages by title...` on Posts.
- Medium: publish/update actions do not produce explicit success feedback.
- Medium: category assignment and featured image still rely on raw IDs in the
  document inspector.

### UX gaps

- Revision history has no preview of the snapshot before restore.
- The editor can still hide the right inspector in ways that make `Post`
  settings hard to discover; this needs to be fixed without breaking the
  existing focus-mode preference contract.
- Collapsed `Advanced` keeps SEO too easy to miss.
- Slug editing lacks explicit public URL context.
- Rich-text typography controls use unclear helper copy.
- The block inserter still needs a final cleanup around the existing
  `text/media/interactive` catalog grouping and a regression lock for
  category-scoped search behavior observed in QA.

The report also captured autosave/network failures in console output. This
family treats that as a product-owned recovery/surfacing problem first: users
must see a clear paused-state/retry path instead of relying on console output.
If the underlying DB connection issue still reproduces after UI hardening, log
that as a separate infrastructure follow-up rather than hiding it in editor UX.
Closure must keep those outcomes explicit:

- defects inside the current Posts admin/editor contracts are fixed in this
  family,
- capability gaps or server/runtime failures outside those contracts get a
  dedicated follow-up task file with named owners instead of being left as
  loose notes.
- if QA replay still demands brand-new media block capabilities beyond the
  current catalog, that becomes a separate capability task with explicit
  contract/editor/runtime owners rather than an implicit extension of
  `blockCatalog.ts`.

## Sub-Tasks

- `TASK-195-01_Posts_List_Bulk_Actions_and_Filter_Terminology.md`
- `TASK-195-02_Post_Editor_Shell_Discoverability_Feedback_and_Revision_Confidence.md`
- `TASK-195-03_Post_Inspector_Taxonomy_Media_and_SEO_Affordances.md`
- `TASK-195-04_Writing_Toolbar_and_Block_Inserter_Clarity.md`
- `TASK-195-05_QA_Docs_and_Closure.md`

## Scope

This umbrella covers four owner areas:

1. Posts list reliability:
   - controlled row/header selection,
   - visible-scope bulk actions,
   - shared filter/search terminology.
2. Editor shell feedback and confidence:
   - inspector discoverability,
   - explicit publish/update feedback,
   - autosave failure surfacing,
   - revision preview before restore.
3. Inspector affordances:
   - category selection from taxonomy data,
   - featured-image media picker reuse,
   - SEO visibility and slug context across the existing create and edit flows.
4. Authoring guidance:
   - clearer typography affordances,
   - block-inserter cleanup on the existing `text/media/interactive` catalog,
   - regression coverage for category-scoped search.

Out of scope:

- new public Posts endpoints,
- a new posts document model or revision model,
- runtime rendering redesign for writing canvas,
- introducing brand-new post block types or runtime renderers for `video`,
  `gallery`, `audio`, or `file` under this QA-polish wave,
- root-cause server/runtime DB connectivity or settings-read fixes unless a
  dedicated follow-up task is opened from closure with exact evidence and
  owners,
- replacing the existing slug storage contract with a slash-prefixed format,
- introducing a brand-new Playwright lane before the shipped Vitest/Bun command
  surface is covered.

## Architecture

Current owner seams in code:

- Posts list and shared filters:
  - `core/admin/ui/posts/PostsListPage.tsx`
  - `core/admin/ui/posts/PostsTable.tsx`
  - `core/admin/ui/pages/PageFilters.tsx`
- Editor shell, save/preview/revision wiring, and preferences:
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
  - `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
  - `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
  - `core/admin/ui/posts/editor/settings/postEditorPreferences.ts`
  - `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- Document inspector and supporting selectors:
  - `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
  - `core/admin/ui/media/MediaPicker.tsx`
  - `core/admin/services/taxonomyClient.ts`
- Writing toolbar and inserter:
  - `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx`
  - `core/admin/ui/posts/editor/blocks/BlockInserter.tsx`
  - `core/admin/ui/posts/editor/blocks/blockCatalog.ts`
- Revision confidence:
  - `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`
  - `core/admin/services/postsClient.ts`
- Shared admin feedback visibility:
  - `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
  - `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
  - `core/admin/app/AdminApp.tsx`
  - `core/admin/components/ui/sonner.tsx`
- Discoverability restore and shell-state ownership:
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
  - `core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts`
  - `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- Server/runtime follow-up owners if autosave/settings failures still reproduce:
  - `core/server/routes/postsRoutes.ts`
  - `core/services/settings/settingsService.ts`
- Public URL context and current posts route fallback:
  - `core/admin/ui/posts/PostsListPage.tsx`
  - `core/admin/ui/posts/PostsCreateDrawer.tsx`
  - `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
  - `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx`
  - `core/admin/services/siteSettingsClient.ts`
  - `core/services/content/postsFeedResolver.ts`
- Future media-capability follow-up owners if replay still asks for new block
  types beyond regrouping:
  - `core/services/posts/editor/postBlockDocument.ts`
  - `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
  - `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- Direct owner tests for the changed seams:
  - `tests/vitest/ui/page-post-list-wave.test.tsx`
  - `tests/vitest/ui/post-document-inspector-wave.test.tsx`
  - `tests/vitest/posts/post-block-catalog-search.test.ts`
  - `tests/vitest/posts/post-editor-preferences.test.ts`
  - `tests/vitest/posts/post-editor-layout-state.test.ts`
  - `tests/vitest/ui/post-editor-layout-hook-wave.test.tsx`
  - `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - `tests/vitest/ui/media-picker.test.tsx`
  - `tests/vitest/ui-integration/post-block-inserter.test.tsx`
  - `tests/vitest/admin/adminApp.test.tsx`

Reuse-first rule:

- mirror bulk-selection behavior from the existing Entries patterns instead of
  inventing a Posts-only model,
- reuse `MediaPicker` and `taxonomyClient` rather than adding raw-ID-only admin
  helpers,
- keep the current focus-mode preference contract unless a narrower
  discoverability fix cannot solve the QA finding,
- keep `DocumentInspector` presentation-only for slug URL context; load and
  derive that context once on the existing shell/settings path and pass it
  through current props instead of fetching inside the inspector,
- keep the create-drawer slug affordance on the existing `PostsCreateDrawer`
  surface, but let `PostsListPage` remain the create-flow orchestrator that
  derives and passes display-only URL context through props; do not invent a
  second posts-routing source, a drawer-local fetch, or a create-only
  URL-guessing branch,
- repair discoverability through the existing storage/layout restore seams
  (`resolveInitialFocusMode`, `resolveInitialLayoutState`,
  `usePostEditorPreferences`, `usePostEditorLayout`) rather than creating a
  second visibility model,
- if discoverability work changes stored preference resolution or the layout
  reducer, update the direct owner tests
  `tests/vitest/posts/post-editor-preferences.test.ts` and
  `tests/vitest/posts/post-editor-layout-state.test.ts` instead of relying only
  on higher-level render suites,
- keep category-scoped search in the existing `searchPostBlockCatalog()`
  contract and add regression coverage instead of branching into a second search
  path,
- keep publish/update success feedback on the existing shared admin toast path:
  Posts editor code may emit feedback, but `AdminApp` remains the mount owner;
  do not add a Posts-only toaster host or ad-hoc event bus; if the current
  checkout lacks a mounted shared toaster, mount it on the existing `AdminApp`
  path instead of making toast visibility conditional in Posts code,
- derive slug URL context from the existing `site.publicBaseUrl` plus
  `site.contentRoutes` read model and the current posts runtime fallback in
  `postsFeedResolver`; do not hardcode `/blog` or invent a Posts-only settings
  source,
- if replay still requires `video`, `gallery`, `audio`, or `file` in the Posts
  Media tab, open a separate capability-expansion task with named
  contract/editor/runtime owners; do not hide that work inside the current
  catalog-regrouping leaf,
- when `DocumentInspector` changes, update its direct owner test
  `tests/vitest/ui/post-document-inspector-wave.test.tsx` in addition to the
  sidebar/integration tests,
- when block grouping or category-scoped search changes, keep
  `blockCatalog.ts` as the single owner and update
  `tests/vitest/posts/post-block-catalog-search.test.ts`.

## Security Contract

- Visibility: internal admin Posts UI plus the existing public read-only preview
  runtime.
- Internal admin endpoints remain under `/admin/api/posts*` and existing
  taxonomy/media admin routes.
- Auth model: authenticated admin session / admin API key where already
  supported by the shared admin stack.
- RBAC: unchanged.
  - `content:read` for list/detail/preview/revisions/taxonomy lookups.
  - `content:write` for create/update/autosave/duplicate/delete and metadata
    changes.
  - `content:publish` for publish/unpublish.
- CSRF: unchanged for current mutating admin endpoints.
- Rate-limit buckets: unchanged (`admin_read`, `admin_write`, `public_read`).
- Reject-unknown validation: unchanged; this family must not loosen posts,
  taxonomy, or media payload validation.
- Anti-abuse:
  - no new public write path,
  - bulk destructive actions require explicit confirmation and visible-scope
    selection,
  - autosave failure handling must not leak secrets or raw infra details to the
    browser.

## Implementation Order

1. Fix the critical Posts list selection/bulk issue and shared filter copy.
2. Repair editor-shell discoverability and explicit save/publish/revision
   feedback.
3. Replace raw inspector IDs with picker-based affordances and expose SEO state.
4. Close writing-toolbar and inserter clarity gaps.
5. Re-run the report checklist, sync docs, board, and changelog.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest:
  - umbrella validation is the union of the leaf-declared suites; do not mark
    `TASK-195` validated from a narrower subset.
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/ui/posts-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-details-sidebar-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/post-editor-state-hook-wave.test.tsx tests/vitest/ui/post-editor-layout-hook-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui/post-block-inserter-wave.test.tsx tests/vitest/ui/post-richtext-toolbar-wave.test.tsx tests/vitest/ui/post-richtext-inline-typography-selection.test.ts tests/vitest/ui/media-picker.test.tsx tests/vitest/ui-integration/post-document-inspector.test.tsx tests/vitest/ui-integration/post-block-inserter.test.tsx tests/vitest/ui-integration/post-editor-header-workflow.test.tsx tests/vitest/posts/post-block-catalog-search.test.ts tests/vitest/posts/post-editor-preferences.test.ts tests/vitest/posts/post-editor-layout-state.test.ts tests/vitest/admin/taxonomyClient.test.ts tests/vitest/admin/adminApp.test.tsx`
  - add `tests/vitest/admin/siteSettingsClient.test.ts` when the shared slug
    URL-context helper or settings read path changes.
- Direct owner tests added by this family:
  - `tests/vitest/ui/post-document-inspector-wave.test.tsx`
  - `tests/vitest/posts/post-block-catalog-search.test.ts`
  - `tests/vitest/posts/post-editor-preferences.test.ts`
  - `tests/vitest/posts/post-editor-layout-state.test.ts`
  - `tests/vitest/ui/post-editor-layout-hook-wave.test.tsx`
  - `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - `tests/vitest/ui/media-picker.test.tsx`
  - `tests/vitest/ui-integration/post-block-inserter.test.tsx`
  - `tests/vitest/admin/adminApp.test.tsx`
- Bun only if a leaf widens server/client route contracts:
  - `set -a && source .env && set +a && bun test tests/integration/routes/postsRoutes.test.ts tests/integration/posts/posts-revisions-flow.test.ts`
- QA replay:
  - rerun the Posts checklist from `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` after the
    leaf work lands; do not claim coverage-only closure without replaying the
    user-facing scenarios.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` if the editor contract notes
  change materially
- `_docs/ADMIN_CACHE.md` only if Posts list/detail cache semantics change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when `TASK-195` closes

## Acceptance Criteria

1. The Posts list supports visible-scope bulk selection/actions and no longer
   leaks Pages copy.
2. The editor gives explicit success/failure confidence for publish/update,
   autosave pause, and revision restore decisions.
3. Category and featured-image assignment no longer require users to know raw
   internal IDs.
4. SEO state, slug context, toolbar hints, and block-inserter grouping are
   beginner-readable and regression-covered across the existing create and edit
   flows.
5. The Playwright report scenarios are replayed successfully against the final
   branch state.
6. Any still-reproducible server/runtime autosave failure or capability gap
   outside this family is captured in a linked follow-up task file with named
   owners and evidence instead of being silently downgraded to a note.
