# TASK-101-09-04-01: Action Registry, Dry-Run Diff, and Conflict Model
# FileName: TASK-101-09-04-01_Action_Registry_Dry_Run_Diff_and_Conflict_Model.md

**Priority:** High
**Category:** Core/Assistant + Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-04, TASK-101-09-03
**Status:** In Progress (2026-04-12)

---

## Overview

Zastapic implicit executor switch formalnym registry/handler contractem.

Nie chodzi o nowy execution flow. Chodzi o to, aby obecny `/assistant/actions/*` pipeline mial jawne ownership:
- supported action types,
- preview handler,
- execute handler,
- required deps/permission hints,
- conflict/dependency metadata.

## Current Code

Already done:
- `actionPlanSchema.ts` rejects unsupported action types before dry-run/execute.
- `actionDiffService.ts` creates basic `create|update|noop` preview changes.
- `actionExecutorService.ts` has working preview/execute logic for:
  - content route,
  - content type,
  - custom screen,
  - listing query,
  - listing template,
  - form,
  - page,
  - `site-kit.recommend`,
  - `site-kit.install`,
  - `site-kit.validate`.

Still open:
- no `actionRegistry.ts`,
- preview/execute ownership is hidden in `switch` blocks,
- conflict/dependency metadata is warnings-only and not machine-readable.

## Target Contract

```ts
type AssistantActionHandler<TAction extends AssistantPlannedAction> = {
  type: TAction["type"];
  target: (action: TAction) => { targetType: string; targetKey: string };
  preview: (action: TAction, ctx: AssistantActionHandlerContext) => Promise<AssistantActionPreviewChange>;
  execute: (
    action: TAction,
    preview: AssistantActionPreviewChange,
    ctx: AssistantActionHandlerContext
  ) => Promise<AssistantActionExecutionItem>;
};

const handler = getAssistantActionHandler(action.type);
```

## Security Contract

- Visibility: internal module only; no new endpoint.
- Auth/RBAC/CSRF/rate-limit: inherited from existing `/assistant/actions/*` routes.
- Registry is a whitelist and must reject unsupported action types.
- Registry metadata does not authorize execution; route/domain services remain authority.
- No public anti-abuse controls are needed because no public route is added.

## Files to Change

- `core/services/assistant/actionRegistry.ts` (new)
- `core/services/assistant/actionExecutorService.ts` (update to use registry)
- `core/services/assistant/actionDiffService.ts` (update conflict/dependency shape if needed)
- `core/services/assistant/actionPlanTypes.ts` (update preview conflict/dependency types if needed)
- `tests/vitest/assistant/action-registry.test.ts` (new)
- `tests/vitest/assistant/action-diff-service.test.ts` (new/update)
- `tests/unit/assistant/actionExecutorService.test.ts` (Bun regression)

## Sub-Tasks

1. Add registry interface and handler lookup.
2. Move current preview/execute switch entries into registered handlers or registry-owned dispatch table.
3. Add machine-readable conflict/dependency fields to preview changes if needed.
4. Keep existing preview/execute response shape backward-compatible unless docs/API are updated.
5. Add registry tests for every current action type including `site-kit.*`.

## Testing Requirements

- `bunx vitest run tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-diff-service.test.ts --config vitest.config.ts`
- `bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
- If preview response shape changes, update route/API docs and add corresponding assertions.

## Documentation Updates Required

- `_docs/CMS_API.md` only if preview response shape changes.
- Parent TASK-101-09-04 docs/changelog on closure.

## Audit Notes (2026-04-12)

- Basic diff service and executor work.
- Formal registry and conflict/dependency model remain the real open scope.
