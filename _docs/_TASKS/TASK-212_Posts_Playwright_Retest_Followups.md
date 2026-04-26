# TASK-212: Posts Playwright Retest Follow-ups
# FileName: TASK-212_Posts_Playwright_Retest_Followups.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Accessibility + Editor Wrapper + Post Blocks
**Estimated Effort:** Large
**Dependencies:** TASK-204, TASK-208, TASK-211
**Status:** To Do

---

## Overview

Close the remaining Posts editor findings from the 2026-04-25 and 2026-04-26
Playwright CLI retests in `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`, and normalize the
Posts editor wrapper behavior with the already-fixed Pages editor.

`TASK-204` closed the first Posts follow-up wave and intentionally classified
the larger Media tab gap as an explicit capability gap. The 2026-04-25 replay
proved most of that work still holds and found two live issues. The 2026-04-26
deep retest then proved the visible publish/update toast is fixed in the browser,
while exposing that the Posts editor still has a wrapper-contract debt compared
with Pages:

- `BUG-5`: now live-fixed from a user perspective, but Posts still calls Sonner
  directly from `PostBlockEditorShell` and swallows publish/update failures
  instead of using the shared editor action-toast adapter that Pages uses.
- `UX-4`: Media still contains only `Image` and `Embed`; `Video`, `Gallery`,
  `Audio`, and `File` remain absent.
- `BUG-8`: Create New Post drawer logs a Radix missing description warning
  because `aria-describedby` points at a missing element id.

The same replay confirms the older `TASK-195` and `TASK-204` repairs still work:
bulk selection, Posts search copy, toolbar button semantics, category/media
pickers, taxonomy raw-SQL redaction, revisions preview, revision dialog
description, SEO summary, slug route context, typography helper copy, and
category-scoped inserter search, and 2026-04-26 publish/update toasts. This
family must not reopen those fixed seams unless implementation or a fresh replay
proves a regression.

## Source Status Snapshot

| Source item | Latest state | TASK-212 contract |
|---|---|---|
| `BUG-1`, `BUG-2` list normalization | Fixed | Regression-smoke only; do not reopen list surface work. |
| `BUG-3`, `BUG-4`, `BUG-6`, `BUG-7`, `UX-1`, `UX-2`, `UX-3`, `UX-5`, `UX-6`, `UX-7` | Fixed | Preserve as baseline while touching editor seams. |
| `BUG-5` publish/update toast | Fixed live on 2026-04-26 | Hardening task: move Posts onto the shared Pages editor adapter, bounded errors, and cache/update proof. |
| `BUG-8` Create New Post Radix description | Open | Fix with `SheetDescription` and faithful dialog a11y coverage. |
| `UX-4` Media block capability | Open/deferred capability gap | Implement end to end or keep explicitly deferred with no catalog-only labels. |
| 2026-04-26 new UX observations | Not blockers for TASK-212 | Do not silently include toolbar type label, delete undo, or empty-block runtime-drop work unless separately added. |

## Current Repo Findings

- `core/admin/app/AdminApp.tsx` mounts the single shared `Toaster` with
  `position="top-right"`, `richColors`, `closeButton`, `duration={4000}`, and
  `containerAriaLabel="Admin notifications"`.
- `core/admin/ui/shared/actionToasts.ts` exists from the Pages editor follow-up
  and is the shared adapter for non-list admin mutation success/error copy.
- The Pages editor fix is not a monolithic editor-wrapper framework. It is a
  shared action-toast helper plus resource-local editor handlers/state. Posts
  should plug into that seam instead of introducing an editor provider,
  mutation bus, or Posts-only wrapper layer.
- `core/admin/ui/pages/PageEditor.tsx` uses `createAdminActionToastAdapter` for
  save/publish success and error paths while keeping inline status/error state as
  contextual support.
- `core/admin/services/apiClient.ts` owns shared admin CSRF bootstrap and
  retry-once refresh for `csrf_invalid` / `csrf_expired`; Posts must reuse this
  transport through `postsClient`, not add editor-local token handling.
