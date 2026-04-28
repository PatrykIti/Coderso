# TASK-226-03-01: Rebrand and IA Regression Matrix
# FileName: TASK-226-03-01_Rebrand_and_IA_Regression_Matrix.md

**Priority:** Medium
**Category:** QA + Routing + Assistant + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-226-01-02, TASK-226-02-03
**Status:** Done - 2026-04-28

---

## Overview

Run the focused regression matrix for the product rename and Advanced IA route
change. This leaf owns test selection and evidence, not final docs/changelog
closure.

## Sub-Tasks

- [x] Validate lint/type surfaces.
- [x] Validate product default changes.
- [x] Validate admin route canonicalization and legacy aliases.
- [x] Validate sidebar Advanced group rendering and permission hiding.
- [x] Validate prefetch/cache behavior for canonical and legacy routes.
- [x] Validate assistant frontend/backend route context.
- [x] Validate webhook header compatibility.
- [x] Validate perf/gate routes or record pre-existing blockers.

## Files to Validate

| Contract | Test files / commands |
|----------|-----------------------|
| Lint/types | `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run lint:repo:types` |
| Product defaults | `tests/unit/settings/settingsService.test.ts`, `tests/unit/email/emailSettingsService.test.ts`, `tests/vitest/admin/settingsClient.test.ts` |
| Webhook headers | `tests/unit/webhooks/deliveryService.test.ts`, `tests/integration/routes/webhooks.test.ts` |
| Admin routes | `tests/vitest/admin/adminPaths.test.ts`, `tests/vitest/admin/admin-router.test.ts`, `tests/vitest/ui/admin-link.test.tsx` |
| Prefetch/cache | `tests/vitest/admin/adminPrefetch.test.ts`, `tests/vitest/admin/admin-prefetch-policy.test.ts`, `tests/perf/admin-prefetch-budget.test.ts` |
| Sidebar IA | `tests/vitest/admin/advanced-modules.test.ts`, `tests/vitest/admin/solutionKitSelection.test.ts`, `tests/vitest/ui/admin-shell-nav.test.tsx`, `tests/vitest/ui/admin-shell.test.tsx` |
| Assistant context | `tests/vitest/ui/use-assistant-admin-context.test.tsx`, `tests/vitest/assistant/admin-context-service.test.ts`, `tests/vitest/assistant/actionPlannerService.test.ts`, `tests/integration/routes/assistant.test.ts` |
| Widget/UI copy | `tests/vitest/widgets/renderer.test.tsx`, `tests/vitest/widgets/footer.test.tsx`, `tests/vitest/widgets/navigation.test.tsx` |
| Performance gate | `tests/perf/admin-request-baseline.test.ts`, `tests/perf/codersoPerformanceGate.test.ts`, `bun run gates:coderso` |

## Security Contract

- Visibility: validation only.
- Auth model: unchanged.
- RBAC: unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: schema tests must confirm strict validation still
  rejects unknown assistant fields.
- Anti-abuse:
  - do not treat skipped live assistant tests as passed,
  - do not hide legacy route failures under broad snapshots,
  - record DB/network blockers separately from implementation failures.

## Testing Requirements

Run:

```bash
bun --cwd core lint
bun --cwd core lint:types
bun run lint:repo:types
bun run test:vitest -- tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/admin-router.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts
bun run test:vitest -- tests/vitest/ui/admin-shell.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/admin-link.test.tsx
bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/navigation.test.tsx
bun test tests/unit/settings/settingsService.test.ts tests/unit/email/emailSettingsService.test.ts tests/unit/webhooks/deliveryService.test.ts tests/unit/tools/importExport.test.ts tests/unit/integrations/integrationsService.test.ts
bun test tests/integration/routes/assistant.test.ts tests/integration/routes/webhooks.test.ts
bun test tests/perf/admin-prefetch-budget.test.ts tests/perf/admin-request-baseline.test.ts tests/perf/codersoPerformanceGate.test.ts
git diff --check
```

Run DB-backed tests only after loading `.env` if the touched suite requires DB:

```bash
set -a && source .env && set +a
```

## Documentation Updates Required

- Record validation evidence in `TASK-226-03-02` and the changelog.
- `_docs/_TASKS/README.md` on status changes.

## Validation Evidence - 2026-04-28

- `bun run test:vitest -- tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/admin-router.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/advanced-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts tests/vitest/admin/cacheBus.test.ts tests/vitest/admin/requestMetrics.test.ts tests/vitest/posts/post-editor-preferences.test.ts` - PASS (9 files, 45 tests).
- `bun run test:vitest -- tests/vitest/ui/admin-shell.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui/admin-link.test.tsx tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/action-plan-heuristics.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/operation-policy-advanced-modules.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts` - PASS (12 files, 123 tests).
- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/admin/adminApp.test.tsx tests/vitest/widgets/renderer.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/forms/formAutomationRunnerCore.test.ts tests/vitest/ui-integration/settings.test.tsx tests/vitest/ui/post-block-editor-shell-wave.test.tsx tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx` - PASS (10 files, 97 tests).
- `bun test tests/unit/settings/settingsService.test.ts tests/unit/email/emailSettingsService.test.ts tests/unit/webhooks/deliveryService.test.ts tests/unit/tools/importExport.test.ts tests/unit/integrations/integrationsService.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts tests/integration/routes/webhooks.test.ts tests/perf/admin-prefetch-budget.test.ts tests/perf/admin-request-baseline.test.ts tests/perf/codersoPerformanceGate.test.ts` - PASS (74 pass, 12 skip; skips are DB/provider-gated tests in the selected files).
- `bun --cwd core lint` - PASS.
- `bun --cwd core lint:types` - PASS.
- `bun run lint:repo:types` - PASS.
- `bun run gates:coderso` - PASS after updating stale UI smoke paths from removed `tests/unit/ui/*` to current `tests/vitest/ui/*`.
- `git diff --check` - PASS.

## Acceptance Criteria

1. All targeted suites pass or have a clearly isolated pre-existing blocker.
2. Legacy `/admin/coderso/*` aliases are proven, not assumed.
3. Strict assistant validation remains covered.
4. Performance and release-gate route samples are aligned with Advanced paths.
