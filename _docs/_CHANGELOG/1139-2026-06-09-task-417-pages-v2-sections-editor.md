# 1139 - TASK-417 Pages V2 Sections Editor

**Date:** 2026-06-09
**Version:** Unreleased
**Tasks:** TASK-417, TASK-417-01, TASK-417-01-L01, TASK-417-01-L02, TASK-417-02, TASK-417-02-L01, TASK-417-02-L02, TASK-417-02-L03, TASK-417-03, TASK-417-03-L01, TASK-417-03-L02, TASK-417-04, TASK-417-04-L01, TASK-417-04-L02, TASK-417-04-L03, TASK-417-04-L04, TASK-417-05, TASK-417-05-L01, TASK-417-05-L02, TASK-417-05-L03, TASK-417-06, TASK-417-06-L01, TASK-417-06-L02, TASK-417-07, TASK-417-07-L01, TASK-417-07-L02, TASK-417-07-L03

## Key Changes

### Pages Contract
- Replaced the Pages document contract with `schemaVersion: 2`, root `sections[]`, and atomic blocks owned by `core/services/pages/pageDocumentV2.ts`.
- Added strict write normalization for fresh admin/API payloads and stored-read reset behavior for legacy/versionless Page rows.
- Removed the old Page widget data normalizer and legacy PageEditor widget-preview helper/test coverage.

### Runtime And API
- Added a Pages v2 public renderer with `data-page-v2`, section, and block DOM markers.
- Kept widget-template, custom-screen, and detail-page `WidgetBlock[]` rendering on their legacy boundary.
- Updated Pages route schemas and `mapPageError` behavior so v1 `blocks[]` writes and unknown v2 fields fail before persistence.

### Admin UI
- Replaced the Pages left/right widget-panel editor with a canvas-first editor, command palette, layers view, device switcher, floating toolbar, Page settings, history, preview, save, and publish flow.
- Updated Page creation to seed a v2 empty document instead of `blocks: []`.
- Preserved existing admin toasts, cache hydration, dirty-state handling, and preview/publish user flows.

### Assistant
- Cut Page active-surface context, action schemas, blueprints, executor, resolver, and policy to v2 sections.
- Retired `page.widget.patch` for Pages while preserving shared widget-block patch helpers for widget-template and custom-screen surfaces.
- Split assistant active Page planning permissions from retained widget-template/detail-page template-reference permissions so Pages v2 do not require `widgets:read`.
- Updated full-service and lead/editorial blueprint emitters so assistant-created public Pages render through the v2 runtime.
- Updated Solution Kits and Advanced site-kit runtime overrides so installed kit Pages emit Pages v2 sections instead of legacy root `blocks[]`.
- Stopped deriving legacy widget-template seeds from Pages v2 data; explicit kit template blueprints remain the widget-template install surface.

### Documentation
- Updated `_docs/PAGE_MODEL.md`, `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, `_docs/ASSISTANT_SITE_BUILDER.md`, `_docs/SECURITY_SPEC.md`, `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`, `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`, `docs/develop/assistant.md`, `docs/develop/content-and-widgets.md`, and the Page editor guide.
- Synchronized TASK-417 physical tasks and the task board.
- Added/updated root `PAGE_EDITOR_V2_TASK_PLAN.md` as the readable implementation summary.

### Security Maintenance
- Upgraded the root dev-only `concurrently` dependency to `10.0.3` so the local security scan no longer pulls the vulnerable `shell-quote@1.8.3` transitive dependency.

## Validation

- `bun --cwd core lint`
  - Passed.
- `bun --cwd core lint:types`
  - Passed.
- `bun run test:vitest -- tests/vitest/pages/page-document-v2.test.ts tests/vitest/ui/page-editor.test.tsx tests/vitest/ui/page-editor-layout-shell.test.tsx tests/vitest/ui-integration/pageBuilder.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`
  - Passed: 5 files, 17 tests.
- `bun run test:vitest -- tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/action-undo-manifest.test.ts tests/vitest/assistant/active-surface-hydration.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/use-assistant-admin-context.test.tsx`
  - Passed: 8 files, 185 tests.
- `bun run test:vitest -- tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-page-section-composer.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/blueprint-admin-surface-composer.test.ts tests/vitest/assistant/page-widget-patch.test.ts`
  - Passed: 7 files, 100 tests.
- `set -a && source .env && set +a && bun test tests/unit/pages/pageService.test.ts tests/unit/pages/pageRevisionAutosave.test.ts tests/unit/pages/validation.test.ts tests/integration/routes/pages.test.ts tests/integration/runtime/pages-runtime.test.ts`
  - Passed: 34 tests.
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts`
  - Passed: 74 tests.
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts`
  - Passed: 73 tests.
- `bun test tests/unit/kits/kitManifest.test.ts tests/unit/kits/kitInstaller.test.ts tests/unit/kits/solutionKitsCatalog.test.ts`
  - Passed: 3 files, 9 tests.
- `set -a && source .env && set +a && bun test tests/unit/assistant/siteBuilderExecutor.test.ts tests/unit/kits/installService.test.ts`
  - Passed: 2 files, 9 tests.
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts tests/vitest/assistant/siteBuilderPlanner.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts`
  - Passed: 3 files, 17 tests.
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant.test.ts`
  - Passed after the post-commit assistant active Page permission drift fix.
- `set -a && source .env && set +a && bun test tests/integration/routes/detailPages.test.ts tests/integration/routes/widgetTemplatePreview.test.ts`
  - Passed: 11 tests.
- `set -a && source .env && set +a && bun test tests/integration/runtime/detail-page-runtime.test.ts`
  - Passed: 8 tests.
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx tests/vitest/ui/widget-template-preview-dialog.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
  - Passed: 4 files, 33 tests.
- `bun run gates:coderso`
  - Passed: functional, UX, performance, security, and reliability gates.
- `bun run scan:security`
  - Passed: Semgrep, Bun audit, Trivy vuln/config/secret, Gitleaks history, and Gitleaks worktree.
- `bun run scan:security:strict`
  - Passed: Semgrep, Bun audit, Trivy vuln/config/secret, Gitleaks history, and Gitleaks worktree.
- `coderso-dev-core-host` plus `playwright-cli`
  - Passed: admin Pages list/create/editor load, section insertion, draft save toast, publish toast, and public `/task-417-playwright-smoke` runtime with `data-page-v2`, `hero` section, and `heading/text/button` blocks.

## Notes

- A combined multi-file detail-page runtime run hit shared DB fixture interference (`entry_not_found`) when run alongside other detail runtime files. The affected `tests/integration/runtime/detail-page-runtime.test.ts` file passed when rerun in isolation, and the other detail runtime files had already passed in the combined run.
- Final Claude/subagent drift audit summaries are recorded in the TASK-417 closeout. The post-commit audits found and fixed a stale `widgets:read` requirement for active Page planning plus a corrupt stored-read `revisionRetention` fallback mismatch before the final amend.