- `core/admin/services/postsClient.ts` already uses shared cache keys, TTL-backed
  local cache, `cacheBus` broadcasts, and `withCsrf` writes. `usePostEditorState`
  already has `remoteUpdatePending`/dirty-state guards. TASK-212 should verify
  and harden this behavior against Pages parity instead of replacing it.
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` still imports `toast`
  directly and calls `toast.success(wasPublished ? "Changes saved" : "Post published")`
  after `editor.publish()`, then swallows rejected publish/update with
  `catch(() => undefined)`.
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx` and
  `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx` are already
  presentational callback surfaces. Keep mutation execution and toast/error
  decisions in the shell/hook boundary unless a real source bug proves
  otherwise.
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` already sets bounded
  inline errors and rethrows publish/save failures. The shell should route those
  rejections through the shared action-toast adapter instead of dropping them.
- `PostBlockEditorShell` also has a manual autosave retry path
  (`editor.saveDraft().catch(() => undefined)`). Do not add background autosave
  success toasts. If the manual retry path is touched, keep the error handling
  explicit and bounded, but do not turn this family into a new primary Save Draft
  feature for Posts.
- `RuntimePreviewDialog` already supports optional probe metadata from Pages.
  Posts currently uses the same dialog without probe metadata. Any parity work
  must reuse optional dialog props and the existing `previewPost` route/client
  seam first.
- `core/admin/ui/posts/PostsCreateDrawer.tsx` renders the create drawer
  subtitle as a plain `<p>` while importing only `SheetTitle`; it should use the
  shared sheet description primitive so Radix can bind `aria-describedby`.
- `core/services/posts/editor/postBlockDocument.ts` currently includes
  `image` and `embed`, but not `video`, `gallery`, `audio`, or `file`.
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts` exposes only `Image` and
  `Embed` under the Media category. Any new Media items must be backed by
  schema/defaults, normalizers, editor UI, runtime rendering, and tests.

## Required Product Behavior

1. Posts editor wrapper parity matches Pages where the contract is shared:
   - success and failure outcomes emit through the shared Admin UI Sonner host
     via `createAdminActionToastAdapter`, not direct component-local Sonner calls;
   - shared parity means shared owner boundaries and bounded feedback behavior,
     not identical button sets or identical literal copy across Pages and Posts;
   - `apiClient` remains the single CSRF bootstrap/retry owner for admin writes;
   - `postsClient` remains the cache/TTL/cacheBus owner for list/detail cache
     changes;
   - editor state keeps dirty-state and remote-update guards so cache refreshes
     cannot overwrite unsaved local edits;
   - inline header/error state remains truthful but is not the only confirmation.
2. Create New Post drawer is accessible:
   - the drawer content has a real description element bound by
     `aria-describedby`;
   - opening the drawer produces no Radix missing-description console warning.
3. Media block capability is real, not catalog-only:
   - `Video`, `Gallery`, `Audio`, and `File` are either implemented end to end
     or, if product scope defers them, the source report stays explicitly open
     with owners and no fake labels.
4. Source report closure is precise:
   - `_docs/PLAYWRIGHT/SUMMARY-POSTS.md` distinguishes fixed, still-open, and
     deferred capability states;
   - task board, docs, changelog, and validation evidence agree.

## Sub-Tasks

- `TASK-212-01_Post_Editor_Publish_Update_Toast_Delivery.md`
- `TASK-212-02_Create_Post_Drawer_A11y_Description.md`
- `TASK-212-03_Post_Media_Block_Capability_Expansion.md`
- `TASK-212-04_QA_Docs_and_Playwright_Source_Closure.md`

## Leaf Breakdown

- `TASK-212-01-01_Post_Editor_Action_Toast_Adapter_Wiring.md`
- `TASK-212-01-02_Post_Publish_Update_Live_Toast_Proof.md`
- `TASK-212-02-01_Create_Post_Drawer_SheetDescription_Wiring.md`
- `TASK-212-02-02_Post_Dialog_A11y_Regression_Matrix.md`
- `TASK-212-03-01_Media_Block_Schema_Defaults_and_Normalization.md`
- `TASK-212-03-02_Media_Block_Editor_Inspector_and_Runtime_Rendering.md`
- `TASK-212-04-01_Posts_Retest_Validation_Matrix.md`
- `TASK-212-04-02_Docs_Changelog_and_Source_Report_Update.md`

## Non-Goals

- Do not add another toaster host, event bus, or Posts-only notification system.
- Do not add a new generic editor-wrapper framework or provider. Extend the
  existing shared action-toast helper only if a small generic option is truly
  needed by Pages and Posts.
- Do not reopen `BUG-5` as a missing visible toast unless a fresh replay proves
  that regression again.
- Do not add a new primary Save Draft action to the Posts editor as part of this
  family; Posts currently has publish/update plus autosave/manual retry flows.
- Do not claim editor-wrapper parity from a mocked `toast.success` call alone.
- Do not replace the Posts editor shell, publish/update route contract, cache
  client, CSRF transport, or autosave semantics.
