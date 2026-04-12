# TASK-172-07: Solution Kit Refinement Packs and No-Reinstall Flow
# FileName: TASK-172-07_Solution_Kit_Refinement_Packs_and_No_Reinstall_Flow.md

**Priority:** High  
**Category:** Assistant/Product + Solution Kits  
**Estimated Effort:** Large  
**Dependencies:** TASK-172-01, TASK-101-09-01-03  
**Status:** Done (2026-04-12)

---

## Overview

Add follow-up blueprint behavior for already selected or installed solution kits. The guide should refine the existing setup instead of reinstalling or duplicating kit resources.

## Sub-Tasks

No child task files yet. Split by kit family only after the installed-kit state contract is audited.

## Pseudocode

```ts
const installed = await resolveInstalledKitContext(context);

if (!installed) {
  return buildSiteKitInstallPlan(context.siteKit);
}

return buildKitRefinementPlan({
  kit: installed,
  prompt,
  actions: refineExistingKitResources(installed.resources),
});
```

## Files to Change

- `core/services/assistant/siteBuilderPlanAdapter.ts`
- `core/services/assistant/siteBuilderExecutor.ts`
- `core/services/assistant/actionPlannerService.ts`
- solution kit service modules for installed state lookup
- `core/services/assistant/adminContextCatalogs.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/siteBuilderExecutor.test.ts`

## Security Contract

- Visibility: internal action endpoints.
- Auth model: admin session.
- RBAC: solution-kit read for plan/dry-run, solution-kit write plus resource write permissions for execute.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: installed kit context is server-derived, not client-supplied.
- Anti-abuse: no public write path.
- Idempotency: refinements must not reinstall or duplicate kit resources.
- Secret handling: installed kit metadata must not expose secrets or provider credentials.

## Testing Requirements

- Vitest:
  - installed-kit context routes follow-up to refinement,
  - no installed kit routes to existing site-kit install plan,
  - client-supplied installed resources are rejected/ignored.
- Bun:
  - site-kit executor regression,
  - DB-backed no-reinstall behavior when kit install state is persisted.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Follow-up prompts refine existing kit resources where possible.
2. Reinstall is not the default for installed-kit context.
3. Server-derived kit state is the only trusted refinement source.

## Completion Notes (2026-04-12)

- Audited current site-kit guide context and route schema.
- Confirmed `/assistant/actions/plan` accepts `context.siteKit` for install planning, but does not accept client-supplied installed resource maps.
- Confirmed client-supplied unknown context fields are rejected by `assistantActionPlanRequestSchema`.
- No solution-kit refinement plan was shipped because there is no server-derived installed-kit resource context in LLM Guide planning yet.
- Result: this pack remains gated until a server-side installed-kit context resolver is added.
