# TASK-226-02-03: Assistant Surface and Module Context Rename
# FileName: TASK-226-02-03_Assistant_Surface_and_Module_Context_Rename.md

**Priority:** High
**Category:** Assistant + Admin Context + Schema Validation
**Estimated Effort:** Large
**Dependencies:** TASK-226-02-02
**Status:** To Do

---

## Overview

Rename assistant/admin runtime context from Coderso-group semantics to Advanced
semantics. The assistant should identify Advanced module surfaces while the
product brand remains Coderso. This leaf owns frontend snapshots, backend admin
context, action-plan types, validation schemas, operation-policy coverage, and
assistant route tests.

## Sub-Tasks

- [ ] Add `advancedModule` to assistant runtime/admin context types.
- [ ] Update `area` values from `coderso` to `advanced` where the value means
  the admin group.
- [ ] Preserve strict legacy handling for `codersoModule` if existing wire
  payloads or tests require migration.
- [ ] Update assistant action schemas without permitting unknown fields.
- [ ] Update operation policy route coverage to canonical `/admin/advanced/*`.
- [ ] Update assistant examples/docs from `Coderso > Widgets` to
  `Advanced > Widgets` while preserving Coderso as product brand.

## Files to Change

| File | Current line(s) | Required change |
|------|-----------------|-----------------|
| `core/admin/ui/assistant/useAssistantAdminContext.ts` | 22, 79-95 | Resolve `/admin/advanced/*` as `area: "advanced"` and legacy `/admin/coderso/*` through alias. |
| `core/admin/ui/assistant/useAssistantAdminContext.ts` | 197-274 | Update visible action hrefs to canonical Advanced routes. |
| `core/services/assistant/adminContextService.ts` | 49-64 | Resolve backend route area/module as Advanced with legacy alias support. |
| `core/services/assistant/adminContextService.ts` | 171, 177, 363 | Emit advanced module context consistently. |
| `core/services/assistant/actionPlanTypes.ts` | 116, 198-199 | Add/rename fields to `advancedModule`; document legacy field if kept. |
| `core/server/validation/assistantActionSchemas.ts` | 104, 120-122 | Schema update for `advancedModule` with strict unknown-field behavior. |
| `tests/vitest/ui/use-assistant-admin-context.test.tsx` | 68-377 | Update snapshots for Advanced routes and legacy aliases. |
| `tests/vitest/assistant/admin-context-service.test.ts` | 7-41 | Update backend context expectations. |
| `tests/vitest/assistant/actionPlannerService.test.ts` | multiple | Update route and field fixtures. |
| `tests/integration/routes/assistant.test.ts` | 340-948 | Update Bun route assistant assertions. |
| `_docs/CMS_API.md` | 2844, 2895-2910, 2958-2959, 2988 | Update assistant examples and active surface docs. |

## Security Contract

- Visibility: internal assistant/admin context payloads and route examples.
- Auth model: unchanged.
- RBAC: unchanged; visible action permissions must remain exact.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant/admin buckets.
- Reject-unknown validation:
  - schemas must remain strict,
  - legacy `codersoModule` must be explicitly versioned or mapped,
  - no catch-all module names.
- Anti-abuse:
  - assistant route context must not grant execution permission,
  - product copy changes must not widen gated module execution,
  - route alias support must not allow arbitrary admin resource selection.

## Pseudocode

```ts
type AssistantAdminArea =
  | "dashboard"
  | "pages"
  | "posts"
  | "advanced"
  | "settings"
  | "other";

type AssistantAdminRuntimeSnapshotV2 = {
  schemaVersion: 2;
  area: AssistantAdminArea;
  advancedModule: AdvancedModuleId | "other" | null;
  codersoModule?: never; // legacy adapter handles v1 payloads before validation
};
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/use-assistant-admin-context.test.tsx`
- `bun run test:vitest -- tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/operation-policy-coderso-modules.test.ts`
- `bun test tests/integration/routes/assistant.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Assistant context uses Advanced semantics for the admin module group.
2. Legacy Coderso route/context inputs remain safe and explicitly handled.
3. Assistant action policy coverage remains gated where it was gated before.
4. Tests prove both canonical Advanced routes and legacy aliases.
