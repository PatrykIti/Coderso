# 722. TASK-195 posts admin QA recovery

Date: 2026-04-22
Version: unreleased
Tasks: TASK-195, TASK-195-01, TASK-195-01-01, TASK-195-01-02, TASK-195-02, TASK-195-02-01, TASK-195-02-02, TASK-195-02-03, TASK-195-03, TASK-195-03-01, TASK-195-03-02, TASK-195-04, TASK-195-04-01, TASK-195-04-02, TASK-195-05

## Key Changes

### QA/CMS Posts

- Repaired Posts list selection so header and row checkboxes are controlled,
  scoped to visible filtered rows, and reveal a bulk-actions toolbar.
- Added bulk publish / move-to-draft / delete flow with authoritative refresh
  and clear partial-failure surfacing.
- Fixed shared Posts search copy to use Posts-specific placeholder and
  accessible label instead of leaking Pages wording.

### Admin Post Editor

- Clarified editor shell controls so `Details` maps to the right inspector and
  retains the existing shell/layout ownership.
- Added shared admin toast success feedback for publish/update and actionable
  autosave retry surfacing inside the editor.
- Added bounded revision preview before restore.

### Post Inspector And Authoring

- Replaced raw category/media ID fields with category selection and
  image-only featured-image picking through the shared media picker.
- Surfaced SEO completion on collapsed `Advanced` and added display-only slug
  URL or route hint context for both create and edit flows.
- Clarified typography helper copy under the current toolbar contract.
- Regrouped block inserter so `Embed` appears under Media and `Separator` under
  Text while keeping category-scoped search deterministic.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/posts-table-wave.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx tests/vitest/ui/post-editor-state-hook-wave.test.tsx tests/vitest/ui/post-editor-layout-hook-wave.test.tsx tests/vitest/ui/post-document-inspector-wave.test.tsx tests/vitest/ui/post-details-sidebar-wave.test.tsx tests/vitest/ui/post-block-inserter-wave.test.tsx tests/vitest/ui/post-richtext-toolbar-wave.test.tsx tests/vitest/ui/post-richtext-inline-typography-selection.test.ts tests/vitest/ui/media-picker.test.tsx tests/vitest/ui-integration/post-document-inspector.test.tsx tests/vitest/ui-integration/post-block-inserter.test.tsx tests/vitest/ui-integration/post-editor-header-workflow.test.tsx tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx tests/vitest/ui-integration/post-autosave-flow.test.tsx tests/vitest/posts/post-block-catalog-search.test.ts tests/vitest/posts/post-editor-preferences.test.ts tests/vitest/posts/post-editor-layout-state.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/taxonomyClient.test.ts tests/vitest/admin/adminApp.test.tsx`
