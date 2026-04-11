# TASK-101-09-02-02-03: Action Plan Context Enrichment and Route Contract
# FileName: TASK-101-09-02-02-03_Action_Plan_Context_Enrichment_and_Route_Contract.md

**Priority:** High
**Category:** API + Core/Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-02-02-02, TASK-101-09-01-03
**Status:** Done (2026-04-11)

---

## Overview

Podlaczyc resource catalog snapshot do istniejacego planowania przez `/assistant/actions/plan`, bez dodawania drugiego flow i bez zmieniania execute path.

Kontekst ma trafic do `planAssistantActions` jako czysty obiekt, a planner nie moze importowac DB/runtime-backed catalog buildera.

## Files to Change

- `core/services/assistant/adminContextService.ts` (update)
- `core/services/assistant/actionPlanTypes.ts` (update)
- `core/services/assistant/actionPlannerService.ts` (update)
- `core/server/routes/assistantRoutes.ts` (update if route performs server-side enrichment)
- `core/server/validation/assistantActionSchemas.ts` (update if request context contract changes)
- `tests/vitest/assistant/actionPlannerService.test.ts` (update)
- `tests/integration/routes/assistant.test.ts` (update if route/schema changes)

## Security Contract

- Visibility: `internal`.
- Auth model: admin session cookie only through existing admin API pipeline.
- RBAC:
  - keep existing `/assistant/actions/plan` floor: `settings:read` + `content:read`,
  - do not expose resources beyond the permission envelope when TASK-101-09-02-01 permission summary is available,
  - before full permission envelope lands, expose only safe structural metadata, not values/submissions/content entries.
- CSRF expectations: existing `POST /assistant/actions/plan` CSRF requirement remains.
- Rate-limit bucket: `assistant`.
- Strict reject-unknown validation:
  - any new `context.resourceCatalog` or `context.includeResourceCatalog` flag must be schema-owned in `assistantActionSchemas.ts`,
  - `additionalProperties: false` remains required.
- Anti-abuse controls:
  - no public route,
  - no nonce/HMAC/reCAPTCHA because endpoint is internal-only.
- Secret handling:
  - only pass normalized/redacted `AssistantResourceCatalogSnapshot`,
  - never pass raw settings/integration/provider configs,
  - never pass form submissions, content entry values, API key records, webhook secrets, or auth/session records.

## Pseudocode

```ts
router.post("/assistant/actions/plan", ..., async (ctx) => {
  validate(assistantActionPlanRequestSchema, ctx.body ?? {});
  const body = parseBody(ctx.body);
  const context = await enrichAssistantActionContext(body.context, {
    actorId: ctx.user?.id ?? null,
    includeResourceCatalog: shouldAttachCatalog(body),
  });
  return service.planActions({ prompt: body.prompt, context });
});
```

## Sub-Tasks

1. Extend `AssistantActionContext` and `AssistantAdminContext` with optional resource catalog snapshot.
2. Add server-side context enrichment helper if the route owns catalog hydration.
3. Ensure docs-only `/assistant/chat` remains docs-corpus driven and does not hydrate resource catalogs.
4. Ensure existing `site-kit.*` LLM availability guard remains unchanged.
5. Preserve current action plan response shape for existing house-projects/product/portfolio/services prompts.

## Testing Requirements

- Vitest planner test proving enriched catalog context is accepted without changing existing deterministic plan output.
- Bun route test if schema or route enrichment changes:
  - unknown context keys are rejected,
  - resource catalog enrichment path calls builder only for action planning,
  - `site-kit.*` LLM availability guard still returns `assistant_llm_unavailable` when appropriate.

## Documentation Updates Required

- `_docs/CMS_API.md` if request context contract changes.
- `_docs/SECURITY_SPEC.md`

## Completion Notes (2026-04-11)

- Added `context.includeResourceCatalog` to the assistant action plan request schema.
- `/assistant/actions/plan` now hydrates resource catalog context server-side when requested and LLM Guide is available.
- Client-supplied `context.resourceCatalog` remains rejected by strict validation.
- Floating assistant `LLM Guide` planning prompts request resource catalog enrichment; docs-only chat remains unchanged.

## Validation (2026-04-11)

- `bun test tests/integration/routes/assistant.test.ts`
- `bunx vitest run tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel-interaction.test.tsx --config vitest.config.ts`