- Do not add Media catalog labels that create unsupported block types.
- Do not change stored post slug semantics, taxonomy storage, or revision kind
  semantics.
- Do not treat public runtime rendering as an admin-only concern when new media
  blocks are introduced.

## Security Contract

- Visibility:
  - Posts editor and create drawer remain internal admin only;
  - published post media blocks render on the public runtime path only after
    strict normalization and safe rendering.
- Auth model:
  - publish/update and create-post flows keep the existing admin session/API-key
    path;
  - no new public write endpoint is introduced.
- RBAC:
  - `content:write` for draft/update/create paths;
  - `content:publish` for publish/update lifecycle transitions;
  - public runtime remains read-only.
- CSRF:
  - existing admin writes keep `withCsrf: true`;
  - no CSRF change is allowed without route tests and docs.
- Rate-limit bucket:
  - existing admin write/read buckets for admin flows;
  - existing public read bucket for published runtime output.
- Reject-unknown validation:
  - new media block types, if accepted, must be added to
    `POST_BLOCK_TYPES` and normalized through `postBlockNormalizer`;
  - payloads must reject or drop unknown unsafe fields through the existing
    schema-first normalizer path.
- Anti-abuse:
  - toast/error copy must not leak raw API payloads, tokens, SQL, headers, or
    private media URLs;
  - media URLs and embeds must use the existing safe provider/MIME contracts;
  - file/audio/video blocks must not render arbitrary executable content;
  - gallery/file references must be bounded to media-library-owned assets.

## Implementation Order

1. Harden publish/update feedback first. Treat the latest live toast as fixed,
   but move the implementation onto the shared Pages adapter and bounded error
   path.
2. Fix Create New Post drawer description and add console-clean coverage.
3. Implement or formally defer the Media block capability expansion using the
   full block contract.
4. Close with targeted Vitest/Bun lanes, Playwright retest notes, docs,
   changelog, and board sync.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI/admin lanes:
  - `tests/vitest/ui/action-toasts.test.ts`
  - `tests/vitest/admin/adminApp.test.tsx`
  - `tests/vitest/admin/sonner.test.tsx`
  - `tests/vitest/ui/post-block-editor-shell-wave.test.tsx`
  - `tests/vitest/ui/post-editor-state-hook-wave.test.tsx`
  - `tests/vitest/ui-integration/post-editor-header-workflow.test.tsx`
  - `tests/vitest/ui/page-post-list-wave.test.tsx` if shared list/editor toast
    helpers are touched.
- Create drawer a11y lanes:
  - existing Posts create/list component coverage, or a new focused
    `tests/vitest/ui/posts-create-drawer-a11y.test.tsx`;
  - console-error-clean proof under the Vitest happy-dom guardrails.
- Media block lanes, if new block types are accepted:
  - `tests/vitest/posts/postBlockDocument.test.ts`
  - `tests/vitest/posts/post-block-normalizer-writing-canvas.test.ts`
  - `tests/vitest/posts/post-block-runtime-renderer.test.tsx`
  - `tests/vitest/posts/post-block-transforms.test.ts`
  - `tests/vitest/ui/post-block-inserter-wave.test.tsx`
  - `tests/vitest/ui/block-inserter-wave.test.tsx`
  - editor canvas/inspector suites for new controls and media picker behavior.
- Bun route/runtime suites are required only if publish/update routes, media
  delivery, preview, or public runtime route contracts change. Load DB env first:
  `set -a && source .env && set +a`.
- Manual Playwright CLI replay:
  - publish and update create visible `[data-sonner-toast]` or populated
    `Admin notifications` live-region output;
  - rejected publish/update keeps inline error state and emits bounded error
    toast copy;
  - Create New Post drawer opens without Radix description warning;
  - Media tab shows only fully supported capabilities.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if media runtime/API contracts change
- `_docs/UI/POST_EDITOR_NEXTLESS_CURRENT_STATE.md` if editor/media UX changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. `BUG-5` remains fixed live, and Posts editor mutation feedback is normalized
   onto the shared Pages editor action-toast adapter with failure feedback no
   longer swallowed.
2. `BUG-8` is fixed and covered by a console-clean drawer a11y test.
3. `UX-4` is either implemented end to end for the accepted media block types
   or remains explicitly open with no unsupported catalog labels.
4. The source report is updated with 2026-04-25 and 2026-04-26 closure evidence
   and no ambiguity between fixed, partial, open, and deferred states.
