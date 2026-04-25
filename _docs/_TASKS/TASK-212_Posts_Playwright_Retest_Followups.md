# TASK-212: Posts Playwright Retest Follow-ups
# FileName: TASK-212_Posts_Playwright_Retest_Followups.md

**Priority:** High
**Category:** CMS/Posts + Admin/UI + Accessibility + Post Blocks
**Estimated Effort:** Large
**Dependencies:** TASK-204, TASK-208, TASK-211
**Status:** To Do

---

## Overview

Close the remaining findings from the 2026-04-25 Playwright CLI retest in
`_docs/PLAYWRIGHT/SUMMARY-POSTS.md`.

`TASK-204` closed the first Posts follow-up wave and intentionally classified
the larger Media tab gap as an explicit capability gap. The 2026-04-25 replay
proves most of that work still holds, but it also shows three items that need a
new implementation family:

- `BUG-5`: publish/update returns `200 OK` and updates badge/button state, but
  no Sonner toast appears and `[aria-live=polite]` remains empty.
- `UX-4`: Media still contains only `Image` and `Embed`; `Video`, `Gallery`,
  `Audio`, and `File` remain absent.
- `BUG-8`: Create New Post drawer logs a Radix missing description warning
  because `aria-describedby` points at a missing element id.

The same replay confirms the older `TASK-195` and `TASK-204` repairs still work:
bulk selection, Posts search copy, toolbar button semantics, category/media
pickers, taxonomy raw-SQL redaction, revisions preview, revision dialog
description, SEO summary, slug route context, typography helper copy, and
category-scoped inserter search. This family must not reopen those fixed seams
unless implementation or a fresh replay proves a regression.

## Current Repo Findings

- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` calls
  `toast.success(wasPublished ? "Changes saved" : "Post published")` after
  `editor.publish()`, but the replay proves this is not reaching the visible
  Sonner DOM/live-region path.
- `core/admin/ui/shared/actionToasts.ts` now exists from the Pages follow-up and
  is the shared adapter for editor mutation success/error copy.
- `core/admin/ui/pages/PageEditor.tsx` already uses that adapter for save and
  publish. Posts editor should follow the same shared editor-toast contract.
- `core/admin/ui/posts/PostsCreateDrawer.tsx` renders the create drawer
  subtitle as a plain `<p>` while importing only `SheetTitle`; it should use the
  shared sheet description primitive so Radix can bind `aria-describedby`.
- `core/services/posts/editor/postBlockDocument.ts` currently includes
  `image` and `embed`, but not `video`, `gallery`, `audio`, or `file`.
- `core/admin/ui/posts/editor/blocks/blockCatalog.ts` exposes only `Image` and
  `Embed` under the Media category. Any new Media items must be backed by
  schema/defaults, normalizers, editor UI, runtime rendering, and tests.

## Required Product Behavior

1. Publish/update feedback is visible and accessible:
   - success and failure outcomes emit through the shared Admin UI Sonner host;
   - visible toast DOM or equivalent live-region text is proven in tests;
   - inline header state remains truthful but is not the only confirmation.
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
- Do not claim `BUG-5` fixed from a mocked `toast.success` call alone.
- Do not replace the Posts editor shell, publish/update route contract, or
  autosave semantics.
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

1. Fix publish/update toast delivery first because it is a replayed regression
   against an already documented Posts editor contract.
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

1. `BUG-5` is fixed by visible, accessible Sonner feedback after publish and
   update, with failure feedback no longer swallowed.
2. `BUG-8` is fixed and covered by a console-clean drawer a11y test.
3. `UX-4` is either implemented end to end for the accepted media block types
   or remains explicitly open with no unsupported catalog labels.
4. The 2026-04-25 source report is updated with closure evidence and no
   ambiguity between fixed, partial, open, and deferred states.
