# TASK-404-02: Same-Plan Resource Locators and Dependency Graph
# FileName: TASK-404-02_Same_Plan_Resource_Locators_and_Dependency_Graph.md

**Priority:** High
**Category:** Assistant + Action Contracts + Planner
**Estimated Effort:** Large
**Dependencies:** TASK-404-01
**Status:** To Do

---

## Overview

Add strict same-plan resource locators so one reviewed `LLM Guide` plan can
connect resources created in the same execution run. Full-service generation
needs page, entry, menu, SEO, form, and media dependencies to resolve without
trusting provider-supplied ids or requiring fragile second-pass manual work.

Current risk: actions such as `seo.document.upsert` need concrete target ids,
while `page.upsert` and sample entry actions create those ids during execute.
TASK-404 must either support deterministic same-plan locators or explicitly gate
one-shot full-service generation. This leaf owns the locator path.

## Sub-Tasks

- Define a strict locator contract for resources created in the same plan.
- Add dependency graph ordering and dry-run conflict reporting.
- Ensure execute resolves locators from trusted prior action results only.
- Extend redaction/audit/idempotency handling for locators.
- Add route/schema/executor coverage.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/actionPlanTypes.ts` | Add locator-capable target fields where needed. |
| `core/services/assistant/actionPlanSchema.ts` | Normalize/reject unknown locator payloads. |
| `core/services/assistant/actionExecutorService.ts` | Resolve locators during dry-run/execute from trusted dependency results. |
| `core/services/assistant/actionUndoManifest.ts` | Ensure locator-dependent actions have correct undo/restore behavior. |
| `core/services/assistant/blueprints/blueprintActionAssembler.ts` | Emit dependency graph and locators for composed full-service plans. |
| `core/services/assistant/blueprints/blueprintCompositionMetadata.ts` | Expose redacted dependency diagnostics. |
| `core/server/validation/assistantActionSchemas.ts` | Update request validation if plan transport schema changes. |
| `tests/vitest/assistant/action-plan-schema.test.ts` | Strict locator normalization/rejection coverage. |
| `tests/vitest/assistant/blueprint-action-assembler.test.ts` | Graph/locator assembly coverage. |
| `tests/unit/assistant/actionExecutorService.test.ts` | Dry-run/execute locator resolution coverage. |
| `tests/integration/routes/assistant.test.ts` | Route-level validation and permission coverage. |

## Implementation Pseudocode

```ts
type SamePlanLocator =
  | { kind: "action-result"; actionId: string; resourceType: "page"; field: "id" }
  | { kind: "action-result"; actionId: string; resourceType: "entry"; field: "id" }
  | { kind: "stable-slug"; resourceType: "page"; slug: string }
  | { kind: "stable-slug"; resourceType: "entry"; contentTypeSlug: string; slug: string };

function resolveSamePlanLocator(locator: SamePlanLocator, ctx: ExecutorContext): string {
  const prior = ctx.executionResults.get(locator.actionId);
  if (locator.kind === "action-result" && prior?.resourceType === locator.resourceType) {
    return readTrustedResultField(prior, locator.field);
  }
  if (locator.kind === "stable-slug") {
    return resolveExistingTrustedResource(locator, ctx.serverCatalog);
  }
  throw new AssistantActionError("assistant_action_locator_unresolved");
}

function orderActionsByDependency(actions: AssistantPlannedAction[]): AssistantPlannedAction[] {
  const graph = buildActionDependencyGraph(actions);
  return topologicalSort(graph).orThrow("assistant_action_dependency_cycle");
}
```

Data flow:

- Planner emits deterministic action ids and locator references.
- Dry-run validates dependency order, permission needs, and unresolved locators
  before showing execute controls.
- Execute resolves locators only from trusted action results or server catalog
  lookups.
- Provider draft never supplies locator values directly.

Error handling:

- Missing dependency returns `assistant_action_locator_unresolved`.
- Cyclic dependency returns `assistant_action_dependency_cycle`.
- Locator type/resource mismatch returns `assistant_action_locator_invalid`.
- Browser-supplied catalog matches remain untrusted and rejected.

## Security Contract

- Endpoint visibility: existing internal `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC:
  - read permissions unchanged for dry-run,
  - execute permissions still derive from each resolved action family.
- CSRF: required on POST routes.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: locator objects must reject unknown keys and
  unsupported resource/field combinations.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/signature/HMAC or reCAPTCHA for assistant routes,
  - same-plan locators cannot resolve browser-supplied resource catalogs.
- Secret handling:
  - locator diagnostics may include action ids, resource kinds, slugs, and
    redacted conflict codes only,
  - no provider keys, cookies, CSRF tokens, upload bytes, or raw generated copy
    in audit/diagnostics.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
- Add DB-backed executor coverage if locator resolution depends on real page,
  entry, menu, or SEO persistence.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`

## Acceptance Criteria

- Same-plan page/entry locator dependencies are strict, deterministic, and
  executor-owned.
- SEO/menu/sample-content actions can reference newly created resources without
  trusting provider ids.
- Dry-run reports unresolved/cyclic dependencies before execute.
- Route tests prove unknown locator fields and client-supplied catalogs are
  rejected.
