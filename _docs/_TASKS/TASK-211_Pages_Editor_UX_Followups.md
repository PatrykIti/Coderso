# TASK-211: Pages Editor UX Followups
# FileName: TASK-211_Pages_Editor_UX_Followups.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI + Runtime Preview + Notifications
**Estimated Effort:** Large
**Dependencies:** TASK-194, TASK-208
**Status:** To Do

---

## Overview

Close the remaining Pages editor UX follow-ups from
`_docs/PLAYWRIGHT/SUMMARY-PAGES.md` without reopening `BUG-6`.

`BUG-6` is intentionally out of scope for this family. The user will verify the
CSRF retry fix separately. This task family covers the still-visible UX gaps:

- runtime preview can still show a blank/raw iframe when the target route returns
  an error instead of rendering the Admin UI placeholder;
- Page editor save/publish success feedback still uses a local inline alert
  instead of the central Admin UI Sonner notification path;
- inserted-block scroll proof only proves `scrollIntoView` was called, not that
  the inserted block lands correctly in the canvas viewport;
- Page History still exposes `autosave` copy to end users while Page Settings
  moved to the friendlier `draft version in history` wording.

The toast work must be consistent with `/admin/pages` list behavior already
shipped by `TASK-208`: one shared `AdminApp` Sonner host, token-backed state
styling, shared adapter semantics, thin resource/surface adapters, and no
Pages-editor-only notification system.

## Current Repo Findings

- `core/admin/app/AdminApp.tsx` already mounts the single shared `Toaster` with
  `position="top-right"`, `richColors`, `closeButton`, `duration={4000}`, and
  `containerAriaLabel="Admin notifications"`.
- `core/admin/ui/shared/listActionToasts.ts` owns shared list-action success,
  error, and bulk-result message behavior for Pages list and other admin list
  surfaces.
- `core/admin/ui/pages/PageListPage.tsx` already routes list mutations through
  that shared adapter. The editor must match the same central notification
  contract instead of keeping success feedback only in a local `Alert`.
- `core/admin/ui/pages/PageEditor.tsx` currently calls
  `showStatusNotice("Draft saved.")` and `showStatusNotice("Page published.")`
  after save/publish. That local notice is not a Sonner toast and does not prove
  the shared notification surface is used.
- `core/admin/ui/preview/RuntimePreviewDialog.tsx` marks the iframe ready in
  `onLoad`. A browser iframe can fire `load` for an error document, so iframe
  `onLoad` alone cannot prove the preview route returned usable content.
- `core/admin/ui/pages/PageEditor.tsx` currently scrolls inserted blocks with
  `scrollIntoView({ behavior: "smooth", block: "center" })`. The manual report
  needs the new block's top/header to land inside the visible canvas viewport.
- `core/admin/ui/pages/PageRevisionDrawer.tsx` still renders user-facing
  `autosave` wording in the drawer description, badges, and confirmation copy.

## Required Product Behavior

1. Runtime preview failure is actionable:
   - if a preview target is unreachable or returns an error status, the dialog
     shows the Admin UI placeholder instead of a blank/raw iframe;
   - preview error copy includes the sanitized target label and never leaks the
     preview token.
2. Save/publish feedback uses the central Admin UI notification system:
   - success and error outcomes emit through Sonner via a shared adapter;
   - local inline state may remain as contextual status/error, but it cannot be
     the only success feedback path.
3. Inserted blocks land predictably:
   - after add/insert, the new block is selected, highlighted, focused, and its
     heading/top edge is visible in the canvas viewport.
4. History copy is user-friendly:
   - Page History uses `draft version` wording for the user-facing saved draft
     state;
   - backend/API values such as `kind: "autosave"` stay unchanged.

## Sub-Tasks

- [ ] TASK-211-01: Runtime Preview Probe and Failure State
- [ ] TASK-211-02: Page Editor Shared Toast Feedback
- [ ] TASK-211-03: Inserted Block Viewport Alignment
- [ ] TASK-211-04: Page History Draft Copy Cleanup
- [ ] TASK-211-05: QA, Docs, and Source Report Closure

