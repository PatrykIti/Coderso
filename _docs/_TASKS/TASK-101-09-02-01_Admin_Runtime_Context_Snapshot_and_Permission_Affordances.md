# TASK-101-09-02-01: Admin Runtime Context Snapshot and Permission Affordances
# FileName: TASK-101-09-02-01_Admin_Runtime_Context_Snapshot_and_Permission_Affordances.md

**Priority:** High
**Category:** Core/Assistant + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-101-09-02
**Status:** In Progress (2026-04-11)

---

## Overview

`LLM Guide` ma dostawac ustrukturyzowany runtime context: co user widzi w adminie, jaka powierzchnia jest aktywna, jaki resource jest potencjalnie wybrany i jakie akcje sa sensowne na tej powierzchni.

Ten task rozszerza istniejacy context, nie tworzy nowego flow. Dane nadal trafiaja do jednego toru:

```txt
AssistantPanel
  -> useAssistantAdminContext()
  -> /assistant/actions/plan
  -> buildAssistantAdminContext()
  -> typed plan
```

## Current Repo Context

Istniejace elementy do reuse:
- `core/admin/ui/contexts/AdminRouterContext.tsx`
  - daje `path`, `navigate`, `replace`, `prefetch`,
  - ma `useOptionalAdminRouter()` do bezpiecznego fallbacku.
- `core/admin/ui/layouts/AdminShell.tsx`
  - zna `activeHref`,
  - buduje/resolwuje nav sections,
  - montuje `AssistantPanel`.
- `core/admin/ui/assistant/AssistantPanel.tsx`
  - dzisiaj przy `LLM Guide` bierze route z `window.location.pathname`,
  - po TASK-101-09-02-02 wysyla `includeResourceCatalog=true`.
- `core/services/assistant/adminContextService.ts`
  - juz mapuje route -> `area` + `codersoModule`,
  - ma `resourceCatalog`.
- `core/admin/services/authClient.ts`
  - `AuthUser` ma `id`, `email`, `name`, ale nie niesie jeszcze listy permisji.
- Server-side route layer ma `requirePermission(...)`, ale nie ma jeszcze endpointu dajacego frontendowi pelny permission envelope.

Wniosek implementacyjny:
- nie zakladac, ze frontend zna pelna liste permisji usera,
- zaczac od safe context: route/surface/selected entity + route-derived affordance hints,
- permission envelope ma byc backend-safe summary / capability hints, a nie surowa lista rol/permisji z UI, dopoki TASK-101-09-02-01 nie wprowadzi jawnego zrodla prawdy.

## Target Contract

```ts
type AssistantAdminRuntimeSnapshot = {
  schemaVersion: 1;
  route: string | null;
  activeHref: string | null;
  area: "dashboard" | "pages" | "posts" | "coderso" | "settings" | "other";
  codersoModule:
    | "engine"
    | "entries"
    | "custom-screens"
    | "widgets"
    | "forms"
    | "listings"
    | "booking"
    | "commerce"
    | "other"
    | null;
  selectedResource: {
    kind: string;
    id: string;
  } | null;
  visibleActions: Array<{
    id: string;
    label: string;
    kind: "navigate" | "create" | "edit" | "publish" | "delete" | "execute" | "configure";
    href: string | null;
    requiredPermission: string | null;
  }>;
  permissionHints: {
    known: boolean;
    requiredForVisibleActions: string[];
    reason: "frontend_user_has_no_permissions" | "server_enriched" | "not_available";
  };
};
```

## Security Contract

- Visibility: internal only as part of existing `/admin/api/assistant/actions/plan` payload.
- New public endpoints: none.
- Auth: existing admin session through current assistant action routes.
- RBAC:
  - route still enforces `settings:read` + `content:read` for planning,
  - snapshot must not be treated as authorization; it is advisory context only,
  - executor/domain routes must continue to enforce permissions independently.
- CSRF: existing `POST /assistant/actions/plan` CSRF applies.
- Rate-limit bucket: existing `assistant` bucket.
- Strict reject-unknown validation:
  - any new context key must be schema-owned in `assistantActionSchemas.ts`,
  - `additionalProperties: false` remains required.
- Anti-abuse:
  - no public write surface,
  - nonce/HMAC/reCAPTCHA not applicable.
- Secret handling:
  - do not include user email/name in prompt context,
  - do not include role names, raw permission lists, session ids, cookies, CSRF tokens, or access logs,
  - only include route-derived permission hints needed to explain potential actions.

## Files to Change

- `core/admin/ui/assistant/useAssistantAdminContext.ts` (new, hook/provider helpers)
- `core/admin/ui/assistant/AssistantPanel.tsx` (update, use hook instead of raw `window.location`)
- `core/admin/ui/layouts/AdminShell.tsx` (update only if context provider/props need `activeHref` or nav action hints)
- `core/services/assistant/adminContextService.ts` (update, normalize runtime snapshot into server context)
- `core/services/assistant/actionPlanTypes.ts` (update, context/runtime snapshot types)
- `core/server/validation/assistantActionSchemas.ts` (update if request context gains snapshot fields)
- `tests/vitest/ui/use-assistant-admin-context.test.tsx` (new)
- `tests/vitest/assistant/admin-context-service.test.ts` (new/update)
- `tests/integration/routes/assistant.test.ts` (update if route schema changes)

## Sub-Tasks

- `TASK-101-09-02-01-01_Admin_UI_Runtime_Snapshot_Hook.md`
- `TASK-101-09-02-01-02_Server_Context_Permission_Affordance_Normalization.md`
- `TASK-101-09-02-01-03_Runtime_Context_Test_Docs_and_Closure.md`

## Test Matrix

### 1. UI Snapshot Hook Tests

Runner: `Vitest` / UI.

Files:
- `tests/vitest/ui/use-assistant-admin-context.test.tsx`
- optional update: `tests/vitest/ui/assistant-panel-interaction.test.tsx`

Must cover:
- uses `AdminRouterContext.path` when provider exists,
- falls back safely when provider is absent,
- includes `activeHref` when supplied by `AdminShell`/provider,
- derives selected resource from stable route patterns,
- derives visible action hints for Coderso pages/forms/listings/widgets without DOM scraping,
- does not include user PII or raw auth/session data.

### 2. Server Context Normalization Tests

Runner: `Vitest` pure service tests.

Files:
- `tests/vitest/assistant/admin-context-service.test.ts`

Must cover:
- route/module mapping still works for existing routes,
- runtime snapshot enriches `AssistantAdminContext`,
- permission hints are normalized/deduped/sorted,
- unknown/unsafe action hints are dropped,
- snapshot context coexists with `resourceCatalog` from TASK-101-09-02-02.

### 3. Route Contract Tests

Runner: `Bun` only if `assistantActionSchemas.ts` changes.

Files:
- `tests/integration/routes/assistant.test.ts`

Must cover:
- new context fields are accepted only in schema-owned shape,
- unknown fields are rejected,
- resource catalog enrichment still works,
- `site-kit.*` LLM availability guard still works.

### 4. Regression Tests

Runner:
- `Vitest` for planner/UI.
- `Bun` for route if schema changes.

Must cover:
- existing house-projects/generic catalog/site-kit planner outputs do not regress,
- docs-only chat remains docs-corpus driven and does not depend on UI snapshot,
- execution remains authorization-enforced by route/domain checks, not snapshot hints.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel-interaction.test.tsx --config vitest.config.ts`
- `bun test tests/integration/routes/assistant.test.ts` if request schema changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md` if request context changes
- `_docs/SECURITY_SPEC.md`
