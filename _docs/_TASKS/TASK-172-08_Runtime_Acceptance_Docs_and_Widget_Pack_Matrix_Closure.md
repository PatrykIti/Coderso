# TASK-172-08: Runtime Acceptance, Docs, and Widget Pack Matrix Closure
# FileName: TASK-172-08_Runtime_Acceptance_Docs_and_Widget_Pack_Matrix_Closure.md

**Priority:** High  
**Category:** QA/Assistant + Docs + Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-172-02, TASK-172-03, TASK-172-04, TASK-172-05, TASK-172-06, TASK-172-07  
**Status:** Done (2026-04-12)

---

## Overview

Close the business blueprint pack wave with runtime acceptance, docs corpus updates, and widget/module pack matrix synchronization.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
for (const pack of implementedBlueprintPacks) {
  const plan = await plan(pack.prompt);
  await dryRun(plan);
  await execute(plan, idempotencyKey(pack.id));
  await expectPublicRuntimeSurface(pack.expectedRoutes);
  await expectAdminResourceLinks(pack.expectedAdminResources);
}
```

## Files to Change

- `tests/integration/server/*assistant*`
- `tests/unit/assistant/actionExecutorService.db.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `core/widgets/modulePackMatrix.ts` if pack completeness changes
- relevant `docs/` assistant corpus pages
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Security Contract

- Visibility: validates internal action endpoints and public runtime reads.
- Auth model: admin session for setup; public session only for generated public reads/forms where applicable.
- RBAC: tests assert required permissions for setup actions.
- CSRF: action endpoints remain CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: acceptance includes malformed pack plan regression where relevant.
- Anti-abuse: public forms use existing nonce/captcha/access hardening.
- Idempotency: no duplicate resources on replay.
- Secret handling: runtime/admin payloads contain no secrets.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - planner/blueprint pack coverage for all implemented packs.
- Bun:
  - DB-backed execute tests,
  - public runtime acceptance for each implemented pack,
  - form/security tests when public forms are generated.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/WIDGET_PACK_MATRIX.md`
- `core/widgets/modulePackMatrix.ts` if pack readiness changes.
- relevant `docs/` assistant corpus pages.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-172-business-blueprint-packs.md`

## Acceptance Criteria

1. Every implemented pack has runtime acceptance coverage.
2. Docs describe capabilities and limits.
3. Pack matrix stays synchronized with product-ready surfaces.

## Completion Notes (2026-04-12)

- Revalidated existing DB-backed public runtime acceptance for the shipped house-projects catalog pack.
- Revalidated planner/blueprint coverage for all current business packs.
- Revalidated Bun executor coverage for lead capture, product inquiry, and editorial hub packs.
- Booking and solution-kit refinement packs remain gated and do not require public runtime acceptance until adapters land.
- No widget pack matrix changes were required because the packs reuse existing registered widgets already represented in the matrix.
