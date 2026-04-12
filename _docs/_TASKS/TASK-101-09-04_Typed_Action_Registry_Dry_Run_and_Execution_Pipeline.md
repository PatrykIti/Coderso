# TASK-101-09-04: Typed Action Registry, Dry-Run, and Execution Pipeline
# FileName: TASK-101-09-04_Typed_Action_Registry_Dry_Run_and_Execution_Pipeline.md

**Priority:** High
**Category:** Core/Assistant + Core/Services + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-101-09-03
**Status:** In Progress (2026-04-12)

---

## Overview

Execution pipeline juz istnieje, ale nadal jest za bardzo scentralizowany w `actionExecutorService.ts`.

Aktualny stan po TASK-101-09-01/02/03:
- `/assistant/actions/plan`, `/assistant/actions/dry-run`, `/assistant/actions/execute` sa jednym flow.
- `site-kit.*` jest juz zintegrowany z tym flow; `/assistant/site-builder/*` jest retired.
- Planner ma strict nested schema i provider draft recovery.
- `actionExecutorService.ts` reuse’uje domain services i site-kit installer adapter.
- `actionDiffService.ts` tworzy podstawowe preview operations.
- Brakuje formalnego registry, szerszego conflict/dependency modelu oraz persistent idempotency.

Ten task ma uporzadkowac execute layer bez wprowadzania nowego mutation flow.

## Current Code To Reuse

- `core/services/assistant/actionExecutorService.ts`
  - obecny dry-run/execute pipeline,
  - centralized `switch (action.type)` dla preview i execute.
- `core/services/assistant/actionDiffService.ts`
  - obecny `createPreviewChange`,
  - basic `create|update|noop`.
- `core/services/assistant/actionPlanSchema.ts`
  - strict nested action validation.
- `core/services/assistant/siteBuilderExecutor.ts`
  - internal site-kit execution adapter.
- Domain services already reused by executor:
  - `core/services/content/typeService.ts`
  - `core/services/customScreens/customScreenService.ts`
  - `core/services/content/listingQueriesService.ts`
  - `core/services/content/listingTemplatesService.ts`
  - `core/services/pages/pageService.ts`
  - `core/services/forms/formsService.ts`
  - `core/services/settings/settingsService.ts`
  - `core/services/audit/auditService.ts`

## Remaining Gaps

1. Formal action registry:
   - explicit whitelist of action types,
   - handler ownership per action family,
   - no hidden switch growth in executor.
2. Dry-run conflict/dependency model:
   - stable conflict codes,
   - dependency declarations between actions,
   - no-op and missing-dependency states remain explainable.
3. Persistent idempotency and audit/revision hardening:
   - current idempotency is process-local memory,
   - retry-safe result replay is lost on restart,
   - audit metadata needs tighter redaction and result linkage,
   - revision hooks should be documented/tested for resources that already have them.
4. Adapter/helper extraction:
   - site-kit convergence is done,
   - remaining work is only extraction of reusable helpers where assistant and kit installer still duplicate resource-shaping logic.

## Security Contract

- Visibility: internal only through existing `/admin/api/assistant/actions/*`.
- New public endpoints: none.
- Auth: existing admin session.
- RBAC:
  - route-level permissions remain enforced in `assistantRoutes.ts`,
  - registry/handler metadata is advisory and must not replace domain service checks,
  - `site-kit.*` keeps its existing LLM availability and solution-kit permission guard.
- CSRF: existing `POST /assistant/actions/*` CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - strict planner schema remains the input gate,
  - registry must reject unsupported action types with machine-readable error.
- Anti-abuse:
  - no public route,
  - no nonce/HMAC/reCAPTCHA path because endpoints are internal-only.
- Idempotency:
  - `execute` keeps requiring idempotency key,
  - persistent idempotency storage, if implemented through DB, must include migration artifacts and replay-safe result loading.
- Secret handling:
  - audit/idempotency metadata must exclude provider keys, session/cookie/CSRF data, form submissions, raw entry values, and secret-like settings.

## Files to Change

- `core/services/assistant/actionRegistry.ts` (new)
- `core/services/assistant/actionExecutorService.ts` (update/refactor)
- `core/services/assistant/actionDiffService.ts` (update)
- `core/services/assistant/actionPlanTypes.ts` (update if preview conflict/dependency types change)
- `core/services/assistant/actions/*` (new only if handler split is useful and avoids import-time coupling)
- optional persistent idempotency storage:
  - `core/db/schema.ts`
  - SQL migration file
  - `meta/*_snapshot.json`
  - `meta/_journal.json`
- docs:
  - `_docs/ARCHITECTURE.md`
  - `_docs/CMS_API.md` if response shapes change
  - `_docs/SECURITY_SPEC.md`

## Sub-Tasks

- `TASK-101-09-04-01_Action_Registry_Dry_Run_Diff_and_Conflict_Model.md`
- `TASK-101-09-04-02_Execution_Idempotency_Revisions_and_Audit_Hooks.md`
- `TASK-101-09-04-03_Existing_Service_Adapters_and_Installer_Extraction.md`

## Test Matrix

### Registry And Diff

Runner:
- `Vitest` for pure registry metadata and diff/conflict helpers.
- `Bun` only if handler tests import runtime/DB-backed default deps.

Files:
- `tests/vitest/assistant/action-registry.test.ts`
- `tests/vitest/assistant/action-diff-service.test.ts`
- existing `tests/unit/assistant/actionExecutorService.test.ts` for runtime-coupled executor regression.

### Execution/Idempotency

Runner:
- `Bun` for current executor because default deps import DB/domain services at module load.
- `Vitest` only for extracted pure helper logic.

Files:
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts` when `DATABASE_URL` is reachable.
- `tests/integration/routes/assistant.test.ts`

### Adapter Extraction

Runner:
- `Vitest` for pure resource-shaping helpers.
- `Bun` for helpers coupled to DB/domain services or kit installer runtime.

Files:
- existing assistant executor/site-builder tests plus new focused helper tests only when extraction lands.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md` if preview/execute response shapes change
- `_docs/SECURITY_SPEC.md`

## Audit Notes (2026-04-12)

- Basic dry-run/execute pipeline is shipped.
- Site-kit is already integrated into `/assistant/actions/*`; no separate site-builder flow remains.
- Existing executor reuses domain services and site-kit installer adapter.
- Remaining scope is formal registry, richer conflict/dependency model, persistent idempotency, and targeted helper extraction.
