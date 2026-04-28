# 757-2026-04-28 - TASK-226 Coderso rebrand and Advanced admin IA

Date: 2026-04-28
Version: Coderso Admin/Core
Tasks: TASK-226, TASK-226-00, TASK-226-01, TASK-226-02, TASK-226-03

## Key Changes

### Branding
- Renamed product-facing package metadata, runtime defaults, setup/auth/settings copy, widget defaults, assistant copy, release docs, and fixtures from Nextless to Coderso.
- Refreshed the primary product tagline to `Coderso - The modular CMS platform`.
- Kept historical changelog/task evidence intentionally unchanged unless it is current source-of-truth documentation.

### Admin IA
- Renamed the technical admin module group from Coderso to Advanced.
- Moved canonical advanced admin paths to `/admin/advanced/*`.
- Kept Posts as a top-level Main resource at `/admin/posts`.
- Preserved `/admin/coderso/*` and legacy flat paths as compatibility aliases.

### Compatibility
- Added Coderso webhook headers while still emitting legacy `X-Nextless-*` headers.
- Migrated admin/browser storage keys to `coderso.*` with legacy `nextless.*` read/write fallback where needed.
- Moved assistant admin runtime context to schema v2 with `advancedModule`, while keeping strict schema v1 compatibility for legacy `codersoModule` payloads.
- Updated `gates:coderso` UI smoke paths to the current Vitest-owned UI suites.

## Validation

- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `bun run lint:repo:types` - PASS.
- `bun run test:vitest -- tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/admin-router.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/cacheBus.test.ts tests/vitest/admin/requestMetrics.test.ts tests/vitest/posts/post-editor-preferences.test.ts` - PASS.
- `bun run test:vitest -- tests/vitest/ui/admin-shell.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/admin-link.test.tsx tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/operation-policy-advanced-modules.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts` - PASS.
- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/forms/formAutomationRunnerCore.test.ts tests/vitest/ui-integration/settings.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx` - PASS.
- `bun test tests/unit/settings/settingsService.test.ts tests/unit/email/emailSettingsService.test.ts tests/unit/webhooks/deliveryService.test.ts tests/unit/tools/importExport.test.ts tests/unit/integrations/integrationsService.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts tests/integration/routes/webhooks.test.ts tests/perf/admin-prefetch-budget.test.ts tests/perf/admin-request-baseline.test.ts tests/perf/codersoPerformanceGate.test.ts` - PASS (DB/provider-gated skips remain skip-only in the selected files).
- `bun run gates:coderso` - PASS.
- `git diff --check` - PASS.

## Residual Notes

- Final residual scan after implementation: `208` files / `519` matches for `nextless`, using the TASK-226 inventory-file exclusion.
- Remaining matches are classified as legacy compatibility (`X-Nextless-*`, `nextless.*` storage/debug keys, public widget runtime selectors, template markers, `/admin/coderso/*`, `codersoModule`) or historical evidence in older changelog/task/playwright/prototype files.
