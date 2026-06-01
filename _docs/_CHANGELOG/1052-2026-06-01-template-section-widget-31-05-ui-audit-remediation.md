# 1052 - Template Section widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-362, TASK-362-01, TASK-362-02

## Key Changes

- Added a UUID-or-empty Template Section `templateId` contract owned by the
  widget domain and used by runtime normalization.
- Made public legacy runtime fail safely for malformed Template Section IDs:
  no UUID-column DB query, no HTTP 500, and no raw ID/template-name leak in
  visible placeholders.
- Kept widget-template reads tolerant for legacy rows while enforcing strict
  widget-block validation on create, update, duplicate, and revision restore.
- Propagated nested `template_loop` results to parent markers so looped
  templates no longer report `ready`.
- Updated Template Section docs, page-model docs, the 31-05 Playwright report,
  task board, and task closure notes.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/templateSection.test.tsx tests/vitest/widgets/templateSectionRuntime.test.ts tests/vitest/site/publicRenderer.test.tsx tests/vitest/ui/template-section-editor-wave.test.tsx`
- `bun test tests/unit/pages/pageWidgetData.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/widgetTemplateService.test.ts --test-name-pattern "Template Section|legacy reads|revision restore"`
- `set -a && source .env && set +a && bun test tests/integration/routes/pages.test.ts --test-name-pattern "Template Section references"`
- `bun test tests/integration/routes/widgetTemplates.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts --test-name-pattern "Template Section"`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Claude CLI read-only diff review for TASK-362 - no blockers
