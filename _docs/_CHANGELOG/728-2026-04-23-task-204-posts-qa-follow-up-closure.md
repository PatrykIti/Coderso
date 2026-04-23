# 728. TASK-204 posts QA follow-up closure

Date: 2026-04-23
Version: unreleased
Tasks: TASK-204, TASK-204-01, TASK-204-01-01, TASK-204-01-02, TASK-204-02, TASK-204-02-01, TASK-204-02-02, TASK-204-03, TASK-204-03-01, TASK-204-03-02, TASK-204-04, TASK-204-04-01

## Key Changes

### CMS Posts / Admin UI

- Tightened the shared admin toaster mount for Posts feedback with accessible
  notification labeling, close controls, and bounded duration.
- Added a revisions drawer description and useful fallback metadata for
  revisions without extractable preview text.
- Added safe category-load error copy with retry in the Posts inspector.
- Scoped block inserter search placeholder and aria-label copy to the active
  category, with tests proving category plus query intersection.

### Admin API / Error Boundaries

- Mapped taxonomy overview unexpected failures to bounded
  `taxonomy_unexpected_error` responses.
- Mapped settings route unexpected failures to bounded `settings_error`
  responses so raw query text does not reach the admin browser.
- Mapped posts autosave unexpected persistence failures to
  `post_autosave_failed` while keeping the editor's autosave failure state
  truthful.

### Docs / QA

- Updated the Posts Playwright summary with TASK-204 closure status for every
  finding from the 2026-04-23 report.
- Kept Video/Gallery/Audio/File media blocks explicitly open as real
  capability work instead of adding catalog-only labels.
- Updated CMS API, content editor UX, CMS spec, current-state docs, task files,
  and task board status for the TASK-204 family.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/block-inserter-wave.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui/post-block-inserter-wave.test.tsx tests/vitest/ui-integration/post-block-inserter.test.tsx tests/vitest/ui-integration/post-editor-inserter-sidebar.test.tsx tests/vitest/posts/post-block-catalog-search.test.ts`
- `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/taxonomy.test.ts tests/integration/routes/settings.test.ts tests/integration/routes/postsRoutes.test.ts`