## Leaf Breakdown

- [ ] TASK-211-01-01: Preview Probe Security and Service Contract
- [ ] TASK-211-01-02: Runtime Preview Dialog Error State
- [ ] TASK-211-02-01: Admin Action Toast Adapter for Editor Mutations
- [ ] TASK-211-02-02: Page Editor Save Publish Toast Wiring
- [ ] TASK-211-03-01: Inserted Block Scroll Target and Test Proof
- [ ] TASK-211-04-01: Page Revision Drawer User-Facing Copy
- [ ] TASK-211-05-01: Pages Editor Followup Test Matrix
- [ ] TASK-211-05-02: Docs, Changelog, and Playwright Report Closure

## Non-Goals

- Do not include or verify `BUG-6` in this family.
- Do not add a second toaster host or a Pages-editor-only notification layer.
- Do not replace the Page editor shell, block model, preview token model, or
  publish semantics.
- Do not accept arbitrary preview URLs from the browser for server-side probing.
- Do not rename persisted/API revision kind values such as `autosave`.

## Security Contract

- Visibility:
  - editor UI is internal admin only;
  - runtime preview remains public read-only by preview token.
- Auth model:
  - admin preview generation/probe and page mutations require existing admin
    session/admin API key path;
  - public `/preview` keeps token-only access.
- RBAC:
  - `content:read` for preview generation/probe and revision reads;
  - `content:write` for page save/autosave/revision discard;
  - `content:publish` for publish/unpublish.
- CSRF:
  - existing admin `POST/PATCH/DELETE` calls keep `withCsrf: true`;
  - any new or extended admin preview probe POST must also use CSRF.
- Rate-limit bucket:
  - existing admin read/probe/write buckets; preview probing must be bounded and
    timeout-limited.
- Reject-unknown validation:
  - any preview probe payload must be schema-first and reject unknown fields;
  - do not accept arbitrary user-entered URLs for probing.
- Anti-abuse:
  - preview probe can only operate on a URL generated by the existing preview
    route or a server-owned configured preview target;
  - redirects to unapproved origins are rejected;
  - response/logging redacts preview tokens and does not include fetched body
    content;
  - notification copy must not expose raw server errors that include tokens,
    headers, cookies, or privileged settings.

## Implementation Order

1. Fix runtime preview failure detection first because it can require a small
   internal preview probe contract and must avoid SSRF/token leakage.
2. Add the shared editor mutation toast adapter and wire Page editor
   save/publish outcomes through the central Sonner host.
3. Tighten inserted-block scroll behavior and add viewport-aware proof.
4. Clean up Page History copy without changing persisted revision semantics.
5. Close with targeted Vitest/Bun lanes, docs, changelog, task board, and
   refreshed `SUMMARY-PAGES.md` status.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/runtime-preview-dialog.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx tests/vitest/ui/page-editor-insert-scroll.test.tsx tests/vitest/ui/page-revision-drawer.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/sonner.test.tsx`
- If preview route/probe behavior changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/pages.test.ts tests/unit/pages/previewService.test.ts`
- If the shared toast adapter is generalized:
  - keep `tests/vitest/ui/list-action-toasts.test.ts` green so existing list
    screens do not regress.

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/CMS_API.md` if preview response/probe metadata changes.
- `_docs/CONTENT_LIST_UX.md` only if shared notification semantics are
  generalized beyond list screens.
- `_docs/DESIGN_TOKENS.md` only if the central toast host/token contract changes.
- `_docs/PLAYWRIGHT/SUMMARY-PAGES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Runtime preview failure shows the shared Admin UI error placeholder for
   unreachable/error preview targets and does not leak tokens.
2. Page editor save/publish success and failure feedback route through the
   central Sonner notification system via a shared adapter.
3. The editor keeps useful inline error/status state only as contextual support,
   not as the only success notification.
4. Inserted blocks scroll to a viewport-safe position and the test proves more
   than a raw `scrollIntoView` call.
5. Page History uses user-facing `draft version` wording while API/domain
   revision kinds remain backward compatible.
6. `BUG-6` remains explicitly excluded from TASK-211 closure.
