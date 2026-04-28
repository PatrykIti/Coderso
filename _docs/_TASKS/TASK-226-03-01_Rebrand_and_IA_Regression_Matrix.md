# TASK-226-03-01: Rebrand and IA Regression Matrix
# FileName: TASK-226-03-01_Rebrand_and_IA_Regression_Matrix.md

**Priority:** Medium
**Category:** QA + Routing + Assistant + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-226-01-02, TASK-226-02-03
**Status:** To Do

---

## Overview

Run the focused regression matrix for the product rename and Advanced IA route
change. This leaf owns test selection and evidence, not final docs/changelog
closure.

## Sub-Tasks

- [ ] Validate lint/type surfaces.
- [ ] Validate product default changes.
- [ ] Validate admin route canonicalization and legacy aliases.
- [ ] Validate sidebar Advanced group rendering and permission hiding.
- [ ] Validate prefetch/cache behavior for canonical and legacy routes.
- [ ] Validate assistant frontend/backend route context.
- [ ] Validate webhook header compatibility.
- [ ] Validate perf/gate routes or record pre-existing blockers.

## Files to Validate

| Contract | Test files / commands |
|----------|-----------------------|
| Lint/types | `bun --cwd core lint`, `bun --cwd core lint:types`, `bun run lint:repo:types` |
| Product defaults | `tests/unit/settings/settingsService.test.ts`, `tests/unit/email/emailSettingsService.test.ts`, `tests/vitest/admin/settingsClient.test.ts` |
| Webhook headers | `tests/unit/webhooks/deliveryService.test.ts`, `tests/integration/routes/webhooks.test.ts` |
| Admin routes | `tests/vitest/admin/adminPaths.test.ts`, `tests/vitest/admin/admin-router.test.ts`, `tests/vitest/ui/admin-link.test.tsx` |
| Prefetch/cache | `tests/vitest/admin/adminPrefetch.test.ts`, `tests/vitest/admin/admin-prefetch-policy.test.ts`, `tests/perf/admin-prefetch-budget.test.ts` |
| Sidebar IA | `tests/vitest/admin/coderso-modules.test.ts`, `tests/vitest/admin/solutionKitSelection.test.ts`, `tests/vitest/ui/admin-shell-nav.test.tsx`, `tests/vitest/ui/admin-shell.test.tsx` |
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
bun run test:vitest -- tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/admin-router.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/coderso-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts
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

## Acceptance Criteria

1. All targeted suites pass or have a clearly isolated pre-existing blocker.
2. Legacy `/admin/coderso/*` aliases are proven, not assumed.
3. Strict assistant validation remains covered.
4. Performance and release-gate route samples are aligned with Advanced paths.
